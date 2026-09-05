import React, { useState } from 'react';
import { Upload, CheckCircle2, ArrowRight, Sparkles, MapPin } from 'lucide-react';
import { useSmartBin } from '../../context/SmartBinContext';

interface UserReportViewProps {
  onReportSuccess?: () => void;
}

const problems = ['Bin full', 'Overflow', 'Lid problem', 'Sensor issue', 'Other'];

export const UserReportView: React.FC<UserReportViewProps> = ({ onReportSuccess }) => {
  const { submitCitizenReport, bins, citizenBinId: scannedBinId } = useSmartBin();
  const [problemType, setProblemType] = useState('Overflow');
  // Pre-fills from whatever bin is active in context — e.g. a citizen who
  // scanned a bin's QR code and tapped "Report a problem" on that bin's
  // landing page shouldn't have to find and re-pick it from this dropdown.
  const [selectedBinId, setSelectedBinId] = useState(scannedBinId || '');
  const [locationText, setLocationText] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'Standard' | 'Urgent'>('Urgent');
  const [evidenceName, setEvidenceName] = useState<string | null>(null);
  const [generatedTicket, setGeneratedTicket] = useState<string | null>(null);

  const selectedBin = bins.find((bin) => bin.id === selectedBinId);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const ticketId = submitCitizenReport({
      problemType,
      locationText: selectedBin ? selectedBin.location.address : locationText,
      description,
      priority,
      evidenceUrl: evidenceName || undefined,
      reporterName: 'Citizen Reporter',
      binId: selectedBin?.id,
      binName: selectedBin?.name,
    });
    setGeneratedTicket(ticketId);
    window.setTimeout(() => onReportSuccess?.(), 1000);
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Title & Introduction */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Community Waste Action</span>
          </div>
          <h1 className="font-['Outfit',sans-serif] text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Report a Smart-Bin Problem
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-500">
            Tell us what failed. Live bin choices connect directly to Kumasi & Accra fleet dispatchers.
          </p>
        </div>

        {/* Success Banner if Ticket Created */}
        {generatedTicket && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-xs sm:text-sm font-semibold animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              Ticket <span className="font-mono font-bold">#{generatedTicket}</span> generated successfully! Redirecting to tracking...
            </div>
          </div>
        )}

        {/* Report Form Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-10 shadow-sm space-y-6 sm:space-y-8">
          {/* Section 1: Problem Type */}
          <div>
            <label className="block font-['Outfit',sans-serif] text-sm sm:text-base font-bold text-slate-900 mb-3">
              What went wrong? *
            </label>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {problems.map((problem) => (
                <button
                  key={problem}
                  type="button"
                  onClick={() => setProblemType(problem)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                    problemType === problem
                      ? 'bg-emerald-600 text-white shadow-xs border-emerald-600'
                      : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {problem}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Bin / Location Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                <span>Target Bin (Live Assets)</span>
                {selectedBinId && selectedBinId === scannedBinId && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700 border border-emerald-200">
                    Pre-filled from your scan
                  </span>
                )}
              </label>
              <select
                value={selectedBinId}
                onChange={(event) => setSelectedBinId(event.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
              >
                <option value="">{bins.length === 0 ? 'No live bins registered' : 'Select a live bin...'}</option>
                {bins.map((bin) => (
                  <option key={bin.id} value={bin.id}>
                    {bin.code} - {bin.name} ({bin.location.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Street / Landmark (If no bin selected)
              </label>
              <div className="relative flex items-center">
                <MapPin className="absolute left-3.5 w-4 h-4 text-slate-400" />
                <input
                  value={locationText}
                  onChange={(event) => setLocationText(event.target.value)}
                  placeholder="e.g. Ayeduase Gate, Kotei Road"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Description & Details *
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe what happened (e.g. lid is stuck open, waste overflow onto walkway, smoke detected)..."
              rows={4}
              required
              className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all resize-y"
            />
          </div>

          {/* Section 4: Priority & Photo Evidence */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Priority Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Urgency Level
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['Standard', 'Urgent'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setPriority(lvl)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                      priority === lvl
                        ? lvl === 'Urgent'
                          ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-2xs'
                          : 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Evidence Attachment */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Photo Evidence (Optional)
              </label>
              <button
                type="button"
                onClick={() => setEvidenceName(evidenceName ? null : 'evidence-photo.jpg')}
                className={`w-full h-11 px-3 rounded-xl border border-dashed flex items-center justify-center gap-2 text-xs font-semibold transition-all ${
                  evidenceName
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>{evidenceName ? 'Photo Attached (evidence-photo.jpg)' : 'Attach Photo / Snapshot'}</span>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-[11px] text-slate-400">
              Your ticket will be assigned to the Kumasi waste dispatch unit immediately.
            </p>
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Submit Ticket</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};
