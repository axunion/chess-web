import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GameOverModal } from "./GameOverModal";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("GameOverModal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("shows the result and calls onReturnToTitle when its action is clicked", async () => {
    const onReturnToTitle = vi.fn();
    render(() => (
      <GameOverModal
        status={{ kind: "resigned", winner: "w" }}
        onReturnToTitle={onReturnToTitle}
      />
    ));

    await vi.advanceTimersByTimeAsync(301);
    expect(screen.getByText("Return to Title")).not.toBeNull();

    fireEvent.click(screen.getByText("Return to Title"));
    expect(onReturnToTitle).toHaveBeenCalledTimes(1);
  });

  it("stays closed while the game is still playing", async () => {
    render(() => (
      <GameOverModal
        status={{ kind: "playing", check: false }}
        onReturnToTitle={vi.fn()}
      />
    ));

    await vi.advanceTimersByTimeAsync(301);
    expect(screen.queryByText("Return to Title")).toBeNull();
  });
});
