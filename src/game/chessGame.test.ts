import { beforeEach, describe, expect, it } from "vitest";
import { type ChessGame, createChessGame, type MoveResult } from "./chessGame";
import type { PieceSymbol, Square } from "./types";

type MoveTuple = [Square, Square, PieceSymbol?];

/** Applies a sequence of moves and returns the last MoveResult. */
function applyMoves(game: ChessGame, moves: MoveTuple[]): MoveResult {
  let last: MoveResult | undefined;
  for (const [from, to, promotion] of moves) {
    last = game.move(from, to, promotion);
  }
  if (!last) throw new Error("applyMoves called with an empty move list");
  return last;
}

describe("chessGame", () => {
  let game: ChessGame;

  beforeEach(() => {
    game = createChessGame();
  });

  it("returns the initial position on reset", () => {
    const snapshot = game.reset();

    expect(snapshot.fen).toBe(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    );
    expect(snapshot.turn).toBe("w");
    expect(snapshot.pieces).toHaveLength(32);
    expect(snapshot.status).toEqual({ kind: "playing", check: false });
  });

  it("records normal moves in history with correct san/from/to", () => {
    game.reset();
    const result = applyMoves(game, [
      ["e2", "e4"],
      ["e7", "e5"],
      ["g1", "f3"],
    ]);

    expect(result.entry).toEqual({
      san: "Nf3",
      from: "g1",
      to: "f3",
      color: "w",
      captured: undefined,
    });
    expect(game.history().map((e) => e.san)).toEqual(["e4", "e5", "Nf3"]);
  });

  it("castling: king and rook land on the correct squares and keep their ids", () => {
    game.reset();
    const before = applyMoves(game, [
      ["e2", "e4"],
      ["e7", "e5"],
      ["g1", "f3"],
      ["b8", "c6"],
      ["f1", "c4"],
      ["g8", "f6"],
    ]).snapshot;
    const kingBefore = before.pieces.find((p) => p.square === "e1");
    const rookBefore = before.pieces.find((p) => p.square === "h1");
    expect(kingBefore).toBeDefined();
    expect(rookBefore).toBeDefined();

    const after = game.move("e1", "g1").snapshot;

    const kingAfter = after.pieces.find((p) => p.square === "g1");
    const rookAfter = after.pieces.find((p) => p.square === "f1");
    expect(kingAfter?.id).toBe(kingBefore?.id);
    expect(rookAfter?.id).toBe(rookBefore?.id);
    expect(after.pieces.some((p) => p.square === "e1")).toBe(false);
    expect(after.pieces.some((p) => p.square === "h1")).toBe(false);
  });

  it("en passant removes the captured pawn and records captured: 'p'", () => {
    game.reset();
    applyMoves(game, [
      ["e2", "e4"],
      ["g8", "f6"],
      ["e4", "e5"],
      ["d7", "d5"],
    ]);
    expect(game.legalTargets("e5")).toContain("d6");

    const result = game.move("e5", "d6");

    expect(result.entry.captured).toBe("p");
    expect(result.snapshot.pieces.some((p) => p.square === "d5")).toBe(false);
    expect(
      result.snapshot.pieces.some(
        (p) => p.square === "d6" && p.color === "w" && p.type === "p",
      ),
    ).toBe(true);
  });

  it("promotion: isPromotion is true and a new id is spawned for the promoted piece", () => {
    game.reset();
    applyMoves(game, [
      ["h2", "h4"],
      ["g7", "g6"],
      ["h4", "h5"],
      ["g8", "f6"],
      ["h5", "g6"],
      ["f6", "e4"],
      ["g6", "g7"],
      ["e4", "c3"],
    ]);

    expect(game.isPromotion("g7", "h8")).toBe(true);
    expect(game.isPromotion("g7", "f6")).toBe(false); // not a legal move at all

    const result = game.move("g7", "h8", "q");

    expect(result.entry.captured).toBe("r");
    const promoted = result.snapshot.pieces.find((p) => p.square === "h8");
    expect(promoted?.type).toBe("q");
    expect(promoted?.color).toBe("w");
    expect(promoted?.id).not.toMatch(/^wp-/);
  });

  it("detects Fool's mate as checkmate with black winning", () => {
    game.reset();
    const result = applyMoves(game, [
      ["f2", "f3"],
      ["e7", "e5"],
      ["g2", "g4"],
      ["d8", "h4"],
    ]);

    expect(result.snapshot.status).toEqual({ kind: "checkmate", winner: "b" });
  });

  it("detects stalemate", () => {
    game.reset();
    const result = applyMoves(game, STALEMATE_MOVES);

    expect(result.snapshot.status).toEqual({ kind: "stalemate" });
  });

  it("detects threefold repetition", () => {
    game.reset();
    const result = applyMoves(game, [
      ["g1", "f3"],
      ["g8", "f6"],
      ["f3", "g1"],
      ["f6", "g8"],
      ["g1", "f3"],
      ["g8", "f6"],
      ["f3", "g1"],
      ["f6", "g8"],
    ]);

    expect(result.snapshot.status).toEqual({
      kind: "draw",
      reason: "threefold",
    });
  });

  it("detects insufficient material", () => {
    game.reset();
    const result = applyMoves(game, INSUFFICIENT_MATERIAL_MOVES);

    expect(result.snapshot.status).toEqual({
      kind: "draw",
      reason: "insufficient",
    });
  });

  it("detects the fifty-move rule", () => {
    game.reset();
    const result = applyMoves(game, FIFTY_MOVE_RULE_MOVES);

    expect(result.snapshot.status).toEqual({
      kind: "draw",
      reason: "fifty-move",
    });
  });

  it("moveUci applies plain moves like 'e2e4'", () => {
    game.reset();
    const result = game.moveUci("e2e4");

    expect(result.entry).toEqual({
      san: "e4",
      from: "e2",
      to: "e4",
      color: "w",
      captured: undefined,
    });
  });

  it("moveUci applies promotion moves like 'e7e8q'", () => {
    game.reset();
    applyMoves(game, [
      ["h2", "h4"],
      ["g7", "g6"],
      ["h4", "h5"],
      ["g8", "f6"],
      ["h5", "g6"],
      ["f6", "e4"],
      ["g6", "g7"],
      ["e4", "c3"],
    ]);

    const result = game.moveUci("g7h8q");

    const promoted = result.snapshot.pieces.find((p) => p.square === "h8");
    expect(promoted?.type).toBe("q");
    expect(promoted?.color).toBe("w");
  });

  it("derives capturedBy from history", () => {
    game.reset();
    applyMoves(game, [
      ["e2", "e4"],
      ["e7", "e5"],
      ["g1", "f3"],
      ["d7", "d6"],
      ["f3", "e5"], // white knight captures black pawn
      ["d6", "e5"], // black pawn captures white knight
    ]);

    expect(game.capturedBy("w")).toEqual(["p"]);
    expect(game.capturedBy("b")).toEqual(["n"]);
  });

  it("loadPgn restores a game's position and history from a saved pgn", () => {
    game.reset();
    const played = applyMoves(game, [
      ["e2", "e4"],
      ["e7", "e5"],
      ["g1", "f3"],
    ]);

    const restored = createChessGame();
    const snapshot = restored.loadPgn(played.snapshot.pgn);

    expect(snapshot.fen).toBe(played.snapshot.fen);
    expect(snapshot.turn).toBe(played.snapshot.turn);
    expect(restored.history().map((e) => e.san)).toEqual(["e4", "e5", "Nf3"]);
  });

  it("loadPgn throws on invalid PGN", () => {
    expect(() => game.loadPgn("not a valid pgn at all $$$")).toThrow();
  });

  it("loadPgn resets to a clean position when a later move in an otherwise well-formed PGN is illegal", () => {
    // Mirrors real usage (gameStore always calls reset() before loadPgn —
    // see createGameStore()/boot()), so `pieces` is populated before the
    // failing call rather than starting out empty.
    game.reset();

    // Grammatically valid movetext, but "Nf6" is illegal for white here (chess.js
    // replays moves one at a time internally and throws mid-replay, after "e4 e5"
    // have already been applied to its own board).
    const badPgn = "1. e4 e5 2. Nf6 Nc6";

    expect(() => game.loadPgn(badPgn)).toThrow();

    // The wrapper must still be internally consistent: its own tracked state
    // (untouched by the failed call, since it's only reassigned on success)
    // matches a genuinely reset chess.js board, not one left mid-replay at "e4 e5".
    expect(game.history()).toEqual([]);
    expect(game.legalTargets("e2")).toEqual(["e3", "e4"]);

    // A subsequent legal move must succeed against a clean board rather than
    // fail (or silently apply on top of the corrupted "e4 e5" position).
    const result = game.move("e2", "e4");
    expect(result.entry.san).toBe("e4");
    expect(result.snapshot.pieces).toHaveLength(32);
  });
});

const STALEMATE_MOVES: MoveTuple[] = [
  ["e2", "e3"],
  ["a7", "a5"],
  ["d1", "h5"],
  ["a8", "a6"],
  ["h5", "a5"],
  ["h7", "h5"],
  ["a5", "c7"],
  ["a6", "h6"],
  ["h2", "h4"],
  ["f7", "f6"],
  ["c7", "d7"],
  ["e8", "f7"],
  ["d7", "b7"],
  ["d8", "d3"],
  ["b7", "b8"],
  ["d3", "h7"],
  ["b8", "c8"],
  ["f7", "g6"],
  ["c8", "e6"],
];

const INSUFFICIENT_MATERIAL_MOVES: MoveTuple[] = [
  ["b2", "b4"],
  ["b8", "a6"],
  ["e2", "e4"],
  ["a6", "b4"],
  ["a2", "a3"],
  ["b4", "c2"],
  ["d1", "c2"],
  ["b7", "b5"],
  ["c2", "c7"],
  ["d8", "c7"],
  ["f1", "b5"],
  ["c7", "h2"],
  ["h1", "h2"],
  ["g7", "g5"],
  ["b5", "d7"],
  ["e8", "d7"],
  ["h2", "h7"],
  ["h8", "h7"],
  ["g1", "e2"],
  ["c8", "a6"],
  ["d2", "d4"],
  ["a6", "e2"],
  ["e1", "e2"],
  ["h7", "h5"],
  ["c1", "g5"],
  ["h5", "g5"],
  ["f2", "f3"],
  ["g5", "g2"],
  ["e2", "d3"],
  ["g8", "h6"],
  ["f3", "f4"],
  ["g2", "c2"],
  ["d3", "c2"],
  ["d7", "c6"],
  ["e4", "e5"],
  ["c6", "b6"],
  ["c2", "d2"],
  ["f7", "f5"],
  ["a1", "a2"],
  ["e7", "e6"],
  ["b1", "c3"],
  ["f8", "a3"],
  ["a2", "a3"],
  ["a7", "a5"],
  ["a3", "a5"],
  ["b6", "a5"],
  ["c3", "e4"],
  ["f5", "e4"],
  ["d2", "e2"],
  ["h6", "f7"],
  ["e2", "d2"],
  ["f7", "e5"],
  ["f4", "e5"],
  ["a8", "a7"],
  ["d2", "e3"],
  ["a5", "a4"],
  ["e3", "e4"],
  ["a7", "h7"],
  ["e4", "f3"],
  ["h7", "h2"],
  ["f3", "e3"],
  ["a4", "a3"],
  ["d4", "d5"],
  ["e6", "d5"],
  ["e3", "d3"],
  ["h2", "h3"],
  ["d3", "d4"],
  ["h3", "b3"],
  ["d4", "d5"],
  ["b3", "b5"],
  ["d5", "e6"],
  ["b5", "e5"],
  ["e6", "e5"],
];

const FIFTY_MOVE_RULE_MOVES: MoveTuple[] = [
  ["b1", "a3"],
  ["b8", "c6"],
  ["a3", "b5"],
  ["a8", "b8"],
  ["b5", "c3"],
  ["b8", "a8"],
  ["c3", "a4"],
  ["a8", "b8"],
  ["a4", "b6"],
  ["g8", "h6"],
  ["b6", "d5"],
  ["b8", "a8"],
  ["d5", "b6"],
  ["h8", "g8"],
  ["b6", "d5"],
  ["a8", "b8"],
  ["d5", "b6"],
  ["g8", "h8"],
  ["b6", "d5"],
  ["b8", "a8"],
  ["d5", "b6"],
  ["c6", "b8"],
  ["b6", "d5"],
  ["b8", "a6"],
  ["d5", "b6"],
  ["a8", "b8"],
  ["b6", "d5"],
  ["h8", "g8"],
  ["d5", "b6"],
  ["a6", "c5"],
  ["b6", "d5"],
  ["b8", "a8"],
  ["d5", "b6"],
  ["g8", "h8"],
  ["b6", "d5"],
  ["a8", "b8"],
  ["d5", "b6"],
  ["h6", "g8"],
  ["b6", "d5"],
  ["b8", "a8"],
  ["d5", "b6"],
  ["g8", "f6"],
  ["b6", "c4"],
  ["a8", "b8"],
  ["c4", "a5"],
  ["b8", "a8"],
  ["a5", "c6"],
  ["h8", "g8"],
  ["c6", "e5"],
  ["a8", "b8"],
  ["e5", "c6"],
  ["g8", "h8"],
  ["c6", "e5"],
  ["b8", "a8"],
  ["e5", "g6"],
  ["h8", "g8"],
  ["g6", "h4"],
  ["a8", "b8"],
  ["h4", "f5"],
  ["b8", "a8"],
  ["f5", "h6"],
  ["g8", "h8"],
  ["h6", "f5"],
  ["a8", "b8"],
  ["f5", "h6"],
  ["f6", "h5"],
  ["h6", "g4"],
  ["b8", "a8"],
  ["g4", "e5"],
  ["a8", "b8"],
  ["e5", "c6"],
  ["b8", "a8"],
  ["c6", "d4"],
  ["a8", "b8"],
  ["d4", "b5"],
  ["b8", "a8"],
  ["b5", "c3"],
  ["a8", "b8"],
  ["c3", "d5"],
  ["b8", "a8"],
  ["d5", "b6"],
  ["a8", "b8"],
  ["b6", "c4"],
  ["b8", "a8"],
  ["c4", "a5"],
  ["a8", "b8"],
  ["a1", "b1"],
  ["b8", "a8"],
  ["a5", "c6"],
  ["h8", "g8"],
  ["c6", "e5"],
  ["a8", "b8"],
  ["e5", "c6"],
  ["g8", "h8"],
  ["c6", "e5"],
  ["b8", "a8"],
  ["e5", "g6"],
  ["h8", "g8"],
  ["g6", "h4"],
  ["a8", "b8"],
];
