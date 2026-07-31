import { createEffect, For, on } from "solid-js";
import type { HistoryEntry } from "../game/types";
import styles from "./MoveHistory.module.css";

interface MoveHistoryProps {
  history: HistoryEntry[];
}

interface MoveRow {
  moveNumber: number;
  white?: string;
  black?: string;
}

function toRows(history: HistoryEntry[]): MoveRow[] {
  const rows: MoveRow[] = [];
  for (let i = 0; i < history.length; i += 2) {
    rows.push({
      moveNumber: i / 2 + 1,
      white: history[i]?.san,
      black: history[i + 1]?.san,
    });
  }
  return rows;
}

export function MoveHistory(props: MoveHistoryProps) {
  let scrollRef: HTMLDivElement | undefined;

  createEffect(
    on(
      () => props.history.length,
      () => {
        if (scrollRef) scrollRef.scrollTop = scrollRef.scrollHeight;
      },
    ),
  );

  return (
    <div class={styles.container} ref={scrollRef}>
      <table class={styles.table}>
        <tbody>
          <For each={toRows(props.history)}>
            {(row) => (
              <tr>
                <td class={styles.moveNumber}>{row.moveNumber}</td>
                <td class={styles.san}>{row.white}</td>
                <td class={styles.san}>{row.black}</td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}
