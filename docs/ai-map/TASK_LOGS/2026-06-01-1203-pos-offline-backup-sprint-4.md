# POS Offline Backup Sprint 4 Non-Invasive Browser Runtime

Time: 2026-06-01 12:03

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

## Goal

Load the POS offline backup foundation in the browser and expose a status/runtime API without changing live POS behavior.

## Scope

Implemented Sprint 4 only:

- Add `offlineRuntime.js`.
- Auto-install `window.XekhoOfflineBackupRuntime` in browser.
- Keep sync disabled by default for safety.
- Expose status APIs:
  - `getSummary()`
  - `listPendingActions()`
  - `listFailedActions()`
  - `syncNow()` returns `sync-disabled` unless runtime is explicitly created with `enableSync: true`.
- Add `index.html` script tags for:
  - `offlineBackup.js`
  - `offlineSync.js`
  - `offlineFirestoreAdapter.js`
  - `offlineRuntime.js`
- Add Node verification for sync-disabled runtime mode and opt-in memory sync mode.

Not included in this sprint:

- No visible UI badge yet.
- No wrapping of live POS order methods.
- No automatic sync.
- No production Firestore writes.
- No changes to `.env`, service account files, migration files, or POS/customer/payment data.

## Files changed

- `index.html`
- `offlineRuntime.js`
- `scripts/verify-offline-runtime.js`
- `docs/ai-map/CODE_MAP.md`
- `docs/ai-map/FILE_RELATIONS.md`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/TASK_LOGS/2026-06-01-1203-pos-offline-backup-sprint-4.md`

## Verification

Commands run:

```bash
node --check offlineBackup.js
node --check offlineSync.js
node --check offlineFirestoreAdapter.js
node --check offlineRuntime.js
node --check scripts/verify-offline-backup.js
node --check scripts/verify-offline-sync.js
node --check scripts/verify-offline-firestore-adapter.js
node --check scripts/verify-offline-runtime.js
node scripts/verify-offline-backup.js
node scripts/verify-offline-sync.js
node scripts/verify-offline-firestore-adapter.js
node scripts/verify-offline-runtime.js
```

Expected/actual result:

```text
✅ offlineBackup Sprint 1 verification passed
✅ offlineSync Sprint 2 verification passed
✅ offlineFirestoreAdapter Sprint 3 verification passed
✅ offlineRuntime Sprint 4 verification passed
```

The sync verification intentionally simulates one failed action and logs a warning before passing.

## Notes

The repo had many pre-existing modified/untracked/deleted files before this task. This task only added/updated the Sprint 4 files listed above plus AI map docs.

## Next

Sprint 5 should add a small visible POS offline status badge/panel using `window.XekhoOfflineBackupRuntime.getSummary()`, still without wrapping live order methods.
