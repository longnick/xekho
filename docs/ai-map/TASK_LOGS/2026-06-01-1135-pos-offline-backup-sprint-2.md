# POS Offline Backup Sprint 2 Sync Engine Foundation

Time: 2026-06-01 11:35

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

## Goal

Add the sync engine foundation for POS offline backup without writing to Firestore or changing live POS flow.

## Scope

Implemented Sprint 2 only:

- Add adapter-based sync engine in `offlineSync.js`.
- Process queue actions from `offlineBackup.js`.
- Support pending and failed action retry.
- Support idempotency through adapter checks by `clientOrderId`.
- Support single-flight lock so only one sync run executes at a time.
- Support offline skip when adapter/browser says offline.
- Support retry/backoff helper logic.
- Add in-memory sync adapter for safe local verification.
- Add Node verification script for success, duplicate/idempotent sync, failure, offline skip, and lock behavior.

Not included in this sprint:

- No Firestore adapter yet.
- No live Firestore writes.
- No POS UI integration.
- No changes to `app.js`, `db.js`, `.env`, service account files, migration files, or POS/customer/payment data.

## Files changed

- `offlineSync.js`
- `scripts/verify-offline-sync.js`
- `docs/ai-map/CODE_MAP.md`
- `docs/ai-map/FILE_RELATIONS.md`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/TASK_LOGS/2026-06-01-1135-pos-offline-backup-sprint-2.md`

## Verification

Commands run:

```bash
node --check offlineBackup.js
node --check offlineSync.js
node --check scripts/verify-offline-backup.js
node --check scripts/verify-offline-sync.js
node scripts/verify-offline-backup.js
node scripts/verify-offline-sync.js
```

Result:

```text
✅ offlineBackup Sprint 1 verification passed
✅ offlineSync Sprint 2 verification passed
```

The sync verification intentionally simulates one failed action and logs a warning before passing.

## Notes

The repo had many pre-existing modified/untracked/deleted files before this task. This task only added/updated the Sprint 2 files listed above plus AI map docs.

## Next

Sprint 3 should create a Firestore adapter for `offlineSync.js`, first verified against mocks/local stubs before wiring live POS order flow.
