import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Download, FileText } from 'lucide-react';
import { useSmartBin } from '../../context/SmartBinContext';
import { generatePdfReport } from '../../services/pdfGenerator';
import { exportBinsToCsv } from '../../services/csvGenerator';

export const AnalyticsAndReportsView: React.FC = () => {
  const { bins, collections, alerts, citizenReports, fleetHealth, overflowCount } = useSmartBin();

  const wasteKg = collections.reduce((sum, record) => sum + (Number(record.weightCollectedKg) || 0), 0);
  const overflowRate = bins.length === 0 ? 0 : Number(((overflowCount / bins.length) * 100).toFixed(1));
  const unresolvedWork = alerts.filter((alert) => !alert.read).length + citizenReports.filter((report) => report.status !== 'Resolved' && report.status !== 'Closed').length;
  const resolvedReports = citizenReports.filter((report) => report.status === 'Resolved' || report.status === 'Closed').length;
  const slaMet = citizenReports.length === 0 ? 0 : Math.round((resolvedReports / citizenReports.length) * 100);
  const fillPressureData = bins.map((bin) => ({ time: bin.code, fill: bin.currentFillLevel }));
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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="WASTE VOLUME" value={`${wasteKg.toFixed(1)}kg`} note={`${collections.length} collection records`} tone="slate" />
        <MetricCard label="OVERFLOW RATE" value={`${overflowRate}%`} note={bins.length === 0 ? 'No bins registered' : `${overflowCount}/${bins.length} bins`} tone="rose" />
        <MetricCard label="SENSOR UPTIME" value={`${fleetHealth.toFixed(1)}%`} note={bins.length === 0 ? 'No sensors online' : `${bins.filter((bin) => bin.wifiConnected).length}/${bins.length} online`} tone="emerald" />
        <MetricCard label="SLA MET" value={`${slaMet}%`} note={`${unresolvedWork} unresolved items`} tone="blue" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-7">
          <div>
            <h3 className="font-['Outfit',sans-serif] text-base font-bold text-slate-900">Fill pressure trend</h3>
            <p className="text-xs text-slate-500">Current fill readings from live bin state</p>
          </div>

          <div className="h-64 w-full">
            {fillPressureData.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 text-center text-sm text-slate-500">
                <div><div className="font-bold text-slate-900">No fill telemetry</div><p className="mt-1 text-xs">No bins were returned for this live environment.</p></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fillPressureData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="time" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 110]} />
                  <Tooltip contentStyle={{ backgroundColor: '#0F172A', color: '#FFFFFF', borderRadius: '0.75rem', fontSize: '12px' }} />
                  <Bar dataKey="fill" name="Current Fill %" fill="#1D70F5" radius={[6, 6, 0, 0]} />
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
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                <div className="font-bold text-slate-900">No hotspot data</div>
                <p className="mt-1 text-xs">No bins or alerts were returned.</p>
              </div>
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

const MetricCard: React.FC<{ label: string; value: string; note: string; tone: 'slate' | 'rose' | 'emerald' | 'blue' }> = ({ label, value, note, tone }) => {
  const toneClass = tone === 'rose' ? 'text-rose-600' : tone === 'emerald' ? 'text-emerald-600' : tone === 'blue' ? 'text-blue-600' : 'text-slate-900';
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <div className={`font-['Outfit',sans-serif] mt-1.5 text-3xl font-black ${toneClass}`}>{value}</div>
      <span className="text-[11px] font-bold text-slate-400">{note}</span>
    </div>
  );
};
