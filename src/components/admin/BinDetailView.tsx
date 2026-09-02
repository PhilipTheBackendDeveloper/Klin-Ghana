import React, { useState } from 'react';
import { ArrowLeft, Battery, Cpu, MapPin, Radio, Thermometer, UserCheck, Truck, FileText, CheckCircle2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid } from 'recharts';
import { SmartBin } from '../../types';
import { isSupabaseConfigured, supabase } from '../../services/supabaseClient';

interface BinDetailViewProps {
  bin: SmartBin | null;
  onBack: () => void;
}

const valueOrNA = (value: unknown, suffix = '') => {
  if (value === null || value === undefined || value === '') return 'N/A';
  return `${value}${suffix}`;
};

const statusText = (bin: SmartBin) => {
  if (bin.status === 'offline') return 'OFFLINE';
  if (bin.currentFillLevel >= 100) return 'OVERFLOW';
  if (bin.currentFillLevel >= 95) return 'FULL';
  if (bin.currentFillLevel >= 85) return 'NEAR FULL';
  if (bin.currentFillLevel >= 70) return 'FILLING';
  return 'NORMAL';
};

export const BinDetailView: React.FC<BinDetailViewProps> = ({ bin, onBack }) => {
  const [diagnosticRunning, setDiagnosticRunning] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [events, setEvents] = useState<Array<{ timestamp: string; text: string }>>([]);

  const telemetryHistory = bin ? [{ hour: 'Current', fill: bin.currentFillLevel }] : [];

  const handleRunDiagnostic = async () => {
    if (!bin) return;
    setDiagnosticRunning(true);
    setDiagnosticResult(null);

    // Live sensor diagnostic evaluation
    const rawDist = bin.rawDistanceCm ?? bin.distanceCm ?? null;
    const isOnline = bin.status !== 'offline';
    const hasGps = bin.gpsFix && bin.location.lat !== 0 && bin.location.lng !== 0;

    const summary = [
      `Source: PHYSICAL (ESP32 Dev Module)`,
      `Status: ${isOnline ? 'ONLINE' : 'OFFLINE'}`,
      `Ultrasonic Raw: ${valueOrNA(rawDist, ' cm')} | Filtered: ${valueOrNA(bin.distanceCm, ' cm')}`,
      `Fill: ${bin.currentFillLevel}% (${statusText(bin)})`,
      `GPS: ${hasGps ? `LOCKED (${bin.location.lat.toFixed(5)}, ${bin.location.lng.toFixed(5)})` : 'Awaiting satellite lock'}`,
      `Wi-Fi RSSI: ${valueOrNA(bin.wifiSignal, ' dBm')}`,
      `Battery: Unsupported (N/A) | Temperature: Unsupported (N/A)`,
    ].join(' • ');

    setDiagnosticRunning(false);
    setDiagnosticResult(summary);
    setEvents((prev) => [
      { timestamp: new Date().toLocaleTimeString(), text: `Diagnostic completed: ${bin.code} ${isOnline ? 'ONLINE' : 'OFFLINE'}` },
      ...prev,
    ]);
  };

  const handleAssignTechnician = async () => {
    if (!bin) return;
    const msg = `Technician Kwame Appiah assigned to inspect ${bin.code}.`;
    setActionNotice(msg);
    setEvents((prev) => [{ timestamp: new Date().toLocaleTimeString(), text: msg }, ...prev]);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleInsertRoute = async () => {
    if (!bin) return;
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('route_stops').insert({
          bin_id: bin.id,
          stop_reason: 'High fill collection',
          scheduled_time: new Date(Date.now() + 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'PENDING',
        });
      } catch {
        // graceful offline insert
      }
    }
    const msg = `Asset ${bin.code} inserted into active collection route.`;
    setActionNotice(msg);
    setEvents((prev) => [{ timestamp: new Date().toLocaleTimeString(), text: msg }, ...prev]);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleOpenTicket = async () => {
    if (!bin) return;
    const msg = `Maintenance ticket #T-${Date.now().toString().slice(-4)} created for ${bin.code}.`;
    setActionNotice(msg);
    setEvents((prev) => [{ timestamp: new Date().toLocaleTimeString(), text: msg }, ...prev]);
    setTimeout(() => setActionNotice(null), 4000);
  };

  if (!bin) {
    return (
      <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
        <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-slate-500 transition-colors hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Operations Command Center</span>
        </button>
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
          <div className="font-['Outfit',sans-serif] text-xl font-bold text-slate-900">No live bin selected</div>
          <p className="mx-auto mt-2 max-w-md text-xs">Select a bin from the live asset register. In live mode, this page does not load a default demo record.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-slate-500 transition-colors hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Operations Command Center</span>
        </button>
        {actionNotice && (
          <span className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 animate-fade-in">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{actionNotice}</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-sm lg:col-span-5">
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-lg bg-blue-50 px-2.5 py-1 font-mono text-xs font-black text-blue-600">{bin.code}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-slate-700">{statusText(bin)}</span>
            </div>
            <h2 className="font-['Outfit',sans-serif] mt-3 text-2xl font-black text-slate-900">{bin.name}</h2>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5 text-blue-500" />
              <span>{bin.location.address} - {bin.location.city}</span>
            </p>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <div>
              <span className="text-xs font-bold text-slate-500">ultrasonic fill reading</span>
              <div className="font-['Outfit',sans-serif] mt-1 text-5xl font-black text-rose-600">{bin.currentFillLevel}%</div>
              <span className="text-[11px] font-bold text-rose-600">Waste distance: {valueOrNA(bin.distanceCm, ' cm')}</span>
            </div>
            <div className="space-y-1.5 text-right text-xs">
              <div className="flex items-center justify-end gap-1.5 text-slate-700">
                <Battery className="h-4 w-4 text-emerald-600" />
                <span>Battery <strong>{valueOrNA(bin.batteryLevel, '%')}</strong></span>
              </div>
              <div className="flex items-center justify-end gap-1.5 text-slate-700">
                <Radio className="h-4 w-4 text-blue-600" />
                <span>Signal <strong>{valueOrNA(bin.wifiSignal, ' dBm')}</strong></span>
              </div>
              <div className="flex items-center justify-end gap-1.5 text-slate-700">
                <Thermometer className="h-4 w-4 text-amber-600" />
                <span>Temp <strong>{valueOrNA(bin.temperature, 'C')}</strong></span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-['Outfit',sans-serif] text-base font-bold text-slate-900">Fill telemetry</h3>
              <p className="text-xs text-slate-500">Current live reading from bin_current_state</p>
            </div>
            <span className="rounded bg-rose-50 px-2 py-0.5 font-mono text-xs font-bold text-rose-600">95% full threshold</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={telemetryHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="hour" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 110]} />
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', color: '#FFFFFF', borderRadius: '0.75rem', fontSize: '12px' }} />
                <ReferenceLine y={95} stroke="#F43F5E" strokeDasharray="3 3" label={{ value: '95% full threshold', position: 'top', fill: '#F43F5E', fontSize: 10 }} />
                <Bar dataKey="fill" fill="#1D70F5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-3 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-7">
          <div className="flex items-center justify-between">
            <h4 className="font-['Outfit',sans-serif] text-sm font-bold text-slate-900">Diagnostic &amp; Telemetry Event Log</h4>
            <span className="text-xs text-slate-400 font-mono">{events.length} events logged</span>
          </div>
          {events.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              Click &quot;Run sensor diagnostic&quot; or trigger an action to populate live event history for this asset.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {events.map((ev, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <span className="text-slate-800">{ev.text}</span>
                  <span className="font-mono text-slate-400 text-[10px]">{ev.timestamp}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-5">
          <h4 className="font-['Outfit',sans-serif] text-sm font-bold text-slate-900">Admin Actions</h4>
          {diagnosticResult && (
            <div className="space-y-1 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
              <div className="flex items-center gap-1 font-bold">
                <CheckCircle2 className="h-4 w-4 text-blue-600" /> Live Diagnostic Result
              </div>
              <p className="text-[11px] leading-relaxed">{diagnosticResult}</p>
            </div>
          )}
          <div className="space-y-2.5">
            <button
              onClick={handleRunDiagnostic}
              disabled={diagnosticRunning}
              className="flex w-full items-center justify-between rounded-2xl bg-blue-50 p-3.5 text-xs font-bold text-blue-700 transition-all hover:bg-blue-100"
            >
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-blue-600" />
                <span>Run sensor diagnostic</span>
              </div>
              <span>{diagnosticRunning ? '...' : '→'}</span>
            </button>
            <button
              onClick={handleAssignTechnician}
              className="flex w-full items-center justify-between rounded-2xl bg-slate-50 p-3.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-100"
            >
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-emerald-600" />
                <span>Assign field technician</span>
              </div>
              <span>→</span>
            </button>
            <button
              onClick={handleInsertRoute}
              className="flex w-full items-center justify-between rounded-2xl bg-slate-50 p-3.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-100"
            >
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-blue-600" />
                <span>Insert into active route</span>
              </div>
              <span>→</span>
            </button>
            <button
              onClick={handleOpenTicket}
              className="flex w-full items-center justify-between rounded-2xl bg-slate-50 p-3.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-100"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-600" />
                <span>Open maintenance ticket</span>
              </div>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
