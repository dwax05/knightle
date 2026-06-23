import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./auth";

type Mark = "correct" | "present" | "absent";
const ROWS = 6;
const COLS = 5;

const MARK_COLORS: Record<Mark, string> = {
  correct: "#6aaa64",
  present: "#c9b458",
  absent: "#787c7e",
};

export function Game() {
  const { authedPost } = useAuth();
  const [gameId, setGameId] = useState<string | null>(null);
  const [guesses, setGuesses] = useState<string[]>([]); // submitted words
  const [marks, setMarks] = useState<Mark[][]>([]);       // marks per submitted word
  const [current, setCurrent] = useState("");             // row being typed
  const [done, setDone] = useState<null | "won" | "lost">(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function newGame() {
    const data = await authedPost("/api/newgame", {});
    if (data.error) return setMessage(data.error);
    setGameId(data.gameId);
    setGuesses([]);
    setMarks([]);
    setCurrent("");
    setDone(null);
    setAnswer(null);
    setMessage("");
  }

  useEffect(() => {
    newGame();
  }, []);

  const submitGuess = useCallback(async () => {
    if (current.length !== COLS || !gameId || done) return;
    const data = await authedPost("/api/guess", { gameId, guess: current });

    if (data.error) {
      setMessage(data.error);
      return;
    }
    setMessage("");
    setGuesses((g) => [...g, current]);
    setMarks((m) => [...m, data.marks]);
    setCurrent("");

    if (data.won) {
      setDone("won");
      setMessage("You got it!");
    } else if (data.lost) {
      setDone("lost");
      setAnswer(data.answer);
      setMessage(`The word was ${data.answer.toUpperCase()}`);
    }
  }, [current, gameId, done, authedPost]);

  // keyboard input
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done) return;
      if (e.key === "Enter") submitGuess();
      else if (e.key === "Backspace") setCurrent((c) => c.slice(0, -1));
      else if (/^[a-zA-Z]$/.test(e.key) && current.length < COLS)
        setCurrent((c) => (c + e.key).toLowerCase());
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, done, submitGuess]);

  // build the 6 rows: submitted, then current, then empty
  function rowLetters(row: number): { ch: string; mark?: Mark }[] {
    if (row < guesses.length) {
      return guesses[row].split("").map((ch, i) => ({ ch, mark: marks[row][i] }));
    }
    if (row === guesses.length && !done) {
      return Array.from({ length: COLS }, (_, i) => ({ ch: current[i] ?? "" }));
    }
    return Array.from({ length: COLS }, () => ({ ch: "" }));
  }

  return (
    <div style={{ display: "grid", gap: 16, justifyItems: "center", marginTop: 24 }}>
      <div style={{ display: "grid", gap: 5 }}>
        {Array.from({ length: ROWS }, (_, r) => (
          <div key={r} style={{ display: "flex", gap: 5 }}>
            {rowLetters(r).map((cell, c) => (
              <div
                key={c}
                style={{
                  width: 56,
                  height: 56,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: cell.mark ? "#fff" : "#000",
                  background: cell.mark ? MARK_COLORS[cell.mark] : "#fff",
                  border: cell.mark
                    ? "2px solid transparent"
                    : cell.ch
                      ? "2px solid #878a8c"
                      : "2px solid #d3d6da",
                }}
              >
                {cell.ch}
              </div>
            ))}
          </div>
        ))}
      </div>

      {!done && (
        <button
          onClick={submitGuess}
          disabled={current.length !== COLS}
          style={{ padding: "8px 20px", fontSize: 16 }}
        >
          Submit guess
        </button>
      )}

      <div style={{ minHeight: 24, fontWeight: 600 }}>{message}</div>

      {done && <button onClick={newGame}>New game</button>}
    </div>
  );
}
