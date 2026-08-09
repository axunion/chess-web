import type { Difficulty } from "../game/types";

/**
 * Strength preset per difficulty. Most tiers target a UCI_Elo rating (the
 * option Stockfish itself calibrates for "play like ~N Elo"); the two
 * extremes fall back to Skill Level, since UCI_Elo can't go below 1320 and
 * "unrestricted" is expressed as Skill Level 20 with strength limiting off.
 */
export type DifficultyPreset =
  | { mode: "skill"; skill: number; movetimeMs: number }
  | { mode: "elo"; elo: number; movetimeMs: number };

// UCI_Elo's floor (1320) converts internally to roughly the same weakened
// play as Skill Level 0 (the engine derives one from the other), so `easy`
// starts well above that floor — otherwise it and `beginner` would collapse
// into indistinguishable strength. The Elo tiers stay spaced out below the
// UCI_Elo option's ceiling (3190), leaving `elite` as a distinctly stronger,
// unrestricted step above it.
export const DIFFICULTY_PRESETS: Record<Difficulty, DifficultyPreset> = {
  beginner: { mode: "skill", skill: 0, movetimeMs: 250 },
  easy: { mode: "elo", elo: 1500, movetimeMs: 400 },
  casual: { mode: "elo", elo: 1800, movetimeMs: 500 },
  normal: { mode: "elo", elo: 2100, movetimeMs: 700 },
  hard: { mode: "elo", elo: 2400, movetimeMs: 900 },
  expert: { mode: "elo", elo: 2700, movetimeMs: 1200 },
  master: { mode: "elo", elo: 3000, movetimeMs: 1600 },
  elite: { mode: "skill", skill: 20, movetimeMs: 2500 },
};
