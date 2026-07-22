# POS Offline Backup Sprint 11 Stable Device ID and Safe RemoveItem

Time: 2026-06-01 15:55

Repo: `/home/longnick/projects/xekho`

Branch: `test/xe-kho-repo-implementer-skill`

Agent: Codex

## Goal

Fix the Sprint 10 payload review blockers before guarded real queue writes:

- Avoid `device_unknown` when browser localStorage works.
- Replace `removeItem` sentinel `delta: -999999` with explicit remove line item semantics.
- Keep real queue writes and auto sync disabled by default.

## Changes made

- `offlineOrderFallback.js`
  - Added stable localStorage-backed device ID generation using `xekho_pos_device_id`.
  - Kept explicit `options.deviceId` and `window.XEKHO_DEVICE_ID` support.
  - Added in-memory device ID fallback when storage is unavailable, so payloads do not use `device_unknown`.
  - Added `buildRemoveItemAction()` and mapped `Orders.removeItem` to `type: remove_item` with `removeMode: line_item`.
  - Removed the old remove-as-`change_qty` sentinel behavior.

- `offlineBackup.js`
  - Added `remove_item` to accepted queue action types for future guarded queue writes.

- `offlineFirestoreAdapter.js`
  - Added `remove_item` handling through injected `operations.removeItem` or `DB.Orders.removeItem`.
  - Added memory operation coverage for `removeItem`.

- `offlineOrderFallbackDevTools.js`
  - Updated payload review warnings so fixed reports no longer warn for `device_unknown` or the removed sentinel.
  - Kept regression warnings for missing stable device IDs, delta-based remove payloads, wrong action type, missing remove mode, or missing remove target.

- Verification scripts
  - Updated fallback/devtools verifiers to assert stable device IDs and explicit `remove_item`.
  - Updated Firestore adapter verifier to assert `remove_item` routes to `removeItem` without a `delta`.

## Safety

Still not enabled:

- real offline queue writes by default
- auto sync
- Firestore writes from fallback
- POS order method wrapping by default

No `.env`, token, service account, production data, migration, customer/payment data, or destructive command was used.

## Verification

Commands run:

```bash
node --check offlineOrderFallback.js
node --check offlineOrderFallbackDevTools.js
node --check offlineBackup.js
node --check offlineFirestoreAdapter.js
node --check scripts/verify-offline-order-fallback.js
node --check scripts/verify-offline-order-fallback-devtools.js
node --check scripts/verify-offline-firestore-adapter.js
node scripts/verify-offline-order-fallback.js
node scripts/verify-offline-order-fallback-devtools.js
node scripts/verify-offline-firestore-adapter.js
```

Expected result:

- Payload review actions use a stable `device_*` ID when localStorage is available.
- `removeItem` review action uses `remove_item` with `removeMode: line_item`.
- Review warnings do not include `device_unknown` or `-999999` for the fixed sample payloads.

## Next

- Deploy hosting only if explicitly requested.
- Re-run iPhone/mobile payload review from `?xkPayloadReview=1`.
- If the report is accepted, add a guarded real queue-write flag while keeping auto sync disabled.
