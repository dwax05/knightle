import { useEffect, useRef, useState } from "react";

type Mark = "correct" | "present" | "absent";
const ROWS = 6;
const COLS = 5;
export const FLIP_DURATION = 500;  // ms — must match @keyframes flip-tile
export const TILE_STAGGER = 100;   // ms between each tile in the row

const MARK_CLASSES: Record<Mark, string> = {
  correct: "bg-correct text-tiletext border-correct",
  present: "bg-present text-tiletext border-present",
  absent: "bg-absent text-tiletext border-absent",
};

const KEYS = [
  "qwertyuiop".split(""),
  "asdfghjkl".split(""),
  ["enter", ..."zxcvbnm".split(""), "back"],
];

export type { Mark };
export { COLS };

export function Board({
  guesses,
  marks,
  current,
  done,
  onKeyPress,
  revealingRow,
}: {
  guesses: string[];
  marks: Mark[][];
  current: string;
  done: boolean;
  onKeyPress: (key: string) => void;
  revealingRow: number;
}) {
  const [revealedCols, setRevealedCols] = useState<Set<number>>(new Set());
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function toKeyId(e: KeyboardEvent): string | null {
      if (e.key === "Enter") return "enter";
      if (e.key === "Backspace") return "back";
      if (/^[a-zA-Z]$/.test(e.key)) return e.key.toLowerCase();
      return null;
    }
    function onDown(e: KeyboardEvent) {
      const id = toKeyId(e);
      if (!id) return;
      setPressedKey(id);
      if (pressTimer.current) clearTimeout(pressTimer.current);
      pressTimer.current = setTimeout(() => setPressedKey(null), 150);
    }
    function onUp(e: KeyboardEvent) {
      const id = toKeyId(e);
      if (id) setPressedKey((prev) => (prev === id ? null : prev));
    }
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      if (pressTimer.current) clearTimeout(pressTimer.current);
    };
  }, []);

  useEffect(() => {
    if (revealingRow < 0) {
      setRevealedCols(new Set());
      return;
    }
    setRevealedCols(new Set());
    const timers = Array.from({ length: COLS }, (_, col) =>
      setTimeout(
        () => setRevealedCols((prev) => new Set([...prev, col])),
        col * TILE_STAGGER + FLIP_DURATION / 2
      )
    );
    return () => timers.forEach(clearTimeout);
  }, [revealingRow]);

  function rowLetters(row: number): { ch: string; mark?: Mark }[] {
    if (row < guesses.length)
      return guesses[row].split("").map((ch, i) => ({ ch, mark: marks[row][i] }));
    if (row === guesses.length && !done)
      return Array.from({ length: COLS }, (_, i) => ({ ch: current[i] ?? "" }));
    return Array.from({ length: COLS }, () => ({ ch: "" }));
  }

  const keyState: Record<string, Mark> = {};
  guesses.forEach((g, r) => {
    g.split("").forEach((ch, i) => {
      const m = marks[r][i];
      const rank = { correct: 3, present: 2, absent: 1 };
      if (!keyState[ch] || rank[m] > rank[keyState[ch]]) keyState[ch] = m;
    });
  });

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md">
      <div className="grid gap-1.5">
        {Array.from({ length: ROWS }, (_, r) => (
          <div key={r} className="flex gap-1.5">
            {rowLetters(r).map((cell, c) => {
              const isRevealing = r === revealingRow;
              // show the mark color only once the tile has passed its flip midpoint
              const showMark = cell.mark && (r !== revealingRow || revealedCols.has(c));
              const colorClass = showMark
                ? MARK_CLASSES[cell.mark!]
                : cell.ch
                  ? "border-border-app text-fg"
                  : "border-border-app/40 text-fg";

              return (
                <div
                  key={c}
                  className={`w-14 h-14 sm:w-15 sm:h-15 lg:w-16 lg:h-16 flex items-center justify-center text-2xl font-bold uppercase rounded border-2 ${colorClass} ${isRevealing ? "animate-flip-tile" : ""}`}
                  style={isRevealing ? { animationDelay: `${c * TILE_STAGGER}ms` } : undefined}
                >
                  {cell.ch}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1 sm:gap-1.5 w-full mt-2">
        {KEYS.map((row, i) => (
          <div key={i} className="flex justify-center gap-1 sm:gap-1.5">
            {row.map((key) => {
              const wide = key === "enter" || key === "back";
              const state = keyState[key];
              const bg = state ? MARK_CLASSES[state] : "bg-bg text-fg";
              return (
                <button
                  key={key}
                  onClick={() => onKeyPress(key)}
                  className={`${wide ? "px-2 sm:px-3 text-xs" : "flex-1 min-w-8 sm:min-w-8"} h-13 sm:h-14 rounded font-semibold uppercase ${bg} hover:bg-surface hover:brightness-110 active:scale-95 active:brightness-75 transition-all duration-75 ${pressedKey === key ? "scale-95 brightness-75" : ""}`}
                >
                  {key === "back" ? "⌫" : key}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
