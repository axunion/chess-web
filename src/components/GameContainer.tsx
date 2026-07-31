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
          onResign={() => store.resign(store.state.turn)}
        />
        {/* Board is not flipped in this milestone (white always at the
            bottom — see spec/04 §3; flipping for a CPU-black game is M4),
            so the opponent's tray is always black's and the player's is
            always white's. */}
        <CapturedPieces
          pieces={capturedBy(store.state.history, "b")}
          color="b"
        />
        <Chessboard
          state={store.state}
          onTapSquare={store.tapSquare}
          onConfirmPromotion={store.confirmPromotion}
          onCancelPromotion={store.cancelPromotion}
        />
        <CapturedPieces
          pieces={capturedBy(store.state.history, "w")}
          color="w"
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
