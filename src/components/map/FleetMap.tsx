import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { 
  Navigation, 
  Trash2, 
  DoorOpen, 
  DoorClosed, 
  Sparkles, 
  MapPin, 
  Filter,
  CheckCircle,
  Truck
} from 'lucide-react';
import { useSmartBin } from '../../context/SmartBinContext';
import { SmartBin, WasteCategory } from '../../types';

// Custom colored SVG icons for Leaflet markers
function createBinIcon(fillLevel: number, category: string, isLidOpen: boolean) {
  let color = '#10b981'; // Green
  let glow = 'rgba(16, 185, 129, 0.4)';

  if (fillLevel >= 95) {
    color = '#f43f5e'; // Red
    glow = 'rgba(244, 63, 94, 0.7)';
  } else if (fillLevel >= 80) {
    color = '#f59e0b'; // Amber
    glow = 'rgba(245, 158, 11, 0.5)';
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="${glow}"/>
        </filter>
      </defs>
      <g filter="url(#shadow)">
        <path d="M20 0 C9 0 0 9 0 20 C0 32 20 50 20 50 C20 50 40 32 40 20 C40 9 31 0 20 0 Z" fill="${color}"/>
        <circle cx="20" cy="18" r="14" fill="#0f172a"/>
        <text x="20" y="22" fill="#ffffff" font-size="10" font-family="sans-serif" font-weight="bold" text-anchor="middle">${fillLevel}%</text>
      </g>
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: 'custom-bin-marker',
    iconSize: [40, 50],
    iconAnchor: [20, 50],
    popupAnchor: [0, -45]
  });
}

export const FleetMap: React.FC = () => {
  const { bins, toggleLid, triggerProximitySensor, collectBin, role } = useSmartBin();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showTruckRoute, setShowTruckRoute] = useState<boolean>(true);

  // Filtered bins
  const filteredBins = bins.filter(b => selectedCategory === 'all' || b.category === selectedCategory);

  // High priority bins requiring pickup (>=80%)
  const urgentBins = bins.filter(b => b.currentFillLevel >= 80);

  // Coordinates for the route connecting all urgent bins + starting depot
  const depotCoords: [number, number] = [5.5500, -0.2000]; // Accra Municipal Solid Waste Depot
  const routePolyline: [number, number][] = [
    depotCoords,
    ...urgentBins.map(b => [b.location.lat, b.location.lng] as [number, number]),
    depotCoords
  ];

  const categories: { id: string; label: string }[] = [
    { id: 'all', label: 'All Bins' },
    { id: 'plastic', label: 'Plastics & Sachets' },
    { id: 'organic', label: 'Organic Waste' },
    { id: 'paper', label: 'Paper & Boxes' },
    { id: 'electronic', label: 'E-Waste' }
  ];

  return (
    <div className="space-y-4">
      {/* Top Map Action Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        {/* Category filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-brand-400" /> Filter:
          </span>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedCategory === cat.id
                  ? 'bg-brand-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Route Optimizer Toggle & Stats */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTruckRoute(!showTruckRoute)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              showTruckRoute
                ? 'bg-smart-500/20 text-smart-300 border-smart-500/40 shadow-sm shadow-smart-500/10'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Truck className="w-4 h-4 text-smart-400" />
            <span>{showTruckRoute ? 'Truck Route: Active' : 'Show Collection Route'}</span>
          </button>

          {showTruckRoute && urgentBins.length > 0 && (
            <div className="text-xs px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              <span><strong>{urgentBins.length}</strong> full bins on optimal circuit</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Map Container */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden h-[620px] relative shadow-2xl">
        <MapContainer
          center={[5.6037, -0.1870]}
          zoom={12}
          scrollWheelZoom={true}
          className="h-full w-full"
        >
          {/* Dark Mode Tile Provider (CartoDB Dark Matter) */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Municipal Truck Route Polyline */}
          {showTruckRoute && urgentBins.length > 0 && (
            <Polyline
              positions={routePolyline}
              pathOptions={{
                color: '#0284c7',
                weight: 4,
                dashArray: '8, 8',
                opacity: 0.85
              }}
            />
          )}

          {/* Bin Markers */}
          {filteredBins.map((bin) => {
            const isLidOpen = bin.lidState === 'OPEN';
            const icon = createBinIcon(bin.currentFillLevel, bin.category, isLidOpen);

            return (
              <Marker
                key={bin.id}
                position={[bin.location.lat, bin.location.lng]}
                icon={icon}
              >
                <Popup>
                  <div className="p-1 max-w-xs text-slate-900">
                    <div className="flex items-center justify-between gap-2 border-b pb-2 mb-2">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">
                        {bin.code}
                      </span>
                      <span className="text-[10px] font-bold uppercase text-emerald-700">
                        {bin.category}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900">{bin.name}</h4>
                    <p className="text-[11px] text-slate-600 mb-2">{bin.location.address}</p>

                    {/* Fill Level Progress Bar */}
                    <div className="my-2">
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span>Fill Level</span>
                        <span className={bin.currentFillLevel >= 80 ? 'text-red-600' : 'text-emerald-700'}>
                          {bin.currentFillLevel}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${bin.currentFillLevel >= 80 ? 'bg-red-500' : 'bg-emerald-500'}`}
                          style={{ width: `${bin.currentFillLevel}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Sensor snapshot */}
                    <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-600 my-2">
                      <div>Battery: <strong>{bin.batteryLevel == null ? 'N/A' : `${bin.batteryLevel}%`}</strong></div>
                      <div>Temp: <strong>{bin.temperature == null ? 'N/A' : `${bin.temperature}C`}</strong></div>
                      <div>Weight: <strong>{bin.weightKg == null ? 'N/A' : `${bin.weightKg} kg`}</strong></div>
                      <div>Lid: <strong>{bin.lidState}</strong></div>
                    </div>

                    {/* Quick actions inside popup */}
                    <div className="flex items-center gap-1.5 pt-2 border-t mt-2">
                      <button
                        onClick={() => triggerProximitySensor(bin.id)}
                        className="flex-1 py-1 px-2 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold"
                      >
                        Approach Bin
                      </button>
                      <button
                        onClick={() => toggleLid(bin.id)}
                        className="py-1 px-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-semibold"
                      >
                        {bin.lidState === 'OPEN' ? 'Close' : 'Open'}
                      </button>
                      {role === 'admin' && (
                        <button
                          onClick={() => collectBin(bin.id)}
                          className="py-1 px-2 rounded bg-red-100 hover:bg-red-200 text-red-800 text-[10px] font-bold"
                          title="Empty waste"
                        >
                          Collect
                        </button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Legend Overlay */}
        <div className="absolute bottom-4 right-4 z-[400] glass-panel p-3.5 rounded-2xl border border-slate-800 shadow-xl text-xs space-y-2 max-w-xs">
          <span className="font-bold text-white block mb-1 text-[11px] uppercase tracking-wider">Map Legend</span>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            <span className="text-slate-300">Normal Fill (&lt;80%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            <span className="text-slate-300">Warning Fill (80% - 94%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping"></span>
            <span className="text-slate-300">Critical / Overflow (&ge;95%)</span>
          </div>
          {showTruckRoute && (
            <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
              <span className="w-4 h-0.5 bg-smart-400"></span>
              <span className="text-smart-300 text-[11px]">Optimal Truck Dispatch Route</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


