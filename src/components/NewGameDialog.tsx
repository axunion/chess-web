import { Dialog } from "@kobalte/core/dialog";
import { RadioGroup } from "@kobalte/core/radio-group";
import { createSignal, For } from "solid-js";
import type { Color, Difficulty, GameConfig, GameMode } from "../game/types";
import styles from "./NewGameDialog.module.css";

interface NewGameDialogProps {
  open: boolean;
  /** Whether an in-progress game would be discarded by starting a new one (spec/05 §7). */
  hasActiveGame: boolean;
  onStart: (config: GameConfig) => void;
  onClose: () => void;
}

type PlayerColorChoice = Color | "random";

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "normal", label: "Normal" },
  { value: "hard", label: "Hard" },
  { value: "master", label: "Master" },
];

const PLAYER_COLORS: { value: PlayerColorChoice; label: string }[] = [
  { value: "w", label: "White" },
  { value: "b", label: "Black" },
  { value: "random", label: "Random" },
];

/** Mode/difficulty/color picker for starting a game (spec/05 §7). CPU options are disabled until M4. */
export function NewGameDialog(props: NewGameDialogProps) {
  const [mode, setMode] = createSignal<GameMode>("pvp");
  const [difficulty, setDifficulty] = createSignal<Difficulty>("normal");
  const [playerColor, setPlayerColor] = createSignal<PlayerColorChoice>("w");

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
    <Dialog
      open={props.open}
      onOpenChange={(isOpen) => {
        if (!isOpen) props.onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay class={styles.overlay} />
        <div class={styles.positioner}>
          <Dialog.Content class={styles.content}>
            <Dialog.Title class={styles.title}>New Game</Dialog.Title>
            {props.hasActiveGame && (
              <p class={styles.warning}>Current game will be discarded.</p>
            )}

            <RadioGroup
              class={styles.field}
              value={mode()}
              onChange={(value) => setMode(value as GameMode)}
            >
              <RadioGroup.Label class={styles.fieldLabel}>
                Mode
              </RadioGroup.Label>
              <div class={styles.optionRow}>
                <RadioGroup.Item value="pvp" class={styles.option}>
                  <RadioGroup.ItemInput />
                  <RadioGroup.ItemControl class={styles.optionControl}>
                    <RadioGroup.ItemIndicator class={styles.optionIndicator} />
                  </RadioGroup.ItemControl>
                  <RadioGroup.ItemLabel>Player vs Player</RadioGroup.ItemLabel>
                </RadioGroup.Item>
                <RadioGroup.Item value="cpu" disabled class={styles.option}>
                  <RadioGroup.ItemInput />
                  <RadioGroup.ItemControl class={styles.optionControl}>
                    <RadioGroup.ItemIndicator class={styles.optionIndicator} />
                  </RadioGroup.ItemControl>
                  <RadioGroup.ItemLabel>
                    vs Computer
                    <span class={styles.comingSoon}> (coming soon)</span>
                  </RadioGroup.ItemLabel>
                </RadioGroup.Item>
              </div>
            </RadioGroup>

            <RadioGroup
              class={styles.field}
              value={difficulty()}
              disabled
              onChange={(value) => setDifficulty(value as Difficulty)}
            >
              <RadioGroup.Label class={styles.fieldLabel}>
                Difficulty
              </RadioGroup.Label>
              <div class={styles.optionRow}>
                <For each={DIFFICULTIES}>
                  {(item) => (
                    <RadioGroup.Item value={item.value} class={styles.option}>
                      <RadioGroup.ItemInput />
                      <RadioGroup.ItemControl class={styles.optionControl}>
                        <RadioGroup.ItemIndicator
                          class={styles.optionIndicator}
                        />
                      </RadioGroup.ItemControl>
                      <RadioGroup.ItemLabel>{item.label}</RadioGroup.ItemLabel>
                    </RadioGroup.Item>
                  )}
                </For>
              </div>
            </RadioGroup>

            <RadioGroup
              class={styles.field}
              value={playerColor()}
              disabled
              onChange={(value) => setPlayerColor(value as PlayerColorChoice)}
            >
              <RadioGroup.Label class={styles.fieldLabel}>
                Your color
              </RadioGroup.Label>
              <div class={styles.optionRow}>
                <For each={PLAYER_COLORS}>
                  {(item) => (
                    <RadioGroup.Item value={item.value} class={styles.option}>
                      <RadioGroup.ItemInput />
                      <RadioGroup.ItemControl class={styles.optionControl}>
                        <RadioGroup.ItemIndicator
                          class={styles.optionIndicator}
                        />
                      </RadioGroup.ItemControl>
                      <RadioGroup.ItemLabel>{item.label}</RadioGroup.ItemLabel>
                    </RadioGroup.Item>
                  )}
                </For>
              </div>
            </RadioGroup>

            <div class={styles.actions}>
              <Dialog.CloseButton class={styles.cancelButton}>
                Cancel
              </Dialog.CloseButton>
              <button
                type="button"
                class={styles.startButton}
                onClick={handleStart}
              >
                Start
              </button>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
