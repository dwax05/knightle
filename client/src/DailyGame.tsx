import { useEffect, useRef, useState, useCallback } from "react";
import { flushSync } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "./auth";
import { Board, COLS, FLIP_DURATION, TILE_STAGGER, type Mark } from "./Board";
import { IconArrowLeft, IconTrophy, IconSkull, IconClipboard, IconExpand, IconCompress } from "./icons";

const REVEAL_TOTAL = (COLS - 1) * TILE_STAGGER + FLIP_DURATION + 50;

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // execCommand fallback for iOS Safari / WKWebView
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(ta);
  if (!ok) throw new Error("copy failed");
}

const MARK_EMOJI: Record<Mark, string> = {
  correct: "🟩",
  present: "🟨",
  absent: "⬛",
};

function buildShareText(dayNumber: number, won: boolean, marks: Mark[][]): string {
  const result = won ? String(marks.length) : "X";
  const grid = marks
    .map((row) => row.map((m) => MARK_EMOJI[m]).join(""))
    .join("\n");
  return `Knightle Daily #${dayNumber} ${result}/6\n\n${grid}`;
}

type GuestState = {
  guesses: string[];
  marks: Mark[][];
  done: boolean;
  won: boolean;
  answer: string;
};

function loadGuestState(date: string): GuestState | null {
  try {
    const raw = localStorage.getItem(`daily:${date}`);
    return raw ? (JSON.parse(raw) as GuestState) : null;
  } catch { return null; }
}

function saveGuestState(date: string, state: GuestState) {
  try { localStorage.setItem(`daily:${date}`, JSON.stringify(state)); } catch {}
}

async function guestGuess(guess: string, guessNum: number) {
  const res = await fetch("/api/daily/guest/guess", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guess, guessNum }),
  });
  return res.json();
}

export function DailyGame({ onClose, onGameEnd, guest = false }: { onClose: () => void; onGameEnd?: () => void; guest?: boolean }) {
  const { authedPost } = useAuth();
  const [dayNumber, setDayNumber] = useState(0);
  const [date, setDate] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [marks, setMarks] = useState<Mark[][]>([]);
  const [current, setCurrent] = useState("");
  const [done, setDone] = useState<null | "won" | "lost">(null);
  const [showResult, setShowResult] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("");
  const [copiedHeader, setCopiedHeader] = useState(false);
  const [copiedOverlay, setCopiedOverlay] = useState(false);
  const copiedHeaderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedOverlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shakingRow, setShakingRow] = useState(false);
  const shakingRowRef = useRef(false);
  const pendingShake = useRef(false);
  const [revealingRow, setRevealingRow] = useState(-1);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedMarks = useRef<Mark[][]>([]);

  function setShaking(val: boolean) {
    shakingRowRef.current = val;
    setShakingRow(val);
  }

  useEffect(() => {
    let cancelled = false;
    if (guest) {
      fetch("/api/daily/info", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
        .then((r) => r.json())
        .then((data) => {
          if (cancelled || data.error) return;
          setDayNumber(data.dayNumber);
          setDate(data.date);
          const saved = loadGuestState(data.date);
          if (saved) {
            setGuesses(saved.guesses ?? []);
            setMarks(saved.marks ?? []);
            if (saved.done) {
              completedMarks.current = saved.marks ?? [];
              setDone(saved.won ? "won" : "lost");
              setAnswer(saved.answer ?? "");
            }
          }
        });
    } else {
      authedPost("/api/daily/state", {}).then((data) => {
        if (cancelled || data.error) return;
        setDayNumber(data.dayNumber);
        setDate(data.date ?? "");
        setGuesses(data.guesses ?? []);
        setMarks(data.marks ?? []);
        if (data.done) {
          completedMarks.current = data.marks ?? [];
          setDone(data.won ? "won" : "lost");
          setAnswer(data.answer ?? "");
        }
      });
    }
    return () => { cancelled = true; };
  }, [authedPost, guest]);

  useEffect(() => () => { if (revealTimer.current) clearTimeout(revealTimer.current); }, []);

  const submitGuess = useCallback(async () => {
    if (current.length !== COLS || done || revealingRow >= 0) return;

    const data = guest
      ? await guestGuess(current, guesses.length + 1)
      : await authedPost("/api/daily/guess", { guess: current });

    if (data.error) {
      if (data.error === "Not a valid word") {
        if (shakingRowRef.current) { pendingShake.current = true; }
        else { setShaking(true); }
        return;
      }
      setMessage(data.error);
      return;
    }

    setShaking(false);
    const rowIdx = guesses.length;
    setMessage("");
    setGuesses((g) => [...g, current]);
    const newMarks = [...marks, data.marks as Mark[]];
    setMarks(newMarks);
    setCurrent("");
    setRevealingRow(rowIdx);

    const nextGuesses = [...guesses, current];

    revealTimer.current = setTimeout(() => {
      setRevealingRow(-1);
      if (data.won) {
        completedMarks.current = newMarks;
        setDone("won");
        setShowResult(true);
        onGameEnd?.();
        if (guest && date) saveGuestState(date, { guesses: nextGuesses, marks: newMarks, done: true, won: true, answer: "" });
      } else if (data.lost) {
        completedMarks.current = newMarks;
        setDone("lost");
        setAnswer(data.answer ?? "");
        setShowResult(true);
        onGameEnd?.();
        if (guest && date) saveGuestState(date, { guesses: nextGuesses, marks: newMarks, done: true, won: false, answer: data.answer ?? "" });
      } else if (guest && date) {
        saveGuestState(date, { guesses: nextGuesses, marks: newMarks, done: false, won: false, answer: "" });
      }
    }, REVEAL_TOTAL);
  }, [current, done, revealingRow, guesses, marks, authedPost, guest, date]);

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
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.repeat && e.key === "Enter") return;
      if (e.key === "Escape") {
        if (showResult) { setShowResult(false); return; }
        onClose();
        return;
      }
      if (done) return;
      if (e.key === "Enter") submitGuess();
      else if (e.key === "Backspace") backspace();
      else if (/^[a-zA-Z]$/.test(e.key)) typeLetter(e.key);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, showResult, onClose, submitGuess, backspace, typeLetter]);

  async function handleShare(target: "header" | "overlay") {
    const text = buildShareText(dayNumber, done === "won", completedMarks.current);
    try {
      await copyText(text);
      if (target === "header") {
        if (copiedHeaderTimer.current) clearTimeout(copiedHeaderTimer.current);
        setCopiedHeader(true);
        copiedHeaderTimer.current = setTimeout(() => setCopiedHeader(false), 2000);
      } else {
        if (copiedOverlayTimer.current) clearTimeout(copiedOverlayTimer.current);
        setCopiedOverlay(true);
        copiedOverlayTimer.current = setTimeout(() => setCopiedOverlay(false), 2000);
      }
    } catch {
      setMessage("Copy failed — try manually");
    }
  }

  const dayLabel = dayNumber > 0 ? `Daily #${dayNumber}` : "Daily";

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 relative">
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-18 items-center lg:items-start justify-center">
        <div className="w-full max-w-md">
          <motion.div
            layout
            style={{ borderRadius: fullscreen ? 0 : 16 }}
            className={fullscreen
              ? "fixed inset-0 z-40 flex flex-col overflow-hidden bg-surface px-2 pt-3 pb-2"
              : "flex flex-col items-center w-full bg-surface border border-border-app/30 overflow-hidden px-1 py-4 lg:p-4 shadow-lg shadow-black/40"
            }
          >
            <div className={`w-full flex items-center justify-between pb-3 border-b border-border-app/40 px-2 lg:px-0 ${fullscreen ? "mb-1" : "mb-4"}`}>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  aria-label="Back"
                  className="w-7 h-7 flex items-center justify-center rounded-md text-muted hover:text-fg transition"
                >
                  <IconArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-semibold tracking-widest uppercase text-muted">{dayLabel}</span>
              </div>
              <div className="flex items-center gap-1">
                {done && (
                  <button
                    onClick={() => handleShare("header")}
                    aria-label="Copy result"
                    className="w-7 h-7 flex items-center justify-center rounded-md transition text-muted hover:text-fg overflow-hidden"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {copiedHeader ? (
                        <motion.span
                          key="check"
                          className="text-xs font-semibold text-correct flex items-center justify-center"
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.5 }}
                          transition={{ duration: 0.15 }}
                        >
                          ✓
                        </motion.span>
                      ) : (
                        <motion.div
                          key="clipboard"
                          className="flex items-center justify-center"
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.5 }}
                          transition={{ duration: 0.15 }}
                        >
                          <IconClipboard className="w-4 h-4" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                )}
                <button
                  onClick={() => setFullscreen((f) => !f)}
                  aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                  className="lg:hidden w-7 h-7 flex items-center justify-center rounded-md text-muted hover:text-fg transition"
                >
                  {fullscreen ? <IconCompress className="w-4 h-4" /> : <IconExpand className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Board
              guesses={guesses}
              marks={marks}
              current={done ? "" : current}
              done={!!done}
              onKeyPress={onKeyPress}
              revealingRow={revealingRow}
              shakingRow={shakingRow}
              fullscreen={fullscreen}
              onShakeEnd={() => {
                if (pendingShake.current) {
                  pendingShake.current = false;
                  flushSync(() => setShaking(false));
                  setShaking(true);
                } else {
                  setShaking(false);
                }
              }}
            />
            <div className="min-h-6 font-semibold text-fg">{message}</div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showResult && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowResult(false)}
          >
            <motion.div
              className="w-full max-w-sm mx-4 rounded-2xl bg-surface border border-border-app/40 p-8 flex flex-col items-center gap-5 text-center shadow-2xl shadow-black/60"
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-xs font-semibold tracking-widest uppercase text-muted">{dayLabel}</div>

              <div>
                {done === "won" ? <IconTrophy className="w-12 h-12 mx-auto mb-3" /> : <IconSkull className="w-12 h-12 mx-auto mb-3" />}
                <h2 className="text-2xl font-bold text-fg">
                  {done === "won" ? "You got it!" : "Better luck tomorrow"}
                </h2>
                <p className="text-sm text-muted mt-1">
                  {done === "won"
                    ? `Solved in ${completedMarks.current.length} ${completedMarks.current.length === 1 ? "guess" : "guesses"}`
                    : `The word was ${answer.toUpperCase()}`}
                </p>
              </div>

              <button
                onClick={() => handleShare("overlay")}
                className="w-full py-2.5 rounded-lg bg-accent text-tiletext font-semibold shadow-[0_3px_0_rgba(0,0,0,0.35)] hover:brightness-110 active:translate-y-[3px] active:shadow-none transition-all duration-100"
              >
                {copiedOverlay ? "Copied!" : "Share result"}
              </button>

              {guest && (
                <p className="text-xs text-muted">
                  <a href="/" className="underline hover:text-fg transition-colors">Sign in</a> to track your daily streak
                </p>
              )}

              <button
                onClick={() => setShowResult(false)}
                className="text-sm text-muted hover:text-fg transition-colors"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
