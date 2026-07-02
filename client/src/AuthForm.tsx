import { useState, useEffect } from "react";
import { useAuth } from "./auth";

type Mode = "login" | "register" | "forgot" | "reset";
type Status = { type: "error" | "success"; message: string } | null;

export function AuthForm() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [form, setForm] = useState({
    login: "", password: "", confirm: "", email: "", newPassword: "", newConfirm: "",
  });
  const [status, setStatus] = useState<Status>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) {
      setResetToken(token);
      setMode("reset");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  function validate(): string | null {
    if (mode === "forgot") {
      if (!form.email.trim()) return "Email is required";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Invalid email address";
      return null;
    }
    if (mode === "reset") {
      if (!form.newPassword) return "Password is required";
      if (form.newPassword.length < 6) return "Password must be at least 6 characters";
      if (form.newPassword !== form.newConfirm) return "Passwords don't match";
      return null;
    }
    if (!form.login.trim()) return "Username is required";
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(form.login))
      return "Username must be 3–20 characters: letters, numbers, _ or -";
    if (!form.password) return "Password is required";
    if (mode === "register") {
      if (!form.email.trim()) return "Email is required";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Invalid email address";
      if (form.password.length < 6) return "Password must be at least 6 characters";
      if (form.password !== form.confirm) return "Passwords don't match";
    }
    return null;
  }

  async function submit() {
    setStatus(null);
    const v = validate();
    if (v) return setStatus({ type: "error", message: v });

    setSubmitting(true);

    if (mode === "forgot") {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      setSubmitting(false);
      if (data.error) return setStatus({ type: "error", message: data.error });
      setStatus({ type: "success", message: "If that email is registered, a reset link is on its way." });
      return;
    }

    if (mode === "reset") {
      const res = await fetch("/api/reset-password-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, newPassword: form.newPassword }),
      });
      const data = await res.json();
      setSubmitting(false);
      if (data.error) return setStatus({ type: "error", message: data.error });
      setStatus({ type: "success", message: "Password reset! You can now log in." });
      setTimeout(() => { setMode("login"); setStatus(null); }, 2000);
      return;
    }

    const err = mode === "login"
      ? await login(form.login, form.password, rememberMe)
      : await register(form);
    setSubmitting(false);

    if (err) setStatus({ type: "error", message: err });
    else setStatus({ type: "success", message: mode === "login" ? "Logged in!" : "Account created!" });
  }

  function switchMode() {
    setMode(mode === "login" ? "register" : "login");
    setStatus(null);
    setForm({ ...form, password: "", confirm: "" });
  }

  const inputClass =
    "w-full px-3 py-2.5 rounded-lg bg-bg text-fg border border-border-app/60 " +
    "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 " +
    "placeholder:text-muted transition";

  const heading =
    mode === "forgot" ? "Reset password" :
    mode === "reset" ? "Set new password" :
    mode === "login" ? "Welcome back" :
    "Create your account";

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div
        className="w-full max-w-sm flex flex-col gap-4 p-8 rounded-2xl bg-surface border border-border-app/40 shadow-lg shadow-black/40"
        onKeyDown={(e) => { if (e.key === "Enter" && !submitting) submit(); }}
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold text-fg mb-1">Knightle</h1>
          <p className="text-sm text-muted">{heading}</p>
        </div>

        {mode === "forgot" && (
          <input className={inputClass} type="email" placeholder="Your email" value={form.email} onChange={set("email")} />
        )}

        {mode === "reset" && (
          <div className="flex flex-col gap-4">
            <input className={inputClass} type="password" placeholder="New password" value={form.newPassword} onChange={set("newPassword")} />
            <input className={inputClass} type="password" placeholder="Confirm new password" value={form.newConfirm} onChange={set("newConfirm")} />
          </div>
        )}

        {(mode === "login" || mode === "register") && (
          <>
            {mode === "register" && (
              <input className={inputClass} type="email" placeholder="Email" value={form.email} onChange={set("email")} />
            )}

            <input className={inputClass} placeholder="Username" value={form.login} onChange={set("login")} />
            <input className={inputClass} type="password" placeholder="Password" value={form.password} onChange={set("password")} />

            {mode === "register" && (
              <input className={inputClass} type="password" placeholder="Confirm password" value={form.confirm} onChange={set("confirm")} />
            )}

            {mode === "login" && (
              <label className="flex items-center justify-center gap-1 cursor-pointer select-none text-sm text-muted hover:text-fg transition-colors">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only"
                />
                <span className={`w-4 h-4 rounded flex items-center justify-center border transition-all duration-150 ${rememberMe ? "bg-accent border-accent" : "bg-bg border-border-app/60"}`}>
                  {rememberMe && (
                    <svg className="w-2.5 h-2.5 text-tiletext" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="-translate-y-px">Remember me</span>
              </label>
            )}
          </>
        )}

        <button
          onClick={submit}
          disabled={submitting}
          className="w-full py-2.5 rounded-lg bg-accent text-tiletext font-semibold shadow-[0_3px_0_rgba(0,0,0,0.35)] hover:brightness-110 active:translate-y-[3px] active:shadow-none disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 transition-all duration-100"
        >
          {submitting ? "Working..." :
            mode === "login" ? "Log in" :
            mode === "register" ? "Sign up" :
            mode === "forgot" ? "Send reset link" :
            "Reset password"}
        </button>

        {status && (
          <div className={`text-sm px-3 py-2 rounded-lg text-center ${status.type === "error" ? "bg-error/10 text-error" : "bg-success/10 text-success"}`}>
            {status.message}
          </div>
        )}

        {(mode === "login" || mode === "register") && (
          <button onClick={switchMode} className="text-sm text-muted hover:text-fg transition">
            {mode === "login" ? "Need an account? Sign up" : "Have an account? Log in"}
          </button>
        )}

        {mode === "login" && (
          <button onClick={() => { setMode("forgot"); setStatus(null); }} className="text-xs text-muted hover:text-fg transition -mt-2">
            Forgot password?
          </button>
        )}

        {(mode === "forgot" || mode === "reset") && (
          <button onClick={() => { setMode("login"); setStatus(null); }} className="text-sm text-muted hover:text-fg transition">
            Back to log in
          </button>
        )}
      </div>
    </div>
  );
}
