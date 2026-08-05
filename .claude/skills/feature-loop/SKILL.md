---
name: feature-loop
description: Runs a task through the research → implement → review + test loop using the researcher, implementer, reviewer, and tester agents, iterating until both review and tests pass or a retry cap is hit. Invoke explicitly via "/feature-loop <task>", or autonomously (after confirming with the user) for non-trivial work — a change that spans many files, touches the src/game, src/engine, or src/persistence layer boundary substantially, or is genuinely ambiguous. Not for one-line fixes, typos, or config tweaks.
argument-hint: <task description>
disable-model-invocation: true
---

# Feature loop

Drive `$ARGUMENTS` through four specialized agents defined in `.claude/agents/` — `researcher`, `implementer`, `reviewer`, `tester` — instead of implementing directly. This trades speed for a built-in second (and third) opinion — use it for changes worth that overhead, not for one-line fixes. Those agents are generic and can also be dispatched directly, without this skill, for something small enough not to need the full loop (don't confuse them with the environment's built-in `general-purpose` agent type — dispatch by these exact names or you lose every rule defined for them).

You are the **orchestrator**. You do not write application code yourself — you dispatch to the four subagents, act on their reports, and commit. Keeping implementation work in cold subagents is deliberate: it keeps *your* context small, which matters for a task that needs several fix rounds.

## 0. Hard rule — read this before dispatching anything

**Every single `Agent` tool call in this skill must pass `run_in_background: false`.** Background is the tool's default, and a background agent's result only arrives as a notification in a *later* turn — which ends your current turn now and waits for the user to notice a completion, exactly the "invoke once, comes back later" behavior this whole setup exists to avoid. If you omit `run_in_background: false` on even one dispatch, the loop breaks at that point.

## 1. Steps

0. **Confirm before spawning.** If this run was triggered autonomously (not via an explicit `/feature-loop` invocation), tell the user the task looks like this skill's scope and ask before starting — spawning four agents has real time/cost, and that decision belongs to the user.

1. **Research.** Dispatch `researcher` (`run_in_background: false`) with the task description — either describe the feature/bug fix directly, or point it at a spec doc under `spec/` for a larger planned change (don't paraphrase spec content into the prompt; the researcher reads the doc itself). If its brief reports a genuine ambiguity, stop here and ask the user to resolve it.

2. **Implement.** Dispatch `implementer` (`run_in_background: false`) with the task description plus the research brief. On a fix round (see step 4), also include the reviewer's or tester's findings quoted verbatim as required fixes, not suggestions.

3. **Review + test in parallel.** Dispatch `reviewer` and `tester` in the same message (`run_in_background: false` on both, no dependency between them). Give each the task description and, if applicable, which spec doc is in scope — each inspects the diff itself.

4. **Judge.**
   - If review found no findings **and** test reports everything passing: done — go to step 5.
   - Otherwise: return to step 2 with the reviewer/tester findings quoted verbatim as a fix round, then repeat step 3. A fix can reintroduce something the other agent would have caught, so always re-run both, not just the one that failed.
   - Cap at **3 total passes through steps 3–4**. If it still isn't clean after that, stop and report the unresolved findings to the user instead of continuing.

5. **You handle visual/manual/behavioral verification directly** — not delegated, since no subagent here is confirmed able to invoke the `claude-in-chrome` skill. Check what the task (or its spec doc, e.g. a `検証方法` section) calls for — a screenshot, a specific interaction sequence, a reload/error-path check — and run it yourself via `pnpm dev` (pass `run_in_background: true`, or otherwise don't block the foreground on it, and stop the server when done). If `claude-in-chrome` isn't usable in this environment, don't claim any of these pass — mark each ⚠️ for human follow-up and move on; an unverifiable manual item is not a stop condition by itself.

6. **You commit** (format below). Commit authority stays with you — subagents never commit. If an implementer or reviewer report flagged a spec-vs-reality deviation, fold the spec correction into this commit or a preceding one — don't just note it and move on.

7. **Report back** (format below).

## 2. Stop conditions (the only reasons to pause and report back instead of continuing)

- The fix-round cap (3 passes through steps 3–4) is exceeded — report the last findings and what was tried.
- A spec instruction conflicts with the real chess.js/stockfish/SolidJS/@kobalte/core API in a way that isn't a simple "prefer the real API" fix — prefer the library's actual API, commit a spec correction, and keep going; only stop if the *product behavior*, not just the API shape, is ambiguous.
- The PreToolUse dependency guard (`.claude/settings.json`) asks for confirmation on a `pnpm add`/`package.json` change outside chess.js/stockfish, surfaced to you either directly or via a subagent's report — stop and let the user decide.
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
