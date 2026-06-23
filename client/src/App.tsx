import { AuthProvider, useAuth } from "./auth";
import { AuthForm } from "./AuthForm";
import { Game } from "./Game";

function Home() {
  const { user, logout } = useAuth();
  if (!user) return <AuthForm />;
  return (
    <div style={{ textAlign: "center", marginTop: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 1rem" }}>
        <h1 style={{ margin: 0 }}>Wordle</h1>
        <button onClick={logout}>Log out ({user.firstName})</button>
      </div>
      <Game />
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
