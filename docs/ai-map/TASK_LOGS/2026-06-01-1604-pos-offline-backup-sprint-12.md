# POS Offline Backup Sprint 12 Guarded Queue-write Helper

Time: 2026-06-01 16:04

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Hermes

## Scope

User approved deploying Sprint 11 and continuing. This sprint adds guarded queue-write enablement while keeping auto sync disabled.

## Sprint 11 deploy

Deployed hosting-only:

```bash
npx --yes firebase-tools@latest deploy --only hosting --project pos-v2-909ff
```

Live smoke checked:

- `https://xe-kho.web.app/?xkPayloadReview=1`
- `https://xe-kho.web.app/offlineBackup.js?v=20260601-sprint1`
- `https://xe-kho.web.app/offlineFirestoreAdapter.js?v=20260601-sprint3`
- `https://xe-kho.web.app/offlineOrderFallback.js?v=20260601-sprint6`
- `https://xe-kho.web.app/offlineOrderFallbackDevTools.js?v=20260601-sprint7`

Markers confirmed:

- stable device ID marker exists in deployed fallback assets
- `remove_item` marker exists
- old sentinel `-999999` is absent

## Sprint 12 changes

- `offlineOrderFallbackDevTools.js`
  - version updated to Sprint 12.
  - added `enableQueueWriteGuarded({ confirmation: 'ENABLE_OFFLINE_QUEUE_WRITE' })`.
  - refuses enablement without exact confirmation text.
  - requires `XekhoOfflineBackupRuntime.savePendingOrderAction`.
  - explicitly reports `autoSyncEnabled: false`.
  - unwraps prior dry-run controller before installing enabled controller with runtime queue.
  - mobile helper panel can be opened with `?xkQueueWriteGuard=1` and includes a `Bật queue-write guard` button.

- `index.html`
  - cache-busted offline backup scripts to `?v=20260601-sprint12`.

- `scripts/verify-offline-order-fallback-devtools.js`
  - verifies confirmation requirement.
  - verifies fake runtime queue receives saved `open_order` and `add_item` actions only after explicit confirmation.
  - verifies auto sync remains disabled.

## Safety

Still disabled by default:

- queue writes
- auto sync
- Firestore writes from sync
- live order wrapping unless explicitly enabled by helper

Guarded queue-write behavior only activates after explicit call/button with confirmation text. It queues only offline/server-like failures and still rethrows non-open errors; open returns queued client order ID by existing fallback behavior.

## Verification

Commands run during local implementation:

```bash
node --check offlineBackup.js
node --check offlineSync.js
node --check offlineFirestoreAdapter.js
node --check offlineRuntime.js
node --check offlineStatusUI.js
node --check offlineOrderFallback.js
node --check offlineOrderFallbackDevTools.js
node --check scripts/verify-offline-backup.js
node --check scripts/verify-offline-sync.js
node --check scripts/verify-offline-firestore-adapter.js
node --check scripts/verify-offline-runtime.js
node --check scripts/verify-offline-status-ui.js
node --check scripts/verify-offline-order-fallback.js
node --check scripts/verify-offline-order-fallback-devtools.js
node scripts/verify-offline-backup.js
node scripts/verify-offline-sync.js
node scripts/verify-offline-firestore-adapter.js
node scripts/verify-offline-runtime.js
node scripts/verify-offline-status-ui.js
node scripts/verify-offline-order-fallback.js
node scripts/verify-offline-order-fallback-devtools.js
npm test -- --runInBand
npx --yes firebase-tools@latest deploy --only hosting --project pos-v2-909ff
```

Observed targeted verification:

```text
✅ offlineBackup Sprint 1 verification passed
✅ offlineSync Sprint 2 verification passed
✅ offlineFirestoreAdapter Sprint 3 verification passed
✅ offlineRuntime Sprint 4 verification passed
✅ offlineStatusUI Sprint 5 verification passed
✅ offlineOrderFallback Sprint 6 verification passed
✅ offlineOrderFallbackDevTools Sprint 7 verification passed
```

Additional guard check observed:

```json
{
  "noConfirm": "confirmation-required",
  "enabled": {
    "enabled": true,
    "mode": "enabled",
    "syncEnabled": false,
    "autoSyncEnabled": false,
    "queueWritesEnabled": true
  },
  "queuedCount": 1,
  "queuedType": "add_item"
}
```

`npm test -- --runInBand` remains blocked by repo tooling state:

```text
sh: 1: jest: Permission denied
```

Sprint 12 deployed hosting-only. Live smoke confirmed:

- `https://xe-kho.web.app/?xkPayloadReview=1` returns 200 and references Sprint 12 script query strings.
- `https://xe-kho.web.app/?xkQueueWriteGuard=1` returns 200 and references Sprint 12 script query strings.
- `offlineOrderFallbackDevTools.js?v=20260601-sprint12` returns 200 and contains `enableQueueWriteGuarded` + `ENABLE_OFFLINE_QUEUE_WRITE`.
- `offlineOrderFallback.js?v=20260601-sprint12` returns 200 with stable device ID + `remove_item` markers and no `-999999` sentinel.

## iPhone payload review acceptance

User submitted copied payload review generated at `2026-06-01T16:13:46.779Z` from mobile Safari.

Pre-enable blockers checked against the submitted report:

- stable persisted-looking `deviceId`: `device_1780330265106_0071fe9130b4ba0b`
- no `device_unknown`
- nonblank `tableId` on open, item mutation, close, and cancel sample payloads
- `close_order.items` includes one sample item
- close payload includes `tableId`, `tableName`, totals, payment metadata, `billNo`, and `historyId`
- `removeItem` maps to explicit `remove_item`
- `remove_item` payload has `removeMode: "line_item"`
- no sentinel remove-item `delta` field observed
- report states side-effect-free mode: no DB wrap, enqueue, Firestore, or sync

Decision: copied payload review shape is accepted for the next controlled guarded queue-write test. Auto sync remains disabled.

## Next

- Ask operator to run controlled iPhone queue-write test at `https://xe-kho.web.app/?xkQueueWriteGuard=1` and tap `Bật queue-write guard`.
- Inspect pending queue/status badge before any sync enablement.
- Keep auto sync disabled until queued real-device actions are reviewed.
