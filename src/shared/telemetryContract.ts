import { z } from 'zod';

export const HardwareFillStatusSchema = z.enum([
  'NORMAL',
  'FILLING',
  'NEAR_FULL',
  'FULL',
  'OVERFLOW',
  'OFFLINE',
  'FAULT',
  'UNKNOWN',
]);

export type HardwareFillStatus = z.infer<typeof HardwareFillStatusSchema>;

export const TelemetryPayloadSchema = z.object({
  schemaVersion: z.number().int().min(1).default(1),
  messageId: z.string().min(8).max(128).optional(),
  sequence: z.number().int().min(0).optional(),
  deviceId: z.string().min(3).max(64),
  timestamp: z.union([z.string(), z.number()]),
  fillPercentage: z.number().min(0).max(120),
  distanceCm: z.number().min(1).max(500),
  rawDistanceCm: z.number().min(1).max(500).optional(),
  fillStatus: HardwareFillStatusSchema.optional(),
  binStatus: HardwareFillStatusSchema.optional(),
  lidState: z.enum(['OPEN', 'CLOSED']).default('CLOSED'),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  gpsFix: z.boolean().default(false),
  gpsAccuracyM: z.number().min(0).max(10000).nullable().optional().default(null),
  gpsUpdatedAt: z.string().nullable().optional().default(null),
  satellites: z.number().int().min(0).max(64).nullable().optional().default(null),
  wifiRssi: z.number().int().min(-120).max(0).nullable().optional().default(null),
  batteryPercentage: z.number().int().min(0).max(100).nullable().optional().default(null),
  temperatureC: z.number().min(-20).max(85).nullable().optional().default(null),
  firmwareVersion: z.string().min(1).max(64).default('v1.0.0-esp32-core'),
}).superRefine((payload, ctx) => {
  if (payload.gpsFix && (typeof payload.latitude !== 'number' || typeof payload.longitude !== 'number')) {
    ctx.addIssue({
      code: 'custom',
      path: ['gpsFix'],
      message: 'gpsFix=true requires numeric latitude and longitude.',
    });
  }
});

export type TelemetryPayload = z.infer<typeof TelemetryPayloadSchema>;

export const normalizeDeviceId = (deviceId: string): string => deviceId.trim().toUpperCase();

export const calculateHardwareFillStatus = (fillPercentage: number): HardwareFillStatus => {
  if (fillPercentage >= 100) return 'OVERFLOW';
  if (fillPercentage >= 95) return 'FULL';
  if (fillPercentage >= 85) return 'NEAR_FULL';
  if (fillPercentage >= 70) return 'FILLING';
  return 'NORMAL';
};

export const calculateUiStatus = (fillPercentage: number): 'normal' | 'warning' | 'critical' | 'overflow' | 'offline' => {
  if (fillPercentage >= 100) return 'overflow';
  if (fillPercentage >= 95) return 'critical';
  if (fillPercentage >= 85) return 'warning';
  return 'normal';
};

export const telemetryTimestampToIso = (timestamp: string | number): string => {
  if (typeof timestamp === 'number') return new Date(timestamp).toISOString();
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

export const isDuplicateTelemetry = (
  cache: Set<string>,
  deviceId: string,
  messageId?: string,
): boolean => {
  if (!messageId) return false;
  const key = `${normalizeDeviceId(deviceId)}:${messageId}`;
  if (cache.has(key)) return true;
  cache.add(key);
  return false;
};

export const isStaleSequence = (
  lastSequenceByDevice: Map<string, number>,
  deviceId: string,
  sequence?: number,
): boolean => {
  if (sequence === undefined) return false;
  const normalized = normalizeDeviceId(deviceId);
  const lastSequence = lastSequenceByDevice.get(normalized);
  if (lastSequence !== undefined && sequence <= lastSequence) return true;
  lastSequenceByDevice.set(normalized, sequence);
  return false;
};
