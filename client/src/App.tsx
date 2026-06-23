import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./auth";
import { AuthForm } from "./AuthForm";
import { Game } from "./Game";
import { StatsPanel } from "./StatsPanel";
import { ThemeEditor } from "./ThemeEditor";

function Home() {
  const { user, logout } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [view, setView] = useState<"game" | "theme">(
    () => (localStorage.getItem("view") as "game" | "theme") || "game"
  );

  useEffect(() => {
    localStorage.setItem("view", view);
  }, [view]);
  if (!user) return <AuthForm />;

  if (view === "theme") return <ThemeEditor onClose={() => setView("game")} />;
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 relative">
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button onClick={() => setView("theme")} className="px-3 py-1.5 rounded-lg bg-surface text-fg text-sm border border-border-app hover:opacity-80">
          🎨 Theme
        </button>
        <button onClick={logout} className="px-3 py-1.5 rounded-lg bg-surface text-fg text-sm border border-border-app hover:opacity-80">
          Log out
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start justify-center mt-14">
        <div className="flex flex-col items-center">
          <h1 className="text-4xl font-bold mb-4 text-fg">Knightle</h1>
          <Game onGameEnd={() => setRefreshKey((k) => k + 1)} />
        </div>
        <StatsPanel refreshKey={refreshKey} />
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

