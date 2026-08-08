import { For, type JSX, Show } from "solid-js";
import type { Color, PieceSymbol } from "../game/types";
import styles from "./PlayerCard.module.css";
import { PieceSvg } from "./pieces/pieceSvg";

interface PlayerCardProps {
  /** Piece types captured by `color`'s side, in value order (Q→R→B→N→P). */
  pieces: PieceSymbol[];
  color: Color;
  /** `color`'s material lead over the opponent; 0 (or negative) shows no badge. */
  advantage: number;
  /** Whether it's `color`'s turn right now — lights the header's turn dot. */
  active: boolean;
  /** Player-card label, e.g. "White"/"Black" (pvp) or "You"/"Stockfish · Normal" (cpu). */
  label: string;
  /** Rendered at the end of the header row — GameMenu on the self card,
      EngineStatus on the opponent card (cpu games only), omitted otherwise.
      A slot, not a variant flag, so this component stays presentation-only
      and composition stays in GameContainer. */
  headerAccessory?: JSX.Element;
}

interface PieceGroup {
  type: PieceSymbol;
  count: number;
}

// Collapse same-type captures into one icon + a count badge instead of one
// icon per capture — caps the row at 5 icons (Q/R/B/N/P) regardless of how
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

/** Player identity card: turn indicator, label, captured pieces (spec/04 §1). */
export function PlayerCard(props: PlayerCardProps) {
  const opponentColor = () => (props.color === "w" ? "b" : "w");

  return (
    <section
      class={styles.card}
      aria-label={`${props.label} — captured pieces${props.active ? ", to move" : ""}`}
    >
      <div class={styles.header}>
        <span
          class={styles.dot}
          classList={{ [styles.dotActive]: props.active }}
          aria-hidden="true"
        />
        <span
          class={styles.label}
          classList={{ [styles.labelActive]: props.active }}
        >
          {props.label}
        </span>
        {props.headerAccessory}
      </div>
      <div class={styles.captures}>
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
