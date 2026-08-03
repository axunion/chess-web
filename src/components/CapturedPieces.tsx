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
}

/** Small captured-piece tray for one side (spec/04 §1). */
export function CapturedPieces(props: CapturedPiecesProps) {
  const opponentColor = () => (props.color === "w" ? "b" : "w");

  return (
    <section
      class={styles.tray}
      aria-label={`Pieces captured by ${props.color === "w" ? "white" : "black"}`}
    >
      <For each={props.pieces}>
        {(type) => (
          <span class={styles.piece}>
            <PieceSvg type={type} color={opponentColor()} />
          </span>
        )}
      </For>
      <Show when={props.advantage > 0}>
        <span class={styles.advantage}>+{props.advantage}</span>
      </Show>
    </section>
  );
}
