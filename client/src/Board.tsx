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

export type { Mark };
export { COLS };

export function Board({
  guesses,
  marks,
  current,
  done,
  onKeyPress,
}: {
  guesses: string[];
  marks: Mark[][];
  current: string;
  done: boolean;
  onKeyPress: (key: string) => void;
}) {
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
