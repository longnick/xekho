# 2026-06-26 02:08 +07 - Android native APK delivery report command Sprint 25

## Scope
- Repo: `/home/longnick/projects/xekho`
- Branch: `task/kilo-fix-20260623-050807`
- Request: `Ok làm 25`
- Risk level: low; test/release-report tooling only, no production runtime write path.

## Pre-state
- Dirty files before task: existing untracked `.understand-anything/` only.
- Related docs read: Android native migration reference and code-memory rules.
- Relevant source files read: Sprint 24 `NativeArtifactReporter.kt` and `NativeArtifactReportTest.kt`.
- Backup dir: `/home/longnick/backups/xekho-sprint25-apk-delivery-20260625-1905`

## Goal
Add a repeatable, copyable command that refreshes the native debug APK delivery report, prints a Telegram-ready `MEDIA:` line, and re-checks that the APK does not package config/secrets.

## Code Anchors
- `android-native/scripts/native-apk-report.sh` — executable report command; checks APK exists, extracts app/version metadata, SHA256, size, targeted secret/config scan status, writes markdown report, and prints it.
- `android-native/app/src/test/java/com/xekho/pos/release/NativeArtifactReporter.kt::buildReport()` — now includes Sprint 25 delivery script/report path/copyable Telegram markdown fields.
- `android-native/app/src/test/java/com/xekho/pos/release/NativeArtifactReportTest.kt::reportProvidesCopyableDeliveryCommandAndMarkdown()` — guards delivery command metadata.

## Files Changed
- `android-native/scripts/native-apk-report.sh` — new executable APK delivery/report command.
- `android-native/app/src/test/java/com/xekho/pos/release/NativeArtifactReporter.kt` — added `deliveryScript`, `reportPath`, and `copyableTelegramMarkdown` fields.
- `android-native/app/src/test/java/com/xekho/pos/release/NativeArtifactReportTest.kt` — added Sprint 25 metadata test.
- `docs/android-native-build.md`, `docs/ai-map/CHANGELOG_AI.md`, `docs/ai-map/CODE_MAP.md`, `docs/ai-map/FILE_RELATIONS.md`, `docs/ai-map/TODO_AI.md`, and this task log — documentation updates.

## Verification
- `./gradlew :app:testDebugUnitTest --no-daemon --tests 'com.xekho.pos.release.NativeArtifactReportTest'`
  - RED first: unresolved `deliveryScript`, `reportPath`, and `copyableTelegramMarkdown`.
  - GREEN after implementation: `BUILD SUCCESSFUL in 21s`.
- `bash -n scripts/native-apk-report.sh` → passed.
- `scripts/native-apk-report.sh` → generated `app/build/outputs/apk/debug/xekho-native-debug-apk-report.md`, printed `MEDIA:/home/longnick/projects/xekho/android-native/app/build/outputs/apk/debug/app-debug.apk`, scan `APK_SCAN_NO_MATCHES`.
- `./gradlew clean :app:testDebugUnitTest --no-daemon` → `BUILD SUCCESSFUL in 41s`.
- `./gradlew :app:assembleDebug --no-daemon` → `BUILD SUCCESSFUL in 28s`.
- Targeted APK scan → `APK_SCAN_NO_MATCHES`.
- `sha256sum app/build/outputs/apk/debug/app-debug.apk` → `f583466d09c3b47fef5b7094585a2eef50b52edd6c67115b99fc20080c73b120`.
- `ls -lh` → APK 14M, generated report 726 bytes.
- `npm run check` → passed.
- `npm test -- --runInBand` → 2 suites / 12 tests passed.
- `npm run build:hosting` → hosting dist prepared with 118 files (1.87 MB).

## Safety notes
- No app runtime code changed.
- No `google-services.json` added.
- No service account, `.env`, customer/payment data, migrations, or raw production POS data touched.
- No Firestore reads/writes/sync/background workers added.
- Generated markdown report remains under ignored Gradle build output.
- Existing untracked `.understand-anything/` was not touched.

## Handoff / Continue Here
- To refresh delivery info after any debug APK build:
  - `cd /home/longnick/projects/xekho/android-native && scripts/native-apk-report.sh`
- Current generated report path:
  - `/home/longnick/projects/xekho/android-native/app/build/outputs/apk/debug/xekho-native-debug-apk-report.md`
- Telegram delivery line:
  - `MEDIA:/home/longnick/projects/xekho/android-native/app/build/outputs/apk/debug/app-debug.apk`
- Next safe Sprint 26: add real-device/manual QA checklist and install instructions, or emulator readiness probing if the server gets emulator/AVD support. Real Firebase reads/writes still need explicit approval.

## Rollback
- Remove `android-native/scripts/native-apk-report.sh` and revert reporter/test docs.
- Or restore backups from `/home/longnick/backups/xekho-sprint25-apk-delivery-20260625-1905`.
