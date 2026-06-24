import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./auth";

type Mark = "correct" | "present" | "absent";
const ROWS = 6;
const COLS = 5;

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

export function Game({ onGameEnd }: { onGameEnd?: () => void }) {
  const { authedPost } = useAuth();
  const [gameId, setGameId] = useState<string | null>(null);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [marks, setMarks] = useState<Mark[][]>([]);
  const [current, setCurrent] = useState("");
  const [done, setDone] = useState<null | "won" | "lost">(null);
  const [message, setMessage] = useState("");

  async function newGame() {
    const data = await authedPost("/api/newgame", {});
    if (data.error) return setMessage(data.error);
    setGameId(data.gameId);
    setGuesses([]); setMarks([]); setCurrent(""); setDone(null); setMessage("");
  }

  useEffect(() => { newGame(); }, []);

  const submitGuess = useCallback(async () => {
    if (current.length !== COLS || !gameId || done) return;
    const data = await authedPost("/api/guess", { gameId, guess: current });
    if (data.error) { setMessage(data.error); return; }
    setMessage("");
    setGuesses((g) => [...g, current]);
    setMarks((m) => [...m, data.marks]);
    setCurrent("");
    if (data.won) { setDone("won"); setMessage("You got it!"); onGameEnd?.(); }
    else if (data.lost) { setDone("lost"); setMessage(`The word was ${data.answer.toUpperCase()}`); onGameEnd?.(); }
  }, [current, gameId, done, authedPost, onGameEnd]);

  // shared input handlers
  const typeLetter = useCallback((ch: string) => {
    if (done) return;
    setCurrent((c) => (c.length < COLS ? c + ch.toLowerCase() : c));
  }, [done]);

  const backspace = useCallback(() => {
    if (done) return;
    setCurrent((c) => c.slice(0, -1));
  }, [done]);

  function onKeyPress(key: string) {
    if (key === "enter") submitGuess();
    else if (key === "back") backspace();
    else typeLetter(key);
  }

  // physical keyboard reuses the same handlers
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done) return;
      if (e.key === "Enter") submitGuess();
      else if (e.key === "Backspace") backspace();
      else if (/^[a-zA-Z]$/.test(e.key)) typeLetter(e.key);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, submitGuess, backspace, typeLetter]);

  function rowLetters(row: number): { ch: string; mark?: Mark }[] {
    if (row < guesses.length)
      return guesses[row].split("").map((ch, i) => ({ ch, mark: marks[row][i] }));
    if (row === guesses.length && !done)
      return Array.from({ length: COLS }, (_, i) => ({ ch: current[i] ?? "" }));
    return Array.from({ length: COLS }, () => ({ ch: "" }));
  }

  // build a map of letter -> best known state for keyboard coloring
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
      {/* grid */}
      <div className="grid gap-1.5">
        {Array.from({ length: ROWS }, (_, r) => (
          <div key={r} className="flex gap-1.5">
            {rowLetters(r).map((cell, c) => (
              <div
                key={c}
                className={`w-15 h-15 sm:w-16 sm:h-16 flex items-center justify-center text-2xl font-bold uppercase rounded border-2 ${cell.mark
                  ? MARK_CLASSES[cell.mark]
                  : cell.ch
                    ? "border-border-app text-fg"
                    : "border-border-app/40 text-fg"
                  }`}
              >
                {cell.ch}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="min-h-6 font-semibold text-fg">{message}</div>
      {done && (
        <button onClick={newGame} className="px-4 py-2 rounded-lg bg-accent text-tiletext font-semibold">
          New game
        </button>
      )}

      {/* on-screen keyboard */}
      <div className="flex flex-col gap-1.5 w-full mt-2">
        {KEYS.map((row, i) => (
          <div key={i} className="flex justify-center gap-1.5">
            {row.map((key) => {
              const wide = key === "enter" || key === "back";
              const state = keyState[key];
              const bg = state ? MARK_CLASSES[state] : "bg-surface text-fg";
              return (
                <button
                  key={key}
                  onClick={() => onKeyPress(key)}
                  className={`${wide ? "px-3 text-xs" : "flex-1 min-w-8"} h-14 rounded font-semibold uppercase ${bg} active:opacity-70`}
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
