import { AlertDialog } from "@kobalte/core/alert-dialog";
import type { JSX } from "solid-js";
import chrome from "./dialogChrome.module.css";

interface AlertDialogShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  cancelLabel: string;
  cancelClass: string;
  confirmLabel: string;
  confirmIcon?: JSX.Element;
  confirmClass: string;
  onConfirm: () => void;
}

/** Shared AlertDialog scaffold for GameMenu's Resign/Quit confirmations and
 * the draw-offer prompt — same overlay/positioner chrome, same two-button
 * actions row. The cancel button uses AlertDialog.CloseButton, so it and
 * ESC/overlay-dismiss both funnel through `onOpenChange`. */
export function AlertDialogShell(props: AlertDialogShellProps) {
  return (
    <AlertDialog open={props.open} onOpenChange={props.onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay class={chrome.overlay} />
        <div class={chrome.positioner}>
          <AlertDialog.Content class={chrome.content}>
            <AlertDialog.Title class={chrome.title}>
              {props.title}
            </AlertDialog.Title>
            <AlertDialog.Description class={chrome.description}>
              {props.description}
            </AlertDialog.Description>
            <div class={chrome.actions}>
              <AlertDialog.CloseButton class={props.cancelClass}>
                {props.cancelLabel}
              </AlertDialog.CloseButton>
              <button
                type="button"
                class={props.confirmClass}
                onClick={props.onConfirm}
              >
                {props.confirmIcon}
                {props.confirmLabel}
              </button>
            </div>
          </AlertDialog.Content>
        </div>
      </AlertDialog.Portal>
    </AlertDialog>
  );
}
