import type { GameConfig } from "../game/types";
import { GameSetupForm } from "./GameSetupForm";
import styles from "./TitleScreen.module.css";

interface TitleScreenProps {
  onStart: (config: GameConfig) => void;
}

/** Full-screen cover shown before any game exists, with the setup picker compact and inline. */
export function TitleScreen(props: TitleScreenProps) {
  return (
    <div class={styles.screen}>
      <div class={styles.board} aria-hidden="true" />
      <div class={styles.content}>
        <h1 class={styles.title}>Chess</h1>
        <p class={styles.tagline}>Walnut and maple. One move at a time.</p>
        <div class={styles.divider} aria-hidden="true" />
        <GameSetupForm onStart={props.onStart} />
      </div>
    </div>
  );
}
