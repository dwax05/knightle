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
    <div style={{ maxWidth: 900, margin: "2rem auto", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, right: "1rem", display: "flex", gap: 8, zIndex: 1 }}>
        <button onClick={() => setView("theme")}>🎨 Theme</button>
        <button onClick={logout}>Log out ({user.firstName})</button>
      </div>
      <div style={{ display: "flex", gap: 40, justifyContent: "center", marginTop: 56 }}>
        <div>
          <h1 style={{ margin: "0 0 16px", textAlign: "center" }}>Knightle</h1>
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

