import type { BoardPiece, Color } from "../game/types";

const PIECE_VALUES: Record<BoardPiece["type"], number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

/**
 * Each side's material advantage over the other, clamped to 0 when that side
 * isn't ahead. Computed from pieces still on the board rather than captured
 * pieces — a pawn promotion changes material without a corresponding capture
 * entry, so summing captures would under/overcount after a promotion.
 */
export function materialAdvantage(pieces: BoardPiece[]): Record<Color, number> {
  let white = 0;
  let black = 0;
  for (const piece of pieces) {
    const value = PIECE_VALUES[piece.type];
    if (piece.color === "w") white += value;
    else black += value;
  }
  return {
    w: Math.max(0, white - black),
    b: Math.max(0, black - white),
  };
}
