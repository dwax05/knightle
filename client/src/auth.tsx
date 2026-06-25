import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { applyTheme } from "./theme-apply";

type User = { id: number; login: string };

type AuthCtx = {
  user: User | null;
  login: (login: string, password: string) => Promise<string | null>;
  register: (data: RegisterData) => Promise<string | null>;
  logout: () => void;
  authedPost: (url: string, body: object) => Promise<any>;
};

type RegisterData = { login: string; password: string; email: string };

const Ctx = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("token")
  );
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });

  function persist(data: any) {
    const u = { id: data.id, login: data.login };
    setUser(u);
    setToken(data.accessToken);
    localStorage.setItem("user", JSON.stringify(u));
    localStorage.setItem("token", data.accessToken);
  }

  async function authedPost(url: string, body: object) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        logout();
        return { error: "Session expired, please log in again" };
      }
      if (!res.ok) return { error: `Request failed (${res.status})` };
      return await res.json();
    } catch {
      return { error: "Network or server error" };
    }
  }

  async function post(url: string, body: object) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async function login(login: string, password: string) {
    const data = await post("/api/login", { login, password });
    if (data.error) return data.error;
    persist(data);
    return null;
  }

  async function register(d: RegisterData) {
    const data = await post("/api/register", d);
    if (data.error) return data.error;
    persist(data);
    return null;
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    applyTheme(""); // wipe custom theme back to defaults
  }

  async function loadTheme() {
    if (!token) return;
    const data = await authedPost("/api/theme/get", {});
    if (data.css) applyTheme(data.css);
  }

  useEffect(() => {
    if (token) loadTheme();
  }, [token]);

  return (
    <Ctx.Provider value={{ user, login, register, logout, authedPost }}>
      {children}
    </Ctx.Provider>
  );
}
