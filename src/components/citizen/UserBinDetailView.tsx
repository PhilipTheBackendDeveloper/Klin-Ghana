import React from 'react';
import { ArrowLeft, Battery, MapPin, Radio, Thermometer } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import { SmartBin } from '../../types';

interface UserBinDetailViewProps {
  bin: SmartBin;
  onBack: () => void;
  onReportProblem?: () => void;
}

const valueOrNA = (value: number | null | undefined, suffix = '') => value == null ? 'N/A' : `${value}${suffix}`;

export const UserBinDetailView: React.FC<UserBinDetailViewProps> = ({ bin, onBack, onReportProblem }) => {
  const telemetryHistory = [{ hour: 'Current', fill: bin.currentFillLevel }];

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-slate-500 transition-colors hover:text-slate-900"><ArrowLeft className="h-4 w-4" /><span>Back to Nearby Bins</span></button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-sm lg:col-span-5">
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-lg bg-blue-50 px-2.5 py-1 font-mono text-xs font-black text-blue-600">{bin.code}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-slate-700">{bin.status}</span>
            </div>
            <h2 className="font-['Outfit',sans-serif] mt-3 text-2xl font-black text-slate-900">{bin.name}</h2>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5 text-blue-500" /><span>{bin.location.address} - {bin.location.city}</span></p>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <div>
              <span className="text-xs font-bold text-slate-500">Current fill reading</span>
              <div className="font-['Outfit',sans-serif] mt-1 text-5xl font-black text-rose-600">{bin.currentFillLevel}%</div>
              <span className="text-[11px] font-bold text-rose-600">Waste distance: {valueOrNA(bin.distanceCm, ' cm')}</span>
            </div>
            <div className="space-y-1.5 text-right text-xs">
              <div className="flex items-center justify-end gap-1.5 text-slate-700"><Battery className="h-4 w-4 text-emerald-600" /><span>Battery <strong>{valueOrNA(bin.batteryLevel, '%')}</strong></span></div>
              <div className="flex items-center justify-end gap-1.5 text-slate-700"><Radio className="h-4 w-4 text-blue-600" /><span>Signal <strong>{valueOrNA(bin.wifiSignal, ' dBm')}</strong></span></div>
              <div className="flex items-center justify-end gap-1.5 text-slate-700"><Thermometer className="h-4 w-4 text-amber-600" /><span>Temp <strong>{valueOrNA(bin.temperature, 'C')}</strong></span></div>
            </div>
          </div>

          <button onClick={onReportProblem} className="w-full rounded-2xl bg-[#1D70F5] px-4 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-600">Report a problem with this bin</button>
        </div>

        <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-7">
          <div className="flex items-center justify-between">
            <div><h3 className="font-['Outfit',sans-serif] text-base font-bold text-slate-900">Fill telemetry</h3><p className="text-xs text-slate-500">Current live reading</p></div>
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
    </div>
  );
};
