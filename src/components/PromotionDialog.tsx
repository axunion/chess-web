import { Dialog } from "@kobalte/core/dialog";
import { For } from "solid-js";
import type { Color, PieceSymbol, Square } from "../game/types";
import styles from "./PromotionDialog.module.css";
import { PieceSvg } from "./pieces/pieceSvg";

interface PromotionDialogProps {
  pending: { from: Square; to: Square } | null;
  color: Color;
  onSelect: (piece: PieceSymbol) => void;
  onCancel: () => void;
}

const PROMOTION_PIECES: { type: PieceSymbol; label: string }[] = [
  { type: "q", label: "queen" },
  { type: "r", label: "rook" },
  { type: "b", label: "bishop" },
  { type: "n", label: "knight" },
];

/** Q/R/B/N picker shown when a pawn move reaches the last rank (spec/05 §2 row #3). */
export function PromotionDialog(props: PromotionDialogProps) {
  return (
    <Dialog
      open={props.pending !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) props.onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay class={styles.overlay} />
        <div class={styles.positioner}>
          <Dialog.Content class={styles.content}>
            <Dialog.Title class={styles.title}>Promote pawn to</Dialog.Title>
            <div class={styles.options}>
              <For each={PROMOTION_PIECES}>
                {(option) => (
                  <button
                    type="button"
                    class={styles.option}
                    aria-label={`Promote to ${option.label}`}
                    onClick={() => props.onSelect(option.type)}
                  >
                    <PieceSvg type={option.type} color={props.color} />
                  </button>
                )}
              </For>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
