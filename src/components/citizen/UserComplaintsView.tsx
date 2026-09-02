import React from 'react';
import { MapPin, MessageSquare, AlertCircle, ArrowRight } from 'lucide-react';
import { useSmartBin } from '../../context/SmartBinContext';

export const UserComplaintsView: React.FC = () => {
  const { citizenReports, setActiveView } = useSmartBin();

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-['Outfit',sans-serif]">
            Complaints Workbench
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track municipal resolution updates, technician assignment, and SLA progress for reported bins.
          </p>
        </div>
        <button
          onClick={() => setActiveView('report')}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5"
        >
          <span>Report Issue</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {citizenReports.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-slate-200/80 shadow-sm text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 font-['Outfit',sans-serif]">
            No complaints
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You have not submitted any bin incident reports yet. When you report an overflowing or damaged bin, your live ticket timeline will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {citizenReports.map((report) => {
            const isResolved = report.status === 'Resolved';
            const isAssigned = report.status === 'Assigned';

            const timelineSteps = [
              { title: 'Received', time: new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), status: 'completed', dotColor: 'bg-emerald-500' },
              { title: 'Assigned', time: isAssigned || isResolved ? 'Assigned' : 'Pending', status: isAssigned || isResolved ? 'completed' : 'pending', dotColor: isAssigned || isResolved ? 'bg-emerald-500' : 'bg-slate-300' },
              { title: 'In progress', time: isAssigned ? 'Active' : isResolved ? 'Completed' : 'Pending', status: isAssigned ? 'active' : isResolved ? 'completed' : 'pending', dotColor: isAssigned ? 'bg-blue-600' : isResolved ? 'bg-emerald-500' : 'bg-slate-300' },
              { title: 'Resolved', time: isResolved ? 'Resolved' : 'In SLA window', status: isResolved ? 'completed' : 'pending', dotColor: isResolved ? 'bg-emerald-500' : 'bg-slate-300' },
            ];

            return (
              <div key={report.id} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Ticket #{report.id}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mt-1 font-['Outfit',sans-serif]">
                      {report.issueType} &middot; {report.binName || 'SmartBin Asset'}
                    </h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-500" />
                      <span>{report.locationText} &middot; {new Date(report.timestamp).toLocaleDateString()}</span>
                    </p>
                    {report.description && (
                      <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        {report.description}
                      </p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase ${
                    isResolved ? 'bg-emerald-100 text-emerald-700' : isAssigned ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {report.status}
                  </span>
                </div>

                <div className="space-y-2">
                  {timelineSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${step.dotColor} ${step.status === 'active' ? 'ring-4 ring-blue-100 animate-pulse' : ''}`} />
                        <span className={`font-bold ${step.status === 'active' ? 'text-blue-700' : 'text-slate-900'}`}>
                          {step.title}
                        </span>
                      </div>
                      <span className="font-mono text-slate-500 font-medium">{step.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
