# chess-web conventions

House rules for this repo. Generic engineering defaults — scope discipline, judgment on
ambiguity, preferring the minimal solution — already ship with the harness and aren't
restated here. Bias toward caution over speed; on trivial tasks, use judgment.

## Approach

- **Nothing speculative.** No unasked-for abstractions, unused flexibility, or error
  handling for cases this app can't reach — it's client-only, no server, no multi-user
  state. If 200 lines could be 50, rewrite it.
- **Leave adjacent code alone.** Remove only the imports and symbols your change
  orphaned; don't tidy unrelated dead code — mention it instead.
- **Goal-driven.** Turn each task into a verifiable outcome ("fix the bug" → "write a
  failing test that reproduces it, then make it pass").
- Push back when warranted, even if that means questioning the request itself.

## Language

Write everything in **English** — in-code comments, console output, error and log
messages, AI-readable instruction files, and docs meant for readers (README and the
like). This rule applies to artifacts, not conversation: chat replies and
development-time planning notes follow the language the user is working in.

## Code Structure

- Name variables, functions, and files to communicate intent.
- One concern per file; split new code when a file exceeds ~300 lines. Don't split
  existing files unless asked.
- Extract a helper only when used in 3+ places; otherwise inline it.
- Delete dead code you create; never comment it out.

## Testing

- Write tests before or alongside implementation — they are your success criteria.
- Test observable outcomes and edge cases, not implementation details.
- Each test is fully self-contained; no shared mutable state between tests.
- **Structural correctness** — game state transitions, persistence round-trips, engine
  adapter parsing — belongs in `pnpm test` (vitest) and `pnpm check` (biome + tsc),
  run automatically as part of verification.
- **Real-browser flows** — behavior vitest's happy-dom can't stand in for (a
  localStorage save surviving an actual page reload, a full move played through real
  DOM events) — belongs in `pnpm test:e2e` (Playwright, `e2e/`). First run needs
  `pnpm exec playwright install chromium` once to fetch the browser binary. No CI runs
  it and it isn't wired into lefthook — run it by hand when touching persistence, the
  board's move flow, or the engine integration, or let the `tester` agent run it for
  those areas. It pays a full `pnpm build && pnpm preview` per run, so don't invoke it
  for changes outside them.
- **Visual/subjective judgment** — board layout, piece rendering, dialog polish, "does
  this look right" — no script can reliably judge this, including Playwright. Verify
  by running `pnpm dev` and looking at it, or dispatch `inspector` for viewport-spanning
  layout work (see the visual-verification gate under Subagents).
- Persist a new regression test only for a durable, worth-protecting flow — ideally one
  with evidence it broke before — not for a one-off "let me verify this specific
  change" check.

## Subagents

Four subagents live in `.claude/agents/`: `researcher`, `reviewer`, `tester`,
`inspector` — generic, dispatchable directly or through `/goal`. Local code search is
`Explore`'s job; `researcher` covers only external knowledge (third-party API usage,
version differences, docs-endorsed patterns).

- **Trivial** (one-line fixes, typos, config tweaks): implement directly, no agents.
- **Non-trivial but contained**: implement directly — optionally preceded by `Explore`
  (confirming an established convention) or `researcher` (an unfamiliar
  chess.js/stockfish/@kobalte/core/solid-js API) — then run `reviewer` and `tester` in
  parallel automatically, without asking first; both are read-only/test-only and exist
  to catch the blind spot of reviewing your own work.
- **Large, ambiguous, or high-risk** (spans many files, touches the layer-boundary rule
  below substantially, or is genuinely ambiguous): propose the user drive it with
  `/goal` instead of assuming it's wanted. Write the completion condition to explicitly
  require `reviewer` and `tester` passing — `/goal`'s evaluator has no built-in
  knowledge these agents exist, so a condition that omits them lets the loop end with no
  independent check ever run. Each turn: `Explore` (very thorough breadth; it doesn't
  load `CLAUDE.md` or git status, so restate the layer-boundary rule verbatim in its
  prompt) and `researcher` in parallel, implement here, then `reviewer` and `tester` in
  parallel — "the reviewer raised things I decided weren't important" does not count as
  clean. Pass `run_in_background: false` on every `Agent` call in this sequence, since a
  backgrounded call breaks the turn's sequencing. Never commit, push, or open a PR as
  part of a passing loop — a human looks at the diff first.

Implementation always stays in the main conversation, at every tier — there is no
`implementer` agent, since a write agent enforces no useful tool restriction and each
fix pass would re-spawn it with no memory of the code it just wrote. Every agent above
is read-only or test-only, which is what makes them worth spawning.

Visual verification is a separate axis, keyed to whether a change touches rendered UI
rather than how risky it is. **No rendered surface touched** — skip. **A small,
isolated, single-property tweak** — a glance at `pnpm dev` is enough. **Layout that can
vary by viewport, a change spanning components that share styles, or a reported visual
bug** — dispatch `inspector`, which sweeps viewport widths in a disposable Playwright
browser; give it the full picture (it has no memory of the conversation) and treat a fix
as unverified until a re-run comes back clean.

**Risk area — the layer boundary.** `src/game`, `src/engine`, `src/persistence` hold
this project's core rules (chess move/state logic, the Stockfish UCI adapter,
localStorage persistence) and are easy to get subtly wrong. Permanent rule, enforced
by the `reviewer` agent on every change:
- `src/components/` never imports chess.js, the engine adapter, or `localStorage`
  directly — only through `src/store` actions.
- `src/game/`, `src/engine/`, `src/persistence/` never import `solid-js`, and never
  import from each other — only `src/game/types.ts` may be shared across them.
- `src/game/chessGame.ts` never returns or exports a raw chess.js `Chess` instance —
  only plain serializable snapshots.

## Commits

Format — plain prose, no prefixes or labels (`feat:`, `fix:`, and the like):

```
<summary: imperative mood, ≤70 chars, no trailing period>

<motivation: one sentence, only when not evident from the diff>

- <change bullets: only for 2+ distinct changes>
```

- Never commit secrets (`*.key`, `*.pem`, `credentials*`).
- Never use `--no-verify`. Use `--amend` only when explicitly asked; default to a new
  commit.
