import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./auth";
import { Board, COLS, type Mark } from "./Board";

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

  const typeLetter = useCallback((ch: string) => {
    if (done) return;
    setCurrent((c) => (c.length < COLS ? c + ch.toLowerCase() : c));
  }, [done]);

  const backspace = useCallback(() => {
    if (done) return;
    setCurrent((c) => c.slice(0, -1));
  }, [done]);

  const onKeyPress = useCallback((key: string) => {
    if (key === "enter") submitGuess();
    else if (key === "back") backspace();
    else typeLetter(key);
  }, [submitGuess, backspace, typeLetter]);

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

  return (
    <div className="flex flex-col items-center gap-4">
      <Board guesses={guesses} marks={marks} current={current} done={!!done} onKeyPress={onKeyPress} />
      <div className="min-h-6 font-semibold text-fg">{message}</div>
      {done && (
        <button onClick={newGame} className="px-4 py-2 rounded-lg bg-accent text-tiletext font-semibold">
          New game
        </button>
      )}
    </div>
  );
}
