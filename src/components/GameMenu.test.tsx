import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGameStore } from "../store/gameStore";
import { GameMenu } from "./GameMenu";

afterEach(cleanup);

/** Kobalte's menu trigger opens on pointerdown (not click) for non-touch pointers. */
function openMenu(): void {
  fireEvent.pointerDown(screen.getByLabelText("Game menu"), { button: 0 });
}

/** Kobalte's menu items select on pointerup (not click). */
function selectMenuItem(text: string): void {
  fireEvent.pointerUp(screen.getByText(text), { button: 0 });
}

describe("GameMenu", () => {
  it("tucks Resign/Quit inside the game menu, hiding Resign once the game is over", () => {
    const store = createGameStore();
    render(() => (
      <GameMenu
        state={store.state}
        onQuit={vi.fn()}
        onResign={vi.fn()}
        onNewGame={vi.fn()}
        onFlip={vi.fn()}
        onUndo={vi.fn()}
        onOfferDraw={vi.fn()}
        getPgn={store.getPgn}
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

  it("also offers Move History and Flip Board in the game menu regardless of game state", () => {
    const store = createGameStore();
    render(() => (
      <GameMenu
        state={store.state}
        onQuit={vi.fn()}
        onResign={vi.fn()}
        onNewGame={vi.fn()}
        onFlip={vi.fn()}
        onUndo={vi.fn()}
        onOfferDraw={vi.fn()}
        getPgn={store.getPgn}
      />
    ));

    openMenu();
    expect(screen.getByText("Move History")).not.toBeNull();
    expect(screen.getByText("Flip Board")).not.toBeNull();
  });

  it("asks for confirmation before resigning, and only calls onResign once confirmed", () => {
    const onResign = vi.fn();
    const store = createGameStore();
    render(() => (
      <GameMenu
        state={store.state}
        onQuit={vi.fn()}
        onResign={onResign}
        onNewGame={vi.fn()}
        onFlip={vi.fn()}
        onUndo={vi.fn()}
        onOfferDraw={vi.fn()}
        getPgn={store.getPgn}
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
      <GameMenu
        state={store.state}
        onQuit={onQuit}
        onResign={vi.fn()}
        onNewGame={vi.fn()}
        onFlip={vi.fn()}
        onUndo={vi.fn()}
        onOfferDraw={vi.fn()}
        getPgn={store.getPgn}
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
      <GameMenu
        state={store.state}
        onQuit={onQuit}
        onResign={vi.fn()}
        onNewGame={vi.fn()}
        onFlip={vi.fn()}
        onUndo={vi.fn()}
        onOfferDraw={vi.fn()}
        getPgn={store.getPgn}
      />
    ));

    openMenu();
    selectMenuItem("Return to Title");
    fireEvent.click(screen.getByText("Cancel"));
    expect(onQuit).not.toHaveBeenCalled();
  });

  it("calls onFlip directly, without a confirmation dialog", () => {
    const onFlip = vi.fn();
    const store = createGameStore();
    render(() => (
      <GameMenu
        state={store.state}
        onQuit={vi.fn()}
        onResign={vi.fn()}
        onNewGame={vi.fn()}
        onFlip={onFlip}
        onUndo={vi.fn()}
        onOfferDraw={vi.fn()}
        getPgn={store.getPgn}
      />
    ));

    openMenu();
    selectMenuItem("Flip Board");
    expect(onFlip).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("asks for confirmation before starting a new game, even while still playing", () => {
    const onNewGame = vi.fn();
    const store = createGameStore();
    render(() => (
      <GameMenu
        state={store.state}
        onQuit={vi.fn()}
        onResign={vi.fn()}
        onNewGame={onNewGame}
        onFlip={vi.fn()}
        onUndo={vi.fn()}
        onOfferDraw={vi.fn()}
        getPgn={store.getPgn}
      />
    ));

    openMenu();
    selectMenuItem("New Game");
    expect(screen.getByText("Start a new game?")).not.toBeNull();
    expect(onNewGame).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByText("New Game").at(-1) as HTMLElement);
    expect(onNewGame).toHaveBeenCalledTimes(1);
  });

  it("offers New Game even after the game is over", () => {
    const store = createGameStore();
    store.resign("w");
    render(() => (
      <GameMenu
        state={store.state}
        onQuit={vi.fn()}
        onResign={vi.fn()}
        onNewGame={vi.fn()}
        onFlip={vi.fn()}
        onUndo={vi.fn()}
        onOfferDraw={vi.fn()}
        getPgn={store.getPgn}
      />
    ));

    openMenu();
    expect(screen.getByText("New Game")).not.toBeNull();
  });

  it("disables Undo once the game is over", () => {
    const store = createGameStore();
    store.resign("w");
    render(() => (
      <GameMenu
        state={store.state}
        onQuit={vi.fn()}
        onResign={vi.fn()}
        onNewGame={vi.fn()}
        onFlip={vi.fn()}
        onUndo={vi.fn()}
        onOfferDraw={vi.fn()}
        getPgn={store.getPgn}
      />
    ));

    openMenu();
    expect(
      screen
        .getByText("Undo")
        .closest("[aria-disabled]")
        ?.getAttribute("aria-disabled"),
    ).toBe("true");
  });

  it("offers Offer Draw only in pvp games that are still playing", () => {
    const store = createGameStore();
    render(() => (
      <GameMenu
        state={store.state}
        onQuit={vi.fn()}
        onResign={vi.fn()}
        onNewGame={vi.fn()}
        onFlip={vi.fn()}
        onUndo={vi.fn()}
        onOfferDraw={vi.fn()}
        getPgn={store.getPgn}
      />
    ));

    openMenu();
    expect(screen.getByText("Offer Draw")).not.toBeNull();
  });

  it("calls onUndo directly, without a confirmation dialog, when Undo is enabled", () => {
    const onUndo = vi.fn();
    const store = createGameStore();
    store.tapSquare("e2");
    store.tapSquare("e4");
    render(() => (
      <GameMenu
        state={store.state}
        onQuit={vi.fn()}
        onResign={vi.fn()}
        onNewGame={vi.fn()}
        onFlip={vi.fn()}
        onUndo={onUndo}
        onOfferDraw={vi.fn()}
        getPgn={store.getPgn}
      />
    ));

    openMenu();
    selectMenuItem("Undo");
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("calls onOfferDraw directly when Offer Draw is selected", () => {
    const onOfferDraw = vi.fn();
    const store = createGameStore();
    render(() => (
      <GameMenu
        state={store.state}
        onQuit={vi.fn()}
        onResign={vi.fn()}
        onNewGame={vi.fn()}
        onFlip={vi.fn()}
        onUndo={vi.fn()}
        onOfferDraw={onOfferDraw}
        getPgn={store.getPgn}
      />
    ));

    openMenu();
    selectMenuItem("Offer Draw");
    expect(onOfferDraw).toHaveBeenCalledTimes(1);
  });

  it("copies the current PGN to the clipboard when Copy PGN is selected", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    const store = createGameStore();
    store.tapSquare("e2");
    store.tapSquare("e4");
    render(() => (
      <GameMenu
        state={store.state}
        onQuit={vi.fn()}
        onResign={vi.fn()}
        onNewGame={vi.fn()}
        onFlip={vi.fn()}
        onUndo={vi.fn()}
        onOfferDraw={vi.fn()}
        getPgn={store.getPgn}
      />
    ));

    openMenu();
    selectMenuItem("Copy PGN");

    expect(writeText).toHaveBeenCalledWith(store.getPgn());
    expect(writeText.mock.calls[0][0]).toContain("e4");
  });
});
