import React, { useEffect } from 'react';
import { Battery, Radio, RefreshCw, Search, Layers, Flame, AlertTriangle, Truck, WifiOff, MapPin, ArrowUpRight } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { SmartBin } from '../../types';
import { useSmartBin } from '../../context/SmartBinContext';

const MapRecenter: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && Number.isFinite(center[0]) && Number.isFinite(center[1]) && center[0] !== 0 && center[1] !== 0) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
};

interface BinsAndLocationsViewProps {
  onSelectBin: (bin: SmartBin) => void;
}

const layerOptions = [
  { name: 'Capacity heat', icon: Flame },
  { name: 'Overflow complaints', icon: AlertTriangle },
  { name: 'Collector route', icon: Truck },
  { name: 'Offline bins', icon: WifiOff },
];

const statusLabel = (bin: SmartBin) => {
  if (bin.status === 'offline') return 'NO SIGNAL';
  if (bin.status === 'overflow' || bin.currentFillLevel >= 95) return 'OVERFLOW';
  if (bin.currentFillLevel >= 80) return 'NEAR FULL';
  return 'NORMAL';
};

const statusClasses = (bin: SmartBin) => {
  if (bin.status === 'offline') return 'border-slate-300 bg-slate-50/60 text-slate-500';
  if (bin.status === 'overflow' || bin.currentFillLevel >= 95) return 'border-rose-300 bg-rose-50/30 text-rose-700';
  if (bin.currentFillLevel >= 80) return 'border-amber-300 bg-amber-50/20 text-amber-700';
  return 'border-slate-200 bg-white text-slate-900';
};

export const BinsAndLocationsView: React.FC<BinsAndLocationsViewProps> = ({ onSelectBin }) => {
  const { bins, dataMode, dataStatus, dataError, refreshLiveData, setSelectedBinId } = useSmartBin();
  const [selectedLayer, setSelectedLayer] = React.useState('Capacity heat');
  const [searchQuery, setSearchQuery] = React.useState('');

  const query = searchQuery.trim().toLowerCase();
  const filtered = bins.filter((bin) => {
    if (!query) return true;
    return [bin.code, bin.name, bin.location.address, bin.location.city, bin.assignedZone]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });
  const gpsBins = filtered.filter((bin) => Number.isFinite(bin.location.lat) && Number.isFinite(bin.location.lng) && bin.location.lat !== 0 && bin.location.lng !== 0);
  const center: [number, number] = gpsBins[0] ? [gpsBins[0].location.lat, gpsBins[0].location.lng] : [6.6885, -1.6244];

  const selectBin = (bin: SmartBin) => {
    setSelectedBinId(bin.id);
    onSelectBin(bin);
  };

  return (
    <div className="space-y-5 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative min-w-[260px] max-w-xl flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search asset register by ID or street name..."
              className="w-full rounded-xl border border-transparent bg-[#ECEEF2] py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 transition-all focus:border-[#1D70F5] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 flex items-center gap-1 text-xs font-bold text-slate-400">
              <Layers className="h-3.5 w-3.5" /> Map Layers:
            </span>
            {layerOptions.map((layer) => {
              const Icon = layer.icon;
              const selected = selectedLayer === layer.name;
              return (
                <button
                  key={layer.name}
                  type="button"
                  onClick={() => setSelectedLayer(layer.name)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${selected ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{layer.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {dataMode === 'live' && dataStatus !== 'ready' && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            <span>{dataError || `Live data status: ${dataStatus}`}</span>
            <button type="button" onClick={refreshLiveData} className="inline-flex items-center gap-1 font-bold text-blue-700">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="flex h-[580px] flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm lg:col-span-7">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h3 className="font-['Outfit',sans-serif] text-sm font-bold text-slate-900">Kumasi SmartBin Fleet Mesh</h3>
              <p className="text-[11px] text-slate-500">GPS clusters - Route handoff nodes - Active Layer: {selectedLayer}</p>
            </div>
            <span className="rounded bg-blue-50 px-2 py-0.5 font-mono text-xs font-bold text-blue-600">{filtered.length} Assets</span>
          </div>

          <div className="relative mt-2 h-[490px] overflow-hidden rounded-2xl">
            <MapContainer center={center} zoom={13} scrollWheelZoom className="h-full w-full">
              <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {gpsBins[0] && <MapRecenter center={[gpsBins[0].location.lat, gpsBins[0].location.lng]} />}
              {gpsBins.map((bin) => (
                <Marker key={bin.id} position={[bin.location.lat, bin.location.lng]} eventHandlers={{ click: () => selectBin(bin) }}>
                  <Popup>
                    <div className="p-1 text-xs">
                      <strong>{bin.code} - {bin.name}</strong>
                      <div className="mt-1 font-bold">Fill: {bin.currentFillLevel}%</div>
                      <div>Location: {bin.location.address || bin.location.city}</div>
                      <div>GPS: {bin.gpsFix ? 'Confirmed Satellite Lock' : 'Awaiting Outdoor Lock (Hostel Bench)'}</div>
                      <button onClick={() => selectBin(bin)} className="mt-2 w-full rounded bg-blue-600 py-1 text-[10px] font-bold text-white">
                        Inspect Telemetry
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
            {gpsBins.length === 0 && (
              <div className="absolute inset-x-6 bottom-6 rounded-2xl border border-slate-200 bg-white/95 p-4 text-sm shadow-sm">
                <div className="font-bold text-slate-900">No live GPS device locations</div>
                <p className="mt-1 text-xs text-slate-500">Bins without a current GPS fix remain in the asset register but are not plotted as live markers.</p>
              </div>
            )}
          </div>
        </div>

        <div className="h-[580px] space-y-3 overflow-y-auto pr-1 lg:col-span-5">
          <div className="px-1 text-xs font-bold uppercase tracking-wider text-slate-400">Asset Register - Priority Queue</div>

          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              <div className="font-bold text-slate-900">No bins found</div>
              <p className="mt-1 text-xs">Live mode is showing exactly what Supabase returned for the current filters.</p>
            </div>
          ) : filtered.map((bin) => (
            <button
              key={bin.id}
              type="button"
              onClick={() => selectBin(bin)}
              className={`w-full rounded-2xl border p-4 text-left shadow-sm transition-all hover:shadow-md ${statusClasses(bin)}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-black text-slate-900">{bin.code}</span>
                    <span className="text-[10px] font-bold uppercase text-slate-400">{bin.category}</span>
                  </div>
                  <h4 className="mt-1 text-sm font-bold text-slate-900">{bin.name}</h4>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                    <MapPin className="h-3 w-3 text-blue-500" />
                    <span>{bin.location.address}</span>
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-['Outfit',sans-serif] text-xl font-black">{bin.status === 'offline' ? 'OFFLINE' : `${bin.currentFillLevel}%`}</div>
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-[9px] font-black uppercase">{statusLabel(bin)}</span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1"><Battery className="h-3 w-3 text-emerald-600" /> {bin.batteryLevel == null ? 'Battery N/A' : `${bin.batteryLevel}% Battery`}</span>
                <span className="flex items-center gap-1"><Radio className="h-3 w-3 text-blue-600" /> {bin.wifiSignal == null ? 'RSSI N/A' : `${bin.wifiSignal} dBm`}</span>
                <span className="flex items-center gap-0.5 font-bold text-blue-600">View Telemetry <ArrowUpRight className="h-3 w-3" /></span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

