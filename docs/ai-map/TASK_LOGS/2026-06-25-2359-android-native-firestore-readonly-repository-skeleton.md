# 2026-06-25 23:59 +07 - Android native Firestore read-only repository skeleton Sprint 20

## Scope

- Add a guarded Firestore read-only repository skeleton/factory.
- Repository returns blocked metadata previews only by default.
- Keep real Firestore reads blocked even when approval/config/read-execution flags are modeled as present.
- Do not instantiate Firestore, do not run `get()`/listeners/queries, do not read/sample production rows, do not write, and do not sync.

## Changes

- Added repository models in `android-native/app/src/main/java/com/xekho/pos/domain/Models.kt`:
  - `PosFirestoreReadOnlyRepositoryMode`
  - `PosFirestoreReadOnlyRepositoryRequest`
  - `PosFirestoreReadOnlyCollectionPreview`
  - `PosFirestoreReadOnlyRepositoryPreview`
- Added `GuardedFirestoreReadOnlyRepository.kt`:
  - `PosFirestoreReadOnlyRepository` interface
  - `BlockedFirestoreReadOnlyRepository`
  - `GuardedFirestoreReadOnlyRepositoryFactory.defaultRepository(...)`
  - `GuardedFirestoreReadOnlyRepositoryFactory.fromRequest(...)`
- Factory behavior:
  - default repository is `BLOCKED_PREVIEW_ONLY`
  - missing owner approval/config/SDK/read-execution flag stays blocked
  - even all flags present returns `APPROVAL_HELD_PREVIEW_ONLY` in Sprint 20
- Added `FirestoreReadOnlyRepositoryFactoryTest` covering default blocked repo, collection previews, all-flags approval-held path, and per-collection blocked preview.
- Wired Tables UI with `Firestore repository Sprint 20` card.

## Verification

```bash
cd /home/longnick/projects/xekho/android-native
./gradlew :app:testDebugUnitTest --no-daemon --tests 'com.xekho.pos.domain.FirestoreReadOnlyRepositoryFactoryTest'
# RED first: unresolved GuardedFirestoreReadOnlyRepositoryFactory / PosFirestoreReadOnlyRepositoryMode / PosFirestoreReadOnlyRepositoryRequest
# GREEN after implementation: BUILD SUCCESSFUL in 28s

./gradlew clean :app:testDebugUnitTest --no-daemon
# BUILD SUCCESSFUL in 39s

./gradlew :app:assembleDebug --no-daemon
# BUILD SUCCESSFUL in 28s

unzip -l app/build/outputs/apk/debug/app-debug.apk | grep -Ei '(^|/)(google-services\.json|.*\.env|serviceAccount|firebase-adminsdk|secret|functions-list\.json)$' || true
# no matches

sha256sum app/build/outputs/apk/debug/app-debug.apk
# e7bf2570538e7c17b5bd8c1286e8fe2f765e61863f019f667dcb43ec0614e46b  app/build/outputs/apk/debug/app-debug.apk

cd /home/longnick/projects/xekho
npm run check
npm test -- --runInBand
npm run build:hosting
# check passed; Jest 2 suites / 12 tests passed; hosting dist prepared with 112 files (1.85 MB)
```

## Safety notes

- No `FirebaseFirestore.getInstance()` call.
- No query/listener/`get()` call.
- No Firestore instance is created by the repository.
- No `google-services.json` was added.
- No production POS rows were read, sampled, returned, written, or synced.
- No service account, `.env`, customer/payment data, migrations, or background workers touched.
- Existing untracked `.understand-anything/` was not touched.

## Next suggested sprint

Sprint 21: add read-only mapping adapters from blocked previews to native UI DTOs, still using zero production rows and no Firestore execution; or wait for explicit approval/local config before any real read sprint.
