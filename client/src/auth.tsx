import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import { applyTheme } from "./theme-apply";

type User = { id: number; login: string };

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (login: string, password: string, rememberMe: boolean) => Promise<string | null>;
  register: (data: RegisterData) => Promise<string | null>;
  logout: () => Promise<void>;
  authedPost: (url: string, body: object) => Promise<any>;
  deleteAccount: (password: string) => Promise<string | null>;
};

type RegisterData = { login: string; password: string; email: string };

const Ctx = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  // access token lives only in memory — never persisted
  const tokenRef = useRef<string | null>(null);
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });
  // true while we're doing the initial silent refresh on mount
  const [loading, setLoading] = useState(() => !!localStorage.getItem("user"));

  function persistUser(u: User) {
    setUser(u);
    localStorage.setItem("user", JSON.stringify(u));
  }

  function clearUser() {
    setUser(null);
    tokenRef.current = null;
    localStorage.removeItem("user");
    localStorage.removeItem("rememberMe");
  }

  async function refresh(): Promise<boolean> {
    try {
      const rememberMe = localStorage.getItem("rememberMe") === "1";
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
        headers: rememberMe ? { "x-remember-me": "1" } : {},
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.error) return false;
      tokenRef.current = data.accessToken;
      persistUser({ id: data.id, login: data.login });
      return true;
    } catch {
      return false;
    }
  }

  // silent refresh on mount to restore session from cookie
  useEffect(() => {
    if (!localStorage.getItem("user")) return;
    refresh().then((ok) => {
      if (!ok) clearUser();
      setLoading(false);
    });
  }, []);

  async function authedPost(url: string, body: object): Promise<any> {
    const doFetch = (tok: string) =>
      fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
        body: JSON.stringify(body),
      });

    let res = await doFetch(tokenRef.current ?? "");

    if (res.status === 401) {
      // try to silently refresh once, then retry
      const ok = await refresh();
      if (!ok) {
        clearUser();
        return { error: "Session expired, please log in again" };
      }
      res = await doFetch(tokenRef.current ?? "");
    }

    if (!res.ok) return { error: `Request failed (${res.status})` };
    return res.json();
  }

  async function post(url: string, body: object) {
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async function login(loginName: string, password: string, rememberMe: boolean) {
    const data = await post("/api/login", { login: loginName, password, rememberMe });
    if (data.error) return data.error;
    tokenRef.current = data.accessToken;
    persistUser({ id: data.id, login: data.login });
    if (rememberMe) localStorage.setItem("rememberMe", "1");
    return null;
  }

  async function register(d: RegisterData) {
    const data = await post("/api/register", d);
    if (data.error) return data.error;
    tokenRef.current = data.accessToken;
    persistUser({ id: data.id, login: data.login });
    return null;
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    clearUser();
    applyTheme("");
  }

  async function deleteAccount(password: string): Promise<string | null> {
    const data = await authedPost("/api/delete-account", { password });
    if (data.error) return data.error;
    await logout();
    return null;
  }

  async function loadTheme() {
    if (!tokenRef.current) return;
    const data = await authedPost("/api/theme/get", {});
    if (data.css) applyTheme(data.css);
  }

  useEffect(() => {
    if (user) loadTheme();
  }, [user]);

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout, authedPost, deleteAccount }}>
      {children}
    </Ctx.Provider>
  );
}
