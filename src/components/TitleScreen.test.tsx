import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TitleScreen } from "./TitleScreen";

afterEach(cleanup);

describe("TitleScreen", () => {
  it("shows a heading and the compact setup form, defaulting to vs Computer", () => {
    const onStart = vi.fn();
    render(() => <TitleScreen onStart={onStart} />);

    expect(screen.getByText("Chess")).not.toBeNull();

    fireEvent.click(screen.getByText("Start"));
    expect(onStart).toHaveBeenCalledWith({
      mode: "cpu",
      difficulty: "normal",
      playerColor: "w",
    });
  });
});
