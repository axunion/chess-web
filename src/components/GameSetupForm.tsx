import { RadioGroup } from "@kobalte/core/radio-group";
import { createSignal, For } from "solid-js";
import type { Color, Difficulty, GameConfig, GameMode } from "../game/types";
import styles from "./GameSetupForm.module.css";

interface GameSetupFormProps {
  onStart: (config: GameConfig) => void;
}

type PlayerColorChoice = Color | "random";

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "easy", label: "Easy" },
  { value: "casual", label: "Casual" },
  { value: "normal", label: "Normal" },
  { value: "hard", label: "Hard" },
  { value: "expert", label: "Expert" },
  { value: "master", label: "Master" },
  { value: "elite", label: "Elite" },
];

const PLAYER_COLORS: { value: PlayerColorChoice; label: string }[] = [
  { value: "w", label: "White" },
  { value: "b", label: "Black" },
  { value: "random", label: "Random" },
];

/** Mode/difficulty/color picker used by TitleScreen. */
export function GameSetupForm(props: GameSetupFormProps) {
  const [mode, setMode] = createSignal<GameMode>("cpu");
  const [difficulty, setDifficulty] = createSignal<Difficulty>("normal");
  const [playerColor, setPlayerColor] = createSignal<PlayerColorChoice>("w");
  const isCpu = () => mode() === "cpu";

  function resolveColor(choice: PlayerColorChoice): Color {
    if (choice === "random") return Math.random() < 0.5 ? "w" : "b";
    return choice;
  }

  function handleStart(): void {
    props.onStart({
      mode: mode(),
      difficulty: difficulty(),
      playerColor: resolveColor(playerColor()),
    });
  }

  return (
    <div class={styles.form}>
      <RadioGroup
        class={styles.field}
        value={mode()}
        onChange={(value) => setMode(value as GameMode)}
      >
        <RadioGroup.Label class={styles.fieldLabel}>Mode</RadioGroup.Label>
        <div class={styles.segmented}>
          <RadioGroup.Item value="pvp" class={styles.segmentedItem}>
            <RadioGroup.ItemInput />
            <RadioGroup.ItemLabel class={styles.segmentedLabel}>
              Player
            </RadioGroup.ItemLabel>
          </RadioGroup.Item>
          <RadioGroup.Item value="cpu" class={styles.segmentedItem}>
            <RadioGroup.ItemInput />
            <RadioGroup.ItemLabel class={styles.segmentedLabel}>
              Computer
            </RadioGroup.ItemLabel>
          </RadioGroup.Item>
        </div>
      </RadioGroup>

      {/* Always rendered at full size — Start's position never moves.
          Grayed out and disabled rather than hidden/collapsed when not
          playing cpu, so switching Player/Computer never resizes the card. */}
      <RadioGroup
        class={styles.field}
        value={difficulty()}
        disabled={!isCpu()}
        onChange={(value) => setDifficulty(value as Difficulty)}
      >
        <RadioGroup.Label class={styles.fieldLabel}>
          Difficulty
        </RadioGroup.Label>
        <div class={`${styles.segmented} ${styles.segmentedGrid}`}>
          <For each={DIFFICULTIES}>
            {(item) => (
              <RadioGroup.Item value={item.value} class={styles.segmentedItem}>
                <RadioGroup.ItemInput />
                <RadioGroup.ItemLabel class={styles.segmentedLabel}>
                  {item.label}
                </RadioGroup.ItemLabel>
              </RadioGroup.Item>
            )}
          </For>
        </div>
      </RadioGroup>

      <RadioGroup
        class={styles.field}
        value={playerColor()}
        disabled={!isCpu()}
        onChange={(value) => setPlayerColor(value as PlayerColorChoice)}
      >
        <RadioGroup.Label class={styles.fieldLabel}>Color</RadioGroup.Label>
        <div class={styles.segmented}>
          <For each={PLAYER_COLORS}>
            {(item) => (
              <RadioGroup.Item value={item.value} class={styles.segmentedItem}>
                <RadioGroup.ItemInput />
                <RadioGroup.ItemLabel class={styles.segmentedLabel}>
                  {item.label}
                </RadioGroup.ItemLabel>
              </RadioGroup.Item>
            )}
          </For>
        </div>
      </RadioGroup>

      <div class={styles.actions}>
        <button type="button" class={styles.startButton} onClick={handleStart}>
          Start
        </button>
      </div>
    </div>
  );
}
