import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SmartBin, CollectionRecord, AlertNotification } from '../types';

export function generatePdfReport(
  bins: SmartBin[],
  collections: CollectionRecord[],
  alerts: AlertNotification[],
  reportTitle: string = 'KlinGhana SmartBin Intelligence — Fleet Status & Research Audit'
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(16, 185, 129); // #10b981 (Emerald)
  doc.rect(0, 0, pageWidth, 26, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('KLINGHANA SMARTBIN INTELLIGENCE', 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('IoT Waste Management, Real-time Telemetry & Environmental Analytics Platform', 14, 18);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 14, 18, { align: 'right' });

  // Report Title
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(reportTitle, 14, 36);

  // Executive Summary Metrics
  const totalBins = bins.length;
  const avgFill = Math.round(bins.reduce((acc, b) => acc + b.currentFillLevel, 0) / (totalBins || 1));
  const fullBins = bins.filter(b => b.currentFillLevel >= 80).length;
  const totalWasteCollected = collections.reduce((acc, c) => acc + c.weightCollectedKg, 0);
  const carbonOffset = (totalWasteCollected * 1.6).toFixed(1);

  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(14, 42, pageWidth - 28, 26, 3, 3, 'F');

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');

  doc.text('TOTAL ACTIVE BINS', 20, 50);
  doc.text('FLEET AVG FILL', 65, 50);
  doc.text('BINS >= 80% CAPACITY', 110, 50);
  doc.text('WASTE COLLECTED', 155, 50);

  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(`${totalBins} Units`, 20, 60);
  doc.text(`${avgFill}%`, 65, 60);
  
  if (fullBins > 0) {
    doc.setTextColor(225, 29, 72); // rose-600
  }
  doc.text(`${fullBins} Bins`, 110, 60);

  doc.setTextColor(16, 185, 129); // emerald-600
  doc.text(`${totalWasteCollected.toFixed(1)} kg`, 155, 60);

  // Section 1: Fleet Status Table
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Live Fleet Telemetry & Sensor Readings', 14, 76);

  const binRows = bins.map(b => [
    b.code,
    b.name,
    b.category.toUpperCase(),
    `${b.currentFillLevel}%`,
    b.lidState,
    `${b.batteryLevel}%`,
    `${b.temperature || 30}°C`,
    b.assignedZone || 'Accra East'
  ]);

  autoTable(doc, {
    startY: 80,
    head: [['Code', 'Location / Name', 'Type', 'Fill', 'Lid', 'Battery', 'Temp', 'Zone']],
    body: binRows,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 24, fontStyle: 'bold' },
      1: { cellWidth: 46 },
      3: { fontStyle: 'bold' }
    }
  });

  // Section 2: Recent Collection Records
  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 140;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. Waste Collection Audit Trail & Verification Logs', 14, finalY + 12);

  const collectionRows = collections.slice(0, 8).map(c => [
    c.timestamp ? new Date(c.timestamp).toLocaleString() : 'N/A',
    c.binCode,
    c.binName,
    `${c.fillLevelBefore}%`,
    `${c.weightCollectedKg.toFixed(1)} kg`,
    c.collectorName
  ]);

  autoTable(doc, {
    startY: finalY + 16,
    head: [['Date & Time', 'Bin Code', 'Location', 'Fill Before', 'Weight (kg)', 'Collector']],
    body: collectionRows.length > 0 ? collectionRows : [['No recent collection logs recorded.', '', '', '', '', '']],
    theme: 'striped',
    headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 }
  });

  // Section 3: Environmental & Educational Research Note
  const finalY2 = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 220;

  if (finalY2 + 30 < doc.internal.pageSize.getHeight()) {
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.roundedRect(14, finalY2 + 8, pageWidth - 28, 22, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setTextColor(6, 95, 70); // emerald-800
    doc.setFont('helvetica', 'normal');
    doc.text('RESEARCH & ENVIRONMENTAL IMPACT NOTE:', 18, finalY2 + 14);
    doc.text(`Estimated Carbon (CO2) Emissions Avoided by Fleet Optimisation: ${carbonOffset} kg CO2 equivalent.`, 18, finalY2 + 20);
    doc.text('Data certified for municipal sustainability assessment, academic research, and SDG 11 & 12 reporting.', 18, finalY2 + 25);
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${pageCount} — KlinGhana SmartBin Autonomous Waste Monitoring`, pageWidth / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' });
  }

  doc.save(`KlinGhana_Audit_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}
