/**
 * Pure UCI (Universal Chess Interface) string helpers for talking to the
 * Stockfish worker (see spec/03-engine.md §2). No Worker/DOM dependency —
 * kept pure so the protocol framing is unit-testable in isolation.
 */

export const cmdSetSkill = (level: number): string =>
  `setoption name Skill Level value ${level}`;

export const cmdSetLimitStrength = (enabled: boolean): string =>
  `setoption name UCI_LimitStrength value ${enabled}`;

export const cmdSetElo = (elo: number): string =>
  `setoption name UCI_Elo value ${elo}`;

export const cmdPosition = (fen: string): string => `position fen ${fen}`;

export const cmdGo = (movetimeMs: number): string =>
  `go movetime ${movetimeMs}`;

/**
 * Parses a `bestmove <move> [ponder <move>]` line into just the move.
 * Returns `null` for `bestmove (none)` (no legal move) and for any other
 * (non-bestmove) line, e.g. `info depth ...` search output.
 */
export function parseBestMove(line: string): string | null {
  const match = /^bestmove (\S+)/.exec(line.trim());
  if (!match) return null;
  const move = match[1];
  return move === "(none)" ? null : move;
}

export function isUciOk(line: string): boolean {
  return line.trim() === "uciok";
}

export function isReadyOk(line: string): boolean {
  return line.trim() === "readyok";
}

export interface InfoScore {
  kind: "cp" | "mate";
  value: number;
}

const SCORE_RE = /\bscore (cp|mate) (-?\d+)/;

/**
 * Extracts the score from an `info ... score (cp|mate) <n> ...` line, as
 * seen from the side to move in the searched position. Returns null for
 * lines with no score field (e.g. `bestmove ...`, `uciok`).
 */
export function parseInfoScore(line: string): InfoScore | null {
  const match = SCORE_RE.exec(line);
  if (!match) return null;
  return { kind: match[1] as "cp" | "mate", value: Number(match[2]) };
}
