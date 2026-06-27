import { useState } from "react";
import { useAuth } from "./auth";

type Status = { type: "error" | "success"; message: string } | null;

export function AuthForm() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({
    login: "", password: "", confirm: "", email: "",
  });
  const [status, setStatus] = useState<Status>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  function validate(): string | null {
    if (!form.login.trim()) return "Username is required";
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
    const err = mode === "login"
      ? await login(form.login, form.password)
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div
        className="w-full max-w-sm flex flex-col gap-4 p-8 rounded-2xl bg-surface border border-border-app/40 shadow-lg shadow-black/40"
        onKeyDown={(e) => { if (e.key === "Enter" && !submitting) submit(); }}
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold text-fg mb-1">Knightle</h1>
          <p className="text-sm text-muted">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </p>
        </div>

        {mode === "register" && (
          <input className={inputClass} type="email" placeholder="Email" value={form.email} onChange={set("email")} />
        )}

        <input className={inputClass} placeholder="Username" value={form.login} onChange={set("login")} />
        <input className={inputClass} type="password" placeholder="Password" value={form.password} onChange={set("password")} />

        {mode === "register" && (
          <input className={inputClass} type="password" placeholder="Confirm password" value={form.confirm} onChange={set("confirm")} />
        )}

        <button
          onClick={submit}
          disabled={submitting}
          className="w-full py-2.5 rounded-lg bg-accent text-tiletext font-semibold
                     hover:opacity-90 active:opacity-80 disabled:opacity-50 transition"
        >
          {submitting ? "Working..." : mode === "login" ? "Log in" : "Sign up"}
        </button>

        {status && (
          <div
            className={`text-sm px-3 py-2 rounded-lg text-center ${status.type === "error"
              ? "bg-error/10 text-error"
              : "bg-success/10 text-success"
              }`}
          >
            {status.message}
          </div>
        )}

        <button
          onClick={switchMode}
          className="text-sm text-muted hover:text-fg transition"
        >
          {mode === "login" ? "Need an account? Sign up" : "Have an account? Log in"}
        </button>
      </div>
    </div>
  );
}
