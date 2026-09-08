import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, MapPin, Menu, X, AlertTriangle } from 'lucide-react';
import { Logo } from '../common/Logo';

interface LandingViewProps {
  /** Real navigation — leaves the landing page for the admin login screen. */
  onAdminSignIn: () => void;
  /** Real navigation — leaves the landing page for the citizen portal gate. */
  onReportIssue: () => void;
}

const scrollToId = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/** A same-page section link. Deliberately NOT an href="#id" anchor — the app's
 * hash-based router treats the whole location hash as a route, so a real
 * fragment link here would get misread as a navigation to "/id" instead of
 * scrolling within this page. */
const SectionLink: React.FC<{ id: string; onClick?: () => void; className?: string; children: React.ReactNode }> = ({ id, onClick, className, children }) => (
  <a
    href="#"
    className={className}
    onClick={(e) => {
      e.preventDefault();
      scrollToId(id);
      onClick?.();
    }}
  >
    {children}
  </a>
);

const LearnMore: React.FC<{ id: string }> = ({ id }) => (
  <SectionLink id={id} className="mt-4 inline-flex items-center gap-1.5 text-[0.92rem] font-semibold text-[#1D70F5] hover:text-[#00359E] group">
    Learn more <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
  </SectionLink>
);

const CardArt: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex h-[152px] items-center justify-center overflow-hidden bg-[#E6EFFE]">
    <svg viewBox="0 0 200 130" className="h-[80%] w-[80%]">{children}</svg>
  </div>
);

export const LandingView: React.FC<LandingViewProps> = ({ onAdminSignIn, onReportIssue }) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div id="top" className="min-h-screen bg-[#F2F5F9] text-[#0E1420] antialiased">
      {/* ============ NAV ============ */}
      <header className={`sticky top-0 z-40 bg-[#F2F5F9]/90 backdrop-blur-md transition-shadow ${scrolled ? 'shadow-[0_1px_0_#DBE2ED,0_12px_24px_-20px_rgba(14,20,32,0.4)]' : ''}`}>
        <div className="mx-auto flex h-[72px] max-w-[1180px] items-center justify-between gap-6 px-5 sm:px-8">
          <a href="#" onClick={(e) => { e.preventDefault(); scrollToId('top'); }} aria-label="KlinGhana home">
            <Logo size="md" />
          </a>

          <ul className="hidden items-center gap-8 md:flex">
            <li><SectionLink id="platform" className="text-[0.94rem] font-medium text-[#4C5567] hover:text-[#0E1420]">Platform</SectionLink></li>
            <li><SectionLink id="how" className="text-[0.94rem] font-medium text-[#4C5567] hover:text-[#0E1420]">How it works</SectionLink></li>
            <li><SectionLink id="cities" className="text-[0.94rem] font-medium text-[#4C5567] hover:text-[#0E1420]">For cities</SectionLink></li>
            <li><SectionLink id="impact" className="text-[0.94rem] font-medium text-[#4C5567] hover:text-[#0E1420]">Impact</SectionLink></li>
          </ul>

          <div className="flex items-center gap-3">
            <SectionLink id="residents" className="hidden text-[0.9rem] font-semibold text-[#1D70F5] hover:text-[#00359E] sm:inline">Report an issue</SectionLink>
            <button onClick={onAdminSignIn} className="hidden rounded-lg bg-[#1D70F5] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-14px_rgba(14,20,32,0.5)] transition-transform hover:-translate-y-px hover:bg-[#00359E] md:inline-flex">
              Admin sign in
            </button>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#DBE2ED] md:hidden"
            >
              {menuOpen ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="border-t border-[#DBE2ED] md:hidden">
            <div className="flex flex-col gap-1 px-5 pb-6 pt-4 sm:px-8">
              <SectionLink id="platform" onClick={() => setMenuOpen(false)} className="border-b border-[#DBE2ED] py-2.5 font-medium">Platform</SectionLink>
              <SectionLink id="how" onClick={() => setMenuOpen(false)} className="border-b border-[#DBE2ED] py-2.5 font-medium">How it works</SectionLink>
              <SectionLink id="cities" onClick={() => setMenuOpen(false)} className="border-b border-[#DBE2ED] py-2.5 font-medium">For cities</SectionLink>
              <SectionLink id="impact" onClick={() => setMenuOpen(false)} className="border-b border-[#DBE2ED] py-2.5 font-medium">Impact</SectionLink>
              <SectionLink id="residents" onClick={() => setMenuOpen(false)} className="border-b border-[#DBE2ED] py-2.5 font-medium">Report an issue</SectionLink>
              <button onClick={onAdminSignIn} className="mt-3 rounded-lg bg-[#1D70F5] px-5 py-2.5 text-center text-sm font-semibold text-white">Admin sign in</button>
            </div>
          </nav>
        )}
      </header>

      <main>
        {/* ============ HERO ============ */}
        <section className="px-5 pb-10 pt-12 sm:px-8 sm:pt-16 lg:pb-16">
          <div className="mx-auto grid max-w-[1180px] items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <div>
              <span className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-[#1D70F5]">IoT Waste Intelligence · Ghana</span>
              <h1 className="mt-4 text-balance font-display text-[2.6rem] font-bold leading-[1.05] tracking-tight sm:text-[3.4rem] lg:text-[3.9rem]">
                Know a bin is full<br />before the street does.
              </h1>
              <p className="mt-5 max-w-[58ch] text-[1.15rem] leading-relaxed text-[#4C5567]">
                KlinGhana puts an ultrasonic sensor and a GPS chip in every SmartBin, then streams fill level, location and status to one live dashboard — so crews roll out on a real signal, not a guess, and residents can flag a problem in under a minute.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-6">
                <SectionLink id="demo" className="inline-flex items-center gap-2 rounded-lg bg-[#1D70F5] px-6 py-3.5 text-[0.95rem] font-semibold text-white shadow-[0_10px_24px_-14px_rgba(14,20,32,0.5)] transition-transform hover:-translate-y-px hover:bg-[#00359E]">
                  Request a city demo
                </SectionLink>
                <SectionLink id="residents" className="inline-flex items-center gap-1.5 text-[0.92rem] font-semibold text-[#1D70F5] hover:text-[#00359E] group">
                  Report a bin issue <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </SectionLink>
              </div>
            </div>

            <div className="relative h-[340px] sm:h-[400px] lg:h-[440px]" aria-hidden="true">
              <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full">
                <path d="M70 190 C40 100 150 40 260 65 C360 90 370 220 300 300 C220 380 100 350 80 280 C65 240 90 230 70 190 Z" fill="#E6EFFE" />
              </svg>

              <div className="absolute left-[6%] top-[10%] z-20 w-[min(340px,78%)] rounded-2xl border border-[#DBE2ED] bg-white p-5 shadow-[0_20px_45px_-20px_rgba(14,20,32,0.28)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#158A5E]">
                      <span className="absolute inset-[-4px] animate-ping rounded-full border-[1.5px] border-[#158A5E] opacity-60" />
                    </span>
                    <span className="font-mono text-[0.68rem] font-semibold tracking-[0.1em] text-[#158A5E]">LIVE</span>
                  </div>
                  <span className="font-mono text-[0.72rem] text-[#7C8598]">BIN-014 · Adabraka Mkt</span>
                </div>
                <div className="mt-3.5 flex items-end gap-4">
                  <div className="font-display text-[2.6rem] font-bold leading-none">78<sup className="text-[1.1rem] font-semibold text-[#7C8598]">%</sup></div>
                  <div className="relative h-[58px] w-[34px] flex-none overflow-hidden rounded-md border border-[#DBE2ED] bg-[#E7ECF3]">
                    <div className="absolute inset-x-0 bottom-0 h-[78%] bg-gradient-to-b from-[#B4791A] to-[#C93B32]" />
                  </div>
                </div>
                <div className="mt-3.5 flex justify-between border-t border-dashed border-[#DBE2ED] pt-3 font-mono text-[0.7rem] text-[#7C8598]">
                  <span>5.5560°N 0.2050°W</span>
                  <span>Solar 92%</span>
                </div>
              </div>

              <div className="absolute left-[34%] top-[64%] z-30 flex w-[min(260px,66%)] items-start gap-2.5 rounded-2xl border border-[#DBE2ED] bg-white p-4 shadow-[0_20px_45px_-20px_rgba(14,20,32,0.28)]">
                <AlertTriangle className="mt-0.5 h-[18px] w-[18px] flex-none text-[#B4791A]" />
                <div>
                  <div className="text-[0.85rem] font-bold">Threshold crossed — 85%</div>
                  <div className="mt-0.5 text-[0.78rem] text-[#4C5567]">Dispatch suggested for Zone 3 route.</div>
                </div>
              </div>

              <div className="absolute left-0 top-[56%] z-20 flex h-14 w-14 items-center justify-center rounded-full border border-[#DBE2ED] bg-white shadow-[0_10px_24px_-14px_rgba(14,20,32,0.22)]">
                <MapPin className="h-6 w-6 text-[#1D70F5]" />
              </div>
            </div>
          </div>
        </section>

        {/* ============ TRUST BAR ============ */}
        <div className="border-y border-[#DBE2ED] bg-white">
          <div className="mx-auto grid max-w-[1180px] grid-cols-2 gap-y-6 px-5 py-7 sm:px-8 md:grid-cols-4 md:gap-y-0">
            {[
              { num: '640+', label: 'SmartBins mapped*' },
              { num: '18', label: 'Districts live*' },
              { num: '85%', label: 'Default alert threshold' },
              { num: '<15min', label: 'Avg. alert-to-dispatch*' },
            ].map((s, i) => (
              <div
                key={s.label}
                className={`px-4 ${i % 2 === 1 ? 'border-l border-[#DBE2ED]' : 'border-l-0'} ${i === 0 ? 'md:border-l-0' : 'md:border-l md:border-[#DBE2ED]'}`}
              >
                <div className="font-mono text-[1.7rem] font-semibold tabular-nums sm:text-[1.9rem]">{s.num}</div>
                <div className="mt-1 text-[0.76rem] font-semibold uppercase tracking-wide text-[#7C8598]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ============ HOW IT WORKS ============ */}
        <section id="how" className="px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-[1180px]">
            <div className="mb-12 max-w-[56ch]">
              <span className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-[#1D70F5]">The signal path</span>
              <h2 className="mt-2.5 text-balance font-display text-[2rem] font-bold sm:text-[2.5rem]">From a full bin to a dispatched crew — five hops.</h2>
              <p className="mt-3.5 max-w-[60ch] text-[1.15rem] leading-relaxed text-[#4C5567]">This is the actual pipeline running behind every SmartBin: the same path a fill reading takes, in real time, from the sensor to the person who empties it.</p>
            </div>

            <div className="relative pl-11">
              <div className="absolute bottom-1.5 left-[9px] top-1.5 w-0.5 bg-[repeating-linear-gradient(to_bottom,#1D70F5_0_6px,transparent_6px_12px)] opacity-55" />
              {[
                { tag: 'STAGE 01 — SENSE', title: 'Bin reads its own fill level', body: 'An ultrasonic sensor and GPS module inside every SmartBin measure fill depth and confirm location on a fixed interval.' },
                { tag: 'STAGE 02 — TRANSMIT', title: 'ESP32 pushes the reading out', body: 'An onboard ESP32 sends telemetry over Wi‑Fi to the IoT ingest API — no manual check-ins, no missed readings.' },
                { tag: 'STAGE 03 — SYNC', title: 'Supabase stores and streams it', body: 'Every reading lands in Supabase and is broadcast in realtime to whoever has the dashboard open.' },
                { tag: 'STAGE 04 — ALERT', title: 'The dashboard flags what matters', body: 'Bins crossing a fill threshold, going offline, or getting a citizen report surface as alerts — not buried in a table.' },
                { tag: 'STAGE 05 — ACT', title: 'Crews collect, residents hear back', body: "Alerts become routed collection stops, and the resident who reported the bin sees it move to resolved." },
              ].map((s, i, arr) => (
                <div key={s.tag} className={`relative grid grid-cols-1 gap-1.5 py-5 sm:grid-cols-[auto_1fr] sm:gap-6 ${i !== arr.length - 1 ? 'border-b border-[#DBE2ED]' : ''}`}>
                  <span className="absolute -left-11 top-6 h-5 w-5 rounded-full border-2 border-[#1D70F5] bg-white" />
                  <span className="whitespace-nowrap pt-0.5 font-mono text-[0.72rem] font-semibold tracking-[0.08em] text-[#1D70F5]">{s.tag}</span>
                  <div>
                    <h3 className="font-display text-[1.2rem] font-semibold">{s.title}</h3>
                    <p className="mt-1.5 max-w-[58ch] text-[#4C5567]">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ CAPABILITY GRID ============ */}
        <section id="platform" className="px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-[1180px]">
            <div className="mb-12 max-w-[56ch]">
              <span className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-[#1D70F5]">The platform</span>
              <h2 className="mt-2.5 text-balance font-display text-[2rem] font-bold sm:text-[2.5rem]">Everything a bin fleet needs to run itself.</h2>
            </div>

            <div className="grid grid-cols-1 border-l border-t border-[#DBE2ED] sm:grid-cols-2 lg:grid-cols-3">
              {/* 1. Fill monitoring */}
              <article className="flex flex-col border-b border-r border-[#DBE2ED]">
                <CardArt>
                  <path d="M70 50 a26 26 0 0 1 44 0" fill="none" stroke="#00359E" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
                  <path d="M62 58 a36 36 0 0 1 60 0" fill="none" stroke="#00359E" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
                  <path d="M54 66 a46 46 0 0 1 76 0" fill="none" stroke="#00359E" strokeWidth="3" strokeLinecap="round" opacity="0.28" />
                  <rect x="74" y="66" width="36" height="8" rx="3" fill="#1D70F5" />
                  <path d="M78 76 L82 112 c0.4 3 3 5 6 5 l12 0 c3 0 5.6 -2 6 -5 L110 76 Z" fill="#1D70F5" />
                  <line x1="88" y1="84" x2="88" y2="108" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="99" y1="84" x2="99" y2="108" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
                  <rect x="120" y="70" width="58" height="34" rx="8" fill="#fff" stroke="#00359E" strokeWidth="2" />
                  <text x="128" y="93" fontFamily="'JetBrains Mono',monospace" fontSize="16" fontWeight="700" fill="#0E1420">78%</text>
                </CardArt>
                <div className="px-7 pb-8 pt-6">
                  <h3 className="font-display text-[1.08rem] font-semibold">Real-Time Fill Monitoring</h3>
                  <p className="mt-2 text-[0.94rem] leading-relaxed text-[#4C5567]">Ultrasonic depth sensors report fill level every few minutes, so bins get collected at 90%, not discovered at 130%.</p>
                  <LearnMore id="how" />
                </div>
              </article>

              {/* 2. GPS fleet map */}
              <article className="flex flex-col border-b border-r border-[#DBE2ED]">
                <CardArt>
                  <rect x="20" y="18" width="160" height="96" rx="10" fill="#fff" stroke="#DBE2ED" strokeWidth="2" />
                  <line x1="20" y1="50" x2="180" y2="50" stroke="#E7ECF3" strokeWidth="2" />
                  <line x1="20" y1="82" x2="180" y2="82" stroke="#E7ECF3" strokeWidth="2" />
                  <line x1="70" y1="18" x2="70" y2="114" stroke="#E7ECF3" strokeWidth="2" />
                  <line x1="130" y1="18" x2="130" y2="114" stroke="#E7ECF3" strokeWidth="2" />
                  <circle cx="90" cy="66" r="18" fill="#1D70F5" opacity="0.15" />
                  <path d="M90 46c-10 0-17 7-17 16 0 12 17 26 17 26s17-14 17-26c0-9-7-16-17-16Z" fill="#1D70F5" />
                  <circle cx="90" cy="61" r="6" fill="#fff" />
                  <circle cx="145" cy="40" r="5" fill="#158A5E" />
                  <circle cx="45" cy="95" r="5" fill="#B4791A" />
                </CardArt>
                <div className="px-7 pb-8 pt-6">
                  <h3 className="font-display text-[1.08rem] font-semibold">Live GPS Fleet Map</h3>
                  <p className="mt-2 text-[0.94rem] leading-relaxed text-[#4C5567]">Every SmartBin reports its exact coordinates, plotted on one city-wide map your ops team can filter by zone.</p>
                  <LearnMore id="cities" />
                </div>
              </article>

              {/* 3. Alerts */}
              <article className="flex flex-col border-b border-r border-[#DBE2ED]">
                <CardArt>
                  <circle cx="100" cy="70" r="42" fill="#C93B32" opacity="0.08" />
                  <circle cx="100" cy="70" r="30" fill="#C93B32" opacity="0.1" />
                  <rect x="82" y="60" width="36" height="8" rx="3" fill="#1D70F5" />
                  <path d="M86 70 L90 106 c0.4 3 3 5 6 5 l8 0 c3 0 5.6 -2 6 -5 L114 70 Z" fill="#1D70F5" />
                  <rect x="90" y="76" width="20" height="16" fill="#C93B32" opacity="0.85" />
                  <line x1="96" y1="80" x2="96" y2="98" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
                  <line x1="104" y1="80" x2="104" y2="98" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
                  <g transform="translate(126,34)">
                    <path d="M12 0 L24 22 a2.4 2.4 0 0 1 -2 3.6 L2 25.6 a2.4 2.4 0 0 1 -2 -3.6 Z" fill="#fff" stroke="#B4791A" strokeWidth="2.4" />
                    <line x1="12" y1="9" x2="12" y2="16" stroke="#B4791A" strokeWidth="2.4" strokeLinecap="round" />
                    <circle cx="12" cy="20" r="1.4" fill="#B4791A" />
                  </g>
                </CardArt>
                <div className="px-7 pb-8 pt-6">
                  <h3 className="font-display text-[1.08rem] font-semibold">Full &amp; Overflow Alerts</h3>
                  <p className="mt-2 text-[0.94rem] leading-relaxed text-[#4C5567]">Configurable thresholds push an alert the moment a bin crosses your line — before it becomes a complaint.</p>
                  <LearnMore id="how" />
                </div>
              </article>

              {/* 4. Citizen reporting */}
              <article className="flex flex-col border-b border-r border-[#DBE2ED]">
                <CardArt>
                  <rect x="118" y="24" width="46" height="82" rx="10" fill="#fff" stroke="#00359E" strokeWidth="2.4" />
                  <rect x="126" y="34" width="30" height="30" rx="3" fill="none" stroke="#1D70F5" strokeWidth="2.2" />
                  <rect x="130" y="38" width="8" height="8" fill="#1D70F5" />
                  <rect x="144" y="38" width="8" height="8" fill="#1D70F5" />
                  <rect x="130" y="52" width="8" height="8" fill="#1D70F5" />
                  <line x1="126" y1="74" x2="156" y2="74" stroke="#DBE2ED" strokeWidth="3" strokeLinecap="round" />
                  <line x1="126" y1="82" x2="146" y2="82" stroke="#DBE2ED" strokeWidth="3" strokeLinecap="round" />
                  <rect x="30" y="70" width="30" height="6" rx="3" fill="#1D70F5" />
                  <path d="M33 76 L36 100 c0.3 2.4 2.4 4 4.8 4 l10 0 c2.4 0 4.5 -1.6 4.8 -4 L58 76 Z" fill="#1D70F5" />
                  <path d="M64 62 C80 50 96 50 112 62" fill="none" stroke="#B4791A" strokeWidth="2.4" strokeDasharray="4 5" strokeLinecap="round" />
                </CardArt>
                <div className="px-7 pb-8 pt-6">
                  <h3 className="font-display text-[1.08rem] font-semibold">Citizen Reporting</h3>
                  <p className="mt-2 text-[0.94rem] leading-relaxed text-[#4C5567]">A QR code on every bin opens a 30-second report form — no app download, no account required.</p>
                  <LearnMore id="residents" />
                </div>
              </article>

              {/* 5. Routing */}
              <article className="flex flex-col border-b border-r border-[#DBE2ED]">
                <CardArt>
                  <path d="M28 100 C60 60 90 100 120 66 C138 46 150 46 160 40" fill="none" stroke="#B9C8E8" strokeWidth="4" strokeDasharray="1 9" strokeLinecap="round" />
                  <circle cx="28" cy="100" r="8" fill="#158A5E" />
                  <circle cx="100" cy="82" r="8" fill="#B4791A" />
                  <circle cx="140" cy="50" r="8" fill="#C93B32" />
                  <g transform="translate(150,26)">
                    <rect x="0" y="8" width="30" height="14" rx="2" fill="#1D70F5" />
                    <rect x="22" y="2" width="12" height="12" rx="2" fill="#1D70F5" />
                    <circle cx="7" cy="24" r="4" fill="#00359E" />
                    <circle cx="26" cy="24" r="4" fill="#00359E" />
                  </g>
                </CardArt>
                <div className="px-7 pb-8 pt-6">
                  <h3 className="font-display text-[1.08rem] font-semibold">Collection Routing</h3>
                  <p className="mt-2 text-[0.94rem] leading-relaxed text-[#4C5567]">Turn today's alerts into tomorrow's route. Group full bins by zone and hand crews an ordered stop list.</p>
                  <LearnMore id="cities" />
                </div>
              </article>

              {/* 6. Analytics */}
              <article className="flex flex-col border-b border-r border-[#DBE2ED]">
                <CardArt>
                  <rect x="56" y="18" width="88" height="96" rx="8" fill="#fff" stroke="#00359E" strokeWidth="2.4" />
                  <line x1="68" y1="34" x2="120" y2="34" stroke="#DBE2ED" strokeWidth="3" strokeLinecap="round" />
                  <line x1="68" y1="44" x2="104" y2="44" stroke="#DBE2ED" strokeWidth="3" strokeLinecap="round" />
                  <rect x="68" y="60" width="12" height="34" fill="#8FB4FF" />
                  <rect x="86" y="72" width="12" height="22" fill="#1D70F5" />
                  <rect x="104" y="52" width="12" height="42" fill="#00359E" />
                  <g transform="translate(118,90)">
                    <circle cx="12" cy="12" r="14" fill="#158A5E" />
                    <path d="M6 12.5 L10 17 L18 8" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                </CardArt>
                <div className="px-7 pb-8 pt-6">
                  <h3 className="font-display text-[1.08rem] font-semibold">Analytics &amp; Reports</h3>
                  <p className="mt-2 text-[0.94rem] leading-relaxed text-[#4C5567]">Exportable PDF reports on uptime, fill trends and response time — built for council meetings, not just dashboards.</p>
                  <LearnMore id="impact" />
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ============ STREETSCAPE ============ */}
        <section className="px-5 pb-16 sm:px-8 sm:pb-20">
          <div className="mx-auto max-w-[1180px]">
            <div className="overflow-hidden rounded-[20px] bg-[#E6EFFE]">
              <div className="grid items-center gap-8 p-8 sm:p-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
                <div>
                  <span className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-[#1D70F5]">One city, one view</span>
                  <h2 className="mt-2.5 text-balance font-display text-[2rem] font-bold sm:text-[2.3rem]">Every bin, every zone, one live map.</h2>
                  <p className="mt-3.5 max-w-[58ch] text-[1.05rem] leading-relaxed text-[#4C5567]">Green, amber and red status travel with each bin in real time — so dispatch always knows which three to hit next, not which three hundred to check.</p>
                  <SectionLink id="cities" className="mt-6 inline-flex items-center gap-1.5 text-[0.92rem] font-semibold text-[#1D70F5] hover:text-[#00359E] group">
                    See the fleet map <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </SectionLink>
                </div>
                <div className="h-[220px] sm:h-[260px]" aria-hidden="true">
                  <svg viewBox="0 0 420 240" className="h-full w-full">
                    <path d="M40 210 C10 140 90 60 200 70 C320 80 400 150 380 210 Z" fill="#ffffff" opacity="0.5" />
                    <path d="M46 196 C110 175 150 202 210 180 C275 155 320 172 366 152" fill="none" stroke="#B9C8E8" strokeWidth="3" strokeDasharray="1 10" strokeLinecap="round" />

                    <line x1="60" y1="168" x2="62" y2="178" stroke="#DBE2ED" strokeWidth="2" />
                    <g transform="translate(52,178)">
                      <rect x="0" y="0" width="20" height="4" rx="2" fill="#00359E" />
                      <path d="M2 5 L4 26 c0.1 1 1 1.8 2 1.8 l8 0 c1 0 1.9 -0.8 2 -1.8 L18 5 Z" fill="#1D70F5" />
                    </g>
                    <rect x="28" y="136" width="64" height="30" rx="8" fill="#fff" stroke="#DBE2ED" strokeWidth="1.5" />
                    <circle cx="42" cy="151" r="5" fill="#158A5E" />
                    <text x="54" y="155" fontFamily="'JetBrains Mono',monospace" fontSize="13" fontWeight="600" fill="#0E1420">32%</text>

                    <line x1="218" y1="150" x2="220" y2="160" stroke="#DBE2ED" strokeWidth="2" />
                    <g transform="translate(210,160)">
                      <rect x="0" y="0" width="20" height="4" rx="2" fill="#00359E" />
                      <path d="M2 5 L4 26 c0.1 1 1 1.8 2 1.8 l8 0 c1 0 1.9 -0.8 2 -1.8 L18 5 Z" fill="#1D70F5" />
                    </g>
                    <rect x="186" y="112" width="64" height="30" rx="8" fill="#fff" stroke="#DBE2ED" strokeWidth="1.5" />
                    <circle cx="200" cy="127" r="5" fill="#B4791A" />
                    <text x="212" y="131" fontFamily="'JetBrains Mono',monospace" fontSize="13" fontWeight="600" fill="#0E1420">68%</text>

                    <line x1="348" y1="132" x2="350" y2="142" stroke="#DBE2ED" strokeWidth="2" />
                    <g transform="translate(340,142)">
                      <rect x="0" y="0" width="20" height="4" rx="2" fill="#00359E" />
                      <path d="M2 5 L4 26 c0.1 1 1 1.8 2 1.8 l8 0 c1 0 1.9 -0.8 2 -1.8 L18 5 Z" fill="#1D70F5" />
                    </g>
                    <rect x="316" y="94" width="64" height="30" rx="8" fill="#fff" stroke="#DBE2ED" strokeWidth="1.5" />
                    <circle cx="330" cy="109" r="5" fill="#C93B32" />
                    <text x="342" y="113" fontFamily="'JetBrains Mono',monospace" fontSize="13" fontWeight="600" fill="#0E1420">91%</text>

                    <g transform="translate(368,120)">
                      <rect x="0" y="10" width="32" height="15" rx="2" fill="#1D70F5" />
                      <rect x="24" y="2" width="13" height="13" rx="2" fill="#1D70F5" />
                      <circle cx="8" cy="27" r="4.2" fill="#00359E" />
                      <circle cx="28" cy="27" r="4.2" fill="#00359E" />
                    </g>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ SPLIT: CITIES / RESIDENTS ============ */}
        <section id="cities" className="px-5 pb-16 sm:px-8 sm:pb-20">
          <div className="mx-auto max-w-[1180px]">
            <div className="grid overflow-hidden rounded-[18px] shadow-[0_10px_24px_-14px_rgba(14,20,32,0.22)] sm:grid-cols-2">
              <div className="bg-[#0A1220] p-8 text-[#EEF2F9] sm:p-12">
                <span className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-[#8FB4FF]">For cities &amp; institutions</span>
                <h3 className="mt-2 text-balance font-display text-[1.6rem] font-semibold sm:text-[1.8rem]">Run the whole fleet from one screen.</h3>
                <ul className="mt-6 flex flex-col gap-3.5">
                  {[
                    'Fleet-wide visibility across every bin, zone and crew',
                    'Role-based admin accounts for supervisors, dispatch and analysts',
                    'Automated PDF reporting for council and compliance reviews',
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2.5 text-[0.96rem] leading-snug text-[#A9B3C7]">
                      <Check className="mt-0.5 h-4 w-4 flex-none text-[#8FB4FF]" /> {t}
                    </li>
                  ))}
                </ul>
                <SectionLink id="demo" className="mt-7 inline-flex rounded-lg border border-white/15 px-5 py-2.5 text-sm font-semibold text-[#EEF2F9] transition-colors hover:bg-white/10">
                  Talk to our team
                </SectionLink>
              </div>
              <div id="residents" className="bg-[#E6EFFE] p-8 text-[#0E1420] sm:p-12">
                <span className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-[#1D70F5]">For residents</span>
                <h3 className="mt-2 text-balance font-display text-[1.6rem] font-semibold sm:text-[1.8rem]">Flag a bin. Watch it get fixed.</h3>
                <ul className="mt-6 flex flex-col gap-3.5">
                  {[
                    'Scan the QR code on any bin to report it in under a minute',
                    'Track your report from submitted to resolved',
                    "Get notified the moment your street's bin is fixed",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2.5 text-[0.96rem] leading-snug text-[#4C5567]">
                      <Check className="mt-0.5 h-4 w-4 flex-none text-[#1D70F5]" /> {t}
                    </li>
                  ))}
                </ul>
                <button onClick={onReportIssue} className="mt-7 inline-flex rounded-lg bg-[#1D70F5] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-14px_rgba(14,20,32,0.5)] transition-transform hover:-translate-y-px hover:bg-[#00359E]">
                  Report a bin issue
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ============ IMPACT ============ */}
        <section id="impact" className="px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-[1180px]">
            <div className="mb-12 max-w-[56ch]">
              <span className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-[#1D70F5]">Why it matters</span>
              <h2 className="mt-2.5 text-balance font-display text-[2rem] font-bold sm:text-[2.5rem]">Sensing beats sweeping.</h2>
            </div>
            <div className="grid grid-cols-1 gap-7 sm:grid-cols-3 sm:gap-10">
              {[
                { t: 'Fewer overflow points', d: 'Threshold alerts catch a filling bin days before it spills onto a market road or drain.' },
                { t: 'Shorter, smarter routes', d: 'Crews are dispatched to bins that are actually full — less fuel burned circling empty ones.' },
                { t: 'A paper trail for every bin', d: 'Every reading, alert and repair is logged, exportable, and ready for a council report.' },
              ].map((it) => (
                <div key={it.t} className="border-l-2 border-[#1D70F5] pl-5">
                  <h3 className="font-display text-[1.05rem] font-semibold">{it.t}</h3>
                  <p className="mt-2 text-[0.94rem] text-[#4C5567]">{it.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ FINAL CTA ============ */}
        <section id="demo" className="px-5 pb-16 sm:px-8 sm:pb-20">
          <div className="mx-auto max-w-[1180px]">
            <div className="flex flex-col items-center gap-5 rounded-[20px] bg-[#1D70F5] p-8 text-center sm:p-14">
              <span className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-white/85">Get started</span>
              <h2 className="max-w-[22ch] text-balance font-display text-[1.7rem] font-bold text-[#F4F8FF] sm:text-[2.3rem]">Ready to put a sensor on every bin in your district?</h2>
              <p className="max-w-[50ch] text-white/85">Tell us your city or institution and how many bins you're managing — we'll set up a walkthrough of the live dashboard.</p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-6">
                <a href="mailto:hello@klinghana.com" className="inline-flex items-center gap-2 rounded-lg bg-[#F4F8FF] px-6 py-3.5 text-[0.95rem] font-semibold text-[#00359E] transition-transform hover:-translate-y-px hover:shadow-[0_14px_30px_-12px_rgba(0,0,0,0.35)]">
                  Request a demo
                </a>
                <button onClick={onReportIssue} className="inline-flex items-center gap-1.5 text-[0.92rem] font-semibold text-[#F4F8FF] group">
                  Or report a bin issue <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ============ FOOTER ============ */}
      <footer className="mt-4 bg-[#0A1220] text-[#A9B3C7]">
        <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-10 border-b border-white/10 px-5 py-12 sm:px-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo size="md" variant="white" />
            <p className="mt-4 max-w-[32ch] text-[0.9rem] text-[#A9B3C7]">IoT-enabled smart waste management for Ghana's cities — sensors, dashboard and citizen reporting in one platform.</p>
          </div>
          <div>
            <h4 className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[#A9B3C7]">Platform</h4>
            <ul className="flex flex-col gap-2.5">
              <li><SectionLink id="platform" className="text-[0.92rem] text-[#EEF2F9]/85 hover:text-[#8FB4FF]">Fill monitoring</SectionLink></li>
              <li><SectionLink id="platform" className="text-[0.92rem] text-[#EEF2F9]/85 hover:text-[#8FB4FF]">GPS tracking</SectionLink></li>
              <li><SectionLink id="platform" className="text-[0.92rem] text-[#EEF2F9]/85 hover:text-[#8FB4FF]">Alerts</SectionLink></li>
              <li><SectionLink id="platform" className="text-[0.92rem] text-[#EEF2F9]/85 hover:text-[#8FB4FF]">Analytics</SectionLink></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[#A9B3C7]">Portals</h4>
            <ul className="flex flex-col gap-2.5">
              <li><button onClick={onAdminSignIn} className="text-[0.92rem] text-[#EEF2F9]/85 hover:text-[#8FB4FF]">Admin sign in</button></li>
              <li><button onClick={onReportIssue} className="text-[0.92rem] text-[#EEF2F9]/85 hover:text-[#8FB4FF]">Citizen report</button></li>
              <li><SectionLink id="cities" className="text-[0.92rem] text-[#EEF2F9]/85 hover:text-[#8FB4FF]">For cities</SectionLink></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[#A9B3C7]">Contact</h4>
            <ul className="flex flex-col gap-2.5">
              <li><a href="mailto:hello@klinghana.com" className="text-[0.92rem] text-[#EEF2F9]/85 hover:text-[#8FB4FF]">hello@klinghana.com</a></li>
              <li><span className="text-[0.92rem] text-[#EEF2F9]/85">Accra, Ghana</span></li>
            </ul>
          </div>
        </div>
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3 px-5 py-6 text-[0.82rem] sm:px-8">
          <span>&copy; {new Date().getFullYear()} KlinGhana. Built for Ghana's cities.</span>
          <span>*Illustrative figures — replace with verified deployment data.</span>
        </div>
      </footer>
    </div>
  );
};
