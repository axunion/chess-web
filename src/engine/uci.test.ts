import { describe, expect, it } from "vitest";
import {
  cmdGo,
  cmdPosition,
  cmdSetElo,
  cmdSetLimitStrength,
  cmdSetSkill,
  isReadyOk,
  isUciOk,
  parseBestMove,
  parseInfoScore,
} from "./uci";

describe("uci command builders", () => {
  it("builds the setoption Skill Level command", () => {
    expect(cmdSetSkill(8)).toBe("setoption name Skill Level value 8");
  });

  it("builds the setoption UCI_LimitStrength command", () => {
    expect(cmdSetLimitStrength(true)).toBe(
      "setoption name UCI_LimitStrength value true",
    );
    expect(cmdSetLimitStrength(false)).toBe(
      "setoption name UCI_LimitStrength value false",
    );
  });

  it("builds the setoption UCI_Elo command", () => {
    expect(cmdSetElo(1900)).toBe("setoption name UCI_Elo value 1900");
  });

  it("builds the position fen command", () => {
    expect(cmdPosition("startpos")).toBe("position fen startpos");
  });

  it("builds the go movetime command", () => {
    expect(cmdGo(600)).toBe("go movetime 600");
  });
});

describe("parseBestMove", () => {
  it("extracts the move from a bestmove line with a ponder move", () => {
    expect(parseBestMove("bestmove e2e4 ponder d7d5")).toBe("e2e4");
  });

  it("extracts the move from a bestmove line without a ponder move", () => {
    expect(parseBestMove("bestmove e7e8q")).toBe("e7e8q");
  });

  it("returns null for bestmove (none)", () => {
    expect(parseBestMove("bestmove (none)")).toBeNull();
  });

  it("returns null for unrelated search output lines", () => {
    expect(
      parseBestMove("info depth 12 seldepth 18 multipv 1 score cp 24"),
    ).toBeNull();
  });

  it("returns null for other handshake lines", () => {
    expect(parseBestMove("uciok")).toBeNull();
    expect(parseBestMove("id name Stockfish 17.1")).toBeNull();
  });
});

describe("parseInfoScore", () => {
  it("extracts a centipawn score", () => {
    expect(
      parseInfoScore("info depth 12 seldepth 18 score cp 24 pv e2e4"),
    ).toEqual({ kind: "cp", value: 24 });
  });

  it("extracts a negative centipawn score", () => {
    expect(parseInfoScore("info depth 8 score cp -135 pv e7e5")).toEqual({
      kind: "cp",
      value: -135,
    });
  });

  it("extracts a mate score", () => {
    expect(parseInfoScore("info depth 5 score mate -3 pv f7f6")).toEqual({
      kind: "mate",
      value: -3,
    });
  });

  it("still extracts the score from bound lines (aspiration window)", () => {
    expect(parseInfoScore("info depth 10 score cp 50 upperbound")).toEqual({
      kind: "cp",
      value: 50,
    });
  });

  it("returns null for lines with no score field", () => {
    expect(parseInfoScore("bestmove e2e4")).toBeNull();
    expect(parseInfoScore("uciok")).toBeNull();
    expect(parseInfoScore("info string NNUE evaluation enabled")).toBeNull();
  });
});

describe("isUciOk / isReadyOk", () => {
  it("recognizes uciok", () => {
    expect(isUciOk("uciok")).toBe(true);
    expect(isUciOk("id name Stockfish")).toBe(false);
    expect(isUciOk("readyok")).toBe(false);
  });

  it("recognizes readyok", () => {
    expect(isReadyOk("readyok")).toBe(true);
    expect(isReadyOk("uciok")).toBe(false);
  });
});
