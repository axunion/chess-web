import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EngineAdapter } from "../engine/engineAdapter";
import type { Difficulty } from "../game/types";
import { STORAGE_KEY } from "../persistence/schema";
import { saveGame } from "../persistence/storage";
import { createGameStore } from "./gameStore";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (err: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Waits long enough for any pending microtask chains in the store to settle. */
function flushAsync(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * A controllable `EngineAdapter` double (spec/02 §4, spec/06 §1.4): `init()`
 * and `bestMove()` stay pending until the test explicitly resolves/rejects
 * them, and every call is recorded for assertions.
 */
function createControllableEngine() {
  let initDeferred = createDeferred<void>();
  let initSettledOk = false;
  let bestMoveDeferred: Deferred<string> | null = null;

  const bestMoveCalls: { fen: string; difficulty: Difficulty }[] = [];
  let initCallCount = 0;
  let disposeCallCount = 0;

  const adapter: EngineAdapter = {
    init: () => {
      initCallCount += 1;
      return initSettledOk ? Promise.resolve() : initDeferred.promise;
    },
    bestMove: (fen, difficulty) => {
      bestMoveCalls.push({ fen, difficulty });
      bestMoveDeferred = createDeferred<string>();
      return bestMoveDeferred.promise;
    },
    dispose: () => {
      disposeCallCount += 1;
    },
  };

  return {
    adapter,
    bestMoveCalls,
    get initCallCount() {
      return initCallCount;
    },
    get disposeCallCount() {
      return disposeCallCount;
    },
    resolveInit(): void {
      initSettledOk = true;
      initDeferred.resolve();
    },
    rejectInit(err: unknown): void {
      initDeferred.reject(err);
      initDeferred = createDeferred<void>(); // fresh deferred for a future retry
    },
    resolveBestMove(uci: string): void {
      bestMoveDeferred?.resolve(uci);
    },
    rejectBestMove(err: unknown): void {
      bestMoveDeferred?.reject(err);
    },
  };
}

describe("gameStore (CPU)", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it("thinks and auto-applies the engine's move after the human's move", async () => {
    const engine = createControllableEngine();
    const store = createGameStore(() => engine.adapter);
    store.newGame({ mode: "cpu", difficulty: "normal", playerColor: "w" });
    engine.resolveInit();
    await flushAsync();
    expect(store.state.engine).toBe("ready");

    store.tapSquare("e2");
    store.tapSquare("e4");
    await flushAsync();

    expect(store.state.engine).toBe("thinking");
    expect(engine.bestMoveCalls.at(-1)).toEqual({
      fen: store.state.fen,
      difficulty: "normal",
    });

    engine.resolveBestMove("e7e5");
    await flushAsync();

    expect(store.state.history.map((e) => e.san)).toEqual(["e4", "e5"]);
    expect(store.state.turn).toBe("w");
    expect(store.state.engine).toBe("ready");
  });

  it("warms up the engine immediately and moves first when the CPU plays white", async () => {
    const engine = createControllableEngine();
    const store = createGameStore(() => engine.adapter);
    store.newGame({ mode: "cpu", difficulty: "easy", playerColor: "b" });

    expect(store.state.engine).toBe("loading");
    engine.resolveInit();
    await flushAsync();

    expect(engine.bestMoveCalls).toHaveLength(1);
    expect(store.state.engine).toBe("thinking");

    engine.resolveBestMove("e2e4");
    await flushAsync();

    expect(store.state.history.map((e) => e.san)).toEqual(["e4"]);
    expect(store.state.turn).toBe("b");
  });

  describe("input lock while the CPU is involved (spec/05 §4)", () => {
    it("ignores tapSquare while engine is thinking", async () => {
      const engine = createControllableEngine();
      const store = createGameStore(() => engine.adapter);
      store.newGame({ mode: "cpu", difficulty: "normal", playerColor: "w" });
      engine.resolveInit();
      await flushAsync();

      store.tapSquare("e2");
      store.tapSquare("e4");
      await flushAsync();
      expect(store.state.engine).toBe("thinking");

      store.tapSquare("d2"); // human's own pawn — would otherwise be selectable
      expect(store.state.selected).toBeNull();
    });

    it("ignores tapSquare when it isn't the human's turn yet (engine not ready)", async () => {
      const engine = createControllableEngine();
      const store = createGameStore(() => engine.adapter);
      store.newGame({ mode: "cpu", difficulty: "normal", playerColor: "b" });
      // init() still pending -> engine stays "loading", it's white's (CPU's) turn.

      store.tapSquare("e7"); // black pawn, would be selectable once it's black's turn
      expect(store.state.selected).toBeNull();
    });
  });

  describe("generation management (spec/03 §5)", () => {
    it("discards a bestmove response that resolves after newGame() replaced the game", async () => {
      const engine = createControllableEngine();
      const store = createGameStore(() => engine.adapter);
      store.newGame({ mode: "cpu", difficulty: "normal", playerColor: "b" });
      engine.resolveInit();
      await flushAsync();
      expect(engine.bestMoveCalls).toHaveLength(1);

      // A new game starts before the CPU's first move resolves.
      store.newGame({ mode: "pvp", difficulty: "normal", playerColor: "w" });

      // The stale response for the abandoned CPU game now arrives.
      engine.resolveBestMove("e2e4");
      await flushAsync();

      expect(store.state.config.mode).toBe("pvp");
      expect(store.state.history).toHaveLength(0);
      expect(store.state.turn).toBe("w");
    });

    it("discards a bestmove response that resolves after the human resigned", async () => {
      const engine = createControllableEngine();
      const store = createGameStore(() => engine.adapter);
      store.newGame({ mode: "cpu", difficulty: "normal", playerColor: "w" });
      engine.resolveInit();
      await flushAsync();

      store.tapSquare("e2");
      store.tapSquare("e4");
      await flushAsync();
      expect(store.state.engine).toBe("thinking");

      store.resign("w");
      engine.resolveBestMove("e7e5");
      await flushAsync();

      expect(store.state.status).toEqual({ kind: "resigned", winner: "b" });
      expect(store.state.history.map((e) => e.san)).toEqual(["e4"]); // CPU's reply was not applied
      // engine must not stay stuck at "thinking" after the discard (spec/02 §7).
      expect(store.state.engine).toBe("ready");
    });

    it("does not resurrect the save when a bestmove response resolves after abandonGame()", async () => {
      const engine = createControllableEngine();
      const store = createGameStore(() => engine.adapter);
      store.newGame({ mode: "cpu", difficulty: "normal", playerColor: "w" });
      engine.resolveInit();
      await flushAsync();

      store.tapSquare("e2");
      store.tapSquare("e4");
      await flushAsync();
      expect(store.state.engine).toBe("thinking");

      store.abandonGame();
      // The stale response for the abandoned game now arrives.
      engine.resolveBestMove("e7e5");
      await flushAsync();

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(engine.disposeCallCount).toBe(1);
    });

    it("resets engine to ready (not error) when a bestMove() rejection arrives after the human resigned", async () => {
      const engine = createControllableEngine();
      const store = createGameStore(() => engine.adapter);
      store.newGame({ mode: "cpu", difficulty: "normal", playerColor: "w" });
      engine.resolveInit();
      await flushAsync();

      store.tapSquare("e2");
      store.tapSquare("e4");
      await flushAsync();
      expect(store.state.engine).toBe("thinking");

      store.resign("w");
      engine.rejectBestMove(new Error("timed out"));
      await flushAsync();

      expect(store.state.status).toEqual({ kind: "resigned", winner: "b" });
      expect(store.state.engine).toBe("ready");
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe("error handling and retry (spec/02 §4, spec/03 §6)", () => {
    it("sets engine=error when bestMove() rejects, and retryEngine() resumes the CPU's turn", async () => {
      const engine = createControllableEngine();
      const store = createGameStore(() => engine.adapter);
      store.newGame({ mode: "cpu", difficulty: "normal", playerColor: "w" });
      engine.resolveInit();
      await flushAsync();

      store.tapSquare("e2");
      store.tapSquare("e4");
      await flushAsync();
      expect(store.state.engine).toBe("thinking");

      engine.rejectBestMove(new Error("engine crashed"));
      await flushAsync();
      expect(store.state.engine).toBe("error");
      expect(warn).toHaveBeenCalled();

      // Still locked (it's the CPU's turn) — tapping does nothing.
      store.tapSquare("d2");
      expect(store.state.selected).toBeNull();

      store.retryEngine();
      await flushAsync();
      expect(store.state.engine).toBe("thinking");
      expect(engine.bestMoveCalls).toHaveLength(2);

      engine.resolveBestMove("e7e5");
      await flushAsync();
      expect(store.state.history.map((e) => e.san)).toEqual(["e4", "e5"]);
      expect(store.state.engine).toBe("ready");
    });

    it("sets engine=error when init() rejects", async () => {
      const engine = createControllableEngine();
      const store = createGameStore(() => engine.adapter);
      store.newGame({ mode: "cpu", difficulty: "normal", playerColor: "b" });

      engine.rejectInit(new Error("404: worker script not found"));
      await flushAsync();

      expect(store.state.engine).toBe("error");
      expect(warn).toHaveBeenCalled();
    });

    it("retryEngine() is a no-op unless engine is in the error state", () => {
      const engine = createControllableEngine();
      const store = createGameStore(() => engine.adapter);
      store.newGame({ mode: "pvp", difficulty: "normal", playerColor: "w" });

      store.retryEngine();

      expect(store.state.engine).toBe("off");
      expect(engine.initCallCount).toBe(0);
    });
  });

  describe("mode switching", () => {
    it("disposes the engine when switching from cpu to pvp", () => {
      const engine = createControllableEngine();
      const store = createGameStore(() => engine.adapter);
      store.newGame({ mode: "cpu", difficulty: "normal", playerColor: "w" });
      engine.resolveInit();

      store.newGame({ mode: "pvp", difficulty: "normal", playerColor: "w" });

      expect(engine.disposeCallCount).toBe(1);
      expect(store.state.engine).toBe("off");
    });
  });

  describe("boot() with a saved cpu-mode game (spec/02 §6)", () => {
    it("resumes engine thinking on boot() when restored mid-CPU-turn, and applies the CPU's move once bestMove() resolves", async () => {
      // Human (white) played e4; it's the CPU's (black's) turn — as if the
      // page was reloaded while the CPU was mid-think.
      saveGame({
        version: 1,
        savedAt: new Date().toISOString(),
        config: { mode: "cpu", difficulty: "normal", playerColor: "w" },
        pgn: "1. e4",
      });

      const engine = createControllableEngine();
      const store = createGameStore(() => engine.adapter);
      const restored = store.boot();

      expect(restored).toBe(true);
      expect(store.state.turn).toBe("b");
      expect(store.state.engine).toBe("loading");

      engine.resolveInit();
      await flushAsync();
      expect(store.state.engine).toBe("thinking");
      expect(engine.bestMoveCalls).toEqual([
        { fen: store.state.fen, difficulty: "normal" },
      ]);

      engine.resolveBestMove("e7e5");
      await flushAsync();

      expect(store.state.history.map((e) => e.san)).toEqual(["e4", "e5"]);
      expect(store.state.turn).toBe("w");
      expect(store.state.engine).toBe("ready");
    });
  });
});
