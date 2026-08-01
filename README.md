# chess-web

A single-page chess game for the browser. Play locally against another
person on the same device, or against Stockfish at one of four difficulty
levels. No server or account required — everything runs client-side, and an
in-progress game survives a reload.

## Features

- Local pass-and-play (two people, one device)
- CPU opponent (Stockfish, 4 difficulty levels, play as White, Black, or a
  random color)
- Full standard rules via [chess.js](https://github.com/jhlywa/chess.js):
  castling, en passant, promotion, check, checkmate, stalemate, threefold
  repetition, the fifty-move rule, and insufficient material
- Game state (position, move history, and settings) is saved to
  `localStorage` after every move and fully restored on reload, including
  mid-think CPU games
- Move history, captured-piece trays, and resign with a confirmation step

## Getting started

Requires Node.js 24 and pnpm.

```bash
pnpm install
pnpm dev
```

Then open the printed local URL. Other scripts:

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` | Type-check and build for production (into `dist/`) |
| `pnpm preview` | Serve the production build locally |
| `pnpm test` | Run the test suite |
| `pnpm check` | Lint, format check, and type-check |
| `pnpm fix` | Fix lint and format issues automatically |

## Tech stack

SolidJS, TypeScript, CSS Modules, and [@kobalte/core](https://kobalte.dev)
for accessible dialog/radio-group primitives, on top of Vite. Chess rules
and move generation are delegated entirely to chess.js; the CPU opponent is
the `stockfish` npm package's single-threaded lite WASM build, run in a Web
Worker so the UI never blocks while it's thinking.

## Piece art

The board uses custom hand-drawn Staunton-style piece silhouettes
(`src/components/pieces/pieceSvg.tsx`), not the Cburnett SVG set — the
original plan was to use Cburnett (Wikimedia Commons, CC BY-SA 3.0), but the
implementation environment had no network access to fetch that path data,
so simple geometric silhouettes were drawn from scratch instead. No Unicode
chess glyphs are used anywhere in the UI.

## Scope

Out of scope by design: online play, spectating, chat, move clocks, and
PGN import/export in the UI (PGN is used internally for persistence only).
Undo is intentionally not implemented.
