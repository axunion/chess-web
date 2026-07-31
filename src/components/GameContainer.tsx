import { createGameStore } from "../store/gameStore";
import { Chessboard } from "./Chessboard";
import styles from "./GameContainer.module.css";

export function GameContainer() {
  const store = createGameStore();

  return (
    <div class={styles.container}>
      <Chessboard state={store.state} />
    </div>
  );
}
