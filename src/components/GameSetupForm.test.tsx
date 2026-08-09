import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GameSetupForm } from "./GameSetupForm";

afterEach(cleanup);

describe("GameSetupForm", () => {
  it("defaults to vs Computer, White, Normal and submits that config", () => {
    const onStart = vi.fn();
    render(() => <GameSetupForm onStart={onStart} />);

    expect(screen.getByRole("radio", { name: "Normal" })).not.toBeNull();
    expect(screen.getByRole("radio", { name: "White" })).not.toBeNull();

    fireEvent.click(screen.getByText("Start"));
    expect(onStart).toHaveBeenCalledWith({
      mode: "cpu",
      difficulty: "normal",
      playerColor: "w",
    });
  });

  it("disables difficulty/color once Player is chosen, and submits pvp", () => {
    const onStart = vi.fn();
    render(() => <GameSetupForm onStart={onStart} />);

    fireEvent.click(screen.getByRole("radio", { name: "Player" }));

    const normalRadio = screen.getByRole("radio", {
      name: "Normal",
    }) as HTMLInputElement;
    expect(normalRadio.disabled).toBe(true);

    // A disabled option can't be selected.
    fireEvent.click(screen.getByRole("radio", { name: "Hard" }));
    expect(normalRadio.checked).toBe(true);

    fireEvent.click(screen.getByText("Start"));
    expect(onStart).toHaveBeenCalledWith({
      mode: "pvp",
      difficulty: "normal",
      playerColor: "w",
    });
  });

  it("submits the chosen difficulty/color in cpu mode", () => {
    const onStart = vi.fn();
    render(() => <GameSetupForm onStart={onStart} />);

    fireEvent.click(screen.getByRole("radio", { name: "Hard" }));
    fireEvent.click(screen.getByRole("radio", { name: "Black" }));
    fireEvent.click(screen.getByText("Start"));

    expect(onStart).toHaveBeenCalledWith({
      mode: "cpu",
      difficulty: "hard",
      playerColor: "b",
    });
  });

  it("renders all 8 difficulty tiers and submits a non-default one", () => {
    const onStart = vi.fn();
    render(() => <GameSetupForm onStart={onStart} />);

    for (const label of [
      "Beginner",
      "Easy",
      "Casual",
      "Normal",
      "Hard",
      "Expert",
      "Master",
      "Elite",
    ]) {
      expect(screen.getByRole("radio", { name: label })).not.toBeNull();
    }

    fireEvent.click(screen.getByRole("radio", { name: "Elite" }));
    fireEvent.click(screen.getByText("Start"));

    expect(onStart).toHaveBeenCalledWith({
      mode: "cpu",
      difficulty: "elite",
      playerColor: "w",
    });
  });
});
