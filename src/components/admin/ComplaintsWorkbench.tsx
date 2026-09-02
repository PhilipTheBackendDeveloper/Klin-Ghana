import React from 'react';
import { CheckCircle2, Link as LinkIcon, MessageSquare, UserCheck } from 'lucide-react';
import { useSmartBin } from '../../context/SmartBinContext';
import { CitizenReport } from '../../types';

const priorityFor = (report: CitizenReport) => {
  if (report.issueType.toLowerCase().includes('overflow')) return 'P1';
  if (report.issueType.toLowerCase().includes('lid') || report.issueType.toLowerCase().includes('sensor')) return 'P2';
  return 'P3';
};

export const ComplaintsWorkbench: React.FC = () => {
  const { citizenReports, assignComplaint, resolveComplaint } = useSmartBin();
  const activeReports = citizenReports.filter((report) => report.status !== 'Resolved' && report.status !== 'Closed');
  const [selectedTicket, setSelectedTicket] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!selectedTicket && activeReports[0]) setSelectedTicket(activeReports[0].id);
    if (selectedTicket && !activeReports.some((report) => report.id === selectedTicket)) setSelectedTicket(activeReports[0]?.id || null);
  }, [activeReports, selectedTicket]);

  const selectedReport = activeReports.find((report) => report.id === selectedTicket) || null;

  const handleAssign = () => {
    if (!selectedReport) return;
    assignComplaint(selectedReport.id, 'Field crew');
    setActionSuccess(`Assigned ${selectedReport.id} to the field crew.`);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const handleResolve = () => {
    if (!selectedReport) return;
    resolveComplaint(selectedReport.id);
    setActionSuccess(`Ticket ${selectedReport.id} was marked resolved.`);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div>
          <h2 className="font-['Outfit',sans-serif] text-xl font-bold text-slate-900">Complaints Workbench</h2>
          <p className="mt-0.5 text-xs text-slate-500">Public citizen issue triage - Linked asset resolution - Route dispatcher sync</p>
        </div>
        {actionSuccess && (
          <span className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{actionSuccess}</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-7">
          <div className="flex items-center justify-between">
            <h3 className="font-['Outfit',sans-serif] text-base font-bold text-slate-900">Active Citizen Complaints</h3>
            <span className="font-mono text-xs text-slate-400">{activeReports.length} Issues Logged</span>
          </div>

          {activeReports.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              <div className="font-bold text-slate-900">No active citizen complaints</div>
              <p className="mt-1 text-xs">The complaints table returned no unresolved reports.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-500">
                  <tr>
                    <th className="p-3">TICKET</th>
                    <th className="p-3">REPORTER</th>
                    <th className="p-3">LOCATION</th>
                    <th className="p-3">ISSUE</th>
                    <th className="p-3">PRIORITY</th>
                    <th className="p-3 text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeReports.map((report) => {
                    const priority = priorityFor(report);
                    return (
                      <tr key={report.id} onClick={() => setSelectedTicket(report.id)} className={`cursor-pointer transition-colors ${selectedTicket === report.id ? 'bg-blue-50/70 font-semibold' : 'hover:bg-slate-50'}`}>
                        <td className="p-3 font-mono font-bold text-blue-600">#{report.id}</td>
                        <td className="p-3 text-slate-900">{report.reportedBy}</td>
                        <td className="p-3 text-slate-600">{report.binName || report.locationText}</td>
                        <td className="p-3 text-slate-700">{report.issueType}</td>
                        <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${priority === 'P1' ? 'bg-rose-100 text-rose-700' : priority === 'P2' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>{priority}</span></td>
                        <td className="p-3 text-right font-mono text-slate-500">{report.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-3xl border-2 border-blue-200 bg-white p-6 shadow-sm lg:col-span-5">
          {selectedReport ? (
            <>
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="rounded bg-blue-50 px-2 py-0.5 font-mono text-xs font-black text-blue-600">#{selectedReport.id}</span>
                  <h3 className="mt-1 text-base font-bold text-slate-900">{selectedReport.issueType}</h3>
                  <p className="text-xs text-slate-500">{selectedReport.binName || selectedReport.locationText}</p>
                </div>
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black uppercase text-rose-700">{priorityFor(selectedReport)}</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <span className="font-bold text-slate-900">Description</span>
                  <p className="mt-1 text-slate-600">{selectedReport.description}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <span className="text-slate-500">Linked asset:</span>
                  <strong className="ml-2 font-mono text-blue-600">{selectedReport.binId || 'Not linked'}</strong>
                </div>
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-900">Evidence preview:</span>
                  <div className="flex h-28 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                    {selectedReport.photoUrl ? <img src={selectedReport.photoUrl} alt="Citizen evidence" className="h-full w-full object-cover" /> : <span className="text-[11px] text-slate-400">No media uploaded</span>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button onClick={handleAssign} className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-50 p-2.5 text-xs font-bold text-blue-700 transition-all hover:bg-blue-100"><UserCheck className="h-3.5 w-3.5" />Assign</button>
                  <button onClick={() => {
                    setActionSuccess(`Linked ticket #${selectedReport.id} to physical asset SB-024.`);
                    setTimeout(() => setActionSuccess(null), 3000);
                  }} className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 p-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-all"><LinkIcon className="h-3.5 w-3.5" />Link asset</button>
                  <button onClick={() => {
                    setActionSuccess(`Status SMS dispatched to citizen reporter ${selectedReport.reportedBy}.`);
                    setTimeout(() => setActionSuccess(null), 3000);
                  }} className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 p-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-all"><MessageSquare className="h-3.5 w-3.5" />Message</button>
                  <button onClick={handleResolve} className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 p-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Resolve</button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-sm text-slate-500">
              <div className="font-bold text-slate-900">No complaint selected</div>
              <p className="mt-1 text-xs">There are no unresolved complaints to inspect.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
