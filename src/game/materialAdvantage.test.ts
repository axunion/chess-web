import { describe, expect, it } from "vitest";
import { materialAdvantage } from "./materialAdvantage";
import type { BoardPiece } from "./types";

function piece(
  type: BoardPiece["type"],
  color: BoardPiece["color"],
  square: BoardPiece["square"],
  id: string,
): BoardPiece {
  return { type, color, square, id };
}

describe("materialAdvantage", () => {
  it("is zero for both sides in the starting position", () => {
    const pieces: BoardPiece[] = [
      piece("k", "w", "e1", "wk-0"),
      piece("k", "b", "e8", "bk-0"),
      piece("p", "w", "e2", "wp-0"),
      piece("p", "b", "e7", "bp-0"),
    ];
    expect(materialAdvantage(pieces)).toEqual({ w: 0, b: 0 });
  });

  it("gives the side that captured a piece a one-sided advantage", () => {
    const pieces: BoardPiece[] = [
      piece("k", "w", "e1", "wk-0"),
      piece("k", "b", "e8", "bk-0"),
      piece("n", "w", "c3", "wn-0"),
      // Black's knight was captured — only White's remains.
    ];
    expect(materialAdvantage(pieces)).toEqual({ w: 3, b: 0 });
  });

  it("counts a promoted queen correctly, unlike a capture-based tally would", () => {
    // A white pawn promoted to a queen with no captures having happened —
    // capture-list-derived material would see this as 0-0.
    const pieces: BoardPiece[] = [
      piece("k", "w", "e1", "wk-0"),
      piece("k", "b", "e8", "bk-0"),
      piece("q", "w", "a8", "wp-0"),
    ];
    expect(materialAdvantage(pieces)).toEqual({ w: 9, b: 0 });
  });
});
