# Task Log: Safe refactor Sprint 2 - dirty-tree classification and progress tracking

**Date:** 2026-06-02 00:16
**Repo:** `/home/longnick/projects/xekho`
**Branch:** `test/xe-kho-repo-implementer-skill`
**Agent:** Hermes

## Request

User asked to continue executing `REFACTOR_PLAN.md` and report percentage progress against the total plan.

## Scope

Docs-only safety sprint before further source refactoring:

- Create a path-only dirty-tree classification report.
- Add conservative progress tracking for the overall refactor plan.
- Update AI map files.
- Do not read secret contents.
- Do not modify production runtime source in this sprint.

## Backup

Created backup directory:

`/home/longnick/backups/xekho-refactor-sprint2-20260602-001443`

Backed up:

- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/CODE_MAP.md`

## What changed

### `docs/ai-map/REFACTOR_PROGRESS.md`

Created a progress and dirty-tree classification report.

Conservative progress estimates:

- Total long-term `REFACTOR_PLAN.md` including optional TypeScript/CI/build-tooling: **~14% complete**.
- Core non-optional refactor/security/testing plan: **~18% complete**.
- Near-term safe-execution track: **~32% complete**.

The report classifies current dirty paths into path-only groups:

- Security untracked from Git.
- Generated/cache/log artifacts.
- Docs/plans/reports.
- Source runtime high-impact files.
- Backend functions.
- Import/data scripts.
- Offline/POS modules.
- Config/repo metadata.
- New app modules.
- Other assets.

### `docs/ai-map/CODE_MAP.md`

Removed a duplicate stale `scripts/verify-offline-runtime.js` entry. The remaining entry documents the Sprint 19-aligned verification script.

### `docs/ai-map/CHANGELOG_AI.md`

Added Sprint 2 changelog entry with progress percentages and verification notes.

### `docs/ai-map/TODO_AI.md`

Updated the next steps to use `REFACTOR_PROGRESS.md` before more source edits and to continue with bounded compatibility refactor sprints.

## Verification

- Re-read `docs/ai-map/REFACTOR_PROGRESS.md` after writing.
- Kept classification path-only; no secret contents were read.
- Ran safe verification commands after doc updates:
  - syntax checks for touched JS from the previous refactor track
  - targeted DOM/offline verification
  - `npm test -- --runInBand`
  - UTF-8/mojibake scan on touched docs

## Remaining risk

- Overall repo remains dirty with many pre-existing modified/untracked/deleted files.
- Security files are untracked from Git, but credential rotation and history cleanup remain manual/owner work.
- Larger source refactors should not start until the next sprint explicitly scopes one tiny compatibility extraction.

## Next step

Recommended next sprint: either stage/review explicit security/docs changes, or inspect/verify format helper ownership and extract only if a compatibility wrapper is safe.
