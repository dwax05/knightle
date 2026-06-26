export function GameResult({
  outcome,
  guessCount,
  answer,
  onNewGame,
}: {
  outcome: "won" | "lost";
  guessCount: number;
  answer: string;
  onNewGame: () => void;
}) {
  const won = outcome === "won";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm mx-4 rounded-2xl bg-surface border border-border-app/40 p-8 flex flex-col items-center gap-5 text-center shadow-2xl">
        <div className="text-5xl">{won ? "🏆" : "💀"}</div>

        <div>
          <h2 className="text-2xl font-bold text-fg">{won ? "You got it!" : "Better luck next time"}</h2>
          <p className="text-sm text-muted mt-1">
            {won
              ? `Solved in ${guessCount} ${guessCount === 1 ? "guess" : "guesses"}`
              : `The word was ${answer.toUpperCase()}`}
          </p>
        </div>

        <button
          onClick={onNewGame}
          className="w-full py-2.5 rounded-lg bg-accent text-tiletext font-semibold hover:opacity-90 transition"
        >
          Play again
        </button>
      </div>
    </div>
  );
}
