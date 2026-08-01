import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEngineAdapter, EngineBusyError } from "./engineAdapter";

type Listener = (event: unknown) => void;

/** Minimal `Worker` stand-in (spec/06 §1.3: mock Worker via `vi.stubGlobal`). */
class MockWorker {
  static instances: MockWorker[] = [];
  url: string;
  posted: string[] = [];
  terminated = false;
  private listeners: Record<string, Listener[]> = {
    message: [],
    error: [],
    messageerror: [],
  };

  constructor(url: string) {
    this.url = url;
    MockWorker.instances.push(this);
  }

  postMessage(data: string): void {
    this.posted.push(data);
  }

  addEventListener(type: string, listener: Listener): void {
    this.listeners[type].push(listener);
  }

  removeEventListener(type: string, listener: Listener): void {
    this.listeners[type] = this.listeners[type].filter((l) => l !== listener);
  }

  terminate(): void {
    this.terminated = true;
  }

  /** Simulates the worker posting a UCI line back to the main thread. */
  emitMessage(line: string): void {
    for (const listener of [...this.listeners.message]) {
      listener({ data: line });
    }
  }

  emitError(): void {
    for (const listener of [...this.listeners.error]) {
      listener({});
    }
  }
}

function latestWorker(): MockWorker {
  const worker = MockWorker.instances.at(-1);
  if (!worker) throw new Error("no MockWorker instance was created");
  return worker;
}

/** Drives a fresh adapter through init() and returns its worker, already handshaken. */
async function initializedAdapter() {
  const adapter = createEngineAdapter("/stockfish/mock.js");
  const initPromise = adapter.init();
  const worker = latestWorker();
  worker.emitMessage("id name Mock Stockfish");
  worker.emitMessage("uciok");
  worker.emitMessage("readyok");
  await initPromise;
  return { adapter, worker };
}

beforeEach(() => {
  MockWorker.instances = [];
  vi.stubGlobal("Worker", MockWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("engineAdapter.init()", () => {
  it("completes the uci -> uciok -> isready -> readyok handshake", async () => {
    const adapter = createEngineAdapter("/stockfish/mock.js");
    const initPromise = adapter.init();
    const worker = latestWorker();

    expect(worker.posted).toEqual(["uci"]);
    worker.emitMessage("id name Mock Stockfish");
    expect(worker.posted).toEqual(["uci"]); // ignored, not uciok yet

    worker.emitMessage("uciok");
    expect(worker.posted).toEqual(["uci", "isready"]);

    worker.emitMessage("readyok");
    await expect(initPromise).resolves.toBeUndefined();
  });

  it("is idempotent: a second call reuses the same worker/handshake", async () => {
    const { adapter } = await initializedAdapter();
    await adapter.init();
    expect(MockWorker.instances).toHaveLength(1);
  });

  it("rejects and terminates the worker when init() times out", async () => {
    vi.useFakeTimers();
    const adapter = createEngineAdapter("/stockfish/mock.js");
    const initPromise = adapter.init();
    const worker = latestWorker();

    const assertion = expect(initPromise).rejects.toThrow(/timed out/);
    await vi.advanceTimersByTimeAsync(10_001);
    await assertion;
    expect(worker.terminated).toBe(true);
  });

  it("rejects when the worker fires an error event", async () => {
    const adapter = createEngineAdapter("/stockfish/mock.js");
    const initPromise = adapter.init();
    const worker = latestWorker();

    const assertion = expect(initPromise).rejects.toThrow();
    worker.emitError();
    await assertion;
    expect(worker.terminated).toBe(true);
  });
});

describe("engineAdapter.bestMove()", () => {
  it("sends setoption/position/go and resolves with the parsed move", async () => {
    const { adapter, worker } = await initializedAdapter();

    const movePromise = adapter.bestMove("8/8/8/8/8/8/8/8 w - - 0 1", "normal");
    await Promise.resolve();
    await Promise.resolve();

    expect(worker.posted).toContain("setoption name Skill Level value 8");
    expect(worker.posted).toContain("position fen 8/8/8/8/8/8/8/8 w - - 0 1");
    expect(worker.posted).toContain("go movetime 600");

    worker.emitMessage("info depth 1 score cp 10");
    worker.emitMessage("bestmove e2e4 ponder e7e5");

    await expect(movePromise).resolves.toBe("e2e4");
  });

  it("rejects when the engine reports bestmove (none)", async () => {
    const { adapter, worker } = await initializedAdapter();

    const movePromise = adapter.bestMove("fen", "easy");
    await Promise.resolve();
    await Promise.resolve();
    worker.emitMessage("bestmove (none)");

    await expect(movePromise).rejects.toThrow(/no legal move/);
  });

  it("rejects (after sending stop) when no bestmove arrives before the timeout", async () => {
    vi.useFakeTimers();
    const adapter = createEngineAdapter("/stockfish/mock.js");
    const initPromise = adapter.init();
    const worker = latestWorker();
    worker.emitMessage("uciok");
    worker.emitMessage("readyok");
    await initPromise;

    const movePromise = adapter.bestMove("fen", "easy"); // easy: movetime 300ms
    const assertion = expect(movePromise).rejects.toThrow(/timed out/);
    await vi.advanceTimersByTimeAsync(300 + 5_000 + 1);
    await assertion;

    expect(worker.posted.at(-1)).toBe("stop");
  });

  it("stops and rejects (EngineBusyError) the previous in-flight call when a new one is issued", async () => {
    const { adapter, worker } = await initializedAdapter();

    const first = adapter.bestMove("fen1", "easy");
    await Promise.resolve();
    await Promise.resolve();
    expect(worker.posted).toContain("go movetime 300");

    const firstRejection =
      expect(first).rejects.toBeInstanceOf(EngineBusyError);
    const second = adapter.bestMove("fen2", "easy");

    expect(worker.posted.at(-1)).toBe("stop");
    await firstRejection;

    await Promise.resolve();
    await Promise.resolve();
    worker.emitMessage("bestmove d2d4");
    await expect(second).resolves.toBe("d2d4");
  });

  it("rejects the pending call and terminates the worker when the worker crashes mid-search", async () => {
    const { adapter, worker } = await initializedAdapter();

    const movePromise = adapter.bestMove("fen", "easy");
    await Promise.resolve();
    await Promise.resolve();

    const assertion = expect(movePromise).rejects.toThrow();
    worker.emitError();
    await assertion;

    expect(worker.terminated).toBe(true);
  });
});

describe("engineAdapter.dispose()", () => {
  it("terminates the worker and rejects an in-flight bestMove()", async () => {
    const { adapter, worker } = await initializedAdapter();
    const movePromise = adapter.bestMove("fen", "easy");
    await Promise.resolve();
    await Promise.resolve();

    const assertion = expect(movePromise).rejects.toThrow(/disposed/);
    adapter.dispose();
    await assertion;

    expect(worker.terminated).toBe(true);
  });

  it("is safe to call when nothing was ever started", () => {
    const adapter = createEngineAdapter("/stockfish/mock.js");
    expect(() => adapter.dispose()).not.toThrow();
  });
});
