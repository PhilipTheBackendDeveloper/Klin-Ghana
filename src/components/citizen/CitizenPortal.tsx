import React, { useState } from 'react';
import { 
  MapPin, 
  Trash2, 
  Sparkles, 
  Camera, 
  Send, 
  Award, 
  CheckCircle2, 
  AlertTriangle,
  DoorOpen,
  ArrowUpRight
} from 'lucide-react';
import { useSmartBin } from '../../context/SmartBinContext';

export const CitizenPortal: React.FC = () => {
  const { bins, triggerProximitySensor, submitCitizenReport, citizenReports } = useSmartBin();

  const [issueType, setIssueType] = useState<'Overflowing' | 'Damaged Lid' | 'Foul Odor' | 'Sensor Issue' | 'Vandalism'>('Overflowing');
  const [selectedBinId, setSelectedBinId] = useState(bins[0]?.id || '');
  const [description, setDescription] = useState('');
  const [reporterName, setReporterName] = useState('Kwame Citizen');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Available bins that have capacity (<80%)
  const availableBins = bins
    .filter(b => b.currentFillLevel < 80)
    .sort((a, b) => a.currentFillLevel - b.currentFillLevel);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetBin = bins.find(b => b.id === selectedBinId);

    submitCitizenReport({
      binId: selectedBinId,
      binName: targetBin?.name || 'General Municipal Area',
      locationText: targetBin?.location.address || 'Accra Central',
      issueType,
      description: description || `Reported ${issueType} at ${targetBin?.name}`,
      reportedBy: reporterName
    });

    setSubmittedSuccess(true);
    setDescription('');
    setTimeout(() => setSubmittedSuccess(false), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-brand-500/30 bg-gradient-to-br from-brand-500/10 via-slate-900 to-slate-950 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-brand-400" />
            <h2 className="text-xl font-extrabold text-white">Clean Ghana Citizen Action Portal</h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Locate nearest available smart bins, deposit waste touch-free, and report community overflow incidents.
          </p>
        </div>

        {/* Citizen Eco Score */}
        <div className="flex items-center gap-3 bg-slate-900/80 p-3 rounded-2xl border border-brand-500/30">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400">Your Eco-Score</span>
            <div className="text-lg font-black text-brand-400">450 Points</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-500 text-slate-950 flex items-center justify-center font-extrabold text-sm shadow-lg shadow-brand-500/20">
            ★
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Nearest Available Bins */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-base">Nearest Available SmartBins with Capacity</h3>
              <p className="text-xs text-slate-400">Touchless automatic lid opening supported</p>
            </div>
            <span className="text-xs font-bold text-emerald-400 font-mono">
              {availableBins.length} Bins Available
            </span>
          </div>

          <div className="space-y-3">
            {availableBins.map((bin) => (
              <div
                key={bin.id}
                className="glass-panel p-4 rounded-2xl border border-slate-800 hover:border-brand-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-brand-400 border border-brand-500/30">
                      {bin.code}
                    </span>
                    <span className="text-xs font-bold text-white">{bin.name}</span>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-brand-400 shrink-0" />
                    <span>{bin.location.address}, {bin.location.city}</span>
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-300 pt-1">
                    <span>Fill: <strong className="text-emerald-400">{bin.currentFillLevel}%</strong></span>
                    <span>•</span>
                    <span className="capitalize">{bin.category} waste</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => triggerProximitySensor(bin.id)}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-brand-500/20"
                  >
                    <DoorOpen className="w-4 h-4" />
                    <span>Deposit (Open Lid)</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 5 Cols: Citizen Overflow / Issue Report Form */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="font-bold text-white text-base">Report Overflow or Bin Issue</h3>
                <p className="text-xs text-slate-400">Directly alerts municipal sanitation dispatchers</p>
              </div>
            </div>

            {submittedSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-200 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Thank you! Your report was submitted. (+50 Eco-Points earned)</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Select SmartBin Location</label>
                <select
                  value={selectedBinId}
                  onChange={(e) => setSelectedBinId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-brand-500"
                >
                  {bins.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.code} — {b.name} ({b.location.address})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Issue Category</label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-brand-500"
                >
                  <option value="Overflowing">Trash Overflowing onto Street</option>
                  <option value="Damaged Lid">Broken / Stuck Automatic Lid</option>
                  <option value="Foul Odor">Foul Odor / Pest Infestation</option>
                  <option value="Sensor Issue">Ultrasonic Sensor Malfunction</option>
                  <option value="Vandalism">Physical Damage / Vandalism</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Your Name</label>
                <input
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="Your full name or phone"
                  className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Additional Details (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what you observed..."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-brand-500"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
              >
                <Send className="w-4 h-4" />
                <span>Submit Incident Report</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
