import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "./auth";
import { Board, COLS, type Mark } from "./Board";
import { VersusResult } from "./VersusResult";

type Opponent = { login: string; guessCount: number; finished: boolean; won: boolean } | null;

export function VersusGame({ code, onExit }: {
  code: string;
  onExit: () => void;
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
  const [round, setRound] = useState(0);
  const [rematchMe, setRematchMe] = useState(false);
  const [rematchOpponent, setRematchOpponent] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const submitGuess = useCallback(async () => {
    if (current.length !== COLS || finished || status === "done") return;
    const data = await authedPost("/api/versus/guess", { code, guess: current });
    if (data.error) { setMessage(data.error); return; }
    setMessage("");
    setGuesses((g) => [...g, current]);
    setMarks((m) => [...m, data.marks]);
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

  const resetForNewRound = useCallback((newRound: number) => {
    setGuesses([]);
    setMarks([]);
    setCurrent("");
    setFinished(false);
    setMessage("");
    setWinner(null);
    setStatus("active");
    setRound(newRound);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (isDone) { if (e.key === "Enter" && !rematchMe) handleRematch(); return; }
      if (finished) return;
      if (e.key === "Enter") submitGuess();
      else if (e.key === "Backspace") backspace();
      else if (/^[a-zA-Z]$/.test(e.key)) typeLetter(e.key);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished, isDone, rematchMe, handleRematch, submitGuess, backspace, typeLetter]);

  useEffect(() => {
    pollRef.current = setInterval(async () => {
      const data = await authedPost("/api/versus/state", { code });
      if (typeof data.round === "number" && data.round > round) {
        resetForNewRound(data.round);
        setRematchMe(false);
        setRematchOpponent(false);
        return;
      }
      if (data.opponent) setOpponent(data.opponent);
      if (data.winner) setWinner(data.winner);
      if (data.status) setStatus(data.status);
      if (data.rematch) {
        setRematchMe(data.rematch.me);
        setRematchOpponent(data.rematch.opponent);
      }
    }, 1500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [code, authedPost, round, resetForNewRound]);

  const handleRematch = useCallback(async () => {
    const data = await authedPost("/api/versus/rematch", { code });
    if (data.error) { setMessage(data.error); return; }
    setRematchMe(true);  // reflect our request immediately
  }, [code, authedPost]);

  const myId = user?.id;
  const isDone = status === "done";
  const youWon = winner != null && String(winner) === String(myId);

  // winner's guess count: if you won, your count; else opponent's
  const winnerGuesses = youWon ? guesses.length : (opponent?.guessCount ?? 0);
  const winnerName = youWon ? "You" : (opponent?.login ?? "Opponent");

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <div className="w-full flex items-center justify-between pb-3 border-b border-border-app/40 text-sm px-2 lg:px-0">
        <span className="text-sm font-semibold tracking-widest uppercase text-muted">Opponent</span>
        <span className="text-fg font-semibold">
          {opponent
            ? opponent.finished
              ? opponent.won ? `${opponent.login} solved it` : `${opponent.login} failed`
              : `${opponent.login} — guess ${opponent.guessCount}/6`
            : "Waiting..."}
        </span>
      </div>

      <Board guesses={guesses} marks={marks} current={current} done={finished || isDone} onKeyPress={onKeyPress} revealingRow={-1} />

      <div className="min-h-6 font-semibold text-fg">{message}</div>

      {isDone && (
        <VersusResult
          result={{ youWon, winnerName, winnerGuesses, isDraw: winner == null }}
          rematchMe={rematchMe}
          rematchOpponent={rematchOpponent}
          onRematch={handleRematch}
          onLeave={onExit}
        />
      )}
    </div>
  );
}
