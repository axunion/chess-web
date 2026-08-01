import { AlertDialog } from "@kobalte/core/alert-dialog";
import { Show } from "solid-js";
import type { GameState } from "../game/types";
import styles from "./GameStatusBar.module.css";
import { formatGameResult } from "./gameResultText";

interface GameStatusBarProps {
  state: GameState;
  onNewGame: () => void;
  onResign: () => void;
  onRetryEngine: () => void;
}

export function GameStatusBar(props: GameStatusBarProps) {
  const isPlaying = () => props.state.status.kind === "playing";
  const isCheck = () =>
    props.state.status.kind === "playing" && props.state.status.check;
  const turnText = () =>
    props.state.turn === "w" ? "White to move" : "Black to move";
  const statusText = () =>
    isPlaying() ? turnText() : formatGameResult(props.state.status);
  const isThinking = () =>
    props.state.engine === "loading" || props.state.engine === "thinking";
  const isEngineError = () => props.state.engine === "error";

  return (
    <div class={styles.container}>
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
      <Show when={isThinking()}>
        <div class={styles.thinkingBanner}>
          <span class={styles.spinner} aria-hidden="true" />
          <span>Stockfish is thinking…</span>
        </div>
      </Show>
      <Show when={isEngineError()}>
        <div class={styles.errorBanner}>
          <span>Engine error — Stockfish is unavailable.</span>
          <button
            type="button"
            class={styles.retryButton}
            onClick={props.onRetryEngine}
          >
            Retry
          </button>
        </div>
      </Show>
    </div>
  );
}
