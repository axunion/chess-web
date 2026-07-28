import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App";

afterEach(cleanup);

describe("App", () => {
  it("increments the count when the button is clicked", async () => {
    render(() => <App />);

    const button = screen.getByRole("button", { name: /count is 0/i });
    expect(button).toBeTruthy();

    fireEvent.click(button);

    const updated = await screen.findByRole("button", { name: /count is 1/i });
    expect(updated.textContent).toContain("Count is 1");
  });
});
