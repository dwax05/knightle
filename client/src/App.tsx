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

      <div className="flex flex-col lg:flex-row gap-18 items-center lg:items-start justify-center mt-14">
        <div className="flex flex-col items-center">
          <h1 className="text-4xl font-bold mb-4 text-fg">Knightle</h1>
          <Game onGameEnd={() => setRefreshKey((k) => k + 1)} />
        </div>
        <div className="flex flex-col gap-6 w-full lg:w-auto items-center lg:items-stretch">
          <StatsPanel refreshKey={refreshKey} />
          <Leaderboard refreshKey={refreshKey} />
        </div>
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

