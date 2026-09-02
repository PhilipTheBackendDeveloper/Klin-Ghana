import { calculateHardwareFillStatus, TelemetryPayload } from '../src/shared/telemetryContract';
import { getDeviceCredential } from '../src/server/deviceCredentials';

export interface SimulatorScenarioOptions {
  deviceId?: string;
  fillPercentage?: number;
  lidState?: 'OPEN' | 'CLOSED';
  wifiRssi?: number;
  gpsFix?: boolean;
}

const sequenceByDevice = new Map<string, number>();

const nextPacketIdentity = (deviceId: string) => {
  const nextSequence = (sequenceByDevice.get(deviceId) || 0) + 1;
  sequenceByDevice.set(deviceId, nextSequence);
  return {
    sequence: nextSequence,
    messageId: `${deviceId}-${Date.now()}-${nextSequence}`,
  };
};

const distanceFromFill = (fillPercentage: number) => Number(Math.max(4, 100 - fillPercentage * 0.95).toFixed(1));

export class SmartBinSimulator {
  public static generatePayload(scenario: string, options: SimulatorScenarioOptions = {}): TelemetryPayload {
    const deviceId = options.deviceId || 'SB-024';
    const identity = nextPacketIdentity(deviceId);
    const gpsFix = options.gpsFix !== undefined ? options.gpsFix : true;

    const buildPayload = (fillPercentage: number, distanceCm: number): TelemetryPayload => ({
      schemaVersion: 1,
      messageId: identity.messageId,
      sequence: identity.sequence,
      deviceId,
      timestamp: new Date().toISOString(),
      fillPercentage,
      distanceCm,
      rawDistanceCm: distanceCm,
      fillStatus: calculateHardwareFillStatus(fillPercentage),
      binStatus: calculateHardwareFillStatus(fillPercentage),
      lidState: options.lidState || 'CLOSED',
      latitude: gpsFix ? (deviceId === 'SB-024' ? 5.5560 : 5.5800) : null,
      longitude: gpsFix ? (deviceId === 'SB-024' ? -0.1818 : -0.1750) : null,
      gpsFix,
      gpsAccuracyM: gpsFix ? 5.2 : null,
      gpsUpdatedAt: gpsFix ? new Date().toISOString() : null,
      satellites: gpsFix ? 7 : 0,
      wifiRssi: options.wifiRssi !== undefined ? options.wifiRssi : -62,
      batteryPercentage: null,
      temperatureC: null,
      firmwareVersion: 'v1.0.0-simulator-core',
    });

    switch (scenario.toLowerCase()) {
      case 'normal':
      case '40':
        return buildPayload(options.fillPercentage ?? 40.0, 60.0);

      case 'near_full':
      case '88':
        return buildPayload(options.fillPercentage ?? 88.0, 12.0);

      case 'full':
      case '96':
        return buildPayload(options.fillPercentage ?? 96.0, 6.0);

      case 'overflow':
      case '101':
      case '102':
        return buildPayload(options.fillPercentage ?? 101.5, 4.5);

      case 'weak_signal':
        return buildPayload(40.0, 60.0);

      case 'no_gps':
        return this.generatePayload('40', { ...options, deviceId, gpsFix: false });

      case '8':
      case 'collect':
      case 'collected':
        return buildPayload(8.0, 92.0);

      default: {
        const parsedNum = parseFloat(scenario);
        if (!Number.isNaN(parsedNum)) return buildPayload(parsedNum, distanceFromFill(parsedNum));
        return buildPayload(40.0, 60.0);
      }
    }
  }

  public static async sendHttpTelemetry(
    payload: TelemetryPayload,
    endpointUrl: string = 'http://localhost:3001/api/iot-telemetry'
  ): Promise<{ status: number; body: any }> {
    const deviceKey = getDeviceCredential(payload.deviceId) || 'missing_device_key';
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Device-Id': payload.deviceId,
      'X-Device-Key': deviceKey,
    };
    if (publishableKey) headers.apikey = publishableKey;

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const body = await response.json();
    return { status: response.status, body };
  }
}

if (process.argv[1] && /[\\/]simulator[\\/]index\.ts$/.test(process.argv[1])) {
  const targetDevice = process.argv[2] || 'SB-024';
  const scenario = process.argv[3] || '40';
  const endpoint = process.env.IOT_ENDPOINT_URL || 'http://localhost:3001/api/iot-telemetry';

  const payload = SmartBinSimulator.generatePayload(scenario, { deviceId: targetDevice });

  console.log(`[SIMULATOR] Transmitting HTTP POST to: ${endpoint}`);
  console.log(`[SIMULATOR] Device: ${targetDevice} | Scenario: ${scenario}`);
  console.log(JSON.stringify(payload, null, 2));

  SmartBinSimulator.sendHttpTelemetry(payload, endpoint)
    .then((res) => {
      console.log(`\n[SIMULATOR RESPONSE HTTP ${res.status}]`);
      console.log(JSON.stringify(res.body, null, 2));
    })
    .catch((err) => {
      console.error(`\n[SIMULATOR ERROR] Network request failed: ${err.message}`);
    });
}
