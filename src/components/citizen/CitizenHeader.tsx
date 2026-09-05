import React, { useState } from 'react';
import { Bot, LogOut, Menu, X } from 'lucide-react';
import { Logo } from '../common/Logo';
import { useSmartBin } from '../../context/SmartBinContext';

interface CitizenHeaderProps {
  currentRoute: string;
}

const navItems = [
  { route: '/user/bins', label: 'Nearby bins' },
  { route: '/user/report', label: 'Report issue' },
  { route: '/user/complaints', label: 'My complaints' },
];

/**
 * Shared header for every citizen-facing page. Previously only
 * UserReportView rendered a header at all — /user/bins, /user/bins/:code
 * and /user/complaints had no logo, nav, or way back to the rest of the
 * portal. This renders once at the App-level /user route wrapper instead.
 */
export const CitizenHeader: React.FC<CitizenHeaderProps> = ({ currentRoute }) => {
  const { bins, citizenBinId, setCitizenBinId } = useSmartBin();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isActive = (route: string) => currentRoute === route || (route === '/user/bins' && currentRoute.startsWith('/user/bins/'));

  // The Citizen Portal has no real login/session — but once a citizen has
  // entered or scanned a bin code, they're effectively "in" that bin's
  // context wherever they browse. This is the closest real equivalent to a
  // sign-out: forget the bin and return to the code gate.
  const activeBin = bins.find((bin) => bin.id === citizenBinId);
  const exitBin = () => {
    setCitizenBinId(null);
    setMobileOpen(false);
    window.location.hash = '/citizen';
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3.5 shadow-xs">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        <a href="#/user/report" className="flex items-center gap-1.5" aria-label="KlinGhana home">
          <Logo size="sm" />
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold">
          {navItems.map((item) => (
            <a
              key={item.route}
              href={`#${item.route}`}
              className={
                isActive(item.route)
                  ? 'text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900 transition-colors'
              }
            >
              {item.label}
            </a>
          ))}
          <a href="#/admin/ai" className="text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1">
            <Bot className="w-3.5 h-3.5 text-blue-600" />
            <span>AI Assistant</span>
          </a>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {activeBin && (
            <button
              type="button"
              onClick={exitBin}
              title={`Exit ${activeBin.code} and return to the code gate`}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit {activeBin.code}</span>
            </button>
          )}
          <a
            href="#/login"
            className="hidden sm:inline-flex px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Admin Portal
          </a>
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <nav className="md:hidden max-w-6xl mx-auto mt-3 pt-3 border-t border-slate-100 flex flex-col gap-1 text-sm font-semibold">
          {navItems.map((item) => (
            <a
              key={item.route}
              href={`#${item.route}`}
              onClick={() => setMobileOpen(false)}
              className={`px-3 py-2.5 rounded-xl ${isActive(item.route) ? 'text-emerald-700 font-bold bg-emerald-50' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {item.label}
            </a>
          ))}
          <a
            href="#/admin/ai"
            onClick={() => setMobileOpen(false)}
            className="px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <Bot className="w-3.5 h-3.5 text-blue-600" />
            <span>AI Assistant</span>
          </a>
          {activeBin && (
            <button
              type="button"
              onClick={exitBin}
              className="px-3 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 text-left"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit {activeBin.code}</span>
            </button>
          )}
          <a
            href="#/login"
            onClick={() => setMobileOpen(false)}
            className="px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 border-t border-slate-100 mt-1 pt-3"
          >
            Admin Portal
          </a>
        </nav>
      )}
    </header>
  );
};
