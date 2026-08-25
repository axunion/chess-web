import { describe, expect, it } from "vitest";
import { evalToWhitePercent } from "./evalToWhitePercent";

describe("evalToWhitePercent", () => {
  it("returns 50 for an even position", () => {
    expect(evalToWhitePercent({ kind: "cp", value: 0 })).toBe(50);
  });

  it("approaches 100 as White's advantage grows", () => {
    const pct = evalToWhitePercent({ kind: "cp", value: 2000 });
    expect(pct).toBeGreaterThan(95);
    expect(pct).toBeLessThanOrEqual(100);
  });

  it("approaches 0 as Black's advantage grows", () => {
    const pct = evalToWhitePercent({ kind: "cp", value: -2000 });
    expect(pct).toBeLessThan(5);
    expect(pct).toBeGreaterThanOrEqual(0);
  });

  it("is monotonically increasing in evalCp", () => {
    const low = evalToWhitePercent({ kind: "cp", value: -50 });
    const mid = evalToWhitePercent({ kind: "cp", value: 0 });
    const high = evalToWhitePercent({ kind: "cp", value: 50 });
    expect(low).toBeLessThan(mid);
    expect(mid).toBeLessThan(high);
  });

  it("returns 100 when White has a forced mate", () => {
    expect(evalToWhitePercent({ kind: "mate", value: 3 })).toBe(100);
  });

  it("returns 0 when Black has a forced mate", () => {
    expect(evalToWhitePercent({ kind: "mate", value: -1 })).toBe(0);
  });
});
