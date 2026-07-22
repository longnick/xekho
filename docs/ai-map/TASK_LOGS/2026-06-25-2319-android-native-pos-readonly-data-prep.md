# 2026-06-25 23:19 +07 - Android native POS read-only data prep Sprint 18

## Scope

- Follow Sprint 18 direction 2: prepare read-only Firebase/POS data visibility boundary.
- Keep default app data fake/local.
- Do not add Firestore SDK dependency, do not read production data, do not write production data, do not sync, and do not touch service accounts, `.env`, customer/payment data, or migrations.

## Changes

- Added read-only data prep models in `android-native/app/src/main/java/com/xekho/pos/domain/Models.kt`:
  - `PosReadOnlyDataSource`
  - `PosReadOnlyDataReadinessStatus`
  - `PosReadOnlyDataRequest`
  - `PosReadOnlyDataReadiness`
  - `PosReadOnlyDataPreview`
- Added `GuardedPosReadOnlyDataBoundary`:
  - default request uses fake/local data only
  - Firebase read-only request blocks when owner approval/config/SDK are missing
  - even when read-only flags are present, Sprint 18 remains prep-only and does not read Firestore
  - fake/local preview maps existing `DashboardSnapshot` counts/revenue without production reads
  - Firebase read-only preview returns zero rows and a blocked status
- Added `PosReadOnlyDataBoundaryTest` covering fake/default path, blocked Firebase request, prep-only all-flags-present path, fake preview counts, and blocked Firebase preview.
- Wired Tables UI with:
  - `POS data prep Sprint 18`
  - `Firebase read-only guard`

## Verification

```bash
cd /home/longnick/projects/xekho/android-native
./gradlew :app:testDebugUnitTest --no-daemon --tests 'com.xekho.pos.domain.PosReadOnlyDataBoundaryTest'
# BUILD SUCCESSFUL in 27s / 28s after UI wiring

./gradlew clean :app:testDebugUnitTest --no-daemon
# BUILD SUCCESSFUL in 39s

./gradlew :app:assembleDebug --no-daemon
# BUILD SUCCESSFUL in 25s

unzip -l app/build/outputs/apk/debug/app-debug.apk | grep -Ei '(^|/)(google-services\.json|.*\.env|serviceAccount|firebase-adminsdk|secret|functions-list\.json)$' || true
# no matches

sha256sum app/build/outputs/apk/debug/app-debug.apk
# 8fc50747b0a78c9862b08a89dba891a68a1c6c4a6890349eea176940cc1c95c7  app/build/outputs/apk/debug/app-debug.apk

cd /home/longnick/projects/xekho
npm run check
npm test -- --runInBand
npm run build:hosting
# check passed; Jest 2 suites / 12 tests passed; hosting dist prepared with 110 files (1.84 MB)
```

## Safety notes

- No Firestore SDK dependency was added.
- No Firestore read was performed.
- No production POS data rows were returned.
- No production writes, sync, background worker, service account, `.env`, customer/payment data, or migrations touched.
- Existing untracked `.understand-anything/` was not touched.

## Next suggested sprint

Sprint 19: add compile-time Firestore read-only SDK marker/gate and collection contract models for tables/inventory/history, still without executing Firestore reads unless explicitly approved.
