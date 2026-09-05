import React, { useEffect } from 'react';
import { AlertTriangle, ArrowRight, Battery, Radio, Search } from 'lucide-react';
import { SmartBin } from '../../types';
import { useSmartBin } from '../../context/SmartBinContext';
import { EmptyState } from '../common/EmptyState';
import { BinLocationLabel } from '../common/BinLocationLabel';

interface BinAccessViewProps {
  code: string;
  onReportProblem: (bin: SmartBin) => void;
  onViewFullDetail: (bin: SmartBin) => void;
  onBrowseBins: () => void;
}

const STATUS_STYLES: Record<string, { label: string; badge: string; ring: string }> = {
  normal: { label: 'Normal', badge: 'bg-emerald-100 text-emerald-700', ring: 'text-emerald-500' },
  warning: { label: 'Filling up', badge: 'bg-amber-100 text-amber-700', ring: 'text-amber-500' },
  critical: { label: 'Nearly full', badge: 'bg-amber-100 text-amber-700', ring: 'text-amber-500' },
  overflow: { label: 'Overflowing', badge: 'bg-rose-100 text-rose-700', ring: 'text-rose-500' },
  offline: { label: 'Offline', badge: 'bg-slate-100 text-slate-600', ring: 'text-slate-400' },
};

/**
 * Landing page for a scanned per-bin QR code (route: #/bin/:code). Designed
 * to work as the very first thing a citizen sees after scanning a sticker on
 * a physical bin — no searching, no picking from a list, one clear action.
 */
export const BinAccessView: React.FC<BinAccessViewProps> = ({ code, onReportProblem, onViewFullDetail, onBrowseBins }) => {
  const { bins, dataStatus, setCitizenBinId } = useSmartBin();
  const bin = bins.find((b) => b.code.toUpperCase() === code.toUpperCase());
  const stillLoading = !bin && (dataStatus === 'loading' || dataStatus === 'idle');

  // Registers "you're in this bin's context" the moment it resolves — not
  // only once the citizen taps through to the report form — so the header's
  // exit-bin control is accurate on this page too, whether arrived at via a
  // QR scan or the code gate.
  useEffect(() => {
    if (bin) setCitizenBinId(bin.id);
  }, [bin?.id, setCitizenBinId]);

  if (stillLoading) {
    return (
      <main className="mx-auto w-full max-w-lg px-4 py-16 text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
        <p className="text-sm font-semibold text-slate-500">Looking up bin {code.toUpperCase()}…</p>
      </main>
    );
  }

  if (!bin) {
    return (
      <main className="mx-auto w-full max-w-lg px-4 py-12">
        <EmptyState
          icon={Search}
          title={`We couldn't find bin ${code.toUpperCase()}`}
          description="The code may be mistyped, or this bin has been decommissioned. You can still report a problem or browse bins near you."
          action={{ label: 'Browse nearby bins', onClick: onBrowseBins }}
        />
      </main>
    );
  }

  const style = STATUS_STYLES[bin.status] || STATUS_STYLES.normal;
  const fill = Math.max(0, Math.min(100, bin.currentFillLevel));
  const circumference = 2 * Math.PI * 42;
  const dashOffset = circumference * (1 - fill / 100);

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8 sm:py-12">
      <div className="text-center mb-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700 border border-blue-200">
          You scanned a SmartBin
        </span>
      </div>

      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="rounded-lg bg-blue-50 px-2.5 py-1 font-mono text-xs font-black text-blue-600">{bin.code}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${style.badge}`}>{style.label}</span>
        </div>

        <h1 className="mt-3 font-['Outfit',sans-serif] text-2xl font-black text-slate-900">{bin.name}</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          <BinLocationLabel bin={bin} />
        </p>

        {/* Fill level ring */}
        <div className="mt-6 flex items-center gap-5">
          <div className="relative h-24 w-24 shrink-0">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="10" />
              <circle
                cx="50" cy="50" r="42" fill="none" strokeWidth="10" strokeLinecap="round"
                stroke="currentColor" className={style.ring}
                strokeDasharray={circumference} strokeDashoffset={dashOffset}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-['Outfit',sans-serif] text-xl font-black text-slate-900">{fill}%</span>
            </div>
          </div>
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <Battery className="h-3.5 w-3.5 text-emerald-600" />
              <span>Battery: <strong>{bin.batteryLevel == null ? 'N/A' : `${bin.batteryLevel}%`}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 text-blue-600" />
              <span>Signal: <strong>{bin.wifiSignal == null ? 'N/A' : `${bin.wifiSignal} dBm`}</strong></span>
            </div>
            {(bin.status === 'overflow' || bin.status === 'critical') && (
              <div className="flex items-center gap-1.5 text-amber-700 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Please report if this bin needs urgent pickup.</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            onClick={() => onReportProblem(bin)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-800"
          >
            <span>Report a problem with this bin</span>
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewFullDetail(bin)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
          >
            View full telemetry
          </button>
        </div>
      </div>

      <button type="button" onClick={onBrowseBins} className="mt-5 w-full text-center text-xs font-bold text-blue-600 hover:underline">
        Not the right bin? Browse nearby bins
      </button>
    </main>
  );
};
