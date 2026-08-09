import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GameSetupForm } from "./GameSetupForm";

afterEach(cleanup);

// Kobalte's Slider renders a hidden native `<input type="range">` for form
// association; `role="slider"` matches both it and the visible thumb, so
// tests reach the hidden input directly rather than via getByRole. Dragging
// isn't simulable in happy-dom, but arrow-key stepping is what Kobalte
// actually wires up to value changes (fireEvent.input on the range input is
// a no-op here — confirmed by spiking before writing these tests).
function difficultyInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="range"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("difficulty slider input not found");
  }
  return input;
}

function stepDifficulty(container: HTMLElement, steps: number): void {
  const input = difficultyInput(container);
  const key = steps >= 0 ? "ArrowRight" : "ArrowLeft";
  for (let i = 0; i < Math.abs(steps); i++) {
    fireEvent.keyDown(input, { key });
  }
}

describe("GameSetupForm", () => {
  it("defaults to vs Computer, White, Normal and submits that config", () => {
    const onStart = vi.fn();
    const { container } = render(() => <GameSetupForm onStart={onStart} />);

    expect(screen.getByText("Normal")).not.toBeNull();
    expect(screen.getByRole("radio", { name: "White" })).not.toBeNull();
    expect(difficultyInput(container).min).toBe("0");
    expect(difficultyInput(container).max).toBe("7");

    fireEvent.click(screen.getByText("Start"));
    expect(onStart).toHaveBeenCalledWith({
      mode: "cpu",
      difficulty: "normal",
      playerColor: "w",
    });
  });

  it("disables difficulty/color once Player is chosen, and submits pvp", () => {
    const onStart = vi.fn();
    const { container } = render(() => <GameSetupForm onStart={onStart} />);

    fireEvent.click(screen.getByRole("radio", { name: "vs Player" }));

    expect(difficultyInput(container).getAttribute("aria-disabled")).toBe(
      "true",
    );
    expect(
      (screen.getByRole("radio", { name: "White" }) as HTMLInputElement)
        .disabled,
    ).toBe(true);

    // A disabled slider ignores keyboard stepping.
    stepDifficulty(container, 1);
    expect(screen.getByText("Normal")).not.toBeNull();

    fireEvent.click(screen.getByText("Start"));
    expect(onStart).toHaveBeenCalledWith({
      mode: "pvp",
      difficulty: "normal",
      playerColor: "w",
    });
  });

  it("submits the chosen difficulty/color in cpu mode", () => {
    const onStart = vi.fn();
    const { container } = render(() => <GameSetupForm onStart={onStart} />);

    stepDifficulty(container, 1); // normal -> hard
    fireEvent.click(screen.getByRole("radio", { name: "Black" }));
    fireEvent.click(screen.getByText("Start"));

    expect(onStart).toHaveBeenCalledWith({
      mode: "cpu",
      difficulty: "hard",
      playerColor: "b",
    });
  });

  it("steps through all 8 difficulty tiers in order and submits the last one", () => {
    const onStart = vi.fn();
    const { container } = render(() => <GameSetupForm onStart={onStart} />);

    // Rewind from the default (Normal, index 3) to Beginner (index 0), then
    // walk every tier forward to Elite (index 7).
    stepDifficulty(container, -3);
    const expectedNames = [
      "Beginner",
      "Easy",
      "Casual",
      "Normal",
      "Hard",
      "Expert",
      "Master",
      "Elite",
    ];
    for (const [index, name] of expectedNames.entries()) {
      expect(screen.getByTestId("difficulty-name").textContent).toBe(name);
      if (index < expectedNames.length - 1) stepDifficulty(container, 1);
    }
    fireEvent.click(screen.getByText("Start"));
    expect(onStart).toHaveBeenCalledWith({
      mode: "cpu",
      difficulty: "elite",
      playerColor: "w",
    });
  });
});
