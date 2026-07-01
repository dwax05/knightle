import { useEffect } from "react";
import { motion } from "motion/react";

export function HelpModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        (document.activeElement as HTMLElement)?.blur();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        className="relative bg-surface border border-border-app/40 rounded-2xl shadow-2xl shadow-black/60 p-6 w-full max-w-sm flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.88, transition: { duration: 0.2 } }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-fg tracking-wide">How to play</h2>
          <button
            onClick={(e) => { (e.currentTarget as HTMLButtonElement).blur(); onClose(); }}
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted hover:text-fg transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-muted leading-relaxed">
          Guess the 5-letter word in 6 tries. After each guess the tiles reveal how close you were.
        </p>

        <div className="flex flex-col gap-4">
          <TileExample
            letters={["C", "R", "A", "N", "E"]}
            highlight={0}
            mark="correct"
            label={<><span className="text-fg font-semibold">C</span> is in the word and in the correct spot.</>}
          />
          <TileExample
            letters={["P", "I", "L", "O", "T"]}
            highlight={3}
            mark="present"
            label={<><span className="text-fg font-semibold">O</span> is in the word but in the wrong spot.</>}
          />
          <TileExample
            letters={["V", "A", "G", "U", "E"]}
            highlight={2}
            mark="absent"
            label={<><span className="text-fg font-semibold">G</span> is not in the word.</>}
          />
        </div>

        <p className="text-xs text-muted text-center">
          A new puzzle is available whenever you finish — play as many as you like.
        </p>
      </motion.div>
    </motion.div>
  );
}

const MARK_STYLES = {
  correct: {
    bg: "var(--tile-correct)",
    border: "var(--tile-correct)",
    color: "var(--tile-text)",
  },
  present: {
    bg: "var(--tile-present)",
    border: "var(--tile-present)",
    color: "var(--tile-text)",
  },
  absent: {
    bg: "var(--tile-absent)",
    border: "var(--tile-absent)",
    color: "var(--tile-text)",
  },
};

function TileExample({
  letters,
  highlight,
  mark,
  label,
}: {
  letters: string[];
  highlight: number;
  mark: "correct" | "present" | "absent";
  label: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5">
        {letters.map((ch, i) => {
          const isHighlight = i === highlight;
          const style = isHighlight
            ? { background: MARK_STYLES[mark].bg, borderColor: MARK_STYLES[mark].border, color: MARK_STYLES[mark].color }
            : { borderColor: "var(--border)" };
          return (
            <div
              key={i}
              className="w-11 h-11 flex items-center justify-center text-lg font-bold uppercase rounded border-2 text-fg"
              style={style}
            >
              {ch}
            </div>
          );
        })}
      </div>
      <p className="text-sm text-muted leading-snug">{label}</p>
    </div>
  );
}
