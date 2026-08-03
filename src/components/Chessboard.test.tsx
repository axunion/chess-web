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

  it("draws in-square coordinate labels on the visually left column and bottom row", () => {
    const store = createGameStore();
    render(() => (
      <Chessboard state={store.state} onTapSquare={store.tapSquare} />
    ));

    // a8: visually top-left — rank label only.
    expect(screen.getByLabelText("a8, black rook").textContent?.trim()).toBe(
      "8",
    );
    // h1: visually bottom-right — file label only.
    expect(screen.getByLabelText("h1, white rook").textContent?.trim()).toBe(
      "h",
    );
    // a1: visually bottom-left corner — both labels.
    const a1Text = screen.getByLabelText("a1, white rook").textContent ?? "";
    expect(a1Text).toContain("1");
    expect(a1Text).toContain("a");
    // Interior square — no labels.
    expect(screen.getByLabelText("e4, empty").textContent?.trim()).toBe("");
  });

  it("keeps coordinate labels on the visually left/bottom edge when flipped", () => {
    const store = createGameStore();
    render(() => (
      <Chessboard state={store.state} onTapSquare={store.tapSquare} flipped />
    ));

    // Flipped: h-file is drawn leftmost, rank 1 is drawn topmost.
    expect(screen.getByLabelText("h1, white rook").textContent?.trim()).toBe(
      "1",
    );
    expect(screen.getByLabelText("a8, black rook").textContent?.trim()).toBe(
      "a",
    );
    const h8Text = screen.getByLabelText("h8, black rook").textContent ?? "";
    expect(h8Text).toContain("8");
    expect(h8Text).toContain("h");
  });
});
