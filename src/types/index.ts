export type UserRole = 'admin' | 'researcher' | 'citizen';

export type BinStatus = 'normal' | 'warning' | 'critical' | 'overflow' | 'offline';

export type WasteCategory = 'general' | 'plastic' | 'organic' | 'paper' | 'electronic' | 'glass';

export interface GpsLocation {
  lat: number;
  lng: number;
  address: string;
  city: string;
  landmark?: string;
}

export interface TelemetryReading {
  timestamp: string;
  fillLevel: number; // 0 - 100%
  lidState: 'OPEN' | 'CLOSED';
  batteryLevel?: number | null; // 0 - 100%, null when unsupported by physical hardware
  wifiSignal?: number | null; // dBm, null when unavailable
  temperature?: number | null; // Celsius, null when unsupported by physical hardware
  weightKg: number;
  distanceCm: number; // Ultrasonic reading (e.g. 5cm to 100cm)
}

export interface SmartBin {
  id: string;
  name: string;
  code: string; // e.g. KB-ACC-001 or SB-024
  category: WasteCategory;
  capacityLiters?: number;
  location: GpsLocation;
  status: BinStatus;
  currentFillLevel: number; // 0 - 100%
  lidState: 'OPEN' | 'CLOSED';
  lastLidOpenedAt?: string;
  lidAutoCloseSeconds?: number; // default 5s
  proximityTriggered?: boolean;
  batteryLevel?: number | null; // 0 - 100%, null when unsupported by physical hardware
  wifiConnected?: boolean;
  distanceCm?: number;
  rawDistanceCm?: number;
  wifiSignal?: number | null; // dBm
  temperature?: number | null; // Celsius
  weightKg?: number;
  lastMaintenance?: string;
  firmwareVersion?: string;
  lastUpdated?: string;
  lastCollectedAt?: string;
  totalCollectionsCount?: number;
  assignedZone?: string;
  hardwareFillStatus?: string;
  telemetryMessageId?: string;
  telemetrySequence?: number;
  gpsFix?: boolean;
  gpsAccuracyM?: number | null;
  gpsSatellites?: number | null;
  gpsUpdatedAt?: string;
  notes?: string;
}

export interface AlertNotification {
  id: string;
  binId: string;
  binName: string;
  binCode: string;
  type: 'WARNING_80' | 'OVERFLOW_95' | 'BATTERY_LOW' | 'OFFLINE' | 'LID_STUCK' | 'CITIZEN_REPORT' | 'SENSOR_FAULT';
  message: string;
  severity: 'info' | 'warning' | 'danger';
  timestamp: string;
  read: boolean;
}

export interface CollectionRecord {
  id: string;
  binId: string;
  binName: string;
  binCode: string;
  timestamp: string;
  fillLevelBefore: number;
  weightCollectedKg: number;
  collectorName: string;
  zone: string;
}

export interface CitizenReport {
  id: string;
  binId?: string;
  binName?: string;
  locationText: string;
  issueType: string;
  description: string;
  reportedBy: string;
  timestamp: string;
  status: 'Pending' | 'Investigating' | 'Assigned' | 'Resolved' | 'Closed';
  photoUrl?: string;
}

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  suggestedAction?: string;
  categoryTag?: WasteCategory;
}


