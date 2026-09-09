import { createClient } from '@supabase/supabase-js';
import {
  calculateHardwareFillStatus,
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
  from: <T = unknown>(table: string) => SupabaseQuery<T>;
};

export interface IotHandlerDeps {
  supabase?: SupabaseLike | null;
}

const getSupabaseServerClient = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
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
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

const dbFailure = (
  headers: Record<string, string>,
  statusCode: number,
  error: string,
  message: string,
  detail?: string
): IngestionResult => ({
  statusCode,
  headers,
  body: { ok: false, error, message, ...(detail ? { detail } : {}) },
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

  const supabase = deps.supabase !== undefined ? deps.supabase : getSupabaseServerClient();
  if (!supabase) {
    return dbFailure(
      corsHeaders,
      500,
      'SUPABASE_NOT_CONFIGURED',
      'Telemetry persistence requires SUPABASE_URL and SUPABASE_SECRET_KEY.'
    );
  }

  const validData = parseResult.data;
  const evaluatedStatus = calculateHardwareFillStatus(validData.fillPercentage);
  const nowIso = new Date().toISOString();
  const rawDist = validData.rawDistanceCm ?? validData.distanceCm;
  const sequenceNum = validData.sequence;

  try {
    const binLookup = await supabase
      .from<{ id: string; name: string }>('bins')
      .select('id, name')
      .eq('code', deviceId)
      .maybeSingle();

    if (binLookup.error) return dbFailure(corsHeaders, 502, 'BIN_LOOKUP_FAILED', 'Could not verify device/bin registration.', binLookup.error.message);
    if (!binLookup.data) return dbFailure(corsHeaders, 404, 'DEVICE_NOT_REGISTERED', `No bin is registered for ${deviceId}.`);

    const duplicateLookup = await supabase
      .from<{ id: string }>('telemetry')
      .select('id')
      .eq('device_id', deviceId)
      .eq('message_id', validData.messageId)
      .maybeSingle();

    if (duplicateLookup.error && !isNoRows(duplicateLookup.error)) {
      return dbFailure(corsHeaders, 502, 'DUPLICATE_LOOKUP_FAILED', 'Could not verify telemetry messageId uniqueness.', duplicateLookup.error.message);
    }
    if (duplicateLookup.data) {
      return {
        statusCode: 409,
        headers: corsHeaders,
        body: { ok: false, error: 'DUPLICATE_MESSAGE', message: 'Telemetry messageId was already accepted.' },
      };
    }

    const stateLookup = await supabase
      .from<{ last_message_sequence?: number | null; message_sequence?: number | null }>('bin_current_state')
      .select('last_message_sequence, message_sequence')
      .eq('device_id', deviceId)
      .maybeSingle();

    if (stateLookup.error && !isNoRows(stateLookup.error)) {
      return dbFailure(corsHeaders, 502, 'STATE_LOOKUP_FAILED', 'Could not read current device sequence.', stateLookup.error.message);
    }

    const lastSequence = Number(stateLookup.data?.last_message_sequence ?? stateLookup.data?.message_sequence ?? -1);
    if (Number.isFinite(lastSequence) && sequenceNum <= lastSequence) {
      return {
        statusCode: 409,
        headers: corsHeaders,
        body: { ok: false, error: 'STALE_SEQUENCE', message: 'Telemetry sequence is not newer than the durable database state.' },
      };
    }

    const hasGpsFix = Boolean(
      validData.gpsFix &&
      typeof validData.latitude === 'number' &&
      typeof validData.longitude === 'number' &&
      Number.isFinite(validData.latitude) &&
      Number.isFinite(validData.longitude) &&
      validData.latitude !== 0 &&
      validData.longitude !== 0
    );

    const commonRow = {
      bin_id: binLookup.data.id,
      device_id: deviceId,
      fill_percentage: validData.fillPercentage,
      distance_cm: validData.distanceCm,
      raw_distance_cm: rawDist,
      fill_status: evaluatedStatus,
      lid_state: validData.lidState,
      battery_percentage: validData.batteryPercentage,
      temperature_c: validData.temperatureC,
      wifi_rssi: validData.wifiRssi,
      latitude: hasGpsFix ? validData.latitude : null,
      longitude: hasGpsFix ? validData.longitude : null,
      gps_accuracy_m: hasGpsFix ? validData.gpsAccuracyM : null,
      gps_fix: hasGpsFix,
      gps_updated_at: hasGpsFix ? (validData.gpsUpdatedAt || nowIso) : null,
      satellites: validData.satellites,
      location_source: hasGpsFix ? 'GPS' : 'UNKNOWN',
      firmware_version: validData.firmwareVersion,
      message_id: validData.messageId,
      message_sequence: sequenceNum,
    };

    const telemetryInsert = await supabase.from('telemetry').insert({
      ...commonRow,
      recorded_at: nowIso,
    });

    if (telemetryInsert.error) {
      const isDuplicate = telemetryInsert.error.code === '23505';
      return dbFailure(
        corsHeaders,
        isDuplicate ? 409 : 502,
        isDuplicate ? 'DUPLICATE_MESSAGE' : 'TELEMETRY_INSERT_FAILED',
        isDuplicate ? 'Telemetry messageId was already accepted.' : 'Could not persist telemetry row.',
        telemetryInsert.error.message
      );
    }

    const currentStateUpsert = await supabase.from('bin_current_state').upsert({
      ...commonRow,
      bin_status: evaluatedStatus,
      connection_status: 'ONLINE',
      last_seen_at: nowIso,
      telemetry_received_at: nowIso,
      updated_at: nowIso,
      last_message_sequence: sequenceNum,
    }, { onConflict: 'bin_id' });

    if (currentStateUpsert.error) {
      return dbFailure(corsHeaders, 502, 'CURRENT_STATE_UPSERT_FAILED', 'Could not persist bin_current_state row.', currentStateUpsert.error.message);
    }

    const heartbeatUpsert = await supabase.from('devices').upsert({
      device_id: deviceId,
      bin_id: binLookup.data.id,
      firmware_version: validData.firmwareVersion,
      is_active: true,
      last_heartbeat: nowIso,
    }, { onConflict: 'device_id' });

    if (heartbeatUpsert.error) {
      return dbFailure(corsHeaders, 502, 'DEVICE_HEARTBEAT_FAILED', 'Could not persist device heartbeat.', heartbeatUpsert.error.message);
    }

    const fillAlertTypes = ['NEAR_FULL', 'FULL', 'OVERFLOW'];
    if (fillAlertTypes.includes(evaluatedStatus)) {
      const closeOtherAlerts = await supabase
        .from('alerts')
        .update({ status: 'RESOLVED', resolved_at: nowIso, updated_at: nowIso })
        .eq('bin_id', binLookup.data.id)
        .neq('alert_type', evaluatedStatus)
        .eq('status', 'OPEN');
      if (closeOtherAlerts.error) return dbFailure(corsHeaders, 502, 'ALERT_UPDATE_FAILED', 'Could not resolve superseded fill alerts.', closeOtherAlerts.error.message);

      const existingAlert = await supabase
        .from<{ id: string }>('alerts')
        .select('id')
        .eq('bin_id', binLookup.data.id)
        .eq('alert_type', evaluatedStatus)
        .eq('status', 'OPEN')
        .maybeSingle();
      if (existingAlert.error && !isNoRows(existingAlert.error)) {
        return dbFailure(corsHeaders, 502, 'ALERT_LOOKUP_FAILED', 'Could not inspect active fill alerts.', existingAlert.error.message);
      }

      if (!existingAlert.data) {
        const alertInsert = await supabase.from('alerts').insert({
          bin_id: binLookup.data.id,
          alert_type: evaluatedStatus,
          severity: evaluatedStatus === 'NEAR_FULL' ? 'WARNING' : 'CRITICAL',
          status: 'OPEN',
          message: `${evaluatedStatus.replace('_', ' ')} fill state at ${validData.fillPercentage.toFixed(1)}% (${binLookup.data.name})`,
          created_at: nowIso,
          updated_at: nowIso,
        });
        if (alertInsert.error) return dbFailure(corsHeaders, 502, 'ALERT_INSERT_FAILED', 'Could not persist fill alert.', alertInsert.error.message);
      }
    } else {
      const resolveAlerts = await supabase
        .from('alerts')
        .update({ status: 'RESOLVED', resolved_at: nowIso, updated_at: nowIso })
        .eq('bin_id', binLookup.data.id)
        .eq('status', 'OPEN');
      if (resolveAlerts.error) return dbFailure(corsHeaders, 502, 'ALERT_RESOLVE_FAILED', 'Could not resolve open alerts after normal fill telemetry.', resolveAlerts.error.message);
    }
  } catch (err) {
    return dbFailure(corsHeaders, 500, 'INTERNAL_ERROR', err instanceof Error ? err.message : 'Unexpected telemetry ingestion failure.');
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
      gpsFix: Boolean(validData.gpsFix),
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
  let dbStatus = 'unconfigured';

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
      requires: ['SUPABASE_SECRET_KEY'],
      timestamp: new Date().toISOString(),
    },
  };
}



