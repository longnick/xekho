# Task Log: Safe refactor plan rewrite

**Date:** 2026-06-01 18:58
**Repo:** `/home/longnick/projects/xekho`
**Branch:** `test/xe-kho-repo-implementer-skill`
**Agent:** Hermes

## Request

User asked to rewrite `REFACTOR_PLAN.md` after reviewing the existing high-level refactor plan.

## Scope

Docs/plan-only update:

- Rewrite `REFACTOR_PLAN.md` into a safer sprint-based plan.
- Update AI map changelog and TODO.
- Do not edit source code.
- Do not read or expose secret file contents.

## What changed

### `REFACTOR_PLAN.md`

Replaced the previous high-level outline with a production-safe plan that includes:

- Current repo constraints and verified approximate LOC:
  - `app.js`: 12,099 lines.
  - `functions/index.js`: 8,368 lines.
  - `functions/firestoreMegaTools.js`: 1,357 lines.
- Security containment before refactor.
- Path-only sensitive file handling rules.
- Explicit warning not to paste/read secret contents.
- Baseline stabilization phase before source split.
- Compatibility-first frontend modularization using IIFE/global namespace pattern.
- POS order flow split delayed until utilities/UI/auth and baseline checks are stable.
- Cloud Functions export mapping before moving handlers.
- Testing infrastructure guidance based on real Jest diagnosis, not assumed `chmod` fix.
- Vite/TypeScript deferred until module boundaries and tests are stronger.
- Definition of Done for each refactor sprint.
- Commands that are forbidden or require explicit confirmation.

### `docs/ai-map/CHANGELOG_AI.md`

Added a new changelog entry for the safe refactor plan rewrite.

### `docs/ai-map/TODO_AI.md`

Updated next steps to prioritize:

1. Security inventory/path-only review.
2. Sensitive-file untracking/rotation only after explicit confirmation.
3. Dirty-tree baseline classification.
4. Safe smoke/test baseline.
5. Compatibility-first utility extraction.

## Verification

- Re-read the written `REFACTOR_PLAN.md`.
- Ran `git diff --stat` to verify scope.
- No source files were intentionally edited for this task.

## Risk notes

- Working tree remains dirty from pre-existing source/config/docs changes.
- Sensitive-looking paths still require explicit owner confirmation and manual credential rotation strategy.
- This task did not run tests because it was a docs/plan rewrite.

## Next step

Start Sprint A from the plan: security inventory/path-only review, without reading or exposing secret contents.
