// ============================================================================
// SmartBin Intelligence / KlinGhana - IoT telemetry Edge Function
// Endpoint: POST /functions/v1/iot-telemetry
// Auth: Supabase publishable apikey + per-device X-Device-Key
// ============================================================================

import { withSupabase } from 'npm:@supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-device-id, x-device-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const normalizeDeviceId = (value: string) => value.trim().toUpperCase();

const getDeviceCredentials = (): Record<string, string> => {
  const raw = Deno.env.get('DEVICE_CREDENTIALS_JSON');
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([, value]) => typeof value === 'string' && value.length > 0)
        .map(([deviceId, key]) => [normalizeDeviceId(deviceId), key as string])
    );
  } catch {
    return {};
  }
};

const evaluateStatus = (fillPercentage: number) => {
  if (fillPercentage >= 100) return 'OVERFLOW';
  if (fillPercentage >= 95) return 'FULL';
  if (fillPercentage >= 85) return 'NEAR_FULL';
  if (fillPercentage >= 70) return 'FILLING';
  return 'NORMAL';
};

const nullableNumber = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const requireNumber = (value: unknown, field: string, min: number, max: number): { value?: number; error?: Response } => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < min || numeric > max) {
    return { error: json({ error: 'INVALID_PAYLOAD', message: `${field} must be a number between ${min} and ${max}.` }, 400) };
  }
  return { value: numeric };
};

export default {
  fetch: withSupabase({ auth: 'publishable' }, async (req, ctx) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') {
      return json({ error: 'METHOD_NOT_ALLOWED', message: 'Only POST requests are permitted.' }, 405);
    }

    const deviceIdHeader = normalizeDeviceId(req.headers.get('x-device-id') || '');
    const deviceKeyHeader = req.headers.get('x-device-key') || '';
    if (!deviceIdHeader || !deviceKeyHeader) {
      return json({ error: 'INVALID_DEVICE_CREDENTIAL', message: 'Missing X-Device-Id or X-Device-Key headers.' }, 401);
    }

    const expectedKey = getDeviceCredentials()[deviceIdHeader];
    if (!expectedKey || expectedKey !== deviceKeyHeader) {
      return json({ error: 'INVALID_DEVICE_CREDENTIAL', message: 'Device authentication failed. Invalid key or revoked token.' }, 401);
    }

    let payload: Record<string, unknown>;
    try {
      payload = await req.json();
    } catch {
      return json({ error: 'INVALID_PAYLOAD', message: 'Malformed JSON payload.' }, 400);
    }

    if (!payload || typeof payload.deviceId !== 'string') {
      return json({ error: 'INVALID_PAYLOAD', message: 'Field deviceId is required and must be a string.' }, 400);
    }

    if (normalizeDeviceId(payload.deviceId) !== deviceIdHeader) {
      return json({ error: 'DEVICE_MISMATCH', message: 'Header deviceId does not match body deviceId.' }, 403);
    }

    const fillResult = requireNumber(payload.fillPercentage, 'fillPercentage', 0, 120);
    if (fillResult.error) return fillResult.error;
    const distanceResult = requireNumber(payload.distanceCm, 'distanceCm', 1, 500);
    if (distanceResult.error) return distanceResult.error;

    const messageId = typeof payload.messageId === 'string' && payload.messageId.length > 0 ? payload.messageId : null;
    const sequence = payload.sequence === undefined || payload.sequence === null ? null : Number(payload.sequence);
    if (sequence !== null && (!Number.isInteger(sequence) || sequence < 0)) {
      return json({ error: 'INVALID_PAYLOAD', message: 'sequence must be a non-negative integer when provided.' }, 400);
    }

    const latitude = nullableNumber(payload.latitude);
    const longitude = nullableNumber(payload.longitude);
    const gpsFix = Boolean(payload.gpsFix) && latitude !== null && longitude !== null;
    const nowIso = new Date().toISOString();
    const evaluatedStatus = evaluateStatus(fillResult.value!);
    const supabase = ctx.supabaseAdmin;

    const { data: binRecord, error: binError } = await supabase
      .from('bins')
      .select('id, name')
      .eq('code', deviceIdHeader)
      .maybeSingle();

    if (binError) return json({ error: 'DATABASE_ERROR', message: binError.message }, 500);
    if (!binRecord) return json({ error: 'DEVICE_NOT_REGISTERED', message: 'Device is not linked to a registered bin.' }, 404);

    if (messageId) {
      const { data: duplicate, error: duplicateError } = await supabase
        .from('telemetry')
        .select('id')
        .eq('device_id', deviceIdHeader)
        .eq('message_id', messageId)
        .maybeSingle();
      if (duplicateError) return json({ error: 'DATABASE_ERROR', message: duplicateError.message }, 500);
      if (duplicate) return json({ error: 'DUPLICATE_MESSAGE', message: 'Telemetry messageId was already accepted.' }, 409);
    }

    if (sequence !== null) {
      const { data: currentState, error: currentError } = await supabase
        .from('bin_current_state')
        .select('last_message_sequence')
        .eq('bin_id', binRecord.id)
        .maybeSingle();
      if (currentError) return json({ error: 'DATABASE_ERROR', message: currentError.message }, 500);
      if (currentState?.last_message_sequence !== null && currentState?.last_message_sequence !== undefined && sequence <= Number(currentState.last_message_sequence)) {
        return json({ error: 'STALE_SEQUENCE', message: 'Telemetry sequence is not newer than the last accepted packet.' }, 409);
      }
    }

    const rawDistance = nullableNumber(payload.rawDistanceCm) ?? distanceResult.value!;

    const commonRow = {
      bin_id: binRecord.id,
      device_id: deviceIdHeader,
      fill_percentage: fillResult.value,
      distance_cm: distanceResult.value,
      raw_distance_cm: rawDistance,
      fill_status: evaluatedStatus,
      lid_state: typeof payload.lidState === 'string' ? payload.lidState : 'CLOSED',
      battery_percentage: nullableNumber(payload.batteryPercentage),
      temperature_c: nullableNumber(payload.temperatureC),
      wifi_rssi: nullableNumber(payload.wifiRssi),
      latitude: gpsFix ? latitude : null,
      longitude: gpsFix ? longitude : null,
      gps_accuracy_m: nullableNumber(payload.gpsAccuracyM),
      gps_fix: gpsFix,
      gps_updated_at: gpsFix ? (typeof payload.gpsUpdatedAt === 'string' ? payload.gpsUpdatedAt : nowIso) : null,
      satellites: payload.satellites === undefined || payload.satellites === null ? null : Number(payload.satellites),
      location_source: gpsFix ? 'GPS' : 'UNKNOWN',
      firmware_version: typeof payload.firmwareVersion === 'string' ? payload.firmwareVersion : null,
      message_id: messageId,
      message_sequence: sequence,
    };

    const { error: telemetryError } = await supabase.from('telemetry').insert({
      ...commonRow,
      recorded_at: nowIso,
    });
    if (telemetryError) return json({ error: 'DATABASE_ERROR', message: telemetryError.message }, 500);

    const { error: stateError } = await supabase.from('bin_current_state').upsert({
      ...commonRow,
      bin_status: evaluatedStatus,
      connection_status: 'ONLINE',
      last_seen_at: nowIso,
      telemetry_received_at: nowIso,
      updated_at: nowIso,
      last_message_sequence: sequence,
    });
    if (stateError) return json({ error: 'DATABASE_ERROR', message: stateError.message }, 500);

    const { error: heartbeatError } = await supabase
      .from('devices')
      .update({ last_heartbeat: nowIso, firmware_version: commonRow.firmware_version || undefined })
      .eq('device_id', deviceIdHeader);
    if (heartbeatError) return json({ error: 'DATABASE_ERROR', message: heartbeatError.message }, 500);

    const alertsGenerated: string[] = [];
    const alertsResolved: string[] = [];

    if (fillResult.value! >= 95) {
      const alertType = fillResult.value! >= 100 ? 'OVERFLOW' : 'FULL';
      const { data: existing } = await supabase
        .from('alerts')
        .select('id')
        .eq('bin_id', binRecord.id)
        .eq('alert_type', alertType)
        .eq('status', 'OPEN')
        .maybeSingle();

      if (!existing) {
        const { error: alertError } = await supabase.from('alerts').insert({
          bin_id: binRecord.id,
          alert_type: alertType,
          severity: 'CRITICAL',
          status: 'OPEN',
          message: `${alertType === 'OVERFLOW' ? 'Ultrasonic fill reached' : 'Fill level crossed'} ${fillResult.value!.toFixed(1)}% at ${binRecord.name}`,
          created_at: nowIso,
        });
        if (alertError) return json({ error: 'DATABASE_ERROR', message: alertError.message }, 500);
        alertsGenerated.push(alertType);
      }
    } else if (fillResult.value! < 85) {
      const { data: activeAlerts } = await supabase
        .from('alerts')
        .select('id')
        .eq('bin_id', binRecord.id)
        .eq('status', 'OPEN');

      for (const alert of activeAlerts || []) {
        const { error: resolveError } = await supabase
          .from('alerts')
          .update({ status: 'RESOLVED', resolved_at: nowIso })
          .eq('id', alert.id);
        if (resolveError) return json({ error: 'DATABASE_ERROR', message: resolveError.message }, 500);
        alertsResolved.push(alert.id);
      }
    }

    return json({
      success: true,
      deviceId: deviceIdHeader,
      messageId,
      sequence,
      fillPercentage: fillResult.value,
      distanceCm: distanceResult.value,
      rawDistanceCm: rawDistance,
      gpsFix,
      evaluatedStatus,
      alertsGenerated,
      alertsResolved,
      timestamp: nowIso,
    });
  }),
};
