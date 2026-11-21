import { createMemo } from "solid-js";
import type { EngineEvaluation } from "../game/types";
import styles from "./EvalBar.module.css";
import { evalToWhitePercent } from "./evalToWhitePercent";

interface EvalBarProps {
  evaluation: EngineEvaluation | null;
  /** Whether the board shows black at the bottom — the vertical (wide
      layout) bar keeps White's fill on the same side as White's pieces. */
  flipped: boolean;
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
 * Eval bar (cpu mode only), a two-color split with the score. A thin
 * horizontal strip above the board in the stacked portrait layout (White
 * always on the left, score inside at the leading side's end), and a slim
 * vertical column beside the board in GameContainer's wide layout (White's
 * fill on the same edge as White's pieces, score below the column since it
 * is too narrow to hold it) — the orientation is CSS-only, keyed to the same
 * media query as that layout. Purely presentational — mode gating is the
 * caller's job (GameContainer).
 */
export function EvalBar(props: EvalBarProps) {
  const percent = createMemo(() =>
    props.evaluation ? evalToWhitePercent(props.evaluation) : 50,
  );
  const text = createMemo(() => formatEvaluation(props.evaluation));

  return (
    <div
      class={styles.root}
      classList={{ [styles.flipped]: props.flipped }}
      role="img"
      aria-label={
        props.evaluation
          ? `Evaluation: ${text()}`
          : "Evaluation: not yet available"
      }
    >
      <div class={styles.bar}>
        <div class={styles.white} style={{ "flex-basis": `${percent()}%` }} />
        <div
          class={styles.black}
          style={{ "flex-basis": `${100 - percent()}%` }}
        />
      </div>
      <span
        class={styles.value}
        classList={{
          [styles.valueWhite]: percent() >= 50,
          [styles.valueBlack]: percent() < 50,
        }}
        aria-hidden="true"
      >
        {text()}
      </span>
    </div>
  );
}
