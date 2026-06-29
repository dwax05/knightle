import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./auth";
import { AuthForm } from "./AuthForm";
import { Game } from "./Game";
import { StatsPanel } from "./StatsPanel";
import { ThemeEditor } from "./ThemeEditor";
import { Leaderboard } from "./Leaderboard";
import { VersusLobbyModal, type VersusMode } from "./Versus";
import { VersusGame } from "./VersusGame";
import { ProfilePage } from "./ProfilePage";
import { IconUser, IconPalette, IconBarChart, IconLightning } from "./icons";

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
        onClick={() => setOpen((o) => !o)}
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

function Home() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [statsOpen, setStatsOpen] = useState(false);
  const [versusCode, setVersusCode] = useState<string | null>(null);
  const [versusMode, setVersusMode] = useState<VersusMode>("speed");
  const [lobbyOpen, setLobbyOpen] = useState(false);
  const [view, setView] = useState<"game" | "theme" | "profile">("game");

  if (view === "theme") return <ThemeEditor onClose={() => setView("game")} />;
  if (view === "profile") return <ProfilePage onClose={() => setView("game")} />;
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 relative">
      {lobbyOpen && (
        <VersusLobbyModal
          onStart={(code, mode) => { setVersusCode(code); setVersusMode(mode); setLobbyOpen(false); }}
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
          <div className="flex flex-col items-center w-full lg:w-auto bg-surface border border-border-app/30 rounded-2xl px-1 py-4 lg:p-4 shadow-lg shadow-black/40">
            {versusCode ? (
              <>
                <div className="w-full flex items-center justify-between pb-3 border-b border-border-app/40 mb-4 px-2 lg:px-0">
                  <span className="text-sm font-semibold tracking-widest uppercase text-muted">Room {versusCode}</span>
                  <button onClick={() => { setVersusCode(null); (document.activeElement as HTMLElement)?.blur(); }} className="text-sm text-muted hover:text-fg transition">Leave</button>
                </div>
                <VersusGame code={versusCode} mode={versusMode} onExit={() => { setVersusCode(null); (document.activeElement as HTMLElement)?.blur(); }} />
              </>
            ) : (
              <>
                <div className="w-full flex items-center justify-between pb-3 border-b border-border-app/40 mb-4 px-2 lg:px-0">
                  <span className="text-sm font-semibold tracking-widest uppercase text-muted">Knightle</span>
                  <button onClick={() => setLobbyOpen(true)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface border border-border-app/50 text-xs font-semibold tracking-wide text-fg shadow-[0_2px_0_rgba(0,0,0,0.4)] hover:brightness-110 active:translate-y-[2px] active:shadow-none transition-all duration-100"><IconLightning className="w-3 h-3" /> Versus</button>
                </div>
                <Game onGameEnd={() => setRefreshKey((k) => k + 1)} />
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

      {/* Mobile FAB cluster — fixed bottom-right */}
      <div className="lg:hidden fixed bottom-8 right-4 flex gap-2 z-20">
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
  const { user } = useAuth();
  return user ? <Home /> : <AuthForm />;
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
