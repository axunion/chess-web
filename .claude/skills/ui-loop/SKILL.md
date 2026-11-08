---
name: ui-loop
description: Runs a batch of explore → fix → re-inspect rounds over this project's rendered UI to find and fix bugs, spec gaps, and improvements, using the `inspector` agent in explore mode. Keeps its plan and findings ledger under `.claude/ui-loop/`. Explicit invocation only — use when the user asks to "run the UI loop", "inspect the UI and fix what you find", or invokes /ui-loop.
disable-model-invocation: true
argument-hint: [scope — screen or feature; plan is pre-approved]
---

# UI loop

Two files carry the loop's state, so any session can resume it:

- `.claude/ui-loop/plan.md` — what to explore, what counts as correct, what may be fixed
  without asking, and the round budget.
- `.claude/ui-loop/findings.md` — the ledger: one row per finding, with its status.

You write every fix in this conversation. `inspector` only looks, `reviewer` and
`tester` only check; none of them sees this conversation, so brief each one in full.

## Step 0: Plan

If `plan.md` is missing, write it now — from a static read only, no browser: routes,
README and docs, existing tests, component layout. Use the structure in this skill's
"Plan format" below. Mark every guess `assumed:`.

Then stop and show the plan, unless the invocation arguments already say it is approved.
In a session where nobody can answer, the plan is the run's whole report. If `plan.md`
exists, read it, and refresh only the parts the code has outgrown (a new screen, a
removed route).

## Step 1: Rounds

The scope is the invocation's argument if given, otherwise the plan's screens. Repeat up
to the plan's round budget:

1. **Explore.** Run `inspector` in explore mode. Brief it with: the scope, the plan's
   source of truth, viewports/themes/states, and the ledger's existing findings (id,
   area, one-line summary — so it doesn't repeat them). From round 2 on, scope it to the
   areas changed last round plus a short pass over their neighbors.
2. **Record.** Append each new finding to the ledger as `open`. Merge duplicates.
3. **Fix** every `open` finding the plan's autonomy rules allow, then mark it `fixed`.
   Anything the rules don't allow becomes `queued` and is left alone. Don't decide a
   `spec-gap` yourself, however obvious the answer looks.
4. **Check.** Run `reviewer` and `tester` in parallel on the round's changes. Fix what
   they report and re-run until both come back clean, or mark the finding `open` again
   and note why.
5. **Stop early** when no `open` finding remains that the rules allow fixing.

## Step 2: Report

Once per batch, in this order: what was fixed (ids, one line each); `queued` spec-gap
questions for the user; `queued` improvement proposals; areas `inspector` listed as
unexplored; rounds used against the budget. Leave `plan.md` and `findings.md` in the
working tree and commit them with the batch's changes unless the project's `CLAUDE.md`
says otherwise.

## Rules

- Never change the plan's autonomy rules or budget on your own; propose the change in
  the report.
- A finding is `fixed` only after a later `inspector` pass no longer reproduces it, or
  the fix is one `tester` now covers. Until then it stays `open`.
- Don't keep a regression test for a UI check unless `inspector`'s **Worth keeping?**
  line says yes and `tester` writes it.

## Plan format

```markdown
# UI loop plan

## Product
<what the app is, who uses it, in two or three lines>

## Source of truth
<where expected behavior is written down — README section, docs path, issue labels —
or "none: judge by common sense and consistency within the app">

## Scope
| Screen / flow | Entry (route, or steps to reach it) | Needs state |
| --- | --- | --- |

## Coverage
- Viewports: <widths>
- Themes: <e.g. light, dark — or "single">
- States to visit: <empty, loading, error, long content, ...>

## Autonomy
- bug (clear repro): fix without asking
- spec-gap: queue as a question, never decide
- improvement: fix without asking only if <the project's own boundary — e.g. "pure
  spacing/copy/a11y fixes, no new UI elements">; otherwise queue
- Never touch: <paths or areas, or "nothing in particular">

## Budget
Rounds per batch: 3
```

## Ledger format

```markdown
# UI loop findings

| id | class | severity | area | status | summary |
| --- | --- | --- | --- | --- | --- |
| F1 | bug | high | settings dialog | fixed | Save button clipped at 320px |
```

`class`: bug, spec-gap, improvement. `status`: open, fixed, queued, wontfix (the user
declined it — keep the row so it isn't re-reported). Ids are never reused.
