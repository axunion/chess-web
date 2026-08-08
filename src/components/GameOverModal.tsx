import { Dialog } from "@kobalte/core/dialog";
import { X } from "lucide-solid";
import { createEffect, createSignal, on, onCleanup } from "solid-js";
import type { GameStatus } from "../game/types";
import chrome from "./dialogChrome.module.css";
import styles from "./GameOverModal.module.css";
import { formatGameResult } from "./gameResultText";

interface GameOverModalProps {
  status: GameStatus;
  onReturnToTitle: () => void;
  onRematch: () => void;
}

/** Wait for the last move animation to finish before covering the board (spec/05 §6). */
const SHOW_DELAY_MS = 300;

export function GameOverModal(props: GameOverModalProps) {
  const [open, setOpen] = createSignal(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  createEffect(
    on(
      () => props.status.kind,
      (kind) => {
        clearTimeout(timer);
        if (kind === "playing") {
          setOpen(false);
        } else {
          timer = setTimeout(() => setOpen(true), SHOW_DELAY_MS);
        }
      },
    ),
  );
  onCleanup(() => clearTimeout(timer));

  function handleReturnToTitle(): void {
    // Close this modal before navigating away so it doesn't linger.
    setOpen(false);
    props.onReturnToTitle();
  }

  function handleRematch(): void {
    // Close before restarting — status flips back to "playing" on the next
    // effect run anyway, but this avoids a visible close-flash.
    setOpen(false);
    props.onRematch();
  }

  return (
    <Dialog open={open()} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay class={chrome.overlay} />
        <div class={chrome.positioner}>
          <Dialog.Content class={styles.content}>
            <Dialog.CloseButton class={styles.closeButton} aria-label="Close">
              <X size={18} />
            </Dialog.CloseButton>
            <Dialog.Title class={styles.title}>
              {formatGameResult(props.status)}
            </Dialog.Title>
            <div class={styles.actions}>
              <button
                type="button"
                class={`${styles.rematchButton} ${chrome.accentButton}`}
                onClick={handleRematch}
              >
                Rematch
              </button>
              <button
                type="button"
                class={`${styles.returnButton} ${chrome.outlineButton}`}
                onClick={handleReturnToTitle}
              >
                Return to Title
              </button>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
