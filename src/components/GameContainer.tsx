import { createSignal } from "solid-js";
import type { Color, HistoryEntry, PieceSymbol } from "../game/types";
import { createGameStore } from "../store/gameStore";
import { CapturedPieces } from "./CapturedPieces";
import { Chessboard } from "./Chessboard";
import styles from "./GameContainer.module.css";
import { GameOverModal } from "./GameOverModal";
import { GameStatusBar } from "./GameStatusBar";
import { MoveHistory } from "./MoveHistory";
import { NewGameDialog } from "./NewGameDialog";

const CAPTURE_VALUE_ORDER: PieceSymbol[] = ["q", "r", "b", "n", "p"];

/** Piece types `color` has captured from the opponent, in value order (Q→R→B→N→P). */
function capturedBy(history: HistoryEntry[], color: Color): PieceSymbol[] {
  return history
    .filter((entry) => entry.color === color && entry.captured)
    .map((entry) => entry.captured as PieceSymbol)
    .sort(
      (a, b) => CAPTURE_VALUE_ORDER.indexOf(a) - CAPTURE_VALUE_ORDER.indexOf(b),
    );
}

export function GameContainer() {
  const store = createGameStore();
  // Restore a saved game on startup (spec/02-state-persistence.md §6); open
  // NewGameDialog only when there was nothing to restore (no save, or a
  // corrupted one that boot() already discarded).
  const restored = store.boot();
  const [newGameDialogOpen, setNewGameDialogOpen] = createSignal(!restored);

  // The board is flipped (black at the bottom) only for a CPU game where the
  // human plays black (spec/04 §3, spec/05 §7 step 4); PvP is never flipped.
  const flipped = () =>
    store.state.config.mode === "cpu" && store.state.config.playerColor === "b";
  const playerColor = () =>
    store.state.config.mode === "cpu" ? store.state.config.playerColor : "w";
  const opponentColor = () => (playerColor() === "w" ? "b" : "w");

  function handleStart(config: Parameters<typeof store.newGame>[0]): void {
    store.newGame(config);
    setNewGameDialogOpen(false);
  }

  return (
    <div class={styles.container}>
      <div class={styles.layout}>
        <GameStatusBar
          state={store.state}
          onNewGame={() => setNewGameDialogOpen(true)}
          onResign={() =>
            // CPU games always resign the human's side; PvP resigns whoever's
            // turn it currently is (spec/05-interaction-flows.md §6).
            store.resign(
              store.state.config.mode === "cpu"
                ? store.state.config.playerColor
                : store.state.turn,
            )
          }
          onRetryEngine={store.retryEngine}
        />
        {/* Opponent's tray (their captures) is shown above the board,
            the player's own tray below — regardless of who's playing which
            color (spec/04 §3). */}
        <CapturedPieces
          pieces={capturedBy(store.state.history, opponentColor())}
          color={opponentColor()}
        />
        <Chessboard
          state={store.state}
          flipped={flipped()}
          onTapSquare={store.tapSquare}
          onConfirmPromotion={store.confirmPromotion}
          onCancelPromotion={store.cancelPromotion}
        />
        <CapturedPieces
          pieces={capturedBy(store.state.history, playerColor())}
          color={playerColor()}
        />
        <MoveHistory history={store.state.history} />
      </div>
      <GameOverModal
        status={store.state.status}
        onNewGame={() => setNewGameDialogOpen(true)}
      />
      <NewGameDialog
        open={newGameDialogOpen()}
        hasActiveGame={
          store.state.status.kind === "playing" &&
          store.state.history.length > 0
        }
        onStart={handleStart}
        onClose={() => setNewGameDialogOpen(false)}
      />
    </div>
  );
}
