# 2026-06-26 00:16 +07 - Android native Firestore read-only UI mapping Sprint 21

## Scope

- Add read-only mapping adapters from blocked Firestore previews to native UI DTOs.
- Keep zero production rows and no Firestore execution.
- Do not instantiate Firestore, do not run `get()`/listeners/queries, do not read/sample production rows, do not write, and do not sync.

## Changes

- Added UI mapping models in `android-native/app/src/main/java/com/xekho/pos/domain/Models.kt`:
  - `PosFirestoreReadOnlyUiSummary`
  - `PosFirestoreReadOnlyUiRow`
  - `PosFirestoreReadOnlyDashboardState`
- Added `FirestoreReadOnlyUiMappingAdapter.kt`:
  - `fromRepositoryPreview(...)`
  - `fromCollectionPreview(...)`
  - `dashboardState(...)`
- Adapter maps blocked repository previews into UI-safe DTOs:
  - collection names and required field labels only
  - `sampleRowCount = 0`
  - `didExecuteRead = false`
  - `didReadProductionData = false`
  - `canWriteToProduction = false`
  - `canSyncToFirestore = false`
- Added `FirestoreReadOnlyUiMappingAdapterTest` covering repository summary mapping, collection row mapping, dashboard state mapping, and unknown collection handling.
- Wired Tables UI with `Firestore UI mapping Sprint 21` card.

## Verification

```bash
cd /home/longnick/projects/xekho/android-native
./gradlew :app:testDebugUnitTest --no-daemon --tests 'com.xekho.pos.domain.FirestoreReadOnlyUiMappingAdapterTest'
# RED first: unresolved FirestoreReadOnlyUiMappingAdapter
# GREEN after implementation: BUILD SUCCESSFUL in 28s

./gradlew clean :app:testDebugUnitTest --no-daemon
# BUILD SUCCESSFUL in 40s

./gradlew :app:assembleDebug --no-daemon
# BUILD SUCCESSFUL in 27s

unzip -l app/build/outputs/apk/debug/app-debug.apk | grep -Ei '(^|/)(google-services\.json|.*\.env|serviceAccount|firebase-adminsdk|secret|functions-list\.json)$' || true
# no matches

sha256sum app/build/outputs/apk/debug/app-debug.apk
# cb67a557b34f1440e1dff4c17b9a973c75b08bd9f29ab7e84051a29876e71661  app/build/outputs/apk/debug/app-debug.apk

cd /home/longnick/projects/xekho
npm run check
npm test -- --runInBand
npm run build:hosting
# check passed; Jest 2 suites / 12 tests passed; hosting dist prepared with 113 files (1.85 MB)
```

## Safety notes

- UI mapping consumes blocked preview DTOs only.
- No `FirebaseFirestore.getInstance()` call.
- No query/listener/`get()` call.
- No Firestore instance is created by the adapter.
- No `google-services.json` was added.
- No production POS rows were read, sampled, returned, written, or synced.
- No service account, `.env`, customer/payment data, migrations, or background workers touched.
- Existing untracked `.understand-anything/` was not touched.

## Next suggested sprint

Sprint 22: add a guarded local-config/read-approval checklist UI state for a future real read sprint, still no real Firestore execution; or pause here for iPhone/Safari APK smoke verification.
