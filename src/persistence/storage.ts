import { isSavedGameV1, type SavedGameV1, STORAGE_KEY } from "./schema";

/**
 * The only module that touches `localStorage` (see spec/01-architecture.md §1).
 * Read/write failures (quota exceeded, private browsing, etc.) never throw —
 * they are logged and treated as "no saved data" so the game keeps working
 * (spec/01-architecture.md §5).
 */

export function saveGame(data: SavedGameV1): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("chess-web: failed to save game", err);
  }
}

export function loadGame(): SavedGameV1 | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    console.warn("chess-web: failed to read saved game", err);
    return null;
  }
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.warn("chess-web: saved game data is corrupted (invalid JSON)", err);
    clearGame();
    return null;
  }

  if (!isSavedGameV1(parsed)) {
    console.warn("chess-web: saved game data is corrupted (unexpected shape)");
    clearGame();
    return null;
  }

  return parsed;
}

export function clearGame(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn("chess-web: failed to clear saved game", err);
  }
}
