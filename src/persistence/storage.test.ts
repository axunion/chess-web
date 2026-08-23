import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEY } from "./schema";
import { clearGame, loadGame, saveGame } from "./storage";

const SAMPLE = {
  version: 1 as const,
  savedAt: "2026-07-31T00:00:00.000Z",
  config: {
    mode: "pvp" as const,
    difficulty: "normal" as const,
    playerColor: "w" as const,
  },
  pgn: "1. e4 e5 2. Nf3",
};

describe("persistence/storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips a saved game through saveGame/loadGame", () => {
    saveGame(SAMPLE);

    expect(loadGame()).toEqual(SAMPLE);
  });

  it("round-trips a resigned game (resignedBy set)", () => {
    const resigned = { ...SAMPLE, resignedBy: "b" as const };
    saveGame(resigned);

    expect(loadGame()).toEqual(resigned);
  });

  it("round-trips a drawn-by-agreement game (drawAgreed set)", () => {
    const drawn = { ...SAMPLE, drawAgreed: true };
    saveGame(drawn);

    expect(loadGame()).toEqual(drawn);
  });

  it("returns null and clears the key when drawAgreed is present but not a boolean", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...SAMPLE, drawAgreed: "yes" }),
    );

    expect(loadGame()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("returns null when nothing is saved", () => {
    expect(loadGame()).toBeNull();
  });

  it("returns null and clears the key on invalid JSON", () => {
    localStorage.setItem(STORAGE_KEY, "{not valid json");

    expect(loadGame()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("returns null and clears the key on a version mismatch", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...SAMPLE, version: 2 }),
    );

    expect(loadGame()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("returns null and clears the key when required fields are missing or malformed", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        savedAt: SAMPLE.savedAt,
        config: SAMPLE.config,
      }), // no pgn
    );
    expect(loadGame()).toBeNull();

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...SAMPLE,
        config: { ...SAMPLE.config, mode: "bogus" },
      }),
    );
    expect(loadGame()).toBeNull();
  });

  it("accepts every difficulty value, old and new tiers alike", () => {
    for (const difficulty of [
      "beginner",
      "easy",
      "casual",
      "normal",
      "hard",
      "expert",
      "master",
      "elite",
    ] as const) {
      const saved = { ...SAMPLE, config: { ...SAMPLE.config, difficulty } };
      saveGame(saved);

      expect(loadGame()).toEqual(saved);
    }
  });

  it("returns null and clears the key on a difficulty typo", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...SAMPLE,
        config: { ...SAMPLE.config, difficulty: "hardd" },
      }),
    );

    expect(loadGame()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("clearGame removes the saved key", () => {
    saveGame(SAMPLE);
    clearGame();

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("does not throw and warns when localStorage.setItem throws", () => {
    // Spy on the `localStorage` instance itself, not `Storage.prototype`:
    // happy-dom's localStorage/sessionStorage getters return fresh
    // internally-bound functions on every access rather than reading
    // through the prototype chain, so a `Storage.prototype` spy is
    // silently ignored by real calls.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const setItem = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    expect(() => saveGame(SAMPLE)).not.toThrow();
    expect(warn).toHaveBeenCalled();

    setItem.mockRestore();
    warn.mockRestore();
  });

  it("does not throw and warns when localStorage.getItem throws", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const getItem = vi.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw new Error("blocked (private mode)");
    });

    expect(loadGame()).toBeNull();
    expect(warn).toHaveBeenCalled();

    getItem.mockRestore();
    warn.mockRestore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
