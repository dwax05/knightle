import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./auth";
import { AuthForm } from "./AuthForm";
import { Game } from "./Game";
import { StatsPanel } from "./StatsPanel";
import { ThemeEditor } from "./ThemeEditor";
import { Leaderboard } from "./Leaderboard";
import { Versus } from "./Versus";
import { ProfilePage } from "./ProfilePage";

function NavButton({ onClick, emoji, label }: { onClick: () => void; emoji: string; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-muted hover:text-fg hover:bg-bg/70 active:bg-bg transition-colors duration-150"
    >
      <span className="text-base leading-none">{emoji}</span>
      <span className="hidden sm:inline tracking-wide">{label}</span>
    </button>
  );
}

function Home() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [mobileTab, setMobileTab] = useState<"stats" | "leaderboard">("stats");
  const [view, setView] = useState<"game" | "theme" | "versus" | "profile">(
    () => (localStorage.getItem("view") as "game" | "theme" | "versus") || "game"
  );

  useEffect(() => {
    localStorage.setItem("view", view === "profile" ? "game" : view);
  }, [view]);
  if (!user) return <AuthForm />;

  if (view === "theme") return <ThemeEditor onClose={() => setView("game")} />;
  if (view === "versus") return <Versus onExit={() => setView("game")} />;
  if (view === "profile") return <ProfilePage onClose={() => setView("game")} />;
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 relative">
      <nav className="absolute top-4 right-4 z-10 flex items-stretch bg-surface border border-border-app/50 rounded-xl overflow-hidden">
        <NavButton onClick={() => setView("versus")} emoji="⚔️" label="Versus" />
        <div className="w-px bg-border-app/40 self-stretch" />
        <NavButton onClick={() => setView("theme")} emoji="🎨" label="Theme" />
        <div className="w-px bg-border-app/40 self-stretch" />
        <NavButton onClick={() => setView("profile")} emoji="👤" label="Profile" />
      </nav>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-18 items-center lg:items-start justify-center mt-14">
        {/* Mobile: game + tabs share a constrained column */}
        <div className="lg:contents w-full max-w-md flex flex-col gap-4">
        <div className="flex flex-col items-center w-full lg:w-auto bg-surface border border-border-app/30 rounded-2xl px-1 py-4 lg:p-4">
          <h1 className="text-sm font-semibold tracking-widest uppercase text-muted text-center pb-3 border-b border-border-app/40 w-full mb-4">Knightle</h1>
          <Game onGameEnd={() => setRefreshKey((k) => k + 1)} />
        </div>
        {/* Desktop: stacked panels */}
        <div className="hidden lg:flex flex-col gap-6 w-auto items-stretch">
          <StatsPanel refreshKey={refreshKey} />
          <Leaderboard refreshKey={refreshKey} />
        </div>

        {/* Mobile: tabbed panels */}
        <div className="lg:hidden w-full flex flex-col">
          <div className="flex bg-surface border border-border-app/30 rounded-xl overflow-hidden mb-3">
            {(["stats", "leaderboard"] as const).map((tab, i, arr) => (
              <>
                <button
                  key={tab}
                  onClick={() => setMobileTab(tab)}
                  className={`flex-1 py-2 text-sm font-semibold tracking-widest uppercase transition-colors duration-150 ${
                    mobileTab === tab ? "text-fg bg-bg/40" : "text-muted hover:text-fg"
                  }`}
                >
                  {tab === "stats" ? "Statistics" : "Leaderboard"}
                </button>
                {i < arr.length - 1 && <div className="w-px bg-border-app/40 self-stretch" />}
              </>
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

