import { SmartBin, AlertNotification } from '../types';
import {
  calculateHardwareFillStatus,
  calculateUiStatus,
  HardwareFillStatus,
  TelemetryPayload,
  TelemetryPayloadSchema,
  telemetryTimestampToIso,
} from '../shared/telemetryContract';

export { TelemetryPayloadSchema } from '../shared/telemetryContract';
export type { TelemetryPayload } from '../shared/telemetryContract';

export interface IngestionResult {
  success: boolean;
  deviceId: string;
  fillPercentage: number;
  evaluatedStatus: string;
  alertsGenerated: string[];
  alertsResolved: string[];
  timestamp: string;
  error?: string;
}

const hasNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export class IotIngestionService {
  public static calculateStatus(fill: number): 'normal' | 'warning' | 'critical' | 'overflow' | 'offline' {
    return calculateUiStatus(fill);
  }

  public static calculateFillStatus(fill: number): HardwareFillStatus {
    return calculateHardwareFillStatus(fill);
  }

  public static processTelemetry(
    rawPayload: unknown,
    currentBins: SmartBin[],
    activeAlerts: AlertNotification[],
    onStateUpdate: (updatedBin: SmartBin) => void,
    onAlertGenerated: (newAlert: AlertNotification) => void,
    onAlertResolved: (resolvedAlertId: string) => void
  ): IngestionResult {
    const parseResult = TelemetryPayloadSchema.safeParse(rawPayload);

    if (!parseResult.success) {
      return {
        success: false,
        deviceId: 'UNKNOWN',
        fillPercentage: 0,
        evaluatedStatus: 'ERROR',
        alertsGenerated: [],
        alertsResolved: [],
        timestamp: new Date().toISOString(),
        error: `Payload Validation Failed: ${parseResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')}`,
      };
    }

    const payload: TelemetryPayload = parseResult.data;
    const nowIso = telemetryTimestampToIso(payload.timestamp);
    const evaluatedDomainStatus = this.calculateStatus(payload.fillPercentage);
    const evaluatedHardwareStatus = this.calculateFillStatus(payload.fillPercentage);

    const existingBinIndex = currentBins.findIndex(
      b => b.code.toUpperCase() === payload.deviceId.toUpperCase() || b.id === payload.deviceId
    );
    const targetBin = existingBinIndex !== -1 ? currentBins[existingBinIndex] : null;

    const generatedAlerts: string[] = [];
    const resolvedAlerts: string[] = [];

    if (targetBin) {
      const hasGpsFix = payload.gpsFix && hasNumber(payload.latitude) && hasNumber(payload.longitude);
      const updatedBin: SmartBin = {
        ...targetBin,
        currentFillLevel: Math.round(payload.fillPercentage),
        distanceCm: payload.distanceCm,
        rawDistanceCm: payload.rawDistanceCm ?? payload.distanceCm,
        status: evaluatedDomainStatus,
        lidState: payload.lidState,
        batteryLevel: payload.batteryPercentage ?? null,
        wifiSignal: payload.wifiRssi ?? targetBin.wifiSignal ?? null,
        temperature: payload.temperatureC ?? null,
        wifiConnected: true,
        firmwareVersion: payload.firmwareVersion,
        lastUpdated: nowIso,
        hardwareFillStatus: payload.fillStatus || payload.binStatus || evaluatedHardwareStatus,
        telemetryMessageId: payload.messageId,
        telemetrySequence: payload.sequence,
        gpsFix: Boolean(hasGpsFix),
        gpsAccuracyM: payload.gpsAccuracyM ?? null,
        gpsSatellites: payload.satellites ?? null,
        gpsUpdatedAt: hasGpsFix ? (payload.gpsUpdatedAt || nowIso) : targetBin.gpsUpdatedAt,
        location: hasGpsFix
          ? {
              ...targetBin.location,
              lat: payload.latitude as number,
              lng: payload.longitude as number,
            }
          : targetBin.location,
      };

      onStateUpdate(updatedBin);

      const existingCriticalAlert = activeAlerts.find(
        a => (a.binCode === targetBin.code || a.binId === targetBin.id) && !a.read && (a.severity === 'danger' || a.severity === 'warning')
      );

      if (payload.fillPercentage >= 100) {
        if (!existingCriticalAlert || !existingCriticalAlert.message.includes('Overflow')) {
          const overflowAlert: AlertNotification = {
            id: `alert-${Date.now()}-${targetBin.id}`,
            binId: targetBin.id,
            binCode: targetBin.code,
            binName: targetBin.name,
            type: 'OVERFLOW_95',
            severity: 'danger',
            message: `Ultrasonic fill reached ${payload.fillPercentage.toFixed(1)}% (Overflow confirmed at ${targetBin.name})`,
            timestamp: nowIso,
            read: false,
          };
          onAlertGenerated(overflowAlert);
          generatedAlerts.push('OVERFLOW');
        }
      } else if (payload.fillPercentage >= 95) {
        if (!existingCriticalAlert) {
          const fullAlert: AlertNotification = {
            id: `alert-${Date.now()}-${targetBin.id}`,
            binId: targetBin.id,
            binCode: targetBin.code,
            binName: targetBin.name,
            type: 'OVERFLOW_95',
            severity: 'danger',
            message: `Fill level reached ${payload.fillPercentage.toFixed(1)}% at ${targetBin.name}. Collection needed.`,
            timestamp: nowIso,
            read: false,
          };
          onAlertGenerated(fullAlert);
          generatedAlerts.push('FULL');
        }
      } else if (payload.fillPercentage < 85 && existingCriticalAlert) {
        onAlertResolved(existingCriticalAlert.id);
        resolvedAlerts.push(existingCriticalAlert.id);
      }
    }

    return {
      success: true,
      deviceId: payload.deviceId,
      fillPercentage: payload.fillPercentage,
      evaluatedStatus: evaluatedDomainStatus,
      alertsGenerated: generatedAlerts,
      alertsResolved: resolvedAlerts,
      timestamp: nowIso,
    };
  }
}
