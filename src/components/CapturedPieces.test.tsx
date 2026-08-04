import { cleanup, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vitest";
import { CapturedPieces } from "./CapturedPieces";

afterEach(cleanup);

describe("CapturedPieces", () => {
  it("renders no advantage badge when advantage is 0", () => {
    render(() => (
      <CapturedPieces
        pieces={["p"]}
        color="w"
        advantage={0}
        active={false}
        label="White"
      />
    ));
    expect(screen.queryByText(/^\+/)).toBeNull();
  });

  it("renders a +N badge when the side is ahead on material", () => {
    render(() => (
      <CapturedPieces
        pieces={["q"]}
        color="w"
        advantage={3}
        active={false}
        label="White"
      />
    ));
    expect(screen.getByText("+3")).not.toBeNull();
  });

  it("collapses repeated captures of the same type into one icon + a count badge", () => {
    const { container } = render(() => (
      <CapturedPieces
        pieces={["p", "p", "p"]}
        color="w"
        advantage={0}
        active={false}
        label="White"
      />
    ));

    expect(container.querySelectorAll("svg").length).toBe(1);
    expect(screen.getByText("×3")).not.toBeNull();
  });

  it("shows no count badge for a type captured only once", () => {
    render(() => (
      <CapturedPieces
        pieces={["n"]}
        color="w"
        advantage={0}
        active={false}
        label="White"
      />
    ));
    expect(screen.queryByText(/^×/)).toBeNull();
  });

  it("keeps distinct types as separate groups, each with its own count", () => {
    const { container } = render(() => (
      <CapturedPieces
        pieces={["q", "p", "p"]}
        color="w"
        advantage={0}
        active={false}
        label="White"
      />
    ));

    expect(container.querySelectorAll("svg").length).toBe(2);
    expect(screen.getByText("×2")).not.toBeNull();
  });

  it("shows the player-card label as visible text", () => {
    render(() => (
      <CapturedPieces
        pieces={[]}
        color="b"
        advantage={0}
        active={false}
        label="Stockfish · Normal"
      />
    ));
    expect(screen.getByText("Stockfish · Normal")).not.toBeNull();
  });

  it("mentions being to move in its accessible label when active", () => {
    render(() => (
      <CapturedPieces
        pieces={[]}
        color="w"
        advantage={0}
        active={true}
        label="White"
      />
    ));
    expect(
      screen.getByLabelText("White — captured pieces, to move"),
    ).not.toBeNull();
  });
});
