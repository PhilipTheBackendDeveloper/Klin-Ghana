import React from 'react';
import { CheckCircle2, Clock, Filter } from 'lucide-react';
import { useSmartBin } from '../../context/SmartBinContext';
import { AlertNotification } from '../../types';

const formatTime = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '--:--' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const isCritical = (alert: AlertNotification) => alert.severity === 'danger';
const isWarning = (alert: AlertNotification) => alert.severity === 'warning';

const incidentCard = (alert: AlertNotification, action: string, onAcknowledge: (id: string) => void, tone: 'critical' | 'warning' | 'monitoring') => {
  const toneClasses = {
    critical: 'border-rose-200 text-rose-700 bg-rose-50',
    warning: 'border-amber-200 text-amber-700 bg-amber-50',
    monitoring: 'border-slate-200 text-slate-700 bg-slate-100',
  }[tone];

  return (
    <div key={alert.id} className={`space-y-2 rounded-2xl border bg-white p-3.5 text-xs shadow-sm ${toneClasses.split(' ')[0]}`}>
      <div className="flex items-center justify-between">
        <span className={`rounded px-1.5 py-0.5 font-mono font-bold ${toneClasses}`}>{alert.binCode}</span>
        <span className="font-mono text-[10px] text-slate-400">{formatTime(alert.timestamp)}</span>
      </div>
      <div className="font-bold leading-snug text-slate-900">{alert.binName}</div>
      <p className="text-[11px] text-slate-500">{alert.message}</p>
      <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px]">
        <span className="text-slate-400">{alert.type.replace(/_/g, ' ')}</span>
        <button type="button" onClick={() => onAcknowledge(alert.id)} className="font-bold text-blue-600">{action}</button>
      </div>
    </div>
  );
};

export const AlertsWorkbench: React.FC = () => {
  const { alerts, markAlertAsRead } = useSmartBin();

  const activeAlerts = alerts.filter((alert) => !alert.read);
  const criticalIncidents = activeAlerts.filter(isCritical);
  const warningIncidents = activeAlerts.filter(isWarning);
  const monitoringIncidents = activeAlerts.filter((alert) => !isCritical(alert) && !isWarning(alert));
  const timelineLogs = activeAlerts.slice(0, 12);
  const meanAck = activeAlerts.length === 0 ? '00m' : '--';

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-3xl border border-rose-200/80 bg-white p-5 shadow-sm">
          <span className="text-xs font-bold text-rose-700">P1 ACTIVE</span>
          <div className="font-['Outfit',sans-serif] mt-1 text-3xl font-black text-rose-600">{criticalIncidents.length}</div>
          <span className="text-[11px] font-bold text-rose-600">Requires dispatch</span>
        </div>
        <div className="rounded-3xl border border-amber-200/80 bg-white p-5 shadow-sm">
          <span className="text-xs font-bold text-amber-700">WARNINGS</span>
          <div className="font-['Outfit',sans-serif] mt-1 text-3xl font-black text-amber-600">{warningIncidents.length}</div>
          <span className="text-[11px] font-bold text-amber-600">Near threshold</span>
        </div>
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <span className="text-xs font-bold text-slate-500">MONITORING</span>
          <div className="font-['Outfit',sans-serif] mt-1 text-3xl font-black text-emerald-600">{monitoringIncidents.length}</div>
          <span className="text-[11px] font-bold text-emerald-600">Live unresolved</span>
        </div>
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <span className="text-xs font-bold text-slate-500">MEAN ACK</span>
          <div className="font-['Outfit',sans-serif] mt-1 text-3xl font-black text-slate-900">{meanAck}</div>
          <span className="text-[11px] text-slate-400">Calculated when ack timestamps exist</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <div className="flex items-center justify-between">
            <h3 className="font-['Outfit',sans-serif] text-base font-bold text-slate-900">Incident Board - Real-time Triage</h3>
            <span className="inline-flex items-center gap-1 text-xs text-slate-400"><Filter className="h-3.5 w-3.5" /> Supabase active alerts</span>
          </div>

          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
            <div className="space-y-3 rounded-3xl border border-rose-100 bg-slate-50/70 p-3.5">
              <div className="flex items-center justify-between border-b border-rose-100 pb-1">
                <span className="text-xs font-black uppercase text-rose-700">Critical (P1)</span>
                <span className="rounded bg-rose-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-rose-700">{criticalIncidents.length}</span>
              </div>
              {criticalIncidents.length === 0 ? <EmptyColumn label="No critical alerts" /> : criticalIncidents.map((alert) => incidentCard(alert, 'Acknowledge', markAlertAsRead, 'critical'))}
            </div>

            <div className="space-y-3 rounded-3xl border border-amber-100 bg-slate-50/70 p-3.5">
              <div className="flex items-center justify-between border-b border-amber-100 pb-1">
                <span className="text-xs font-black uppercase text-amber-700">Warning (P2)</span>
                <span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-700">{warningIncidents.length}</span>
              </div>
              {warningIncidents.length === 0 ? <EmptyColumn label="No warning alerts" /> : warningIncidents.map((alert) => incidentCard(alert, 'Investigate', markAlertAsRead, 'warning'))}
            </div>

            <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50/70 p-3.5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <span className="text-xs font-black uppercase text-slate-700">Monitoring</span>
                <span className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700">{monitoringIncidents.length}</span>
              </div>
              {monitoringIncidents.length === 0 ? <EmptyColumn label="No monitoring alerts" /> : monitoringIncidents.map((alert) => incidentCard(alert, 'Review', markAlertAsRead, 'monitoring'))}
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm lg:col-span-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="font-['Outfit',sans-serif] text-sm font-bold text-slate-900">Selected Incident Timeline</h4>
            <span className="font-mono text-xs text-slate-400">Live</span>
          </div>

          <div className="space-y-3.5 text-xs">
            {timelineLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
                <CheckCircle2 className="mx-auto mb-2 h-5 w-5 text-emerald-500" />
                <div className="font-bold text-slate-900">No active incidents</div>
                <p className="mt-1 text-[11px]">The live alerts table returned no unresolved alerts.</p>
              </div>
            ) : timelineLogs.map((alert) => (
              <div key={alert.id} className="flex gap-3">
                <span className="mt-0.5 shrink-0 font-mono text-[11px] text-slate-400">{formatTime(alert.timestamp)}</span>
                <div className="space-y-0.5">
                  <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-900">{alert.binCode}</span>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const EmptyColumn: React.FC<{ label: string }> = ({ label }) => (
  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-center text-[11px] text-slate-500">
    <Clock className="mx-auto mb-1 h-4 w-4 text-slate-300" />
    {label}
  </div>
);

