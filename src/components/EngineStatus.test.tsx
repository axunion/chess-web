import { cleanup, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EngineStatus } from "./EngineStatus";

afterEach(cleanup);

describe("EngineStatus", () => {
  it("renders nothing when idle (engine ready, nothing to report)", () => {
    const { container } = render(() => (
      <EngineStatus engine="ready" onRetry={vi.fn()} />
    ));
    expect(screen.queryByText("Loading Stockfish…")).toBeNull();
    expect(screen.queryByText("Stockfish is thinking…")).toBeNull();
    expect(screen.queryByText(/Engine error/)).toBeNull();
    expect(container.textContent).toBe("");
  });

  it("renders nothing when off (pvp games never set engine)", () => {
    const { container } = render(() => (
      <EngineStatus engine="off" onRetry={vi.fn()} />
    ));
    expect(container.textContent).toBe("");
  });

  it("shows the thinking banner while the cpu is calculating a move", () => {
    render(() => <EngineStatus engine="thinking" onRetry={vi.fn()} />);
    expect(screen.getByText("Stockfish is thinking…")).not.toBeNull();
  });

  it("distinguishes the one-time warm-up from the cpu actually thinking", () => {
    // "loading" also covers warm-up on the human's own move (spec/05 §7 step
    // 3) — it must not claim the CPU is "thinking" while it's the human's turn.
    render(() => <EngineStatus engine="loading" onRetry={vi.fn()} />);
    expect(screen.getByText("Loading Stockfish…")).not.toBeNull();
    expect(screen.queryByText("Stockfish is thinking…")).toBeNull();
  });

  it("shows a retry action on engine error, calling onRetry when clicked", () => {
    const onRetry = vi.fn();
    render(() => <EngineStatus engine="error" onRetry={onRetry} />);
    expect(screen.getByText(/Engine error/)).not.toBeNull();
    screen.getByText("Retry").click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
