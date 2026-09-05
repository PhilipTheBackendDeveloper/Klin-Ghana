import React, { useEffect, useState } from 'react';
import {
  Users,
  ShieldCheck,
  Settings,
  CheckCircle2,
  Database,
  Radio,
  Navigation,
  Bell,
  FileText,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../../services/supabaseClient';
import { EmptyState } from '../common/EmptyState';
import { AddTeamMemberModal } from './AddTeamMemberModal';

interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

const badgeForRole = (role: string) =>
  role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : role === 'USER' ? 'bg-slate-100 text-slate-700' : 'bg-blue-100 text-blue-700';

const accessForRole = (role: string) => (role === 'ADMIN' ? 'Full access' : role === 'USER' ? 'No admin access' : 'Elevated access');

export const UsersRolesAndSettingsView: React.FC = () => {
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    push: true,
    email: true,
    sms: false,
    dailyReport: true,
    aiAssistant: true,
  });
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberSuccess, setAddMemberSuccess] = useState<string | null>(null);

  const toggleSetting = (key: string) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    setLoadingProfiles(true);
    supabase
      .from('profiles')
      .select('id, full_name, email, role, created_at')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setProfiles(data || []);
        setLoadingProfiles(false);
      });
  }, []);

  const integrations = [
    { name: 'Cloud Database', status: 'Connected', latency: '12ms', icon: Database, color: 'text-emerald-600' },
    { name: 'Wi-Fi Gateway', status: 'Active (130 nodes)', latency: '45ms', icon: Radio, color: 'text-blue-600' },
    { name: 'GPS Provider (NEO-6M)', status: 'Synchronized', latency: '8.3m acc', icon: Navigation, color: 'text-emerald-600' },
    { name: 'Push Service', status: 'Active', latency: '99.4%', icon: Bell, color: 'text-emerald-600' },
    { name: 'Audit Log', status: 'Logging', latency: '0 drops', icon: FileText, color: 'text-purple-600' },
    { name: 'Report Engine', status: 'Ready (jsPDF)', latency: 'Instant', icon: Sparkles, color: 'text-blue-600' },
  ];

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-['Outfit',sans-serif]">
            Users, Roles & System Settings
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Role-based access control (RBAC), incident notification escalations, and integration health.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <button
            type="button"
            onClick={() => setShowAddMember(true)}
            disabled={!isSupabaseConfigured()}
            title={isSupabaseConfigured() ? undefined : 'Switch to live mode to manage real accounts'}
            className="px-4 py-2 rounded-2xl bg-[#1D70F5] hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add Team Member
          </button>
          {addMemberSuccess && (
            <span className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-800 max-w-xs text-right">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>{addMemberSuccess}</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Grid: Users & Roles (Left) + System Controls (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Users & Roles Table (Figma 1:1) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base font-['Outfit',sans-serif]">
              Team Members & Permissions
            </h3>
            <span className="text-xs text-slate-400 font-mono">{profiles.length} Active Account{profiles.length === 1 ? '' : 's'}</span>
          </div>

          <div className="space-y-3">
            {!isSupabaseConfigured() ? (
              <EmptyState
                icon={Users}
                title="Team accounts live in Supabase"
                description="This list reads real accounts from the profiles table, which only exists in live mode. Switch to live mode to see who's registered."
              />
            ) : loadingProfiles ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading team accounts…</div>
            ) : profiles.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No team accounts yet"
                description="Run `npm run admin:create` locally to add the first admin account."
              />
            ) : profiles.map((profile) => (
              <div key={profile.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900 text-sm">{profile.full_name}</div>
                  <div className="text-slate-500">{profile.email}</div>
                </div>
                <div className="text-right space-y-1">
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${badgeForRole(profile.role)}`}>
                    {profile.role}
                  </span>
                  <div className="text-[11px] text-slate-400 font-medium">{accessForRole(profile.role)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 5 Cols: System Controls & Toggles (Figma 1:1) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-base font-['Outfit',sans-serif]">
            System Controls & Escalations
          </h3>

          <div className="space-y-3 text-xs">
            {[
              { id: 'push', label: 'Full-bin push notifications', desc: 'Instant alert when bin reaches 95%' },
              { id: 'email', label: 'Overflow email escalation', desc: 'Notify zonal manager after 15m' },
              { id: 'sms', label: 'Offline SMS escalation', desc: 'Alert technician on heartbeat loss' },
              { id: 'dailyReport', label: 'Daily automated report', desc: 'Generate 00:00 GMT audit summary' },
              { id: 'aiAssistant', label: 'AI educational assistant', desc: 'Citizen waste sorting guidance' },
            ].map((ctrl) => (
              <div key={ctrl.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">{ctrl.label}</div>
                  <div className="text-[10px] text-slate-500">{ctrl.desc}</div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSetting(ctrl.id)}
                  className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                    toggles[ctrl.id] ? 'bg-[#1D70F5]' : 'bg-slate-300'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    toggles[ctrl.id] ? 'translate-x-4' : 'translate-x-0'
                  }`}></div>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Integration Health Cards (Figma 1:1) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <h4 className="font-bold text-slate-900 text-base font-['Outfit',sans-serif]">
          Platform Integrations & Health
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {integrations.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-1.5">
                <Icon className={`w-5 h-5 mx-auto ${item.color}`} />
                <div className="text-xs font-bold text-slate-900 leading-tight">{item.name}</div>
                <div className="text-[10px] text-emerald-700 font-semibold">{item.status}</div>
                <div className="text-[9px] font-mono text-slate-400">{item.latency}</div>
              </div>
            );
          })}
        </div>
      </div>

      {showAddMember && (
        <AddTeamMemberModal
          onClose={() => setShowAddMember(false)}
          onCreated={(profile) => {
            setProfiles((prev) => [...prev, { ...profile, created_at: new Date().toISOString() }]);
            setShowAddMember(false);
            setAddMemberSuccess(`${profile.full_name} was added as ${profile.role === 'ADMIN' ? 'an admin' : 'a standard user'}.`);
            setTimeout(() => setAddMemberSuccess(null), 5000);
          }}
        />
      )}
    </div>
  );
};
