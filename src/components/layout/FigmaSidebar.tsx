import React from 'react';
import {
  Bell,
  Bot,
  BarChart3,
  FileText,
  LayoutDashboard,
  ListChecks,
  Route,
  Settings,
  Trash2,
  Users,
  X,
  Sparkles,
} from 'lucide-react';

interface FigmaSidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const navItems = [
  { id: 'command-center', label: 'Overview', icon: LayoutDashboard },
  { id: 'bins-locations', label: 'Bins', icon: Trash2 },
  { id: 'device-detail', label: 'Device detail', icon: ListChecks },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'complaints', label: 'Complaints', icon: FileText },
  { id: 'routes', label: 'Routes', icon: Route },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const FigmaSidebar: React.FC<FigmaSidebarProps> = ({
  currentView,
  onSelectView,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const handleItemClick = (id: string) => {
    onSelectView(id);
    onCloseMobile?.();
  };

  const content = (
    <div className="flex h-full flex-col justify-between p-4 font-['Plus_Jakarta_Sans',sans-serif]">
      <div>
        {/* Logo & Close (Mobile) */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <button
            type="button"
            onClick={() => handleItemClick('command-center')}
            className="flex items-center gap-1.5 text-left group"
            aria-label="KlinGhana overview"
          >
            <span className="text-xl font-extrabold tracking-tight text-[#1174e6] font-['Outfit',sans-serif]">
              KlinGh<span className="inline-flex items-center justify-center w-5 h-5 mx-0.5 rounded bg-[#1174e6] text-white text-[11px] font-black">K</span>na
            </span>
          </button>
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation List */}
        <nav className="mt-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentView === item.id || (item.id === 'users' && currentView === 'settings');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-blue-50 text-blue-600 shadow-xs font-bold'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-600' : 'text-slate-500'}`} strokeWidth={1.9} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* AI Assistant Help Banner */}
      <div className="mt-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-3.5 shadow-xs">
        <div className="flex items-center gap-1.5 text-blue-700 font-bold text-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Support</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-600 leading-snug">
          Ask the KlinGhana AI assistant about bin diagnostics, sorting guidelines, or telemetry.
        </p>
        <button
          type="button"
          onClick={() => handleItemClick('ai')}
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-colors"
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Ask Assistant</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-slate-200/80 bg-white min-h-screen sticky top-0 h-screen z-20">
        {content}
      </aside>

      {/* Mobile Slide-Out Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 w-64 max-w-[85vw] bg-white shadow-2xl transition-transform animate-in slide-in-from-left duration-200 z-50">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
