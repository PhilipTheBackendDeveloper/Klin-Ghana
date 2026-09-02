import React, { useState, useMemo } from 'react';
import { Bell, LogOut, Menu, Moon, Search, Sun, Trash2, AlertTriangle, FileText, X } from 'lucide-react';
import { useSmartBin } from '../../context/SmartBinContext';

interface FigmaTopbarProps {
  onLogout: () => void;
  onSearch?: (query: string) => void;
  onToggleSidebar?: () => void;
}

export const FigmaTopbar: React.FC<FigmaTopbarProps> = ({ onLogout, onSearch, onToggleSidebar }) => {
  const { alerts, bins, citizenReports, setSelectedBinId } = useSmartBin();
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const unreadAlerts = alerts.filter((alert) => !alert.read).length;

  const applyTheme = (next: 'light' | 'dark') => {
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;

    const matchedBins = bins.filter(
      (b) => b.code.toLowerCase().includes(q) || b.name.toLowerCase().includes(q) || b.location.address.toLowerCase().includes(q)
    );
    const matchedAlerts = alerts.filter(
      (a) => a.binCode.toLowerCase().includes(q) || a.message.toLowerCase().includes(q) || a.type.toLowerCase().includes(q)
    );
    const matchedReports = citizenReports.filter(
      (r) => String(r.id).toLowerCase().includes(q) || r.issueType.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
    );

    return { bins: matchedBins, alerts: matchedAlerts, reports: matchedReports };
  }, [query, bins, alerts, citizenReports]);

  const navigateToHash = (hash: string) => {
    window.location.hash = hash;
    setSearchFocused(false);
    setQuery('');
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3 shadow-xs">
      <div className="flex items-center justify-between gap-2 sm:gap-4 max-w-7xl mx-auto">
        {/* Left: Mobile Menu Trigger + Logo (Mobile) + Global Search */}
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Mobile KlinGhana Brand */}
          <span className="lg:hidden font-bold text-sm tracking-tight text-[#1174e6]">
            KlinGh<span className="inline-block px-1 py-0.5 rounded bg-[#1174e6] text-white text-[10px]">K</span>na
          </span>

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <div className="flex items-center rounded-2xl bg-slate-100/90 border border-slate-200/60 px-3 py-1.5 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <Search className="w-4 h-4 text-slate-400 shrink-0" strokeWidth={1.8} />
              <input
                value={query}
                onFocus={() => setSearchFocused(true)}
                onChange={(event) => {
                  setQuery(event.target.value);
                  onSearch?.(event.target.value);
                }}
                placeholder="Search bins, alerts, tickets..."
                className="w-full bg-transparent px-2.5 text-xs text-slate-900 outline-none placeholder:text-slate-400"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Search Dropdown */}
            {searchFocused && searchResults && (
              <div className="absolute left-0 top-full mt-2 w-full max-h-[340px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-xl z-50 text-xs">
                {searchResults.bins.length === 0 && searchResults.alerts.length === 0 && searchResults.reports.length === 0 ? (
                  <div className="p-3 text-center text-slate-400">No matching assets, alerts, or tickets found.</div>
                ) : (
                  <div className="space-y-3">
                    {searchResults.bins.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold uppercase text-slate-400 px-2 mb-1">SmartBins ({searchResults.bins.length})</div>
                        {searchResults.bins.map((bin) => (
                          <button
                            key={bin.id}
                            type="button"
                            onClick={() => {
                              setSelectedBinId(bin.id);
                              navigateToHash(`/admin/bins/${bin.code}`);
                            }}
                            className="w-full text-left p-2 rounded-lg hover:bg-slate-50 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Trash2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="font-bold text-slate-800">{bin.code}</span>
                              <span className="text-slate-500 truncate">{bin.name}</span>
                            </div>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 shrink-0">{bin.currentFillLevel}%</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchResults.alerts.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold uppercase text-slate-400 px-2 mb-1">Alerts ({searchResults.alerts.length})</div>
                        {searchResults.alerts.map((alt) => (
                          <button
                            key={alt.id}
                            type="button"
                            onClick={() => navigateToHash('/admin/alerts')}
                            className="w-full text-left p-2 rounded-lg hover:bg-slate-50 flex items-center gap-2"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span className="text-slate-700 truncate">{alt.message}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchResults.reports.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold uppercase text-slate-400 px-2 mb-1">Complaints ({searchResults.reports.length})</div>
                        {searchResults.reports.map((rep) => (
                          <button
                            key={rep.id}
                            type="button"
                            onClick={() => navigateToHash('/admin/complaints')}
                            className="w-full text-left p-2 rounded-lg hover:bg-slate-50 flex items-center gap-2"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="font-bold">#{rep.id}</span>
                            <span className="text-slate-600 truncate">{rep.issueType} - {rep.description}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Theme Toggle, Notifications, Profile, Logout */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Theme Toggle */}
          <div className="hidden sm:flex items-center rounded-full bg-slate-100 p-1 border border-slate-200/60">
            <button
              type="button"
              aria-label="Light mode"
              onClick={() => applyTheme('light')}
              className={`p-1.5 rounded-full transition-all ${theme === 'light' ? 'bg-white shadow-xs text-amber-500' : 'text-slate-400 hover:text-slate-700'}`}
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              aria-label="Dark mode"
              onClick={() => applyTheme('dark')}
              className={`p-1.5 rounded-full transition-all ${theme === 'dark' ? 'bg-white shadow-xs text-blue-500' : 'text-slate-400 hover:text-slate-700'}`}
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => setNotificationsOpen((open) => !open)}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              {unreadAlerts > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white shadow-xs">
                  {unreadAlerts}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl z-50">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                  <span className="font-bold text-xs text-slate-900">Notifications</span>
                  <span className="text-[10px] text-slate-400 font-mono">{unreadAlerts} unread</span>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {alerts.slice(0, 5).map((a) => (
                    <div key={a.id} className="p-2 rounded-lg bg-slate-50 text-xs flex flex-col gap-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{a.binCode}</span>
                        <span className="text-[9px] text-slate-400">{new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <span className="text-slate-600 text-[11px]">{a.message}</span>
                    </div>
                  ))}
                  {alerts.length === 0 && (
                    <div className="p-3 text-center text-xs text-slate-400">No active alerts.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          {/* Profile Badge */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((open) => !open)}
              className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                AM
              </div>
              <div className="hidden md:block">
                <div className="text-xs font-bold text-slate-900 leading-tight">Ama Mensah</div>
                <div className="text-[10px] text-slate-500">Admin &bull; Kumasi / Accra</div>
              </div>
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50 text-xs">
                <div className="px-3 py-2 border-b border-slate-100">
                  <div className="font-bold text-slate-900">Ama Mensah</div>
                  <div className="text-[10px] text-slate-500">Fleet Dispatcher</div>
                </div>
                <a href="#/admin/settings" className="block px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700">Account Settings</a>
                <a href="#/user/report" className="block px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700">Citizen View</a>
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-50 text-rose-600 font-semibold"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <button
            type="button"
            aria-label="Logout"
            onClick={onLogout}
            className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
