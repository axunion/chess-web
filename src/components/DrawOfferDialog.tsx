import { AlertDialog } from "@kobalte/core/alert-dialog";
import styles from "./DrawOfferDialog.module.css";
import chrome from "./dialogChrome.module.css";

interface DrawOfferDialogProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Auto-shown pvp draw-offer prompt, driven purely by `state.drawOffer` (a
 * sibling of GameOverModal in GameContainer, not menu-triggered — see
 * GameMenu's "Offer Draw" item, which only raises the offer).
 *
 * Reuses dialogChrome's overlay/positioner (z-index 3), the same as
 * GameOverModal and GameMenu's ConfirmDialog — this is load-bearing: while
 * open it sits above .menuSlot (z-index 2), so the menu (and therefore
 * resign/undo/new-game) is unreachable and `status` can't change underneath
 * it. If this dialog ever stops using that shared chrome, drawOffer's reset
 * needs to be revisited everywhere a full GameState overwrite happens.
 *
 * Dismissing via ESC/overlay-click must count as declining — otherwise
 * `drawOffer` stays true with nothing on screen, permanently blocking the
 * "Offer Draw" menu item's `!drawOffer` guard.
 */
export function DrawOfferDialog(props: DrawOfferDialogProps) {
  return (
    <AlertDialog
      open={props.open}
      onOpenChange={(open) => {
        if (!open) props.onDecline();
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay class={chrome.overlay} />
        <div class={chrome.positioner}>
          <AlertDialog.Content class={chrome.content}>
            <AlertDialog.Title class={chrome.title}>
              Draw offer
            </AlertDialog.Title>
            <AlertDialog.Description class={chrome.description}>
              Your opponent is offering a draw.
            </AlertDialog.Description>
            <div class={chrome.actions}>
              <button
                type="button"
                class={`${styles.declineButton} ${chrome.outlineButton}`}
                onClick={props.onDecline}
              >
                Decline
              </button>
              <button
                type="button"
                class={`${styles.acceptButton} ${chrome.accentButton}`}
                onClick={props.onAccept}
              >
                Accept
              </button>
            </div>
          </AlertDialog.Content>
        </div>
      </AlertDialog.Portal>
    </AlertDialog>
  );
}
