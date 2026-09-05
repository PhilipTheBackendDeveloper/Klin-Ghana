import React from 'react';
import { LucideIcon, ArrowDownRight, ArrowUpRight } from 'lucide-react';

type Tone = 'slate' | 'blue' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'indigo';

const toneStyles: Record<Tone, { icon: string; value: string }> = {
  slate: { icon: 'bg-slate-100 text-slate-600', value: 'text-slate-900' },
  blue: { icon: 'bg-blue-50 text-blue-600', value: 'text-blue-600' },
  emerald: { icon: 'bg-emerald-50 text-emerald-600', value: 'text-emerald-600' },
  amber: { icon: 'bg-amber-50 text-amber-600', value: 'text-amber-600' },
  rose: { icon: 'bg-rose-50 text-rose-600', value: 'text-rose-600' },
  cyan: { icon: 'bg-cyan-50 text-cyan-600', value: 'text-cyan-600' },
  indigo: { icon: 'bg-indigo-50 text-indigo-600', value: 'text-indigo-600' },
};

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: Tone;
  note?: string;
  trend?: { direction: 'up' | 'down'; label: string; good?: boolean };
  onClick?: () => void;
  className?: string;
}

/**
 * Shared KPI tile: icon + label + big value + optional trend/footnote.
 * Used across Overview, Alerts, and Analytics so every stat card in the
 * app shares one visual language instead of a bespoke block per screen.
 */
export const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, tone = 'slate', note, trend, onClick, className = '' }) => {
  const styles = toneStyles[tone];
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`group flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 text-left shadow-xs transition-all ${
        onClick ? 'hover:border-blue-300 hover:shadow-md cursor-pointer' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${styles.icon}`}>
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
        {trend && (
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${trend.good === false ? 'text-rose-600' : trend.good ? 'text-emerald-600' : 'text-slate-400'}`}>
            {trend.direction === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {trend.label}
          </span>
        )}
      </div>
      <div>
        <div className={`font-['Outfit',sans-serif] text-2xl sm:text-3xl font-black leading-none ${styles.value}`}>{value}</div>
        <div className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
        {note && <div className="mt-0.5 text-[11px] text-slate-400">{note}</div>}
      </div>
    </Wrapper>
  );
};
