import { useState } from "react";
import { useAuth } from "./auth";

type Status = { type: "error" | "success"; message: string } | null;

export function AuthForm() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({
    login: "",
    password: "",
    confirm: "",
    firstName: "",
    lastName: "",
  });
  const [status, setStatus] = useState<Status>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  function validate(): string | null {
    if (!form.login.trim()) return "Username is required";
    if (!form.password) return "Password is required";
    if (mode === "register") {
      if (form.password.length < 6)
        return "Password must be at least 6 characters";
      if (form.password !== form.confirm) return "Passwords don't match";
    }
    return null;
  }

  async function submit() {
    setStatus(null);

    const validationError = validate();
    if (validationError) {
      setStatus({ type: "error", message: validationError });
      return;
    }

    setSubmitting(true);
    const err =
      mode === "login"
        ? await login(form.login, form.password)
        : await register(form);
    setSubmitting(false);

    if (err) {
      setStatus({ type: "error", message: err });
    } else {
      setStatus({
        type: "success",
        message:
          mode === "login" ? "Logged in! Loading..." : "Account created!",
      });
    }
    // on success the auth state flips and this form unmounts,
    // so the success message is only briefly visible
  }

  function switchMode() {
    setMode(mode === "login" ? "register" : "login");
    setStatus(null);
    setForm({ ...form, password: "", confirm: "" });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !submitting) submit();
  }

  return (
    <div
      style={{ maxWidth: 320, margin: "4rem auto", display: "grid", gap: 8 }}
      onKeyDown={onKeyDown}
    >
      <h2>{mode === "login" ? "Log in" : "Create account"}</h2>

      {mode === "register" && (
        <>
          <input placeholder="First name" value={form.firstName} onChange={set("firstName")} />
          <input placeholder="Last name" value={form.lastName} onChange={set("lastName")} />
        </>
      )}
      <input placeholder="Username" value={form.login} onChange={set("login")} />
      <input
        placeholder="Password"
        type="password"
        value={form.password}
        onChange={set("password")}
      />
      {mode === "register" && (
        <input
          placeholder="Confirm password"
          type="password"
          value={form.confirm}
          onChange={set("confirm")}
        />
      )}

      <button onClick={submit} disabled={submitting}>
        {submitting
          ? "Working..."
          : mode === "login"
            ? "Log in"
            : "Sign up"}
      </button>

      {status && (
        <p
          style={{
            margin: "4px 0",
            padding: "8px 10px",
            borderRadius: 6,
            fontSize: 14,
            color: status.type === "error" ? "var(--error)" : "var(--success)",
            background: status.type === "error" ? "var(--error-bg)" : "var(--success-bg)",
          }}
        >
          {status.message}
        </p>
      )}

      <button
        onClick={switchMode}
        style={{ background: "none", border: "none", color: "#666", cursor: "pointer" }}
      >
        {mode === "login"
          ? "Need an account? Sign up"
          : "Have an account? Log in"}
      </button>
    </div>
  );
}
