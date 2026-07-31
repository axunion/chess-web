import { createStore, produce } from "solid-js/store";
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
  requestEngineMove(): void;
}

const DEFAULT_CONFIG: GameConfig = {
  mode: "pvp",
  difficulty: "normal",
  playerColor: "w",
};

/**
 * Owns the single source of reactive game state and every mutation to it
 * (see spec/01-architecture.md §1). Engine-related behavior
 * (`requestEngineMove`) is stubbed as a no-op until M4 wires up Stockfish.
 */
export function createGameStore(): GameStore {
  const chessGame = createChessGame();
  const initial = chessGame.reset();
  /** PGN of the current game, kept in sync with every applied snapshot (not part of GameState — see spec/02 §2). */
  let currentPgn = initial.pgn;

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
    if (config.mode === "cpu" && config.playerColor !== snapshot.turn) {
      requestEngineMove();
    }
  }

  /**
   * Restores a saved game on startup (spec/02 §6). Returns `true` when a
   * valid save was found and applied, `false` when there was none or it was
   * corrupted (in which case the caller should fall back to NewGameDialog).
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

    // Resuming CPU-turn engine thinking on restore is M4 work; the
    // requestEngineMove() call below is a no-op stub until then.
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

  function requestEngineMove(): void {
    // Stubbed until M4 (Stockfish integration). CPU mode cannot be selected
    // from NewGameDialog yet, so this is unreachable in practice for now.
  }

  return {
    state,
    boot,
    newGame,
    tapSquare,
    confirmPromotion,
    cancelPromotion,
    resign,
    requestEngineMove,
  };
}
