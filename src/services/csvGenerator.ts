import { SmartBin, CollectionRecord, AlertNotification } from '../types';

export function exportBinsToCsv(bins: SmartBin[]): void {
  const headers = ['ID', 'Code', 'Name', 'Category', 'Capacity (L)', 'Fill Level (%)', 'Status', 'Lid State', 'Battery (%)', 'Temperature (C)', 'Weight (kg)', 'Zone', 'Address', 'Last Updated'];
  
  const rows = bins.map(b => [
    b.id,
    b.code,
    `"${b.name.replace(/"/g, '""')}"`,
    b.category,
    b.capacityLiters,
    b.currentFillLevel,
    b.status,
    b.lidState,
    b.batteryLevel,
    b.temperature,
    b.weightKg,
    `"${b.assignedZone}"`,
    `"${b.location.address}, ${b.location.city}"`,
    b.lastUpdated
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadBlob(csvContent, `KlinGhana_Bins_Telemetry_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
}

export function exportCollectionsToCsv(records: CollectionRecord[]): void {
  const headers = ['Collection ID', 'Bin Code', 'Bin Name', 'Timestamp', 'Fill Level Before (%)', 'Weight Collected (kg)', 'Collector Name', 'Zone'];

  const rows = records.map(r => [
    r.id,
    r.binCode,
    `"${r.binName.replace(/"/g, '""')}"`,
    r.timestamp,
    r.fillLevelBefore,
    r.weightCollectedKg,
    `"${r.collectorName}"`,
    `"${r.zone}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadBlob(csvContent, `KlinGhana_Collection_Audit_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
}

export function exportAlertsToCsv(alerts: AlertNotification[]): void {
  const headers = ['Alert ID', 'Bin Code', 'Bin Name', 'Type', 'Severity', 'Message', 'Timestamp', 'Read'];

  const rows = alerts.map(a => [
    a.id,
    a.binCode,
    `"${a.binName.replace(/"/g, '""')}"`,
    a.type,
    a.severity,
    `"${a.message.replace(/"/g, '""')}"`,
    a.timestamp,
    a.read ? 'YES' : 'NO'
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadBlob(csvContent, `KlinGhana_Alerts_Log_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
