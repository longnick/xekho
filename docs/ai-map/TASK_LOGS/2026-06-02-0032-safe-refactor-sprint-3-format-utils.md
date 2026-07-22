# Task Log: Safe refactor Sprint 3 - format utility extraction

**Time:** 2026-06-02 00:32
**Repo:** `/home/longnick/projects/xekho`
**Branch:** `test/xe-kho-repo-implementer-skill`
**Agent:** Hermes

## Goal

Continue `REFACTOR_PLAN.md` safely with one bounded compatibility refactor after Sprint 2 dirty-tree classification.

## Backup

Created external backup before editing:

- `/home/longnick/backups/xekho-refactor-sprint3-20260602-003121`

## What changed

- Added `app/utils/format.js` as an IIFE/global compatibility utility under `window.XekhoApp.utils.format`.
- Added helpers:
  - `toFiniteNumber`
  - `compactNumber`
  - `currency`
  - `date`
  - `time`
  - `dateTime`
  - `todayKey`
- Loaded `app/utils/format.js` before `store.js` in `index.html`.
- Kept legacy `store.js` names (`fmt`, `fmtFull`, `fmtDate`, `fmtTime`, `fmtDateTime`, `today`) and made them delegate to the new utility when available, with fallback logic preserved.
- Added `scripts/verify-format-utils.js` to verify the new module and confirm store delegation markers.
- Updated AI map docs and progress estimates.

## Files changed

- `app/utils/format.js`
- `store.js`
- `index.html`
- `scripts/verify-format-utils.js`
- `docs/ai-map/CODE_MAP.md`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/REFACTOR_PROGRESS.md`
- `docs/ai-map/TASK_LOGS/2026-06-02-0032-safe-refactor-sprint-3-format-utils.md`

## Safety notes

- Did not touch `.env`, service account JSON, production database, migration files, POS data, payment/customer data, or raw media.
- Did not run destructive Git commands.
- Did not stage or commit anything.
- Kept browser script-order compatibility; no ES module/Vite migration.

## Verification

Passed:

```bash
node --check app/utils/format.js
node --check store.js
node --check scripts/verify-format-utils.js
node scripts/verify-format-utils.js
node scripts/verify-dom-utils.js
node --check app.js
node scripts/verify-offline-runtime.js
node scripts/verify-offline-status-ui.js
node scripts/verify-offline-backup.js
node scripts/verify-offline-sync.js
node scripts/verify-offline-firestore-adapter.js
node scripts/verify-offline-order-fallback.js
node scripts/verify-offline-order-fallback-devtools.js
npm test -- --runInBand
```

Results:

- `verify-format-utils passed`
- `verify-dom-utils passed`
- Offline verification scripts passed.
- Jest passed: 1 suite, 6 tests.

## Progress estimate after this sprint

- Total long-term `REFACTOR_PLAN.md` including optional TypeScript/CI/build-tooling: ~15% complete.
- Core non-optional refactor/security/testing plan: ~19% complete.
- Near-term safe-execution track: ~36% complete.

## Next

Continue with one more bounded compatibility extraction around a small app.js UI/helper seam, or pause to review/stage explicit security/docs/refactor paths before larger work.
