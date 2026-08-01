import type { BoardPiece } from "../game/types";
import styles from "./Piece.module.css";
import { PieceSvg } from "./pieces/pieceSvg";

const FILES = "abcdefgh";

interface PieceProps {
  piece: BoardPiece;
  interactive: boolean;
  /** Render black at the bottom, mirroring the flipped Chessboard grid (spec/04 §3). */
  flipped?: boolean;
}

export function Piece(props: PieceProps) {
  const fileIndex = () => {
    const i = FILES.indexOf(props.piece.square[0]);
    return props.flipped ? 7 - i : i;
  };
  const rankIndex = () => {
    const i = 8 - Number(props.piece.square[1]); // 0 = rank 8 (top row)
    return props.flipped ? 7 - i : i;
  };

  return (
    <div
      class={styles.piece}
      classList={{ [styles.interactive]: props.interactive }}
      style={{ translate: `${fileIndex() * 100}% ${rankIndex() * 100}%` }}
      aria-hidden="true"
    >
      <PieceSvg type={props.piece.type} color={props.piece.color} />
    </div>
  );
}
