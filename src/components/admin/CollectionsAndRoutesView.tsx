import React from 'react';
import { CheckCircle2, Truck } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { useSmartBin } from '../../context/SmartBinContext';

export const CollectionsAndRoutesView: React.FC = () => {
  const { routeStops, bins, routeLoad, markRouteStopCollected } = useSmartBin();
  const [collectionNotification, setCollectionNotification] = React.useState<string | null>(null);

  const stopBins = routeStops
    .map((stop) => bins.find((bin) => bin.code === stop.binCode))
    .filter((bin): bin is NonNullable<typeof bin> => Boolean(bin && bin.gpsFix));
  const polylineCoords: [number, number][] = stopBins.map((bin) => [bin.location.lat, bin.location.lng]);
  const center: [number, number] = polylineCoords[0] || [5.6037, -0.1870];

  const handleCollectStop = (index: number, name: string) => {
    markRouteStopCollected(index);
    setCollectionNotification(`Marked ${name} as collected.`);
    setTimeout(() => setCollectionNotification(null), 3000);
  };

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div>
          <h2 className="font-['Outfit',sans-serif] text-xl font-bold text-slate-900">Collections &amp; Routes</h2>
          <p className="text-xs text-slate-500">Live route manifest - Device handoff - Municipal dispatch</p>
        </div>
        <div className="flex items-center gap-3">
          {collectionNotification && (
            <span className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{collectionNotification}</span>
            </span>
          )}
          <span className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 font-mono text-xs font-bold text-blue-700">Route load {routeLoad}%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex h-[520px] flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm lg:col-span-7">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-blue-600" /><span className="text-xs font-bold text-slate-900">Route map</span></div>
            <span className="rounded bg-emerald-50 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-700">{polylineCoords.length > 0 ? 'GPS sync' : 'No route GPS'}</span>
          </div>

          <div className="relative mt-2 h-[430px] overflow-hidden rounded-2xl">
            <MapContainer center={center} zoom={12} scrollWheelZoom={false} className="h-full w-full">
              <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {polylineCoords.length > 1 && <Polyline positions={polylineCoords} pathOptions={{ color: '#1D70F5', weight: 4, dashArray: '6, 6' }} />}
              {stopBins.map((bin) => (
                <Marker key={bin.id} position={[bin.location.lat, bin.location.lng]}>
                  <Popup><strong>{bin.code} - {bin.name}</strong></Popup>
                </Marker>
              ))}
            </MapContainer>
            {polylineCoords.length === 0 && (
              <div className="absolute inset-x-6 bottom-6 rounded-2xl border border-slate-200 bg-white/95 p-4 text-sm shadow-sm">
                <div className="font-bold text-slate-900">No live route geometry</div>
                <p className="mt-1 text-xs text-slate-500">Route stops without linked GPS bins are kept in the manifest but not drawn on the map.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3 lg:col-span-5">
          <div className="space-y-3 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">Route Manifest</h3>
              <span className="font-mono text-xs text-slate-400">{routeStops.length} stops</span>
            </div>

            {routeStops.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                <div className="font-bold text-slate-900">No active route stops</div>
                <p className="mt-1 text-xs">The route manifest table returned no stops.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {routeStops.map((stop, index) => (
                  <button
                    type="button"
                    key={stop.id || `${stop.name}-${index}`}
                    onClick={() => stop.status !== 'COLLECTED' && handleCollectStop(index, stop.name)}
                    className={`flex w-full items-center justify-between rounded-2xl border p-3.5 text-left text-xs transition-all ${stop.status === 'COLLECTED' ? 'border-emerald-200 bg-emerald-50/70 opacity-80' : 'border-slate-100 bg-slate-50 hover:bg-slate-100/80'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-400">{stop.time}</span>
                      <div><span className="block font-bold text-slate-900">{stop.name}</span><span className="text-[10px] text-slate-500">{stop.type}</span></div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${stop.status === 'COLLECTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{stop.status}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 text-xs shadow-sm">
            <div className="font-bold text-slate-900">Collector vehicles</div>
            <p className="mt-1 text-slate-500">No vehicle telemetry table is connected yet, so live truck cards are intentionally empty.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

