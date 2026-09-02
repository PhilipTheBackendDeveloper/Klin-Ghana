import { describe, it, expect } from 'vitest';
import { IotIngestionService, TelemetryPayloadSchema } from '../src/services/iotIngestion';
import { SmartBin, AlertNotification } from '../src/types';

const testBinSB024: SmartBin = {
  id: 'sb-024',
  code: 'SB-024',
  name: 'SmartBin SB-024 (Physical)',
  location: { lat: 5.5560, lng: -0.1818, address: 'Test Bench' },
  category: 'plastic',
  capacity: 240,
  currentFillLevel: 40,
  status: 'normal',
  lidStatus: 'closed',
  lastUpdated: new Date().toISOString(),
  firmwareVersion: 'v1.0.0-esp32-core',
};

describe('IoT Ingestion & Telemetry Validation Suite', () => {
  it('validates compliant telemetry packet successfully', () => {
    const validPacket = {
      schemaVersion: 1,
      deviceId: 'SB-024',
      timestamp: new Date().toISOString(),
      fillPercentage: 81.4,
      distanceCm: 22.6,
      binStatus: 'NEAR_FULL',
      lidState: 'CLOSED',
      latitude: 5.5560,
      longitude: -0.1818,
      gpsAccuracyM: 5.2,
      wifiRssi: -62,
      batteryPercentage: 71,
      temperatureC: 31,
      firmwareVersion: 'v2.4.1'
    };

    const parseResult = TelemetryPayloadSchema.safeParse(validPacket);
    expect(parseResult.success).toBe(true);
  });

  it('rejects malformed packet with missing or out-of-bounds fields', () => {
    const invalidPacket = {
      schemaVersion: 1,
      deviceId: '', // Empty deviceId
      fillPercentage: 250, // Out of bounds (>120)
    };

    const parseResult = TelemetryPayloadSchema.safeParse(invalidPacket);
    expect(parseResult.success).toBe(false);
  });

  it('correctly maps fill levels to domain statuses with hysteresis', () => {
    expect(IotIngestionService.calculateStatus(40)).toBe('normal');
    expect(IotIngestionService.calculateStatus(88)).toBe('warning');
    expect(IotIngestionService.calculateStatus(96)).toBe('critical');
    expect(IotIngestionService.calculateStatus(101)).toBe('overflow');
  });

  it('evaluates alerts and avoids duplicated alert storms', () => {
    const bins: SmartBin[] = [{ ...testBinSB024 }];
    const alerts: AlertNotification[] = [];

    let updatedBin: SmartBin | null = null;
    let newAlert: AlertNotification | null = null;
    let resolvedAlertId: string | null = null;

    // First: 96% -> triggers FULL alert
    const result1 = IotIngestionService.processTelemetry(
      {
        schemaVersion: 1,
        deviceId: 'SB-024',
        timestamp: new Date().toISOString(),
        fillPercentage: 96.0,
        distanceCm: 6.0,
        lidState: 'CLOSED',
        wifiRssi: -60,
        batteryPercentage: 80,
        temperatureC: 28,
        firmwareVersion: 'v2.4.1'
      },
      bins,
      alerts,
      (b) => { updatedBin = b; },
      (a) => { newAlert = a; alerts.push(a); },
      (id) => { resolvedAlertId = id; }
    );

    expect(result1.success).toBe(true);
    expect(result1.evaluatedStatus).toBe('critical');
    expect(newAlert).not.toBeNull();
    expect(alerts.length).toBe(1);

    // Second: 97% -> deduplicated, does NOT create duplicate alert
    newAlert = null;
    const result2 = IotIngestionService.processTelemetry(
      {
        schemaVersion: 1,
        deviceId: 'SB-024',
        timestamp: new Date().toISOString(),
        fillPercentage: 97.0,
        distanceCm: 5.0,
        lidState: 'CLOSED',
        wifiRssi: -60,
        batteryPercentage: 80,
        temperatureC: 28,
        firmwareVersion: 'v2.4.1'
      },
      bins,
      alerts,
      (b) => { updatedBin = b; },
      (a) => { newAlert = a; alerts.push(a); },
      (id) => { resolvedAlertId = id; }
    );

    expect(result2.success).toBe(true);
    expect(newAlert).toBeNull(); // Deduplicated
    expect(alerts.length).toBe(1);

    // Third: After collection (8%) -> recovers and resolves alert
    const result3 = IotIngestionService.processTelemetry(
      {
        schemaVersion: 1,
        deviceId: 'SB-024',
        timestamp: new Date().toISOString(),
        fillPercentage: 8.0,
        distanceCm: 92.0,
        lidState: 'CLOSED',
        wifiRssi: -60,
        batteryPercentage: 80,
        temperatureC: 28,
        firmwareVersion: 'v2.4.1'
      },
      bins,
      alerts,
      (b) => { updatedBin = b; },
      (a) => { newAlert = a; },
      (id) => { resolvedAlertId = id; }
    );

    expect(result3.success).toBe(true);
    expect(result3.evaluatedStatus).toBe('normal');
    expect(resolvedAlertId).toBe(alerts[0].id);
  });
});
