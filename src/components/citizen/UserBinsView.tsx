import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { ArrowRight, Bot, MapPin } from 'lucide-react';
import { SmartBin } from '../../types';
import { useSmartBin } from '../../context/SmartBinContext';

interface UserBinsViewProps {
  onSelectBin: (bin: SmartBin) => void;
}

export const UserBinsView: React.FC<UserBinsViewProps> = ({ onSelectBin }) => {
  const { bins, citizenReports } = useSmartBin();
  const gpsBins = bins.filter((bin) => bin.gpsFix && Number.isFinite(bin.location.lat) && Number.isFinite(bin.location.lng));
  const center: [number, number] = gpsBins[0] ? [gpsBins[0].location.lat, gpsBins[0].location.lng] : [5.6037, -0.1870];
  const recentReport = citizenReports[0];

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-['Outfit',sans-serif] text-xl font-bold text-slate-900">Nearby SmartBins in Accra</h2>
          <p className="text-xs text-slate-500">Find the closest live smart dustbin with available capacity.</p>
        </div>
      </div>

      <div className="relative h-[400px] overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <MapContainer center={center} zoom={12} scrollWheelZoom={false} className="h-full w-full rounded-2xl">
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {gpsBins.map((bin) => (
            <Marker key={bin.id} position={[bin.location.lat, bin.location.lng]} eventHandlers={{ click: () => onSelectBin(bin) }}>
              <Popup>
                <div className="p-1 text-xs">
                  <strong>{bin.code} - {bin.name}</strong>
                  <div>{bin.location.address}</div>
                  <div className="mt-1 font-bold">Fill Level: {bin.currentFillLevel}%</div>
                  <button onClick={() => onSelectBin(bin)} className="mt-2 w-full rounded bg-blue-600 py-1 text-[10px] font-bold text-white">View Details</button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        {gpsBins.length === 0 && (
          <div className="absolute inset-x-6 bottom-6 rounded-2xl border border-slate-200 bg-white/95 p-4 text-sm shadow-sm">
            <div className="font-bold text-slate-900">No live GPS bins nearby</div>
            <p className="mt-1 text-xs text-slate-500">The map only plots bins with a current GPS fix.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="grid grid-cols-1 gap-4 lg:col-span-8 sm:grid-cols-2">
          {bins.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              <div className="font-bold text-slate-900">No SmartBins are registered yet</div>
              <p className="mt-1 text-xs">Live mode is showing the empty asset register from Supabase.</p>
            </div>
          ) : bins.map((bin) => (
            <button key={bin.id} type="button" onClick={() => onSelectBin(bin)} className="space-y-3 rounded-3xl border border-slate-200/80 bg-white p-5 text-left shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="rounded-lg bg-blue-50 px-2 py-0.5 font-mono text-xs font-bold text-blue-600">{bin.code}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${bin.currentFillLevel >= 95 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{bin.currentFillLevel >= 95 ? 'Overflow' : 'Available'}</span>
              </div>
              <div><h4 className="text-sm font-bold text-slate-900">{bin.name}</h4><p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5 shrink-0 text-blue-500" /><span>{bin.location.address}</span></p></div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs"><div><span className="text-slate-400">Fill: </span><strong className={bin.currentFillLevel >= 95 ? 'text-rose-600' : 'text-slate-900'}>{bin.currentFillLevel}%</strong></div><span className="flex items-center gap-0.5 text-xs font-bold text-blue-600">View Bin <ArrowRight className="h-3.5 w-3.5" /></span></div>
            </button>
          ))}
        </div>

        <div className="space-y-4 lg:col-span-4">
          <div className="space-y-3 rounded-3xl border border-slate-200/80 bg-white p-5 text-xs shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2"><h4 className="font-bold text-slate-900">Your Recent Report</h4><span className="font-mono text-[10px] text-slate-400">Live</span></div>
            {recentReport ? <div className="space-y-1"><span className="font-mono text-[11px] font-bold text-blue-600">#{recentReport.id}</span><div className="font-bold text-slate-900">{recentReport.issueType} - {recentReport.binName || recentReport.locationText}</div><div className="text-[11px] font-bold text-emerald-600">{recentReport.status}</div></div> : <p className="text-[11px] text-slate-500">No citizen reports have been submitted.</p>}
          </div>

          <div className="flex items-start gap-3 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Bot className="h-4 w-4" /></div>
            <div className="space-y-1 text-xs"><div className="font-bold text-slate-900">KlinGhana AI Helper</div><p className="text-[11px] leading-relaxed text-slate-500">Ask the assistant about sorting rules or the live fleet state.</p></div>
          </div>
        </div>
      </div>
    </div>
  );
};

