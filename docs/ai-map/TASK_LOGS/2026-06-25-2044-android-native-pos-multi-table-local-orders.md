# 2026-06-25 20:44 +07 - Android native POS multi-table local orders Sprint 11

## Scope

Add local-only multi-table order selection across fake POS tables after Sprint 10D local payment close. This remains a native dry-run/local UX slice.

Still blocked/deferred:

- No Firestore dependency/read/write/sync
- No Firebase Auth sign-in wiring
- No service account, `.env`, or `google-services.json`
- No production customer/payment/order persistence
- No real receipt/payment capture

## Implementation

- Added `PosTableOrderState` domain model:
  - `selectedTableId`
  - `ordersByTable`
  - `tableLabelsById`
  - `canWriteToProduction = false`
  - `canSyncToFirestore = false`
- Added `FakePosTableOrderRepository`:
  - `initialState(tables)` creates one local order per table
  - `selectTable(state, tableId)` switches selected table without touching other orders
  - `replaceSelectedOrder(state, order)` only replaces the currently selected table order
  - `tableSummaries(state)` derives local table totals/statuses from local order state only
- Updated Tables UI:
  - selected table appears in POS local card
  - table list now has `Chọn` / `Đang chọn`
  - each table keeps independent local order/cart/payment state
  - local copy explicitly says no Firestore, no production write, no sync
- Added `posTableOrderStateSaver` for multi-table state retention via `rememberSaveable`.
- Fixed Kilo-flagged saver delimiter bug:
  - table row delimiter: `\u001d`
  - item delimiter: `\u001e`
  - item field delimiter: `\u001f`
  - prevents item payload from being split at table-row parse time

## TDD evidence

RED:

```text
./gradlew :app:testDebugUnitTest --no-daemon --stacktrace
FAILED: Unresolved reference 'FakePosTableOrderRepository'
```

GREEN:

```text
./gradlew :app:testDebugUnitTest --no-daemon
BUILD SUCCESSFUL
```

Kilo review found a saver delimiter edge case. Fixed and re-ran:

```text
./gradlew clean :app:testDebugUnitTest --no-daemon
BUILD SUCCESSFUL
```

## Verification

Android native:

```text
./gradlew clean :app:testDebugUnitTest --no-daemon  # BUILD SUCCESSFUL
./gradlew :app:assembleDebug --no-daemon            # BUILD SUCCESSFUL
```

APK:

```text
android-native/app/build/outputs/apk/debug/app-debug.apk
size: 11M
sha256: b5623b2ee8d3766685a1e0a8c9b642db0d21e4778428401535366dafa821b7f2
```

APK secret/config scans:

```text
Targeted scan for google-services.json/.env/serviceAccount/firebase-adminsdk/secret/functions-list: no matches.
Broader scan with exact AndroidX credentials metadata allowlist: no dangerous matches.
```

Legacy web regression:

```text
npm run check               # pass
npm test -- --runInBand     # 2 suites, 12 tests pass
npm run build:hosting       # pass, dist prepared
```

Kilo review:

```text
Kilo hermes-9router/ag/gemini-3-flash reviewed Sprint 11 read-only.
Kilo found the initial saver delimiter bug; Hermes fixed it and re-ran native/web verification.
Kilo re-review confirmed the corrected delimiter structure and tests/build pass.
```

## Next sprint

Sprint 12 can keep POS local-only and add a guarded offline queue draft model. Firestore writes remain blocked unless explicitly approved.
