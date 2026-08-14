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

  it("keeps the same DOM node for a moved piece, so the translate transition slides instead of teleporting", () => {
    const store = createGameStore();
    const { container } = render(() => (
      <Chessboard state={store.state} onTapSquare={store.tapSquare} />
    ));

    const pieceLayer = container.querySelector('[class*="pieceLayer"]');
    if (!pieceLayer) throw new Error("pieceLayer not found");
    const pieceAt = (translate: string) =>
      Array.from(pieceLayer.children).find(
        (el) =>
          (el as HTMLElement).style.getPropertyValue("translate") === translate,
      );

    // e2 = file e (index 4), rank 2 (index 8-2=6).
    const e2Pawn = pieceAt("400% 600%");
    expect(e2Pawn).not.toBeUndefined();

    fireEvent.click(screen.getByLabelText("e2, white pawn"));
    fireEvent.click(screen.getByLabelText("e4, empty"));

    // e4 = file e (index 4), rank 4 (index 8-4=4).
    const e4Pawn = pieceAt("400% 400%");
    expect(e4Pawn).toBe(e2Pawn);
  });

  it("draws coordinate labels in a gutter outside the checkered grid, not on the squares", () => {
    const store = createGameStore();
    const { container } = render(() => (
      <Chessboard state={store.state} onTapSquare={store.tapSquare} />
    ));

    const rankLabels = Array.from(
      container.querySelectorAll(
        '[class*="rankGutter"] [class*="gutterLabel"]',
      ),
    ).map((el) => el.textContent);
    expect(rankLabels).toEqual(["8", "7", "6", "5", "4", "3", "2", "1"]);

    const fileLabels = Array.from(
      container.querySelectorAll(
        '[class*="fileGutter"] [class*="gutterLabel"]',
      ),
    ).map((el) => el.textContent);
    expect(fileLabels).toEqual(["a", "b", "c", "d", "e", "f", "g", "h"]);

    // Squares themselves carry no label text — just the accessible name.
    expect(screen.getByLabelText("a8, black rook").textContent?.trim()).toBe(
      "",
    );
    expect(screen.getByLabelText("e4, empty").textContent?.trim()).toBe("");
  });

  it("reverses the gutter label order when flipped, without moving them to a different edge", () => {
    const store = createGameStore();
    const { container } = render(() => (
      <Chessboard state={store.state} onTapSquare={store.tapSquare} flipped />
    ));

    const rankLabels = Array.from(
      container.querySelectorAll(
        '[class*="rankGutter"] [class*="gutterLabel"]',
      ),
    ).map((el) => el.textContent);
    expect(rankLabels).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);

    const fileLabels = Array.from(
      container.querySelectorAll(
        '[class*="fileGutter"] [class*="gutterLabel"]',
      ),
    ).map((el) => el.textContent);
    expect(fileLabels).toEqual(["h", "g", "f", "e", "d", "c", "b", "a"]);
  });
});
