import { Dialog } from "@kobalte/core/dialog";
import { X } from "lucide-solid";
import { createEffect, createSignal, on, onCleanup } from "solid-js";
import type { GameStatus } from "../game/types";
import styles from "./GameOverModal.module.css";
import { formatGameResult } from "./gameResultText";

interface GameOverModalProps {
  status: GameStatus;
  onNewGame: () => void;
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

  function handleNewGame(): void {
    // Close this modal so it doesn't linger behind NewGameDialog.
    setOpen(false);
    props.onNewGame();
  }

  return (
    <Dialog open={open()} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay class={styles.overlay} />
        <div class={styles.positioner}>
          <Dialog.Content class={styles.content}>
            <Dialog.CloseButton class={styles.closeButton} aria-label="Close">
              <X size={18} />
            </Dialog.CloseButton>
            <Dialog.Title class={styles.title}>
              {formatGameResult(props.status)}
            </Dialog.Title>
            <button
              type="button"
              class={styles.newGameButton}
              onClick={handleNewGame}
            >
              New Game
            </button>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
