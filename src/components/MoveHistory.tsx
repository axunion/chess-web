import { createEffect, For, on, Show } from "solid-js";
import type { HistoryEntry } from "../game/types";
import styles from "./MoveHistory.module.css";

interface MoveHistoryProps {
  history: HistoryEntry[];
}

interface MoveRow {
  moveNumber: number;
  white?: string;
  whiteIsCurrent: boolean;
  black?: string;
  blackIsCurrent: boolean;
}

function toRows(history: HistoryEntry[]): MoveRow[] {
  const lastIndex = history.length - 1;
  const rows: MoveRow[] = [];
  for (let i = 0; i < history.length; i += 2) {
    rows.push({
      moveNumber: i / 2 + 1,
      white: history[i]?.san,
      whiteIsCurrent: i === lastIndex,
      black: history[i + 1]?.san,
      blackIsCurrent: i + 1 === lastIndex,
    });
  }
  return rows;
}

export function MoveHistory(props: MoveHistoryProps) {
  let scrollRef: HTMLElement | undefined;

  createEffect(
    on(
      () => props.history.length,
      () => {
        if (scrollRef) scrollRef.scrollTop = scrollRef.scrollHeight;
      },
    ),
  );

  return (
    <section
      class={styles.container}
      ref={scrollRef}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable region — tabIndex lets keyboard users focus and scroll it with arrow keys (spec/06 §3).
      tabIndex={0}
      aria-label="Move history"
    >
      <Show
        when={props.history.length > 0}
        fallback={<p class={styles.empty}>No moves yet</p>}
      >
        <table class={styles.table}>
          <tbody>
            <For each={toRows(props.history)}>
              {(row) => (
                <tr>
                  <td class={styles.moveNumber}>{row.moveNumber}</td>
                  <td
                    class={styles.san}
                    classList={{ [styles.current]: row.whiteIsCurrent }}
                    aria-current={row.whiteIsCurrent ? "true" : undefined}
                  >
                    {row.white}
                  </td>
                  <td
                    class={styles.san}
                    classList={{ [styles.current]: row.blackIsCurrent }}
                    aria-current={row.blackIsCurrent ? "true" : undefined}
                  >
                    {row.black}
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </Show>
    </section>
  );
}
