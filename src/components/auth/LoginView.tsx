import React, { useState } from 'react';
import { isSupabaseConfigured, supabase } from '../../services/supabaseClient';
import { env } from '../../config/env';

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
    <div className="figma-login-stage">
      <main className="relative h-[1040px] w-[1440px] shrink-0 bg-white overflow-hidden" data-node-id="57:12" data-name="log in">
        <div className="absolute left-[-132px] top-[250px] h-[602px] w-[602px] rotate-[11.21deg]">
          <img
            alt="SmartBin illustration"
            src="/figma-assets/login-smartbin-illustration.jpeg"
            className="h-[512px] w-[512px] object-contain"
          />
        </div>

        <div className="absolute left-[578px] top-[97px] h-[61px] w-[260px]">
          <div className="absolute left-0 top-0 whitespace-pre text-[50px] font-extrabold leading-none text-[#1174e6] font-['Inter',sans-serif]">
            KlinGh    na
          </div>
          <div className="absolute left-[168px] top-[12px] flex h-[45px] w-[45px] items-center justify-center rounded-[8px] bg-[#1174e6] text-white text-[26px] font-black">
            K
          </div>
        </div>

        <form onSubmit={handleSubmit} className="absolute left-[538px] top-[206px] h-[470px] w-[356px]">
          <h1 className="absolute left-[72px] top-0 w-[220px] text-[28px] font-bold leading-[1.18] text-black">
            Admin access
          </h1>
          <p className="absolute left-[56px] top-[44px] w-[300px] text-[12px] font-medium leading-[1.18] text-black/50">
            Sign in to monitor fleet health and dispatch incidents.
          </p>

          <label className="absolute left-0 top-[113px] text-[10px] font-bold leading-[1.18] text-[#587187]">
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="absolute left-0 top-[132px] h-[53px] w-[356px] rounded-[15px] border border-[#81a1be] bg-[#ececec] px-4 text-[13px] text-[#0b1f1a] outline-none focus:border-[#3b82f6]"
            required
            autoComplete="email"
          />

          <label className="absolute left-0 top-[194px] text-[10px] font-bold leading-[1.18] text-[#587187]">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="absolute left-0 top-[213px] h-[53px] w-[356px] rounded-[15px] border border-[#81a1be] bg-[#ececec] px-4 text-[13px] text-[#0b1f1a] outline-none focus:border-[#3b82f6]"
            required={isSupabaseConfigured()}
            autoComplete="current-password"
          />

          <label className="absolute left-0 top-[275px] text-[10px] font-bold leading-[1.18] text-[#587187]">
            Workspace
          </label>
          <input
            type="text"
            value={workspace}
            onChange={(e) => setWorkspace(e.target.value)}
            className="absolute left-0 top-[299px] h-[53px] w-[356px] rounded-[15px] border border-[#81a1be] bg-[#ececec] px-4 text-[13px] text-[#0b1f1a] outline-none focus:border-[#3b82f6]"
            required
          />

          {error && (
            <p data-testid="login-error" className="absolute left-0 top-[365px] w-[356px] text-center text-[11px] font-bold text-[#ff4d74]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="figma-button-hit absolute left-0 top-[402px] h-[53px] w-[356px] rounded-[10px] bg-[#3b82f6] text-center text-[12px] font-bold leading-[53px] text-[#e5f6ff] disabled:opacity-70"
          >
            {loading ? 'Checking access...' : 'Enter command center'}
          </button>
        </form>
      </main>
    </div>
  );
};
