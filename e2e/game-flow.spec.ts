import { expect, test } from "@playwright/test";

test("starts a Player vs Player game and makes a move on the real board", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByText("Player", { exact: true }).click();
  await page.getByText("Start").click();

  await page.getByRole("button", { name: "e2, white pawn" }).click();
  await page.getByRole("button", { name: "e4, empty" }).click();

  await expect(
    page.getByRole("button", { name: "e4, white pawn" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "e2, empty" })).toBeVisible();

  // Reload to exercise the real localStorage restore path (spec/02
  // state-persistence) — happy-dom in vitest can't stand in for this.
  await page.reload();
  await expect(
    page.getByRole("button", { name: "e4, white pawn" }),
  ).toBeVisible();
});
