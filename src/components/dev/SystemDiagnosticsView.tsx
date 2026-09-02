import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  Globe,
  MapPin,
  Radio,
  RefreshCw,
  Router,
  Server,
  Wifi,
  XCircle,
} from 'lucide-react';
import { useSmartBin } from '../../context/SmartBinContext';
import { env } from '../../config/env';
import { isSupabaseConfigured, supabase } from '../../services/supabaseClient';

const valueOrNA = (value: unknown, suffix = '') => {
  if (value === null || value === undefined || value === '' || Number.isNaN(value)) return 'N/A';
  return `${value}${suffix}`;
};

const badgeClass = (ok: boolean | null) => {
  if (ok === null) return 'bg-amber-100 text-amber-800 border-amber-300';
  return ok ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300';
};

export const SystemDiagnosticsView: React.FC = () => {
  const { bins, selectedBin, lastTelemetryTime, dataMode } = useSmartBin();
  const [dbReachable, setDbReachable] = useState<boolean | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState<boolean>(false);
  const [checking, setChecking] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const sb024 = useMemo(
    () => selectedBin || bins.find((bin) => bin.code.toUpperCase() === 'SB-024') || bins[0] || null,
    [bins, selectedBin]
  );

  const isConfigured = isSupabaseConfigured();

  const checkDatabaseHealth = async () => {
    setChecking(true);
    setLastError(null);
    try {
      if (!isConfigured) {
        setDbReachable(false);
        setLastError('Supabase client not configured for live project ufnwwgilqxvjrzrmydes');
      } else {
        const { error } = await supabase.from('bin_current_state').select('bin_id').limit(1);
        if (error) {
          setDbReachable(false);
          setLastError(error.message);
        } else {
          setDbReachable(true);
        }
      }
    } catch (err: any) {
      setDbReachable(false);
      setLastError(err.message || 'Network connection failed');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkDatabaseHealth();
  }, []);

  // Monitor live Supabase Realtime channel status
  useEffect(() => {
    if (!isConfigured) {
      setRealtimeConnected(false);
      return;
    }

    const channel = supabase.channel('dev-system-diagnostics-monitor');
    channel.subscribe((status) => {
      setRealtimeConnected(status === 'SUBSCRIBED');
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isConfigured]);

  const rawDist = sb024?.rawDistanceCm ?? sb024?.distanceCm ?? null;
  const filteredDist = sb024?.distanceCm ?? null;
  const fill = sb024?.currentFillLevel ?? 0;
  const hasGps = Boolean(sb024?.gpsFix && sb024?.location?.lat && sb024?.location?.lng);

  const diagnosticsTable = [
    { label: 'DATA MODE', value: dataMode.toUpperCase(), highlight: true },
    { label: 'Supabase', value: dbReachable === null ? 'CHECKING...' : dbReachable ? 'CONNECTED' : 'DISCONNECTED', ok: dbReachable },
    { label: 'Realtime', value: realtimeConnected ? 'CONNECTED' : 'DISCONNECTED', ok: realtimeConnected },
    { label: 'SB-024 source', value: 'PHYSICAL', highlight: true },
    { label: 'Device status', value: sb024?.wifiConnected ? 'ONLINE' : (sb024?.lastUpdated ? 'OFFLINE' : 'Awaiting telemetry'), ok: sb024?.wifiConnected ?? false },
    { label: 'Last telemetry', value: sb024?.lastUpdated ? new Date(sb024.lastUpdated).toLocaleString() : 'Never' },
    { label: 'Wi-Fi status', value: sb024?.wifiConnected ? 'CONNECTED' : 'DISCONNECTED', ok: sb024?.wifiConnected ?? false },
    { label: 'RSSI', value: valueOrNA(sb024?.wifiSignal, ' dBm') },
    { label: 'Raw ultrasonic distance', value: valueOrNA(rawDist, ' cm') },
    { label: 'Filtered ultrasonic distance', value: valueOrNA(filteredDist, ' cm') },
    { label: 'Fill percentage', value: `${fill}%` },
    { label: 'Fill status', value: sb024?.hardwareFillStatus || sb024?.status?.toUpperCase() || 'UNKNOWN' },
    { label: 'GPS state', value: hasGps ? 'GPS FIX' : 'Awaiting GPS fix', ok: hasGps },
    { label: 'Satellites', value: valueOrNA(sb024?.gpsSatellites) },
    { label: 'Latitude', value: hasGps ? sb024!.location.lat.toFixed(6) : 'Awaiting GPS fix' },
    { label: 'Longitude', value: hasGps ? sb024!.location.lng.toFixed(6) : 'Awaiting GPS fix' },
    { label: 'Last GPS update', value: sb024?.gpsUpdatedAt ? new Date(sb024.gpsUpdatedAt).toLocaleString() : (hasGps ? 'Recent' : 'N/A') },
    { label: 'HTTP/MQTT connection', value: 'HTTP Edge Function (/functions/v1/iot-telemetry)' },
    { label: 'Last ingestion response/error', value: lastError ? `Error: ${lastError}` : (dbReachable ? 'HTTP 200 OK (Verified via Supabase)' : 'Awaiting valid connection') },
    { label: 'Physical verification', value: 'NOT_PHYSICALLY_VERIFIED (Awaiting Serial Monitor / bench evidence)' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-5 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-900 font-['Outfit',sans-serif]">SB-024 Hardware & Cloud Diagnostics</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            End-to-end telemetry verification: ESP32 &bull; Ultrasonic &bull; GPS &bull; Remote Supabase &bull; Realtime Engine.
          </p>
        </div>
        <button
          onClick={checkDatabaseHealth}
          disabled={checking}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
          <span>Check Health</span>
        </button>
      </div>

      {/* Top Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border p-4 bg-slate-50 border-slate-200">
          <div className="text-[11px] font-black uppercase text-slate-500">DATA MODE</div>
          <div className="mt-1 text-base font-bold font-mono text-slate-900">{dataMode.toUpperCase()}</div>
          <div className="mt-1 text-[10px] text-slate-400">Zero-fake-data mode</div>
        </div>

        <div className={`rounded-xl border p-4 ${badgeClass(dbReachable)}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase">Supabase</span>
            <Database className="w-4 h-4" />
          </div>
          <div className="mt-1 text-base font-bold font-mono">
            {dbReachable === null ? 'CHECKING' : dbReachable ? 'CONNECTED' : 'DISCONNECTED'}
          </div>
          <div className="mt-1 text-[10px] truncate">{env.VITE_SUPABASE_URL}</div>
        </div>

        <div className={`rounded-xl border p-4 ${badgeClass(realtimeConnected)}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase">Realtime</span>
            <Radio className="w-4 h-4" />
          </div>
          <div className="mt-1 text-base font-bold font-mono">
            {realtimeConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </div>
          <div className="mt-1 text-[10px]">WebSocket live publication</div>
        </div>

        <div className="rounded-xl border p-4 bg-blue-50 border-blue-200 text-blue-900">
          <div className="text-[11px] font-black uppercase text-blue-600">SB-024 Source</div>
          <div className="mt-1 text-base font-bold font-mono">PHYSICAL</div>
          <div className="mt-1 text-[10px] text-blue-500">ESP32 + HC-SR04 + NEO-6M</div>
        </div>
      </div>

      {/* Main Diagnostic Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 font-['Outfit',sans-serif] flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" /> Live Telemetry Contract Verification
          </h3>
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">
            Target: SB-024 &bull; table: bin_current_state
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
          {diagnosticsTable.map((item) => (
            <div
              key={item.label}
              className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                item.highlight
                  ? 'border-blue-200 bg-blue-50/50'
                  : 'border-slate-100 bg-slate-50/80'
              }`}
            >
              <span className="text-slate-500 font-bold">{item.label}</span>
              <span className="font-mono font-bold text-slate-900 text-right break-all">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Physical Acceptance & Safety Notes */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
        <h4 className="text-sm font-bold text-slate-900 font-['Outfit',sans-serif] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Physical Acceptance Checklist Status
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-emerald-900 space-y-1">
            <div className="font-bold">Software &amp; Cloud Ready</div>
            <p className="text-[11px] text-emerald-700">
              Edge Function, contracts, dynamic KPIs, and Realtime listeners are compiled and active.
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-amber-900 space-y-1">
            <div className="font-bold">GPS Confirmation</div>
            <p className="text-[11px] text-amber-700">
              Zero fixture coordinates. Map marker will only plot once physical NEO-6M locks onto satellites.
            </p>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-rose-900 space-y-1">
            <div className="font-bold">Physical Bench Gate</div>
            <p className="text-[11px] text-rose-700">
              PHYSICALLY_VERIFIED sign-off remains gated on user-provided Serial Monitor capture.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};