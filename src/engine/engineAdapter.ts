import type { Difficulty } from "../game/types";
import { DIFFICULTY_PRESETS } from "./difficulty";
import {
  cmdGo,
  cmdPosition,
  cmdSetSkill,
  isReadyOk,
  isUciOk,
  parseBestMove,
} from "./uci";

/**
 * Promise-based facade over the Stockfish Worker's string protocol (see
 * spec/03-engine.md §4). SolidJS-independent.
 */
export interface EngineAdapter {
  /** Spawns the worker and completes the UCI handshake. Idempotent. */
  init(): Promise<void>;
  /** Resolves with a UCI move string (e.g. "e7e8q"). Rejects on timeout/crash/none. */
  bestMove(fen: string, difficulty: Difficulty): Promise<string>;
  /** Terminates the worker. Safe to call at any time. */
  dispose(): void;
}

/** Rejection reason for a bestMove() call superseded by a newer one (spec/03 §4). */
export class EngineBusyError extends Error {
  constructor() {
    super("EngineAdapter: superseded by a newer bestMove() request");
    this.name = "EngineBusyError";
  }
}

const DEFAULT_WORKER_URL = "/stockfish/stockfish-lite-single.js";
const INIT_TIMEOUT_MS = 10_000;
const BEST_MOVE_TIMEOUT_MARGIN_MS = 5_000;

interface InFlightSearch {
  token: symbol;
  reject: (err: Error) => void;
}

export function createEngineAdapter(
  workerUrl: string = DEFAULT_WORKER_URL,
): EngineAdapter {
  let worker: Worker | null = null;
  let initPromise: Promise<void> | null = null;
  /** Set only while a handshake (init) is outstanding; used by crash handling. */
  let initReject: ((err: Error) => void) | null = null;
  /** Set only while a bestMove() search is outstanding. */
  let inFlight: InFlightSearch | null = null;

  function terminateWorker(): void {
    if (worker) {
      worker.removeEventListener("error", handleWorkerCrash);
      worker.removeEventListener("messageerror", handleWorkerCrash);
      worker.terminate();
    }
    worker = null;
    initPromise = null;
  }

  /** Worker `error`/`messageerror` handler, alive for the worker's whole lifetime. */
  function handleWorkerCrash(): void {
    const err = new Error("EngineAdapter: worker crashed");
    const rejectInit = initReject;
    const rejectSearch = inFlight?.reject ?? null;
    initReject = null;
    inFlight = null;
    terminateWorker();
    rejectInit?.(err);
    rejectSearch?.(err);
  }

  function spawnAndHandshake(): Promise<void> {
    const w = new Worker(workerUrl);
    worker = w;
    w.addEventListener("error", handleWorkerCrash);
    w.addEventListener("messageerror", handleWorkerCrash);

    return new Promise<void>((resolve, reject) => {
      let phase: "uci" | "isready" = "uci";
      let settled = false;

      const timer = setTimeout(() => {
        settle(() => {
          terminateWorker();
          reject(new Error("EngineAdapter: init() timed out"));
        });
      }, INIT_TIMEOUT_MS);

      function settle(action: () => void): void {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        w.removeEventListener("message", onMessage);
        initReject = null;
        action();
      }

      function onMessage(e: MessageEvent): void {
        const line = String(e.data);
        if (phase === "uci" && isUciOk(line)) {
          phase = "isready";
          w.postMessage("isready");
        } else if (phase === "isready" && isReadyOk(line)) {
          settle(resolve);
        }
      }

      initReject = (err) => settle(() => reject(err));
      w.addEventListener("message", onMessage);
      w.postMessage("uci");
    });
  }

  function init(): Promise<void> {
    if (initPromise) return initPromise;
    initPromise = spawnAndHandshake().catch((err) => {
      initPromise = null;
      throw err;
    });
    return initPromise;
  }

  function runSearch(
    w: Worker,
    token: symbol,
    fen: string,
    difficulty: Difficulty,
    resolve: (move: string) => void,
    reject: (err: Error) => void,
  ): void {
    const { skill, movetimeMs } = DIFFICULTY_PRESETS[difficulty];
    let settled = false;

    const timer = setTimeout(() => {
      settle(() => {
        w.postMessage("stop");
        reject(new Error("EngineAdapter: bestMove() timed out"));
      });
    }, movetimeMs + BEST_MOVE_TIMEOUT_MARGIN_MS);

    function settle(action: () => void): void {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      w.removeEventListener("message", onMessage);
      if (inFlight?.token === token) inFlight = null;
      action();
    }

    function onMessage(e: MessageEvent): void {
      const line = String(e.data);
      if (!line.startsWith("bestmove")) return;
      const move = parseBestMove(line);
      settle(() => {
        if (move === null) {
          reject(new Error("EngineAdapter: engine returned no legal move"));
        } else {
          resolve(move);
        }
      });
    }

    w.addEventListener("message", onMessage);
    w.postMessage(cmdSetSkill(skill));
    w.postMessage(cmdPosition(fen));
    w.postMessage(cmdGo(movetimeMs));
  }

  function bestMove(fen: string, difficulty: Difficulty): Promise<string> {
    const token = Symbol("bestMove");
    return new Promise<string>((resolve, reject) => {
      // Serialization guard (spec/03 §4): stop and reject any request still
      // in flight — whatever phase it's in — before starting a new one.
      if (inFlight) {
        worker?.postMessage("stop");
        const prev = inFlight;
        inFlight = null;
        prev.reject(new EngineBusyError());
      }
      inFlight = { token, reject };

      init()
        .then(() => {
          if (inFlight?.token !== token) return; // superseded while awaiting init()
          const w = worker;
          if (!w) {
            inFlight = null;
            reject(
              new Error("EngineAdapter: worker not available after init()"),
            );
            return;
          }
          runSearch(w, token, fen, difficulty, resolve, reject);
        })
        .catch((err) => {
          if (inFlight?.token === token) inFlight = null;
          reject(err);
        });
    });
  }

  function dispose(): void {
    const err = new Error("EngineAdapter: disposed");
    const rejectInit = initReject;
    const rejectSearch = inFlight?.reject ?? null;
    initReject = null;
    inFlight = null;
    terminateWorker();
    rejectInit?.(err);
    rejectSearch?.(err);
  }

  return { init, bestMove, dispose };
}
