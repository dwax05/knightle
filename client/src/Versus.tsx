import { useEffect, useState, useRef } from "react";
import { useAuth } from "./auth";

type Phase = "lobby" | "waiting";

export function VersusLobbyModal({ onStart, onClose }: { onStart: (code: string) => void; onClose: () => void }) {
  const { authedPost } = useAuth();
  const [phase, setPhase] = useState<Phase>("lobby");
  const [code, setCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const joinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) joinInputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function createRoom() {
    setError(""); setBusy(true);
    const data = await authedPost("/api/versus/create", {});
    setBusy(false);
    if (data.error) return setError(data.error);
    setCode(data.code);
    setPhase("waiting");
  }

  async function joinRoom() {
    setError(""); setBusy(true);
    const data = await authedPost("/api/versus/join", { code: joinCode.toUpperCase() });
    setBusy(false);
    if (data.error) return setError(data.error);
    onStart(data.code);
  }

  useEffect(() => {
    if (phase !== "waiting" || !code) return;
    pollRef.current = setInterval(async () => {
      const data = await authedPost("/api/versus/state", { code });
      if (data.status === "active") {
        if (pollRef.current) clearInterval(pollRef.current);
        onStart(code);
      }
    }, 1500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [phase, code, authedPost, onStart]);

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-sm">
          {phase === "lobby" ? (
            <div className="flex flex-col gap-5 p-8 rounded-2xl bg-surface border border-border-app/40 shadow-xl shadow-black/60 animate-slide-down">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-fg">Versus</h2>
                <p className="text-sm text-muted">Race a friend to the same word</p>
              </div>
              <button onClick={createRoom} disabled={busy} className="w-full py-2.5 rounded-lg bg-accent text-tiletext font-semibold hover:opacity-90 disabled:opacity-50 transition">
                {busy ? "Creating..." : "Create a room"}
              </button>
              <div className="flex items-center gap-3 text-muted text-sm">
                <div className="flex-1 h-px bg-border-app/40" />
                or
                <div className="flex-1 h-px bg-border-app/40" />
              </div>
              <div className="flex gap-2">
                <input
                  ref={joinInputRef}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === "Enter" && joinCode.length === 4 && !busy) joinRoom(); }}
                  placeholder="ENTER CODE"
                  maxLength={4}
                  className="flex-1 px-3 py-2.5 rounded-lg bg-bg text-fg border border-border-app/60 focus:border-accent focus:outline-none uppercase tracking-widest text-center font-mono"
                />
                <button onClick={joinRoom} disabled={busy || joinCode.length !== 4} className="px-4 py-2.5 rounded-lg bg-bg text-fg border border-border-app hover:opacity-80 disabled:opacity-40 transition font-semibold">
                  Join
                </button>
              </div>
              {error && <p className="text-sm text-error text-center">{error}</p>}
              <button onClick={onClose} className="text-sm text-muted hover:text-fg transition">
                ← Back
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-5 p-8 rounded-2xl bg-surface border border-border-app/40 shadow-xl shadow-black/60 text-center animate-slide-down">
              <h2 className="text-2xl font-bold text-fg">Room created</h2>
              <p className="text-sm text-muted">Share this code with your opponent</p>
              <div className="text-5xl font-bold tracking-[0.3em] text-accent font-mono py-4">{code}</div>
              <p className="text-sm text-muted animate-pulse">Waiting for opponent to join...</p>
              <button onClick={onClose} className="text-sm text-muted hover:text-fg transition">Cancel</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
