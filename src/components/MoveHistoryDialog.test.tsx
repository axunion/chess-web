import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { HistoryEntry } from "../game/types";
import { MoveHistoryDialog } from "./MoveHistoryDialog";

afterEach(cleanup);

function entry(san: string, color: "w" | "b"): HistoryEntry {
  return { san, from: "e2", to: "e4", color };
}

describe("MoveHistoryDialog", () => {
  it("renders nothing when closed", () => {
    render(() => (
      <MoveHistoryDialog open={false} onOpenChange={vi.fn()} history={[]} />
    ));

    expect(screen.queryByText("Move History")).toBeNull();
  });

  it("shows a placeholder and no table when there are no moves yet", () => {
    render(() => (
      <MoveHistoryDialog open={true} onOpenChange={vi.fn()} history={[]} />
    ));

    expect(screen.getByText("No moves yet")).not.toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("marks the most recent ply as current — white just moved (odd length)", () => {
    const history = [entry("e4", "w")];
    render(() => (
      <MoveHistoryDialog open={true} onOpenChange={vi.fn()} history={history} />
    ));

    const white = screen.getByText("e4");
    expect(white.getAttribute("aria-current")).toBe("true");
  });

  it("marks the most recent ply as current — black just moved (even length)", () => {
    const history = [entry("e4", "w"), entry("e5", "b")];
    render(() => (
      <MoveHistoryDialog open={true} onOpenChange={vi.fn()} history={history} />
    ));

    expect(screen.getByText("e4").getAttribute("aria-current")).toBeNull();
    expect(screen.getByText("e5").getAttribute("aria-current")).toBe("true");
  });

  it("calls onOpenChange(false) when the close button is clicked", () => {
    const onOpenChange = vi.fn();
    render(() => (
      <MoveHistoryDialog
        open={true}
        onOpenChange={onOpenChange}
        history={[entry("e4", "w")]}
      />
    ));

    fireEvent.click(screen.getByLabelText("Close"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
