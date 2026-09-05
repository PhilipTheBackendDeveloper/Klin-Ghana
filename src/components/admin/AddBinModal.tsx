import React, { useState } from 'react';
import { X, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { WasteCategory } from '../../types';

interface AddBinModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const CATEGORIES: { value: WasteCategory; label: string }[] = [
  { value: 'general', label: 'General waste' },
  { value: 'plastic', label: 'Plastic' },
  { value: 'organic', label: 'Organic' },
  { value: 'paper', label: 'Paper' },
  { value: 'electronic', label: 'E-waste' },
  { value: 'glass', label: 'Glass' },
];

/**
 * Registers a new bin as an asset (public.bins row) — code, name, location,
 * category, capacity. Pairing the physical hardware device that will report
 * telemetry for it is a separate, still-manual step (DEVICE_CREDENTIALS_JSON
 * + firmware config) and is not part of this form.
 */
export const AddBinModal: React.FC<AddBinModalProps> = ({ onClose, onCreated }) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<WasteCategory>('general');
  const [capacityLiters, setCapacityLiters] = useState('240');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zone, setZone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const { error: insertError } = await supabase.from('bins').insert({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        category,
        capacity_liters: Number(capacityLiters) || 240,
        // Real street address comes from the device's own GPS fix once
        // paired and reporting — this is only a rough placeholder until
        // then, never a guessed default.
        address: address.trim() || 'Awaiting GPS lock',
        city: city.trim(),
        zone: zone.trim(),
      });

      if (insertError) {
        const duplicate = /duplicate key|already exists/i.test(insertError.message);
        throw new Error(duplicate ? `Bin code "${code.trim().toUpperCase()}" is already registered.` : insertError.message);
      }

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not register this bin.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Trash2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="font-['Outfit',sans-serif] text-base font-bold text-slate-900">Add bin</h3>
              <p className="text-[11px] text-slate-500">Registers a new bin as an asset.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Bin code</label>
              <input
                type="text" required value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. SB-031"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-bold uppercase text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Category</label>
              <select
                value={category} onChange={(e) => setCategory(e.target.value as WasteCategory)}
                className="w-full h-[42px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              >
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Name</label>
            <input
              type="text" required value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ayigya Market North"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <span>Address</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase text-slate-500">Optional — set by GPS</span>
            </label>
            <input
              type="text" value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Leave blank until the device reports its GPS fix"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
            <p className="mt-1 text-[10px] text-slate-400">
              The bin's real street address comes from its ultrasonic + GPS sensor once paired — this is only a rough note for before then.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">City</label>
              <input
                type="text" required value={city} onChange={(e) => setCity(e.target.value)}
                placeholder="Kumasi"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Zone</label>
              <input
                type="text" required value={zone} onChange={(e) => setZone(e.target.value)}
                placeholder="Kumasi-Central"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Capacity (L)</label>
              <input
                type="number" min={1} value={capacityLiters}
                onChange={(e) => setCapacityLiters(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </div>

        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">
          This registers the bin only. It'll show up in the register with no telemetry ("Awaiting GPS lock") until a physical
          device is paired using its device key — see <code className="font-mono">npm run device:key</code>.
        </p>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100">
            Cancel
          </button>
          <button
            type="submit" disabled={submitting}
            className="rounded-xl bg-[#1D70F5] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-600 disabled:opacity-60"
          >
            {submitting ? 'Registering…' : 'Register bin'}
          </button>
        </div>
      </form>
    </div>
  );
};
