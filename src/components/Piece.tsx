import type { BoardPiece } from "../game/types";
import styles from "./Piece.module.css";
import { PieceSvg } from "./pieces/pieceSvg";

const FILES = "abcdefgh";

interface PieceProps {
  piece: BoardPiece;
  interactive: boolean;
}

export function Piece(props: PieceProps) {
  const fileIndex = () => FILES.indexOf(props.piece.square[0]);
  const rankIndex = () => 8 - Number(props.piece.square[1]); // 0 = rank 8 (top row)

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
