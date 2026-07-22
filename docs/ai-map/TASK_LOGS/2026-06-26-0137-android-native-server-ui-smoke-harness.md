# 2026-06-26 01:37 +07 - Android native server-side UI smoke harness Sprint 23

## Scope
- Repo: `/home/longnick/projects/xekho`
- Branch: `task/kilo-fix-20260623-050807`
- Request: `Ok duyệt làm 23`
- Risk level: low; test-only harness, no app runtime behavior change.

## Pre-state
- Dirty files before task: existing untracked `.understand-anything/` only.
- Related docs read: Android native migration reference and code-memory rules.
- Relevant source files read: `android-native/app/build.gradle.kts`, `android-native/gradle/libs.versions.toml`, `AppRoot.kt`, previous Sprint 22 state.
- Backup dir: `/home/longnick/backups/xekho-sprint23-server-ui-smoke-20260625-1831`

## Goal
Add a server-side Android native UI smoke harness that can run on this server without Android emulator and without installing the APK. The harness should validate important UI markers and forbidden dangerous copy before device testing.

## Code Anchors
- `android-native/app/src/test/java/com/xekho/pos/ui/NativeUiServerSmokeHarness.kt::NativeUiServerSmokeHarness.evaluate()` — reads source markers for AppBrand/AppRoot/checklist and returns a server-only smoke report. Marker: `Sprint 23 server-side native UI smoke harness`.
- `android-native/app/src/test/java/com/xekho/pos/ui/NativeUiServerSmokeHarnessTest.kt` — targeted JVM tests for login/PIN, core cards, Sprint 22 checklist, no APK install, no emulator, and forbidden Firestore/write/sync copy.

## Files Changed
- `android-native/app/src/test/java/com/xekho/pos/ui/NativeUiServerSmokeHarness.kt` — new test-only server-side smoke harness/report.
- `android-native/app/src/test/java/com/xekho/pos/ui/NativeUiServerSmokeHarnessTest.kt` — new targeted tests.
- `docs/ai-map/CHANGELOG_AI.md`, `TODO_AI.md`, `CODE_MAP.md`, `FILE_RELATIONS.md`, and this task log — AI map updates.

## Verification
- `./gradlew :app:testDebugUnitTest --no-daemon --tests 'com.xekho.pos.ui.NativeUiServerSmokeHarnessTest'`
  - RED first: unresolved `NativeUiServerSmokeHarness`.
  - GREEN after implementation/fix: `BUILD SUCCESSFUL in 20s`.
- `./gradlew clean :app:testDebugUnitTest --no-daemon` → `BUILD SUCCESSFUL in 40s`.
- `./gradlew :app:assembleDebug --no-daemon` → `BUILD SUCCESSFUL in 27s`.
- `unzip -l app/build/outputs/apk/debug/app-debug.apk | grep -Ei '(^|/)(google-services\.json|.*\.env|serviceAccount|firebase-adminsdk|secret|functions-list\.json)$' || true` → `APK_SCAN_NO_MATCHES`.
- `sha256sum app/build/outputs/apk/debug/app-debug.apk` → `ea51f68f623224f2f3f3a234b19f04db4ad67c55ab5f96efe22027f81cadfbd3`.
- `npm run check` → passed.
- `npm test -- --runInBand` → 2 suites / 12 tests passed.
- `npm run build:hosting` → hosting dist prepared with 89 files (1.79 MB).

## Safety notes
- No app runtime source changed.
- No `FirebaseFirestore.getInstance()` call added.
- No query/listener/`get()` call added.
- No `google-services.json` added.
- No emulator or APK install required for the new smoke harness.
- No production POS rows were read, sampled, returned, written, or synced.
- No service account, `.env`, customer/payment data, migrations, or background workers touched.
- Existing untracked `.understand-anything/` was not touched.

## Handoff / Continue Here
- Current state: Sprint 23 server-side UI smoke harness is implemented and verified.
- Next safe step: Sprint 24 can add release/version metadata and an APK artifact report, or add more server-side marker coverage for Settings/Inventory/Finance cards before real device testing.
- Do not touch: `.env`, service accounts, `google-services.json`, production writes/sync, migrations, customer/payment data.

## Rollback
- Test-only files can be removed: `NativeUiServerSmokeHarness.kt` and `NativeUiServerSmokeHarnessTest.kt`.
- Restore source backup if needed: `/home/longnick/backups/xekho-sprint23-server-ui-smoke-20260625-1831`.
- Or revert the Sprint 23 commit once created.
