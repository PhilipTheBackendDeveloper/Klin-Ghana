import React from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, Route, Trash2, ArrowUpRight, Activity, MapPin, HeartPulse, WifiOff, ShieldAlert } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { SmartBin } from '../../types';
import { useSmartBin } from '../../context/SmartBinContext';
import { MAP_TILE_URL, MAP_LABELS_TILE_URL, MAP_TILE_ATTRIBUTION, MAP_MAX_ZOOM, MAP_LABELS_MAX_ZOOM, createBinMarkerIcon } from '../map/mapTiles';
import { MapAutoSize } from '../map/MapAutoSize';
import { StatCard } from '../common/StatCard';
import { EmptyState } from '../common/EmptyState';
import { BinLocationLabel } from '../common/BinLocationLabel';

const MapRecenter: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  React.useEffect(() => {
    if (center && Number.isFinite(center[0]) && Number.isFinite(center[1]) && center[0] !== 0 && center[1] !== 0) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
};

interface OperationsCommandCenterProps {
  onSelectBin: (bin: SmartBin) => void;
}

const formatPercent = (value: number) => `${value}%`;
const formatTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) return 'No telemetry';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const OperationsCommandCenter: React.FC<OperationsCommandCenterProps> = ({ onSelectBin }) => {
  const {
    bins,
    selectedBin,
    setSelectedBinId,
    fleetHealth,
    overflowCount,
    offlineCount,
    slaRiskCount,
    routeLoad,
    citizenReports,
    alerts,
    routeStops,
    lastTelemetryTime,
    dataMode,
    dataStatus,
    dataError,
    refreshLiveData,
  } = useSmartBin();

  const targetBin = selectedBin;
  const mapBins = bins.slice(0, 8);
  const gpsBins = mapBins.filter((b) => Number.isFinite(b.location.lat) && Number.isFinite(b.location.lng) && b.location.lat !== 0 && b.location.lng !== 0);
  const mapCenter: [number, number] = gpsBins[0] ? [gpsBins[0].location.lat, gpsBins[0].location.lng] : [6.6885, -1.6244];
  const shownReports = citizenReports.filter((report) => report.status !== 'Resolved' && report.status !== 'Closed').slice(0, 4);
  const shownAlerts = alerts.filter((alert) => !alert.read).slice(0, 3);
  const collectedStops = routeStops.filter((stop) => stop.status === 'COLLECTED').length;

  const selectBin = (bin: SmartBin) => {
    setSelectedBinId(bin.id);
    onSelectBin(bin);
  };

  const kpis = [
    { label: 'Fleet health', value: `${fleetHealth.toFixed(1)}%`, icon: HeartPulse, tone: 'emerald' as const, route: '/admin/bins' },
    { label: 'Overflow', value: String(overflowCount), icon: AlertTriangle, tone: overflowCount > 0 ? 'rose' as const : 'slate' as const, route: '/admin/alerts' },
    { label: 'Offline', value: String(offlineCount), icon: WifiOff, tone: offlineCount > 0 ? 'indigo' as const : 'slate' as const, route: '/admin/bins' },
    { label: 'SLA risk', value: String(slaRiskCount), icon: ShieldAlert, tone: slaRiskCount > 0 ? 'amber' as const : 'slate' as const, route: '/admin/complaints' },
    { label: 'Route load', value: `${routeLoad}%`, icon: Route, tone: 'cyan' as const, route: '/admin/routes' },
  ];

  return (
    <section className="w-full space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header & Live Status Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-['Outfit',sans-serif] text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Operations Command Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kumasi fleet telemetry, real-time GPS tracking & citizen response status
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Live / Demo Badge */}
          <button
            type="button"
            onClick={refreshLiveData}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-300 bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{dataMode === 'demo' ? 'Demo data' : dataStatus}</span>
          </button>

          {/* GPS Sync Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-cyan-300 bg-cyan-50 text-cyan-700 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-cyan-500" />
            <span>{bins.some((bin) => bin.gpsFix) ? 'GPS sync' : 'No GPS'}</span>
          </div>

          {/* Telemetry Timestamp Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-500 text-xs font-medium shadow-2xs">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatTime(lastTelemetryTime)}</span>
          </div>
        </div>
      </div>

      {/* Live Data Error Notification */}
      {dataMode === 'live' && dataStatus !== 'ready' && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-800 shadow-xs">
          <span>{dataError || `Live data status: ${dataStatus}`}</span>
          <button type="button" onClick={refreshLiveData} className="inline-flex items-center gap-1 font-bold text-blue-700 hover:underline">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {kpis.map((kpi) => (
          <StatCard
            key={kpi.label}
            icon={kpi.icon}
            label={kpi.label}
            value={kpi.value}
            tone={kpi.tone}
            onClick={() => { window.location.hash = kpi.route; }}
          />
        ))}
      </div>

      {/* Middle Section: Live Fleet Map + Selected Asset Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Map Container */}
        <div className="lg:col-span-8 flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-['Outfit',sans-serif] text-base sm:text-lg font-bold text-slate-900">
                Kumasi SmartBin Fleet Mesh
              </h2>
              <p className="text-[11px] text-slate-500">Live GPS tracking & sensor telemetry overlay</p>
            </div>
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 font-mono text-xs font-bold text-emerald-700">
              {bins.length} Assets Active
            </span>
          </div>

          <div className="relative mt-3 h-[320px] sm:h-[380px] w-full overflow-hidden rounded-2xl border border-slate-200 shadow-inner">
            <MapContainer center={mapCenter} zoom={13} maxZoom={MAP_MAX_ZOOM} scrollWheelZoom={false} className="h-full w-full">
              <TileLayer attribution={MAP_TILE_ATTRIBUTION} url={MAP_TILE_URL} maxZoom={MAP_MAX_ZOOM} />
              <TileLayer url={MAP_LABELS_TILE_URL} maxZoom={MAP_LABELS_MAX_ZOOM} />
              <MapAutoSize />
              {gpsBins[0] && <MapRecenter center={[gpsBins[0].location.lat, gpsBins[0].location.lng]} />}
              {gpsBins.map((bin) => (
                <Marker
                  key={bin.id}
                  position={[bin.location.lat, bin.location.lng]}
                  icon={createBinMarkerIcon(bin, { active: targetBin?.id === bin.id })}
                  eventHandlers={{ click: () => selectBin(bin) }}
                >
                  <Popup>
                    <div className="p-1 text-xs">
                      <strong>{bin.code} - {bin.name}</strong>
                      <div className="mt-1 font-bold text-emerald-600">Fill: {bin.currentFillLevel}%</div>
                      <div>Location: {bin.location.address || bin.location.city}</div>
                      <div className="text-[10px] text-slate-500 mt-1">{bin.gpsFix ? 'Confirmed Satellite Lock' : 'Bench Location'}</div>
                      <button onClick={() => selectBin(bin)} className="mt-2 w-full rounded bg-blue-600 py-1 text-[10px] font-bold text-white">
                        Inspect Telemetry
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Right Column: Selected Asset Details & Incident Queue */}
        <div className="lg:col-span-4 space-y-4 flex flex-col">
          {/* Selected Asset Card */}
          <div className="p-5 rounded-3xl border border-slate-200/80 bg-white shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selected Asset</span>
              {targetBin && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                  {targetBin.status}
                </span>
              )}
            </div>

            {targetBin ? (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => selectBin(targetBin)}
                  className="w-full text-left group"
                >
                  <div className="text-base sm:text-lg font-bold text-blue-600 group-hover:underline">
                    {targetBin.code} - {targetBin.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    <BinLocationLabel bin={targetBin} />
                  </div>
                </button>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                    <div className="text-[10px] font-bold text-slate-400">Fill level</div>
                    <div className="text-base font-black text-rose-500 mt-0.5">{targetBin.currentFillLevel}%</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                    <div className="text-[10px] font-bold text-slate-400">Battery</div>
                    <div className="text-base font-black text-emerald-600 mt-0.5">
                      {targetBin.batteryLevel == null ? 'N/A' : `${targetBin.batteryLevel}%`}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                    <div className="text-[10px] font-bold text-slate-400">RSSI</div>
                    <div className="text-base font-black text-slate-700 mt-0.5">
                      {targetBin.wifiSignal == null ? 'N/A' : `${targetBin.wifiSignal} dBm`}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                    <div className="text-[10px] font-bold text-slate-400">GPS</div>
                    <div className="text-base font-black text-emerald-600 mt-0.5">
                      {targetBin.gpsFix ? 'Fix' : 'No fix'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState icon={MapPin} title="No asset selected" description="Pick a bin on the map or from the register." compact />
            )}
          </div>

          {/* Incident Queue Card */}
          <div className="p-5 rounded-3xl border border-slate-200/80 bg-white shadow-xs flex-1">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="font-['Outfit',sans-serif] text-sm font-bold text-blue-600">Incident Queue</h3>
              <button
                type="button"
                onClick={() => { window.location.hash = '/admin/alerts'; }}
                className="text-[11px] font-bold text-blue-600 hover:underline inline-flex items-center gap-0.5"
              >
                View all <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            {shownAlerts.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="No unresolved alerts" description="The fleet is quiet right now." compact />
            ) : (
              <div className="space-y-2">
                {shownAlerts.map((alert) => (
                  <button
                    key={alert.id}
                    type="button"
                    onClick={() => { window.location.hash = '/admin/alerts'; }}
                    className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 text-left transition-colors flex items-center justify-between gap-2"
                  >
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700">
                          {alert.severity === 'danger' ? 'P1' : 'P2'}
                        </span>
                        <span className="text-xs font-bold text-slate-800 truncate">{alert.binCode}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{alert.message}</p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">{formatTime(alert.timestamp)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Complaints Table + Collection Route Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Complaints Table */}
        <div className="lg:col-span-8 p-5 rounded-3xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div>
              <h3 className="font-['Outfit',sans-serif] text-base font-bold text-slate-900">Recent Citizen Reports</h3>
              <p className="text-[11px] text-slate-500">Live issues submitted through the citizen portal</p>
            </div>
            <button
              type="button"
              onClick={() => { window.location.hash = '/admin/complaints'; }}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              View Workbench &rarr;
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-2 px-2">Ticket</th>
                  <th className="py-2 px-2">Location</th>
                  <th className="py-2 px-2">Issue</th>
                  <th className="py-2 px-2">Status</th>
                  <th className="py-2 px-2">Reporter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shownReports.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-2">
                      <EmptyState icon={CheckCircle2} title="No unresolved citizen complaints" compact />
                    </td>
                  </tr>
                ) : (
                  shownReports.map((report) => (
                    <tr
                      key={report.id}
                      onClick={() => { window.location.hash = '/admin/complaints'; }}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-2 font-bold text-blue-600 font-mono">#{report.id}</td>
                      <td className="py-2.5 px-2 font-medium text-slate-800 truncate max-w-[160px]">{report.binName || report.locationText}</td>
                      <td className="py-2.5 px-2 text-slate-600">{report.issueType}</td>
                      <td className="py-2.5 px-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          {report.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-slate-500">{report.reportedBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Collection Route Progress Card */}
        <div className="lg:col-span-4 p-5 rounded-3xl border border-slate-200/80 bg-white shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="font-['Outfit',sans-serif] text-base font-bold text-slate-900">Collection Route</h3>
              <button
                type="button"
                onClick={() => { window.location.hash = '/admin/routes'; }}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Manage &rarr;
              </button>
            </div>
            <p className="text-xs text-slate-500">Active automated dispatch load across Kumasi nodes.</p>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600">Route Load</span>
                <span className="text-cyan-600">{routeLoad}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, routeLoad)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{routeStops.length === 0 ? 'No active route stops' : `${collectedStops}/${routeStops.length} stops collected`}</span>
            <Route className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>
    </section>
  );
};
