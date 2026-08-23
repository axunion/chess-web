import { type Color, DIFFICULTIES, type GameConfig } from "../game/types";

/** LocalStorage key for the single (always-overwritten) saved game. */
export const STORAGE_KEY = "chess-web.save.v1";

export interface SavedGameV1 {
  version: 1;
  savedAt: string; // ISO 8601
  config: GameConfig;
  pgn: string; // full move history — restore by replaying
  /** Only set when the game ended by resignation (not representable in PGN). */
  resignedBy?: Color;
  /** Only set when the game ended by a mutually agreed draw (not representable in PGN). Mutually exclusive with resignedBy. */
  drawAgreed?: boolean;
}

const VALID_DIFFICULTIES = new Set<string>(DIFFICULTIES);
const COLORS = new Set(["w", "b"]);
const MODES = new Set(["pvp", "cpu"]);

function isGameConfig(value: unknown): value is GameConfig {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.mode === "string" &&
    MODES.has(v.mode) &&
    typeof v.difficulty === "string" &&
    VALID_DIFFICULTIES.has(v.difficulty) &&
    typeof v.playerColor === "string" &&
    COLORS.has(v.playerColor)
  );
}

/** Validates that `value` is a well-formed `SavedGameV1` (see spec/02-state-persistence.md §5). */
export function isSavedGameV1(value: unknown): value is SavedGameV1 {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.version !== 1) return false;
  if (typeof v.savedAt !== "string") return false;
  if (typeof v.pgn !== "string") return false;
  if (!isGameConfig(v.config)) return false;
  if (v.resignedBy !== undefined && !COLORS.has(v.resignedBy as string)) {
    return false;
  }
  if (v.drawAgreed !== undefined && typeof v.drawAgreed !== "boolean") {
    return false;
  }
  return true;
}
