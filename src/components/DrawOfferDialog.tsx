import { AlertDialogShell } from "./AlertDialogShell";
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
 * Reuses dialogChrome's overlay/positioner (z-index 3) via AlertDialogShell,
 * the same as GameOverModal and GameMenu's Resign/Quit prompts — this is
 * load-bearing: while open it sits above .menuSlot (z-index 2), so the menu
 * (and therefore resign/undo/new-game) is unreachable and `status` can't
 * change underneath it. If this dialog ever stops using that shared chrome,
 * drawOffer's reset needs to be revisited everywhere a full GameState
 * overwrite happens.
 *
 * Dismissing via ESC/overlay-click must count as declining — otherwise
 * `drawOffer` stays true with nothing on screen, permanently blocking the
 * "Offer Draw" menu item's `!drawOffer` guard. Decline is wired as the
 * shell's cancel button, so both that and ESC/overlay-dismiss funnel through
 * the same `onOpenChange`.
 */
export function DrawOfferDialog(props: DrawOfferDialogProps) {
  return (
    <AlertDialogShell
      open={props.open}
      onOpenChange={(open) => {
        if (!open) props.onDecline();
      }}
      title="Draw offer"
      description="Your opponent is offering a draw."
      cancelLabel="Decline"
      cancelClass={`${styles.declineButton} ${chrome.outlineButton}`}
      confirmLabel="Accept"
      confirmClass={`${styles.acceptButton} ${chrome.accentButton}`}
      onConfirm={props.onAccept}
    />
  );
}
