import { createStore } from "solid-js/store";
import { createChessGame } from "../game/chessGame";
import type { GameState } from "../game/types";

export interface GameStore {
  state: GameState;
}

/**
 * Minimal M1 slice: exposes the initial position as a reactive GameState so
 * that `components/` never has to import `chessGame`/chess.js directly (see
 * spec/01-architecture.md §1). Actions (tapSquare, newGame, engine
 * integration, persistence, ...) are added in later milestones.
 */
export function createGameStore(): GameStore {
  const chessGame = createChessGame();
  const initial = chessGame.reset();

  const [state] = createStore<GameState>({
    config: { mode: "pvp", difficulty: "normal", playerColor: "w" },
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

  return { state };
}
