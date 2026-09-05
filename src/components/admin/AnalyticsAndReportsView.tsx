import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Download, FileText, Scale, AlertTriangle, Radio, ShieldCheck } from 'lucide-react';
import { useSmartBin } from '../../context/SmartBinContext';
import { generatePdfReport } from '../../services/pdfGenerator';
import { exportBinsToCsv } from '../../services/csvGenerator';
import { PageHeader } from '../common/PageHeader';
import { StatCard } from '../common/StatCard';
import { EmptyState } from '../common/EmptyState';

export const AnalyticsAndReportsView: React.FC = () => {
  const { bins, collections, alerts, citizenReports, fleetHealth, overflowCount } = useSmartBin();

  const wasteKg = collections.reduce((sum, record) => sum + (Number(record.weightCollectedKg) || 0), 0);
  const overflowRate = bins.length === 0 ? 0 : Number(((overflowCount / bins.length) * 100).toFixed(1));
  const unresolvedWork = alerts.filter((alert) => !alert.read).length + citizenReports.filter((report) => report.status !== 'Resolved' && report.status !== 'Closed').length;
  const resolvedReports = citizenReports.filter((report) => report.status === 'Resolved' || report.status === 'Closed').length;
  const slaMet = citizenReports.length === 0 ? 0 : Math.round((resolvedReports / citizenReports.length) * 100);
  // Note: the data key intentionally avoids the name "fill" — Recharts spreads each
  // data point's fields onto the underlying SVG <rect>, so a field literally named
  // "fill" clobbers the shape's own fill color attribute with the numeric value.
  const fillPressureData = bins.map((bin) => ({ time: bin.code, fillLevel: bin.currentFillLevel }));
  const hotspots = [...bins]
    .sort((a, b) => b.currentFillLevel - a.currentFillLevel)
    .slice(0, 5)
    .map((bin) => ({
      location: bin.name,
      overflowCount: alerts.filter((alert) => alert.binId === bin.id || alert.binCode === bin.code).length,
      avgFill: `${bin.currentFillLevel}%`,
      risk: bin.currentFillLevel >= 95 ? 'High' : bin.currentFillLevel >= 80 ? 'Medium' : 'Low',
    }));

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      <PageHeader title="Analytics & Reports" subtitle="Fleet performance trends, hotspots, and exportable operational reports." />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
        <StatCard icon={Scale} label="Waste volume" value={`${wasteKg.toFixed(1)}kg`} tone="slate" note={`${collections.length} collection records`} />
        <StatCard icon={AlertTriangle} label="Overflow rate" value={`${overflowRate}%`} tone="rose" note={bins.length === 0 ? 'No bins registered' : `${overflowCount}/${bins.length} bins`} />
        <StatCard icon={Radio} label="Sensor uptime" value={`${fleetHealth.toFixed(1)}%`} tone="emerald" note={bins.length === 0 ? 'No sensors online' : `${bins.filter((bin) => bin.wifiConnected).length}/${bins.length} online`} />
        <StatCard icon={ShieldCheck} label="SLA met" value={`${slaMet}%`} tone="blue" note={`${unresolvedWork} unresolved items`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-7">
          <div>
            <h3 className="font-['Outfit',sans-serif] text-base font-bold text-slate-900">Fill pressure trend</h3>
            <p className="text-xs text-slate-500">Current fill readings from live bin state</p>
          </div>

          <div className="h-64 w-full">
            {fillPressureData.length === 0 ? (
              <EmptyState icon={Scale} title="No fill telemetry" description="Readings will chart here once bins report in." className="h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fillPressureData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="time" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 110]} />
                  <Tooltip contentStyle={{ backgroundColor: '#0F172A', color: '#FFFFFF', borderRadius: '0.75rem', fontSize: '12px' }} />
                  <Bar dataKey="fillLevel" name="Current Fill %" fill="#1D70F5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-5">
          <div>
            <h3 className="font-['Outfit',sans-serif] text-base font-bold text-slate-900">Location hotspot matrix</h3>
            <p className="text-xs text-slate-500">Ranked from live bin fill and active alert count</p>
          </div>

          <div className="space-y-3">
            {hotspots.length === 0 ? (
              <EmptyState icon={AlertTriangle} title="No hotspot data" description="Rankings appear once bins and alerts are active." />
            ) : hotspots.map((hotspot) => (
              <div key={hotspot.location} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-3.5 text-xs">
                <div><div className="font-bold text-slate-900">{hotspot.location}</div><div className="text-[11px] text-slate-500">{hotspot.overflowCount} active alerts</div></div>
                <div className="text-right"><div className="font-mono font-bold text-slate-900">{hotspot.avgFill}</div><span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${hotspot.risk === 'High' ? 'bg-rose-100 text-rose-700' : hotspot.risk === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{hotspot.risk} Risk</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-['Outfit',sans-serif] text-base font-bold text-slate-900">Reports</h4>
          <div className="flex gap-2">
            <button onClick={() => generatePdfReport(bins, collections, alerts)} className="flex items-center gap-1.5 rounded-2xl bg-[#1D70F5] px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-600"><FileText className="h-4 w-4" />Generate PDF</button>
            <button onClick={() => exportBinsToCsv(bins)} className="flex items-center gap-1.5 rounded-2xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition-all hover:bg-slate-200"><Download className="h-4 w-4" />Export bins CSV</button>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
          Reports are generated on demand from the current live arrays: {bins.length} bins, {collections.length} collections, {alerts.length} alerts.
        </div>
      </div>
    </div>
  );
};
