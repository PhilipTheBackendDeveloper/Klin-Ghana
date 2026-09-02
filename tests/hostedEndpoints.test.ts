import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createIotServer } from '../src/server/iotServer';
import http from 'http';

describe('Hosted Endpoint Specification Suite (/api/health and /api/iot/telemetry)', () => {
  let server: http.Server;
  const testPort = 3011;
  const baseUrl = `http://localhost:${testPort}`;

  beforeAll(async () => {
    process.env.DEVICE_CREDENTIALS_JSON = JSON.stringify({
      'SB-024': 'klinghana_dev_device_key_sb024',
    });
    server = createIotServer(testPort);
    await new Promise<void>((resolve) => server.listen(testPort, resolve));
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('GET /api/health returns status ok with database connectivity', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(typeof body.database).toBe('string');
    expect(body.timestamp).toBeDefined();
  });

  it('POST /api/iot/telemetry accepts SB-024 telemetry and returns Section 14 contract', async () => {
    const payload = {
      schemaVersion: 1,
      messageId: `SB-024-${Date.now()}-100`,
      sequence: 100,
      deviceId: 'SB-024',
      timestamp: new Date().toISOString(),
      fillPercentage: 42.6,
      distanceCm: 31.8,
      rawDistanceCm: 31.8,
      fillStatus: 'NORMAL',
      binStatus: 'NORMAL',
      lidState: 'CLOSED',
      latitude: 5.5560,
      longitude: -0.1818,
      gpsFix: true,
      wifiRssi: -55,
      firmwareVersion: 'v1.0.0-esp32-core',
    };

    const res = await fetch(`${baseUrl}/api/iot/telemetry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': 'SB-024',
        'X-Device-Key': 'klinghana_dev_device_key_sb024',
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.deviceId).toBe('SB-024');
    expect(body.accepted).toBe(true);
    expect(body.sequence).toBe(100);
    expect(body.serverTimestamp).toBeDefined();
  });

  it('POST /api/iot/telemetry rejects missing credentials with 401', async () => {
    const res = await fetch(`${baseUrl}/api/iot/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: 'SB-024' }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('INVALID_DEVICE_CREDENTIAL');
  });

  it('POST /api/iot/telemetry rejects device mismatch with 403', async () => {
    const res = await fetch(`${baseUrl}/api/iot/telemetry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': 'SB-024',
        'X-Device-Key': 'klinghana_dev_device_key_sb024',
      },
      body: JSON.stringify({
        schemaVersion: 1,
        messageId: `SB-OTHER-${Date.now()}-1`,
        sequence: 1,
        deviceId: 'SB-999',
        timestamp: new Date().toISOString(),
        fillPercentage: 50,
        distanceCm: 50,
      }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('DEVICE_MISMATCH');
  });
});
