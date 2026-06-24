export function VersusResult({
  result, rematchMe, rematchOpponent, onRematch, onLeave,
}: {
  result: { youWon: boolean; winnerName: string; winnerGuesses: number; isDraw?: boolean };
  rematchMe: boolean;
  rematchOpponent: boolean;
  onRematch: () => void;
  onLeave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease]">
      <div className="w-full max-w-sm mx-4 rounded-2xl bg-surface border border-border-app/40 p-8 flex flex-col items-center gap-5 text-center shadow-2xl">
        <div className="text-5xl">
          {result.isDraw ? "🤝" : result.youWon ? "🏆" : "💀"}
        </div>

        <div>
          <h2 className="text-2xl font-bold text-fg">
            {result.isDraw ? "It's a draw!" : result.youWon ? "You win!" : "You lost"}
          </h2>
          {!result.isDraw && (
            <p className="text-sm text-muted mt-1">
              {result.winnerName} solved it in {result.winnerGuesses}{" "}
              {result.winnerGuesses === 1 ? "guess" : "guesses"}
            </p>
          )}
        </div>

        {/* rematch status line */}
        {rematchOpponent && !rematchMe && (
          <p className="text-sm text-accent animate-pulse">Opponent wants a rematch!</p>
        )}
        {rematchMe && !rematchOpponent && (
          <p className="text-sm text-muted animate-pulse">Waiting for opponent to accept...</p>
        )}

        <div className="flex gap-3 w-full mt-2">
          <button
            onClick={onLeave}
            className="flex-1 py-2.5 rounded-lg bg-bg text-fg border border-border-app/60 hover:opacity-80 transition"
          >
            Leave
          </button>
          <button
            onClick={onRematch}
            disabled={rematchMe}
            className="flex-1 py-2.5 rounded-lg bg-accent text-tiletext font-semibold hover:opacity-90 disabled:opacity-50 transition"
          >
            {rematchMe ? "Ready ✓" : rematchOpponent ? "Accept rematch" : "Rematch"}
          </button>
        </div>
      </div>
    </div>
  );
}
