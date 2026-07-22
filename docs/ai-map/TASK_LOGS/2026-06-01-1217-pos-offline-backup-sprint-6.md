# POS Offline Backup Sprint 6 Disabled/Dry-run Order Fallback Wrapper

Time: 2026-06-01 12:17

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

## Goal

Create the POS order fallback wrapper/payload builder in disabled/dry-run mode before enabling live queue writes. This sprint validates the action shapes for live POS order methods without changing production order behavior.

## Scope

Implemented Sprint 6 only:

- Add `offlineOrderFallback.js`.
- Load it in `index.html` after the offline runtime and status UI.
- Auto-install a controller in safe `disabled` mode.
- Build action payloads for:
  - `open_order` from `Orders.open`
  - `add_item` from `Orders.addItem`
  - `change_qty` from `Orders.changeQty`
  - `change_qty` remove surrogate from `Orders.removeItem`
  - `update_item` from `Orders.updateItemNote`
  - `update_meta` from `Orders.updateMeta`
  - `close_order` from `Orders.close`
  - `cancel_order` from `Orders.cancel`
- Add dry-run capture support that records generated actions in memory without queue writes.
- Add explicit enabled-mode support for memory/runtime queue save, but do not auto-enable it.
- Add `scripts/verify-offline-order-fallback.js`.

Not included in this sprint:

- No automatic wrapping of live `window.DB.Orders`.
- No production queue writes by default.
- No Firestore writes.
- No auto sync.
- No mutation of POS/customer/payment data.
- No changes to `.env`, service account files, or migration files.

## Files changed

- `index.html`
- `offlineOrderFallback.js`
- `scripts/verify-offline-order-fallback.js`
- `docs/ai-map/CODE_MAP.md`
- `docs/ai-map/FILE_RELATIONS.md`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/TASK_LOGS/2026-06-01-1217-pos-offline-backup-sprint-6.md`

## Verification

Commands run:

```bash
node --check offlineBackup.js
node --check offlineSync.js
node --check offlineFirestoreAdapter.js
node --check offlineRuntime.js
node --check offlineStatusUI.js
node --check offlineOrderFallback.js
node --check scripts/verify-offline-backup.js
node --check scripts/verify-offline-sync.js
node --check scripts/verify-offline-firestore-adapter.js
node --check scripts/verify-offline-runtime.js
node --check scripts/verify-offline-status-ui.js
node --check scripts/verify-offline-order-fallback.js
node scripts/verify-offline-backup.js
node scripts/verify-offline-sync.js
node scripts/verify-offline-firestore-adapter.js
node scripts/verify-offline-runtime.js
node scripts/verify-offline-status-ui.js
node scripts/verify-offline-order-fallback.js
```

Expected/actual result:

```text
✅ offlineBackup Sprint 1 verification passed
✅ offlineSync Sprint 2 verification passed
✅ offlineFirestoreAdapter Sprint 3 verification passed
✅ offlineRuntime Sprint 4 verification passed
✅ offlineStatusUI Sprint 5 verification passed
✅ offlineOrderFallback Sprint 6 verification passed
```

The sync verification intentionally simulates one failed action and logs a warning before passing. The fallback verification intentionally logs one dry-run capture and one memory queue save before passing.

## Progress estimate

After Sprint 6, the feature is about 75% complete by module count. Remaining high-risk work is browser/manual dry-run against real `window.DB.Orders`, explicit enabled fallback, and sync enablement/hardening.

## Next

Sprint 7 should manually test the browser boot and add an explicit dev-only dry-run install path around live `window.DB.Orders`, then simulate network/server failures to inspect generated queued actions before any enabled fallback writes.
