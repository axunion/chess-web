import { cleanup, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vitest";
import { CapturedPieces } from "./CapturedPieces";

afterEach(cleanup);

describe("CapturedPieces", () => {
  it("renders no advantage badge when advantage is 0", () => {
    render(() => <CapturedPieces pieces={["p"]} color="w" advantage={0} />);
    expect(screen.queryByText(/^\+/)).toBeNull();
  });

  it("renders a +N badge when the side is ahead on material", () => {
    render(() => <CapturedPieces pieces={["q"]} color="w" advantage={3} />);
    expect(screen.getByText("+3")).not.toBeNull();
  });
});
