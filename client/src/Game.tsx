import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "./auth";
import { Board, COLS, FLIP_DURATION, TILE_STAGGER, type Mark } from "./Board";
import { GameResult } from "./GameResult";

const REVEAL_TOTAL = (COLS - 1) * TILE_STAGGER + FLIP_DURATION + 50;

export function Game({ onGameEnd }: { onGameEnd?: () => void }) {
  const { authedPost } = useAuth();
  const [gameId, setGameId] = useState<string | null>(null);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [marks, setMarks] = useState<Mark[][]>([]);
  const [current, setCurrent] = useState("");
  const [done, setDone] = useState<null | "won" | "lost">(null);
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("");
  const [revealingRow, setRevealingRow] = useState(-1);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function newGame() {
    if (revealTimer.current) clearTimeout(revealTimer.current);
    const data = await authedPost("/api/newgame", {});
    if (data.error) return setMessage(data.error);
    setGameId(data.gameId);
    setGuesses([]); setMarks([]); setCurrent(""); setDone(null);
    setAnswer(""); setMessage(""); setRevealingRow(-1);
  }

  useEffect(() => { newGame(); }, []);
  useEffect(() => () => { if (revealTimer.current) clearTimeout(revealTimer.current); }, []);

  const submitGuess = useCallback(async () => {
    if (current.length !== COLS || !gameId || done || revealingRow >= 0) return;
    const data = await authedPost("/api/guess", { gameId, guess: current });
    if (data.error) { setMessage(data.error); return; }

    const rowIdx = guesses.length;
    setMessage("");
    setGuesses((g) => [...g, current]);
    setMarks((m) => [...m, data.marks]);
    setCurrent("");
    setRevealingRow(rowIdx);

    revealTimer.current = setTimeout(() => {
      setRevealingRow(-1);
      if (data.won) { setDone("won"); onGameEnd?.(); }
      else if (data.lost) { setDone("lost"); setAnswer(data.answer ?? ""); onGameEnd?.(); }
    }, REVEAL_TOTAL);
  }, [current, gameId, done, revealingRow, guesses.length, authedPost, onGameEnd]);

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
      <Board
        guesses={guesses}
        marks={marks}
        current={current}
        done={!!done}
        onKeyPress={onKeyPress}
        revealingRow={revealingRow}
      />
      <div className="min-h-6 font-semibold text-fg">{message}</div>
      {done && (
        <GameResult
          outcome={done}
          guessCount={guesses.length}
          answer={answer}
          onNewGame={newGame}
        />
      )}
    </div>
  );
}
