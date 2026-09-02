import React, { useState } from 'react';
import { 
  Bell, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  ShieldCheck, 
  Microscope, 
  UserCheck, 
  CheckCheck, 
  Trash2,
  AlertCircle
} from 'lucide-react';
import { useSmartBin } from '../../context/SmartBinContext';
import { UserRole } from '../../types';

export const Topbar: React.FC = () => {
  const { 
    role, 
    setRole, 
    activeView, 
    alerts, 
    markAlertAsRead, 
    clearAlerts, 
    isSimulating, 
    setIsSimulating,
    soundEnabled,
    setSoundEnabled,
    collectAllFullBins,
    bins
  } = useSmartBin();

  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const unreadAlerts = alerts.filter(a => !a.read);
  const fullBinsCount = bins.filter(b => b.currentFillLevel >= 80).length;

  const viewTitles: Record<string, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Smart Fleet Telemetry Dashboard',
      subtitle: 'Real-time fill detection, ultrasonic sensors, and automated lid status'
    },
    map: {
      title: 'GPS Fleet Map & Route Optimizer',
      subtitle: 'Geolocated smart bins across Ghana with dynamic garbage truck route planning'
    },
    simulator: {
      title: 'IoT Hardware Workbench & Firmware',
      subtitle: 'Virtual ESP32, Ultrasonic distance sensor, servo lid actuators & C++ firmware code'
    },
    analytics: {
      title: 'Waste Generation Analytics & Reports',
      subtitle: 'Automated municipal research audits, PDF generation & fill-rate trends'
    },
    ai: {
      title: 'AI Waste Intelligence & Vision Classifier',
      subtitle: 'Interactive AI assistant for educational segregation, recycling tips & diagnostics'
    },
    citizen: {
      title: 'Citizen Clean Ghana Portal',
      subtitle: 'Find nearest smart bin, report overflow, and earn eco-community points'
    },
    fleet: {
      title: 'Fleet Configuration & Zone Management',
      subtitle: 'Centralized multi-bin administration, threshold rules, and collector logs'
    }
  };

  const currentInfo = viewTitles[activeView] || {
    title: 'SmartBin Intelligence',
    subtitle: 'Autonomous waste telemetry'
  };

  const rolesList: { id: UserRole; label: string; icon: React.ElementType }[] = [
    { id: 'admin', label: 'Administrator', icon: ShieldCheck },
    { id: 'researcher', label: 'Researcher / SDG', icon: Microscope },
    { id: 'citizen', label: 'Resident / Citizen', icon: UserCheck }
  ];

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left view title */}
      <div>
        <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          {currentInfo.title}
        </h1>
        <p className="text-xs text-slate-400 font-normal">
          {currentInfo.subtitle}
        </p>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Quick batch collection trigger (if any full bins) */}
        {role === 'admin' && fullBinsCount > 0 && (
          <button
            onClick={collectAllFullBins}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold transition-all shadow-sm shadow-rose-500/10 animate-pulse-fast"
            title="Dispatch collection truck for all full bins"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Collect All ({fullBinsCount} Full)</span>
          </button>
        )}

        {/* Live Simulation Toggle */}
        <button
          onClick={() => setIsSimulating(prev => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            isSimulating
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
          }`}
          title={isSimulating ? 'Pause IoT Simulation' : 'Resume IoT Simulation'}
        >
          {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isSimulating ? 'IoT Live' : 'Paused'}</span>
        </button>

        {/* Sound toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-2 rounded-lg border text-xs transition-all ${
            soundEnabled
              ? 'bg-slate-800/80 text-brand-400 border-slate-700 hover:border-brand-500/40'
              : 'bg-slate-900 text-slate-400 border-slate-800'
          }`}
          title={soundEnabled ? 'Mute Sound FX' : 'Enable Sound FX'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Alerts Center Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}
            className="relative p-2 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700 hover:border-slate-600 transition-all"
          >
            <Bell className="w-4 h-4" />
            {unreadAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-extrabold text-white">
                {unreadAlerts.length}
              </span>
            )}
          </button>

          {showAlertsDropdown && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-white">System Alerts</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                    {alerts.length}
                  </span>
                </div>
                {alerts.length > 0 && (
                  <button
                    onClick={clearAlerts}
                    className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 mt-3 pr-1">
                {alerts.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No notifications</p>
                ) : (
                  alerts.slice(0, 10).map((alert) => (
                    <div
                      key={alert.id}
                      onClick={() => markAlertAsRead(alert.id)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        alert.read
                          ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                          : alert.severity === 'danger'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[11px] flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {alert.binName}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-snug">{alert.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Role Selector */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800/80">
          {rolesList.map((r) => {
            const Icon = r.icon;
            const isSelected = role === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-brand-500 text-slate-950 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{r.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
