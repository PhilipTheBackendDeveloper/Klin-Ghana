import React from 'react';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Route,
  Trash2,
  ArrowUpRight,
  Activity,
  MapPin,
  HeartPulse,
  WifiOff,
  ShieldAlert,
  Crosshair,
  ExternalLink,
  Copy,
  Check,
  Layers,
  Building2,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { SmartBin } from '../../types';
import { useSmartBin } from '../../context/SmartBinContext';
import {
  MapStyle,
  MAP_LAYERS,
  getMapLayer,
  createBinMarkerIcon,
} from '../map/mapTiles';
import { MapAutoSize } from '../map/MapAutoSize';
import { StatCard } from '../common/StatCard';
import { EmptyState } from '../common/EmptyState';
import { BinLocationLabel } from '../common/BinLocationLabel';
import { formatCoordinates, getGoogleMapsUrl, useExactLocation } from '../../services/reverseGeocode';

const MapRecenter: React.FC<{ center: [number, number]; zoom?: number; trigger?: number }> = ({ center, zoom = 18, trigger }) => {
  const map = useMap();
  React.useEffect(() => {
    if (center && Number.isFinite(center[0]) && Number.isFinite(center[1]) && center[0] !== 0 && center[1] !== 0) {
      map.flyTo(center, zoom, { duration: 1.2 });
    }
  }, [center, zoom, trigger, map]);
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

  const [mapStyle, setMapStyle] = React.useState<MapStyle>('satellite');
  const [focusTrigger, setFocusTrigger] = React.useState(0);
  const [copiedCoords, setCopiedCoords] = React.useState(false);

  const targetBin = selectedBin;
  const mapBins = bins.slice(0, 12);
  const gpsBins = mapBins.filter((b) => Number.isFinite(b.location.lat) && Number.isFinite(b.location.lng) && b.location.lat !== 0 && b.location.lng !== 0);

  // Focus priority: Explicitly selected bin -> First live GPS bin -> default
  const activePinBin = (targetBin && Number.isFinite(targetBin.location.lat) && targetBin.location.lat !== 0)
    ? targetBin
    : (gpsBins[0] || bins[0]);

  const mapCenter: [number, number] = activePinBin && Number.isFinite(activePinBin.location.lat) && activePinBin.location.lat !== 0
    ? [activePinBin.location.lat, activePinBin.location.lng]
    : [6.671651, -1.562522];

  const initialZoom = activePinBin?.gpsFix ? 18 : 14;
  const currentLayer = getMapLayer(mapStyle);

  const exactLocation = useExactLocation(
    activePinBin?.location?.lat,
    activePinBin?.location?.lng,
    activePinBin?.location?.address,
    activePinBin?.location?.landmark
  );

  const shownReports = citizenReports.filter((report) => report.status !== 'Resolved' && report.status !== 'Closed').slice(0, 4);
  const shownAlerts = alerts.filter((alert) => !alert.read).slice(0, 3);
  const collectedStops = routeStops.filter((stop) => stop.status === 'COLLECTED').length;

  const selectBin = (bin: SmartBin) => {
    setSelectedBinId(bin.id);
    onSelectBin(bin);
    setFocusTrigger((prev) => prev + 1);
  };

  const handleFocusBuilding = () => {
    setFocusTrigger((prev) => prev + 1);
  };

  const handleCopyCoordinates = () => {
    if (exactLocation.formattedCoordinates && navigator.clipboard) {
      navigator.clipboard.writeText(exactLocation.formattedCoordinates);
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2000);
    }
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
          <button
            type="button"
            onClick={refreshLiveData}
            disabled={dataMode === 'live' && dataStatus === 'loading'}
            title="Re-check the database for each bin's latest known GPS fix"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-cyan-300 bg-cyan-50 text-cyan-700 text-xs font-bold hover:bg-cyan-100 transition-colors disabled:opacity-70 disabled:cursor-wait"
          >
            <RefreshCw className={`w-3 h-3 ${dataMode === 'live' && dataStatus === 'loading' ? 'animate-spin' : ''}`} />
            <span>{dataStatus === 'loading' ? 'Syncing…' : bins.some((bin) => bin.gpsFix) ? 'GPS sync' : 'No GPS'}</span>
          </button>

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

      {/* Prominent Exact Physical Location Banner */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Exact Physical Location
              </span>
              {activePinBin?.gpsFix && (
                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/25 text-blue-300 border border-blue-500/40">
                  🛰️ Confirmed Satellite Fix
                </span>
              )}
              {activePinBin && (
                <span className="text-xs font-mono text-slate-300 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10">
                  Asset: <span className="text-white font-bold">{activePinBin.code}</span> ({activePinBin.name})
                </span>
              )}
            </div>

            <div className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <MapPin className="w-6 h-6 text-rose-400 shrink-0 animate-bounce" />
              <span>{exactLocation.primaryTitle}</span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-300">
              <span className="font-semibold text-slate-200">{exactLocation.suburb}</span>
              <span>•</span>
              <span className="text-slate-400">{exactLocation.district}</span>
              <span>•</span>
              <span className="text-slate-400">{exactLocation.region}</span>
              <span>•</span>
              <span className="font-mono text-cyan-300 font-bold bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-700/60 shadow-inner">
                {exactLocation.formattedCoordinates}
              </span>
            </div>
          </div>

          {/* Quick Action Controls on Header */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleFocusBuilding}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 border border-blue-400/30"
              title="Zoom directly into the building rooftop (Level 18x)"
            >
              <Crosshair className="w-4 h-4" />
              <span>Focus Building (18x)</span>
            </button>

            {exactLocation.isGpsLock && (
              <a
                href={exactLocation.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all shadow-sm active:scale-95"
                title="Open exact pin in Google Maps"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Google Maps</span>
              </a>
            )}

            {exactLocation.isGpsLock && (
              <button
                type="button"
                onClick={handleCopyCoordinates}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all active:scale-95"
                title="Copy GPS coordinates"
              >
                {copiedCoords ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCoords ? 'Copied' : 'Copy'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Middle Section: Live Fleet Map + Selected Asset Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Map Container */}
        <div className="lg:col-span-8 flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-['Outfit',sans-serif] text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Kumasi SmartBin Fleet Mesh</span>
                <span className="text-xs font-normal text-slate-400">• High-Res Satellite Buildings</span>
              </h2>
              <p className="text-[11px] text-slate-500">Live GPS tracking, real compound outlines & sensor telemetry overlay</p>
            </div>

            {/* Map Layer Switcher Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 shrink-0">
              <button
                type="button"
                onClick={() => setMapStyle('satellite')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  mapStyle === 'satellite'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Satellite view showing buildings, compounds, and roofs"
              >
                🛰️ Satellite
              </button>
              <button
                type="button"
                onClick={() => setMapStyle('street')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  mapStyle === 'street'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="OpenStreetMap street view"
              >
                🗺️ Street
              </button>
              <button
                type="button"
                onClick={() => setMapStyle('canvas')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  mapStyle === 'canvas'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Monochrome clean canvas"
              >
                ⚪ Canvas
              </button>
            </div>
          </div>

          <div className="relative mt-3 h-[420px] sm:h-[480px] w-full overflow-hidden rounded-2xl border border-slate-200 shadow-inner">
            <MapContainer
              center={mapCenter}
              zoom={initialZoom}
              maxZoom={currentLayer.maxZoom}
              scrollWheelZoom={true}
              className="h-full w-full"
            >
              <TileLayer
                key={mapStyle}
                attribution={currentLayer.attribution}
                url={currentLayer.url}
                maxZoom={currentLayer.maxZoom}
                subdomains={currentLayer.subdomains || ['a', 'b', 'c']}
              />
              {currentLayer.labelsUrl && (
                <TileLayer
                  key={`${mapStyle}-labels`}
                  url={currentLayer.labelsUrl}
                  maxZoom={currentLayer.labelsMaxZoom ?? currentLayer.maxZoom}
                  subdomains={currentLayer.subdomains || ['a', 'b', 'c']}
                />
              )}
              <MapAutoSize />
              <MapRecenter center={mapCenter} zoom={18} trigger={focusTrigger} />

              {gpsBins.map((bin) => (
                <Marker
                  key={bin.id}
                  position={[bin.location.lat, bin.location.lng]}
                  icon={createBinMarkerIcon(bin, { active: targetBin?.id === bin.id })}
                  eventHandlers={{ click: () => selectBin(bin) }}
                >
                  <Popup>
                    <div className="p-2 text-xs min-w-[200px]">
                      <div className="font-bold text-slate-900 text-sm">{bin.code} - {bin.name}</div>
                      <div className="text-[11px] font-semibold text-blue-600 mt-0.5">
                        📍 {bin.location.address || 'Kotei Road, Kumasi'}
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-slate-500 bg-slate-100 p-1 rounded">
                        {formatCoordinates(bin.location.lat, bin.location.lng)}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Fill level:</span>
                        <span className="font-bold text-emerald-600">{bin.currentFillLevel}%</span>
                      </div>
                      <div className="flex items-center justify-between text-xs mt-0.5">
                        <span className="text-slate-500">Battery:</span>
                        <span className="font-bold text-slate-700">{bin.batteryLevel ?? 'N/A'}%</span>
                      </div>
                      <div className="mt-2 text-[10px] font-semibold text-emerald-600">
                        {bin.gpsFix ? 'Confirmed Satellite Lock' : 'Bench Location'}
                      </div>
                      <div className="mt-2 flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => selectBin(bin)}
                          className="flex-1 rounded bg-blue-600 py-1.5 text-[10px] font-bold text-white hover:bg-blue-700"
                        >
                          Select Asset
                        </button>
                        <a
                          href={getGoogleMapsUrl(bin.location.lat, bin.location.lng)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold inline-flex items-center gap-0.5"
                          title="Open in Google Maps"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            {/* In-Map Floating Overlay Pill */}
            <div className="absolute top-3 left-14 z-[400] pointer-events-none hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white border border-white/10 shadow-lg text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{mapStyle === 'satellite' ? 'Google Hybrid Satellite' : mapStyle === 'street' ? 'OpenStreetMap' : 'Light Canvas'}</span>
              <span className="text-slate-400 font-mono">• Zoom 18x Building View</span>
            </div>

            {/* In-Map Floating Focus Button */}
            <button
              type="button"
              onClick={handleFocusBuilding}
              className="absolute bottom-4 right-4 z-[400] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/95 hover:bg-white text-slate-900 text-xs font-bold shadow-lg border border-slate-200 transition-all hover:scale-105 active:scale-95"
              title="Snap camera to building rooftop"
            >
              <Crosshair className="w-3.5 h-3.5 text-blue-600" />
              <span>Center Building</span>
            </button>
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

                {/* Precision GPS Coordinates & Google Maps Link */}
                {targetBin.location.lat !== 0 && targetBin.location.lng !== 0 && (
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">GPS Coordinates</span>
                      <a
                        href={getGoogleMapsUrl(targetBin.location.lat, targetBin.location.lng)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-blue-600 hover:underline inline-flex items-center gap-0.5"
                      >
                        Google Maps <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="font-mono font-bold text-slate-800 text-[11px] mt-1 flex items-center justify-between">
                      <span>{formatCoordinates(targetBin.location.lat, targetBin.location.lng)}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyCoordinates()}
                        className="text-slate-400 hover:text-slate-700 p-0.5"
                        title="Copy coordinates"
                      >
                        {copiedCoords ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 mt-3">
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
