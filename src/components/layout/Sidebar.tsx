import React from 'react';
import { 
  LayoutDashboard, 
  MapPin, 
  Cpu, 
  BarChart3, 
  Bot, 
  Users, 
  Settings2, 
  Trash2,
  Sparkles,
  Radio,
  AlertTriangle
} from 'lucide-react';
import { useSmartBin } from '../../context/SmartBinContext';

export const Sidebar: React.FC = () => {
  const { activeView, setActiveView, bins, alerts, isSimulating } = useSmartBin();

  const criticalCount = bins.filter(b => b.status === 'critical' || b.currentFillLevel >= 95).length;
  const unreadAlerts = alerts.filter(a => !a.read).length;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Live Dashboard',
      icon: LayoutDashboard,
      badge: criticalCount > 0 ? `${criticalCount} Critical` : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
    },
    {
      id: 'map',
      label: 'GPS Fleet Map',
      icon: MapPin,
      badge: `${bins.length} Bins`,
      badgeColor: 'bg-smart-500/20 text-smart-300 border-smart-500/30'
    },
    {
      id: 'simulator',
      label: 'Hardware & IoT Lab',
      icon: Cpu,
      badge: isSimulating ? 'Live IoT' : undefined,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    },
    {
      id: 'analytics',
      label: 'Analytics & Reports',
      icon: BarChart3,
      badge: 'PDF/CSV',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    },
    {
      id: 'ai',
      label: 'AI Waste Assistant',
      icon: Bot,
      badge: 'AI Vision',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    },
    {
      id: 'citizen',
      label: 'Citizen & Public Hub',
      icon: Users,
      badge: 'Find Bin',
      badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30'
    },
    {
      id: 'fleet',
      label: 'Fleet Management',
      icon: Settings2,
      badge: unreadAlerts > 0 ? `${unreadAlerts} alerts` : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
    }
  ];

  return (
    <aside className="w-64 bg-slate-900/90 border-r border-slate-800/80 flex flex-col justify-between shrink-0 h-screen sticky top-0 backdrop-blur-xl z-30">
      {/* Brand Logo Header */}
      <div>
        <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 via-brand-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-brand-500/25 ring-1 ring-white/20">
            <Trash2 className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-brand-300 bg-clip-text text-transparent">
                KlinGhana
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-brand-400" /> SmartBin Intelligence
            </p>
          </div>
        </div>

        {/* Live Network Status Indicator */}
        <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isSimulating ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isSimulating ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
            </span>
            <span className="text-xs font-medium text-slate-300">
              {isSimulating ? 'IoT Telemetry Active' : 'Simulation Paused'}
            </span>
          </div>
          <Radio className={`w-3.5 h-3.5 ${isSimulating ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-1 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-600/30 to-brand-500/10 text-white border border-brand-500/40 shadow-sm shadow-brand-500/10 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-brand-400 stroke-[2.2]' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Critical Alert Quick-Callout Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        {criticalCount > 0 ? (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
            <div className="flex items-center gap-1.5 text-rose-400 font-bold mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Overflow Alert!</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              {criticalCount} smart dustbin{criticalCount > 1 ? 's' : ''} require immediate waste collection.
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-[11px] text-emerald-300 font-medium">All bins within safe limits</span>
          </div>
        )}

        <div className="mt-3 text-center">
          <p className="text-[10px] text-slate-400">Ghana Smart Cities & IoT Initiative</p>
          <p className="text-[9px] text-slate-400 font-mono">v2.4.1 (ESP32 Live)</p>
        </div>
      </div>
    </aside>
  );
};
