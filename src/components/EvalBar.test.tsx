import { cleanup, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vitest";
import { EvalBar } from "./EvalBar";

afterEach(cleanup);

describe("EvalBar", () => {
  it("shows a signed pawn score inside the bar and labels it for assistive tech", () => {
    const { container } = render(() => (
      <EvalBar evaluation={{ kind: "cp", value: 50 }} flipped={false} />
    ));

    const bar = screen.getByRole("img", { name: "Evaluation: +0.5" });
    expect(bar.textContent).toBe("+0.5");
    expect(container.querySelector("[aria-hidden='true']")?.textContent).toBe(
      "+0.5",
    );
  });

  it("shows a forced mate as M<n>", () => {
    render(() => (
      <EvalBar evaluation={{ kind: "mate", value: 3 }} flipped={false} />
    ));

    expect(
      screen.getByRole("img", { name: "Evaluation: M3" }).textContent,
    ).toBe("M3");
  });

  it("reads as not yet available, with a dash, when there is no evaluation", () => {
    render(() => <EvalBar evaluation={null} flipped={false} />);

    const bar = screen.getByRole("img", {
      name: "Evaluation: not yet available",
    });
    expect(bar.textContent).toBe("–");
  });
});
