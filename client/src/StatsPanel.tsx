import { useEffect, useState } from "react";
import { useAuth } from "./auth";

type Stats = {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  distribution: number[];
};

export function StatsPanel({ refreshKey }: { refreshKey: number }) {
  const { authedPost } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await authedPost("/api/stats", {});
      if (cancelled) return;
      if (s.stats) setStats(s.stats);
    })();
    return () => { cancelled = true; };
  }, [refreshKey, authedPost]);

  const winPct = stats && stats.played
    ? Math.round((stats.wins / stats.played) * 100)
    : 0;
  const maxBar = stats ? Math.max(1, ...stats.distribution) : 1;

  return (
    <div style={{ width: 260, display: "grid", gap: 20 }}>
      <div>
        <h3 style={{ margin: "0 0 8px" }}>Statistics</h3>
        {stats ? (
          <>
            <div style={{ display: "flex", gap: 12, marginBottom: 12, justifyContent: "center" }}>
              <Stat label="Played" value={stats.played} />
              <Stat label="Win %" value={winPct} />
              <Stat label="Streak" value={stats.currentStreak} />
              <Stat label="Max" value={stats.maxStreak} />
            </div>
            <div style={{ display: "grid", gap: 4 }}>
              {stats.distribution.map((count, i) => {
                const pct = maxBar > 0 ? (count / maxBar) * 100 : 0;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <span style={{ width: 12, textAlign: "right", color: "var(--muted)" }}>{i + 1}</span>
                    <div style={{ flex: 1, background: "var(--surface)", borderRadius: 2 }}>
                      <div
                        style={{
                          background: count > 0 ? "var(--tile-correct)" : "transparent",
                          color: "var(--tile-text)",
                          textAlign: "right",
                          padding: count > 0 ? "2px 8px" : "2px 0",
                          width: count > 0 ? `${Math.max(pct, 8)}%` : "0%",
                          minWidth: count > 0 ? 24 : 0,
                          borderRadius: 2,
                          boxSizing: "border-box",
                          fontWeight: 600,
                        }}
                      >
                        {count > 0 ? count : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p style={{ fontSize: 13, color: "var(--muted)" }}>No stats yet</p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--muted)" }}>{label}</div>
    </div>
  );
}
