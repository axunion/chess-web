import { Chess, type Move } from "chess.js";
import type {
  BoardPiece,
  Color,
  GameStatus,
  HistoryEntry,
  PieceSymbol,
  Square,
} from "./types";

export interface Snapshot {
  fen: string;
  turn: Color;
  pieces: BoardPiece[];
  status: GameStatus; // resigned is not included here — store overwrites it
  pgn: string;
}

export interface MoveResult {
  entry: HistoryEntry;
  snapshot: Snapshot;
}

export interface ChessGame {
  reset(): Snapshot;
  loadPgn(pgn: string): Snapshot; // throws on invalid PGN
  legalTargets(from: Square): Square[]; // empty array = not selectable
  isPromotion(from: Square, to: Square): boolean;
  move(from: Square, to: Square, promotion?: PieceSymbol): MoveResult; // throws on illegal
  moveUci(uci: string): MoveResult; // "e2e4" / "e7e8q" format (for engine responses)
  history(): HistoryEntry[];
  capturedBy(color: Color): PieceSymbol[]; // derived from history
}

/** The only module that imports chess.js. Never lets the Chess instance escape this module. */
export function createChessGame(): ChessGame {
  const chess = new Chess();
  let pieces: BoardPiece[] = [];
  let historyEntries: HistoryEntry[] = [];
  let nextSpawnId = 0;

  function spawnId(color: Color, type: PieceSymbol): string {
    return `${color}${type}-${nextSpawnId++}`;
  }

  function rebuildPiecesFromBoard(): void {
    pieces = [];
    nextSpawnId = 0;
    for (const row of chess.board()) {
      for (const cell of row) {
        if (!cell) continue;
        pieces.push({
          square: cell.square,
          type: cell.type,
          color: cell.color,
          id: spawnId(cell.color, cell.type),
        });
      }
    }
  }

  function findPieceIndex(square: Square): number {
    return pieces.findIndex((p) => p.square === square);
  }

  function computeStatus(): GameStatus {
    if (chess.isCheckmate()) {
      // The side to move is the one that got checkmated, so the winner is the other side.
      return { kind: "checkmate", winner: chess.turn() === "w" ? "b" : "w" };
    }
    if (chess.isStalemate()) {
      return { kind: "stalemate" };
    }
    if (chess.isThreefoldRepetition()) {
      return { kind: "draw", reason: "threefold" };
    }
    if (chess.isInsufficientMaterial()) {
      return { kind: "draw", reason: "insufficient" };
    }
    if (chess.isDrawByFiftyMoves()) {
      return { kind: "draw", reason: "fifty-move" };
    }
    return { kind: "playing", check: chess.isCheck() };
  }

  function snapshot(): Snapshot {
    return {
      fen: chess.fen(),
      turn: chess.turn(),
      pieces: pieces.map((p) => ({ ...p })),
      status: computeStatus(),
      pgn: chess.pgn(),
    };
  }

  /** Updates the tracked `pieces` list (with stable ids) to reflect a chess.js move result. */
  function applyMoveToPieces(result: Move): void {
    const { from, to, color, promotion } = result;

    if (result.isEnPassant()) {
      const captureSquare = `${to[0]}${from[1]}` as Square;
      const idx = findPieceIndex(captureSquare);
      if (idx !== -1) pieces.splice(idx, 1);
    } else if (result.isCapture()) {
      const idx = findPieceIndex(to);
      if (idx !== -1) pieces.splice(idx, 1);
    }

    const movingIdx = findPieceIndex(from);
    if (movingIdx === -1) {
      throw new Error(`chessGame: no tracked piece at ${from}`);
    }
    if (result.isPromotion() && promotion) {
      pieces.splice(movingIdx, 1);
      pieces.push({
        square: to,
        type: promotion,
        color,
        id: spawnId(color, promotion),
      });
    } else {
      pieces[movingIdx] = { ...pieces[movingIdx], square: to };
    }

    if (result.isKingsideCastle() || result.isQueensideCastle()) {
      const rank = color === "w" ? "1" : "8";
      const rookFrom =
        `${result.isKingsideCastle() ? "h" : "a"}${rank}` as Square;
      const rookTo =
        `${result.isKingsideCastle() ? "f" : "d"}${rank}` as Square;
      const rookIdx = findPieceIndex(rookFrom);
      if (rookIdx !== -1) {
        pieces[rookIdx] = { ...pieces[rookIdx], square: rookTo };
      }
    }
  }

  function applyMove(input: {
    from: Square;
    to: Square;
    promotion?: PieceSymbol;
  }): MoveResult {
    const result = chess.move(input);
    applyMoveToPieces(result);
    const entry: HistoryEntry = {
      san: result.san,
      from: result.from,
      to: result.to,
      color: result.color,
      captured: result.captured,
    };
    historyEntries.push(entry);
    return { entry, snapshot: snapshot() };
  }

  return {
    reset() {
      chess.reset();
      historyEntries = [];
      rebuildPiecesFromBoard();
      return snapshot();
    },

    loadPgn(pgn: string) {
      chess.loadPgn(pgn);
      historyEntries = chess.history({ verbose: true }).map((m) => ({
        san: m.san,
        from: m.from,
        to: m.to,
        color: m.color,
        captured: m.captured,
      }));
      rebuildPiecesFromBoard();
      return snapshot();
    },

    legalTargets(from: Square) {
      return chess.moves({ square: from, verbose: true }).map((m) => m.to);
    },

    isPromotion(from: Square, to: Square) {
      return chess
        .moves({ square: from, verbose: true })
        .some((m) => m.to === to && m.isPromotion());
    },

    move(from, to, promotion) {
      return applyMove({ from, to, promotion });
    },

    moveUci(uci: string) {
      const from = uci.slice(0, 2) as Square;
      const to = uci.slice(2, 4) as Square;
      const promotion =
        uci.length > 4 ? (uci.slice(4, 5) as PieceSymbol) : undefined;
      return applyMove({ from, to, promotion });
    },

    history() {
      return [...historyEntries];
    },

    capturedBy(color: Color) {
      return historyEntries
        .filter((entry) => entry.color === color && entry.captured)
        .map((entry) => entry.captured as PieceSymbol);
    },
  };
}
