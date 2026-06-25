# 2026-06-25 22:45 +07 - Android native POS queue persistence boundary Sprint 15

## Scope

- Keep POS queue behavior local-only.
- Add a guarded persistence boundary for offline queue state.
- Do not add Room, real database persistence, Firestore sync, background sync, service accounts, `.env`, or production POS writes.

## Changes

- Added `OfflineQueuePersistenceMode`, `OfflineQueuePersistenceSnapshot`, and `OfflineQueuePersistenceResult` in `android-native/app/src/main/java/com/xekho/pos/domain/Models.kt`.
- Added `GuardedOfflineQueuePersistenceBoundary` in `android-native/app/src/main/java/com/xekho/pos/domain/GuardedOfflineQueuePersistenceBoundary.kt`.
  - `saveLocalSnapshot(state)` creates a local-only encoded snapshot.
  - `restoreLocalSnapshot(snapshot)` decodes/sanitizes snapshot state back into local queue memory.
  - `blockedRoomPersistence(state)` returns a fail-closed Room/DB blocked result and does not persist or restore anything.
  - `clearLocalSnapshot()` clears the local-only snapshot boundary result.
- Added `OfflineQueuePersistenceBoundaryTest` covering snapshot save, restore guard sanitization, Room/DB blocking, clear snapshot, and no write/sync flags.
- Wired Tables UI with a `Persistence boundary local-only` card and guarded actions:
  - `Lưu snapshot local`
  - `Nạp snapshot local`
  - `Thử Room/DB (blocked)`
  - `Xóa snapshot local`

## Verification

```bash
cd /home/longnick/projects/xekho/android-native
./gradlew :app:testDebugUnitTest --no-daemon --tests 'com.xekho.pos.domain.OfflineQueuePersistenceBoundaryTest'
# BUILD SUCCESSFUL in 22s

./gradlew clean :app:testDebugUnitTest --no-daemon
# BUILD SUCCESSFUL in 37s

./gradlew :app:assembleDebug --no-daemon
# BUILD SUCCESSFUL in 25s

unzip -l app/build/outputs/apk/debug/app-debug.apk | grep -Ei '(^|/)(google-services\.json|.*\.env|serviceAccount|firebase-adminsdk|secret|functions-list\.json)$' || true
# no matches

sha256sum app/build/outputs/apk/debug/app-debug.apk
# c4d2d8edd08208e7e4d24de6035129eb1596c976f118032cdc98983dd9a2578e  app/build/outputs/apk/debug/app-debug.apk

cd /home/longnick/projects/xekho
npm run check
npm test -- --runInBand
npm run build:hosting
# check passed; Jest 2 suites / 12 tests passed; hosting dist prepared with 108 files (1.84 MB)
```

## Safety notes

- Firebase/Firestore writes remain blocked.
- Room/DB persistence remains blocked and represented only by a fail-closed boundary result.
- Queue snapshot uses local encode/decode only; no production POS data, no customer/payment data, no service account, and no `.env` touched.
- Existing untracked `.understand-anything/` was not touched.

## Next suggested sprint

Sprint 16: local queue persistence restore UX hardening, e.g. snapshot validation/errors and import/export preview, still without Room/DB or Firestore sync.
