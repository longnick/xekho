# POS Offline Backup Sprint 5 Visible Status UI

Time: 2026-06-01 12:08

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

## Goal

Add a visible read-only POS offline backup badge/panel so operators can see queue status before any live order fallback is enabled.

## Scope

Implemented Sprint 5 only:

- Add `offlineStatusUI.js`.
- Inject a header badge into `.header-actions`.
- Add a popup panel with:
  - network state
  - sync state
  - pending count
  - failed count
  - synced count
  - total queue count
- Read state from `window.XekhoOfflineBackupRuntime.getSummary()`.
- Add `index.html` script tag for `offlineStatusUI.js`.
- Add Node verification for state/text mapping.

Not included in this sprint:

- No live order method wrapping.
- No automatic sync.
- No production Firestore writes.
- No mutation of POS/customer/payment data.
- No changes to `.env`, service account files, or migration files.

## Files changed

- `index.html`
- `offlineStatusUI.js`
- `scripts/verify-offline-status-ui.js`
- `docs/ai-map/CODE_MAP.md`
- `docs/ai-map/FILE_RELATIONS.md`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/TASK_LOGS/2026-06-01-1208-pos-offline-backup-sprint-5.md`

## Verification

Commands run:

```bash
node --check offlineBackup.js
node --check offlineSync.js
node --check offlineFirestoreAdapter.js
node --check offlineRuntime.js
node --check offlineStatusUI.js
node --check scripts/verify-offline-backup.js
node --check scripts/verify-offline-sync.js
node --check scripts/verify-offline-firestore-adapter.js
node --check scripts/verify-offline-runtime.js
node --check scripts/verify-offline-status-ui.js
node scripts/verify-offline-backup.js
node scripts/verify-offline-sync.js
node scripts/verify-offline-firestore-adapter.js
node scripts/verify-offline-runtime.js
node scripts/verify-offline-status-ui.js
```

Expected/actual result:

```text
✅ offlineBackup Sprint 1 verification passed
✅ offlineSync Sprint 2 verification passed
✅ offlineFirestoreAdapter Sprint 3 verification passed
✅ offlineRuntime Sprint 4 verification passed
✅ offlineStatusUI Sprint 5 verification passed
```

The sync verification intentionally simulates one failed action and logs a warning before passing.

## Progress estimate

After Sprint 5, foundation + status UI is about 65% of the offline backup feature. Remaining work is the risky part: live POS order fallback, real sync enablement, and browser/manual testing.

## Next

Sprint 6 should create a POS order fallback wrapper in disabled/dry-run mode first, validate payloads for open/add/change/close/cancel, then only later enable live fallback.
