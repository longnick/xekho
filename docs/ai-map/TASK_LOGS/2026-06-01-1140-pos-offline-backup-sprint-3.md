# POS Offline Backup Sprint 3 Firestore Adapter Foundation

Time: 2026-06-01 11:40

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

## Goal

Add a safe Firestore/POS adapter foundation for the offline sync engine without touching live Firebase data or changing the live POS order flow.

## Scope

Implemented Sprint 3 only:

- Add `offlineFirestoreAdapter.js`.
- Bridge `offlineSync.js` actions to explicit injected operations.
- Check `history`, `orders`, and `online_orders`/`onlineOrders` style state by `clientOrderId` before applying actions.
- Map `close_order` actions to completed-history payloads.
- Build payInfo payloads for future `DB.Orders.close` compatibility.
- Add memory Firestore operations for local verification.
- Add Node verification script for adapter mapping, idempotency, state lookup, offline status, and sync integration.

Not included in this sprint:

- No live Firestore writes.
- No script tags in `index.html`.
- No POS UI integration.
- No order method wrapping.
- No changes to `app.js`, `db.js`, `.env`, service account files, migration files, or POS/customer/payment data.

## Files changed

- `offlineFirestoreAdapter.js`
- `scripts/verify-offline-firestore-adapter.js`
- `docs/ai-map/CODE_MAP.md`
- `docs/ai-map/FILE_RELATIONS.md`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/TASK_LOGS/2026-06-01-1140-pos-offline-backup-sprint-3.md`

## Verification

Commands run:

```bash
node --check offlineBackup.js
node --check offlineSync.js
node --check offlineFirestoreAdapter.js
node --check scripts/verify-offline-backup.js
node --check scripts/verify-offline-sync.js
node --check scripts/verify-offline-firestore-adapter.js
node scripts/verify-offline-backup.js
node scripts/verify-offline-sync.js
node scripts/verify-offline-firestore-adapter.js
```

Expected/actual result:

```text
✅ offlineBackup Sprint 1 verification passed
✅ offlineSync Sprint 2 verification passed
✅ offlineFirestoreAdapter Sprint 3 verification passed
```

The sync verification intentionally simulates one failed action and logs a warning before passing.

## Notes

The repo had many pre-existing modified/untracked/deleted files before this task. This task only added/updated the Sprint 3 files listed above plus AI map docs.

## Next

Sprint 4 should integrate the offline foundation into the browser in a non-invasive mode:

1. Add script tags in `index.html` after checking current script order.
2. Initialize runtime as `window.XekhoOfflineBackupRuntime`.
3. Expose queue summary/status API.
4. Do not wrap live POS order methods until runtime and UI status are verified.
