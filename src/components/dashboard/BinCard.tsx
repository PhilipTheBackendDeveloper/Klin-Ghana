import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  Battery, 
  Thermometer, 
  Scale, 
  DoorOpen, 
  DoorClosed, 
  Sparkles, 
  MapPin, 
  Maximize2,
  Trash2,
  UserCheck
} from 'lucide-react';
import { SmartBin } from '../../types';
import { useSmartBin } from '../../context/SmartBinContext';

interface BinCardProps {
  bin: SmartBin;
  onInspect: (bin: SmartBin) => void;
}

export const BinCard: React.FC<BinCardProps> = ({ bin, onInspect }) => {
  const { toggleLid, triggerProximitySensor, collectBin, role } = useSmartBin();
  const [countdown, setCountdown] = useState<number | null>(null);

  // Calculate approximate ultrasonic distance based on 100cm height bin
  const ultrasonicDistanceCm = bin.distanceCm ?? Math.max(5, Math.round(100 - bin.currentFillLevel * 0.95));
  const batteryLabel = bin.batteryLevel == null ? 'N/A' : `${bin.batteryLevel}%`;
  const temperatureLabel = bin.temperature == null ? 'N/A' : `${bin.temperature}C`;
  const weightLabel = bin.weightKg == null ? 'N/A' : `${bin.weightKg} kg`;
  const wifiLabel = bin.wifiSignal == null ? 'N/A' : `${bin.wifiSignal} dBm`;
  const batteryHealthy = typeof bin.batteryLevel === 'number' && bin.batteryLevel > 30;

  // Category badge colors
  const categoryConfig: Record<string, { label: string; color: string; border: string }> = {
    plastic: { label: 'Plastics & Sachets', color: 'bg-cyan-500/20 text-cyan-300', border: 'border-cyan-500/40' },
    organic: { label: 'Organic & Food', color: 'bg-emerald-500/20 text-emerald-300', border: 'border-emerald-500/40' },
    paper: { label: 'Paper & Boxes', color: 'bg-amber-500/20 text-amber-300', border: 'border-amber-500/40' },
    electronic: { label: 'E-Waste', color: 'bg-purple-500/20 text-purple-300', border: 'border-purple-500/40' },
    general: { label: 'General Waste', color: 'bg-slate-500/20 text-slate-300', border: 'border-slate-500/40' },
    glass: { label: 'Glass', color: 'bg-teal-500/20 text-teal-300', border: 'border-teal-500/40' },
  };

  const catStyle = categoryConfig[bin.category] || categoryConfig.general;

  // Fill status colors
  const isCritical = bin.currentFillLevel >= 95;
  const isWarning = bin.currentFillLevel >= 80 && !isCritical;
  
  const fillGradient = isCritical
    ? 'from-rose-600 via-rose-500 to-red-500'
    : isWarning
    ? 'from-amber-600 via-amber-500 to-yellow-500'
    : 'from-brand-600 via-brand-500 to-emerald-400';

  const statusBadge = isCritical
    ? { text: 'CRITICAL (OVERFLOW)', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40' }
    : isWarning
    ? { text: 'WARNING (80%+)', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' }
    : { text: 'NORMAL CAPACITY', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };

  // Countdown effect when proximity triggered
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (bin.proximityTriggered && bin.lidState === 'OPEN') {
      setCountdown(bin.lidAutoCloseSeconds || 5);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCountdown(null);
    }
  }, [bin.proximityTriggered, bin.lidState, bin.lidAutoCloseSeconds]);

  return (
    <div className={`glass-panel glass-panel-hover rounded-2xl p-5 border flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
      isCritical ? 'border-rose-500/40 shadow-lg shadow-rose-500/10' : 'border-slate-800'
    }`}>
      {/* Top Header info */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                {bin.code}
              </span>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${catStyle.color} ${catStyle.border}`}>
                {catStyle.label}
              </span>
            </div>
            <h3 className="font-bold text-white text-base mt-2 line-clamp-1" title={bin.name}>
              {bin.name}
            </h3>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-brand-400 shrink-0" />
              <span className="line-clamp-1">{bin.location.address}, {bin.location.city}</span>
            </p>
          </div>

          <button
            onClick={() => onInspect(bin)}
            className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-all border border-slate-800"
            title="Inspect Full Telemetry & Logs"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center: Visual Bin Cylinder & Key Metrics */}
        <div className="grid grid-cols-12 gap-4 my-5 items-center">
          {/* 3D Animated Waste Cylinder */}
          <div className="col-span-5 flex flex-col items-center">
            <div className="relative w-24 h-36 rounded-2xl bg-slate-950/80 border-2 border-slate-800 p-1 flex flex-col justify-end overflow-hidden shadow-inner">
              {/* Lid Top Indicator */}
              <div 
                className={`absolute top-0 left-0 right-0 h-4 border-b border-white/20 transition-all duration-300 z-10 flex items-center justify-center text-[8px] font-bold ${
                  bin.lidState === 'OPEN' 
                    ? 'bg-amber-500/40 text-amber-200 transform -translate-y-1 rotate-12' 
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {bin.lidState === 'OPEN' ? 'LID OPEN' : 'LID CLOSED'}
              </div>

              {/* Grid calibration lines inside bin */}
              <div className="absolute inset-0 flex flex-col justify-between py-5 px-1 opacity-20 pointer-events-none z-10">
                <div className="border-b border-dashed border-white text-[7px] text-right">80%</div>
                <div className="border-b border-dashed border-white text-[7px] text-right">50%</div>
                <div className="border-b border-dashed border-white text-[7px] text-right">20%</div>
              </div>

              {/* Liquid Waste level fill bar */}
              <div
                style={{ height: `${bin.currentFillLevel}%` }}
                className={`w-full rounded-xl bg-gradient-to-t ${fillGradient} transition-all duration-700 relative overflow-hidden shadow-lg`}
              >
                {/* Wave shimmer effect */}
                <div className="absolute inset-0 bg-white/20 opacity-30 animate-pulse"></div>
              </div>
            </div>

            {/* Ultrasonic cm reading */}
            <span className="text-[10px] font-mono text-slate-400 mt-1.5">
              Dist: <strong className="text-white">{ultrasonicDistanceCm} cm</strong>
            </span>
          </div>

          {/* Right Metrics summary */}
          <div className="col-span-7 space-y-2.5">
            {/* Status Badge */}
            <div>
              <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border inline-block ${statusBadge.bg}`}>
                {statusBadge.text}
              </span>
              <div className="text-3xl font-extrabold text-white mt-1 tracking-tight">
                {bin.currentFillLevel}%
                <span className="text-xs font-normal text-slate-400 ml-1">filled</span>
              </div>
            </div>

            {/* Proximity / Auto-Close countdown */}
            {bin.proximityTriggered && bin.lidState === 'OPEN' && countdown !== null && (
              <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between animate-pulse">
                <span className="flex items-center gap-1 font-bold text-[11px]">
                  <Sparkles className="w-3 h-3" /> Auto-Closing:
                </span>
                <span className="font-mono font-extrabold text-sm">{countdown}s</span>
              </div>
            )}

            {/* Mini Telemetry Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-2">
                <Battery className={`w-3.5 h-3.5 ${batteryHealthy ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span className="text-slate-300 font-medium">{batteryLabel}</span>
              </div>

              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-2">
                <Thermometer className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-slate-300 font-medium">{temperatureLabel}</span>
              </div>

              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-2">
                <Scale className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-slate-300 font-medium">{weightLabel}</span>
              </div>

              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-2">
                <Wifi className="w-3.5 h-3.5 text-brand-400" />
                <span className="text-slate-300 font-medium">{wifiLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hardware Actuators / Action Buttons */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2">
        {/* Proximity Simulation Button */}
        <button
          onClick={() => triggerProximitySensor(bin.id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-brand-500/15 hover:bg-brand-500/25 text-brand-300 border border-brand-500/30 text-xs font-bold transition-all"
          title="Simulate user approaching (Ultrasonic proximity opens lid for 5s)"
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Approach Bin</span>
        </button>

        {/* Manual Lid Toggle */}
        <button
          onClick={() => toggleLid(bin.id)}
          className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
            bin.lidState === 'OPEN'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
          }`}
          title="Manually override servo lid position"
        >
          {bin.lidState === 'OPEN' ? <DoorOpen className="w-3.5 h-3.5" /> : <DoorClosed className="w-3.5 h-3.5" />}
          <span>{bin.lidState === 'OPEN' ? 'Close Lid' : 'Open Lid'}</span>
        </button>

        {/* Collect / Empty Button (Available for Admin or when full) */}
        {role === 'admin' && (
          <button
            onClick={() => collectBin(bin.id)}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-emerald-600/30 text-slate-300 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/40 text-xs font-semibold transition-all"
            title="Empty waste and log collection event"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};


