import { createMemo, For } from "solid-js";
import type { BoardPiece, GameState, PieceSymbol, Square } from "../game/types";
import styles from "./Chessboard.module.css";
import { Piece } from "./Piece";
import { PromotionDialog } from "./PromotionDialog";

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
  onConfirmPromotion?: (piece: PieceSymbol) => void;
  onCancelPromotion?: () => void;
}

export function Chessboard(props: ChessboardProps) {
  const pieceBySquare = createMemo(() => {
    const map = new Map<Square, BoardPiece>();
    for (const piece of props.state.pieces) {
      map.set(piece.square, piece);
    }
    return map;
  });

  const checkedKingSquare = createMemo<Square | null>(() => {
    const status = props.state.status;
    if (status.kind !== "playing" || !status.check) return null;
    const king = props.state.pieces.find(
      (p) => p.type === "k" && p.color === props.state.turn,
    );
    return king?.square ?? null;
  });

  function squareLabel(square: Square): string {
    const piece = pieceBySquare().get(square);
    if (!piece) return `${square}, empty`;
    const colorName = piece.color === "w" ? "white" : "black";
    return `${square}, ${colorName} ${PIECE_NAMES[piece.type]}`;
  }

  /**
   * A legal target square counts as a "capture" for highlight purposes when
   * it holds an opponent piece, or when it's an en-passant capture (a pawn
   * moving diagonally onto an otherwise empty square).
   */
  function isCaptureTarget(to: Square): boolean {
    const from = props.state.selected;
    if (!from) return false;
    if (pieceBySquare().has(to)) return true;
    const moving = pieceBySquare().get(from);
    return moving?.type === "p" && from[0] !== to[0];
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
                        [styles.selected]: props.state.selected === square,
                        [styles.lastMove]:
                          props.state.selected !== square &&
                          (props.state.lastMove?.from === square ||
                            props.state.lastMove?.to === square),
                        [styles.check]:
                          props.state.selected !== square &&
                          checkedKingSquare() === square,
                        [styles.legalEmpty]:
                          props.state.legalTargets.includes(square) &&
                          !isCaptureTarget(square),
                        [styles.legalCapture]:
                          props.state.legalTargets.includes(square) &&
                          isCaptureTarget(square),
                      }}
                      aria-label={squareLabel(square)}
                      aria-pressed={
                        props.state.selected === square || undefined
                      }
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
      <PromotionDialog
        pending={props.state.pendingPromotion}
        color={props.state.turn}
        onSelect={(piece) => props.onConfirmPromotion?.(piece)}
        onCancel={() => props.onCancelPromotion?.()}
      />
    </div>
  );
}
