import React, { useState, useMemo } from 'react';
import { Bell, LogOut, Moon, Search, Sun, Trash2, AlertTriangle, FileText, X } from 'lucide-react';
import { useSmartBin } from '../../context/SmartBinContext';

interface FigmaTopbarProps {
  onLogout: () => void;
  onSearch?: (query: string) => void;
}

export const FigmaTopbar: React.FC<FigmaTopbarProps> = ({ onLogout, onSearch }) => {
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
    <header className="absolute left-[219px] top-[24px] h-[80px] w-[1155px] overflow-visible rounded-[37px] bg-white z-30" data-name="top nav">
      {/* Global Search Input */}
      <div className="absolute left-[55px] top-[20px] h-[43px] w-[391px] rounded-[20px] bg-[#d9d9d9]/20 relative">
        <Search className="absolute left-[21px] top-[10px] h-[24px] w-[24px] text-black/45" strokeWidth={1.8} />
        <input
          value={query}
          onFocus={() => setSearchFocused(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            onSearch?.(event.target.value);
          }}
          placeholder="Search bins, alerts, tickets..."
          className="absolute left-[65px] top-0 h-[43px] w-[280px] bg-transparent text-[12px] font-normal text-black/70 outline-none placeholder:text-black/50 font-['Inter',sans-serif]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3 top-[12px] text-black/40 hover:text-black"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Real Search Results Dropdown */}
        {searchFocused && searchResults && (
          <div className="absolute left-0 top-[48px] w-[391px] max-h-[360px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-xl z-50 text-xs">
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
                        <div className="flex items-center gap-2">
                          <Trash2 className="w-3.5 h-3.5 text-blue-600" />
                          <span className="font-bold text-slate-800">{bin.code}</span>
                          <span className="text-slate-500 truncate">{bin.name}</span>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100">{bin.currentFillLevel}%</span>
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

      {/* Theme Toggle */}
      <div className="absolute left-[760px] top-[14px] h-[49px] w-[95px] overflow-hidden rounded-[50px] bg-[#d9d9d9]/45">
        <button
          type="button"
          aria-label="Light mode"
          onClick={() => applyTheme('light')}
          className={`figma-button-hit absolute left-[8px] top-[7px] flex h-[35px] w-[35px] items-center justify-center rounded-full ${theme === 'light' ? 'bg-white shadow' : ''}`}
        >
          <Sun className="h-[18px] w-[18px] text-black" fill="currentColor" />
        </button>
        <button
          type="button"
          aria-label="Dark mode"
          onClick={() => applyTheme('dark')}
          className={`figma-button-hit absolute left-[51px] top-[7px] flex h-[35px] w-[35px] items-center justify-center rounded-full ${theme === 'dark' ? 'bg-white shadow' : ''}`}
        >
          <Moon className="h-[18px] w-[18px] text-black" fill="currentColor" />
        </button>
      </div>

      <div className="absolute left-[880px] top-[14px] h-[50px] w-px bg-black/10" />

      {/* Notifications Bell */}
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setNotificationsOpen((open) => !open)}
        className="figma-button-hit absolute left-[899px] top-[29px] h-[24px] w-[24px] text-black"
      >
        <Bell className="h-[24px] w-[24px]" fill="currentColor" strokeWidth={1.5} />
        {unreadAlerts > 0 && (
          <span className="absolute -right-[3px] -top-[5px] flex h-[12px] min-w-[12px] items-center justify-center rounded-full bg-[#ffb23e] text-[8px] font-bold text-black">
            {unreadAlerts}
          </span>
        )}
      </button>

      <div className="absolute left-[936px] top-[14px] h-[50px] w-px bg-black/10" />

      {/* Profile Button */}
      <button
        type="button"
        onClick={() => setProfileOpen((open) => !open)}
        className="figma-button-hit absolute left-[951px] top-[19px] h-[40px] w-[126px] text-left"
      >
        <span className="absolute left-0 top-[1px] w-[90px] text-[12px] font-bold leading-[1.18] text-[#3b82f6]">Ama Mensah</span>
        <span className="absolute left-0 top-[19px] w-[110px] text-[9px] font-medium leading-[1.18] text-[#8daac0]">Admin - Accra East</span>
        <span className="absolute left-[86px] top-0 h-[40px] w-[40px] rounded-full bg-[#d9d9d9]" />
      </button>

      {/* Logout Button */}
      <button
        type="button"
        aria-label="Logout"
        onClick={onLogout}
        className="figma-button-hit absolute left-[1108px] top-[32px] h-[24px] w-[24px] text-black"
      >
        <LogOut className="h-[24px] w-[24px]" strokeWidth={1.8} />
      </button>

      {/* Notifications Popover */}
      {notificationsOpen && (
        <div className="absolute left-[790px] top-[72px] z-50 w-[270px] rounded-[15px] border border-[#d8e4e0] bg-white p-4 shadow-xl text-xs space-y-2">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="font-bold text-slate-900">Notifications</span>
            <span className="text-[10px] text-slate-400">{unreadAlerts} unread</span>
          </div>
          {alerts.length === 0 ? (
            <p className="text-slate-400 py-2 text-center text-[11px]">No active alerts or notifications.</p>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {alerts.slice(0, 5).map((alert) => (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() => {
                    navigateToHash('/admin/alerts');
                    setNotificationsOpen(false);
                  }}
                  className="w-full text-left border-b border-black/5 pb-2 last:border-0 hover:bg-slate-50 p-1.5 rounded-lg"
                >
                  <p className="text-[11px] font-bold text-[#0b1f1a]">{alert.binCode} &bull; {alert.type}</p>
                  <p className="text-[10px] leading-[1.3] text-[#52675f] truncate">{alert.message}</p>
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              navigateToHash('/admin/alerts');
              setNotificationsOpen(false);
            }}
            className="w-full pt-1 text-center text-[10px] font-bold text-blue-600 hover:text-blue-700"
          >
            View all alerts &rarr;
          </button>
        </div>
      )}

      {/* Profile Popover */}
      {profileOpen && (
        <div className="absolute left-[942px] top-[72px] z-50 w-[190px] rounded-[12px] border border-[#d8e4e0] bg-white p-3 shadow-xl">
          <p className="text-[12px] font-bold text-[#3b82f6]">Ama Mensah</p>
          <p className="text-[10px] text-[#52675f]">SUPER_ADMIN - Accra East</p>
          <button
            type="button"
            onClick={() => {
              setProfileOpen(false);
              navigateToHash('/admin/settings');
            }}
            className="mt-2 w-full rounded-[6px] border border-slate-200 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-slate-50"
          >
            Settings &amp; Roles
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="mt-1.5 w-full rounded-[6px] bg-[#0b1f1a] py-1.5 text-[10px] font-bold text-white hover:bg-black"
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
};
