import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PromotionDialog } from "./PromotionDialog";

afterEach(cleanup);

describe("PromotionDialog", () => {
  it("is not shown when there is no pending promotion", () => {
    render(() => (
      <PromotionDialog
        pending={null}
        color="w"
        onSelect={() => {}}
        onCancel={() => {}}
      />
    ));

    expect(screen.queryByText("Promote pawn to")).toBeNull();
  });

  it("shows the four promotion choices and reports the selected piece", () => {
    const onSelect = vi.fn();
    render(() => (
      <PromotionDialog
        pending={{ from: "g7", to: "h8" }}
        color="w"
        onSelect={onSelect}
        onCancel={() => {}}
      />
    ));

    expect(screen.getByText("Promote pawn to")).not.toBeNull();
    expect(screen.getByLabelText("Promote to queen")).not.toBeNull();
    expect(screen.getByLabelText("Promote to rook")).not.toBeNull();
    expect(screen.getByLabelText("Promote to bishop")).not.toBeNull();
    expect(screen.getByLabelText("Promote to knight")).not.toBeNull();

    fireEvent.click(screen.getByLabelText("Promote to queen"));

    expect(onSelect).toHaveBeenCalledExactlyOnceWith("q");
  });

  it("reports non-queen piece selections", () => {
    const onSelect = vi.fn();
    render(() => (
      <PromotionDialog
        pending={{ from: "g7", to: "h8" }}
        color="w"
        onSelect={onSelect}
        onCancel={() => {}}
      />
    ));

    fireEvent.click(screen.getByLabelText("Promote to knight"));

    expect(onSelect).toHaveBeenCalledExactlyOnceWith("n");
  });

  it("cancels when the dialog is dismissed via Escape", () => {
    const onCancel = vi.fn();
    render(() => (
      <PromotionDialog
        pending={{ from: "g7", to: "h8" }}
        color="w"
        onSelect={() => {}}
        onCancel={onCancel}
      />
    ));

    fireEvent.keyDown(screen.getByText("Promote pawn to"), { key: "Escape" });

    expect(onCancel).toHaveBeenCalledOnce();
  });
});
