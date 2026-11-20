---
name: ui-refine
description: Agrees a short direction brief with the user for a UI goal, then implements and refines it on its own against the rendered UI (checked by the `inspector` agent in Playwright) until the brief's done-conditions hold. Explicit invocation only — use when the user invokes /ui-refine or asks to "improve this screen", "build this UI and refine it", or "fix the visual problems in X".
disable-model-invocation: true
argument-hint: [goal — a screen, a feature, or what to improve]
---

# UI refine

Agree a short direction, then implement and refine against the rendered UI on your own.
You write every change in this conversation; `inspector` only looks. Nothing is kept
between runs.

## 1. Orient

Read the "Product character" section of `CLAUDE.md` and the code in scope. If the
section is missing, infer the character from the README and the existing styles and say
so in the brief. Run `inspector` in explore mode on the screens the goal touches, at
the viewports and themes that matter, to see the current state; skip this when nothing
renders yet. Ask nothing yet.

## 2. Direction — the only conversation phase

Present a brief of at most ten lines:

- **Goal** — what should be better or exist afterwards.
- **Direction** — the approach; 2–3 options with a recommendation when taste decides it.
- **Constraints** — what not to touch, what must stay consistent.
- **Done** — conditions anyone can check on the rendered UI.
- **Round limit** — default 5.

Ask with AskUserQuestion only where the answer changes the work materially. Revise until
the user approves; the approved brief is the contract for the rest of the run.

If the change can't be judged by looking at the screen (data, auth, contracts across
screens), say so and propose explore → plan → implement → commit instead of continuing.

## 3. Iterate — autonomous after approval

Each round:

1. Make the smallest next step toward Done.
2. Run the project's typecheck, lint, and tests.
3. Brief `inspector` in verify mode. It has no memory of this conversation, so give it
   the brief, what changed, and the viewports and states to check.
4. Compare what it reports with Done and Direction, then fix.

Stop when Done holds, the round limit is reached, a round makes no progress, or a
regression keeps coming back. Stop and ask if a decision would change Direction or
Constraints; for anything smaller, take the smaller change and list it in the report.

## 4. Report

Each Done condition, met or not, in one line; what changed; the decisions you took on
your own; what is left. If Playwright or its browser can't launch, say so and stop.
Follow the project's `CLAUDE.md` for commits; don't commit on your own.
