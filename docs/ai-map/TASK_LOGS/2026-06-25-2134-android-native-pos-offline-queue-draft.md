# 2026-06-25 21:34 +07 - Android native POS offline queue draft Sprint 12

## Scope

Add a guarded local-only offline queue draft model after Sprint 11 multi-table local orders. This creates preview queue items from local payment-close results only; it does not sync, persist, or write production data.

Still blocked/deferred:

- No Firestore dependency/read/write/sync
- No background sync worker
- No persistent local database
- No Firebase Auth sign-in wiring
- No service account, `.env`, or `google-services.json`
- No production customer/payment/order persistence

## Implementation

- Added `OfflineQueueStatus`:
  - `QUEUED_LOCAL_ONLY`
  - `BLOCKED_LOCAL_ONLY`
- Added `OfflineQueueItem`:
  - local queue id
  - table id
  - local receipt number
  - local status
  - total due / item count
  - payload preview string
  - `canWriteToProduction = false`
  - `canSyncToFirestore = false`
- Added `OfflineQueueState`:
  - local queue item list
  - derived pending count / pending total
  - fail-closed production write and Firestore sync guards
- Added `FakeOfflineQueueRepository`:
  - `draftFromPaymentClose(closeResult)` creates queued local item only for closed local payment results
  - not-payable payment close results produce blocked local-only queue item
  - `appendDraft(state, item)` appends by local queue id and deduplicates repeat appends
  - `clearLocalQueue(state)` clears memory queue while keeping guards false
- Wired Tables UI:
  - `Xếp queue` button
  - offline queue summary card
  - local queue item rows
  - `Xóa queue local`
  - all copy explicitly says no Firestore, no sync, no production write
- Added `offlineQueueStateSaver` for queue state retention with `rememberSaveable`.

## TDD evidence

RED:

```text
./gradlew :app:testDebugUnitTest --no-daemon --stacktrace
FAILED: Unresolved reference 'FakeOfflineQueueRepository'
FAILED: Unresolved reference 'OfflineQueueStatus'
FAILED: Unresolved reference 'OfflineQueueState'
FAILED: Unresolved reference 'OfflineQueueItem'
```

GREEN:

```text
./gradlew :app:testDebugUnitTest --no-daemon
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
sha256: 1ef44876c8bf86de9a3a12f340d94f593569b1f5765f2043fe1e91c1e1511f96
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
Kilo hermes-9router/ag/gemini-3-flash reviewed Sprint 12 read-only.
Kilo ran Gradle tests/build checks and did not edit files.
No blocker found for compile, fail-closed guards, Firebase/POS data safety, queue state retention, or architecture.
```

## Next sprint

Sprint 13 can keep POS local-only and add local offline queue status filters / retry preview. Firestore writes remain blocked unless explicitly approved.
