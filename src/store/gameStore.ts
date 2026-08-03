import { createStore, produce } from "solid-js/store";
import {
  createEngineAdapter,
  type EngineAdapter,
} from "../engine/engineAdapter";
import { createChessGame, type MoveResult } from "../game/chessGame";
import type {
  Color,
  GameConfig,
  GameState,
  PieceSymbol,
  Square,
} from "../game/types";
import { clearGame, loadGame, saveGame } from "../persistence/storage";

export interface GameStore {
  state: GameState;
  /** Restore a saved game on startup (spec/02 §6). Returns whether a valid save was restored. */
  boot(): boolean;
  newGame(config: GameConfig): void;
  tapSquare(square: Square): void;
  confirmPromotion(piece: PieceSymbol): void;
  cancelPromotion(): void;
  resign(color: Color): void;
  /** Abandons the current game and clears its save, returning to the title screen. */
  abandonGame(): void;
  requestEngineMove(): void;
  /** Re-attempts engine initialization/thinking after `engine === "error"` (spec/02 §4). */
  retryEngine(): void;
}

const DEFAULT_CONFIG: GameConfig = {
  mode: "pvp",
  difficulty: "normal",
  playerColor: "w",
};

/**
 * Owns the single source of reactive game state and every mutation to it
 * (see spec/01-architecture.md §1). `engineFactory` is injectable so tests
 * can supply a mock `EngineAdapter` instead of the real Stockfish worker
 * (spec/02-state-persistence.md §4).
 */
export function createGameStore(
  engineFactory: () => EngineAdapter = () => createEngineAdapter(),
): GameStore {
  const chessGame = createChessGame();
  const adapter = engineFactory();
  // Prevent a leaked Stockfish Worker on every dev-mode hot-reload of this
  // module while a CPU game is active (spec/01-architecture.md §4).
  import.meta.hot?.dispose(() => adapter.dispose());
  const initial = chessGame.reset();
  /** PGN of the current game, kept in sync with every applied snapshot (not part of GameState — see spec/02 §2). */
  let currentPgn = initial.pgn;
  /**
   * Bumped on every `newGame()`. `requestEngineMove()` closes over the id it
   * was issued under; a `bestMove()` response (or init failure) that
   * resolves after the id has moved on belongs to an abandoned game and is
   * discarded rather than applied (spec/03-engine.md §5).
   */
  let gameId = 0;

  const [state, setState] = createStore<GameState>({
    config: DEFAULT_CONFIG,
    fen: initial.fen,
    turn: initial.turn,
    pieces: initial.pieces,
    history: [],
    status: initial.status,
    selected: null,
    legalTargets: [],
    pendingPromotion: null,
    lastMove: null,
    engine: "off",
  });

  /** Input-lock rule from spec/05-interaction-flows.md §4. */
  function isInputLocked(): boolean {
    if (state.engine === "thinking" || state.engine === "loading") return true;
    if (
      state.config.mode === "cpu" &&
      state.turn !== state.config.playerColor
    ) {
      return true;
    }
    if (state.status.kind !== "playing") return true;
    if (state.pendingPromotion !== null) return true;
    return false;
  }

  function pieceAt(square: Square) {
    return state.pieces.find((p) => p.square === square);
  }

  function select(square: Square): void {
    setState({
      selected: square,
      legalTargets: chessGame.legalTargets(square),
    });
  }

  function clearSelection(): void {
    setState({ selected: null, legalTargets: [] });
  }

  /** Persists the current game (spec/02 §5: after every move, on resign, on new game). */
  function persist(resignedBy?: Color): void {
    saveGame({
      version: 1,
      savedAt: new Date().toISOString(),
      config: state.config,
      pgn: currentPgn,
      resignedBy,
    });
  }

  /** Common post-move processing shared by human and (later) engine moves. */
  function afterMove(result: MoveResult): void {
    currentPgn = result.snapshot.pgn;
    setState(
      produce((s) => {
        s.fen = result.snapshot.fen;
        s.turn = result.snapshot.turn;
        s.pieces = result.snapshot.pieces;
        s.history = chessGame.history();
        s.status = result.snapshot.status;
        s.lastMove = { from: result.entry.from, to: result.entry.to };
        s.selected = null;
        s.legalTargets = [];
        s.pendingPromotion = null;
      }),
    );
    persist();
    if (
      state.status.kind === "playing" &&
      state.config.mode === "cpu" &&
      state.turn !== state.config.playerColor
    ) {
      requestEngineMove();
    }
  }

  function newGame(config: GameConfig): void {
    // Invalidate any in-flight requestEngineMove() from the previous game
    // before it can apply a stale response (spec/03-engine.md §5).
    gameId += 1;
    const snapshot = chessGame.reset();
    currentPgn = snapshot.pgn;
    setState({
      config,
      fen: snapshot.fen,
      turn: snapshot.turn,
      pieces: snapshot.pieces,
      history: [],
      status: snapshot.status,
      selected: null,
      legalTargets: [],
      pendingPromotion: null,
      lastMove: null,
      engine: "off",
    });
    persist();
    if (config.mode === "cpu") {
      if (config.playerColor === snapshot.turn) {
        // The human moves first — warm up the engine in the background
        // (spec/05-interaction-flows.md §7 step 3) so the upcoming CPU turn
        // doesn't have to pay the WASM-load cost when it arrives.
        warmUpEngine();
      } else {
        requestEngineMove();
      }
    } else {
      adapter.dispose();
    }
  }

  /**
   * Restores a saved game on startup (spec/02 §6). Returns `true` when a
   * valid save was found and applied, `false` when there was none or it was
   * corrupted (in which case the caller should fall back to the title screen).
   * The already-reset initial state from store creation is left untouched
   * on the `false` path.
   */
  function boot(): boolean {
    const saved = loadGame();
    if (!saved) return false;

    let snapshot: ReturnType<typeof chessGame.loadPgn>;
    try {
      snapshot = chessGame.loadPgn(saved.pgn);
    } catch (err) {
      console.warn(
        "gameStore: saved game PGN is corrupted, discarding it",
        err,
      );
      clearGame();
      return false;
    }

    currentPgn = snapshot.pgn;
    const history = chessGame.history();
    const lastEntry = history.at(-1);
    setState({
      config: saved.config,
      fen: snapshot.fen,
      turn: snapshot.turn,
      pieces: snapshot.pieces,
      history,
      status: saved.resignedBy
        ? { kind: "resigned", winner: saved.resignedBy === "w" ? "b" : "w" }
        : snapshot.status,
      selected: null,
      legalTargets: [],
      pendingPromotion: null,
      lastMove: lastEntry ? { from: lastEntry.from, to: lastEntry.to } : null,
      engine: "off",
    });

    // Resume engine thinking if the restored game is mid-CPU-turn (spec/02
    // §6): the UI is interactive immediately, engine goes loading -> thinking
    // in the background.
    if (
      saved.config.mode === "cpu" &&
      state.status.kind === "playing" &&
      state.turn !== saved.config.playerColor
    ) {
      requestEngineMove();
    }

    return true;
  }

  function tapSquare(square: Square): void {
    if (isInputLocked()) return;

    const selected = state.selected;

    // #1 / #2: nothing selected yet.
    if (selected === null) {
      const piece = pieceAt(square);
      if (piece && piece.color === state.turn) {
        select(square);
      }
      return;
    }

    // #5: tapping the selected piece again deselects it.
    if (square === selected) {
      clearSelection();
      return;
    }

    // #3: tapping a legal target confirms the move.
    if (state.legalTargets.includes(square)) {
      if (chessGame.isPromotion(selected, square)) {
        setState({ pendingPromotion: { from: selected, to: square } });
      } else {
        afterMove(chessGame.move(selected, square));
      }
      return;
    }

    // #4: tapping another own piece switches the selection.
    const piece = pieceAt(square);
    if (piece && piece.color === state.turn) {
      select(square);
      return;
    }

    // #6: anything else clears the selection.
    clearSelection();
  }

  function confirmPromotion(piece: PieceSymbol): void {
    const pending = state.pendingPromotion;
    if (!pending) return;
    afterMove(chessGame.move(pending.from, pending.to, piece));
  }

  function cancelPromotion(): void {
    setState({ pendingPromotion: null, selected: null, legalTargets: [] });
  }

  function resign(color: Color): void {
    if (state.status.kind !== "playing") return;
    const winner: Color = color === "w" ? "b" : "w";
    setState({
      status: { kind: "resigned", winner },
      selected: null,
      legalTargets: [],
    });
    persist(color);
  }

  /**
   * Abandons the current game (mid-game quit, or leaving a finished game)
   * and clears its save so a later boot() can't resurrect it. Bumps `gameId`
   * first, same as newGame(), so a bestMove() response already in flight
   * can't silently persist() a new save after the clear (spec/03 §5).
   */
  function abandonGame(): void {
    gameId += 1;
    adapter.dispose();
    clearGame();
  }

  /** Fire-and-forget engine warm-up (init only, no move request) — spec/05 §7 step 3. */
  function warmUpEngine(): void {
    const requestId = gameId;
    setState("engine", "loading");
    adapter.init().then(
      () => {
        if (requestId !== gameId) return; // a newer game started meanwhile
        setState("engine", "ready");
      },
      (err: unknown) => {
        if (requestId !== gameId) return;
        console.warn("gameStore: engine failed to initialize", err);
        setState("engine", "error");
      },
    );
  }

  function requestEngineMove(): void {
    const requestId = gameId;
    const fen = state.fen;
    const difficulty = state.config.difficulty;

    setState("engine", "loading");
    adapter
      .init()
      .then(() => {
        if (requestId !== gameId) return undefined; // stale — game moved on
        setState("engine", "thinking");
        return adapter.bestMove(fen, difficulty);
      })
      .then((uci) => {
        if (uci === undefined) return; // superseded before bestMove() started
        if (requestId !== gameId) return; // superseded by a new game entirely
        // Discard a response that arrives for a game that has since ended
        // (e.g. resignation mid-think) — but still bring `engine` out of
        // "thinking" either way (spec/02 §7: thinking -> ready on stale
        // discard too, not just on an applied move).
        setState("engine", "ready");
        if (state.status.kind !== "playing") return;
        afterMove(chessGame.moveUci(uci));
      })
      .catch((err: unknown) => {
        if (requestId !== gameId) return;
        if (state.status.kind !== "playing") {
          // The game ended mid-think (e.g. resignation) before this response
          // arrived — it's a stale discard, not a real engine failure.
          setState("engine", "ready");
          return;
        }
        console.warn("gameStore: engine move request failed", err);
        setState("engine", "error");
      });
  }

  function retryEngine(): void {
    if (state.engine !== "error") return;
    // Always re-init from scratch; additionally request a move if it's the
    // CPU's turn to think (spec/02-state-persistence.md §4).
    if (
      state.status.kind === "playing" &&
      state.config.mode === "cpu" &&
      state.turn !== state.config.playerColor
    ) {
      requestEngineMove();
    } else {
      warmUpEngine();
    }
  }

  return {
    state,
    boot,
    newGame,
    tapSquare,
    confirmPromotion,
    cancelPromotion,
    resign,
    abandonGame,
    requestEngineMove,
    retryEngine,
  };
}
