import { createMemo } from "solid-js";
import type { EngineEvaluation } from "../game/types";
import styles from "./EvalBar.module.css";
import { evalToWhitePercent } from "./evalToWhitePercent";

interface EvalBarProps {
  evaluation: EngineEvaluation | null;
}

/** "+1.4", "-0.3", or "M3"/"M-2" for a forced mate; "–" while unevaluated —
 * either no evaluation at all, or one whose engine reply never carried an
 * `info score` line (both render identically, so a genuinely even position
 * never looks like one the engine simply hasn't scored yet). */
function formatEvaluation(evaluation: EngineEvaluation | null): string {
  if (!evaluation) return "–";
  if (evaluation.kind === "mate") return `M${evaluation.value}`;
  const pawns = evaluation.value / 100;
  return pawns >= 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
}

/**
 * Horizontal eval bar (cpu mode only): a "White"/score/"Black" header sits
 * above a two-color bar, White always on the left — the number and side
 * labels read as a unit before the fill, rather than crowding the bar
 * itself. Labels are the color names, not player names: the bar's
 * left/right split is a color split, and stays accurate regardless of
 * which side the human is playing (unlike the board, this strip never
 * flips). A full-width strip above the board rather than a sidebar next to
 * it, so it never competes with Chessboard's own width/aspect-ratio sizing.
 * Purely presentational — mode gating is the caller's job (GameContainer).
 */
export function EvalBar(props: EvalBarProps) {
  const percent = createMemo(() =>
    props.evaluation ? evalToWhitePercent(props.evaluation) : 50,
  );
  const text = createMemo(() => formatEvaluation(props.evaluation));

  return (
    <div class={styles.wrapper}>
      <div class={styles.header} aria-hidden="true">
        <span class={styles.sideLabel}>White</span>
        <span class={styles.value}>{text()}</span>
        <span class={styles.sideLabel}>Black</span>
      </div>
      <div
        class={styles.bar}
        role="img"
        aria-label={
          props.evaluation
            ? `Evaluation: ${text()}`
            : "Evaluation: not yet available"
        }
      >
        <div class={styles.white} style={{ width: `${percent()}%` }} />
        <div class={styles.black} style={{ width: `${100 - percent()}%` }} />
      </div>
    </div>
  );
}
