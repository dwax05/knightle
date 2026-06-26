import { useEffect, useState } from "react";
import { useAuth } from "./auth";

type Entry = {
  name: string;
  wins: number;
  played: number;
  maxStreak: number;
  isMe: boolean;
};

export function Leaderboard({ refreshKey }: { refreshKey: number }) {
  const { authedPost } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await authedPost("/api/leaderboard", {});
      if (cancelled) return;
      if (data.leaderboard) setEntries(data.leaderboard);
    })();
    return () => { cancelled = true; };
  }, [refreshKey, authedPost]);

  const medal = (i: number) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`);

  return (
    <div className="w-full max-w-md lg:w-64 bg-surface border border-border-app/30 rounded-2xl p-4 flex flex-col gap-3">
      <h3 className="text-sm font-semibold tracking-widest uppercase text-muted text-center pb-3 border-b border-border-app/40">Leaderboard</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-muted">No wins yet — be the first!</p>
      ) : (
        <div className="flex flex-col gap-1">
          {entries.map((e, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${e.isMe ? "bg-accent/15 border border-accent/40" : "bg-surface"
                }`}
            >
              <span className="w-6 text-center font-semibold">{medal(i)}</span>
              <span className="flex-1 truncate text-fg">{e.name}</span>
              <span className="font-bold text-fg">{e.wins}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
