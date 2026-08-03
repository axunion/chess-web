import { AlertDialog } from "@kobalte/core/alert-dialog";
import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import { EllipsisVertical } from "lucide-solid";
import { createSignal, Show } from "solid-js";
import type { GameState } from "../game/types";
import styles from "./GameStatusBar.module.css";
import { formatGameResult } from "./gameResultText";

interface GameStatusBarProps {
  state: GameState;
  onQuit: () => void;
  onResign: () => void;
  onRetryEngine: () => void;
}

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  confirmClass: string;
  onConfirm: () => void;
}

/** Shared shell for the Resign/Quit confirmation prompts. */
function ConfirmDialog(props: ConfirmDialogProps) {
  return (
    <AlertDialog open={props.open} onOpenChange={props.onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay class={styles.overlay} />
        <div class={styles.positioner}>
          <AlertDialog.Content class={styles.dialogContent}>
            <AlertDialog.Title class={styles.dialogTitle}>
              {props.title}
            </AlertDialog.Title>
            <AlertDialog.Description class={styles.dialogDescription}>
              {props.description}
            </AlertDialog.Description>
            <div class={styles.dialogActions}>
              <AlertDialog.CloseButton class={styles.cancelButton}>
                Cancel
              </AlertDialog.CloseButton>
              <button
                type="button"
                class={props.confirmClass}
                onClick={props.onConfirm}
              >
                {props.confirmLabel}
              </button>
            </div>
          </AlertDialog.Content>
        </div>
      </AlertDialog.Portal>
    </AlertDialog>
  );
}

export function GameStatusBar(props: GameStatusBarProps) {
  const [resignConfirmOpen, setResignConfirmOpen] = createSignal(false);
  const [quitConfirmOpen, setQuitConfirmOpen] = createSignal(false);

  const isPlaying = () => props.state.status.kind === "playing";
  const isCheck = () =>
    props.state.status.kind === "playing" && props.state.status.check;
  const turnText = () =>
    props.state.turn === "w" ? "White to move" : "Black to move";
  const statusText = () =>
    isPlaying() ? turnText() : formatGameResult(props.state.status);
  const isCpu = () => props.state.config.mode === "cpu";
  // "loading" is the one-time engine warm-up, which can happen on the human's
  // own move (spec/05 §7 step 3) — worth distinguishing from "thinking",
  // which is specifically the CPU calculating its reply.
  const isLoading = () => props.state.engine === "loading";
  const isThinking = () => props.state.engine === "thinking";
  const isEngineError = () => props.state.engine === "error";
  const spinnerText = () => {
    if (isLoading()) return "Loading Stockfish…";
    if (isThinking()) return "Stockfish is thinking…";
    return null;
  };

  function handleResign(): void {
    setResignConfirmOpen(false);
    props.onResign();
  }

  function handleQuit(): void {
    setQuitConfirmOpen(false);
    props.onQuit();
  }

  return (
    <div class={styles.container}>
      <div class={styles.bar}>
        <div class={styles.status} role="status" aria-live="polite">
          <span class={styles.statusText}>{statusText()}</span>
          {isCheck() && <span class={styles.checkBadge}>Check!</span>}
        </div>
        <DropdownMenu placement="bottom-end">
          <DropdownMenu.Trigger
            class={styles.menuButton}
            aria-label="Game menu"
          >
            <EllipsisVertical size={20} />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content class={styles.menuContent}>
              <Show when={isPlaying()}>
                <DropdownMenu.Item
                  class={styles.menuItem}
                  onSelect={() => setResignConfirmOpen(true)}
                >
                  Resign
                </DropdownMenu.Item>
              </Show>
              <DropdownMenu.Item
                class={styles.menuItem}
                onSelect={() => setQuitConfirmOpen(true)}
              >
                Quit to Title
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu>
      </div>

      {/* Reserved only for cpu games — pvp never sets isThinking/isEngineError —
          so toggling between "thinking"/"error"/idle never shifts the board below. */}
      <Show when={isCpu()}>
        <div class={styles.notice}>
          <Show when={spinnerText()}>
            {(text) => (
              <div
                class={styles.thinkingBanner}
                role="status"
                aria-live="polite"
              >
                <span class={styles.spinner} aria-hidden="true" />
                <span>{text()}</span>
              </div>
            )}
          </Show>
          <Show when={isEngineError()}>
            <div class={styles.errorBanner} role="alert">
              <span class={styles.errorText}>
                Engine error — Stockfish is unavailable.
              </span>
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
      </Show>

      <ConfirmDialog
        open={resignConfirmOpen()}
        onOpenChange={setResignConfirmOpen}
        title="Resign the game?"
        description="This ends the game immediately. This cannot be undone."
        confirmLabel="Resign"
        confirmClass={styles.confirmResignButton}
        onConfirm={handleResign}
      />

      <ConfirmDialog
        open={quitConfirmOpen()}
        onOpenChange={setQuitConfirmOpen}
        title="Return to the title screen?"
        description="The current game will be discarded."
        confirmLabel="Quit"
        confirmClass={styles.confirmQuitButton}
        onConfirm={handleQuit}
      />
    </div>
  );
}
