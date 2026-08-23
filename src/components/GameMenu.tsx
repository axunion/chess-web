import { AlertDialog } from "@kobalte/core/alert-dialog";
import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import {
  Clipboard,
  EllipsisVertical,
  Flag,
  FlipVertical2,
  Handshake,
  History,
  Home,
  RotateCcw,
  Undo2,
} from "lucide-solid";
import { createSignal, type JSX, onCleanup, Show } from "solid-js";
import type { GameState } from "../game/types";
import { canOfferDraw, canUndo } from "../store/gameStore";
import chrome from "./dialogChrome.module.css";
import styles from "./GameMenu.module.css";
import { MoveHistoryDialog } from "./MoveHistoryDialog";

interface GameMenuProps {
  state: GameState;
  onQuit: () => void;
  onResign: () => void;
  onNewGame: () => void;
  onFlip: () => void;
  onUndo: () => void;
  onOfferDraw: () => void;
  getPgn: () => string;
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

/** Shared shell for the Resign/Quit/New Game confirmation prompts. */
function ConfirmDialog(props: ConfirmDialogProps) {
  return (
    <AlertDialog open={props.open} onOpenChange={props.onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay class={chrome.overlay} />
        <div class={chrome.positioner}>
          <AlertDialog.Content class={chrome.content}>
            <AlertDialog.Title class={chrome.title}>
              {props.title}
            </AlertDialog.Title>
            <AlertDialog.Description class={chrome.description}>
              {props.description}
            </AlertDialog.Description>
            <div class={chrome.actions}>
              <AlertDialog.CloseButton
                class={`${styles.cancelButton} ${chrome.outlineButton}`}
              >
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

/** Overflow menu for in-game actions, floating in the play area's top-right corner. */
type ConfirmAction = "resign" | "quit" | "newGame";

/** How long the "Copied" feedback stays visible after Copy PGN is selected. */
const COPIED_FEEDBACK_MS = 1500;

export function GameMenu(props: GameMenuProps) {
  const [confirmAction, setConfirmAction] = createSignal<ConfirmAction | null>(
    null,
  );
  const [historyOpen, setHistoryOpen] = createSignal(false);
  const [copied, setCopied] = createSignal(false);
  let copiedTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(copiedTimer));

  const isPlaying = () => props.state.status.kind === "playing";

  function handleConfirm(action: ConfirmAction): void {
    setConfirmAction(null);
    if (action === "resign") props.onResign();
    else if (action === "newGame") props.onNewGame();
    else props.onQuit();
  }

  function copyPgn(): void {
    navigator.clipboard.writeText(props.getPgn()).then(
      () => {
        setCopied(true);
        clearTimeout(copiedTimer);
        copiedTimer = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
      },
      (err: unknown) => {
        console.warn("GameMenu: failed to copy PGN to clipboard", err);
      },
    );
  }

  return (
    <>
      <div class={styles.menuWrapper}>
        <DropdownMenu placement="bottom-end">
          <DropdownMenu.Trigger
            class={styles.menuButton}
            aria-label="Game menu"
          >
            <EllipsisVertical size={18} />
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
              <DropdownMenu.Item class={styles.menuItem} onSelect={copyPgn}>
                <Clipboard size={16} />
                Copy PGN
              </DropdownMenu.Item>
              <DropdownMenu.Item
                class={styles.menuItem}
                onSelect={props.onFlip}
              >
                <FlipVertical2 size={16} />
                Flip Board
              </DropdownMenu.Item>
              <DropdownMenu.Separator class={styles.menuSeparator} />
              <DropdownMenu.Item
                class={styles.menuItem}
                disabled={!canUndo(props.state)}
                onSelect={props.onUndo}
              >
                <Undo2 size={16} />
                Undo
              </DropdownMenu.Item>
              <Show when={canOfferDraw(props.state)}>
                <DropdownMenu.Item
                  class={styles.menuItem}
                  onSelect={props.onOfferDraw}
                >
                  <Handshake size={16} />
                  Offer Draw
                </DropdownMenu.Item>
              </Show>
              <Show when={isPlaying()}>
                <DropdownMenu.Item
                  class={`${styles.menuItem} ${styles.menuItemDanger}`}
                  onSelect={() => setConfirmAction("resign")}
                >
                  <Flag size={16} />
                  Resign
                </DropdownMenu.Item>
              </Show>
              <DropdownMenu.Item
                class={styles.menuItem}
                onSelect={() => setConfirmAction("newGame")}
              >
                <RotateCcw size={16} />
                New Game
              </DropdownMenu.Item>
              <DropdownMenu.Item
                class={styles.menuItem}
                onSelect={() => setConfirmAction("quit")}
              >
                <Home size={16} />
                Return to Title
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu>
        <Show when={copied()}>
          <span class={styles.copiedBubble} role="status">
            Copied
          </span>
        </Show>
      </div>

      <ConfirmDialog
        open={confirmAction() === "resign"}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title="Resign the game?"
        description="This ends the game immediately. This cannot be undone."
        confirmLabel="Resign"
        confirmIcon={<Flag size={16} />}
        confirmClass={styles.confirmResignButton}
        onConfirm={() => handleConfirm("resign")}
      />

      <ConfirmDialog
        open={confirmAction() === "newGame"}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title="Start a new game?"
        description="The current game will be discarded."
        confirmLabel="New Game"
        confirmIcon={<RotateCcw size={16} />}
        confirmClass={`${styles.confirmNewGameButton} ${chrome.accentButton}`}
        onConfirm={() => handleConfirm("newGame")}
      />

      <ConfirmDialog
        open={confirmAction() === "quit"}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title="Return to the title screen?"
        description="The current game will be discarded."
        confirmLabel="Return to Title"
        confirmIcon={<Home size={16} />}
        confirmClass={`${styles.confirmQuitButton} ${chrome.accentButton}`}
        onConfirm={() => handleConfirm("quit")}
      />

      <MoveHistoryDialog
        open={historyOpen()}
        onOpenChange={setHistoryOpen}
        history={props.state.history}
      />
    </>
  );
}
