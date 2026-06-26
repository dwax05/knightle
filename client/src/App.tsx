import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./auth";
import { AuthForm } from "./AuthForm";
import { Game } from "./Game";
import { StatsPanel } from "./StatsPanel";
import { ThemeEditor } from "./ThemeEditor";
import { Leaderboard } from "./Leaderboard";
import { VersusLobbyModal } from "./Versus";
import { VersusGame } from "./VersusGame";
import { ProfilePage } from "./ProfilePage";

const NAV_ITEMS = [
  { view: "profile" as const, emoji: "👤", label: "Profile" },
  { view: "theme" as const, emoji: "🎨", label: "Theme" },
];

function HamburgerMenu({ onNavigate }: { onNavigate: (view: "theme" | "profile") => void }) {
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
        className="w-10 h-10 flex flex-col items-center justify-center gap-1.5 bg-surface border border-border-app/50 rounded-xl hover:bg-bg/70 transition-colors duration-150 shadow-lg shadow-black/40"
      >
        <span className={`w-5 h-0.5 bg-fg rounded-full transition-all duration-200 ${open ? "rotate-45 translate-y-2" : ""}`} />
        <span className={`w-5 h-0.5 bg-fg rounded-full transition-all duration-200 ${open ? "opacity-0 scale-x-0" : ""}`} />
        <span className={`w-5 h-0.5 bg-fg rounded-full transition-all duration-200 ${open ? "-rotate-45 -translate-y-2" : ""}`} />
      </button>

      {open && (
        <div className="fixed inset-0 z-10 bg-black/30" onClick={() => setOpen(false)} />
      )}
      {open && (
        <div className="absolute top-full right-0 mt-2 min-w-36 bg-surface border border-border-app/50 rounded-xl overflow-hidden animate-slide-down z-20 shadow-xl shadow-black/60">
          {NAV_ITEMS.map((item, i) => (
            <div key={item.view}>
              <button
                onClick={() => navigate(item.view)}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-muted hover:text-fg hover:bg-bg/50 transition-colors duration-150"
              >
                <span>{item.emoji}</span>
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

function Home() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [mobileTab, setMobileTab] = useState<"stats" | "leaderboard">("stats");
  const [versusCode, setVersusCode] = useState<string | null>(null);
  const [lobbyOpen, setLobbyOpen] = useState(false);
  const [view, setView] = useState<"game" | "theme" | "profile">(
    () => (localStorage.getItem("view") as "game" | "theme") || "game"
  );

  useEffect(() => {
    localStorage.setItem("view", view === "profile" ? "game" : view);
  }, [view]);
  if (!user) return <AuthForm />;

  if (view === "theme") return <ThemeEditor onClose={() => setView("game")} />;
  if (view === "profile") return <ProfilePage onClose={() => setView("game")} />;
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 relative">
      <div className="absolute top-4 right-4 z-10">
        <HamburgerMenu onNavigate={setView} />
      </div>
      {lobbyOpen && (
        <VersusLobbyModal
          onStart={(code) => { setVersusCode(code); setLobbyOpen(false); }}
          onClose={() => setLobbyOpen(false)}
        />
      )}

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-18 items-center lg:items-start justify-center mt-14">
        {/* Mobile: game + tabs share a constrained column */}
        <div className="lg:contents w-full max-w-md flex flex-col gap-4">
        <div className="flex flex-col items-center w-full lg:w-auto bg-surface border border-border-app/30 rounded-2xl px-1 py-4 lg:p-4 shadow-lg shadow-black/40">
          {versusCode ? (
            <>
              <div className="w-full flex items-center justify-between pb-3 border-b border-border-app/40 mb-4 px-2 lg:px-0">
                <span className="text-sm font-semibold tracking-widest uppercase text-muted">Room {versusCode}</span>
                <button onClick={() => setVersusCode(null)} className="text-sm text-muted hover:text-fg transition">Leave</button>
              </div>
              <VersusGame code={versusCode} onExit={() => setVersusCode(null)} />
            </>
          ) : (
            <>
              <div className="w-full flex items-center justify-between pb-3 border-b border-border-app/40 mb-4 px-2 lg:px-0">
                <span className="text-sm font-semibold tracking-widest uppercase text-muted">Knightle</span>
                <button onClick={() => setLobbyOpen(true)} className="flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-border-app/50 text-xs font-semibold tracking-wide text-muted hover:text-fg hover:border-border-app transition-colors duration-150">⚔️ Versus</button>
              </div>
              <Game onGameEnd={() => setRefreshKey((k) => k + 1)} />
            </>
          )}
        </div>
        {/* Desktop: stacked panels */}
        <div className="hidden lg:flex flex-col gap-6 w-auto items-stretch">
          <StatsPanel refreshKey={refreshKey} />
          <Leaderboard refreshKey={refreshKey} />
        </div>

        {/* Mobile: tabbed panels */}
        <div className="lg:hidden w-full flex flex-col">
          <div className="flex bg-surface border border-border-app/30 rounded-xl overflow-hidden mb-3 shadow-lg shadow-black/40">
            {(["stats", "leaderboard"] as const).map((tab, i) => (
              <div key={tab} className="contents">
                <button
                  onClick={() => setMobileTab(tab)}
                  className={`flex-1 py-2 text-sm font-semibold tracking-widest uppercase transition-colors duration-150 ${
                    mobileTab === tab ? "text-fg bg-bg/40" : "text-muted hover:text-fg"
                  }`}
                >
                  {tab === "stats" ? "Statistics" : "Leaderboard"}
                </button>
                {i === 0 && <div className="w-px bg-border-app/40 self-stretch" />}
              </div>
            ))}
          </div>
          <div className="grid">
            <div className={`col-start-1 row-start-1 ${mobileTab !== "stats" ? "invisible pointer-events-none" : ""}`}>
              <StatsPanel refreshKey={refreshKey} />
            </div>
            <div className={`col-start-1 row-start-1 ${mobileTab !== "leaderboard" ? "invisible pointer-events-none" : ""}`}>
              <Leaderboard refreshKey={refreshKey} />
            </div>
          </div>
        </div>
        </div>{/* end mobile wrapper */}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Home />
    </AuthProvider>
  );
}

