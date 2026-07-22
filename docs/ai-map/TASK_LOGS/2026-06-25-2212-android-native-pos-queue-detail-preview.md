# 2026-06-25 22:12 +07 - Android native POS queue detail preview Sprint 14

## Scope

Add local-only queue conflict/error-detail preview after Sprint 13 queue filters/retry preview.

This remains preview-only:

- No Firestore read/write/sync
- No background sync worker
- No persistent queue database
- No Firebase Auth change
- No service account, `.env`, or `google-services.json`
- No production customer/payment/order persistence

## Implementation

- Added `OfflineQueueDetailType`:
  - `INFO_LOCAL_ONLY`
  - `ERROR_PREVIEW_LOCAL_ONLY`
  - `CONFLICT_PREVIEW_LOCAL_ONLY`
- Added `OfflineQueueDetailPreview` with fail-closed guards:
  - `canWriteToProduction = false`
  - `canSyncToFirestore = false`
- Added `FakeOfflineQueueRepository.previewDetail(state, localQueueId)`:
  - missing queue id returns local-only error preview
  - blocked queue item returns local-only error detail with payload, table, item count, and suggested action
  - duplicate non-blank local receipt returns local-only conflict preview
  - healthy queued item returns info-only preview
  - retry preview item returns retry error-detail preview
- Wired Tables UI:
  - retained `selectedQueueDetailId` via `rememberSaveable`
  - queue item rows expose `Chi tiết lỗi`
  - selected detail card shows type, title, detail lines, recommended action, and no-write/no-sync copy
  - clearing local queue also clears selected detail id
  - retry preview auto-selects its detail id

## TDD evidence

RED:

```text
./gradlew :app:testDebugUnitTest --no-daemon --stacktrace
FAILED: Unresolved reference 'previewDetail'
FAILED: Unresolved reference 'OfflineQueueDetailType'
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
sha256: c09b15842112da3b313cc01b66d4c801bb788d41412ef6a9294a8648742f0cd2
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
Kilo hermes-9router/ag/gemini-3-flash reviewed Sprint 14 read-only.
Kilo ran ./gradlew test --no-daemon and reported BUILD SUCCESSFUL.
No blocker found for compile, fail-closed guards, Firebase/POS data safety, local-only queue conflict/error detail preview, UI safety, or architecture.
```

## Next sprint

Sprint 15 can keep POS local-only and add a guarded local persistence boundary for queue state, or add more error-category grouping before persistence. Firestore writes remain blocked unless explicitly approved.
