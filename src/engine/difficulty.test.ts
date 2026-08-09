import { describe, expect, it } from "vitest";
import { DIFFICULTY_PRESETS } from "./difficulty";

describe("DIFFICULTY_PRESETS", () => {
  it("uses Skill Level for the beginner and elite extremes", () => {
    expect(DIFFICULTY_PRESETS.beginner).toEqual({
      mode: "skill",
      skill: 0,
      movetimeMs: 250,
    });
    expect(DIFFICULTY_PRESETS.elite).toEqual({
      mode: "skill",
      skill: 20,
      movetimeMs: 2500,
    });
  });

  it("uses UCI_Elo for the six calibrated middle tiers, kept above the floor shared with beginner", () => {
    expect(DIFFICULTY_PRESETS.easy).toEqual({
      mode: "elo",
      elo: 1500,
      movetimeMs: 400,
    });
    expect(DIFFICULTY_PRESETS.casual).toEqual({
      mode: "elo",
      elo: 1800,
      movetimeMs: 500,
    });
    expect(DIFFICULTY_PRESETS.normal).toEqual({
      mode: "elo",
      elo: 2100,
      movetimeMs: 700,
    });
    expect(DIFFICULTY_PRESETS.hard).toEqual({
      mode: "elo",
      elo: 2400,
      movetimeMs: 900,
    });
    expect(DIFFICULTY_PRESETS.expert).toEqual({
      mode: "elo",
      elo: 2700,
      movetimeMs: 1200,
    });
    expect(DIFFICULTY_PRESETS.master).toEqual({
      mode: "elo",
      elo: 3000,
      movetimeMs: 1600,
    });
  });
});
