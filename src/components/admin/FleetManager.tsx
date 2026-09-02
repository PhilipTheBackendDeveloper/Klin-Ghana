import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Settings2, 
  MapPin, 
  Battery, 
  Wifi, 
  DoorOpen, 
  DoorClosed, 
  Search, 
  X,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useSmartBin } from '../../context/SmartBinContext';
import { SmartBin, WasteCategory } from '../../types';

export const FleetManager: React.FC = () => {
  const { bins, addBin, deleteBin, collectBin, toggleLid } = useSmartBin();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New bin form state
  const [name, setName] = useState('');
  const [code, setCode] = useState(`KB-ACC-00${bins.length + 1}`);
  const [category, setCategory] = useState<WasteCategory>('plastic');
  const [capacityLiters, setCapacityLiters] = useState(120);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Accra');
  const [lat, setLat] = useState('5.6037');
  const [lng, setLng] = useState('-0.1870');
  const [assignedZone, setAssignedZone] = useState('Urban Commercial');

  const filteredBins = bins.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.location.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddBin = (e: React.FormEvent) => {
    e.preventDefault();
    addBin({
      name,
      code,
      category,
      capacityLiters,
      location: {
        lat: parseFloat(lat) || 5.6037,
        lng: parseFloat(lng) || -0.1870,
        address,
        city
      },
      status: 'normal',
      currentFillLevel: 0,
      lidState: 'CLOSED',
      lidAutoCloseSeconds: 5,
      proximityTriggered: false,
      batteryLevel: 100,
      wifiConnected: true,
      wifiSignal: -50,
      temperature: 26.0,
      weightKg: 2.0,
      firmwareVersion: 'v2.4.1-ESP32',
      lastCollectedAt: new Date().toISOString(),
      assignedZone
    });

    setShowAddModal(false);
    setName('');
    setAddress('');
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, code, or address..."
            className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-400 text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Add Bin Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-extrabold text-xs transition-all shadow-lg shadow-brand-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Provision New SmartBin</span>
        </button>
      </div>

      {/* Fleet Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th className="p-4">Code</th>
                <th className="p-4">Bin Name & Location</th>
                <th className="p-4">Category</th>
                <th className="p-4">Fill Level</th>
                <th className="p-4">Lid State</th>
                <th className="p-4">Battery</th>
                <th className="p-4">Zone</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredBins.map((bin) => (
                <tr key={bin.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-4 font-mono font-bold text-brand-400">{bin.code}</td>
                  <td className="p-4">
                    <div className="font-bold text-white text-sm">{bin.name}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-brand-400" />
                      <span>{bin.location.address}, {bin.location.city}</span>
                    </div>
                  </td>
                  <td className="p-4 uppercase font-bold text-[10px] text-slate-300">
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
                      {bin.category}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${bin.currentFillLevel >= 80 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {bin.currentFillLevel}%
                      </span>
                      <div className="w-16 bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${bin.currentFillLevel >= 80 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          style={{ width: `${bin.currentFillLevel}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleLid(bin.id)}
                      className={`px-2.5 py-1 rounded-lg border font-semibold text-[11px] flex items-center gap-1 ${
                        bin.lidState === 'OPEN'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {bin.lidState === 'OPEN' ? <DoorOpen className="w-3 h-3" /> : <DoorClosed className="w-3 h-3" />}
                      <span>{bin.lidState}</span>
                    </button>
                  </td>
                  <td className="p-4 font-medium text-slate-300">{bin.batteryLevel}%</td>
                  <td className="p-4 text-slate-300">{bin.assignedZone}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => collectBin(bin.id)}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-emerald-600/30 text-slate-300 hover:text-emerald-300 transition-colors"
                        title="Empty & Collect"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteBin(bin.id)}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-rose-600/30 text-slate-300 hover:text-rose-300 transition-colors"
                        title="Delete Bin"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add New SmartBin */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Provision New SmartBin</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddBin} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Bin Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Osu Mall Entrance"
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2.5 focus:border-brand-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Bin Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2.5 focus:border-brand-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Waste Stream Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as WasteCategory)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2.5 focus:border-brand-500"
                  >
                    <option value="plastic">Plastics & Pure Water</option>
                    <option value="organic">Organic & Food</option>
                    <option value="paper">Paper & Cardboard</option>
                    <option value="electronic">E-Waste & Batteries</option>
                    <option value="general">General Waste</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Capacity (Liters)</label>
                  <input
                    type="number"
                    value={capacityLiters}
                    onChange={(e) => setCapacityLiters(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2.5 focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Street Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Oxford Street, Osu"
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2.5 focus:border-brand-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Latitude</label>
                  <input
                    type="text"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2.5 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Longitude</label>
                  <input
                    type="text"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2.5 focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-extrabold shadow-lg shadow-brand-500/20"
                >
                  Save & Provision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
