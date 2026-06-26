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
    <div className="w-full max-w-md lg:w-64 bg-surface border border-border-app/30 rounded-2xl p-4 flex flex-col gap-5">
      <div>
        <h3 className="text-sm font-semibold tracking-widest uppercase text-muted text-center pb-3 border-b border-border-app/40">Statistics</h3>
        {stats ? (
          <>
            <div className="flex gap-3 mb-3 justify-center">
              <Stat label="Played" value={stats.played} />
              <Stat label="Win %" value={winPct} />
              <Stat label="Streak" value={stats.currentStreak} />
              <Stat label="Max" value={stats.maxStreak} />
            </div>
            <div className="flex flex-col gap-1">
              {stats.distribution.map((count, i) => {
                const pct = maxBar > 0 ? (count / maxBar) * 100 : 0;
                return (
                  <div key={i} className="flex items-center gap-2 text-[13px]">
                    <span className="w-3 text-right text-muted">{i + 1}</span>
                    <div className="flex-1 bg-surface rounded-sm">
                      {count > 0 && (
                        <div
                          className="bg-correct text-tiletext text-right font-semibold rounded-sm px-2 py-0.5"
                          style={{ width: `${Math.max(pct, 8)}%`, minWidth: 24, boxSizing: "border-box" }}
                        >
                          {count}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-[13px] text-muted">No stats yet</p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-[22px] font-bold text-fg">{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}
