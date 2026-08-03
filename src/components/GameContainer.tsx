import { createMemo, createSignal, Match, Switch } from "solid-js";
import { materialAdvantage } from "../game/materialAdvantage";
import type { Color, HistoryEntry, PieceSymbol } from "../game/types";
import { createGameStore } from "../store/gameStore";
import { CapturedPieces } from "./CapturedPieces";
import { Chessboard } from "./Chessboard";
import styles from "./GameContainer.module.css";
import { GameOverModal } from "./GameOverModal";
import { GameStatusBar } from "./GameStatusBar";
import { MoveHistory } from "./MoveHistory";
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

export function GameContainer() {
  const store = createGameStore();
  // Restore a saved game on startup (spec/02-state-persistence.md §6); land
  // straight on the board only when there was something to restore (no save,
  // or a corrupted one that boot() already discarded, starts at the title).
  const restored = store.boot();
  const [screen, setScreen] = createSignal<Screen>(restored ? "game" : "title");

  // The board is flipped (black at the bottom) only for a CPU game where the
  // human plays black (spec/04 §3, spec/05 §7 step 4); PvP is never flipped.
  const flipped = () =>
    store.state.config.mode === "cpu" && store.state.config.playerColor === "b";
  const playerColor = () =>
    store.state.config.mode === "cpu" ? store.state.config.playerColor : "w";
  const opponentColor = () => (playerColor() === "w" ? "b" : "w");
  const advantage = createMemo(() => materialAdvantage(store.state.pieces));
  const opponentCaptured = createMemo(() =>
    capturedBy(store.state.history, opponentColor()),
  );
  const selfCaptured = createMemo(() =>
    capturedBy(store.state.history, playerColor()),
  );

  function returnToTitle(): void {
    store.abandonGame();
    setScreen("title");
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
          <div class={styles.layout}>
            <div class={styles.statusSlot}>
              <GameStatusBar
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
                onRetryEngine={store.retryEngine}
              />
            </div>
            {/* Opponent's tray (their captures) is shown above the board,
                the player's own tray below — regardless of who's playing which
                color (spec/04 §3). */}
            <div class={styles.opponentSlot}>
              <CapturedPieces
                pieces={opponentCaptured()}
                color={opponentColor()}
                advantage={advantage()[opponentColor()]}
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
              <CapturedPieces
                pieces={selfCaptured()}
                color={playerColor()}
                advantage={advantage()[playerColor()]}
              />
            </div>
            <div class={styles.historySlot}>
              <MoveHistory history={store.state.history} />
            </div>
          </div>
          <GameOverModal
            status={store.state.status}
            onReturnToTitle={returnToTitle}
          />
        </div>
      </Match>
    </Switch>
  );
}
