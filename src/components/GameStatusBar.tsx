import { AlertDialog } from "@kobalte/core/alert-dialog";
import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import { EllipsisVertical, Flag, History, Home } from "lucide-solid";
import { createSignal, type JSX, Show } from "solid-js";
import type { GameState } from "../game/types";
import chrome from "./dialogChrome.module.css";
import styles from "./GameStatusBar.module.css";
import { formatGameResult } from "./gameResultText";
import { MoveHistoryDialog } from "./MoveHistoryDialog";

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
  confirmIcon: JSX.Element;
  confirmClass: string;
  onConfirm: () => void;
}

/** Shared shell for the Resign/Quit confirmation prompts. */
function ConfirmDialog(props: ConfirmDialogProps) {
  return (
    <AlertDialog open={props.open} onOpenChange={props.onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay class={chrome.overlay} />
        <div class={chrome.positioner}>
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
                {props.confirmIcon}
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
  const [historyOpen, setHistoryOpen] = createSignal(false);

  const isPlaying = () => props.state.status.kind === "playing";
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
        {/* Whose turn it is shows on the captured-piece trays (see
            GameContainer), and check shows on the board via the king's
            square — this bar only speaks up once the game has ended. */}
        <div class={styles.status} role="status" aria-live="polite">
          <Show when={!isPlaying()}>
            <span class={styles.statusText}>
              {formatGameResult(props.state.status)}
            </span>
          </Show>
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
              <DropdownMenu.Item
                class={styles.menuItem}
                onSelect={() => setHistoryOpen(true)}
              >
                <History size={16} />
                Move History
              </DropdownMenu.Item>
              <DropdownMenu.Separator class={styles.menuSeparator} />
              <Show when={isPlaying()}>
                <DropdownMenu.Item
                  class={`${styles.menuItem} ${styles.menuItemDanger}`}
                  onSelect={() => setResignConfirmOpen(true)}
                >
                  <Flag size={16} />
                  Resign
                </DropdownMenu.Item>
              </Show>
              <DropdownMenu.Item
                class={styles.menuItem}
                onSelect={() => setQuitConfirmOpen(true)}
              >
                <Home size={16} />
                Return to Title
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
        confirmIcon={<Flag size={16} />}
        confirmClass={styles.confirmResignButton}
        onConfirm={handleResign}
      />

      <ConfirmDialog
        open={quitConfirmOpen()}
        onOpenChange={setQuitConfirmOpen}
        title="Return to the title screen?"
        description="The current game will be discarded."
        confirmLabel="Return to Title"
        confirmIcon={<Home size={16} />}
        confirmClass={styles.confirmQuitButton}
        onConfirm={handleQuit}
      />

      <MoveHistoryDialog
        open={historyOpen()}
        onOpenChange={setHistoryOpen}
        history={props.state.history}
      />
    </div>
  );
}
