import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DrawOfferDialog } from "./DrawOfferDialog";

afterEach(cleanup);

describe("DrawOfferDialog", () => {
  it("is not shown when closed", () => {
    render(() => (
      <DrawOfferDialog open={false} onAccept={() => {}} onDecline={() => {}} />
    ));

    expect(screen.queryByText("Draw offer")).toBeNull();
  });

  it("calls onAccept when Accept is clicked", () => {
    const onAccept = vi.fn();
    render(() => (
      <DrawOfferDialog open={true} onAccept={onAccept} onDecline={() => {}} />
    ));

    fireEvent.click(screen.getByText("Accept"));

    expect(onAccept).toHaveBeenCalledOnce();
  });

  it("calls onDecline when Decline is clicked", () => {
    const onDecline = vi.fn();
    render(() => (
      <DrawOfferDialog open={true} onAccept={() => {}} onDecline={onDecline} />
    ));

    fireEvent.click(screen.getByText("Decline"));

    expect(onDecline).toHaveBeenCalledOnce();
  });

  it("counts a dismissal via Escape as declining", () => {
    const onDecline = vi.fn();
    render(() => (
      <DrawOfferDialog open={true} onAccept={() => {}} onDecline={onDecline} />
    ));

    fireEvent.keyDown(screen.getByText("Draw offer"), { key: "Escape" });

    expect(onDecline).toHaveBeenCalledOnce();
  });
});
