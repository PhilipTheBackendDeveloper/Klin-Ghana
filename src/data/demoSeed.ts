import { SmartBin, AlertNotification, CitizenReport, CollectionRecord } from '../types';
import { RouteStop } from '../context/SmartBinContext';



const minutesAgo = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();

export const DEMO_BINS: SmartBin[] = [
  {
    id: 'bin-sb024', code: 'SB-024', name: 'KNUST Hostel A Block', category: 'general', capacityLiters: 240,
    location: { lat: 6.6745, lng: -1.5716, address: 'KNUST Hostel A Block, Ayeduase Rd', city: 'Kumasi', landmark: 'Kumasi-Central' },
    status: 'normal', currentFillLevel: 42, lidState: 'CLOSED', batteryLevel: 88, wifiConnected: true,
    distanceCm: 58, wifiSignal: -61, temperature: 29, lastUpdated: minutesAgo(3), lastCollectedAt: minutesAgo(60 * 30),
    totalCollectionsCount: 18, assignedZone: 'Kumasi-Central', hardwareFillStatus: 'NORMAL', gpsFix: true, gpsAccuracyM: 4.2, firmwareVersion: 'v2.3.1',
  },
  {
    id: 'bin-sb011', code: 'SB-011', name: 'Ayeduase Gate Market', category: 'organic', capacityLiters: 360,
    location: { lat: 6.6791, lng: -1.5669, address: 'Ayeduase Gate Market', city: 'Kumasi', landmark: 'Kumasi-Central' },
    status: 'warning', currentFillLevel: 82, lidState: 'CLOSED', batteryLevel: 54, wifiConnected: true,
    distanceCm: 18, wifiSignal: -68, temperature: 31, lastUpdated: minutesAgo(6), lastCollectedAt: minutesAgo(60 * 20),
    totalCollectionsCount: 41, assignedZone: 'Kumasi-Central', hardwareFillStatus: 'WARNING', gpsFix: true, gpsAccuracyM: 5.1, firmwareVersion: 'v2.3.1',
  },
  {
    id: 'bin-sb007', code: 'SB-007', name: 'Kotei Roadside', category: 'general', capacityLiters: 240,
    location: { lat: 6.6802, lng: -1.5842, address: 'Kotei Road, near Sofoline Interchange', city: 'Kumasi', landmark: 'Kumasi-North' },
    status: 'overflow', currentFillLevel: 97, lidState: 'OPEN', batteryLevel: 12, wifiConnected: true,
    distanceCm: 3, wifiSignal: -74, temperature: 33, lastUpdated: minutesAgo(1), lastCollectedAt: minutesAgo(60 * 40),
    totalCollectionsCount: 26, assignedZone: 'Kumasi-North', hardwareFillStatus: 'OVERFLOW', gpsFix: true, gpsAccuracyM: 6.0, firmwareVersion: 'v2.2.9',
  },
  {
    id: 'bin-sb015', code: 'SB-015', name: 'Bomso Junction', category: 'plastic', capacityLiters: 240,
    location: { lat: 6.6889, lng: -1.5731, address: 'Bomso Junction', city: 'Kumasi', landmark: 'Kumasi-Central' },
    status: 'offline', currentFillLevel: 63, lidState: 'CLOSED', batteryLevel: 31, wifiConnected: false,
    distanceCm: 32, wifiSignal: null, temperature: null, lastUpdated: minutesAgo(58), lastCollectedAt: minutesAgo(60 * 50),
    totalCollectionsCount: 15, assignedZone: 'Kumasi-Central', hardwareFillStatus: 'UNKNOWN', gpsFix: true, gpsAccuracyM: 7.4, firmwareVersion: 'v2.1.4',
  },
  {
    id: 'bin-sb032', code: 'SB-032', name: 'Ayigya Zongo Market', category: 'organic', capacityLiters: 360,
    location: { lat: 6.6801, lng: -1.5560, address: 'Ayigya Zongo Market Rd', city: 'Kumasi', landmark: 'Kumasi-East' },
    status: 'warning', currentFillLevel: 76, lidState: 'CLOSED', batteryLevel: 45, wifiConnected: true,
    distanceCm: 22, wifiSignal: -70, temperature: 30, lastUpdated: minutesAgo(9), lastCollectedAt: minutesAgo(60 * 70),
    totalCollectionsCount: 33, assignedZone: 'Kumasi-East', hardwareFillStatus: 'WARNING', gpsFix: true, gpsAccuracyM: 5.8, firmwareVersion: 'v2.3.1',
  },
  {
    id: 'bin-sb019', code: 'SB-019', name: 'Kejetia Bus Terminal', category: 'general', capacityLiters: 480,
    location: { lat: 6.6935, lng: -1.6244, address: 'Kejetia Bus Terminal', city: 'Kumasi', landmark: 'Kumasi-North' },
    status: 'normal', currentFillLevel: 34, lidState: 'CLOSED', batteryLevel: 91, wifiConnected: true,
    distanceCm: 66, wifiSignal: -55, temperature: 28, lastUpdated: minutesAgo(2), lastCollectedAt: minutesAgo(60 * 15),
    totalCollectionsCount: 52, assignedZone: 'Kumasi-North', hardwareFillStatus: 'NORMAL', gpsFix: true, gpsAccuracyM: 3.6, firmwareVersion: 'v2.3.1',
  },
  {
    id: 'bin-sb041', code: 'SB-041', name: 'Anloga Junction E-Waste Point', category: 'electronic', capacityLiters: 180,
    location: { lat: 6.6707, lng: -1.6083, address: 'Anloga Junction', city: 'Kumasi', landmark: 'Kumasi-Central' },
    status: 'normal', currentFillLevel: 22, lidState: 'CLOSED', batteryLevel: 76, wifiConnected: true,
    distanceCm: 82, wifiSignal: -59, temperature: 27, lastUpdated: minutesAgo(11), lastCollectedAt: minutesAgo(60 * 90),
    totalCollectionsCount: 9, assignedZone: 'Kumasi-Central', hardwareFillStatus: 'NORMAL', gpsFix: true, gpsAccuracyM: 4.9, firmwareVersion: 'v2.3.0',
  },
  {
    id: 'bin-sb052', code: 'SB-052', name: 'Osu Oxford Street', category: 'plastic', capacityLiters: 360,
    location: { lat: 5.5563, lng: -0.1825, address: 'Oxford Street, Osu', city: 'Accra', landmark: 'Accra-East' },
    status: 'warning', currentFillLevel: 88, lidState: 'CLOSED', batteryLevel: 62, wifiConnected: true,
    distanceCm: 12, wifiSignal: -65, temperature: 32, lastUpdated: minutesAgo(4), lastCollectedAt: minutesAgo(60 * 25),
    totalCollectionsCount: 47, assignedZone: 'Accra-East', hardwareFillStatus: 'WARNING', gpsFix: true, gpsAccuracyM: 4.0, firmwareVersion: 'v2.3.1',
  },
  {
    id: 'bin-sb058', code: 'SB-058', name: 'Accra Central Market', category: 'organic', capacityLiters: 480,
    location: { lat: 5.5487, lng: -0.2107, address: 'Accra Central Market', city: 'Accra', landmark: 'Accra-South' },
    status: 'overflow', currentFillLevel: 99, lidState: 'OPEN', batteryLevel: 8, wifiConnected: true,
    distanceCm: 1, wifiSignal: -77, temperature: 34, lastUpdated: minutesAgo(1), lastCollectedAt: minutesAgo(60 * 95),
    totalCollectionsCount: 63, assignedZone: 'Accra-South', hardwareFillStatus: 'OVERFLOW', gpsFix: true, gpsAccuracyM: 6.6, firmwareVersion: 'v2.2.9',
  },
  {
    id: 'bin-sb063', code: 'SB-063', name: 'Labadi Beach Road', category: 'general', capacityLiters: 240,
    location: { lat: 5.5602, lng: -0.1568, address: 'Labadi Beach Road', city: 'Accra', landmark: 'Accra-South' },
    status: 'normal', currentFillLevel: 55, lidState: 'CLOSED', batteryLevel: 70, wifiConnected: true,
    distanceCm: 40, wifiSignal: -63, temperature: 30, lastUpdated: minutesAgo(7), lastCollectedAt: minutesAgo(60 * 45),
    totalCollectionsCount: 29, assignedZone: 'Accra-South', hardwareFillStatus: 'NORMAL', gpsFix: true, gpsAccuracyM: 5.0, firmwareVersion: 'v2.3.1',
  },
  {
    id: 'bin-sb071', code: 'SB-071', name: 'East Legon Mall', category: 'paper', capacityLiters: 240,
    location: { lat: 5.6392, lng: -0.1477, address: 'East Legon Mall Access Rd', city: 'Accra', landmark: 'Accra-East' },
    status: 'normal', currentFillLevel: 18, lidState: 'CLOSED', batteryLevel: 95, wifiConnected: true,
    distanceCm: 92, wifiSignal: -52, temperature: 28, lastUpdated: minutesAgo(5), lastCollectedAt: minutesAgo(60 * 10),
    totalCollectionsCount: 21, assignedZone: 'Accra-East', hardwareFillStatus: 'NORMAL', gpsFix: true, gpsAccuracyM: 3.2, firmwareVersion: 'v2.3.1',
  },
  {
    id: 'bin-sb077', code: 'SB-077', name: 'Circle Interchange', category: 'general', capacityLiters: 480,
    location: { lat: 5.5717, lng: -0.2265, address: 'Circle Interchange', city: 'Accra', landmark: 'Accra-Central' },
    status: 'offline', currentFillLevel: 70, lidState: 'CLOSED', batteryLevel: 40, wifiConnected: false,
    distanceCm: 30, wifiSignal: null, temperature: null, lastUpdated: minutesAgo(73), lastCollectedAt: minutesAgo(60 * 60),
    totalCollectionsCount: 58, assignedZone: 'Accra-Central', hardwareFillStatus: 'UNKNOWN', gpsFix: true, gpsAccuracyM: 8.1, firmwareVersion: 'v2.1.4',
  },
];

export const DEMO_ALERTS: AlertNotification[] = [
  { id: 'al-1', binId: 'bin-sb007', binCode: 'SB-007', binName: 'Kotei Roadside', type: 'OVERFLOW_95', severity: 'danger', message: 'Fill level at 97% — dispatch required immediately.', timestamp: minutesAgo(1), read: false },
  { id: 'al-2', binId: 'bin-sb058', binCode: 'SB-058', binName: 'Accra Central Market', type: 'OVERFLOW_95', severity: 'danger', message: 'Fill level at 99% — overflow risk in busy market area.', timestamp: minutesAgo(1), read: false },
  { id: 'al-3', binId: 'bin-sb058', binCode: 'SB-058', binName: 'Accra Central Market', type: 'BATTERY_LOW', severity: 'warning', message: 'Battery at 8% — schedule a sensor swap this week.', timestamp: minutesAgo(14), read: false },
  { id: 'al-4', binId: 'bin-sb032', binCode: 'SB-032', binName: 'Ayigya Zongo Market', type: 'WARNING_80', severity: 'warning', message: 'Fill level crossed the 76% threshold.', timestamp: minutesAgo(9), read: false },
  { id: 'al-5', binId: 'bin-sb077', binCode: 'SB-077', binName: 'Circle Interchange', type: 'OFFLINE', severity: 'warning', message: 'No telemetry received for 73 minutes.', timestamp: minutesAgo(73), read: false },
  { id: 'al-6', binId: 'bin-sb015', binCode: 'SB-015', binName: 'Bomso Junction', type: 'OFFLINE', severity: 'info', message: 'Device lost heartbeat 58 minutes ago.', timestamp: minutesAgo(58), read: true },
  { id: 'al-7', binId: 'bin-sb052', binCode: 'SB-052', binName: 'Osu Oxford Street', type: 'WARNING_80', severity: 'warning', message: 'Approaching capacity — added to next collection run.', timestamp: minutesAgo(120), read: true },
];

export const DEMO_REPORTS: CitizenReport[] = [
  { id: 'C-1001', binId: 'bin-sb058', binName: 'Accra Central Market', locationText: 'Accra Central Market', issueType: 'Overflow', description: 'Bin overflowing onto the walkway near the fish section.', reportedBy: 'Efua Owusu', timestamp: minutesAgo(20), status: 'Investigating' },
  { id: 'C-1002', binId: 'bin-sb024', binName: 'KNUST Hostel A Block', locationText: 'KNUST Hostel A Block', issueType: 'Lid problem', description: "Lid won't close, stuck open since this morning.", reportedBy: 'Kwabena Asante', timestamp: minutesAgo(180), status: 'Assigned' },
  { id: 'C-1003', binId: 'bin-sb015', binName: 'Bomso Junction', locationText: 'Bomso Junction', issueType: 'Sensor issue', description: 'Bin shows a constant red light, sensor might be faulty.', reportedBy: 'Nana Yaa Asantewaa', timestamp: minutesAgo(240), status: 'Investigating' },
  { id: 'C-1004', binId: 'bin-sb032', binName: 'Ayigya Zongo Market', locationText: 'Ayigya Zongo Market', issueType: 'Bin full', description: 'Bin has been full since yesterday evening, needs pickup.', reportedBy: 'Yaw Darko', timestamp: minutesAgo(300), status: 'Investigating' },
  { id: 'C-1005', binId: 'bin-sb063', binName: 'Labadi Beach Road', locationText: 'Labadi Beach Road', issueType: 'Other', description: 'Strong odor coming from the bin, may need deeper cleaning.', reportedBy: 'Abena Serwaa', timestamp: minutesAgo(60 * 24), status: 'Resolved' },
  { id: 'C-1006', binId: 'bin-sb007', binName: 'Kotei Roadside', locationText: 'Kotei Road', issueType: 'Overflow', description: 'Waste spilling onto the road shoulder near the interchange.', reportedBy: 'Kojo Antwi', timestamp: minutesAgo(60 * 30), status: 'Resolved' },
];

export const DEMO_COLLECTIONS: CollectionRecord[] = [
  { id: 'col-1', binId: 'bin-sb024', binCode: 'SB-024', binName: 'KNUST Hostel A Block', timestamp: minutesAgo(60 * 30), fillLevelBefore: 92, weightCollectedKg: 34.5, collectorName: 'Yaw Boateng', zone: 'Kumasi-Central' },
  { id: 'col-2', binId: 'bin-sb011', binCode: 'SB-011', binName: 'Ayeduase Gate Market', timestamp: minutesAgo(60 * 20), fillLevelBefore: 88, weightCollectedKg: 41.2, collectorName: 'Kwame Owusu', zone: 'Kumasi-Central' },
  { id: 'col-3', binId: 'bin-sb019', binCode: 'SB-019', binName: 'Kejetia Bus Terminal', timestamp: minutesAgo(60 * 15), fillLevelBefore: 95, weightCollectedKg: 52.8, collectorName: 'Yaw Boateng', zone: 'Kumasi-North' },
  { id: 'col-4', binId: 'bin-sb052', binCode: 'SB-052', binName: 'Osu Oxford Street', timestamp: minutesAgo(60 * 25), fillLevelBefore: 90, weightCollectedKg: 38.0, collectorName: 'Abena Frimpong', zone: 'Accra-East' },
  { id: 'col-5', binId: 'bin-sb071', binCode: 'SB-071', binName: 'East Legon Mall', timestamp: minutesAgo(60 * 70), fillLevelBefore: 85, weightCollectedKg: 29.6, collectorName: 'Abena Frimpong', zone: 'Accra-East' },
  { id: 'col-6', binId: 'bin-sb063', binCode: 'SB-063', binName: 'Labadi Beach Road', timestamp: minutesAgo(60 * 72), fillLevelBefore: 93, weightCollectedKg: 45.3, collectorName: 'Kojo Mensah', zone: 'Accra-South' },
  { id: 'col-7', binId: 'bin-sb041', binCode: 'SB-041', binName: 'Anloga Junction E-Waste Point', timestamp: minutesAgo(60 * 96), fillLevelBefore: 80, weightCollectedKg: 22.1, collectorName: 'Yaw Boateng', zone: 'Kumasi-North' },
  { id: 'col-8', binId: 'bin-sb032', binCode: 'SB-032', binName: 'Ayigya Zongo Market', timestamp: minutesAgo(60 * 118), fillLevelBefore: 89, weightCollectedKg: 36.7, collectorName: 'Kwame Owusu', zone: 'Kumasi-East' },
  { id: 'col-9', binId: 'bin-sb058', binCode: 'SB-058', binName: 'Accra Central Market', timestamp: minutesAgo(60 * 118), fillLevelBefore: 97, weightCollectedKg: 58.9, collectorName: 'Kojo Mensah', zone: 'Accra-South' },
  { id: 'col-10', binId: 'bin-sb024', binCode: 'SB-024', binName: 'KNUST Hostel A Block', timestamp: minutesAgo(60 * 140), fillLevelBefore: 90, weightCollectedKg: 33.0, collectorName: 'Yaw Boateng', zone: 'Kumasi-Central' },
];

export const DEMO_ROUTE_STOPS: RouteStop[] = [
  { id: 'rs-1', time: '07:30', name: 'KNUST Hostel A Block', type: 'Scheduled collection', status: 'COLLECTED', binCode: 'SB-024' },
  { id: 'rs-2', time: '08:10', name: 'Ayeduase Gate Market', type: 'Scheduled collection', status: 'COLLECTED', binCode: 'SB-011' },
  { id: 'rs-3', time: '08:45', name: 'Kotei Roadside', type: 'Priority overflow pickup', status: 'ARRIVED', binCode: 'SB-007' },
  { id: 'rs-4', time: '09:20', name: 'Bomso Junction', type: 'Device check + collection', status: 'PENDING', binCode: 'SB-015' },
  { id: 'rs-5', time: '09:55', name: 'Ayigya Zongo Market', type: 'Scheduled collection', status: 'PENDING', binCode: 'SB-032' },
  { id: 'rs-6', time: '10:30', name: 'Kejetia Bus Terminal', type: 'High-traffic collection', status: 'PENDING', binCode: 'SB-019' },
  { id: 'rs-7', time: '11:10', name: 'Anloga Junction E-Waste Point', type: 'E-waste scheduled pickup', status: 'SKIPPED', binCode: 'SB-041' },
];
