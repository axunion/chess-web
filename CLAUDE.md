# Global Claude Rules

Behavioral defaults plus house conventions. Bias toward caution over speed; on trivial
tasks, use judgment.

## Approach

- **Think before coding.** State assumptions. Make routine judgment calls yourself and
  note them; ask only when different interpretations would lead to materially different
  work. If a simpler path exists, say so and push back when warranted.
- **Simplest thing that works.** Write the minimum code that solves the stated problem —
  nothing speculative. No unasked-for abstractions, flexibility, or error handling for
  impossible cases. If 200 lines could be 50, rewrite it.
- **Surgical changes.** Every changed line should trace to the request. Don't refactor,
  reformat, or "improve" adjacent code that isn't broken; match the surrounding style.
  Remove only the imports and symbols your change orphaned; leave unrelated dead code alone
  and mention it.
- **Goal-driven.** Turn each task into a verifiable outcome ("fix the bug" → "write a
  failing test that reproduces it, then make it pass"). For multi-step work, state a brief
  plan before starting.

## Language

Write everything in **English** — in-code comments, console output, error and log
messages, AI-readable instruction files, and docs meant for readers (README and the
like). This rule applies to artifacts, not conversation: chat replies and
development-time planning notes follow the language the user is working in.

**Exception:** `spec/*.md` is written in Japanese by design (user-confirmed) and stays
that way, including any spec-correction edits made during implementation. Code examples,
identifiers, and diagram labels inside those docs remain in English as usual.

## Code Structure

- Name variables, functions, and files to communicate intent.
- One concern per file; split new code when a file exceeds ~300 lines. Don't split
  existing files unless asked.
- Extract a helper only when used in 3+ places; otherwise inline it.
- Delete dead code you create; never comment it out.

## Testing

- Write tests before or alongside implementation — they are your success criteria.
- If the project has no test setup, ask briefly: introduce one, or verify another way?
- Test observable outcomes and edge cases, not implementation details.
- Each test is fully self-contained; no shared mutable state between tests.
- **Structural correctness** — game state transitions, persistence round-trips, engine
  adapter parsing — belongs in `pnpm test` (vitest) and `pnpm check` (biome + tsc),
  run automatically as part of verification.
- **Real-browser flows** — behavior vitest's happy-dom can't stand in for (a
  localStorage save surviving an actual page reload, a full move played through real
  DOM events) — belongs in `pnpm test:e2e` (Playwright, `e2e/`). First run needs
  `pnpm exec playwright install chromium` once to fetch the browser binary. Not run
  automatically (no CI, not wired into lefthook); run it by hand when touching
  persistence, the board's move flow, or the engine integration.
- **Visual/subjective judgment** — board layout, piece rendering, dialog polish, "does
  this look right" — no script can reliably judge this, including Playwright. Verify
  by running `pnpm dev` and looking at it.
- Persist a new regression test only for a durable, worth-protecting flow — ideally one
  with evidence it broke before — not for a one-off "let me verify this specific
  change" check.

## Subagents

Four specialized subagents live in `.claude/agents/`: `researcher`, `implementer`,
`reviewer`, `tester`. They're generic — reusable across tasks, not tied to any one
feature — and can be dispatched directly, or chained via the `/feature-loop` skill
(`.claude/skills/feature-loop/`).

- **Trivial** (one-line fixes, typos, config tweaks): implement directly, no agents.
- **Non-trivial but contained** (a self-contained change in one area): implement
  directly — optionally preceded by a standalone `researcher` pass if the change leans
  on an unfamiliar chess.js/stockfish/@kobalte/core API or an established convention
  worth confirming first — then run `reviewer` and `tester` in parallel automatically,
  without asking first. Both are read-only/test-only, so the cost of running them is
  low and they exist specifically to catch the blind spot of reviewing your own work.
- **Large, ambiguous, or high-risk** (spans many files, touches the layer-boundary risk
  area below substantially, or the task itself is genuinely ambiguous): prefer
  `/feature-loop`, which chains research → implement → review + test and iterates on
  findings. Always confirm with the user before invoking it — it spawns four agents
  with real time/token cost.

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
