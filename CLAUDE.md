# chess-web

Client-only chess app (no server, no multi-user state): SolidJS, chess.js, Stockfish (UCI),
@kobalte/core.

## Layer boundary

`src/game`, `src/engine`, `src/persistence` hold the core rules (chess move/state logic,
the Stockfish UCI adapter, localStorage persistence) and are easy to get subtly wrong.
Permanent rule; `reviewer` checks the diff against it:

- `src/components/` never imports chess.js, the engine adapter, or `localStorage`
  directly — only through `src/store` actions.
- `src/game/`, `src/engine/`, `src/persistence/` never import `solid-js`, and never
  import from each other — only `src/game/types.ts` may be shared across them.
- `src/game/chessGame.ts` never returns or exports a raw chess.js `Chess` instance —
  only plain serializable snapshots.

## Verification

- **Structural correctness** (game state transitions, persistence round-trips, engine
  adapter parsing): `pnpm test` (vitest) and `pnpm check` (biome + tsc).
- **Real-browser flows** vitest's happy-dom can't cover (a save surviving a page reload,
  a move played through real DOM events): `pnpm test:e2e` (Playwright, `e2e/`). First run
  needs `pnpm exec playwright install chromium`. No CI and no lefthook hook runs it, and
  each run pays a full `pnpm build && pnpm preview`, so run it by hand (or via `tester`)
  only when touching persistence, the board's move flow, or the engine integration.
- **Visual judgment** (board layout, piece rendering, dialog polish): no script judges
  this reliably. Look at `pnpm dev`, or dispatch `inspector` (see below).
- Persist a new e2e/regression test only for a durable flow worth protecting, ideally one
  with evidence it broke before — not for a one-off check.

## Subagents

`.claude/agents/` has `researcher`, `reviewer`, `tester`, `inspector`. All are read-only or
test-only. Local code search is the built-in `Explore`'s job; `researcher` covers only
external knowledge (third-party API usage, version differences, docs-endorsed patterns).

- **Trivial** (one-line fixes, typos, config tweaks): implement directly, no agents.
- **Non-trivial but contained**: implement directly. Optionally run `Explore` first to
  confirm an established convention, or `researcher` for an unfamiliar
  chess.js/stockfish/@kobalte/core/solid-js API. Afterward run `reviewer` and `tester` in
  parallel, without asking first — both are read-only/test-only, and they exist to catch
  the blind spot of reviewing your own work.
- **Large, ambiguous, or high-risk** (many files, substantially touches
  `src/game`/`src/engine`/`src/persistence`, or genuinely ambiguous): propose that the
  user drive it with `/goal` rather than assuming it's wanted. Write the completion
  condition to explicitly require `reviewer` and `tester` passing — `/goal`'s evaluator
  has no built-in knowledge that they exist. Each turn: `Explore` and `researcher` in
  parallel, implement, then `reviewer` and `tester` in parallel, until the condition
  holds.

The main conversation writes the code at every tier; there is no `implementer` agent. A
write agent enforces no useful tool restriction, hands back a working tree rather than a
summary, and would be re-spawned with no memory of the code it just wrote on each fix
pass. Never commit, push, or open a PR as part of a `/goal` loop.

**Visual verification** is a separate axis from the tiers, keyed to whether a change
touches rendered UI rather than how risky it is. No rendered surface touched: skip. A
small, isolated, single-property tweak: a glance at `pnpm dev` is enough. Layout that can
vary by viewport, a change spanning components that share styles, or a reported visual
bug: dispatch `inspector` with the full picture (it has no memory of the conversation),
and treat a fix as unverified until a re-run comes back clean. It needs no confirmation
but isn't automatic — it costs a dev server and a browser, so judge each time. Agreeing a
direction for a UI goal, then implementing and refining it against the rendered screen
with no plan written up front, is a different job: the `ui-refine` skill (`/ui-refine`).

## Product character

A casual chess game played by one person, or two sharing a device, with nothing to
sign in to. Calm and unhurried: "Walnut and maple. One move at a time."

- Direction is a dark salon: walnut and maple board, brass accent (`--accent`),
  espresso surfaces; tokens live in `src/theme/tokens.css`.
- Serif display type (Iowan Old Style / Palatino) for headings, system sans for the UI.
  Hairlines and layered shadows instead of heavy borders; motion stays around 120–160ms.
- Avoids Unicode chess glyphs (pieces are the Cburnett SVGs only), saturated UI colors,
  and online or social features (chat, clocks).
- Wide screens show the move-history sidebar; narrow ones use the dialog.
