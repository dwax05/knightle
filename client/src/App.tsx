import { useState, useEffect, useRef } from "react";
import { AuthProvider, useAuth } from "./auth";
import { AuthForm } from "./AuthForm";
import { Game } from "./Game";
import { StatsPanel } from "./StatsPanel";
import { ThemeEditor } from "./ThemeEditor";
import { Leaderboard } from "./Leaderboard";
import { VersusLobbyModal, type VersusMode } from "./Versus";
import { VersusGame } from "./VersusGame";
import { ProfilePage } from "./ProfilePage";
import { IconUser, IconPalette, IconBarChart, IconLightning, IconExpand, IconCompress } from "./icons";

const NAV_ITEMS = [
  { view: "profile" as const, icon: <IconUser className="w-4 h-4" />, label: "Profile" },
  { view: "theme" as const, icon: <IconPalette className="w-4 h-4" />, label: "Theme" },
];

function HamburgerMenu({ onNavigate, dropUp = false }: { onNavigate: (view: "theme" | "profile") => void; dropUp?: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function navigate(view: "theme" | "profile") {
    setOpen(false);
    onNavigate(view);
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => { setOpen((o) => !o); (e.currentTarget as HTMLButtonElement).blur(); }}
        aria-label="Menu"
        className="w-10 h-10 flex flex-col items-center justify-center gap-1.5 bg-surface border border-border-app/50 rounded-xl shadow-[0_3px_0_rgba(0,0,0,0.4)] hover:brightness-110 active:translate-y-[2px] active:shadow-none transition-all duration-100"
      >
        <span className={`w-5 h-0.5 bg-fg rounded-full transition-all duration-200 ${open ? "rotate-45 translate-y-2" : ""}`} />
        <span className={`w-5 h-0.5 bg-fg rounded-full transition-all duration-200 ${open ? "opacity-0 scale-x-0" : ""}`} />
        <span className={`w-5 h-0.5 bg-fg rounded-full transition-all duration-200 ${open ? "-rotate-45 -translate-y-2" : ""}`} />
      </button>

      {open && (
        <div className="fixed inset-0 z-10 bg-black/30" onClick={() => setOpen(false)} />
      )}
      {open && (
        <div className={`absolute ${dropUp ? "bottom-full mb-2" : "top-full mt-2"} right-0 min-w-36 bg-surface border border-border-app/50 rounded-xl overflow-hidden animate-slide-down z-20 shadow-xl shadow-black/60`}>
          {NAV_ITEMS.map((item, i) => (
            <div key={item.view}>
              <button
                onClick={() => navigate(item.view)}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-muted hover:text-fg hover:bg-bg/50 transition-colors duration-150"
              >
                {item.icon}
                <span className="tracking-wide">{item.label}</span>
              </button>
              {i < NAV_ITEMS.length - 1 && <div className="h-px bg-border-app/40 mx-3" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatsSheet({ refreshKey, onClose }: { refreshKey: number; onClose: () => void }) {
  const [closing, setClosing] = useState(false);

  function dismiss() {
    setClosing(true);
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div className={`absolute inset-0 bg-black/50 transition-opacity duration-[250ms] ${closing ? "opacity-0" : "opacity-100"}`} onClick={dismiss} />
      <div
        className={`relative bg-surface border-t border-border-app/40 rounded-t-2xl max-h-[80vh] overflow-y-auto flex flex-col gap-6 p-4 pb-8 shadow-2xl shadow-black/60 ${closing ? "animate-sheet-close" : "animate-slide-up"}`}
        onAnimationEnd={() => { if (closing) onClose(); }}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold tracking-widest uppercase text-muted">Stats & Leaderboard</span>
          <button
            onClick={dismiss}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted bg-surface border border-border-app/40 shadow-[0_2px_0_rgba(0,0,0,0.35)] hover:brightness-110 active:translate-y-[2px] active:shadow-none transition-all duration-100 text-lg"
          >
            ✕
          </button>
        </div>
        <StatsPanel refreshKey={refreshKey} />
        <Leaderboard refreshKey={refreshKey} />
      </div>
    </div>
  );
}

function HomescreenPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("homescreenDismissed")) return;
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
    if (isStandalone) return;
    if (window.innerWidth >= 1024) return;
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    setVisible(false);
    localStorage.setItem("homescreenDismissed", "1");
  }

  if (!visible) return null;

  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const instruction = isIOS
    ? <>Tap the <span className="font-semibold text-fg">Share</span> icon below, then <span className="font-semibold text-fg">"Add to Home Screen"</span></>
    : <>Tap the <span className="font-semibold text-fg">menu (⋮)</span> in your browser, then <span className="font-semibold text-fg">"Add to Home Screen"</span></>;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pointer-events-none">
      <div className="bg-surface border border-border-app/50 rounded-2xl shadow-2xl shadow-black/60 p-4 pointer-events-auto flex items-start gap-3 animate-slide-up">
        <div className="flex-1">
          <p className="text-sm font-semibold text-fg">Add Knightle to your homescreen</p>
          <p className="text-xs text-muted mt-1">{instruction}</p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-fg hover:bg-bg/50 transition-colors text-sm"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function Home() {
  const { reloadTheme } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [statsOpen, setStatsOpen] = useState(false);
  const [versusCode, setVersusCode] = useState<string | null>(() => sessionStorage.getItem("versusCode"));
  const [versusMode, setVersusMode] = useState<VersusMode>(() => (sessionStorage.getItem("versusMode") as VersusMode) ?? "speed");
  const [lobbyOpen, setLobbyOpen] = useState(false);
  const [view, setView] = useState<"game" | "theme" | "profile">("game");
  const [fullscreen, setFullscreen] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    reloadTheme();
  }, [view]);

  if (view === "theme") return <ThemeEditor onClose={() => setView("game")} />;
  if (view === "profile") return <ProfilePage onClose={() => setView("game")} />;
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 relative">
      {lobbyOpen && (
        <VersusLobbyModal
          onStart={(code, mode) => { sessionStorage.setItem("versusCode", code); sessionStorage.setItem("versusMode", mode); setVersusCode(code); setVersusMode(mode); setLobbyOpen(false); }}
          onClose={() => setLobbyOpen(false)}
        />
      )}

      {statsOpen && (
        <div className="lg:hidden">
          <StatsSheet refreshKey={refreshKey} onClose={() => setStatsOpen(false)} />
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-18 items-center lg:items-start justify-center">
        {/* Mobile: game only; desktop: game + side panels */}
        <div className="lg:contents w-full max-w-md flex flex-col gap-4">
          <div className={fullscreen
            ? "fixed inset-0 z-40 flex flex-col bg-surface px-2 pt-3 pb-6 lg:static lg:rounded-2xl lg:border lg:border-border-app/30 lg:px-1 lg:py-4 lg:shadow-lg lg:shadow-black/40"
            : "flex flex-col items-center w-full lg:w-auto bg-surface border border-border-app/30 rounded-2xl px-1 py-4 lg:p-4 shadow-lg shadow-black/40"
          }>
            {versusCode ? (
              <>
                <div className={`w-full flex items-center justify-between pb-3 border-b border-border-app/40 px-2 lg:px-0 ${fullscreen ? "mb-1" : "mb-4"}`}>
                  <span className="text-sm font-semibold tracking-widest uppercase text-muted">Room {versusCode}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { sessionStorage.removeItem("versusCode"); sessionStorage.removeItem("versusMode"); sessionStorage.removeItem("versusGuesses"); sessionStorage.removeItem("versusMarks"); setVersusCode(null); (document.activeElement as HTMLElement)?.blur(); }} className="text-sm text-muted hover:text-fg transition">Leave</button>
                    <button
                      onClick={() => setFullscreen((f) => !f)}
                      aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                      className="lg:hidden w-7 h-7 flex items-center justify-center rounded-md text-muted hover:text-fg transition"
                    >
                      {fullscreen ? <IconCompress className="w-4 h-4" /> : <IconExpand className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <VersusGame code={versusCode} mode={versusMode} fullscreen={fullscreen} onExit={() => { sessionStorage.removeItem("versusCode"); sessionStorage.removeItem("versusMode"); sessionStorage.removeItem("versusGuesses"); sessionStorage.removeItem("versusMarks"); setVersusCode(null); (document.activeElement as HTMLElement)?.blur(); }} />
              </>
            ) : (
              <>
                <div className="w-full flex items-center justify-between pb-3 border-b border-border-app/40 mb-4 px-2 lg:px-0">
                  <span className="text-sm font-semibold tracking-widest uppercase text-muted">Knightle</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setLobbyOpen(true)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface border border-border-app/50 text-xs font-semibold tracking-wide text-fg shadow-[0_2px_0_rgba(0,0,0,0.4)] hover:brightness-110 active:translate-y-[2px] active:shadow-none transition-all duration-100"><IconLightning className="w-3 h-3" /> Versus</button>
                    <button
                      onClick={() => setFullscreen((f) => !f)}
                      aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                      className="lg:hidden w-7 h-7 flex items-center justify-center rounded-md text-muted hover:text-fg transition"
                    >
                      {fullscreen ? <IconCompress className="w-4 h-4" /> : <IconExpand className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Game fullscreen={fullscreen} onGameEnd={() => setRefreshKey((k) => k + 1)} />
              </>
            )}
          </div>

          {/* Desktop side panels */}
          <div className="hidden lg:flex flex-col gap-6 w-auto items-stretch">
            <StatsPanel refreshKey={refreshKey} />
            <Leaderboard refreshKey={refreshKey} />
          </div>
        </div>
      </div>

      {/* Desktop hamburger — top-right */}
      <div className="hidden lg:block absolute top-4 right-4 z-10">
        <HamburgerMenu onNavigate={setView} />
      </div>

      <HomescreenPrompt />

      {/* Mobile FAB cluster — fixed bottom-right */}
      <div className={`lg:hidden fixed bottom-8 right-4 flex gap-2 z-20 ${fullscreen ? "hidden" : ""}`}>
        <button
          onClick={() => setStatsOpen(true)}
          aria-label="Stats & Leaderboard"
          className="w-10 h-10 flex items-center justify-center bg-surface border border-border-app/50 rounded-xl shadow-[0_3px_0_rgba(0,0,0,0.4)] hover:brightness-110 active:translate-y-[2px] active:shadow-none transition-all duration-100"
        >
          <IconBarChart className="w-5 h-5" />
        </button>
        <HamburgerMenu onNavigate={setView} dropUp />
      </div>
    </div>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Home /> : <AuthForm />;
}

export default function App() {
  return (
    <AuthProvider>
      <main>
        <AuthGate />
      </main>
    </AuthProvider>
  );
}
