import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "./auth";
import { Board, COLS, FLIP_DURATION, TILE_STAGGER, type Mark } from "./Board";
import { VersusResult } from "./VersusResult";
import { type VersusMode } from "./Versus";
import { IconLightning, IconTarget } from "./icons";

const REVEAL_TOTAL = (COLS - 1) * TILE_STAGGER + FLIP_DURATION + 50;

type Opponent = { login: string; guessCount: number; finished: boolean; won: boolean } | null;

export function VersusGame({ code, mode: initialMode, onExit }: {
  code: string;
  mode: VersusMode;
  onExit: () => void;
}) {
  const { authedPost, user } = useAuth();
  const [guesses, setGuesses] = useState<string[]>([]);
  const [marks, setMarks] = useState<Mark[][]>([]);
  const [current, setCurrent] = useState("");
  const [finished, setFinished] = useState(false);
  const [won, setWon] = useState(false);
  const [message, setMessage] = useState("");
  const [opponent, setOpponent] = useState<Opponent>(null);
  const [winner, setWinner] = useState<number | null>(null);
  const [status, setStatus] = useState("active");
  const [round, setRound] = useState(0);
  const [rematchMe, setRematchMe] = useState(false);
  const [rematchOpponent, setRematchOpponent] = useState(false);
  const [revealingRow, setRevealingRow] = useState(-1);
  const [mode, setMode] = useState<VersusMode>(initialMode);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const submitGuess = useCallback(async () => {
    if (current.length !== COLS || finished || status === "done" || revealingRow >= 0) return;
    const data = await authedPost("/api/versus/guess", { code, guess: current });
    if (data.error) { setMessage(data.error); return; }
    setMessage("");
    const rowIdx = guesses.length;
    setGuesses((g) => [...g, current]);
    setMarks((m) => [...m, data.marks]);
    setCurrent("");
    setRevealingRow(rowIdx);
    revealTimer.current = setTimeout(() => {
      setRevealingRow(-1);
      if (data.mode) setMode(data.mode);
      if (data.opponent) setOpponent(data.opponent);
      if (data.winner) setWinner(data.winner);
      if (data.status) setStatus(data.status);
      if (data.finished) {
        setFinished(true);
        if (data.won) setWon(true);
        setMessage(data.won ? "You solved it!" : `The word was ${data.answer?.toUpperCase()}`);
      }
    }, REVEAL_TOTAL);
  }, [current, finished, status, revealingRow, guesses.length, code, authedPost]);

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
    setWon(false);
    setMessage("");
    setWinner(null);
    setStatus("active");
    setRound(newRound);
  }, []);

  const handleRematch = useCallback(async () => {
    const data = await authedPost("/api/versus/rematch", { code });
    if (data.error) { setMessage(data.error); return; }
    setRematchMe(true);
  }, [code, authedPost]);

  const myId = user?.id;

  const bothFinished = finished && (opponent?.finished ?? false);
  const isDone = mode === "precision" ? bothFinished : status === "done";

  const precisionYouWon =
    bothFinished && won && (!opponent?.won || guesses.length < (opponent?.guessCount ?? Infinity));
  const precisionIsDraw =
    bothFinished &&
    ((!won && !(opponent?.won ?? false)) ||
      (won && (opponent?.won ?? false) && guesses.length === (opponent?.guessCount ?? 0)));

  const youWon = mode === "precision"
    ? precisionYouWon
    : winner != null && String(winner) === String(myId);
  const isDraw = mode === "precision" ? precisionIsDraw : winner == null;

  useEffect(() => {
    let cancelled = false;
    authedPost("/api/versus/state", { code }).then((data) => {
      if (cancelled || data.error) return;
      if (data.myGuesses?.length) {
        setGuesses(data.myGuesses);
        setMarks(data.myMarks ?? []);
      }
      if (data.myFinished) {
        setFinished(true);
        if (data.myWon) { setWon(true); setMessage("You solved it!"); }
        else if (data.answer) setMessage(`The word was ${data.answer.toUpperCase()}`);
      }
      if (data.opponent) setOpponent(data.opponent);
      if (data.winner !== undefined) setWinner(data.winner);
      if (data.status) setStatus(data.status);
      if (data.round) setRound(data.round);
      if (data.mode) setMode(data.mode);
      if (data.rematch) { setRematchMe(data.rematch.me); setRematchOpponent(data.rematch.opponent); }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "a") { e.preventDefault(); return; }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isDone) { if (e.key === "Enter" && !rematchMe) handleRematch(); return; }
      if (finished) return;
      if (e.key === "Enter") submitGuess();
      else if (e.key === "Backspace") backspace();
      else if (/^[a-zA-Z]$/.test(e.key)) typeLetter(e.key);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished, isDone, rematchMe, handleRematch, submitGuess, backspace, typeLetter]);

  useEffect(() => () => { if (revealTimer.current) clearTimeout(revealTimer.current); }, []);

  useEffect(() => {
    pollRef.current = setInterval(async () => {
      const data = await authedPost("/api/versus/state", { code });
      if (typeof data.round === "number" && data.round > round) {
        resetForNewRound(data.round);
        setRematchMe(false);
        setRematchOpponent(false);
        return;
      }
      if (data.mode) setMode(data.mode);
      if (data.opponent) setOpponent(data.opponent);
      if (data.winner !== undefined) setWinner(data.winner);
      if (data.status) setStatus(data.status);
      if (data.rematch) {
        setRematchMe(data.rematch.me);
        setRematchOpponent(data.rematch.opponent);
      }
    }, 1500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [code, authedPost, round, resetForNewRound]);

  const winnerGuesses = youWon ? guesses.length : (opponent?.guessCount ?? 0);
  const winnerName = youWon ? "You" : (opponent?.login ?? "Opponent");

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <div className="w-full flex items-center gap-2 pb-3 border-b border-border-app/40 px-2 lg:px-0">
        <span className="text-xs font-bold tracking-widest uppercase text-muted">vs</span>
        {opponent ? (
          <>
            <span className="flex-1 text-sm font-semibold text-fg truncate">{opponent.login}</span>
            {opponent.finished
              ? <span className={`text-xs font-semibold ${opponent.won ? "text-correct" : "text-muted"}`}>{opponent.won ? `solved · ${opponent.guessCount}/6` : "failed"}</span>
              : <span className="text-xs text-muted">{opponent.guessCount}/6</span>}
          </>
        ) : (
          <span className="text-sm text-muted animate-pulse">waiting...</span>
        )}
        <span className="flex items-center gap-1 text-xs text-muted/60 ml-auto shrink-0">
          {mode === "speed" ? <IconLightning className="w-3 h-3" /> : <IconTarget className="w-3 h-3" />}
          {mode === "speed" ? "speed" : "precision"}
        </span>
      </div>

      <Board guesses={guesses} marks={marks} current={current} done={finished || isDone} onKeyPress={onKeyPress} revealingRow={revealingRow} />

      <div className="min-h-6 font-semibold text-fg">{message}</div>

      {finished && !isDone && (
        <p className="text-sm text-muted animate-pulse">Waiting for opponent to finish...</p>
      )}

      {isDone && (
        <VersusResult
          mode={mode}
          result={{ youWon, winnerName, winnerGuesses, isDraw }}
          rematchMe={rematchMe}
          rematchOpponent={rematchOpponent}
          onRematch={handleRematch}
          onLeave={onExit}
        />
      )}
    </div>
  );
}
