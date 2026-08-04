import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GameState } from "../game/types";
import { createGameStore } from "../store/gameStore";
import { GameStatusBar } from "./GameStatusBar";

afterEach(cleanup);

/** Kobalte's menu trigger opens on pointerdown (not click) for non-touch pointers. */
function openMenu(): void {
  fireEvent.pointerDown(screen.getByLabelText("Game menu"), { button: 0 });
}

/** Kobalte's menu items select on pointerup (not click). */
function selectMenuItem(text: string): void {
  fireEvent.pointerUp(screen.getByText(text), { button: 0 });
}

function cpuState(engine: GameState["engine"]): GameState {
  return {
    ...createGameStore().state,
    config: { mode: "cpu", difficulty: "normal", playerColor: "w" },
    engine,
  };
}

describe("GameStatusBar", () => {
  it("tucks Resign/Quit inside the game menu, hiding Resign once the game is over", () => {
    const store = createGameStore();
    render(() => (
      <GameStatusBar
        state={store.state}
        onQuit={vi.fn()}
        onResign={vi.fn()}
        onRetryEngine={vi.fn()}
      />
    ));

    openMenu();
    expect(screen.getByText("Resign")).not.toBeNull();
    expect(screen.getByText("Return to Title")).not.toBeNull();

    store.resign("w");

    // Resign no longer applies once the game is over, but Return to Title is
    // still the only way back to the title screen.
    expect(screen.queryByText("Resign")).toBeNull();
    expect(screen.getByText("Return to Title")).not.toBeNull();
  });

  it("also offers Move History in the game menu regardless of game state", () => {
    const store = createGameStore();
    render(() => (
      <GameStatusBar
        state={store.state}
        onQuit={vi.fn()}
        onResign={vi.fn()}
        onRetryEngine={vi.fn()}
      />
    ));

    openMenu();
    expect(screen.getByText("Move History")).not.toBeNull();
  });

  it("asks for confirmation before resigning, and only calls onResign once confirmed", () => {
    const onResign = vi.fn();
    const store = createGameStore();
    render(() => (
      <GameStatusBar
        state={store.state}
        onQuit={vi.fn()}
        onResign={onResign}
        onRetryEngine={vi.fn()}
      />
    ));

    openMenu();
    selectMenuItem("Resign");
    expect(screen.getByText("Resign the game?")).not.toBeNull();
    expect(onResign).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByText("Resign").at(-1) as HTMLElement);
    expect(onResign).toHaveBeenCalledTimes(1);
  });

  it("asks for confirmation before quitting, and only calls onQuit once confirmed", () => {
    const onQuit = vi.fn();
    const store = createGameStore();
    render(() => (
      <GameStatusBar
        state={store.state}
        onQuit={onQuit}
        onResign={vi.fn()}
        onRetryEngine={vi.fn()}
      />
    ));

    openMenu();
    selectMenuItem("Return to Title");
    expect(screen.getByText("Return to the title screen?")).not.toBeNull();
    expect(onQuit).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getAllByText("Return to Title").at(-1) as HTMLElement,
    );
    expect(onQuit).toHaveBeenCalledTimes(1);
  });

  it("does not call onQuit when the confirmation is canceled", () => {
    const onQuit = vi.fn();
    const store = createGameStore();
    render(() => (
      <GameStatusBar
        state={store.state}
        onQuit={onQuit}
        onResign={vi.fn()}
        onRetryEngine={vi.fn()}
      />
    ));

    openMenu();
    selectMenuItem("Return to Title");
    fireEvent.click(screen.getByText("Cancel"));
    expect(onQuit).not.toHaveBeenCalled();
  });

  it("reserves the notice row for the whole cpu game, not just while thinking/erroring", () => {
    const { unmount } = render(() => (
      <GameStatusBar
        state={cpuState("ready")}
        onQuit={vi.fn()}
        onResign={vi.fn()}
        onRetryEngine={vi.fn()}
      />
    ));
    // Idle (engine ready, nothing to report): the row is reserved but empty.
    expect(screen.queryByText("Loading Stockfish…")).toBeNull();
    expect(screen.queryByText("Stockfish is thinking…")).toBeNull();
    expect(screen.queryByText(/Engine error/)).toBeNull();
    unmount();

    render(() => (
      <GameStatusBar
        state={cpuState("thinking")}
        onQuit={vi.fn()}
        onResign={vi.fn()}
        onRetryEngine={vi.fn()}
      />
    ));
    expect(screen.getByText("Stockfish is thinking…")).not.toBeNull();
  });

  it("distinguishes the one-time warm-up from the CPU actually thinking", () => {
    // "loading" also covers warm-up on the human's own move (spec/05 §7 step
    // 3) — it must not claim the CPU is "thinking" while it's the human's turn.
    render(() => (
      <GameStatusBar
        state={cpuState("loading")}
        onQuit={vi.fn()}
        onResign={vi.fn()}
        onRetryEngine={vi.fn()}
      />
    ));
    expect(screen.getByText("Loading Stockfish…")).not.toBeNull();
    expect(screen.queryByText("Stockfish is thinking…")).toBeNull();
  });

  it("never reserves the notice row in a pvp game", () => {
    const store = createGameStore();
    render(() => (
      <GameStatusBar
        state={store.state}
        onQuit={vi.fn()}
        onResign={vi.fn()}
        onRetryEngine={vi.fn()}
      />
    ));

    expect(screen.queryByText("Stockfish is thinking…")).toBeNull();
    expect(screen.queryByText(/Engine error/)).toBeNull();
  });
});
