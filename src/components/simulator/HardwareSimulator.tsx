import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Radio, 
  Sparkles, 
  Terminal, 
  Sliders, 
  RotateCw, 
  Zap, 
  Activity, 
  DoorOpen, 
  DoorClosed, 
  Copy, 
  Check,
  Code
} from 'lucide-react';
import { useSmartBin } from '../../context/SmartBinContext';
import { FirmwareExporter } from './FirmwareExporter';

export const HardwareSimulator: React.FC = () => {
  const { selectedBin, updateBinTelemetry, triggerProximitySensor, toggleLid, bins, setSelectedBinId } = useSmartBin();
  const [activeTab, setActiveTab] = useState<'bench' | 'firmware'>('bench');
  const [serialLogs, setSerialLogs] = useState<string[]>([]);

  const bin = selectedBin || bins[0];

  // Calculate ultrasonic distance (5cm is 100% full, 100cm is 0% full)
  const currentDistance = Math.max(5, Math.round(100 - (bin?.currentFillLevel || 0) * 0.95));

  // Slider change for ultrasonic distance
  const handleDistanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dist = parseInt(e.target.value, 10);
    // 5cm = 100%, 100cm = 0%
    const calculatedFill = Math.min(100, Math.max(0, Math.round(((100 - dist) / 95) * 100)));
    
    if (bin) {
      updateBinTelemetry(bin.id, {
        currentFillLevel: calculatedFill,
        weightKg: +(calculatedFill * 0.48).toFixed(1)
      });
      addSerialLog(`[HC-SR04] Echo Received: ${dist} cm -> Fill Level Calculated: ${calculatedFill}%`);
    }
  };

  const addSerialLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setSerialLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 19)]);
  };

  // Add periodic simulated serial telemetry
  useEffect(() => {
    const interval = setInterval(() => {
      if (bin) {
        addSerialLog(`[ESP32-TX] HTTP POST -> /api/v1/telemetry {"binCode":"${bin.code}","fill":${bin.currentFillLevel},"lid":"${bin.lidState}","batt":${bin.batteryLevel},"temp":${bin.temperature}}`);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [bin]);

  return (
    <div className="space-y-6">
      {/* Top Selector & Tabs */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        {/* Bin Picker */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400">Target SmartBin Hardware:</span>
          <select
            value={bin?.id}
            onChange={(e) => setSelectedBinId(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-white text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:border-brand-500"
          >
            {bins.map(b => (
              <option key={b.id} value={b.id}>
                {b.code} — {b.name} ({b.currentFillLevel}%)
              </option>
            ))}
          </select>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('bench')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'bench'
                ? 'bg-brand-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Virtual IoT Testbench</span>
          </button>
          <button
            onClick={() => setActiveTab('firmware')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'firmware'
                ? 'bg-brand-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>ESP32 Arduino Firmware C++</span>
          </button>
        </div>
      </div>

      {activeTab === 'bench' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Interactive IoT Hardware Actuator Controls */}
          <div className="lg:col-span-7 space-y-6">
            {/* Ultrasonic Distance Simulation Slider */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-smart-500/20 text-smart-300 border border-smart-500/30">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">HC-SR04 Ultrasonic Distance Sensor</h3>
                    <p className="text-xs text-slate-400">Controls waste height surface detection in real time</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-extrabold text-white font-mono">{currentDistance} cm</div>
                  <span className="text-[10px] text-brand-400 font-bold">Fill: {bin?.currentFillLevel}%</span>
                </div>
              </div>

              {/* Slider (5cm to 100cm) */}
              <div className="space-y-2">
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={currentDistance}
                  onChange={handleDistanceChange}
                  className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span className="text-rose-400">5 cm (100% Full / Overflow)</span>
                  <span className="text-amber-400">25 cm (80% Warning)</span>
                  <span className="text-emerald-400">100 cm (0% Empty)</span>
                </div>
              </div>
            </div>

            {/* Servo Motor Actuator & Proximity Trigger */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    <RotateCw className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">SG90 Servo Motor (Lid Actuator)</h3>
                    <p className="text-xs text-slate-400">Automatic proximity opening & 5s closing timer</p>
                  </div>
                </div>

                <span className={`text-xs font-bold px-3 py-1 rounded-xl border ${
                  bin?.lidState === 'OPEN'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  Servo Angle: {bin?.lidState === 'OPEN' ? '90° (OPEN)' : '0° (CLOSED)'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    if (bin) {
                      triggerProximitySensor(bin.id);
                      addSerialLog(`[PIR/Proximity] Person detected (<20cm). Servo rotated to 90°. Timer started (5s).`);
                    }
                  }}
                  className="py-3 px-4 rounded-2xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Simulate Person Approaching</span>
                </button>

                <button
                  onClick={() => {
                    if (bin) {
                      toggleLid(bin.id);
                      addSerialLog(`[Manual Switch] Lid state toggled to: ${bin.lidState === 'OPEN' ? 'CLOSED' : 'OPEN'}`);
                    }
                  }}
                  className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-2"
                >
                  {bin?.lidState === 'OPEN' ? <DoorClosed className="w-4 h-4" /> : <DoorOpen className="w-4 h-4" />}
                  <span>{bin?.lidState === 'OPEN' ? 'Manual Close' : 'Manual Open'}</span>
                </button>
              </div>
            </div>

            {/* Environmental & Battery Sliders */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-300">Battery Level</span>
                  <span className="text-emerald-400 font-mono">{bin?.batteryLevel}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={bin?.batteryLevel || 90}
                  onChange={(e) => {
                    if (bin) updateBinTelemetry(bin.id, { batteryLevel: parseInt(e.target.value, 10) });
                  }}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-300">Internal Temperature</span>
                  <span className="text-orange-400 font-mono">{bin?.temperature}°C</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="45"
                  value={bin?.temperature || 28}
                  onChange={(e) => {
                    if (bin) updateBinTelemetry(bin.id, { temperature: parseInt(e.target.value, 10) });
                  }}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Right: Live Serial Monitor Console & Pinout Diagram */}
          <div className="lg:col-span-5 space-y-6">
            {/* Hardware Pinout Specs */}
            <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-brand-400" /> ESP32 Microcontroller Wiring Map
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400">TRIG PIN:</span> <strong className="text-white">GPIO 5</strong>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400">ECHO PIN:</span> <strong className="text-white">GPIO 18</strong>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400">SERVO PIN:</span> <strong className="text-white">GPIO 13</strong>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400">PIR SENSOR:</span> <strong className="text-white">GPIO 19</strong>
                </div>
              </div>
            </div>

            {/* Serial Monitor */}
            <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
              <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>ESP32 Serial Monitor (115200 Baud)</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              </div>

              <div className="p-4 h-64 overflow-y-auto bg-slate-950/90 font-mono text-[11px] text-emerald-400 space-y-1.5 leading-relaxed">
                {serialLogs.map((log, i) => (
                  <div key={i} className="opacity-90">{log}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Firmware C++ Code Generator */
        <FirmwareExporter selectedBin={bin} />
      )}
    </div>
  );
};
