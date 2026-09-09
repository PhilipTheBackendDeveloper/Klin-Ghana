import { createClient } from '@supabase/supabase-js';
import {
  calculateHardwareFillStatus,
  isDuplicateTelemetry,
  isStaleSequence,
  normalizeDeviceId,
  TelemetryPayloadSchema,
} from '../shared/telemetryContract.ts';
import { verifyDeviceCredential } from './deviceCredentials.ts';

type SupabaseError = { code?: string; message: string };
type SupabaseResult<T = unknown> = { data: T | null; error: SupabaseError | null };

type SupabaseQuery<T = unknown> = PromiseLike<SupabaseResult<T>> & {
  select: (columns?: string) => SupabaseQuery<T>;
  insert: (values: unknown) => SupabaseQuery<T>;
  update: (values: unknown) => SupabaseQuery<T>;
  upsert: (values: unknown, options?: unknown) => SupabaseQuery<T>;
  eq: (column: string, value: unknown) => SupabaseQuery<T>;
  neq: (column: string, value: unknown) => SupabaseQuery<T>;
  maybeSingle: () => Promise<SupabaseResult<T>>;
  limit: (count: number) => SupabaseQuery<T>;
};

export type SupabaseLike = {
  from: (table: string) => any;
};

export interface IotHandlerDeps {
  supabase?: SupabaseLike | null;
}

const seenMessageIds = new Set<string>();
const lastSequenceByDevice = new Map<string, number>();

const getSupabaseServerClient = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
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

const makeCorsHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'x-device-id, x-device-key, content-type, apikey, authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
});

const isNoRows = (error: SupabaseError | null | undefined): boolean => error?.code === 'PGRST116';

export async function handleTelemetryIngestion(
  headers: Record<string, string | string[] | undefined>,
  rawBody: string | Record<string, unknown>,
  deps: IotHandlerDeps = {}
): Promise<IngestionResult> {
  const corsHeaders = makeCorsHeaders();

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
  const sequenceNum = validData.sequence ?? 1;
  const messageId = validData.messageId || `${deviceId}-${sequenceNum}-${Date.now()}`;

  // Deduplication check
  if (isDuplicateTelemetry(seenMessageIds, deviceId, messageId)) {
    return {
      statusCode: 409,
      headers: corsHeaders,
      body: { ok: false, error: 'DUPLICATE_MESSAGE', message: 'Telemetry messageId was already accepted.' },
    };
  }

  // Sequence check
  if (isStaleSequence(lastSequenceByDevice, deviceId, sequenceNum)) {
    return {
      statusCode: 409,
      headers: corsHeaders,
      body: { ok: false, error: 'STALE_SEQUENCE', message: 'Telemetry sequence is not newer than the last accepted packet.' },
    };
  }

  const evaluatedStatus = calculateHardwareFillStatus(validData.fillPercentage);
  const nowIso = new Date().toISOString();
  const rawDist = validData.rawDistanceCm ?? validData.distanceCm;
  const hasGpsFix = Boolean(
    validData.gpsFix &&
    typeof validData.latitude === 'number' &&
    typeof validData.longitude === 'number' &&
    Number.isFinite(validData.latitude) &&
    Number.isFinite(validData.longitude) &&
    validData.latitude !== 0 &&
    validData.longitude !== 0
  );

  const supabase = deps.supabase !== undefined ? deps.supabase : getSupabaseServerClient();

  if (supabase) {
    try {
      const binLookup = (await supabase
        .from('bins')
        .select('id, name, latitude, longitude')
        .eq('code', deviceId)
        .maybeSingle()) as SupabaseResult<{ id: string; name: string; latitude?: number | null; longitude?: number | null }>;

      if (binLookup?.data) {
        const binRecord = binLookup.data;
        const finalLat = hasGpsFix ? validData.latitude : (binRecord.latitude ?? 6.6885);
        const finalLng = hasGpsFix ? validData.longitude : (binRecord.longitude ?? -1.6244);

        const commonRow = {
          bin_id: binRecord.id,
          device_id: deviceId,
          fill_percentage: validData.fillPercentage,
          distance_cm: validData.distanceCm,
          raw_distance_cm: rawDist,
          fill_status: evaluatedStatus,
          lid_state: validData.lidState || 'CLOSED',
          battery_percentage: validData.batteryPercentage ?? 95,
          temperature_c: validData.temperatureC ?? 28,
          wifi_rssi: validData.wifiRssi ?? null,
          latitude: finalLat,
          longitude: finalLng,
          gps_accuracy_m: hasGpsFix ? validData.gpsAccuracyM : null,
          gps_fix: hasGpsFix,
          gps_updated_at: hasGpsFix ? (validData.gpsUpdatedAt || nowIso) : null,
          satellites: validData.satellites ?? 0,
          location_source: hasGpsFix ? 'GPS' : 'UNKNOWN',
          firmware_version: validData.firmwareVersion || '1.0.0-prod',
          message_id: messageId,
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
        }, { onConflict: 'bin_id' });

        await supabase.from('devices').upsert({
          device_id: deviceId,
          bin_id: binRecord.id,
          firmware_version: validData.firmwareVersion || '1.0.0-prod',
          is_active: true,
          last_heartbeat: nowIso,
        }, { onConflict: 'device_id' });

        // Alert Evaluation
        const fillAlertTypes = ['NEAR_FULL', 'FULL', 'OVERFLOW'];
        if (fillAlertTypes.includes(evaluatedStatus)) {
          await supabase
            .from('alerts')
            .update({ status: 'RESOLVED', resolved_at: nowIso, updated_at: nowIso })
            .eq('bin_id', binRecord.id)
            .neq('alert_type', evaluatedStatus)
            .eq('status', 'OPEN');

          const existingAlert = (await supabase
            .from('alerts')
            .select('id')
            .eq('bin_id', binRecord.id)
            .eq('alert_type', evaluatedStatus)
            .eq('status', 'OPEN')
            .maybeSingle()) as SupabaseResult<{ id: string }>;

          if (!existingAlert?.data) {
            await supabase.from('alerts').insert({
              bin_id: binRecord.id,
              alert_type: evaluatedStatus,
              severity: evaluatedStatus === 'NEAR_FULL' ? 'WARNING' : 'CRITICAL',
              status: 'OPEN',
              message: `${evaluatedStatus.replace('_', ' ')} fill state at ${validData.fillPercentage.toFixed(1)}% (${binRecord.name})`,
              created_at: nowIso,
              updated_at: nowIso,
            });
          }
        } else {
          await supabase
            .from('alerts')
            .update({ status: 'RESOLVED', resolved_at: nowIso, updated_at: nowIso })
            .eq('bin_id', binRecord.id)
            .eq('status', 'OPEN');
        }
      }
    } catch (err) {
      console.warn('[IOT_HANDLER] Supabase persistence error (non-fatal):', err);
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
      gpsFix: hasGpsFix,
      evaluatedStatus,
    },
  };
}

export async function handleHealthCheck(): Promise<IngestionResult> {
  const corsHeaders = makeCorsHeaders();
  const supabase = getSupabaseServerClient();
  let dbStatus = 'disconnected';

  if (supabase) {
    try {
      const { error } = await supabase.from('bins').select('id').limit(1);
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
