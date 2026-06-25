# 2026-06-25 23:07 +07 - Android native queue storage selection boundary Sprint 17

## Scope

- Prepare a guarded real local storage selection/design boundary for offline queue persistence.
- Compare DataStore vs Room as candidates.
- Keep actual Room/DataStore dependencies, DB files, persistence writes, Firestore sync, background sync, production POS writes, service accounts, `.env`, customer/payment data, and migrations blocked.

## Changes

- Added queue storage prep models in `android-native/app/src/main/java/com/xekho/pos/domain/Models.kt`:
  - `QueueStorageBackend`
  - `QueueStorageReadinessStatus`
  - `QueueStorageRequest`
  - `QueueStorageDecision`
  - `QueueStorageComparison`
- Added `GuardedQueueStorageSelectionBoundary`:
  - default selection stays `NONE_LOCAL_ONLY` / blocked
  - Room request stays blocked when dependency is missing
  - DataStore request stays prep-only when dependency exists but owner approval is missing
  - even with dependency + owner approval, Sprint 17 still holds at `APPROVAL_HELD_LOCAL_ONLY` and opens no DB/storage
  - `compareBackends()` recommends Room later for structured queue rows/retry/conflict state, while keeping both options blocked today
- Added `QueueStorageSelectionBoundaryTest` covering default blocked path, Room missing dependency, DataStore prep-only, explicit approval still held, and backend comparison.
- Wired Tables UI with `Storage prep boundary Sprint 17` and `Storage options blocked today` cards.

## Verification

```bash
cd /home/longnick/projects/xekho/android-native
./gradlew :app:testDebugUnitTest --no-daemon --tests 'com.xekho.pos.domain.QueueStorageSelectionBoundaryTest'
# BUILD SUCCESSFUL in 27s

./gradlew clean :app:testDebugUnitTest --no-daemon
# BUILD SUCCESSFUL in 38s

./gradlew :app:assembleDebug --no-daemon
# BUILD SUCCESSFUL in 26s

unzip -l app/build/outputs/apk/debug/app-debug.apk | grep -Ei '(^|/)(google-services\.json|.*\.env|serviceAccount|firebase-adminsdk|secret|functions-list\.json)$' || true
# no matches

sha256sum app/build/outputs/apk/debug/app-debug.apk
# 6ffb1c3e9748698a991b19e846fe56cd02adfa3a77a04d0bebb8ca2b81a6e3c5  app/build/outputs/apk/debug/app-debug.apk

cd /home/longnick/projects/xekho
npm run check
npm test -- --runInBand
npm run build:hosting
# check passed; Jest 2 suites / 12 tests passed; hosting dist prepared with 109 files (1.84 MB)
```

## Safety notes

- No Room/DataStore dependency was added.
- No database/storage file was opened or written.
- No Firestore sync, production write, service account, `.env`, customer/payment data, or migrations touched.
- Existing untracked `.understand-anything/` was not touched.

## Next suggested sprint

Sprint 18: add a compile-time dependency marker/gate for the selected storage candidate (likely Room) without opening a database or writing queue rows, or move into read-only Firebase/POS data preparation if you want beta data visibility first.
