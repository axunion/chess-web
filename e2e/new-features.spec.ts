import { expect, test } from "@playwright/test";

async function openMenu(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Game menu" }).click();
}

async function startPvp(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByText("vs Player", { exact: true }).click();
  await page.getByRole("button", { name: "Start" }).click();
}

test("undo takes back the last move and the board is interactive again", async ({
  page,
}) => {
  await startPvp(page);

  await page.getByRole("button", { name: "e2, white pawn" }).click();
  await page.getByRole("button", { name: "e4, empty" }).click();
  await expect(
    page.getByRole("button", { name: "e4, white pawn" }),
  ).toBeVisible();

  await openMenu(page);
  await page.getByText("Undo", { exact: true }).click();

  await expect(
    page.getByRole("button", { name: "e2, white pawn" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "e4, empty" })).toBeVisible();

  // Board is interactive again — the same move can be replayed.
  await page.getByRole("button", { name: "e2, white pawn" }).click();
  await page.getByRole("button", { name: "e4, empty" }).click();
  await expect(
    page.getByRole("button", { name: "e4, white pawn" }),
  ).toBeVisible();
});

test("cpu game (human plays black): undo after the CPU's opening move re-requests the engine instead of stalling", async ({
  page,
}) => {
  test.slow(); // waits on the real Stockfish worker twice

  await page.goto("/");
  await page.getByText("Black", { exact: true }).click();
  await page.getByRole("button", { name: "Start" }).click();

  // Read live off the always-visible sidebar history panel (the default
  // Playwright viewport here is desktop-sized, ≥64rem — see GameContainer's
  // breakpoint) rather than opening the Move History dialog: no dialog
  // open/close/animation timing to race against, and its move count updates
  // on its own as the store changes.
  const historyRows = page.locator("table tbody tr");

  // Wait for the CPU's opening move to actually land on the board. Its exact
  // choice of move is not asserted (engine-dependent) — only that exactly
  // one move was recorded.
  await expect(historyRows).toHaveCount(1, { timeout: 30_000 });

  await openMenu(page);
  await page.getByText("Undo", { exact: true }).click();

  // Back to the start position...
  await expect(historyRows).toHaveCount(0);

  // ...and the engine must think again on its own, not stall forever —
  // asserted on the functional outcome (a move reappears) rather than
  // catching the transient "thinking" text, since a warm, already-initialized
  // engine can resolve a shallow search fast enough to never paint it.
  await expect(historyRows).toHaveCount(1, { timeout: 30_000 });
});

test("draw offer: accept ends the game as a draw by agreement, and it survives a reload", async ({
  page,
}) => {
  await startPvp(page);
  await page.getByRole("button", { name: "e2, white pawn" }).click();
  await page.getByRole("button", { name: "e4, empty" }).click();

  await openMenu(page);
  await page.getByText("Offer Draw", { exact: true }).click();
  await page.getByText("Accept", { exact: true }).click();

  await expect(page.getByText("Draw — Agreement")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Draw — Agreement")).toBeVisible();
});

test("draw offer: dismissing via Escape counts as declining, so it can be offered again immediately", async ({
  page,
}) => {
  await startPvp(page);

  await openMenu(page);
  await page.getByText("Offer Draw", { exact: true }).click();
  await expect(page.getByText("Draw offer")).toBeVisible();

  // Pressed on the dialog itself (not page.keyboard.press): that first
  // focuses the target, avoiding a race where a global keydown can fire
  // before the dialog's own focus-trap/listeners are attached.
  await page.getByRole("alertdialog").press("Escape");
  await expect(page.getByText("Draw offer")).toBeHidden();

  await openMenu(page);
  await page.getByText("Offer Draw", { exact: true }).click();
  await expect(page.getByText("Draw offer")).toBeVisible();
});

test("copy PGN puts the current game's PGN on the clipboard", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await startPvp(page);

  await page.getByRole("button", { name: "e2, white pawn" }).click();
  await page.getByRole("button", { name: "e4, empty" }).click();

  await openMenu(page);
  await page.getByText("Copy PGN", { exact: true }).click();

  // Evaluated as a string, not a typed closure: this project's tsconfig for
  // e2e/ has no DOM lib, so `navigator` isn't a known global to typecheck.
  const clipboardText = await page.evaluate("navigator.clipboard.readText()");
  expect(clipboardText).toContain("e4");
});

test("desktop-width move history panel shows moves live without opening the dialog; narrow width hides it but the dialog still works", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await startPvp(page);

  await page.getByRole("button", { name: "e2, white pawn" }).click();
  await page.getByRole("button", { name: "e4, empty" }).click();

  await expect(
    page.getByRole("heading", { name: "Move History" }),
  ).toBeVisible();
  await expect(page.getByText("e4", { exact: true })).toBeVisible();

  await page.setViewportSize({ width: 500, height: 900 });
  await expect(
    page.getByRole("heading", { name: "Move History" }),
  ).toBeHidden();

  await openMenu(page);
  await page.getByRole("menuitem", { name: "Move History" }).click();
  await expect(
    page.getByRole("alertdialog").getByText("e4", { exact: true }),
  ).toBeVisible();
});
