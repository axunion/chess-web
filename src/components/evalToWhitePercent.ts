import type { EngineEvaluation } from "../game/types";

/**
 * Converts a White-perspective engine evaluation into a White win
 * percentage (0-100) for the eval bar. Uses the sigmoid approximation
 * common to Lichess/chess.com-style eval bars; a mate score always
 * resolves to the extreme, regardless of the accompanying evalCp.
 */
export function evalToWhitePercent(evaluation: EngineEvaluation): number {
  if (evaluation.kind === "mate") {
    return evaluation.value > 0 ? 100 : 0;
  }
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368 * evaluation.value)) - 1);
}
