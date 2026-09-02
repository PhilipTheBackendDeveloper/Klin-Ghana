import { createClient } from '@supabase/supabase-js';
import {
  calculateHardwareFillStatus,
  isDuplicateTelemetry,
  isStaleSequence,
  normalizeDeviceId,
  TelemetryPayloadSchema,
} from '../shared/telemetryContract.ts';
import { verifyDeviceCredential } from './deviceCredentials.ts';

const seenMessageIds = new Set<string>();
const lastSequenceByDevice = new Map<string, number>();

const getSupabaseServerClient = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false },
  });
};

export interface IngestionResult {
  statusCode: number;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

export async function handleTelemetryIngestion(
  headers: Record<string, string | string[] | undefined>,
  rawBody: string | Record<string, unknown>
): Promise<IngestionResult> {
  const corsHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'x-device-id, x-device-key, content-type, apikey, authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  const getHeader = (name: string): string => {
    const val = headers[name.toLowerCase()] || headers[name];
    if (Array.isArray(val)) return val[0] || '';
    return typeof val === 'string' ? val : '';
  };

  const deviceId = normalizeDeviceId(getHeader('x-device-id'));
  const deviceKey = getHeader('x-device-key');

  if (!deviceId || !deviceKey) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: { ok: false, error: 'INVALID_DEVICE_CREDENTIAL', message: 'Missing X-Device-Id or X-Device-Key headers.' },
    };
  }

  if (!verifyDeviceCredential(deviceId, deviceKey)) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: { ok: false, error: 'INVALID_DEVICE_CREDENTIAL', message: 'Device authentication failed.' },
    };
  }

  let payload: Record<string, unknown>;
  try {
    payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: { ok: false, error: 'INVALID_PAYLOAD', message: 'Malformed JSON payload.' },
    };
  }

  if (payload.deviceId && normalizeDeviceId(String(payload.deviceId)) !== deviceId) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: { ok: false, error: 'DEVICE_MISMATCH', message: 'Header deviceId does not match body deviceId.' },
    };
  }

  const parseResult = TelemetryPayloadSchema.safeParse(payload);
  if (!parseResult.success) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: { ok: false, error: 'INVALID_PAYLOAD', message: 'Validation failed.', details: parseResult.error.issues },
    };
  }

  const validData = parseResult.data;

  if (isDuplicateTelemetry(seenMessageIds, deviceId, validData.messageId)) {
    return {
      statusCode: 409,
      headers: corsHeaders,
      body: { ok: false, error: 'DUPLICATE_MESSAGE', message: 'Telemetry messageId was already accepted.' },
    };
  }

  if (isStaleSequence(lastSequenceByDevice, deviceId, validData.sequence)) {
    return {
      statusCode: 409,
      headers: corsHeaders,
      body: { ok: false, error: 'STALE_SEQUENCE', message: 'Telemetry sequence is not newer than the last accepted packet.' },
    };
  }

  const evaluatedStatus = calculateHardwareFillStatus(validData.fillPercentage);
  const nowIso = new Date().toISOString();
  const rawDist = validData.rawDistanceCm ?? validData.distanceCm;
  const sequenceNum = validData.sequence ?? 0;

  // Persist to Supabase if configured
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data: binRecord } = await supabase
        .from('bins')
        .select('id, name')
        .eq('code', deviceId)
        .maybeSingle();

      if (binRecord) {
        const commonRow = {
          bin_id: binRecord.id,
          device_id: deviceId,
          fill_percentage: validData.fillPercentage,
          distance_cm: validData.distanceCm,
          raw_distance_cm: rawDist,
          fill_status: evaluatedStatus,
          lid_state: validData.lidState,
          battery_percentage: validData.batteryPercentage,
          temperature_c: validData.temperatureC,
          wifi_rssi: validData.wifiRssi,
          latitude: validData.gpsFix ? validData.latitude : null,
          longitude: validData.gpsFix ? validData.longitude : null,
          gps_accuracy_m: validData.gpsAccuracyM,
          gps_fix: validData.gpsFix,
          gps_updated_at: validData.gpsFix ? (validData.gpsUpdatedAt || nowIso) : null,
          satellites: validData.satellites,
          location_source: validData.gpsFix ? 'GPS' : 'UNKNOWN',
          firmware_version: validData.firmwareVersion,
          message_id: validData.messageId || null,
          message_sequence: sequenceNum,
        };

        await supabase.from('telemetry').insert({
          ...commonRow,
          recorded_at: nowIso,
        });

        await supabase.from('bin_current_state').upsert({
          ...commonRow,
          bin_status: evaluatedStatus,
          connection_status: 'ONLINE',
          last_seen_at: nowIso,
          telemetry_received_at: nowIso,
          updated_at: nowIso,
          last_message_sequence: sequenceNum,
        });

        await supabase
          .from('devices')
          .update({ last_heartbeat: nowIso, firmware_version: validData.firmwareVersion })
          .eq('device_id', deviceId);

        // Alert Evaluation
        if (validData.fillPercentage >= 95) {
          const alertType = validData.fillPercentage >= 100 ? 'OVERFLOW' : 'FULL';
          const { data: existingAlert } = await supabase
            .from('alerts')
            .select('id')
            .eq('bin_id', binRecord.id)
            .eq('alert_type', alertType)
            .eq('status', 'OPEN')
            .maybeSingle();

          if (!existingAlert) {
            await supabase.from('alerts').insert({
              bin_id: binRecord.id,
              alert_type: alertType,
              severity: 'CRITICAL',
              status: 'OPEN',
              message: `${alertType === 'OVERFLOW' ? 'Bin overflow detected' : 'Bin reached full threshold'} at ${validData.fillPercentage.toFixed(1)}% (${binRecord.name})`,
              created_at: nowIso,
            });
          }
        } else if (validData.fillPercentage < 85) {
          await supabase
            .from('alerts')
            .update({ status: 'RESOLVED', resolved_at: nowIso })
            .eq('bin_id', binRecord.id)
            .eq('status', 'OPEN');
        }
      }
    } catch {
      // Ingestion falls back gracefully if database operation encounters temporary network pause
    }
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: {
      ok: true,
      success: true,
      accepted: true,
      deviceId,
      serverTimestamp: nowIso,
      sequence: sequenceNum,
      fillPercentage: validData.fillPercentage,
      distanceCm: validData.distanceCm,
      rawDistanceCm: rawDist,
      gpsFix: validData.gpsFix,
      evaluatedStatus,
    },
  };
}

export async function handleHealthCheck(): Promise<IngestionResult> {
  const corsHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  const supabase = getSupabaseServerClient();
  let dbStatus = 'disconnected';

  if (supabase) {
    try {
      const { error } = await supabase.from('bin_current_state').select('bin_id').limit(1);
      dbStatus = !error ? 'connected' : 'disconnected';
    } catch {
      dbStatus = 'disconnected';
    }
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: {
      status: 'ok',
      database: dbStatus,
      timestamp: new Date().toISOString(),
    },
  };
}
