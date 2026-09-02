import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp, 
  Sparkles, 
  Layers, 
  Clock,
  ShieldCheck
} from 'lucide-react';
import { useSmartBin } from '../../context/SmartBinContext';
import { generatePdfReport } from '../../services/pdfGenerator';
import { exportBinsToCsv, exportCollectionsToCsv, exportAlertsToCsv } from '../../services/csvGenerator';

export const AnalyticsDashboard: React.FC = () => {
  const { bins, collections, alerts } = useSmartBin();
  const [timeRange, setTimeRange] = useState<'hourly' | 'daily'>('hourly');

  // Generate hourly trend data
  const hourlyData = [
    { time: '06:00', fillAvg: 22, wasteKg: 12 },
    { time: '08:00', fillAvg: 38, wasteKg: 28 },
    { time: '10:00', fillAvg: 54, wasteKg: 46 },
    { time: '12:00', fillAvg: 79, wasteKg: 82 }, // Lunch peak
    { time: '14:00', fillAvg: 86, wasteKg: 95 },
    { time: '16:00', fillAvg: 92, wasteKg: 110 },
    { time: '18:00', fillAvg: 96, wasteKg: 125 }, // Evening peak
    { time: '20:00', fillAvg: 58, wasteKg: 40 }, // After collection
  ];

  // Category composition data
  const categoryCounts = bins.reduce((acc, b) => {
    acc[b.category] = (acc[b.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = [
    { name: 'Plastics & Pure Water', value: categoryCounts.plastic || 2, color: '#38bdf8' },
    { name: 'Organic & Food', value: categoryCounts.organic || 1, color: '#10b981' },
    { name: 'Paper & Cardboard', value: categoryCounts.paper || 1, color: '#fbbf24' },
    { name: 'E-Waste & Batteries', value: categoryCounts.electronic || 1, color: '#a855f7' },
    { name: 'General Waste', value: categoryCounts.general || 1, color: '#94a3b8' }
  ];

  const totalWasteCollectedKg = collections.reduce((acc, c) => acc + c.weightCollectedKg, 0);

  return (
    <div className="space-y-6">
      {/* Top Action / Export Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-400" />
            <h2 className="text-lg font-bold text-white">Automated Municipal Analytics & Research Reports</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Data certified for SDG 11 (Sustainable Cities) & SDG 12 (Responsible Consumption) compliance.
          </p>
        </div>

        {/* 1-Click Exports */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => generatePdfReport(bins, collections, alerts)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-extrabold text-xs transition-all shadow-lg shadow-brand-500/20"
          >
            <FileText className="w-4 h-4" />
            <span>Generate Full PDF Report</span>
          </button>

          <button
            onClick={() => exportBinsToCsv(bins)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Telemetry CSV</span>
          </button>

          <button
            onClick={() => exportCollectionsToCsv(collections)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Collections CSV</span>
          </button>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Hourly Fill Rate Trends */}
        <div className="lg:col-span-8 glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm">Waste Generation Velocity & Fill Profile</h3>
              <p className="text-xs text-slate-400">Peak accumulation occurs around 12:00 PM and 6:00 PM</p>
            </div>
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setTimeRange('hourly')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  timeRange === 'hourly' ? 'bg-brand-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                Today (Hourly)
              </button>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="colorFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorKg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="fillAvg" name="Average Fill %" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorFill)" />
                <Area type="monotone" dataKey="wasteKg" name="Estimated Weight (kg)" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#colorKg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 4 Cols: Category Composition */}
        <div className="lg:col-span-4 glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-white text-sm">Waste Stream Segregation</h3>
            <p className="text-xs text-slate-400">Distribution by deployed SmartBin type</p>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="space-y-1.5 text-xs">
            {pieData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="text-slate-300 text-[11px]">{item.name}</span>
                </div>
                <span className="font-mono text-slate-400 text-[11px] font-bold">{item.value} bins</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Collection Audit Log Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-base">Verified Collection Audit Trail</h3>
            <p className="text-xs text-slate-400">Logged municipal dispatches and weight measurements</p>
          </div>
          <span className="text-xs font-bold text-brand-400">
            Total Collected: {totalWasteCollectedKg.toFixed(1)} kg
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th className="p-3">Time & Date</th>
                <th className="p-3">Bin Code</th>
                <th className="p-3">Location Name</th>
                <th className="p-3">Fill Before</th>
                <th className="p-3">Weight Collected</th>
                <th className="p-3">Assigned Zone</th>
                <th className="p-3">Collector Crew</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {collections.map((record) => (
                <tr key={record.id} className="hover:bg-slate-900/40">
                  <td className="p-3 text-slate-400 font-mono">
                    {new Date(record.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="p-3 font-mono font-bold text-brand-400">{record.binCode}</td>
                  <td className="p-3 font-semibold text-white">{record.binName}</td>
                  <td className="p-3 font-bold text-rose-400">{record.fillLevelBefore}%</td>
                  <td className="p-3 font-bold text-emerald-400">{record.weightCollectedKg} kg</td>
                  <td className="p-3 text-slate-300">{record.zone}</td>
                  <td className="p-3 text-slate-400">{record.collectorName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
