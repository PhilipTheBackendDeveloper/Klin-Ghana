import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createIotServer } from '../src/server/iotServer';
import { SmartBinSimulator } from '../simulator';
import http from 'http';

describe('Cloud & IoT HTTP Ingestion Endpoint Suite', () => {
  let server: http.Server;
  const testPort = 3009;
  const endpoint = `http://localhost:${testPort}/api/iot-telemetry`;

  beforeAll(async () => {
    process.env.DEVICE_CREDENTIALS_JSON = JSON.stringify({
      'SB-024': 'test_device_key_sb024',
      'SB-091': 'test_device_key_sb091',
    });
    server = createIotServer(testPort);
    await new Promise<void>((resolve) => server.listen(testPort, resolve));
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('1. accepts valid authenticated SB-024 telemetry request via HTTP POST', async () => {
    const payload = SmartBinSimulator.generatePayload('40', { deviceId: 'SB-024' });
    const response = await SmartBinSimulator.sendHttpTelemetry(payload, endpoint);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.deviceId).toBe('SB-024');
    expect(response.body.evaluatedStatus).toBe('NORMAL');
  });

  it('2. rejects unauthenticated request with invalid device key (401 Unauthorized)', async () => {
    const payload = SmartBinSimulator.generatePayload('40', { deviceId: 'SB-024' });
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': 'SB-024',
        'X-Device-Key': 'invalid_compromised_key_123',
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('INVALID_DEVICE_CREDENTIAL');
  });

  it('3. rejects device mismatch / impersonation attempt (403 Forbidden)', async () => {
    const payload = SmartBinSimulator.generatePayload('40', { deviceId: 'SB-091' });
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': 'SB-024',
        'X-Device-Key': 'test_device_key_sb024',
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('DEVICE_MISMATCH');
  });

  it('4. rejects malformed payload with out-of-bounds fill (400 Bad Request)', async () => {
    const malformed = {
      schemaVersion: 1,
      deviceId: 'SB-024',
      fillPercentage: 350,
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': 'SB-024',
        'X-Device-Key': 'test_device_key_sb024',
      },
      body: JSON.stringify(malformed),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('INVALID_PAYLOAD');
  });

  it('5. evaluates status transitions correctly', async () => {
    const res40 = await SmartBinSimulator.sendHttpTelemetry(SmartBinSimulator.generatePayload('40', { deviceId: 'SB-024' }), endpoint);
    expect(res40.body.evaluatedStatus).toBe('NORMAL');

    const res88 = await SmartBinSimulator.sendHttpTelemetry(SmartBinSimulator.generatePayload('88', { deviceId: 'SB-024' }), endpoint);
    expect(res88.body.evaluatedStatus).toBe('NEAR_FULL');

    const res96 = await SmartBinSimulator.sendHttpTelemetry(SmartBinSimulator.generatePayload('96', { deviceId: 'SB-024' }), endpoint);
    expect(res96.body.evaluatedStatus).toBe('FULL');

    const res102 = await SmartBinSimulator.sendHttpTelemetry(SmartBinSimulator.generatePayload('overflow', { deviceId: 'SB-024' }), endpoint);
    expect(res102.body.evaluatedStatus).toBe('OVERFLOW');

    const res8 = await SmartBinSimulator.sendHttpTelemetry(SmartBinSimulator.generatePayload('collect', { deviceId: 'SB-024' }), endpoint);
    expect(res8.body.evaluatedStatus).toBe('NORMAL');
  }, 15000);

  it('6. rejects duplicate messageId replay attempts (409 Conflict)', async () => {
    const payload = SmartBinSimulator.generatePayload('40', { deviceId: 'SB-024' });
    const first = await SmartBinSimulator.sendHttpTelemetry(payload, endpoint);
    const replay = await SmartBinSimulator.sendHttpTelemetry(payload, endpoint);

    expect(first.status).toBe(200);
    expect(replay.status).toBe(409);
    expect(replay.body.error).toBe('DUPLICATE_MESSAGE');
  });

  it('7. rejects stale device sequence packets (409 Conflict)', async () => {
    const firstPayload = SmartBinSimulator.generatePayload('40', { deviceId: 'SB-091' });
    const stalePayload = SmartBinSimulator.generatePayload('88', { deviceId: 'SB-091' });
    stalePayload.sequence = firstPayload.sequence;

    const first = await SmartBinSimulator.sendHttpTelemetry(firstPayload, endpoint);
    const stale = await SmartBinSimulator.sendHttpTelemetry(stalePayload, endpoint);

    expect(first.status).toBe(200);
    expect(stale.status).toBe(409);
    expect(stale.body.error).toBe('STALE_SEQUENCE');
  });
});