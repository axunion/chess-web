import { createMemo, For } from "solid-js";
import type { BoardPiece, GameState, Square } from "../game/types";
import styles from "./Chessboard.module.css";
import { Piece } from "./Piece";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1] as const;

const PIECE_NAMES: Record<BoardPiece["type"], string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

interface ChessboardProps {
  state: GameState;
  onTapSquare?: (square: Square) => void;
}

export function Chessboard(props: ChessboardProps) {
  const pieceBySquare = createMemo(() => {
    const map = new Map<Square, BoardPiece>();
    for (const piece of props.state.pieces) {
      map.set(piece.square, piece);
    }
    return map;
  });

  function squareLabel(square: Square): string {
    const piece = pieceBySquare().get(square);
    if (!piece) return `${square}, empty`;
    const colorName = piece.color === "w" ? "white" : "black";
    return `${square}, ${colorName} ${PIECE_NAMES[piece.type]}`;
  }

  return (
    <div class={styles.frame}>
      <div class={styles.ranks} aria-hidden="true">
        <For each={RANKS}>{(rank) => <span>{rank}</span>}</For>
      </div>
      <div class={styles.board}>
        <div class={styles.squares}>
          <For each={RANKS}>
            {(rank) => (
              <For each={FILES}>
                {(file) => {
                  const square = `${file}${rank}` as Square;
                  const isLight = (FILES.indexOf(file) + (rank - 1)) % 2 === 1;
                  return (
                    <button
                      type="button"
                      class={styles.square}
                      classList={{
                        [styles.light]: isLight,
                        [styles.dark]: !isLight,
                      }}
                      aria-label={squareLabel(square)}
                      onClick={() => props.onTapSquare?.(square)}
                    />
                  );
                }}
              </For>
            )}
          </For>
        </div>
        <div class={styles.pieceLayer}>
          <For each={props.state.pieces}>
            {(piece) => <Piece piece={piece} interactive={false} />}
          </For>
        </div>
      </div>
      <div class={styles.corner} aria-hidden="true" />
      <div class={styles.files} aria-hidden="true">
        <For each={FILES}>{(file) => <span>{file}</span>}</For>
      </div>
    </div>
  );
}
