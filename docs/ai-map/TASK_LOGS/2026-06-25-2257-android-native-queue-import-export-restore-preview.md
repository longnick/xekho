# 2026-06-25 22:57 +07 - Android native queue import/export restore preview Sprint 16

## Scope

- Keep POS queue behavior local-only.
- Harden queue snapshot restore/import UX with validation errors, corrupt snapshot preview, and import/export preview.
- Do not add Room, database files, Firestore sync, background sync, production POS writes, service accounts, `.env`, customer/payment data, or migrations.

## Changes

- Extended `android-native/app/src/main/java/com/xekho/pos/domain/Models.kt` with snapshot UX models:
  - `OfflineQueueSnapshotValidationStatus`
  - `OfflineQueueSnapshotValidationPreview`
  - `OfflineQueueSnapshotExportPreview`
  - `OfflineQueueSnapshotImportPreview`
- Extended `GuardedOfflineQueuePersistenceBoundary`:
  - `validateSnapshot(snapshot)` detects valid, empty, corrupt, and unsupported local-only snapshots.
  - `restoreLocalSnapshot(snapshot)` now validates first and blocks corrupt/unsupported restores.
  - `previewExport(snapshot)` creates a copyable `XK_QUEUE_SNAPSHOT_V1` / `LOCAL_ONLY` text preview.
  - `previewImport(copyableText)` parses preview text and rejects tampered/corrupt import text.
- Extended `OfflineQueuePersistenceBoundaryTest` with coverage for:
  - corrupt encoded rows blocked from restore
  - export copyable preview markers
  - valid import preview parsing
  - tampered import preview rejection
  - all new paths staying no Room/DB, no Firestore sync, no production write
- Wired Tables UI with local-only import/export UX:
  - `Validate snapshot`
  - `Export preview`
  - `Snapshot import/export text` field
  - `Preview import`
  - `Dùng import snapshot local`
  - `Mẫu corrupt`
  - validation detail and export copy preview cards

## Verification

```bash
cd /home/longnick/projects/xekho/android-native
./gradlew :app:testDebugUnitTest --no-daemon --tests 'com.xekho.pos.domain.OfflineQueuePersistenceBoundaryTest'
# BUILD SUCCESSFUL in 26s
# BUILD SUCCESSFUL in 27s after UI wiring

./gradlew clean :app:testDebugUnitTest --no-daemon
# BUILD SUCCESSFUL in 38s

./gradlew :app:assembleDebug --no-daemon
# BUILD SUCCESSFUL in 25s

unzip -l app/build/outputs/apk/debug/app-debug.apk | grep -Ei '(^|/)(google-services\.json|.*\.env|serviceAccount|firebase-adminsdk|secret|functions-list\.json)$' || true
# no matches

sha256sum app/build/outputs/apk/debug/app-debug.apk
# d497c6585e7b6136e2e6c3f743675f2278d3959874285857b797766ae09bd754  app/build/outputs/apk/debug/app-debug.apk

cd /home/longnick/projects/xekho
npm run check
npm test -- --runInBand
npm run build:hosting
# check passed; Jest 2 suites / 12 tests passed; hosting dist prepared with 108 files (1.84 MB)
```

## Safety notes

- Restore/import preview remains local-only and validates before restoring.
- Corrupt or unsupported snapshots are blocked and restore to empty local state only.
- Import/export text is for copy/preview only; no file/database persistence was added.
- Existing untracked `.understand-anything/` was not touched.

## Next suggested sprint

Sprint 17: guarded real local storage prep boundary (for example DataStore/Room selection design + dependency gate) while still keeping actual Room/DB writes blocked until explicitly approved.
