import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vitest";
import { createGameStore } from "../store/gameStore";
import { Chessboard } from "./Chessboard";

afterEach(cleanup);

describe("Chessboard", () => {
  it("renders the initial position with 32 pieces and accessible square labels", () => {
    const store = createGameStore();
    render(() => (
      <Chessboard state={store.state} onTapSquare={store.tapSquare} />
    ));

    expect(screen.getByLabelText("e2, white pawn")).not.toBeNull();
    expect(screen.getByLabelText("e7, black pawn")).not.toBeNull();
    expect(screen.getByLabelText("e1, white king")).not.toBeNull();
    expect(screen.getByLabelText("e4, empty")).not.toBeNull();

    const occupiedSquares = screen
      .getAllByRole("button")
      .filter(
        (button) => !button.getAttribute("aria-label")?.endsWith(", empty"),
      );
    expect(occupiedSquares).toHaveLength(32);
  });

  it("tapping an own piece selects it (aria-pressed), and tapping a legal target moves it", () => {
    const store = createGameStore();
    render(() => (
      <Chessboard state={store.state} onTapSquare={store.tapSquare} />
    ));

    const e2 = screen.getByLabelText("e2, white pawn");
    fireEvent.click(e2);
    expect(e2.getAttribute("aria-pressed")).toBe("true");

    const e4 = screen.getByLabelText("e4, empty");
    fireEvent.click(e4);

    expect(screen.getByLabelText("e4, white pawn")).not.toBeNull();
    expect(screen.getByLabelText("e2, empty")).not.toBeNull();
    expect(e2.getAttribute("aria-pressed")).not.toBe("true");
  });
});
