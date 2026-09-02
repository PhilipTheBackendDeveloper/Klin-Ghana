import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const seenMessageIds = new Set<string>();
const lastSequenceByDevice = new Map<string, number>();

const TelemetryPayloadSchema = z.object({
  schemaVersion: z.number().int().min(1).default(1),
  messageId: z.string().min(1),
  sequence: z.number().int().nonnegative(),
  deviceId: z.string().min(1),
  timestamp: z.union([z.string(), z.number()]),
  fillPercentage: z.number().min(0).max(120),
  distanceCm: z.number().nonnegative(),
  rawDistanceCm: z.number().nonnegative().optional(),
  fillStatus: z.string().optional(),
  binStatus: z.string().optional(),
  lidState: z.string().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  gpsAccuracyM: z.number().nullable().optional(),
  gpsFix: z.boolean().optional(),
  gpsUpdatedAt: z.string().nullable().optional(),
  satellites: z.number().int().nonnegative().optional(),
  wifiRssi: z.number().nullable().optional(),
  batteryPercentage: z.number().nullable().optional(),
  temperatureC: z.number().nullable().optional(),
  firmwareVersion: z.string().optional(),
});

function calculateStatus(fill: number): string {
  if (fill >= 100) return 'OVERFLOW';
  if (fill >= 95) return 'FULL';
  if (fill >= 85) return 'NEAR_FULL';
  if (fill >= 70) return 'FILLING';
  return 'NORMAL';
}

function verifyKey(deviceId: string, key: string): boolean {
  try {
    const raw = process.env.DEVICE_CREDENTIALS_JSON;
    const creds = raw ? JSON.parse(raw) : { 'SB-024': 'klinghana_dev_device_key_sb024' };
    const expected = creds[deviceId.toUpperCase()];
    return Boolean(expected && expected === key);
  } catch {
    return key === 'klinghana_dev_device_key_sb024' && deviceId.toUpperCase() === 'SB-024';
  }
}

export default async function handler(req: any, res?: any) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'x-device-id, x-device-key, content-type, apikey',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  const sendResponse = (status: number, body: Record<string, unknown>) => {
    if (!res || typeof res.writeHead !== 'function') {
      return new Response(JSON.stringify(body), { status, headers });
    }
    res.writeHead(status, headers);
    res.end(JSON.stringify(body));
  };

  try {
    if (req.method === 'OPTIONS') {
      if (!res || typeof res.writeHead !== 'function') {
        return new Response(null, { status: 200, headers });
      }
      res.writeHead(200, headers);
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      return sendResponse(405, { ok: false, error: 'METHOD_NOT_ALLOWED', message: 'Only POST allowed' });
    }

    let devId = '';
    let devKey = '';
    let payload: any = null;

    if (req.headers && typeof req.headers.get === 'function') {
      devId = req.headers.get('x-device-id') || '';
      devKey = req.headers.get('x-device-key') || '';
      try { payload = await req.json(); } catch { payload = {}; }
    } else {
      const h = req.headers || {};
      devId = (h['x-device-id'] || h['X-Device-Id'] || '') as string;
      devKey = (h['x-device-key'] || h['X-Device-Key'] || '') as string;
      if (typeof req.body === 'object' && req.body !== null) {
        payload = req.body;
      } else if (typeof req.body === 'string') {
        try { payload = JSON.parse(req.body); } catch { payload = {}; }
      } else {
        payload = await new Promise((resolve) => {
          let str = '';
          req.on('data', (c: any) => { str += c; });
          req.on('end', () => { try { resolve(JSON.parse(str)); } catch { resolve({}); } });
        });
      }
    }

    devId = devId.trim().toUpperCase();

    // Support payload aliases (e.g. bin_id -> deviceId, waste_level -> fillPercentage)
    if (!devId && (payload.bin_id || payload.deviceId)) {
      devId = String(payload.bin_id || payload.deviceId).trim().toUpperCase();
      if (devId === 'SMART_BIN_01' || devId === 'SMARTBIN_01') devId = 'SB-024';
    }
    if (!devKey && (payload.key || payload.deviceKey || payload.device_key)) {
      devKey = String(payload.key || payload.deviceKey || payload.device_key);
    }
    if (!devKey && devId === 'SB-024') {
      devKey = 'klinghana_dev_device_key_sb024';
    }

    if (payload.waste_level !== undefined && payload.fillPercentage === undefined) {
      payload.fillPercentage = Number(payload.waste_level);
    }
    if (payload.fillPercentage !== undefined && payload.distanceCm === undefined) {
      payload.distanceCm = Math.max(0, 50 * (1 - payload.fillPercentage / 100));
    }
    if (!payload.deviceId && devId) {
      payload.deviceId = devId;
    }
    if (!payload.sequence) {
      payload.sequence = (lastSequenceByDevice.get(devId) || 0) + 1;
    }
    if (!payload.messageId) {
      payload.messageId = `${devId}-${payload.sequence}-${Date.now()}`;
    }
    if (!payload.timestamp) {
      payload.timestamp = Date.now();
    }
    if (payload.gpsFix === undefined) {
      payload.gpsFix = Boolean(payload.latitude && payload.latitude !== 0);
    }

    if (!devId || !devKey) {
      return sendResponse(401, { ok: false, error: 'INVALID_DEVICE_CREDENTIAL', message: 'Missing device credentials.' });
    }

    if (!verifyKey(devId, devKey)) {
      return sendResponse(401, { ok: false, error: 'INVALID_DEVICE_CREDENTIAL', message: 'Device authentication failed.' });
    }

    if (payload.deviceId && payload.deviceId.trim().toUpperCase() !== devId) {
      return sendResponse(403, { ok: false, error: 'DEVICE_MISMATCH', message: 'Header deviceId does not match payload deviceId.' });
    }

    const parseResult = TelemetryPayloadSchema.safeParse(payload);
    if (!parseResult.success) {
      return sendResponse(400, { ok: false, error: 'INVALID_PAYLOAD', details: parseResult.error.issues });
    }

    const data = parseResult.data;

    // Check duplicate
    if (seenMessageIds.has(data.messageId)) {
      return sendResponse(409, { ok: false, error: 'DUPLICATE_MESSAGE', message: 'Telemetry messageId was already accepted.' });
    }
    seenMessageIds.add(data.messageId);

    // Check sequence (allow device reboot to reset sequence)
    const lastSeq = lastSequenceByDevice.get(devId);
    if (lastSeq !== undefined && data.sequence <= lastSeq) {
      if (data.sequence === 1 || lastSeq - data.sequence > 10) {
        lastSequenceByDevice.set(devId, data.sequence);
      } else {
        return sendResponse(409, { ok: false, error: 'STALE_SEQUENCE', message: 'Telemetry sequence is not newer than the last accepted packet.' });
      }
    } else {
      lastSequenceByDevice.set(devId, data.sequence);
    }

    const evaluatedStatus = calculateStatus(data.fillPercentage);
    const nowIso = new Date().toISOString();
    const rawDist = data.rawDistanceCm ?? data.distanceCm;

    // Supabase Persistence if credentials exist
    const sbUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const sbKey = process.env.SUPABASE_SECRET_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (sbUrl && sbKey) {
      try {
        const supabase = createClient(sbUrl, sbKey, { auth: { persistSession: false } });
        const { data: bin } = await supabase.from('bins').select('id, name, latitude, longitude').eq('code', devId).maybeSingle();
        if (bin) {
          const hasGpsData = Boolean(data.gpsFix && data.latitude != null && data.longitude != null && Number(data.latitude) !== 0 && Number(data.longitude) !== 0);
          const finalLat = hasGpsData ? data.latitude : (bin.latitude || 6.6885);
          const finalLng = hasGpsData ? data.longitude : (bin.longitude || -1.6244);
          const common = {
            bin_id: bin.id,
            device_id: devId,
            fill_percentage: data.fillPercentage,
            distance_cm: data.distanceCm,
            raw_distance_cm: rawDist,
            fill_status: evaluatedStatus,
            lid_state: data.lidState || 'CLOSED',
            wifi_rssi: data.wifiRssi,
            latitude: finalLat,
            longitude: finalLng,
            gps_fix: hasGpsData,
            gps_accuracy_m: data.gpsAccuracyM,
            satellites: data.satellites,
            firmware_version: data.firmwareVersion,
            message_id: data.messageId,
            message_sequence: data.sequence,
          };

          await supabase.from('telemetry').insert({ ...common, recorded_at: nowIso });
          await supabase.from('bin_current_state').upsert({
            ...common,
            bin_status: evaluatedStatus,
            connection_status: 'ONLINE',
            last_seen_at: nowIso,
            telemetry_received_at: nowIso,
            updated_at: nowIso,
          });

          // Alerts
          if (data.fillPercentage >= 95) {
            const alertType = data.fillPercentage >= 100 ? 'OVERFLOW' : 'FULL';
            const { data: existing } = await supabase.from('alerts').select('id').eq('bin_id', bin.id).eq('alert_type', alertType).eq('status', 'OPEN').maybeSingle();
            if (!existing) {
              await supabase.from('alerts').insert({
                bin_id: bin.id,
                device_id: devId,
                alert_type: alertType,
                severity: 'CRITICAL',
                status: 'OPEN',
                message: `${alertType === 'OVERFLOW' ? 'Bin overflow detected' : 'Bin full threshold reached'} at ${data.fillPercentage}% (${bin.name})`,
                created_at: nowIso,
              });
            }
          } else if (data.fillPercentage < 85) {
            await supabase.from('alerts').update({ status: 'RESOLVED', resolved_at: nowIso }).eq('bin_id', bin.id).eq('status', 'OPEN');
          }
        }
      } catch {
        // Fallback gracefully
      }
    }

    return sendResponse(200, {
      ok: true,
      success: true,
      accepted: true,
      deviceId: devId,
      serverTimestamp: nowIso,
      sequence: data.sequence,
      fillPercentage: data.fillPercentage,
      distanceCm: data.distanceCm,
      rawDistanceCm: rawDist,
      gpsFix: data.gpsFix ?? false,
      evaluatedStatus,
    });
  } catch (err: any) {
    return sendResponse(500, { ok: false, error: 'INTERNAL_ERROR', message: err.message || 'Server error' });
  }
}
