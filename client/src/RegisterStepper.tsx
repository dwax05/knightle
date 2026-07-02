import { useState, useRef } from "react";
import { useAuth } from "./auth";
import Stepper, { Step } from "./Stepper";

interface Props {
  onSwitch: () => void; // back to login
}

const inputClass =
  "w-full px-3 py-2.5 rounded-lg bg-bg text-fg border border-border-app/60 " +
  "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 " +
  "placeholder:text-muted transition";

export function RegisterStepper({ onSwitch }: Props) {
  const { loginWithTokens } = useAuth();

  const [form, setForm] = useState({ login: "", email: "", password: "", confirm: "" });
  const [otp, setOtp] = useState("");
  const [pendingLogin, setPendingLogin] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [resendStatus, setResendStatus] = useState<"idle" | "sent" | "error">("idle");
  const otpRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function setStepError(step: number, msg: string) {
    setErrors((e) => ({ ...e, [step]: msg }));
    return false;
  }

  async function onBeforeNext(step: number): Promise<boolean> {
    setErrors((e) => ({ ...e, [step]: "" }));

    if (step === 1) {
      if (!form.login.trim()) return setStepError(1, "Username is required");
      if (!/^[a-zA-Z0-9_-]{3,20}$/.test(form.login))
        return setStepError(1, "Username must be 3–20 characters: letters, numbers, _ or -");
      if (!form.email.trim()) return setStepError(1, "Email is required");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        return setStepError(1, "Invalid email address");

      const res = await fetch("/api/check-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: form.login, email: form.email }),
      });
      const data = await res.json();
      if (!data.usernameAvailable) return setStepError(1, "Username already taken");
      if (!data.emailAvailable) return setStepError(1, "Email already registered");

      return true;
    }

    if (step === 2) {
      if (!form.password) return setStepError(2, "Password is required");
      if (form.password.length < 6) return setStepError(2, "Password must be at least 6 characters");
      if (form.password !== form.confirm) return setStepError(2, "Passwords don't match");

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: form.login, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (data.error) return setStepError(2, data.error);

      setPendingLogin(data.login);
      setOtp("");
      setTimeout(() => otpRef.current?.focus(), 50);
      return true;
    }

    if (step === 3) {
      if (!otp.trim()) return setStepError(3, "Enter the 6-digit code");

      const res = await fetch("/api/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: pendingLogin, code: otp }),
      });
      const data = await res.json();
      if (data.error) return setStepError(3, data.error);

      loginWithTokens(data);
      return true;
    }

    return true;
  }

  async function resendCode() {
    setResendStatus("idle");
    const res = await fetch("/api/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: pendingLogin }),
    });
    const data = await res.json();
    setResendStatus(data.error ? "error" : "sent");
  }

  return (
    <>
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-fg mb-1">Knightle</h1>
        <p className="text-sm text-muted">Create your account</p>
      </div>

      <Stepper
        onBeforeNext={onBeforeNext}
        disableStepIndicators
        completeButtonText="Verify"
      >
        {/* Step 1 — Username + Email */}
        <Step>
          <div className="flex flex-col gap-4">
            <input
              className={inputClass}
              placeholder="Username"
              value={form.login}
              onChange={set("login")}
              autoComplete="username"
            />
            <input
              className={inputClass}
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={set("email")}
              autoComplete="email"
            />
            {errors[1] && <p className="text-sm text-error text-center">{errors[1]}</p>}
          </div>
        </Step>

        {/* Step 2 — Password */}
        <Step>
          <div className="flex flex-col gap-4">
            <input
              className={inputClass}
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={set("password")}
              autoComplete="new-password"
            />
            <input
              className={inputClass}
              type="password"
              placeholder="Confirm password"
              value={form.confirm}
              onChange={set("confirm")}
              autoComplete="new-password"
            />
            {errors[2] && <p className="text-sm text-error text-center">{errors[2]}</p>}
          </div>
        </Step>

        {/* Step 3 — Email verification */}
        <Step>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted text-center">
              We sent a 6-digit code to <span className="text-fg">{form.email}</span>
            </p>
            <input
              ref={otpRef}
              className={`${inputClass} text-center tracking-[0.4em] font-mono text-lg`}
              placeholder="000000"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            {errors[3] && <p className="text-sm text-error text-center">{errors[3]}</p>}
            <button
              onClick={resendCode}
              className="text-xs text-muted hover:text-fg transition text-center"
            >
              {resendStatus === "sent" ? "Code sent!" : resendStatus === "error" ? "Failed — try again" : "Resend code"}
            </button>
          </div>
        </Step>
      </Stepper>

      <button onClick={onSwitch} className="text-sm text-muted hover:text-fg transition mt-2 w-full text-center">
        Have an account? Log in
      </button>
    </>
  );
}
