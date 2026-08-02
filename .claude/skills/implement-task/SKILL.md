---
name: implement-task
description: Orchestrate an implementation task for chess-web end-to-end — a feature, bug fix, or a spec/*.md planning doc (e.g. spec/lichess-pieces-migration.md) — by dispatching to the reusable implementer, reviewer, and tester subagents, then committing. User-invoked only.
disable-model-invocation: true
---

# Orchestrate a chess-web implementation task

This skill drives one task end-to-end by dispatching to the `implementer`, `reviewer`, and `tester` subagents defined in `.claude/agents/`. Those subagents are generic — not specific to any one task — and can also be dispatched directly without this skill for something small enough not to need a scripted loop. (Don't confuse them with the environment's built-in `general-purpose` agent type — dispatch by the exact names `implementer`, `reviewer`, `tester`, or you lose every rule defined for them.)

You are the **orchestrator**. You do not write application code yourself — you dispatch to the three subagents, act on their reports, and commit. Keeping implementation work in cold subagents is deliberate: it keeps *your* context small, which matters for a task that needs several fix rounds.

## 0. Hard rule — read this before dispatching anything

**Every single `Agent` tool call in this skill must pass `run_in_background: false`.**
Background is the tool's default, and a background agent's result only arrives as a notification in a *later* turn — which ends your current turn now and waits for the user to notice a completion, exactly the "invoke once, comes back later" behavior this whole setup exists to avoid. If you omit `run_in_background: false` on even one dispatch, the loop breaks at that point. Do not batch reviewer and tester as parallel calls either — dispatch them one at a time, in sequence, and act on each result before the next.

## 1. Task loop

1. **Dispatch `implementer`** (`run_in_background: false`). Tell it: the repo path, the task itself — either describe the feature/bug fix directly, or point it at a spec doc under `spec/` for a larger planned change — and (on a fix round only) the reviewer's or tester's findings quoted verbatim. Don't paraphrase spec content into this prompt — the implementer reads the doc itself.
2. **Dispatch `reviewer`** (`run_in_background: false`). Tell it the task description and, if applicable, which spec doc is in scope. It inspects the diff itself via `git diff`/`git status`.
   - If it reports findings: return to step 1 with the findings quoted verbatim as a fix round — after the implementer's fix, re-run step 2 (and then step 3) rather than skipping straight to testing, since a fix can reintroduce something the reviewer would have caught. **Cap at 2 fix rounds total** (i.e. at most 2 return trips to the implementer triggered by reviewer or tester findings combined). Exceeding the cap is a stop condition (§2) — don't loop a third time hoping it resolves itself.
3. **Dispatch `tester`** (`run_in_background: false`). Tell it the task's acceptance criteria — from the task description, or from the spec doc's own criteria/verification section if one is in scope. It runs `pnpm check`/`pnpm test` and checks those criteria (excluding anything visual/manual — that's yours, step 4).
   - If it reports ❌ items: return to step 1 (full 1→2→3 re-loop, same as above) with its report quoted verbatim as a fix round, under the **same 2-fix-round cap** as step 2.
4. **You handle visual/manual/behavioral verification directly** — not delegated, since no subagent here is confirmed able to invoke the `claude-in-chrome` skill. Check what the task (or its spec doc, e.g. a `検証方法` section) calls for — a screenshot, a specific interaction sequence, a reload/error-path check — and run it yourself via `pnpm dev` (pass `run_in_background: true`, or otherwise don't block the foreground on it, and stop the server when done). If `claude-in-chrome` isn't usable in this environment, don't claim any of these pass — mark each ⚠️ for human follow-up and move on; an unverifiable manual item is not a stop condition by itself.
5. **You commit** (format in §3). Commit authority stays with you — subagents never commit. If an implementer or reviewer report flagged a spec-vs-reality deviation, fold the spec correction into this commit or a preceding one — don't just note it and move on.
6. **Report back** (§4).

## 2. Stop conditions (the only reasons to pause and report back instead of continuing)

- The fix-round cap (2) in §1 is exceeded — report the last findings and what was tried.
- A spec instruction conflicts with the real chess.js/stockfish/SolidJS/@kobalte/core API in a way that isn't a simple "prefer the real API" fix — prefer the library's actual API, commit a spec correction, and keep going; only stop if the *product behavior*, not just the API shape, is ambiguous.
- The PreToolUse dependency guard (`.claude/settings.json`), if configured, asks for confirmation on a `pnpm add`/`package.json` change, surfaced to you either directly or via a subagent's report — stop and let the user decide.
- Any action would affect something outside this repository (network calls beyond package installs, git push, deleting branches, etc.).

## 3. Commit format

Follow CLAUDE.md exactly: plain prose, imperative mood, ≤70 char summary, no prefixes/labels. Never use `--no-verify` — if lefthook's pre-push `pnpm check`/`pnpm test` fails, fix the underlying issue (dispatch back to the implementer) rather than bypassing the hook.

## 4. Final report

State clearly:
- What changed, with the commit(s).
- `pnpm check`/`pnpm test` status.
- Every acceptance criterion from the task (or its spec doc), marked ✅ (verified — by you or a subagent), ⚠️ (needs human verification — visual/manual item that couldn't be checked), or ❌ (not done, with why).
- Any fix-round cap hit, and what the last reviewer/tester findings were.
- If stopped early: exactly which stop condition triggered it and what the user needs to decide.

Never report a checklist as fully passed unless every item is genuinely ✅ — partial completion with an honest ⚠️ list is a normal outcome for a task with visual/manual items.
