import React, { useState } from 'react';
import { isSupabaseConfigured, supabase } from '../../services/supabaseClient';
import { env } from '../../config/env';
import { ShieldCheck, Lock, Mail, Building2, ArrowRight } from 'lucide-react';

interface LoginViewProps {
  onLogin: (role: 'admin' | 'citizen') => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workspace, setWorkspace] = useState('KlinGhana');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!isSupabaseConfigured()) {
        if (env.VITE_DATA_MODE === 'live') {
          throw new Error('Supabase authentication is required in LIVE mode. Real credentials must be configured.');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
      onLogin('admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-10 font-['Plus_Jakarta_Sans',sans-serif]">
      <main className="w-full max-w-5xl bg-white rounded-3xl sm:rounded-[32px] border border-slate-200/80 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        {/* Left Branding / Illustration Panel (Hidden on small mobile if needed, or compact) */}
        <div className="lg:col-span-6 bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 p-8 sm:p-12 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle background circles */}
          <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -left-10 -top-10 w-60 h-60 rounded-full bg-blue-400/20 blur-xl pointer-events-none" />

          {/* Top Brand */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold text-white backdrop-blur-xs mb-6">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Operations Portal</span>
            </div>
            <h1 className="font-['Outfit',sans-serif] text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              KlinGhana SmartBin
            </h1>
            <p className="mt-2 text-sm text-blue-100 max-w-sm">
              IoT-enabled fleet monitoring, automated dispatch & telemetry operations across Ghana.
            </p>
          </div>

          {/* Center Illustration */}
          <div className="relative z-10 my-8 flex items-center justify-center">
            <img
              alt="SmartBin illustration"
              src="/figma-assets/login-smartbin-illustration.jpeg"
              className="w-48 sm:w-64 h-auto object-contain drop-shadow-2xl rounded-2xl transform -rotate-3 hover:rotate-0 transition-transform duration-500"
            />
          </div>

          {/* Bottom Info */}
          <div className="relative z-10 text-xs text-blue-200/80 flex items-center justify-between border-t border-white/10 pt-4">
            <span>v1.0.0 &bull; Kumasi & Accra Mesh</span>
            <a href="#/user/report" className="text-white font-bold hover:underline">Citizen Portal &rarr;</a>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="lg:col-span-6 p-8 sm:p-12 flex flex-col justify-center">
          <div className="w-full max-w-md mx-auto">
            {/* Form Header */}
            <div className="mb-8">
              <div className="lg:hidden text-2xl font-black text-[#1174e6] mb-2 font-['Outfit',sans-serif]">
                KlinGh<span className="inline-block px-1 rounded bg-[#1174e6] text-white text-xs">K</span>na
              </div>
              <h2 className="font-['Outfit',sans-serif] text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Admin access
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                Sign in to monitor fleet health and dispatch incidents.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email address
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@klinghana.org"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                    required={isSupabaseConfigured()}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {/* Workspace field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Workspace
                </label>
                <div className="relative flex items-center">
                  <Building2 className="absolute left-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={workspace}
                    onChange={(e) => setWorkspace(e.target.value)}
                    placeholder="KlinGhana"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div data-testid="login-error" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 mt-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
              >
                <span>{loading ? 'Checking access...' : 'Enter command center'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
              Citizen looking to report waste?{' '}
              <a href="#/user/report" className="text-blue-600 font-bold hover:underline">
                Open Citizen Portal
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
