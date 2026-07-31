import { beforeEach, describe, expect, it } from "vitest";
import type { Square } from "../game/types";
import { createGameStore, type GameStore } from "./gameStore";

describe("gameStore (PvP)", () => {
  let store: GameStore;

  beforeEach(() => {
    store = createGameStore();
  });

  it("starts at the initial position in pvp mode", () => {
    expect(store.state.turn).toBe("w");
    expect(store.state.pieces).toHaveLength(32);
    expect(store.state.status).toEqual({ kind: "playing", check: false });
    expect(store.state.config.mode).toBe("pvp");
  });

  describe("newGame", () => {
    it("resets to a fresh position with the given config and a full move can then be played", () => {
      store.tapSquare("e2");
      store.tapSquare("e4");
      expect(store.state.history).toHaveLength(1);

      store.newGame({ mode: "pvp", difficulty: "normal", playerColor: "w" });

      expect(store.state.history).toHaveLength(0);
      expect(store.state.turn).toBe("w");
      expect(store.state.pieces).toHaveLength(32);
      expect(store.state.status).toEqual({ kind: "playing", check: false });

      store.tapSquare("g1");
      store.tapSquare("f3");
      expect(store.state.history.map((e) => e.san)).toEqual(["Nf3"]);
    });
  });

  describe("tapSquare state transitions (spec/05 §2)", () => {
    it("#1 selects an own piece when nothing is selected, computing legal targets", () => {
      store.tapSquare("e2");

      expect(store.state.selected).toBe("e2");
      expect(store.state.legalTargets.sort()).toEqual(["e3", "e4"]);
    });

    it("#1 still selects an own piece that has zero legal moves (e.g. pinned)", () => {
      // Pin the d2 pawn to the white king with a black bishop on b4.
      store.tapSquare("d2");
      store.tapSquare("d4");
      store.tapSquare("e7");
      store.tapSquare("e5");
      store.tapSquare("b1");
      store.tapSquare("c3");
      store.tapSquare("f8");
      store.tapSquare("b4");

      store.tapSquare("c3");

      expect(store.state.selected).toBe("c3");
      expect(store.state.legalTargets).toEqual([]);
    });

    it("#2 does nothing when tapping an empty square or opponent piece while unselected", () => {
      store.tapSquare("e4");
      expect(store.state.selected).toBeNull();

      store.tapSquare("e7");
      expect(store.state.selected).toBeNull();
      expect(store.state.turn).toBe("w");
    });

    it("#3 confirms the move when tapping a legal target", () => {
      store.tapSquare("e2");
      store.tapSquare("e4");

      expect(store.state.turn).toBe("b");
      expect(store.state.selected).toBeNull();
      expect(store.state.legalTargets).toEqual([]);
      expect(store.state.lastMove).toEqual({ from: "e2", to: "e4" });
      expect(store.state.pieces.find((p) => p.square === "e4")?.type).toBe("p");
      expect(store.state.history.map((e) => e.san)).toEqual(["e4"]);
    });

    it("#3 opens the promotion dialog instead of moving immediately when the target is a promotion", () => {
      playToPromotion(store);

      store.tapSquare("g7");
      store.tapSquare("h8");

      expect(store.state.pendingPromotion).toEqual({ from: "g7", to: "h8" });
      expect(store.state.turn).toBe("w"); // move not applied yet
      expect(store.state.pieces.find((p) => p.square === "g7")).toBeDefined();
    });

    it("#4 switches the selection when tapping another own piece", () => {
      store.tapSquare("e2");
      store.tapSquare("d2");

      expect(store.state.selected).toBe("d2");
      expect(store.state.legalTargets.sort()).toEqual(["d3", "d4"]);
    });

    it("#5 deselects when tapping the selected piece again", () => {
      store.tapSquare("e2");
      store.tapSquare("e2");

      expect(store.state.selected).toBeNull();
      expect(store.state.legalTargets).toEqual([]);
    });

    it("#6 deselects when tapping any other non-legal square", () => {
      store.tapSquare("e2");
      store.tapSquare("a7"); // opponent piece, not a legal target for e2

      expect(store.state.selected).toBeNull();
      expect(store.state.legalTargets).toEqual([]);
    });
  });

  describe("promotion", () => {
    it("confirmPromotion applies the chosen piece and clears pendingPromotion", () => {
      playToPromotion(store);
      store.tapSquare("g7");
      store.tapSquare("h8");

      store.confirmPromotion("q");

      expect(store.state.pendingPromotion).toBeNull();
      const promoted = store.state.pieces.find((p) => p.square === "h8");
      expect(promoted?.type).toBe("q");
      expect(promoted?.color).toBe("w");
      expect(store.state.turn).toBe("b");
    });

    it("cancelPromotion clears pendingPromotion and the selection without changing the turn", () => {
      playToPromotion(store);
      store.tapSquare("g7");
      store.tapSquare("h8");

      store.cancelPromotion();

      expect(store.state.pendingPromotion).toBeNull();
      expect(store.state.selected).toBeNull();
      expect(store.state.legalTargets).toEqual([]);
      expect(store.state.turn).toBe("w");
      expect(store.state.pieces.find((p) => p.square === "g7")).toBeDefined();
    });
  });

  describe("input lock (spec/05 §4, pvp-reachable cases)", () => {
    it("ignores tapSquare once the game has ended", () => {
      playFoolsMate(store);
      expect(store.state.status.kind).toBe("checkmate");

      store.tapSquare("h4"); // black queen, would otherwise be selectable

      expect(store.state.selected).toBeNull();
    });

    it("ignores tapSquare while the promotion dialog is pending", () => {
      playToPromotion(store);
      store.tapSquare("g7");
      store.tapSquare("h8");
      expect(store.state.pendingPromotion).not.toBeNull();

      store.tapSquare("e2"); // unrelated own piece, should be ignored

      // Nothing changed: selection and pending promotion are exactly as
      // they were before the ignored tap.
      expect(store.state.selected).toBe("g7");
      expect(store.state.pendingPromotion).toEqual({ from: "g7", to: "h8" });
    });
  });

  describe("resign", () => {
    it("sets status to resigned with the opposite color as winner", () => {
      store.resign("w");

      expect(store.state.status).toEqual({ kind: "resigned", winner: "b" });
      expect(store.state.selected).toBeNull();
    });

    it("is a no-op once the game is already over", () => {
      store.resign("w");
      store.resign("b");

      expect(store.state.status).toEqual({ kind: "resigned", winner: "b" });
    });
  });
});

/** Drives the store (via tapSquare) to a position with a white promotion available on g7-h8. */
function playToPromotion(store: GameStore): void {
  const moves: [Square, Square][] = [
    ["h2", "h4"],
    ["g7", "g6"],
    ["h4", "h5"],
    ["g8", "f6"],
    ["h5", "g6"],
    ["f6", "e4"],
    ["g6", "g7"],
    ["e4", "c3"],
  ];
  for (const [from, to] of moves) {
    store.tapSquare(from);
    store.tapSquare(to);
  }
}

/** Fool's mate: f3 e5 g4 Qh4#. */
function playFoolsMate(store: GameStore): void {
  const moves: [Square, Square][] = [
    ["f2", "f3"],
    ["e7", "e5"],
    ["g2", "g4"],
    ["d8", "h4"],
  ];
  for (const [from, to] of moves) {
    store.tapSquare(from);
    store.tapSquare(to);
  }
}
