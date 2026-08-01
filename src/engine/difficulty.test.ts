import { describe, expect, it } from "vitest";
import { DIFFICULTY_PRESETS } from "./difficulty";

describe("DIFFICULTY_PRESETS (spec/03 §3 table)", () => {
  it("maps each difficulty to its skill level and movetime", () => {
    expect(DIFFICULTY_PRESETS.easy).toEqual({ skill: 2, movetimeMs: 300 });
    expect(DIFFICULTY_PRESETS.normal).toEqual({ skill: 8, movetimeMs: 600 });
    expect(DIFFICULTY_PRESETS.hard).toEqual({ skill: 14, movetimeMs: 1000 });
    expect(DIFFICULTY_PRESETS.master).toEqual({
      skill: 20,
      movetimeMs: 2000,
    });
  });
});
