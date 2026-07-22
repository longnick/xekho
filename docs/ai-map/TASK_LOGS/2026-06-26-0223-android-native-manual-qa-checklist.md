# 2026-06-26 02:23 +07 - Android native manual QA checklist Sprint 26

## Scope
- Repo: `/home/longnick/projects/xekho`
- Branch: `task/kilo-fix-20260623-050807`
- Request: `Ok làm 26`
- Risk level: low; test/documentation checklist only, no app runtime behavior change.

## Pre-state
- Dirty files before task: existing untracked `.understand-anything/` only.
- Related docs read: Android native migration reference and code-memory rules.
- Relevant source files read: Sprint 25 APK delivery report script/reporter/test.
- Backup dir: `/home/longnick/backups/xekho-sprint26-manual-qa-20260625-1920`

## Goal
Add a real-device/manual QA checklist and install instructions for the native debug APK so device testing can proceed safely without enabling Firebase reads/writes/sync or release signing.

## Code Anchors
- `android-native/app/src/test/java/com/xekho/pos/release/NativeManualQaChecklistReporter.kt` — test-side manual QA checklist DTO/reporter.
- `android-native/app/src/test/java/com/xekho/pos/release/NativeManualQaChecklistTest.kt` — guards install steps, core manual smoke path, and blocked production/Firestore flags.
- `docs/android-native-manual-qa.md` — human-facing manual QA/install checklist.

## Files Changed
- `android-native/app/src/test/java/com/xekho/pos/release/NativeManualQaChecklistReporter.kt` — new test-only checklist reporter.
- `android-native/app/src/test/java/com/xekho/pos/release/NativeManualQaChecklistTest.kt` — new tests.
- `docs/android-native-manual-qa.md` — new manual QA checklist/install doc.
- `docs/android-native-build.md`, `docs/ai-map/CHANGELOG_AI.md`, `docs/ai-map/CODE_MAP.md`, `docs/ai-map/FILE_RELATIONS.md`, `docs/ai-map/TODO_AI.md`, and this task log — documentation updates.

## Verification
- `./gradlew :app:testDebugUnitTest --no-daemon --tests 'com.xekho.pos.release.NativeManualQaChecklistTest'`
  - RED first: unresolved `NativeManualQaChecklistReporter`.
  - GREEN after implementation/fix: `BUILD SUCCESSFUL in 20s`.
- `./gradlew clean :app:testDebugUnitTest --no-daemon` → `BUILD SUCCESSFUL in 40s`.
- `./gradlew :app:assembleDebug --no-daemon` → `BUILD SUCCESSFUL in 27s`.
- `scripts/native-apk-report.sh` → printed report with `APK_SCAN_NO_MATCHES` and `MEDIA:/home/longnick/projects/xekho/android-native/app/build/outputs/apk/debug/app-debug.apk`.
- Targeted APK scan → `APK_SCAN_NO_MATCHES`.
- `sha256sum app/build/outputs/apk/debug/app-debug.apk` → `f583466d09c3b47fef5b7094585a2eef50b52edd6c67115b99fc20080c73b120`.
- `npm run check` → passed.
- `npm test -- --runInBand` → 2 suites / 12 tests passed.
- `npm run build:hosting` → hosting dist prepared with 119 files (1.87 MB).

## Safety notes
- No app runtime code changed.
- No `google-services.json` added.
- No service account, `.env`, customer/payment data, migrations, or raw production POS data touched.
- No Firestore reads/writes/sync/background workers added.
- Release signing remains blocked/not required for debug manual QA artifact.
- Existing untracked `.understand-anything/` was not touched.

## Handoff / Continue Here
- Manual QA doc: `docs/android-native-manual-qa.md`.
- Build/report before device testing:
  - `cd /home/longnick/projects/xekho/android-native && ./gradlew :app:assembleDebug --no-daemon && scripts/native-apk-report.sh`
- Telegram delivery line:
  - `MEDIA:/home/longnick/projects/xekho/android-native/app/build/outputs/apk/debug/app-debug.apk`
- Demo PIN: `1234`.
- Next safe Sprint 27: add a structured manual QA result capture/report template or probe emulator/ADB readiness; real Firebase reads/writes still need explicit approval.

## Rollback
- Remove `NativeManualQaChecklistReporter.kt`, `NativeManualQaChecklistTest.kt`, and `docs/android-native-manual-qa.md`, then revert docs.
- Or restore backups from `/home/longnick/backups/xekho-sprint26-manual-qa-20260625-1920`.
