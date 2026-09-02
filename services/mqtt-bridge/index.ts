import fs from 'fs';
import path from 'path';
import mqtt from 'mqtt';
import { createClient } from '@supabase/supabase-js';
import {
  calculateHardwareFillStatus,
  normalizeDeviceId,
  TelemetryPayloadSchema,
} from '../../src/shared/telemetryContract';

const loadEnvFile = (filePath: string) => {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!process.env[key]) process.env[key] = rest.join('=').replace(/^['"]|['"]$/g, '');
  }
};

loadEnvFile(path.resolve(process.cwd(), '.env'));
loadEnvFile(path.resolve(process.cwd(), 'services/mqtt-bridge/.env'));

const required = (name: string) => process.env[name]?.trim() || '';

const supabaseUrl = required('SUPABASE_URL');
const supabaseSecretKey = required('SUPABASE_SECRET_KEY');
const hiveHost = required('HIVEMQ_HOST');
const hivePort = Number(required('HIVEMQ_PORT') || 8883);
const hiveUsername = required('HIVEMQ_USERNAME');
const hivePassword = required('HIVEMQ_PASSWORD');
const bridgeDevice = normalizeDeviceId(required('MQTT_DEVICE_ID') || 'SB-024');

if (!hiveHost || !hiveUsername || !hivePassword) {
  console.log('HIVEMQ_CLOUD=BLOCKED_CREDENTIALS');
  console.log('Set HIVEMQ_HOST, HIVEMQ_USERNAME, and HIVEMQ_PASSWORD in services/mqtt-bridge/.env.');
  process.exit(0);
}

if (!supabaseUrl || !supabaseSecretKey) {
  console.log('SUPABASE_CLOUD=BLOCKED_CREDENTIALS');
  console.log('Set SUPABASE_URL and SUPABASE_SECRET_KEY in an ignored environment file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const baseTopic = `klinghana/v1/${bridgeDevice}`;
const statusTopic = `${baseTopic}/status`;
const telemetryTopic = `${baseTopic}/telemetry`;
const eventsTopic = `${baseTopic}/events`;
const locationTopic = `${baseTopic}/location`;
const ackTopic = `${baseTopic}/ack`;
const commandsTopic = `${baseTopic}/commands`;

const markStatus = async (connectionStatus: 'ONLINE' | 'OFFLINE') => {
  const { data: bin } = await supabase.from('bins').select('id').eq('code', bridgeDevice).maybeSingle();
  if (!bin) return;
  await supabase.from('bin_current_state').upsert({
    bin_id: bin.id,
    device_id: bridgeDevice,
    connection_status: connectionStatus,
    bin_status: connectionStatus === 'ONLINE' ? 'NORMAL' : 'OFFLINE',
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  await supabase.from('devices').update({ last_heartbeat: new Date().toISOString() }).eq('device_id', bridgeDevice);
};

const ingestTelemetry = async (raw: Buffer) => {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw.toString('utf8'));
  } catch (error: any) {
    console.error(`[MQTT] Invalid JSON: ${error.message}`);
    return;
  }

  const result = TelemetryPayloadSchema.safeParse(parsedJson);
  if (!result.success) {
    console.error('[MQTT] Invalid telemetry payload', result.error.issues);
    return;
  }

  const payload = result.data;
  const deviceId = normalizeDeviceId(payload.deviceId);
  if (deviceId !== bridgeDevice) {
    console.error(`[MQTT] Device mismatch: bridge=${bridgeDevice} payload=${deviceId}`);
    return;
  }

  const { data: bin, error: binError } = await supabase.from('bins').select('id, name').eq('code', deviceId).maybeSingle();
  if (binError || !bin) {
    console.error('[MQTT] Bin lookup failed', binError?.message || 'not registered');
    return;
  }

  if (payload.messageId) {
    const { data: duplicate } = await supabase
      .from('telemetry')
      .select('id')
      .eq('device_id', deviceId)
      .eq('message_id', payload.messageId)
      .maybeSingle();
    if (duplicate) {
      console.log(`[MQTT] Duplicate ignored: ${payload.messageId}`);
      return;
    }
  }

  if (payload.sequence !== undefined) {
    const { data: current } = await supabase
      .from('bin_current_state')
      .select('last_message_sequence')
      .eq('bin_id', bin.id)
      .maybeSingle();
    if (current?.last_message_sequence !== null && current?.last_message_sequence !== undefined && payload.sequence <= Number(current.last_message_sequence)) {
      console.log(`[MQTT] Stale sequence ignored: ${payload.sequence}`);
      return;
    }
  }

  const nowIso = new Date().toISOString();
  const gpsFix = Boolean(payload.gpsFix && typeof payload.latitude === 'number' && typeof payload.longitude === 'number');
  const evaluatedStatus = calculateHardwareFillStatus(payload.fillPercentage);
  const commonRow = {
    bin_id: bin.id,
    device_id: deviceId,
    fill_percentage: payload.fillPercentage,
    distance_cm: payload.distanceCm,
    fill_status: evaluatedStatus,
    lid_state: payload.lidState,
    battery_percentage: payload.batteryPercentage ?? null,
    temperature_c: payload.temperatureC ?? null,
    wifi_rssi: payload.wifiRssi ?? null,
    latitude: gpsFix ? payload.latitude : null,
    longitude: gpsFix ? payload.longitude : null,
    gps_accuracy_m: payload.gpsAccuracyM ?? null,
    gps_fix: gpsFix,
    gps_updated_at: gpsFix ? (payload.gpsUpdatedAt || nowIso) : null,
    satellites: payload.satellites ?? null,
    location_source: gpsFix ? 'GPS' : 'UNKNOWN',
    firmware_version: payload.firmwareVersion,
    message_id: payload.messageId ?? null,
    message_sequence: payload.sequence ?? null,
  };

  const { error: insertError } = await supabase.from('telemetry').insert({ ...commonRow, recorded_at: nowIso });
  if (insertError) {
    console.error('[MQTT] Telemetry insert failed', insertError.message);
    return;
  }

  const { error: stateError } = await supabase.from('bin_current_state').upsert({
    ...commonRow,
    bin_status: evaluatedStatus,
    connection_status: 'ONLINE',
    last_seen_at: nowIso,
    telemetry_received_at: nowIso,
    updated_at: nowIso,
    last_message_sequence: payload.sequence ?? null,
  });
  if (stateError) {
    console.error('[MQTT] Current-state upsert failed', stateError.message);
    return;
  }

  await supabase.from('devices').update({ last_heartbeat: nowIso, firmware_version: payload.firmwareVersion }).eq('device_id', deviceId);
  console.log(`[MQTT] Accepted ${deviceId} seq=${payload.sequence ?? 'n/a'} fill=${payload.fillPercentage}% status=${evaluatedStatus}`);
};

const client = mqtt.connect(`mqtts://${hiveHost}:${hivePort}`, {
  clientId: `klinghana-mqtt-bridge-${bridgeDevice.toLowerCase()}-${Date.now()}`,
  username: hiveUsername,
  password: hivePassword,
  clean: true,
  reconnectPeriod: 5000,
  connectTimeout: 30000,
  will: {
    topic: statusTopic,
    payload: 'OFFLINE',
    qos: 1,
    retain: true,
  },
});

client.on('connect', async () => {
  console.log(`[MQTT] Connected to HiveMQ ${hiveHost}:${hivePort}`);
  client.publish(statusTopic, 'ONLINE', { qos: 1, retain: true });
  client.subscribe([telemetryTopic, eventsTopic, locationTopic, ackTopic, commandsTopic], { qos: 1 });
  await markStatus('ONLINE');
});

client.on('message', async (topic, message) => {
  if (topic === telemetryTopic || topic === locationTopic) {
    await ingestTelemetry(message);
    return;
  }
  console.log(`[MQTT] ${topic}: ${message.toString('utf8')}`);
});

client.on('reconnect', () => console.log('[MQTT] Reconnecting...'));
client.on('error', (error) => console.error('[MQTT] Error', error.message));
client.on('close', async () => {
  console.log('[MQTT] Connection closed');
  await markStatus('OFFLINE');
});

process.on('SIGINT', () => {
  client.publish(statusTopic, 'OFFLINE', { qos: 1, retain: true }, () => client.end(false, () => process.exit(0)));
});
