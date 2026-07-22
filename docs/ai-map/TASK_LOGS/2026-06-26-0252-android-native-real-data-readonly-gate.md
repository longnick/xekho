# 2026-06-26 02:52 +07 - Android native real-data read-only direction gate Sprint 28

## Scope
- Repo: `/home/longnick/projects/xekho`
- Branch: `task/kilo-fix-20260623-050807`
- User request: `Làm sprint 8, chuyển hướng data thật`
- Interpretation: continue from current Android-native Sprint 27 into Sprint 28, aiming toward real data through a guarded read-only gate.
- Risk level: medium conceptually, low implementation: domain/UI/test guard only, no real Firebase execution.

## Pre-state
- Existing untracked `.understand-anything/` only.
- Backup dir: `/home/longnick/backups/xekho-sprint28-real-data-readonly-gate-20260626-0245`.
- Current app already had Firestore contract/repository/UI/checklist previews through Sprint 22 and manual QA tooling through Sprint 27.

## Goal
Add an explicit "real data direction" gate so the native app can visibly move toward real Firebase/POS data while remaining read-only, fail-closed, and non-executing until a separate one-time approval/read sprint.

## Files changed
- `android-native/app/src/main/java/com/xekho/pos/domain/Models.kt`
  - Added `RealDataDirectionMode`, `RealDataDirectionStatus`, `RealDataDirectionItemKey`, `RealDataDirectionRequest`, `RealDataDirectionItem`, and `RealDataDirectionState`.
- `android-native/app/src/main/java/com/xekho/pos/domain/GuardedRealDataDirectionGate.kt`
  - New guarded evaluator for real-data read-only prerequisites.
- `android-native/app/src/test/java/com/xekho/pos/domain/RealDataDirectionGateTest.kt`
  - RED/GREEN tests for blocked default, partial prerequisites, all-prerequisite one-time approval-held state, and no writes/sync.
- `android-native/app/src/main/java/com/xekho/pos/ui/AppRoot.kt`
  - Adds `Real data direction Sprint 28` UI card in the Tables screen.
- `android-native/app/src/test/java/com/xekho/pos/ui/NativeUiServerSmokeHarness.kt`
  - Adds Sprint 28 UI markers to the source-smoke required marker list.
- `android-native/app/src/test/java/com/xekho/pos/ui/NativeUiServerSmokeHarnessTest.kt`
  - Adds server-smoke coverage for the real-data direction gate.
- `docs/android-native-build.md`, `docs/ai-map/CHANGELOG_AI.md`, `docs/ai-map/CODE_MAP.md`, `docs/ai-map/FILE_RELATIONS.md`, `docs/ai-map/TODO_AI.md`, and this task log.

## Code relations
- `GuardedRealDataDirectionGate` consumes `RealDataDirectionRequest` and returns `RealDataDirectionState` from `Models.kt`.
- `AppRoot.kt` evaluates the gate with current local-only markers and renders a read-only gate card.
- `NativeUiServerSmokeHarness` source-scans `AppRoot.kt` to ensure the Sprint 28 real-data gate copy is renderable and still fail-closed.
- Existing Firestore contract/repository/checklist preview classes remain the upstream metadata sources; this sprint does not instantiate Firestore.

## Decisions made
- Treat "chuyển hướng data thật" as a visible read-only direction gate, not a real Firestore read execution sprint.
- Add `manualQaResultCaptured` and explicit `userRequestedRealDataDirection` as gate prerequisites so switching toward real data has audit/context steps.
- Even with all local flags and `allowOneTimeReadExecution = true`, Sprint 28 returns `READY_FOR_ONE_TIME_APPROVAL_LOCAL_ONLY` but keeps `canExecuteReads = false` and does not instantiate/read Firestore.

## Verification
- RED: `./gradlew :app:testDebugUnitTest --no-daemon --tests 'com.xekho.pos.domain.RealDataDirectionGateTest'`
  - Failed with unresolved `GuardedRealDataDirectionGate`, `RealDataDirectionRequest`, `RealDataDirectionMode`, `RealDataDirectionStatus`, and `RealDataDirectionItemKey`.
- GREEN targeted: `./gradlew :app:testDebugUnitTest --no-daemon --tests 'com.xekho.pos.domain.RealDataDirectionGateTest'`
  - `BUILD SUCCESSFUL in 34s`.
- GREEN targeted + smoke: `./gradlew :app:testDebugUnitTest --no-daemon --tests 'com.xekho.pos.domain.RealDataDirectionGateTest' --tests 'com.xekho.pos.ui.NativeUiServerSmokeHarnessTest'`
  - `BUILD SUCCESSFUL in 21s`.
- Full native verification: `./gradlew clean :app:testDebugUnitTest --no-daemon` → `BUILD SUCCESSFUL in 41s`.
- Debug APK build: `./gradlew :app:assembleDebug --no-daemon` → `BUILD SUCCESSFUL in 27s`.
- APK report: `scripts/native-apk-report.sh` → `APK_SCAN_NO_MATCHES`.
- Targeted APK scan: `APK_SCAN_NO_MATCHES`.
- APK SHA256: `15f1ade8a603e338fc39e688778cd1d4d0688f8ed7249ba3ac53a10bda55c203`.
- Legacy web regression: `npm run check` passed; `npm test -- --runInBand` → 2 suites / 12 tests passed; `npm run build:hosting` → 121 files (1.87 MB).

## Safety notes
- No `.env`, token, service account, database migration, raw POS data, customer/payment data, or raw media touched.
- No `google-services.json` added.
- No `FirebaseFirestore.getInstance()`, query, listener, `get()`, write, sync, background worker, or production POS row read added.
- All new domain state keeps `canExecuteReads = false`, `didInstantiateFirestore = false`, `didExecuteRead = false`, `didReadProductionData = false`, `canWriteToProduction = false`, and `canSyncToFirestore = false`.

## Remaining / Next
- Commit completed Sprint 28 changes after final git diff/status check.
- Future real read sprint still requires explicit approval and a one-time read execution boundary; writes/sync remain separately blocked.
