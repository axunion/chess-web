import { AlertDialog } from "@kobalte/core/alert-dialog";
import type { GameState } from "../game/types";
import styles from "./GameStatusBar.module.css";
import { formatGameResult } from "./gameResultText";

interface GameStatusBarProps {
  state: GameState;
  onNewGame: () => void;
  onResign: () => void;
}

export function GameStatusBar(props: GameStatusBarProps) {
  const isPlaying = () => props.state.status.kind === "playing";
  const isCheck = () =>
    props.state.status.kind === "playing" && props.state.status.check;
  const turnText = () =>
    props.state.turn === "w" ? "White to move" : "Black to move";
  const statusText = () =>
    isPlaying() ? turnText() : formatGameResult(props.state.status);

  return (
    <div class={styles.bar}>
      <div class={styles.status}>
        <span class={styles.statusText}>{statusText()}</span>
        {isCheck() && <span class={styles.checkBadge}>Check!</span>}
      </div>
      <div class={styles.actions}>
        {isPlaying() && (
          <AlertDialog>
            <AlertDialog.Trigger class={styles.resignButton}>
              Resign
            </AlertDialog.Trigger>
            <AlertDialog.Portal>
              <AlertDialog.Overlay class={styles.overlay} />
              <div class={styles.positioner}>
                <AlertDialog.Content class={styles.dialogContent}>
                  <AlertDialog.Title class={styles.dialogTitle}>
                    Resign the game?
                  </AlertDialog.Title>
                  <AlertDialog.Description class={styles.dialogDescription}>
                    This ends the game immediately. This cannot be undone.
                  </AlertDialog.Description>
                  <div class={styles.dialogActions}>
                    <AlertDialog.CloseButton class={styles.cancelButton}>
                      Cancel
                    </AlertDialog.CloseButton>
                    <button
                      type="button"
                      class={styles.confirmResignButton}
                      onClick={props.onResign}
                    >
                      Resign
                    </button>
                  </div>
                </AlertDialog.Content>
              </div>
            </AlertDialog.Portal>
          </AlertDialog>
        )}
        <button
          type="button"
          class={styles.newGameButton}
          onClick={props.onNewGame}
        >
          New Game
        </button>
      </div>
    </div>
  );
}
