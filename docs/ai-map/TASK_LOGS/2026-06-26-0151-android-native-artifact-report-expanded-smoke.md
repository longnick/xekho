# 2026-06-26 01:51 +07 - Android native artifact report + expanded smoke Sprint 24

## Scope
- Repo: `/home/longnick/projects/xekho`
- Branch: `task/kilo-fix-20260623-050807`
- Request: `Làm sprint 24 cả 2 hướng`
- Risk level: low; release metadata + test-only harness expansion, no production runtime writes.

## Pre-state
- Dirty files before task: existing untracked `.understand-anything/` only.
- Related docs read: Android native migration reference, code-memory rules, current build Gradle, Sprint 23 smoke harness.
- Backup dir: `/home/longnick/backups/xekho-sprint24-artifact-smoke-20260625-1846`

## Goal
Do both Sprint 24 directions: prepare a clear APK artifact/version report, and broaden the server-side native UI smoke coverage for Settings, Inventory, and Finance before real-device testing.

## Code Anchors
- `android-native/app/build.gradle.kts::defaultConfig` — bumped debug/pre-alpha metadata to `versionCode = 24`, `versionName = "0.24.0-alpha24"`.
- `android-native/app/src/test/java/com/xekho/pos/release/NativeArtifactReporter.kt::buildReport()` — test-only artifact report for application id, version, debug APK path, scan pattern, and safety flags. Marker: `Sprint 24 Android native artifact report`.
- `android-native/app/src/test/java/com/xekho/pos/release/NativeArtifactReportTest.kt` — targeted artifact metadata/safety tests.
- `android-native/app/src/test/java/com/xekho/pos/ui/NativeUiServerSmokeHarness.kt::evaluate()` — broadened required markers to Settings/Inventory/Finance and decodes `\uXXXX` source escapes before checking Vietnamese UI text.
- `android-native/app/src/test/java/com/xekho/pos/ui/NativeUiServerSmokeHarnessTest.kt` — added Settings/Inventory/Finance smoke assertions.

## Files Changed
- `android-native/app/build.gradle.kts` — version metadata bumped for Sprint 24 alpha artifact.
- `android-native/app/src/test/java/com/xekho/pos/release/NativeArtifactReporter.kt` — new test-only artifact reporter.
- `android-native/app/src/test/java/com/xekho/pos/release/NativeArtifactReportTest.kt` — new tests for artifact metadata and safety flags.
- `android-native/app/src/test/java/com/xekho/pos/ui/NativeUiServerSmokeHarness.kt` — expanded markers and unicode-escape decoding.
- `android-native/app/src/test/java/com/xekho/pos/ui/NativeUiServerSmokeHarnessTest.kt` — expanded smoke tests.
- `docs/android-native-build.md` and `docs/ai-map/*` — documentation updates.

## Verification
- `./gradlew :app:testDebugUnitTest --no-daemon --tests 'com.xekho.pos.release.NativeArtifactReportTest' --tests 'com.xekho.pos.ui.NativeUiServerSmokeHarnessTest'`
  - RED first: unresolved `NativeArtifactReporter`.
  - GREEN after implementation/fix: `BUILD SUCCESSFUL in 24s`.
- `./gradlew clean :app:testDebugUnitTest --no-daemon` → `BUILD SUCCESSFUL in 41s`.
- `./gradlew :app:assembleDebug --no-daemon` → `BUILD SUCCESSFUL in 28s`.
- `unzip -l app/build/outputs/apk/debug/app-debug.apk | grep -Ei '(^|/)(google-services\.json|.*\.env|serviceAccount|firebase-adminsdk|secret|functions-list\.json)$' || true` → `APK_SCAN_NO_MATCHES`.
- `sha256sum app/build/outputs/apk/debug/app-debug.apk` → `f583466d09c3b47fef5b7094585a2eef50b52edd6c67115b99fc20080c73b120`.
- `ls -lh app/build/outputs/apk/debug/app-debug.apk` → 14M.
- `npm run check` → passed.
- `npm test -- --runInBand` → 2 suites / 12 tests passed.
- `npm run build:hosting` → hosting dist prepared with 118 files (1.87 MB).

## Safety notes
- No `google-services.json` added.
- No service account, `.env`, customer/payment data, migrations, or raw production POS data touched.
- No `FirebaseFirestore.getInstance()` or `.get().await()` call added.
- No production write/sync/background worker added.
- Release signing is still not enabled; Sprint 24 reports debug artifact only.
- Existing untracked `.understand-anything/` was not touched.

## Handoff / Continue Here
- Current state: Sprint 24 version/artifact report + expanded server-side smoke are implemented and verified.
- APK artifact: `android-native/app/build/outputs/apk/debug/app-debug.apk` (debug, unsigned with debug key), SHA256 `f583466d09c3b47fef5b7094585a2eef50b52edd6c67115b99fc20080c73b120`, size 14M.
- Next safe step: Sprint 25 can add a copyable APK delivery/report command or prepare emulator tooling if server supports it; real Firebase reads/writes remain blocked without explicit approval.

## Rollback
- Restore pre-task files from `/home/longnick/backups/xekho-sprint24-artifact-smoke-20260625-1846`.
- Or revert the Sprint 24 commit once created.
