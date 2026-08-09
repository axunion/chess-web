import { RadioGroup } from "@kobalte/core/radio-group";
import { Slider } from "@kobalte/core/slider";
import { createSignal, For } from "solid-js";
import type { Color, GameConfig, GameMode } from "../game/types";
import { DIFFICULTIES } from "../game/types";
import { capitalize } from "./capitalize";
import styles from "./GameSetupForm.module.css";
import { PieceSvg } from "./pieces/pieceSvg";
import srOnly from "./srOnly.module.css";

interface GameSetupFormProps {
  onStart: (config: GameConfig) => void;
}

type PlayerColorChoice = Color | "random";

const PLAYER_COLORS: { value: PlayerColorChoice; label: string }[] = [
  { value: "w", label: "White" },
  { value: "b", label: "Black" },
  { value: "random", label: "Random" },
];

/** Mode/difficulty/color picker used by TitleScreen. */
export function GameSetupForm(props: GameSetupFormProps) {
  const [mode, setMode] = createSignal<GameMode>("cpu");
  const [difficultyIndex, setDifficultyIndex] = createSignal(
    DIFFICULTIES.indexOf("normal"),
  );
  const [playerColor, setPlayerColor] = createSignal<PlayerColorChoice>("w");
  const isCpu = () => mode() === "cpu";
  const difficulty = () => DIFFICULTIES[difficultyIndex()];
  // Kobalte's own aria-valuetext (Slider.Thumb/Slider.Input) formats the raw
  // index through Intl.NumberFormat and ignores `getValueLabel` unless
  // `Slider.ValueLabel` is rendered (it isn't — the readout above the track
  // already covers that job visually) — so the tier name is passed straight
  // to `aria-valuetext` on both parts instead, which does take a
  // caller-supplied value.
  const difficultyName = () => capitalize(difficulty());

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
        <RadioGroup.Label class={srOnly.srOnly}>Mode</RadioGroup.Label>
        <div class={styles.segmented}>
          <RadioGroup.Item value="cpu" class={styles.segmentedItem}>
            <RadioGroup.ItemInput />
            <RadioGroup.ItemLabel class={styles.segmentedLabel}>
              vs AI
            </RadioGroup.ItemLabel>
          </RadioGroup.Item>
          <RadioGroup.Item value="pvp" class={styles.segmentedItem}>
            <RadioGroup.ItemInput />
            <RadioGroup.ItemLabel class={styles.segmentedLabel}>
              vs Player
            </RadioGroup.ItemLabel>
          </RadioGroup.Item>
        </div>
      </RadioGroup>

      {/* Always rendered at full size — Start's position never moves.
          Grayed out and disabled rather than hidden/collapsed when not
          playing cpu, so switching Player/Computer never resizes the card. */}
      <Slider
        class={styles.field}
        value={[difficultyIndex()]}
        onChange={(values) => setDifficultyIndex(values[0])}
        minValue={0}
        maxValue={DIFFICULTIES.length - 1}
        step={1}
        disabled={!isCpu()}
      >
        <Slider.Label class={srOnly.srOnly}>Difficulty</Slider.Label>
        <div class={styles.difficultyReadout}>
          <span class={styles.difficultyName} data-testid="difficulty-name">
            {difficultyName()}
          </span>
        </div>
        <Slider.Track class={styles.sliderTrack}>
          <Slider.Fill class={styles.sliderFill} />
          <Slider.Thumb
            class={styles.sliderThumb}
            aria-valuetext={difficultyName()}
          >
            <Slider.Input aria-valuetext={difficultyName()} />
          </Slider.Thumb>
        </Slider.Track>
        <div class={styles.sliderEndLabels}>
          <span>Beginner</span>
          <span>Elite</span>
        </div>
      </Slider>

      <RadioGroup
        class={styles.field}
        value={playerColor()}
        disabled={!isCpu()}
        onChange={(value) => setPlayerColor(value as PlayerColorChoice)}
      >
        <RadioGroup.Label class={srOnly.srOnly}>Color</RadioGroup.Label>
        <div class={styles.colorPicker}>
          <For each={PLAYER_COLORS}>
            {(item) => (
              <RadioGroup.Item value={item.value} class={styles.colorOption}>
                <RadioGroup.ItemInput />
                <RadioGroup.ItemLabel class={styles.colorOptionLabel}>
                  <span class={styles.colorSwatch}>
                    {item.value === "random" ? (
                      <>
                        <span class={`${styles.halfKing} ${styles.halfLeft}`}>
                          <PieceSvg type="k" color="w" />
                        </span>
                        <span class={`${styles.halfKing} ${styles.halfRight}`}>
                          <PieceSvg type="k" color="b" />
                        </span>
                      </>
                    ) : (
                      <PieceSvg type="k" color={item.value} />
                    )}
                  </span>
                  <span class={styles.colorCaption}>{item.label}</span>
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
