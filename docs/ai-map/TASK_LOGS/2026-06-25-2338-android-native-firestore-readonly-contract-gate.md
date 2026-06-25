# 2026-06-25 23:38 +07 - Android native Firestore read-only contract gate Sprint 19

## Scope

- Add compile-time Firestore read-only SDK marker/gate.
- Add local collection contract models for future `tables`, `inventory`, and `history` read-only visibility.
- Keep read execution blocked: no Firestore query, no production POS rows, no sync, no writes.

## Changes

- Added `firebase-firestore` alias in `android-native/gradle/libs.versions.toml`.
- Added `implementation(libs.firebase.firestore)` in `android-native/app/build.gradle.kts` under the existing Firebase BoM.
- Added `FirestoreReadOnlySdkMarker` referencing `FirebaseFirestore::class.java` so compile-time SDK linkage is explicit.
- Added read-only contract models in `Models.kt`:
  - `PosFirestoreReadOnlyCollectionContract`
  - `PosFirestoreReadOnlyContractPreview`
  - `PosFirestoreReadOnlyContract`
- Added default collection contracts:
  - `tables`: `id`, `label`, `status`, `total`, `itemCount`
  - `inventory`: `id`, `name`, `currentQty`, `unit`, `status`
  - `history`: `id`, `tableId`, `total`, `closedAt`, `status`
- Updated `GuardedPosReadOnlyDataBoundary` messaging so all read-only flags + SDK marker remain Sprint 19 contract/SDK-gate only.
- Added `FirestoreReadOnlyContractTest` covering SDK marker linkage, collection contracts, local-only preview, and read-only boundary block.
- Wired Tables UI with `Firestore contract Sprint 19` card.

## Verification

```bash
cd /home/longnick/projects/xekho/android-native
./gradlew :app:testDebugUnitTest --no-daemon --tests 'com.xekho.pos.domain.FirestoreReadOnlyContractTest'
# RED first: unresolved FirestoreReadOnlySdkMarker / PosFirestoreReadOnlyContract
# GREEN after implementation: BUILD SUCCESSFUL in 29s

./gradlew clean :app:testDebugUnitTest --no-daemon
# BUILD SUCCESSFUL in 39s

./gradlew :app:assembleDebug --no-daemon
# BUILD SUCCESSFUL in 1m 30s

unzip -l app/build/outputs/apk/debug/app-debug.apk | grep -Ei '(^|/)(google-services\.json|.*\.env|serviceAccount|firebase-adminsdk|secret|functions-list\.json)$' || true
# no matches

sha256sum app/build/outputs/apk/debug/app-debug.apk
# 529e86bc9b86385b2ff13d03d2b6a4e6ae2bac0a32041f5b4f285b269d942ef1  app/build/outputs/apk/debug/app-debug.apk

cd /home/longnick/projects/xekho
npm run check
npm test -- --runInBand
npm run build:hosting
# check passed; Jest 2 suites / 12 tests passed; hosting dist prepared with 111 files (1.85 MB)
```

## Safety notes

- Firestore SDK dependency is linked, but no `FirebaseFirestore.getInstance()` or query is executed.
- No `google-services.json` was added.
- No production POS rows were read, sampled, returned, written, or synced.
- No service account, `.env`, customer/payment data, migrations, or background workers touched.
- Existing untracked `.understand-anything/` was not touched.

## Next suggested sprint

Sprint 20: add a guarded Firestore read-only repository skeleton/factory that can only return blocked previews by default; no real `get()`/listener/query execution until explicitly approved with a local config file present.
