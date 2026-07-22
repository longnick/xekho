# 2026-06-25 21:53 +07 - Android native POS queue filters/retry preview Sprint 13

## Scope

Add local-only queue status filters and retry preview after Sprint 12 offline queue draft. This remains a UI/model preview only: no Firestore writes, no background sync, no production writes, no persistent queue.

Still blocked/deferred:

- No Firestore dependency/read/write/sync
- No background retry worker
- No persistent local database
- No Firebase Auth sign-in wiring
- No service account, `.env`, or `google-services.json`
- No production customer/payment/order persistence

## Implementation

- Added `OfflineQueueStatus.RETRY_PREVIEW_LOCAL_ONLY`.
- Added `OfflineQueueFilter`:
  - `ALL`
  - `QUEUED`
  - `BLOCKED`
  - `RETRY_PREVIEW`
- Added `OfflineQueueState.blockedCount` and `retryPreviewCount` derived values.
- Extended `FakeOfflineQueueRepository`:
  - `filterItems(state, filter)` returns local queue buckets only
  - `retryPreview(state, localQueueId)` changes only blocked local items into retry-preview state
  - queued or missing item retry attempts leave state unchanged except fail-closed guards
  - every path keeps `canWriteToProduction = false` and `canSyncToFirestore = false`
- Wired Tables UI:
  - retained queue filter selection via `rememberSaveable`
  - queue summary shows queued / blocked / retry-preview counts
  - filter buttons show current selected filter
  - blocked queue items expose `Retry nháp`
  - retry preview switches selected filter to `RETRY_PREVIEW`
  - controls are vertical to avoid mobile overflow

## TDD evidence

RED:

```text
./gradlew :app:testDebugUnitTest --no-daemon --stacktrace
FAILED: Unresolved reference 'RETRY_PREVIEW_LOCAL_ONLY'
FAILED: Unresolved reference 'filterItems'
FAILED: Unresolved reference 'OfflineQueueFilter'
FAILED: Unresolved reference 'retryPreview'
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
sha256: 429ffe0bd5bf3a66b952a46b2c070243382da3bd19c0fe7a3c9e403b05751ab6
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
Kilo hermes-9router/ag/gemini-3-flash reviewed Sprint 13 read-only.
Kilo ran Gradle tests/build plus web check/test/build checks and did not edit files.
No blocker found for compile, fail-closed guards, Firebase/POS data safety, local queue filters/retry preview, queue state retention, or architecture.
```

## Next sprint

Sprint 14 can keep POS local-only and add local queue conflict/error-detail preview, or start a guarded persistence boundary only if explicitly approved. Firestore writes remain blocked unless explicitly approved.
