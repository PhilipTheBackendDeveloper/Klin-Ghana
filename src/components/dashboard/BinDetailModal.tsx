import React from 'react';
import { 
  X, 
  MapPin, 
  Cpu, 
  Radio, 
  Battery, 
  Thermometer, 
  Scale, 
  Trash2, 
  Clock, 
  Activity, 
  Sparkles,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { SmartBin } from '../../types';
import { useSmartBin } from '../../context/SmartBinContext';

interface BinDetailModalProps {
  bin: SmartBin | null;
  onClose: () => void;
}

export const BinDetailModal: React.FC<BinDetailModalProps> = ({ bin, onClose }) => {
  const { toggleLid, triggerProximitySensor, collectBin, role } = useSmartBin();

  if (!bin) return null;

  const ultrasonicDistanceCm = bin.distanceCm ?? Math.max(5, Math.round(100 - bin.currentFillLevel * 0.95));
  const batteryLabel = bin.batteryLevel == null ? 'N/A' : `${bin.batteryLevel}%`;
  const batteryNote = bin.batteryLevel == null ? 'Unsupported on SB-024 core' : 'Solar-Assisted (3.7V)';
  const temperatureLabel = bin.temperature == null ? 'N/A' : `${bin.temperature}C`;
  const temperatureNote = `Weight: ${bin.weightKg ?? 'N/A'} kg`;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-950/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-brand-500/20 text-brand-300 border border-brand-500/30">
                {bin.code}
              </span>
              <span className="text-xs uppercase font-bold text-slate-400">
                {bin.category} waste
              </span>
              <span className="text-xs text-slate-400">â€¢</span>
              <span className="text-xs text-slate-400 font-mono">Firmware: {bin.firmwareVersion}</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1.5">{bin.name}</h2>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5 text-brand-400" />
              <span>{bin.location.address}, {bin.location.city} ({bin.location.landmark})</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Sensor Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                <Activity className="w-4 h-4 text-brand-400" /> Fill Level
              </span>
              <div className="text-2xl font-black text-white mt-1">{bin.currentFillLevel}%</div>
              <span className="text-[11px] text-slate-400">Ultrasonic: {ultrasonicDistanceCm} cm</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                <Battery className="w-4 h-4 text-emerald-400" /> Battery & Power
              </span>
              <div className="text-2xl font-black text-white mt-1">{batteryLabel}</div>
              <span className="text-[11px] text-emerald-400">{batteryNote}</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                <Radio className="w-4 h-4 text-smart-400" /> Wi-Fi RSSI
              </span>
              <div className="text-2xl font-black text-white mt-1">{bin.wifiSignal} dBm</div>
              <span className="text-[11px] text-smart-400">Station Connected</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                <Thermometer className="w-4 h-4 text-amber-400" /> Internal Temp
              </span>
              <div className="text-2xl font-black text-white mt-1">{temperatureLabel}</div>
              <span className="text-[11px] text-slate-400">{temperatureNote}</span>
            </div>
          </div>

          {/* Ultrasonic Sensor Diagnostics */}
          <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-brand-400" />
                <span className="text-sm font-bold text-white">HC-SR04 Sensor Waveform & Echo Telemetry</span>
              </div>
              <span className="text-xs px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                Speed of Sound: 343 m/s
              </span>
            </div>

            <div className="h-20 w-full bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center relative overflow-hidden px-4">
              {/* Ultrasonic pulse animation */}
              <div className="w-full flex items-center justify-between text-xs font-mono text-slate-400 z-10">
                <span>[Trigger Pulse: 10Âµs]</span>
                <span className="text-brand-400 font-bold animate-pulse">&lt;==== Echo Transit: {ultrasonicDistanceCm * 58} Âµs ====&gt;</span>
                <span>[Target: Waste Surface @ {ultrasonicDistanceCm}cm]</span>
              </div>
              <div className="absolute inset-0 bg-brand-500/5 animate-pulse"></div>
            </div>
          </div>

          {/* Operational Log & History */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" /> Bin Operations & Deployment Specs
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 flex justify-between">
                <span className="text-slate-400">Assigned Zone:</span>
                <span className="text-slate-200 font-semibold">{bin.assignedZone}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 flex justify-between">
                <span className="text-slate-400">Total Lifetime Collections:</span>
                <span className="text-slate-200 font-semibold">{bin.totalCollectionsCount} times</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 flex justify-between">
                <span className="text-slate-400">GPS Coordinates:</span>
                <span className="text-slate-200 font-mono">{bin.location.lat.toFixed(4)}, {bin.location.lng.toFixed(4)}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 flex justify-between">
                <span className="text-slate-400">Last Collection Event:</span>
                <span className="text-slate-200 font-semibold">{bin.lastCollectedAt ? new Date(bin.lastCollectedAt).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="p-6 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => triggerProximitySensor(bin.id)}
              className="px-4 py-2 rounded-xl bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 border border-brand-500/30 text-xs font-bold transition-all flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" /> Trigger Proximity Sensor
            </button>
            <button
              onClick={() => toggleLid(bin.id)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
            >
              {bin.lidState === 'OPEN' ? 'Close Lid' : 'Open Lid'}
            </button>
          </div>

          {role === 'admin' && (
            <button
              onClick={() => {
                collectBin(bin.id);
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xs transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20"
            >
              <Trash2 className="w-3.5 h-3.5" /> Empty & Collect Bin
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


