import React, { useState } from 'react';
import { ArrowRight, KeyRound, MapPinned, FileEdit } from 'lucide-react';
import { useSmartBin } from '../../context/SmartBinContext';

interface CitizenGateViewProps {
  onAccessBin: (code: string) => void;
  onBrowseBins: () => void;
  onGeneralReport: () => void;
}

/**
 * The real front door of the Citizen Portal. Previously "Open Citizen
 * Portal" landed straight in a generic report form with no bin identified —
 * for a bin-code-based system, code entry should come first. Scanning a
 * bin's QR code (#/bin/:code) already supplies the code and skips this
 * screen entirely; this is for citizens arriving without one.
 */
export const CitizenGateView: React.FC<CitizenGateViewProps> = ({ onAccessBin, onBrowseBins, onGeneralReport }) => {
  const { bins } = useSmartBin();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Enter the code printed on the bin.');
      return;
    }
    const match = bins.find((bin) => bin.code.toUpperCase() === trimmed.toUpperCase());
    if (!match) {
      setError(`We couldn't find bin "${trimmed}". Check the sticker, or browse nearby bins below.`);
      return;
    }
    setError(null);
    onAccessBin(match.code);
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-md flex-col items-center justify-center px-4 py-10">
      <div className="w-full rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <KeyRound className="h-5 w-5" />
        </div>
        <h1 className="mt-4 font-['Outfit',sans-serif] text-2xl font-black text-slate-900">Access your SmartBin</h1>
        <p className="mt-1.5 text-xs text-slate-500">
          Enter the code printed on the bin's sticker to check its status and report a problem.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 text-left">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Bin code</label>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(event) => { setCode(event.target.value); setError(null); }}
              placeholder="e.g. XX-000"
              autoFocus
              className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold uppercase tracking-wide text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
            />
            <button
              type="submit"
              className="shrink-0 flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition-colors hover:bg-slate-800"
            >
              Go
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          {error && <p className="mt-2 text-[11px] font-semibold text-rose-600">{error}</p>}
        </form>

        <div className="mt-6 space-y-2 border-t border-slate-100 pt-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Don't have a code?</p>
          <button
            type="button"
            onClick={onBrowseBins}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <MapPinned className="h-3.5 w-3.5 text-blue-600" />
            Browse nearby bins
          </button>
          <button
            type="button"
            onClick={onGeneralReport}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <FileEdit className="h-3.5 w-3.5 text-blue-600" />
            File a general report (no bin)
          </button>
        </div>
      </div>
    </main>
  );
};
