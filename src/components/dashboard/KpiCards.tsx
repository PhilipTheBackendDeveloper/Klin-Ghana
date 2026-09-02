import React from 'react';
import { Trash2, AlertTriangle, Scale, Leaf, Activity, CheckCircle2 } from 'lucide-react';
import { useSmartBin } from '../../context/SmartBinContext';

export const KpiCards: React.FC = () => {
  const { bins, collections } = useSmartBin();

  const totalBins = bins.length;
  const avgFill = Math.round(bins.reduce((acc, b) => acc + b.currentFillLevel, 0) / (totalBins || 1));
  const fullBins = bins.filter(b => b.currentFillLevel >= 80).length;
  const criticalBins = bins.filter(b => b.currentFillLevel >= 95).length;
  const totalCollectedKg = collections.reduce((acc, c) => acc + c.weightCollectedKg, 0);
  const carbonOffsetKg = +(totalCollectedKg * 1.6).toFixed(1);

  const cards = [
    {
      title: 'Monitored Fleet',
      value: `${totalBins} Units`,
      subtext: 'All IoT sensors connected',
      icon: Trash2,
      color: 'from-blue-500/20 to-cyan-500/20',
      border: 'border-blue-500/30',
      textColor: 'text-blue-400'
    },
    {
      title: 'Fleet Avg Fill Level',
      value: `${avgFill}%`,
      subtext: avgFill > 75 ? 'Heavy city accumulation' : 'Normal capacity status',
      icon: Activity,
      color: avgFill > 80 ? 'from-rose-500/20 to-amber-500/20' : 'from-brand-500/20 to-emerald-500/20',
      border: avgFill > 80 ? 'border-rose-500/30' : 'border-brand-500/30',
      textColor: avgFill > 80 ? 'text-rose-400' : 'text-brand-400'
    },
    {
      title: 'Full / Overflow Bins',
      value: `${fullBins} Bins`,
      subtext: criticalBins > 0 ? `${criticalBins} at critical >=95%` : 'Zero critical overflows',
      icon: AlertTriangle,
      color: fullBins > 0 ? 'from-rose-500/25 to-red-600/10' : 'from-slate-800/40 to-slate-900/40',
      border: fullBins > 0 ? 'border-rose-500/40' : 'border-slate-800',
      textColor: fullBins > 0 ? 'text-rose-400' : 'text-slate-400'
    },
    {
      title: 'Collected Waste',
      value: `${totalCollectedKg.toFixed(1)} kg`,
      subtext: `${collections.length} verified dispatches`,
      icon: Scale,
      color: 'from-amber-500/20 to-orange-500/20',
      border: 'border-amber-500/30',
      textColor: 'text-amber-400'
    },
    {
      title: 'CO2 Emission Avoided',
      value: `${carbonOffsetKg} kg`,
      subtext: 'Optimal dynamic routing',
      icon: Leaf,
      color: 'from-emerald-500/20 to-teal-500/20',
      border: 'border-emerald-500/30',
      textColor: 'text-emerald-400'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`glass-panel p-4 rounded-2xl border ${card.border} bg-gradient-to-br ${card.color} flex flex-col justify-between relative overflow-hidden`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">{card.title}</span>
              <div className={`p-2 rounded-xl bg-slate-900/80 border border-white/10 ${card.textColor}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-white tracking-tight">{card.value}</div>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium flex items-center gap-1">
                {card.title === 'Monitored Fleet' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                {card.subtext}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
