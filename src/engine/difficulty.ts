import type { Difficulty } from "../game/types";

/** Skill Level / movetime presets per difficulty (see spec/03-engine.md §3). */
export const DIFFICULTY_PRESETS: Record<
  Difficulty,
  { skill: number; movetimeMs: number }
> = {
  easy: { skill: 2, movetimeMs: 300 },
  normal: { skill: 8, movetimeMs: 600 },
  hard: { skill: 14, movetimeMs: 1000 },
  master: { skill: 20, movetimeMs: 2000 },
};
