import { For, Show } from "solid-js";
import type { Color, PieceSymbol } from "../game/types";
import styles from "./CapturedPieces.module.css";
import { PieceSvg } from "./pieces/pieceSvg";

interface CapturedPiecesProps {
  /** Piece types captured by `color`'s side, in value order (Q→R→B→N→P). */
  pieces: PieceSymbol[];
  color: Color;
  /** `color`'s material lead over the opponent; 0 (or negative) shows no badge. */
  advantage: number;
  /** Whether it's `color`'s turn right now — highlights the tray in place of a text banner. */
  active: boolean;
  /** Player-card label, e.g. "White"/"Black" (pvp) or "You"/"Stockfish · Normal" (cpu). */
  label: string;
}

interface PieceGroup {
  type: PieceSymbol;
  count: number;
}

// Collapse same-type captures into one icon + a count badge instead of one
// icon per capture — caps the tray at 5 icons (Q/R/B/N/P) regardless of how
// many pieces were actually taken, so it can never wrap onto a second line
// and shift the board below it (props.pieces is already sorted by value, so
// same-type entries are always adjacent).
function groupPieces(pieces: PieceSymbol[]): PieceGroup[] {
  const groups: PieceGroup[] = [];
  for (const type of pieces) {
    const last = groups.at(-1);
    if (last?.type === type) {
      last.count++;
    } else {
      groups.push({ type, count: 1 });
    }
  }
  return groups;
}

/** Small captured-piece tray for one side (spec/04 §1). */
export function CapturedPieces(props: CapturedPiecesProps) {
  const opponentColor = () => (props.color === "w" ? "b" : "w");

  return (
    <section
      class={styles.tray}
      classList={{ [styles.active]: props.active }}
      aria-label={`${props.label} — captured pieces${props.active ? ", to move" : ""}`}
    >
      <span class={styles.label}>{props.label}</span>
      <div class={styles.pieces}>
        <For each={groupPieces(props.pieces)}>
          {(group) => (
            <span class={styles.pieceGroup}>
              <span class={styles.piece}>
                <PieceSvg type={group.type} color={opponentColor()} />
              </span>
              <Show when={group.count > 1}>
                <span class={styles.count}>×{group.count}</span>
              </Show>
            </span>
          )}
        </For>
        <Show when={props.advantage > 0}>
          <span class={styles.advantage}>+{props.advantage}</span>
        </Show>
      </div>
    </section>
  );
}
