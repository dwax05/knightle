import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useAuth } from "./auth";
import Counter from "./Counter";

type Entry = {
  name: string;
  wins: number;
  played: number;
  maxStreak: number;
  isMe: boolean;
};

type Tab = "wins" | "streak" | "today";

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
  const [todayEntries, setTodayEntries] = useState<Entry[]>(() => loadCache("cache:leaderboard:today"));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [winsData, streakData, todayData] = await Promise.all([
        authedPost("/api/leaderboard", { sort: "wins" }),
        authedPost("/api/leaderboard", { sort: "streak" }),
        authedPost("/api/leaderboard", { sort: "today" }),
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
      if (todayData.leaderboard) {
        setTodayEntries(todayData.leaderboard);
        localStorage.setItem("cache:leaderboard:today", JSON.stringify(todayData.leaderboard));
      }
    })();
    return () => { cancelled = true; };
  }, [refreshKey, authedPost]);

  const TAB_ORDER: Tab[] = ["wins", "streak", "today"];
  const prevTabRef = useRef<Tab>(tab);
  const direction = TAB_ORDER.indexOf(tab) > TAB_ORDER.indexOf(prevTabRef.current) ? 1 : -1;

  function switchTab(t: Tab) {
    prevTabRef.current = tab;
    setTab(t);
  }

  const entries = tab === "wins" ? winEntries : tab === "streak" ? streakEntries : todayEntries;

  const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];
  const medal = (i: number) =>
    i < 3
      ? <span style={{ color: MEDAL_COLORS[i] }} className="font-bold">{i + 1}</span>
      : `${i + 1}`;

  return (
    <div className="w-full max-w-md lg:w-64 bg-surface border border-border-app/30 rounded-2xl p-4 flex flex-col gap-3 shadow-lg shadow-black/40">
      <h3 className="text-sm font-semibold tracking-widest uppercase text-muted text-center pb-3 border-b border-border-app/40">Leaderboard</h3>
      <div className="flex items-center gap-1 p-1 bg-bg rounded-xl">
        {(["wins", "streak", "today"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`flex-1 px-1 py-2 rounded-lg text-xs font-semibold transition-colors duration-150 whitespace-nowrap ${tab === t ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"}`}
          >
            {t === "wins" ? "Total Wins" : t === "streak" ? "Best Streak" : "Today"}
          </button>
        ))}
      </div>
      <div className="overflow-hidden">
        <AnimatePresence mode="popLayout" custom={direction}>
          <motion.div
            key={tab}
            custom={direction}
            variants={{
              enter: (d: number) => ({ x: `${d * 30}%`, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: `${d * -30}%`, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="flex flex-col gap-1"
          >
            {Array.from({ length: 5 }, (_, i) => {
              const e = entries[i];
              return e ? (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${e.isMe ? "bg-accent/15 border border-accent/40" : "bg-surface"}`}
                >
                  <span className="w-6 text-center font-semibold">{medal(i)}</span>
                  <span className="flex-1 truncate text-fg">{e.name}</span>
                  <Counter
                    value={tab === "streak" ? e.maxStreak : e.wins}
                    fontSize={14}
                    gap={0}
                    horizontalPadding={0}
                    borderRadius={0}
                    gradientHeight={0}
                    fontWeight="bold"
                  />
                </div>
              ) : (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm opacity-20">
                  <span className="w-6 text-center font-semibold text-muted">{i + 1}</span>
                  <div className="flex-1 h-3 rounded bg-muted/50" />
                  <div className="w-4 h-3 rounded bg-muted/50" />
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
