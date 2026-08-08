import { createMemo, createSignal, Match, Show, Switch } from "solid-js";
import { materialAdvantage } from "../game/materialAdvantage";
import type {
  Color,
  GameConfig,
  HistoryEntry,
  PieceSymbol,
} from "../game/types";
import { createGameStore } from "../store/gameStore";
import { Chessboard } from "./Chessboard";
import { EngineStatus } from "./EngineStatus";
import styles from "./GameContainer.module.css";
import { GameMenu } from "./GameMenu";
import { GameOverModal } from "./GameOverModal";
import { formatGameResult } from "./gameResultText";
import { PlayerCard } from "./PlayerCard";
import { TitleScreen } from "./TitleScreen";

type Screen = "title" | "game";

const CAPTURE_VALUE_ORDER: PieceSymbol[] = ["q", "r", "b", "n", "p"];

/** Piece types `color` has captured from the opponent, in value order (Q→R→B→N→P). */
function capturedBy(history: HistoryEntry[], color: Color): PieceSymbol[] {
  return history
    .filter((entry) => entry.color === color && entry.captured)
    .map((entry) => entry.captured as PieceSymbol)
    .sort(
      (a, b) => CAPTURE_VALUE_ORDER.indexOf(a) - CAPTURE_VALUE_ORDER.indexOf(b),
    );
}

/** Player-card label for `color`'s tray — by color in pvp, by role in cpu games. */
function sideLabel(color: Color, config: GameConfig): string {
  if (config.mode === "pvp") return color === "w" ? "White" : "Black";
  if (color === config.playerColor) return "You";
  const difficulty =
    config.difficulty[0].toUpperCase() + config.difficulty.slice(1);
  return `Stockfish · ${difficulty}`;
}

export function GameContainer() {
  const store = createGameStore();
  // Restore a saved game on startup (spec/02-state-persistence.md §6); land
  // straight on the board only when there was something to restore (no save,
  // or a corrupted one that boot() already discarded, starts at the title).
  const restored = store.boot();
  const [screen, setScreen] = createSignal<Screen>(restored ? "game" : "title");

  // The board is flipped (black at the bottom) only for a CPU game where the
  // human plays black (spec/04 §3, spec/05 §7 step 4); PvP is never flipped.
  const autoFlipped = () =>
    store.state.config.mode === "cpu" && store.state.config.playerColor === "b";
  // Manual override from the game menu, XOR'd with the automatic default —
  // a view preference only, not persisted (resets on reload, same as
  // `screen`), and deliberately not reset by newGame()/Rematch so a manual
  // flip stays sticky through a rematch in the same session.
  const [manualFlipOverride, setManualFlipOverride] = createSignal(false);
  const flipped = () => autoFlipped() !== manualFlipOverride();
  const playerColor = () =>
    store.state.config.mode === "cpu" ? store.state.config.playerColor : "w";
  const opponentColor = () => (playerColor() === "w" ? "b" : "w");
  // Memoized because each is read twice below (opponent/self trays share the
  // same computed advantage). capturedBy() below has only one reader each, so
  // a plain accessor is enough — no memo needed.
  const advantage = createMemo(() => materialAdvantage(store.state.pieces));
  const opponentCaptured = () =>
    capturedBy(store.state.history, opponentColor());
  const selfCaptured = () => capturedBy(store.state.history, playerColor());
  const isPlaying = () => store.state.status.kind === "playing";

  function returnToTitle(): void {
    store.abandonGame();
    setScreen("title");
  }

  function toggleFlip(): void {
    setManualFlipOverride((v) => !v);
  }

  function restartGame(): void {
    store.newGame(store.state.config);
  }

  return (
    <Switch>
      <Match when={screen() === "title"}>
        <TitleScreen
          onStart={(config) => {
            store.newGame(config);
            setScreen("game");
          }}
        />
      </Match>
      <Match when={screen() === "game"}>
        <div class={styles.container}>
          <div class={styles.decoration} aria-hidden="true" />
          {/* Announces the final result immediately (ahead of GameOverModal's
              300ms-delayed popup) — distinct from EngineStatus's own
              role="status"/role="alert" spans, which announce mid-game
              engine state, not the final outcome. */}
          <div class={styles.srOnly} role="status" aria-live="polite">
            <Show when={!isPlaying()}>
              {formatGameResult(store.state.status)}
            </Show>
          </div>
          <div class={styles.layout}>
            {/* Opponent's card (their captures) is shown above the board,
                the player's own card below — regardless of who's playing which
                color (spec/04 §3). */}
            <div class={styles.opponentSlot}>
              <PlayerCard
                pieces={opponentCaptured()}
                color={opponentColor()}
                advantage={advantage()[opponentColor()]}
                active={isPlaying() && store.state.turn === opponentColor()}
                label={sideLabel(opponentColor(), store.state.config)}
                headerAccessory={
                  <EngineStatus
                    engine={store.state.engine}
                    onRetry={store.retryEngine}
                  />
                }
              />
            </div>
            <div class={styles.boardSlot}>
              <Chessboard
                state={store.state}
                flipped={flipped()}
                onTapSquare={store.tapSquare}
                onConfirmPromotion={store.confirmPromotion}
                onCancelPromotion={store.cancelPromotion}
              />
            </div>
            <div class={styles.selfSlot}>
              <PlayerCard
                pieces={selfCaptured()}
                color={playerColor()}
                advantage={advantage()[playerColor()]}
                active={isPlaying() && store.state.turn === playerColor()}
                label={sideLabel(playerColor(), store.state.config)}
                headerAccessory={
                  <GameMenu
                    state={store.state}
                    onQuit={returnToTitle}
                    onResign={() =>
                      // CPU games always resign the human's side; PvP resigns whoever's
                      // turn it currently is (spec/05-interaction-flows.md §6).
                      store.resign(
                        store.state.config.mode === "cpu"
                          ? store.state.config.playerColor
                          : store.state.turn,
                      )
                    }
                    onNewGame={restartGame}
                    onFlip={toggleFlip}
                  />
                }
              />
            </div>
          </div>
          <GameOverModal
            status={store.state.status}
            onReturnToTitle={returnToTitle}
            onRematch={restartGame}
          />
        </div>
      </Match>
    </Switch>
  );
}
