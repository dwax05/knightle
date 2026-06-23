import { useState } from "react";
import { AuthProvider, useAuth } from "./auth";
import { AuthForm } from "./AuthForm";
import { Game } from "./Game";
import { StatsPanel } from "./StatsPanel";
import { ThemeEditor } from "./ThemeEditor";

function Home() {
  const { user, logout } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [view, setView] = useState<"game" | "theme">("game");
  if (!user) return <AuthForm />;

  if (view === "theme") return <ThemeEditor onClose={() => setView("game")} />;

  return (
    <div style={{ maxWidth: 900, margin: "2rem auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 1rem" }}>
        <h1 style={{ margin: 0 }}>Wordle</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setView("theme")}>🎨 Theme</button>
          <button onClick={logout}>Log out ({user.firstName})</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 40, justifyContent: "center", marginTop: 16 }}>
        <Game onGameEnd={() => setRefreshKey((k) => k + 1)} />
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

