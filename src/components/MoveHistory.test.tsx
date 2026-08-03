import { cleanup, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vitest";
import type { HistoryEntry } from "../game/types";
import { MoveHistory } from "./MoveHistory";

afterEach(cleanup);

function entry(san: string, color: "w" | "b"): HistoryEntry {
  return { san, from: "e2", to: "e4", color };
}

describe("MoveHistory", () => {
  it("shows a placeholder and no table when there are no moves yet", () => {
    render(() => <MoveHistory history={[]} />);

    expect(screen.getByText("No moves yet")).not.toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("marks the most recent ply as current — white just moved (odd length)", () => {
    const history = [entry("e4", "w")];
    render(() => <MoveHistory history={history} />);

    const white = screen.getByText("e4");
    expect(white.getAttribute("aria-current")).toBe("true");
  });

  it("marks the most recent ply as current — black just moved (even length)", () => {
    const history = [entry("e4", "w"), entry("e5", "b")];
    render(() => <MoveHistory history={history} />);

    expect(screen.getByText("e4").getAttribute("aria-current")).toBeNull();
    expect(screen.getByText("e5").getAttribute("aria-current")).toBe("true");
  });
});
