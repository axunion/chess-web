import { Dialog } from "@kobalte/core/dialog";
import { X } from "lucide-solid";
import type { HistoryEntry } from "../game/types";
import chrome from "./dialogChrome.module.css";
import styles from "./MoveHistoryDialog.module.css";
import { MoveHistoryTable } from "./MoveHistoryTable";

interface MoveHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: HistoryEntry[];
}

/** Full move list, opened on demand from the game menu — keeps the board/cards
    at a fixed height regardless of how long the game runs (see GameMenu). */
export function MoveHistoryDialog(props: MoveHistoryDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class={chrome.overlay} />
        <div class={chrome.positioner}>
          <Dialog.Content class={styles.content}>
            <div class={styles.header}>
              <Dialog.Title class={styles.title}>Move History</Dialog.Title>
              <Dialog.CloseButton class={styles.closeButton} aria-label="Close">
                <X size={18} />
              </Dialog.CloseButton>
            </div>
            <MoveHistoryTable history={props.history} />
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
