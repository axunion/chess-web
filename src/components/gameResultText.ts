import type { GameStatus } from "../game/types";

const DRAW_REASON_TEXT: Record<
  Extract<GameStatus, { kind: "draw" }>["reason"],
  string
> = {
  threefold: "Threefold repetition",
  insufficient: "Insufficient material",
  "fifty-move": "Fifty-move rule",
  agreement: "Agreement",
};

/**
 * Formats the end-of-game result banner shown by both GameContainer's
 * sr-only live region and GameOverModal (wording table:
 * spec/04-components-styling.md §7). Callers should only invoke this once
 * `status.kind !== "playing"`.
 */
export function formatGameResult(status: GameStatus): string {
  switch (status.kind) {
    case "checkmate":
      return `Checkmate — ${status.winner === "w" ? "White" : "Black"} wins`;
    case "stalemate":
      return "Draw — Stalemate";
    case "draw":
      return `Draw — ${DRAW_REASON_TEXT[status.reason]}`;
    case "resigned": {
      const resigned = status.winner === "w" ? "Black" : "White";
      const winner = status.winner === "w" ? "White" : "Black";
      return `${resigned} resigns — ${winner} wins`;
    }
    case "playing":
      return "";
  }
}
