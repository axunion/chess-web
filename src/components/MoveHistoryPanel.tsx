import type { HistoryEntry } from "../game/types";
import styles from "./MoveHistoryPanel.module.css";
import { MoveHistoryTable } from "./MoveHistoryTable";

interface MoveHistoryPanelProps {
  history: HistoryEntry[];
}

/** Always-visible desktop sidebar counterpart to MoveHistoryDialog — CSS-hidden
    below GameContainer's 64rem breakpoint, where the dialog is used instead. */
export function MoveHistoryPanel(props: MoveHistoryPanelProps) {
  return (
    <div class={styles.panel}>
      <h2 class={styles.title}>Move History</h2>
      <MoveHistoryTable history={props.history} />
    </div>
  );
}
