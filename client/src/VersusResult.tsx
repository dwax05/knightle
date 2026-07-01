import { IconTrophy, IconSkull, IconScale } from "./icons";
import { type VersusMode } from "./Versus";

export function VersusResult({
  mode = "speed", result, rematchMe, rematchOpponent, rematchDeclined, onRematch, onLeave,
}: {
  mode?: VersusMode;
  result: { youWon: boolean; winnerName: string; winnerGuesses: number; isDraw?: boolean };
  rematchMe: boolean;
  rematchOpponent: boolean;
  rematchDeclined: boolean;
  onRematch: () => void;
  onLeave: () => void;
}) {
  const subtitle = result.isDraw
    ? mode === "precision" ? `Both solved it in ${result.winnerGuesses} ${result.winnerGuesses === 1 ? "guess" : "guesses"}` : undefined
    : `${result.winnerName} solved it in ${result.winnerGuesses} ${result.winnerGuesses === 1 ? "guess" : "guesses"}${mode === "speed" ? " first" : " (fewest)"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease]">
      <div className="w-full max-w-sm mx-4 rounded-2xl bg-surface border border-border-app/40 p-8 flex flex-col items-center gap-5 text-center shadow-2xl">
        <div>
          {result.isDraw ? <IconScale className="w-12 h-12" /> : result.youWon ? <IconTrophy className="w-12 h-12" /> : <IconSkull className="w-12 h-12" />}
        </div>

        <div>
          <h2 className="text-2xl font-bold text-fg">
            {result.isDraw ? "It's a draw!" : result.youWon ? "You win!" : "You lost"}
          </h2>
          {subtitle && (
            <p className="text-sm text-muted mt-1">{subtitle}</p>
          )}
        </div>

        {/* rematch status line */}
        {rematchDeclined && (
          <p className="text-sm text-muted">Opponent declined the rematch.</p>
        )}
        {!rematchDeclined && rematchOpponent && !rematchMe && (
          <p className="text-sm text-accent animate-pulse">Opponent wants a rematch!</p>
        )}
        {!rematchDeclined && rematchMe && !rematchOpponent && (
          <p className="text-sm text-muted animate-pulse">Waiting for opponent...</p>
        )}

        <div className="flex gap-3 w-full mt-2">
          <button
            onClick={onLeave}
            className="flex-1 py-2.5 rounded-lg bg-bg text-fg border border-border-app/60 shadow-[0_3px_0_rgba(0,0,0,0.35)] hover:brightness-110 active:translate-y-[3px] active:shadow-none transition-all duration-100"
          >
            Leave
          </button>
          <button
            onClick={onRematch}
            disabled={rematchMe || rematchDeclined}
            className="flex-1 py-2.5 rounded-lg bg-accent text-tiletext font-semibold shadow-[0_3px_0_rgba(0,0,0,0.35)] hover:brightness-110 active:translate-y-[3px] active:shadow-none disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 transition-all duration-100"
          >
            {rematchMe ? "Ready ✓" : rematchOpponent ? "Accept rematch" : "Rematch"}
          </button>
        </div>
      </div>
    </div>
  );
}
