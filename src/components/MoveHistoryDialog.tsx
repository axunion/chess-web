import { Dialog } from "@kobalte/core/dialog";
import { X } from "lucide-solid";
import { createEffect, For, on, Show } from "solid-js";
import type { HistoryEntry } from "../game/types";
import chrome from "./dialogChrome.module.css";
import styles from "./MoveHistoryDialog.module.css";

interface MoveHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

/** Full move list, opened on demand from the game menu — keeps the board/cards
    at a fixed height regardless of how long the game runs (see GameMenu). */
export function MoveHistoryDialog(props: MoveHistoryDialogProps) {
  let scrollRef: HTMLElement | undefined;

  createEffect(
    on(
      () => [props.open, props.history.length] as const,
      ([open]) => {
        if (open && scrollRef) scrollRef.scrollTop = scrollRef.scrollHeight;
      },
    ),
  );

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
            <section
              class={styles.body}
              ref={scrollRef}
              // biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable region — tabIndex lets keyboard users focus and scroll it with arrow keys.
              tabIndex={0}
              aria-label="Move history"
            >
              <Show
                when={props.history.length > 0}
                fallback={<p class={styles.empty}>No moves yet</p>}
              >
                <table class={styles.table}>
                  <thead>
                    <tr>
                      <th class={styles.moveNumber} />
                      <th class={styles.columnHeader}>White</th>
                      <th class={styles.columnHeader}>Black</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={toRows(props.history)}>
                      {(row) => (
                        <tr>
                          <td class={styles.moveNumber}>{row.moveNumber}</td>
                          <td
                            class={styles.san}
                            classList={{
                              [styles.current]: row.whiteIsCurrent,
                            }}
                            aria-current={
                              row.whiteIsCurrent ? "true" : undefined
                            }
                          >
                            {row.white}
                          </td>
                          <td
                            class={styles.san}
                            classList={{
                              [styles.current]: row.blackIsCurrent,
                            }}
                            aria-current={
                              row.blackIsCurrent ? "true" : undefined
                            }
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
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
