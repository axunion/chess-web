import type { Color, PieceSymbol, Square } from "chess.js";

// Re-exported so that every other layer (store, components, engine) can
// reference these chess.js primitives without importing chess.js directly
// (see spec/01-architecture.md §1 and §3).
export type { Color, PieceSymbol, Square };

export type GameMode = "pvp" | "cpu";
export type Difficulty = "easy" | "normal" | "hard" | "master";

export type GameStatus =
  | { kind: "playing"; check: boolean }
  | { kind: "checkmate"; winner: Color }
  | { kind: "stalemate" }
  | { kind: "draw"; reason: "threefold" | "insufficient" | "fifty-move" }
  | { kind: "resigned"; winner: Color };

export interface BoardPiece {
  square: Square;
  type: PieceSymbol;
  color: Color;
  /** Stable identity for move animation. Format: `${color}${type}-${n}` (n = spawn order). */
  id: string;
}

export interface HistoryEntry {
  san: string;
  from: Square;
  to: Square;
  color: Color;
  captured?: PieceSymbol;
}

export interface GameConfig {
  mode: GameMode;
  /** cpu mode only; ignored in pvp. */
  difficulty: Difficulty;
  /** Human side in cpu mode; ignored in pvp. */
  playerColor: Color;
}

export type EngineState = "off" | "loading" | "ready" | "thinking" | "error";

export interface GameState {
  config: GameConfig;
  fen: string;
  turn: Color;
  /** All pieces currently on the board (not an 8x8 matrix — flat list keyed by id). */
  pieces: BoardPiece[];
  history: HistoryEntry[];
  status: GameStatus;
  /** Interaction state (see 05). Never persisted. */
  selected: Square | null;
  legalTargets: Square[];
  pendingPromotion: { from: Square; to: Square } | null;
  lastMove: { from: Square; to: Square } | null;
  engine: EngineState;
}
