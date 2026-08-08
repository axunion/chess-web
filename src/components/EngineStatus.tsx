import { Show } from "solid-js";
import type { GameState } from "../game/types";
import styles from "./EngineStatus.module.css";

interface EngineStatusProps {
  engine: GameState["engine"];
  onRetry: () => void;
}

/** Inline cpu-engine status for the opponent player card (spec/02 §4).
    Renders nothing in pvp — `engine` only ever leaves "off"/"ready" inside
    cpu-mode-gated store actions (warmUpEngine/requestEngineMove), so gating
    purely on this prop is equivalent to gating on config.mode === "cpu". */
export function EngineStatus(props: EngineStatusProps) {
  const isLoading = () => props.engine === "loading";
  // "loading" is the one-time engine warm-up, which can happen on the
  // human's own move (spec/05 §7 step 3) — worth distinguishing from
  // "thinking", which is specifically the CPU calculating its reply.
  const isThinking = () => props.engine === "thinking";
  const isError = () => props.engine === "error";
  const spinnerText = () => {
    if (isLoading()) return "Loading Stockfish…";
    if (isThinking()) return "Stockfish is thinking…";
    return null;
  };

  return (
    <>
      <Show when={spinnerText()}>
        {(text) => (
          <div class={styles.thinking} role="status" aria-live="polite">
            <span class={styles.spinner} aria-hidden="true" />
            <span class={styles.thinkingText}>{text()}</span>
          </div>
        )}
      </Show>
      <Show when={isError()}>
        <div class={styles.error} role="alert">
          <span class={styles.errorText}>
            Engine error — Stockfish is unavailable.
          </span>
          <button
            type="button"
            class={styles.retryButton}
            onClick={props.onRetry}
          >
            Retry
          </button>
        </div>
      </Show>
    </>
  );
}
