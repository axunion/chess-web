import {
  createEffect,
  createMemo,
  createSignal,
  For,
  on,
  onCleanup,
} from "solid-js";
import type { BoardPiece, GameState, PieceSymbol, Square } from "../game/types";
import styles from "./Chessboard.module.css";
import { Piece } from "./Piece";
import { PromotionDialog } from "./PromotionDialog";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1] as const;

// Must stay in sync with --dur-flip in theme/tokens.css — this is how long
// the rotate-out leg takes before the board is edge-on (rotateX(90deg)) and
// the underlying orientation gets swapped while it's visually hidden by
// perspective foreshortening.
const FLIP_HALF_MS = 240;

const reducedMotionQuery = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
);

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
  /** Render black at the bottom (spec/04 §3: CPU game with the human playing black). */
  flipped?: boolean;
  onTapSquare?: (square: Square) => void;
  onConfirmPromotion?: (piece: PieceSymbol) => void;
  onCancelPromotion?: () => void;
}

export function Chessboard(props: ChessboardProps) {
  // The orientation actually drawn — decoupled from props.flipped so a
  // toggle can play out as a rotateX card flip (see .frame.flipping in
  // Chessboard.module.css) instead of every piece instantly sliding to its
  // point-symmetric opposite square, which read as the board collapsing
  // into its own center. displayFlipped only jumps to the new value at the
  // rotate-out leg's midpoint, while the board is edge-on and invisible.
  const [displayFlipped, setDisplayFlipped] = createSignal(!!props.flipped);
  const [flipping, setFlipping] = createSignal(false);
  // Stays true for the whole flip (both the rotate-out and rotate-in legs),
  // not just the rotate-out leg like `flipping` — freezes each Piece's own
  // translate transition (see Piece.tsx's `frozen` prop) so the mid-flip
  // position swap below never plays out as an independent slide once the
  // board starts rotating back into view.
  const [piecesFrozen, setPiecesFrozen] = createSignal(false);
  let outTimer: ReturnType<typeof setTimeout> | undefined;
  let settleTimer: ReturnType<typeof setTimeout> | undefined;

  // Re-entrant so a target arriving mid-animation (props.flipped toggled
  // twice in quick succession) cancels the in-flight leg and retargets
  // instead of being silently dropped — checking `target === displayFlipped()`
  // alone isn't enough mid-flight, since displayFlipped hasn't swapped yet.
  function goTo(target: boolean, animate: boolean): void {
    if (target === displayFlipped() && !flipping() && !piecesFrozen()) return;
    clearTimeout(outTimer);
    clearTimeout(settleTimer);
    if (!animate) {
      setDisplayFlipped(target);
      setFlipping(false);
      setPiecesFrozen(false);
      return;
    }
    setPiecesFrozen(true);
    setFlipping(true);
    outTimer = setTimeout(() => {
      setDisplayFlipped(target);
      setFlipping(false);
      // Keep pieces frozen through the rotate-in leg too — the board isn't
      // fully edge-on for that whole leg, only at its exact start.
      settleTimer = setTimeout(() => setPiecesFrozen(false), FLIP_HALF_MS);
    }, FLIP_HALF_MS);
  }

  createEffect(
    on(
      () => props.flipped,
      (next) => {
        goTo(!!next, !reducedMotionQuery.matches);
      },
      { defer: true },
    ),
  );
  onCleanup(() => {
    clearTimeout(outTimer);
    clearTimeout(settleTimer);
  });

  // Reversing draw order (rather than a CSS transform) keeps rank/file
  // labels and piece glyphs upright once the flip animation settles
  // (spec/04 §3).
  const orderedRanks = createMemo(() =>
    displayFlipped() ? [...RANKS].reverse() : RANKS,
  );
  const orderedFiles = createMemo(() =>
    displayFlipped() ? [...FILES].reverse() : FILES,
  );

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
    <div class={styles.frame} classList={{ [styles.flipping]: flipping() }}>
      <div class={styles.board}>
        <div class={styles.squares}>
          <For each={orderedRanks()}>
            {(rank) => (
              <For each={orderedFiles()}>
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
            {(piece) => (
              <Piece
                piece={piece}
                interactive={false}
                flipped={displayFlipped()}
                frozen={piecesFrozen()}
                moving={props.state.lastMove?.to === piece.square}
              />
            )}
          </For>
        </div>
      </div>
      <div class={styles.rankGutter} aria-hidden="true">
        <For each={orderedRanks()}>
          {(rank) => <span class={styles.gutterLabel}>{rank}</span>}
        </For>
      </div>
      <div class={styles.fileGutter} aria-hidden="true">
        <For each={orderedFiles()}>
          {(file) => <span class={styles.gutterLabel}>{file}</span>}
        </For>
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
