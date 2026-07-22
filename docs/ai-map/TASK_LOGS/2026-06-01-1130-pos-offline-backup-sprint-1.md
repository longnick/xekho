# POS Offline Backup Sprint 1 Foundation

Time: 2026-06-01 11:30

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

## Goal

Create the safe local queue foundation for POS offline backup without touching production data, credentials, or the live POS order flow.

## Scope

Implemented Sprint 1 only:

- Add local pending order action queue module.
- Use IndexedDB in browser.
- Provide in-memory storage for local Node verification.
- Provide action state helpers: pending, syncing, synced, failed.
- Provide `clientOrderId` and `actionId` generators.
- Provide offline/server error detection helper.
- Add verification script that does not read or write Firestore/POS data.

Not included in this sprint:

- No Firestore sync engine.
- No POS UI integration.
- No changes to `app.js`, `db.js`, `.env`, service account files, migration files, or POS/customer/payment data.

## Files changed

- `offlineBackup.js`
- `scripts/verify-offline-backup.js`
- `docs/ai-map/CODE_MAP.md`
- `docs/ai-map/FILE_RELATIONS.md`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/TASK_LOGS/2026-06-01-1130-pos-offline-backup-sprint-1.md`

## Verification

Commands run:

```bash
node --check offlineBackup.js
node --check scripts/verify-offline-backup.js
node scripts/verify-offline-backup.js
```

Result:

```text
✅ offlineBackup Sprint 1 verification passed
```

## Notes

The repo had many pre-existing modified/untracked/deleted files before this task. This task only added/updated the files listed above.

## Next

Sprint 2 should create `offlineSync.js` and verify idempotent sync behavior by `clientOrderId` before integrating with the live POS order flow.
