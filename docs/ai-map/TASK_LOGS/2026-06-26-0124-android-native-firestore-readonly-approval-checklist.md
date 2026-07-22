# 2026-06-26 01:24 +07 - Android native Firestore read-only approval checklist Sprint 22

## Scope
- Repo: `/home/longnick/projects/xekho`
- Branch: `task/kilo-fix-20260623-050807`
- Request: `Làm tiếp sprint 22`
- Risk level: low/medium; Firestore read path remains blocked.

## Pre-state
- Dirty files before task: existing untracked `.understand-anything/` only.
- Related docs read: `docs/ai-map/TODO_AI.md`, previous Sprint 21 task log, Android native migration reference.
- Backup dir: `/home/longnick/backups/xekho-sprint22-firestore-checklist-20260625-1821`

## Goal
Add a guarded local-config/read-approval checklist UI state for a future real Firestore read sprint while still executing no Firestore reads and returning no production rows.

## Code Anchors
- `android-native/app/src/main/java/com/xekho/pos/domain/Models.kt::FirestoreReadOnlyApprovalChecklistRequest` — added request/checklist item/state DTOs. Marker: `FirestoreReadOnlyChecklistItemKey.OWNER_APPROVAL`.
- `android-native/app/src/main/java/com/xekho/pos/domain/GuardedFirestoreReadOnlyApprovalChecklist.kt::evaluate()` — evaluates owner approval, local config, SDK, contract, and repository review gates while forcing execution/write/sync flags false. Marker: `Sprint 22 checklist is complete but approval-held local-only.`
- `android-native/app/src/test/java/com/xekho/pos/domain/FirestoreReadOnlyApprovalChecklistTest.kt` — added RED/GREEN unit coverage for default blocked, missing approval, all flags approval-held, and item-level guards.
- `android-native/app/src/main/java/com/xekho/pos/ui/AppRoot.kt::MainDashboard()` / `TablesScreen()` — wires `Firestore approval checklist Sprint 22` card. Marker: `Firestore approval checklist Sprint 22`.

## Files Changed
- `android-native/app/src/main/java/com/xekho/pos/domain/Models.kt` — added checklist enums and DTOs.
- `android-native/app/src/main/java/com/xekho/pos/domain/GuardedFirestoreReadOnlyApprovalChecklist.kt` — added fail-closed checklist evaluator.
- `android-native/app/src/test/java/com/xekho/pos/domain/FirestoreReadOnlyApprovalChecklistTest.kt` — added targeted Sprint 22 tests.
- `android-native/app/src/main/java/com/xekho/pos/ui/AppRoot.kt` — displays the Sprint 22 checklist card in Tables.
- `docs/ai-map/CHANGELOG_AI.md`, `TODO_AI.md`, `CODE_MAP.md`, `FILE_RELATIONS.md`, and this task log — AI map updates.

## Verification
- `./gradlew :app:testDebugUnitTest --no-daemon --tests 'com.xekho.pos.domain.FirestoreReadOnlyApprovalChecklistTest'`
  - RED first: unresolved `GuardedFirestoreReadOnlyApprovalChecklist` / checklist DTOs.
  - GREEN after implementation: `BUILD SUCCESSFUL in 33s`.
- `./gradlew clean :app:testDebugUnitTest --no-daemon` → `BUILD SUCCESSFUL in 40s`.
- `./gradlew :app:assembleDebug --no-daemon` → `BUILD SUCCESSFUL in 28s`.
- `unzip -l app/build/outputs/apk/debug/app-debug.apk | grep -Ei '(^|/)(google-services\.json|.*\.env|serviceAccount|firebase-adminsdk|secret|functions-list\.json)$' || true` → `APK_SCAN_NO_MATCHES`.
- `sha256sum app/build/outputs/apk/debug/app-debug.apk` → `ea51f68f623224f2f3f3a234b19f04db4ad67c55ab5f96efe22027f81cadfbd3`.
- `npm run check` → passed.
- `npm test -- --runInBand` → 2 suites / 12 tests passed.
- `npm run build:hosting` → hosting dist prepared with 114 files (1.86 MB).

## Safety notes
- No `FirebaseFirestore.getInstance()` call.
- No query/listener/`get()` call.
- No Firestore instance is created by the checklist.
- No `google-services.json` was added.
- No production POS rows were read, sampled, returned, written, or synced.
- No service account, `.env`, customer/payment data, migrations, or background workers touched.
- Existing untracked `.understand-anything/` was not touched.

## Handoff / Continue Here
- Current state: Sprint 22 checklist UI is implemented and verified.
- Next safe step: Sprint 23 can either pause for APK smoke/release signing/versioning prep or add the next explicit owner-approved read-only boundary if you decide to move toward real Firestore reads.
- Do not touch: `.env`, service accounts, `google-services.json`, production writes/sync, migrations, customer/payment data.

## Rollback
- Restore from backup: `/home/longnick/backups/xekho-sprint22-firestore-checklist-20260625-1821` for pre-task copies of `Models.kt` and `AppRoot.kt`.
- Or revert the Sprint 22 commit once created.
