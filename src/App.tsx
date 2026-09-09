import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { LoginView } from './components/auth/LoginView';
import { FigmaSidebar } from './components/layout/FigmaSidebar';
import { FigmaTopbar } from './components/layout/FigmaTopbar';
import { OperationsCommandCenter } from './components/admin/OperationsCommandCenter';
import { BinsAndLocationsView } from './components/admin/BinsAndLocationsView';
import { BinDetailView } from './components/admin/BinDetailView';
import { AlertsWorkbench } from './components/admin/AlertsWorkbench';
import { ComplaintsWorkbench } from './components/admin/ComplaintsWorkbench';
import { CollectionsAndRoutesView } from './components/admin/CollectionsAndRoutesView';
import { AnalyticsAndReportsView } from './components/admin/AnalyticsAndReportsView';
import { UsersRolesAndSettingsView } from './components/admin/UsersRolesAndSettingsView';
import { ChatBotAiView } from './components/admin/ChatBotAiView';
import { UserReportView } from './components/citizen/UserReportView';
import { CitizenHeader } from './components/citizen/CitizenHeader';
import { BinAccessView } from './components/citizen/BinAccessView';
import { CitizenGateView } from './components/citizen/CitizenGateView';
import { UserBinsView } from './components/citizen/UserBinsView';
import { UserBinDetailView } from './components/citizen/UserBinDetailView';
import { UserComplaintsView } from './components/citizen/UserComplaintsView';
import { SystemDiagnosticsView } from './components/dev/SystemDiagnosticsView';
import { LandingView } from './components/marketing/LandingView';
import { Logo } from './components/common/Logo';
import { SmartBin } from './types';
import { useSmartBin } from './context/SmartBinContext';
import { isSupabaseConfigured, supabase } from './services/supabaseClient';
import type { Session } from '@supabase/supabase-js';

export const App: React.FC = () => {
  const { bins, setSelectedBinId, setCitizenBinId, dataMode } = useSmartBin();
  // Read the hash synchronously on first render (not in an effect) so a page
  // refresh on e.g. #/admin doesn't paint the landing page for a frame before
  // snapping to the real route.
  const [currentRoute, setCurrentRoute] = useState(() => window.location.hash.replace('#', '') || '/');
  const [selectedBin, setSelectedBin] = useState<SmartBin | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Real auth only applies in live mode against a configured Supabase project;
  // demo mode keeps its existing no-login-required workflow untouched.
  const authGateActive = dataMode === 'live' && isSupabaseConfigured();
  const [authChecked, setAuthChecked] = useState(!authGateActive);

  // /dev/screens and /dev/system expose internal build references and real
  // infrastructure diagnostics (the actual Supabase project URL, hardware
  // bring-up status) — they need the same admin auth as /admin/* itself,
  // not free anonymous access just because they live outside that prefix.
  const needsAdminAuth = (route: string) => route.startsWith('/admin') || route.startsWith('/dev');
  const [currentUser, setCurrentUser] = useState<{ fullName: string; email: string } | null>(null);

  // Resolves the topbar's displayed identity from the real signed-in user's
  // profiles row (falling back to auth metadata/email if the row isn't
  // readable yet) — rather than ever showing a fixed placeholder name.
  const loadCurrentUser = async (session: Session | null) => {
    if (!session?.user) {
      setCurrentUser(null);
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', session.user.id)
      .maybeSingle();
    setCurrentUser({
      fullName: profile?.full_name || (session.user.user_metadata?.full_name as string | undefined) || session.user.email || 'Admin',
      email: profile?.email || session.user.email || '',
    });
  };

  useEffect(() => {
    // Initial route is already read in useState above; this only tracks
    // subsequent navigation (back/forward, hash links).
    const handleHashChange = () => setCurrentRoute(window.location.hash.replace('#', '') || '/');
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  useEffect(() => {
    if (!authGateActive) return;

    supabase.auth.getSession().then(({ data }) => {
      loadCurrentUser(data.session);
      setAuthChecked(true);
    });

    // Reactively bounce to /login the moment a session ends (sign-out here,
    // expiry, or a sign-out from another tab), and keep the displayed
    // identity in sync with whoever is actually signed in. Only bounce when
    // actually on an admin route — this fires on every auth event, including
    // the initial "no session yet" event Supabase emits on first load, and
    // the public citizen portal (/user/*) must never redirect to admin login.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      loadCurrentUser(session);
      if (!session && window.location.hash.replace('#', '').startsWith('/admin')) {
        window.location.hash = '/login';
        setCurrentRoute('/login');
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, [authGateActive]);

  // Redirect unauthenticated visits to admin routes to the login screen. This
  // re-checks the session directly, each time an admin route is entered,
  // rather than trusting a React state snapshot — so a route change fired
  // immediately after a successful sign-in (before onAuthStateChange has
  // re-rendered) doesn't race and bounce the user straight back to /login.
  useEffect(() => {
    if (!authGateActive || !authChecked || !needsAdminAuth(currentRoute)) return;
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (!data.session) {
        window.location.hash = '/login';
        setCurrentRoute('/login');
      }
    });
    return () => { cancelled = true; };
  }, [authGateActive, authChecked, currentRoute]);

  const navigateTo = (route: string) => {
    window.location.hash = route;
    setCurrentRoute(route);
  };

  const routeBinKey = currentRoute.split('/').pop() || '';
  const routedBin = bins.find((bin) => bin.id === routeBinKey || bin.code.toUpperCase() === routeBinKey.toUpperCase()) || null;
  const activeBin = selectedBin || routedBin;

  const handleLogout = async () => {
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
    } catch {
      // graceful logout even if offline
    }
    setSelectedBin(null);
    setSelectedBinId(null);
    setCurrentUser(null);
    // A deliberate sign-out lands back on the public homepage, not the
    // login form — that's for the session-expiry/unauthorized-access
    // guards below, which still send straight to /login since re-auth is
    // exactly what those need.
    navigateTo('/');
  };

  const openBin = (bin: SmartBin, baseRoute: '/admin/bins' | '/user/bins') => {
    setSelectedBin(bin);
    setSelectedBinId(bin.id);
    navigateTo(`${baseRoute}/${bin.code}`);
  };

  // The public marketing homepage — no auth, no data mode gate. It only ever
  // hands off to /login (admin) or /citizen (residents); every real screen
  // still lives behind those two doors exactly as before.
  if (currentRoute === '/') {
    return (
      <LandingView
        onAdminSignIn={() => navigateTo('/login')}
        onReportIssue={() => navigateTo('/citizen')}
      />
    );
  }

  if (currentRoute === '/login') {
    return <LoginView onLogin={(role) => navigateTo(role === 'admin' ? '/admin' : '/user/report')} />;
  }

  // Avoid flashing admin/dev content while the initial session check is in flight.
  if (authGateActive && !authChecked && needsAdminAuth(currentRoute)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f6f6]">
        <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
          Checking session…
        </div>
      </div>
    );
  }

  if (currentRoute === '/dev/screens') {
    const screens = [
      { name: '0. Public Landing Page', node: 'MKT:HOME', route: '/' },
      { name: '1. Login Screen', node: '57:12', route: '/login' },
      { name: '2. Operations Command Center', node: '64:2', route: '/admin' },
      { name: '3. Bins & Locations', node: '75:242', route: '/admin/bins' },
      { name: '4. Bin Detail & Telemetry', node: '75:486', route: '/admin/bins/SB-024' },
      { name: '5. Alerts & Incidents', node: '75:742', route: '/admin/alerts' },
      { name: '6. Complaints Workbench', node: '75:995', route: '/admin/complaints' },
      { name: '7. Collections & Routes', node: '75:1203', route: '/admin/routes' },
      { name: '8. Analytics & Reports', node: '75:1386', route: '/admin/analytics' },
      { name: '9. Users, Roles & Settings', node: '77:1592', route: '/admin/settings' },
      { name: '10. ChatBot AI Screen', node: '100:1042', route: '/admin/ai' },
      { name: '11. User Report Screen', node: '91:100', route: '/user/report' },
      { name: '12. User / Nearby Bins', node: '98:408', route: '/user/bins' },
      { name: '13. User Bin Detail', node: '98:515', route: '/user/bins/SB-024' },
      { name: '14. User Complaints', node: '98:706', route: '/user/complaints' },
      { name: '15. System Diagnostics & Cloud Mode', node: 'DEV:SYSTEM', route: '/dev/system' },
    ];

    return (
      <div className="mx-auto min-h-screen max-w-5xl space-y-6 bg-[#F8FAFC] p-8 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="flex items-center justify-between border-b pb-4">
          <Logo size="md" />
          <h1 className="font-['Outfit',sans-serif] text-xl font-bold text-slate-900">Figma Design System &bull; Screen Directory</h1>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {screens.map((screen, index) => (
            <button key={index} onClick={() => navigateTo(screen.route)} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-blue-500 hover:shadow-md">
              <div><div className="text-sm font-bold text-slate-900">{screen.name}</div><div className="font-mono text-xs text-slate-400">Figma Node: {screen.node} &bull; Route: {screen.route}</div></div>
              <ExternalLink className="h-4 w-4 text-blue-600" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (currentRoute === '/dev/system') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-8 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="mx-auto mb-4 flex max-w-4xl items-center justify-between">
          <Logo size="md" />
          <button onClick={() => navigateTo('/admin')} className="text-xs font-bold text-slate-600 hover:text-slate-900">&larr; Back to Command Center</button>
        </div>
        <SystemDiagnosticsView />
      </div>
    );
  }

  // The real front door of the Citizen Portal — asks for a bin code before
  // showing anything, rather than dropping visitors straight into a generic
  // report form with no bin identified. A QR scan (#/bin/:code below)
  // already supplies the code and skips this gate entirely.
  if (currentRoute === '/citizen') {
    return (
      <div className="min-h-screen bg-white">
        <CitizenHeader currentRoute={currentRoute} />
        <CitizenGateView
          onAccessBin={(code) => navigateTo(`/bin/${code}`)}
          onBrowseBins={() => navigateTo('/user/bins')}
          onGeneralReport={() => navigateTo('/user/report')}
        />
      </div>
    );
  }

  // QR-code deep link: each physical bin gets its own /#/bin/<code> URL,
  // printed as a sticker. Scanning it lands here — no search, no picking
  // from a list, one specific bin and one clear next action.
  if (currentRoute.startsWith('/bin/')) {
    const scannedCode = currentRoute.split('/').pop() || '';
    return (
      <div className="min-h-screen bg-white">
        <CitizenHeader currentRoute={currentRoute} />
        <BinAccessView
          code={scannedCode}
          onReportProblem={(bin) => {
            setCitizenBinId(bin.id);
            navigateTo('/user/report');
          }}
          onViewFullDetail={(bin) => openBin(bin, '/user/bins')}
          onBrowseBins={() => navigateTo('/user/bins')}
        />
      </div>
    );
  }

  if (currentRoute.startsWith('/user')) {
    return (
      <div className="min-h-screen bg-white">
        <CitizenHeader currentRoute={currentRoute} />
        {currentRoute === '/user/report' && <UserReportView onReportSuccess={() => navigateTo('/user/complaints')} />}
        {currentRoute === '/user/bins' && <main className="mx-auto w-full max-w-5xl p-4 sm:p-6"><UserBinsView onSelectBin={(bin) => openBin(bin, '/user/bins')} /></main>}
        {currentRoute.startsWith('/user/bins/') && (
          <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
            {activeBin ? (
              <UserBinDetailView
                bin={activeBin}
                onBack={() => navigateTo('/user/bins')}
                onReportProblem={() => {
                  setCitizenBinId(activeBin.id);
                  navigateTo('/user/report');
                }}
              />
            ) : (
              <EmptyDetail onBack={() => navigateTo('/user/bins')} label="No live bin selected" />
            )}
          </main>
        )}
        {currentRoute === '/user/complaints' && <main className="mx-auto w-full max-w-5xl p-4 sm:p-6"><UserComplaintsView /></main>}
      </div>
    );
  }

  const currentAdminNav =
    currentRoute === '/admin/bins' ? 'bins-locations' :
    currentRoute.startsWith('/admin/bins/') ? 'device-detail' :
    currentRoute === '/admin/alerts' ? 'alerts' :
    currentRoute === '/admin/complaints' ? 'complaints' :
    currentRoute === '/admin/routes' ? 'routes' :
    currentRoute === '/admin/analytics' ? 'analytics' :
    currentRoute === '/admin/settings' ? 'settings' :
    currentRoute === '/admin/ai' ? 'ai' : 'command-center';

  return (
    <div className="min-h-screen bg-[#f6f6f6] flex flex-col lg:flex-row text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
      <FigmaSidebar
        currentView={currentAdminNav}
        mobileOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
        onSelectView={(viewId) => {
          setSidebarOpen(false);
          if (viewId === 'command-center') navigateTo('/admin');
          if (viewId === 'bins-locations') navigateTo('/admin/bins');
          if (viewId === 'device-detail') navigateTo(activeBin ? `/admin/bins/${activeBin.code}` : '/admin/bins');
          if (viewId === 'alerts') navigateTo('/admin/alerts');
          if (viewId === 'complaints') navigateTo('/admin/complaints');
          if (viewId === 'routes') navigateTo('/admin/routes');
          if (viewId === 'analytics') navigateTo('/admin/analytics');
          if (viewId === 'users') navigateTo('/admin/settings');
          if (viewId === 'settings') navigateTo('/admin/settings');
          if (viewId === 'ai') navigateTo('/admin/ai');
        }}
      />
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <FigmaTopbar
          onLogout={handleLogout}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          user={currentUser}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentRoute === '/admin' && <OperationsCommandCenter onSelectBin={(bin) => openBin(bin, '/admin/bins')} />}
          {currentRoute === '/admin/bins' && <BinsAndLocationsView onSelectBin={(bin) => openBin(bin, '/admin/bins')} />}
          {currentRoute.startsWith('/admin/bins/') && <BinDetailView bin={activeBin} onBack={() => navigateTo('/admin')} />}
          {currentRoute === '/admin/alerts' && <AlertsWorkbench />}
          {currentRoute === '/admin/complaints' && <ComplaintsWorkbench />}
          {currentRoute === '/admin/routes' && <CollectionsAndRoutesView />}
          {currentRoute === '/admin/analytics' && <AnalyticsAndReportsView />}
          {currentRoute === '/admin/settings' && <UsersRolesAndSettingsView />}
          {currentRoute === '/admin/ai' && <ChatBotAiView />}
        </main>
      </div>
    </div>
  );
};

const EmptyDetail: React.FC<{ onBack: () => void; label: string }> = ({ onBack, label }) => (
  <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif]">
    <button onClick={onBack} className="text-xs font-bold text-slate-500 hover:text-slate-900">&larr; Back</button>
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
      <div className="font-['Outfit',sans-serif] text-xl font-bold text-slate-900">{label}</div>
      <p className="mt-2 text-xs">No demo SB-024 fallback is loaded in live mode.</p>
    </div>
  </div>
);

export default App;
