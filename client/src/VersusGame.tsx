import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "./auth";
import { Board, COLS, type Mark } from "./Board";
import { VersusResult } from "./VersusResult";

type Opponent = { login: string; guessCount: number; finished: boolean; won: boolean } | null;

export function VersusGame({ code, onExit, onRematch }: {
  code: string;
  onExit: () => void;
  onRematch: () => void;
}) {
  const { authedPost, user } = useAuth();
  const [guesses, setGuesses] = useState<string[]>([]);
  const [marks, setMarks] = useState<Mark[][]>([]);
  const [current, setCurrent] = useState("");
  const [finished, setFinished] = useState(false);
  const [message, setMessage] = useState("");
  const [opponent, setOpponent] = useState<Opponent>(null);
  const [winner, setWinner] = useState<number | null>(null);
  const [status, setStatus] = useState("active");
  const [myGuessCount, setMyGuessCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const submitGuess = useCallback(async () => {
    if (current.length !== COLS || finished || status === "done") return;
    const data = await authedPost("/api/versus/guess", { code, guess: current });
    if (data.error) { setMessage(data.error); return; }
    setMessage("");
    setGuesses((g) => [...g, current]);
    setMarks((m) => [...m, data.marks]);
    setMyGuessCount((n) => n + 1);
    setCurrent("");
    if (data.opponent) setOpponent(data.opponent);
    if (data.winner) setWinner(data.winner);
    if (data.status) setStatus(data.status);
    if (data.finished) {
      setFinished(true);
      setMessage(data.won ? "You solved it!" : `The word was ${data.answer?.toUpperCase()}`);
    }
  }, [current, finished, status, code, authedPost]);

  const typeLetter = useCallback((ch: string) => {
    if (finished) return;
    setCurrent((c) => (c.length < COLS ? c + ch.toLowerCase() : c));
  }, [finished]);

  const backspace = useCallback(() => {
    if (finished) return;
    setCurrent((c) => c.slice(0, -1));
  }, [finished]);

  const onKeyPress = useCallback((key: string) => {
    if (key === "enter") submitGuess();
    else if (key === "back") backspace();
    else typeLetter(key);
  }, [submitGuess, backspace, typeLetter]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (finished) return;
      if (e.key === "Enter") submitGuess();
      else if (e.key === "Backspace") backspace();
      else if (/^[a-zA-Z]$/.test(e.key)) typeLetter(e.key);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished, submitGuess, backspace, typeLetter]);

  // poll opponent state every 1.5s
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      const data = await authedPost("/api/versus/state", { code });
      if (data.opponent) setOpponent(data.opponent);
      if (data.winner) setWinner(data.winner);
      if (data.status) setStatus(data.status);
    }, 1500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [code, authedPost]);

  const myId = user?.id;
  const isDone = status === "done";
  const youWon = winner != null && String(winner) === String(myId);

  // winner's guess count: if you won, your count; else opponent's
  const winnerGuesses = youWon ? myGuessCount : (opponent?.guessCount ?? 0);
  const winnerName = youWon ? "You" : (opponent?.login ?? "Opponent");

  return (
    <div className="max-w-xl mx-auto mt-8 flex flex-col items-center gap-4">
      <h2 className="text-2xl font-bold text-fg">Versus — Room {code}</h2>

      <div className="w-full max-w-md flex items-center justify-between px-3 py-2 rounded-lg bg-surface text-sm">
        <span className="text-fg font-semibold">
          {opponent ? opponent.login : "Waiting for opponent..."}
        </span>
        {opponent && (
          <span className="text-muted">
            {opponent.finished
              ? opponent.won ? "solved" : "failed"
              : `guess ${opponent.guessCount}/6`}
          </span>
        )}
      </div>

      <Board guesses={guesses} marks={marks} current={current} done={finished || isDone} onKeyPress={onKeyPress} />

      <div className="min-h-6 font-semibold text-fg">{message}</div>

      <button onClick={onExit} className="text-sm text-muted hover:text-fg transition">
        ← Leave match
      </button>

      {isDone && (
        <VersusResult
          result={{
            youWon,
            winnerName,
            winnerGuesses,
            isDraw: winner == null,
          }}
          onRematch={onRematch}
          onLeave={onExit}
        />
      )}
    </div>
  );
}
