import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, ChevronDown, LogOut, Menu, Search, Trash2, AlertTriangle, FileText, X } from 'lucide-react';
import { useSmartBin } from '../../context/SmartBinContext';
import { Logo } from '../common/Logo';

interface TopbarUser {
  fullName: string;
  email: string;
}

interface FigmaTopbarProps {
  onLogout: () => void;
  onSearch?: (query: string) => void;
  onToggleSidebar?: () => void;
  user?: TopbarUser | null;
}

const initialsFor = (fullName: string) =>
  fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || '?';

export const FigmaTopbar: React.FC<FigmaTopbarProps> = ({ onLogout, onSearch, onToggleSidebar, user }) => {
  const { alerts, bins, citizenReports, setSelectedBinId, markAlertAsRead } = useSmartBin();
  const [query, setQuery] = useState('');
  const displayName = user?.fullName || 'Demo Admin';
  const displayEmail = user?.email || 'Demo mode — no account signed in';
  const initials = initialsFor(displayName);
  const [searchFocused, setSearchFocused] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const searchWrapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const notifWrapRef = useRef<HTMLDivElement>(null);
  const profileWrapRef = useRef<HTMLDivElement>(null);

  const unreadAlerts = alerts.filter((alert) => !alert.read).length;

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

  // Close any open panel on an outside click, and collapse everything on Escape.
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchWrapRef.current && !searchWrapRef.current.contains(target)) setSearchFocused(false);
      if (notifWrapRef.current && !notifWrapRef.current.contains(target)) setNotificationsOpen(false);
      if (profileWrapRef.current && !profileWrapRef.current.contains(target)) setProfileOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSearchFocused(false);
        setNotificationsOpen(false);
        setProfileOpen(false);
        searchInputRef.current?.blur();
        return;
      }
      const target = event.target as HTMLElement | null;
      const isTyping = target && ['INPUT', 'TEXTAREA'].includes(target.tagName);
      if (event.key === '/' && !isTyping) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const openNotifications = () => {
    setNotificationsOpen((open) => !open);
    setProfileOpen(false);
  };
  const openProfile = () => {
    setProfileOpen((open) => !open);
    setNotificationsOpen(false);
  };

  const markAllAlertsRead = () => {
    alerts.filter((a) => !a.read).forEach((a) => markAlertAsRead(a.id));
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
          <span className="lg:hidden shrink-0">
            <Logo size="sm" />
          </span>

          {/* Search Input */}
          <div ref={searchWrapRef} className="relative flex-1 max-w-md">
            <div
              className={`flex items-center rounded-2xl bg-slate-100/90 border px-3 py-1.5 transition-all ${
                searchFocused ? 'border-blue-500 bg-white ring-2 ring-blue-100' : 'border-slate-200/60 hover:border-slate-300'
              }`}
            >
              <Search className="w-4 h-4 text-slate-400 shrink-0" strokeWidth={1.8} />
              <input
                ref={searchInputRef}
                value={query}
                onFocus={() => setSearchFocused(true)}
                onChange={(event) => {
                  setQuery(event.target.value);
                  onSearch?.(event.target.value);
                }}
                placeholder="Search bins, alerts, tickets..."
                className="w-full bg-transparent px-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                !searchFocused && (
                  <kbd className="hidden sm:flex shrink-0 items-center justify-center h-5 min-w-[20px] px-1 rounded-md border border-slate-200 bg-white text-[10px] font-semibold text-slate-400">
                    /
                  </kbd>
                )
              )}
            </div>

            {/* Search Dropdown */}
            {searchFocused && searchResults && (
              <div className="absolute left-0 top-full mt-2 w-full max-h-[340px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-xl z-50 text-xs animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150">
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

        {/* Right: Notifications, Profile, Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Notifications Bell */}
          <div ref={notifWrapRef} className="relative">
            <button
              type="button"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
              onClick={openNotifications}
              className={`p-2 rounded-xl transition-colors relative ${
                notificationsOpen ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Bell className="w-4 h-4" />
              {unreadAlerts > 0 && (
                <span className="absolute top-0.5 right-0.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white ring-2 ring-white">
                  {unreadAlerts > 9 ? '9+' : unreadAlerts}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150">
                <div className="flex items-center justify-between px-3.5 py-3 border-b border-slate-100">
                  <span className="font-bold text-xs text-slate-900">Notifications</span>
                  {unreadAlerts > 0 ? (
                    <button
                      type="button"
                      onClick={markAllAlertsRead}
                      className="text-[10px] font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Mark all as read
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-mono">All caught up</span>
                  )}
                </div>
                <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                  {alerts.slice(0, 5).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        if (!a.read) markAlertAsRead(a.id);
                        navigateToHash('/admin/alerts');
                        setNotificationsOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg text-xs flex flex-col gap-0.5 transition-colors ${
                        a.read ? 'hover:bg-slate-50' : 'bg-blue-50/70 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 font-bold text-slate-800">
                          {!a.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />}
                          {a.binCode}
                        </span>
                        <span className="text-[9px] text-slate-400 shrink-0">{new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <span className="text-slate-600 text-[11px] truncate">{a.message}</span>
                    </button>
                  ))}
                  {alerts.length === 0 && (
                    <div className="p-3 text-center text-xs text-slate-400">No active alerts.</div>
                  )}
                </div>
                {alerts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      navigateToHash('/admin/alerts');
                      setNotificationsOpen(false);
                    }}
                    className="w-full px-3.5 py-2.5 text-center text-[11px] font-bold text-blue-600 hover:bg-blue-50 border-t border-slate-100 transition-colors"
                  >
                    View all alerts
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          {/* Profile Badge */}
          <div ref={profileWrapRef} className="relative">
            <button
              type="button"
              onClick={openProfile}
              aria-expanded={profileOpen}
              className={`flex items-center gap-2 pl-1 pr-1.5 sm:pr-2 py-1 rounded-xl transition-colors text-left ${
                profileOpen ? 'bg-slate-100' : 'hover:bg-slate-100'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-xs ring-2 ring-white shadow-xs shrink-0">
                {initials}
              </div>
              <div className="hidden md:block">
                <div className="text-xs font-bold text-slate-900 leading-tight">{displayName}</div>
                <div className="text-[10px] text-slate-500 truncate max-w-[160px]">{displayEmail}</div>
              </div>
              <ChevronDown
                className={`hidden md:block w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${profileOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50 text-xs animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <div className="font-bold text-slate-900">{displayName}</div>
                  <div className="text-[10px] text-slate-500 truncate">{displayEmail}</div>
                </div>
                <a href="#/admin/settings" className="block px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700 font-medium">Account Settings</a>
                <a href="#/user/report" className="block px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700 font-medium">Citizen View</a>
                <div className="h-px bg-slate-100 my-1" />
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg hover:bg-rose-50 text-rose-600 font-semibold"
                >
                  <LogOut className="w-3.5 h-3.5" />
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
