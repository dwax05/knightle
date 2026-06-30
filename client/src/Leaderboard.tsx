import { useEffect, useState } from "react";
import { useAuth } from "./auth";

type Entry = {
  name: string;
  wins: number;
  played: number;
  maxStreak: number;
  isMe: boolean;
};

type Tab = "wins" | "streak";

function loadCache(key: string): Entry[] {
  try {
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : [];
  } catch { return []; }
}

export function Leaderboard({ refreshKey }: { refreshKey: number }) {
  const { authedPost } = useAuth();
  const [tab, setTab] = useState<Tab>("wins");
  const [winEntries, setWinEntries] = useState<Entry[]>(() => loadCache("cache:leaderboard:wins"));
  const [streakEntries, setStreakEntries] = useState<Entry[]>(() => loadCache("cache:leaderboard:streak"));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [winsData, streakData] = await Promise.all([
        authedPost("/api/leaderboard", { sort: "wins" }),
        authedPost("/api/leaderboard", { sort: "streak" }),
      ]);
      if (cancelled) return;
      if (winsData.leaderboard) {
        setWinEntries(winsData.leaderboard);
        localStorage.setItem("cache:leaderboard:wins", JSON.stringify(winsData.leaderboard));
      }
      if (streakData.leaderboard) {
        setStreakEntries(streakData.leaderboard);
        localStorage.setItem("cache:leaderboard:streak", JSON.stringify(streakData.leaderboard));
      }
    })();
    return () => { cancelled = true; };
  }, [refreshKey, authedPost]);

  const entries = tab === "wins" ? winEntries : streakEntries;

  const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];
  const medal = (i: number) =>
    i < 3
      ? <span style={{ color: MEDAL_COLORS[i] }} className="font-bold">{i + 1}</span>
      : `${i + 1}`;

  return (
    <div className="w-full max-w-md lg:w-64 bg-surface border border-border-app/30 rounded-2xl p-4 flex flex-col gap-3 shadow-lg shadow-black/40">
      <h3 className="text-sm font-semibold tracking-widest uppercase text-muted text-center pb-3 border-b border-border-app/40">Leaderboard</h3>
      <div className="flex items-center gap-1 p-1 bg-bg rounded-xl">
        {(["wins", "streak"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors duration-150 ${tab === t ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"}`}
          >
            {t === "wins" ? "Total Wins" : "Best Streak"}
          </button>
        ))}
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-muted">No wins yet — be the first!</p>
      ) : (
        <div className="flex flex-col gap-1">
          {entries.map((e, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${e.isMe ? "bg-accent/15 border border-accent/40" : "bg-surface"}`}
            >
              <span className="w-6 text-center font-semibold">{medal(i)}</span>
              <span className="flex-1 truncate text-fg">{e.name}</span>
              <span className="font-bold text-fg">{tab === "wins" ? e.wins : e.maxStreak}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
