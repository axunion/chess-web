---
name: implement-spec
description: Orchestrate the autonomous initial implementation of chess-web from spec/00-07, milestone by milestone (M1 through M5), by dispatching to the reusable implementer, reviewer, and tester subagents; commits as it goes and resumes correctly if invoked again after an interruption. User-invoked only.
disable-model-invocation: true
---

# Orchestrate chess-web's initial implementation from spec

This skill is a thin, bootstrap-specific wrapper around a reusable pattern: it drives the initial M1–M5 build-out defined in `spec/07-implementation-plan.md`. The three subagents it dispatches to (`implementer`, `reviewer`, `tester`, defined in `.claude/agents/`) are reusable, not specific to this build-out — they're meant to be dispatched for later feature work and bug fixes too. (Don't confuse them with the environment's built-in `general-purpose` agent type — dispatch by the exact names `implementer`, `reviewer`, `tester`, or you lose every rule defined for them.) For anything requested *after* the initial build-out is done, there's no need to invoke this skill or write a new one: just describe the task and dispatch to the same three agents directly (implement → review → test → commit), following the same pattern this skill uses below.

You are the **orchestrator** for the milestone run specifically. You do not write application code yourself — you dispatch to the three subagents and control the loop across milestones. Keeping implementation work in cold subagents is deliberate: it keeps *your* context small across five milestones, which is what lets this run survive a long unattended session.

## 0. Hard rule — read this before dispatching anything

**Every single `Agent` tool call in this skill must pass `run_in_background: false`.**
Background is the tool's default, and a background agent's result only arrives as a notification in a *later* turn — which ends your current turn now and waits for the user to notice a completion, exactly the "invoke once, comes back later" behavior this whole setup exists to avoid. If you omit `run_in_background: false` on even one dispatch, the autonomous loop breaks at that point. Do not batch reviewer and tester as parallel calls either — dispatch them one at a time, in sequence, and act on each result before the next.

## 1. Resume protocol (run this first, every time)

Do not track progress in a separate file. The repo itself is the checkpoint:

1. Run `git log --oneline` and inspect the current file tree under `src/`.
2. Cross-reference against the step lists and **completion conditions** in `spec/07-implementation-plan.md` for M1–M5, in order.
3. The current milestone is the first one whose completion condition is not yet satisfiably true.
4. Resume there. If `src/` doesn't exist yet, start at M1.

This makes the skill safe to re-invoke after a crash, a closed terminal, or a context compaction — it continues instead of restarting or duplicating work.

## 2. Per-milestone loop

For the current milestone and every one after it:

1. **Dispatch `implementer`** (`run_in_background: false`). Tell it: the repo path, "this is milestone M<n> of the initial build-out, per spec/07-implementation-plan.md," and (on a fix round only) the reviewer's or tester's findings quoted verbatim. Do not paraphrase spec content into this prompt — the implementer reads `spec/07` and the relevant chapters itself.
2. **Dispatch `reviewer`** (`run_in_background: false`). Tell it: which milestone this is and which spec chapters are in scope. It inspects the diff itself via `git diff`/`git status`.
   - If it reports findings: return to step 1 with the findings quoted verbatim as a fix round — after the implementer's fix, re-run step 2 (and then step 3) rather than skipping straight to testing, since a fix can reintroduce something the reviewer would have caught. **Cap at 2 fix rounds per milestone** (i.e. at most 2 return trips to the implementer triggered by reviewer or tester findings combined). Exceeding the cap is a stop condition (§3) — don't loop a third time hoping it resolves itself.
3. **Dispatch `tester`** (`run_in_background: false`). Tell it which milestone this is, and that its acceptance criteria come from spec/07's completion condition for that milestone. It runs `pnpm check`/`pnpm test` and checks the milestone's stated completion criteria (excluding anything visual/manual — that's yours, step 4).
   - If it reports ❌ items: return to step 1 (full 1→2→3 re-loop, same as above) with its report quoted verbatim as a fix round, under the **same 2-fix-round cap** as step 2 (reviewer and tester rounds share one budget per milestone, not two separate budgets).
4. **You handle visual/manual/behavioral verification directly** — not delegated, since no subagent here is confirmed able to invoke the `claude-in-chrome` skill. This is not only screenshots; check `claude-in-chrome` availability once at the start of the run rather than re-discovering it each milestone, then per milestone:
   - **M1**: screenshot the initial position at 375px and a desktop width via `pnpm dev`.
   - **M2**: actually tap through the 3 special-move sequences the completion condition names — Fool's mate, castling, en passant, promotion — not just a static screenshot.
   - **M3**: reload mid-game and confirm restore; corrupt the saved LocalStorage entry via DevTools and confirm fallback to NewGameDialog.
   - **M4**: reload while the engine is thinking and confirm it resumes/moves after restore; temporarily rename the `public/stockfish/*` files to force a 404 and confirm the error banner + Retry, then **rename them back before committing** — don't leave the repo in a broken state.
   - **M5**: full pass over `spec/06-quality-testing.md` §4's remaining visual items.
   - When running `pnpm dev` for any of the above, pass `run_in_background: true` (or otherwise don't block the foreground on it) and stop the server when done — a foreground dev server never returns.
   - If `claude-in-chrome` isn't usable in this environment, don't claim any of the above passes — mark each as ⚠️ for human follow-up (§6) and move on; an unverifiable manual item is not a stop condition by itself.
5. **You commit** (format in §4). At least one commit per milestone, per spec 07 §0. Commit authority stays with you — subagents never commit. If an implementer or reviewer report during this milestone flagged a spec-vs-reality deviation (per spec 07's own rule), fold the spec correction into this commit or a preceding one — don't just note it and move on.
6. **Continue immediately to the next milestone.** Don't ask the user whether to proceed, unless a stop condition applies.

## 3. Stop conditions (the only reasons to pause and report back instead of continuing)

- The fix-round cap (2) in §2 is exceeded for a milestone — report the last findings and what was tried.
- A spec instruction conflicts with the real chess.js/stockfish/SolidJS API in a way that isn't a simple "prefer the real API" fix (per spec 07's own rule: prefer the library's actual API, commit a spec correction, and keep going — only stop if the *product behavior*, not just the API shape, is ambiguous). An implementer's report flagging this is informational, not automatically a stop — judge whether it needs a human call.
- The PreToolUse dependency guard (`.claude/settings.json`) asks for confirmation on a `pnpm add`/`package.json` change, surfaced to you either directly or via a subagent's report — this means an action outside the chess.js/stockfish allowance was attempted; stop and let the user decide.
- Any action would affect something outside this repository (network calls beyond package installs, git push, deleting branches, etc.).

If three or more milestones in a row hit the same kind of stop, stop and summarize rather than repeating the same blocked attempt.

## 4. Commit format

Follow CLAUDE.md exactly: plain prose, imperative mood, ≤70 char summary, no prefixes/labels. Never use `--no-verify` — if lefthook's pre-push `pnpm check`/`pnpm test` fails, fix the underlying issue (dispatch back to the implementer) rather than bypassing the hook.

## 5. Known spec-vs-reality deviations to pass along to the implementer

(Relevant only until M1 is committed — safe to delete this section from the skill file afterward.)

- `spec/03-engine.md` §1 says to copy the lite/single build from `node_modules/stockfish/src/`. As of stockfish@18.0.8 the actual path is `node_modules/stockfish/bin/`, and the shipped filename is versioned (e.g. `stockfish-18-lite-single.js`/`.wasm`), not `stockfish-17.1-lite-single-<hash>.js` as the spec's example shows. The rename step in spec 03 §1 step 2 (to `stockfish-lite-single.js`/`.wasm` in `public/stockfish/`) already absorbs this, so no other code needs to change — but mention this in the M1 dispatch prompt so the implementer doesn't stall searching for a `src/` directory that isn't there in this version.

## 6. Final report (when all of M1–M5 are done, or when stopping early)

State clearly:
- Which milestones are complete, with their commits.
- `pnpm check`/`pnpm test` status.
- Every acceptance-checklist item from `spec/06-quality-testing.md` §4, marked ✅ (verified — by you or a subagent), ⚠️ (needs human verification — visual/manual item that couldn't be checked), or ❌ (not done, with why).
- Any fix-round caps that were hit, and what the last reviewer/tester findings were.
- If stopped early: exactly which stop condition triggered it and what the user needs to decide.

Never report the 06 §4 checklist as fully passed unless every item is genuinely ✅ — partial completion with an honest ⚠️ list is the expected normal outcome of an unattended run touching the visual items.
