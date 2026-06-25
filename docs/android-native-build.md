# Android Native Build Notes (PAUSED - Capacitor App Adopted)

Native Android work lives in:

```text
android-native/
```

Current scope is a Kotlin + Jetpack Compose shell only. It does not include Firebase, POS writes, production data, or service-account credentials.

## Toolchain installed on this machine

```text
OpenJDK 17.0.19
Android SDK command-line tools 21.0
Android platform-tools 37.0.0
Android SDK Platform 35
Android Build Tools 35.0.0
```

SDK path:

```text
/home/longnick/Android/Sdk
```

`android-native/local.properties` points Gradle at that SDK and is intentionally ignored by Git.

## Commands

```bash
cd /home/longnick/projects/xekho/android-native
./gradlew :app:testDebugUnitTest --no-daemon
./gradlew :app:assembleDebug --no-daemon
```

Debug APK:

```text
android-native/app/build/outputs/apk/debug/app-debug.apk
```

## Safety gate

Before continuing native work, keep root web regression green:

```bash
cd /home/longnick/projects/xekho
npm run check
npm test -- --runInBand
npm run build:hosting
```

Do not add Firebase/Firestore write logic until the dry-run and emulator-test phases are approved.
## Sprint 2 fake UI tabs

The native app currently renders fake/local-only MVP tabs:

- `Bàn`
- `Kho`
- `Tài chính`
- `Cài đặt`

Data is supplied by `FakeDashboardRepository`; there is still no Firebase SDK, Firestore read/write, service account, `.env`, or production POS data access in the APK.

Latest debug APK checksum after Sprint 2:

```text
460ec55fd3ba38efe3bda4977c2b7e2ad34b35ec8eafc8e0f62b6dcf2f891131  android-native/app/build/outputs/apk/debug/app-debug.apk
```
## Sprint 3 fake Auth/PIN

Native app now starts behind a fake/local-only PIN gate:

```text
Demo PIN: 1234
```

The gate is local-only and does not use Firebase Auth, Firestore, service accounts, `.env`, or production POS data. Unlocking exposes the existing fake `Bàn` / `Kho` / `Tài chính` / `Cài đặt` tabs. Locking returns to the PIN screen.

Latest debug APK checksum after Sprint 3:

```text
564f1a4cf569e070937f0c84fd3be1887f9b43e5a8a88f63963f5ed76fe3a53a  android-native/app/build/outputs/apk/debug/app-debug.apk
```
## Sprint 4 AuthRepository boundary

Native auth is now behind an `AuthRepository` interface. The app still defaults to `FakeAuthRepository`, while `BlockedFirebaseAuthRepository` and `FirebaseAuthConfigGuard` define a fail-closed Firebase Auth boundary for future sprints.

Sprint 4 intentionally does **not** add Firebase Auth SDK, `google-services.json`, Firestore, `.env`, service accounts, or production POS data.

Latest debug APK checksum after Sprint 4:

```text
5c5dde993a42d52fea8f9d5d67a667f3236d2760a7b4dd04c990ec03c8f288d9  android-native/app/build/outputs/apk/debug/app-debug.apk
```
## Sprint 5 Firebase Auth SDK prep

Native app now includes Firebase Auth SDK dependency for compile-time preparation only. Real Firebase Auth remains blocked by `FirebaseAuthConfigGuard`.

Important safety state:

- `android-native/**/google-services.json` is ignored.
- Google Services Gradle plugin is registered with `apply false` only.
- `:app` does not apply Google Services plugin yet.
- No Firebase Auth sign-in calls or Firestore code are wired.

Latest debug APK checksum after Sprint 5:

```text
2f56eb6faae4b4e7470db4fc834670e86c26b5e9c5043cf0f36fb31638a9f9eb  android-native/app/build/outputs/apk/debug/app-debug.apk
```
## Sprint 6 FirebaseAuthRepository skeleton

Native app now contains a `FirebaseAuthRepository` class shaped like the future real auth adapter, but it is still guard-blocked and never used by the default app path.

Important safety state:

- `AppRoot` defaults to `AuthRepositoryFactory.defaultRepository()`.
- `AuthRepositoryFactory.defaultRepository()` returns `FakeAuthRepository()`.
- `FirebaseAuthRepository` requires injected `FirebaseAuth` and `FirebaseAuthReadiness`, but does not call Firebase APIs.
- `FirebaseAuthConfigGuard` still returns `canUseRealFirebase = false`.
- No Firestore dependencies or reads/writes are wired.

Latest debug APK checksum after Sprint 6:

```text
6bbaaf191a0d18d1654bbaaa8a2d93ae0457671d6f83ea9f79bfe51089e2c32c  android-native/app/build/outputs/apk/debug/app-debug.apk
```
## Sprint 7 runtime auth selection

Native app now has an explicit runtime auth selection model:

```text
AuthRuntimeMode.FAKE_LOCAL
AuthRuntimeMode.FIREBASE_AUTH
AuthRuntimeConfig
AuthRuntimeSelector
```

Safety state:

- `AuthRuntimeConfig()` defaults to `FAKE_LOCAL`.
- `AuthRepositoryFactory.defaultRepository()` calls `fromRuntimeConfig()` with the default config and still returns `FakeAuthRepository()`.
- Requesting `FIREBASE_AUTH` routes through `FirebaseAuthConfigGuard`; current guard always returns `canUseRealFirebase = false`, so repository selection returns `BlockedFirebaseAuthRepository`.
- No Firestore dependencies or reads/writes are wired.

Latest debug APK checksum after Sprint 7:

```text
ab8098bb31bc7658acef978d5d450e68f3baff46031664bf50341a4b4a85ffaa  android-native/app/build/outputs/apk/debug/app-debug.apk
```
## Sprint 8 auth readiness report

Settings now displays a read-only auth readiness report from `AuthReadinessReporter`.

Default display state:

```text
Auth: FAKE_LOCAL active
Firebase: blocked — default fake/local auth
google-services.json: not present
```

Safety state:

- report is local/read-only
- default auth remains `FAKE_LOCAL`
- no Firebase Auth sign-in is wired
- no Firestore dependencies or reads/writes are wired

Latest debug APK checksum after Sprint 8:

```text
c58ab6f07135b138f9026210938db280acd3bd2d1dbb4a68f2a77ac19872913f  android-native/app/build/outputs/apk/debug/app-debug.apk
```
## Sprint 9 local config metadata

Native build now exposes local `google-services.json` presence through BuildConfig metadata:

```text
BuildConfig.GOOGLE_SERVICES_JSON_PRESENT
BuildConfig.FIREBASE_LOCAL_CONFIG_SOURCE = "BuildConfig"
```

The value is derived from:

```kotlin
val googleServicesJsonPresent = file("google-services.json").exists()
```

Settings reads it through:

```kotlin
FirebaseLocalConfigMetadata.fromBuildConfig()
```

Safety state:

- `google-services.json` remains untracked/ignored and absent from committed repo
- Google Services plugin is still not applied to `:app`
- default auth remains `FAKE_LOCAL`
- Firebase Auth sign-in and Firestore remain unwired

Latest debug APK checksum after Sprint 9:

```text
ed86e63821a63edc70bb1ce7a2a808e624530ba59e67efc2cbbf2bdd3b047d1d  android-native/app/build/outputs/apk/debug/app-debug.apk
```
## Sprint 10A POS fake write flow

Native POS tab now has a local-only fake write flow:

```text
Mở lại       -> open local order for ban-02
+ Miến       -> add/merge local demo item
Đóng local   -> mark order CLOSED_LOCAL_ONLY
```

Safety state:

- `FakePosWriteRepository` has no Firebase/Firestore dependency
- `PosLocalOrder.canWriteToProduction = false`
- `PosWriteResult.canWriteToProduction = false`
- UI labels explicitly say no Firestore, no production write, no sync
- local order state uses `rememberSaveable` with `posLocalOrderSaver`

Latest debug APK checksum after Sprint 10A:

```text
b3c18fe00c33d9a3f797e17bb231ec536ee0f236c0b4c1b8cd2527ac8e4e364d  android-native/app/build/outputs/apk/debug/app-debug.apk
```
## Sprint 10B POS local cart edit flow

Native POS tab now supports a local-only menu/cart edit flow:

```text
Thêm      -> add local menu item
+         -> increase local quantity
-         -> decrease local quantity; zero removes item
Xóa       -> remove local item
Xóa giỏ   -> clear local cart
```

Safety state:

- `FakePosWriteRepository` still has no Firebase/Firestore dependency
- all cart edit results keep `canWriteToProduction = false`
- UI labels explicitly say no Firestore, no production write, no sync
- local order state continues through `rememberSaveable(posLocalOrderSaver)`

Latest debug APK checksum after Sprint 10B:

```text
4b881b6d9fc8dec0c7354be3241caafae8dcf2cd881deaa701b48945e521a2d0  android-native/app/build/outputs/apk/debug/app-debug.apk
```
## Sprint 10C POS local payment draft preview

Native POS tab now shows a local-only payment draft preview derived from local cart state:

```text
PaymentMethod.CASH
PaymentMethod.BANK_TRANSFER
PaymentDraft(subtotal, discount, totalDue, itemCount, receiptPreview)
```

Safety state:

- `previewPayment()` has no Firebase/Firestore dependency
- discount clamps to `[0, subtotal]`
- `PaymentDraft.canWriteToProduction = false`
- `PaymentDraft.canSyncToFirestore = false`
- UI labels explicitly say no production write and no Firestore sync
- payment draft is derived from `rememberSaveable` local order state

Latest debug APK checksum after Sprint 10C:

```text
0d0dbd14b15e8e90bda786a1906ef54b814a53ea991b14651a946d5ce2665eaf  android-native/app/build/outputs/apk/debug/app-debug.apk
```
## Sprint 10D POS local payment close transition

Native POS tab can now close a payment draft locally:

```text
PaymentCloseStatus.CLOSED_LOCAL_ONLY
PaymentCloseStatus.NOT_PAYABLE_LOCAL_ONLY
PaymentCloseResult(order, draft, localReceiptNumber)
PosOrderStatus.PAID_LOCAL_ONLY
```

Safety state:

- `closePaymentDraft()` only pays an `OPEN` order with payable local draft
- empty, zero, already closed, or already paid local orders stay not-payable local-only
- terminal local orders cannot be edited by add/increase/decrease/remove/clear
- `PaymentCloseResult.canWriteToProduction = false`
- `PaymentCloseResult.canSyncToFirestore = false`
- UI labels explicitly say no production write and no Firestore sync
- local close message is retained with `rememberSaveable`

Latest debug APK checksum after Sprint 10D:

```text
1235175909b5c912caf872750aee8d5d49a4c000ca50eba3552f30898998084d  android-native/app/build/outputs/apk/debug/app-debug.apk
```
## Sprint 11 POS multi-table local orders

Native POS tab now keeps one local order per fake table:

```text
PosTableOrderState(selectedTableId, ordersByTable, tableLabelsById)
FakePosTableOrderRepository.initialState/selectTable/replaceSelectedOrder/tableSummaries
```

Safety state:

- table selection and order replacement are local-only
- each table has independent `PosLocalOrder`
- replacing an order only affects the selected table and rejects mismatched table ids
- `PosTableOrderState.canWriteToProduction = false`
- `PosTableOrderState.canSyncToFirestore = false`
- `rememberSaveable` uses `posTableOrderStateSaver`
- saver delimiters are separated: table row `\u001d`, item `\u001e`, item field `\u001f`
- UI labels explicitly say no production write and no Firestore sync

Latest debug APK checksum after Sprint 11:

```text
b5623b2ee8d3766685a1e0a8c9b642db0d21e4778428401535366dafa821b7f2  android-native/app/build/outputs/apk/debug/app-debug.apk
```
## Sprint 12 POS offline queue draft

Native POS tab now has a guarded local-only offline queue draft:

```text
OfflineQueueStatus(QUEUED_LOCAL_ONLY, BLOCKED_LOCAL_ONLY)
OfflineQueueItem(localQueueId, tableId, localReceiptNumber, status, totalDue, itemCount, payloadPreview)
OfflineQueueState(items)
FakeOfflineQueueRepository.draftFromPaymentClose/appendDraft/clearLocalQueue
```

Safety state:

- queue items are generated only from local payment-close results
- not-payable results become `BLOCKED_LOCAL_ONLY`
- queued items are in memory/UI only, not Firestore, not background sync, not production write
- repeated appends dedupe by `localQueueId`
- `OfflineQueueItem.canWriteToProduction = false`
- `OfflineQueueItem.canSyncToFirestore = false`
- `OfflineQueueState.canWriteToProduction = false`
- `OfflineQueueState.canSyncToFirestore = false`
- `rememberSaveable` uses `offlineQueueStateSaver`
- UI labels explicitly say no production write and no Firestore sync

Latest debug APK checksum after Sprint 12:

```text
1ef44876c8bf86de9a3a12f340d94f593569b1f5765f2043fe1e91c1e1511f96  android-native/app/build/outputs/apk/debug/app-debug.apk
```
## Sprint 13 POS queue filters / retry preview

Native POS queue now supports local-only filters and retry preview:

```text
OfflineQueueStatus.RETRY_PREVIEW_LOCAL_ONLY
OfflineQueueFilter(ALL, QUEUED, BLOCKED, RETRY_PREVIEW)
FakeOfflineQueueRepository.filterItems/retryPreview
```

Safety state:

- filters only read local queue state
- retry preview only changes `BLOCKED_LOCAL_ONLY` items to `RETRY_PREVIEW_LOCAL_ONLY`
- queued or missing retry attempts do not create sync/write side effects
- no Firestore, no background worker, no persistent database, no production write
- all queue items/states keep `canWriteToProduction = false` and `canSyncToFirestore = false`
- UI labels explicitly say no production write and no Firestore sync
- filter controls are vertical to avoid mobile overflow

Latest debug APK checksum after Sprint 13:

```text
429ffe0bd5bf3a66b952a46b2c070243382da3bd19c0fe7a3c9e403b05751ab6  android-native/app/build/outputs/apk/debug/app-debug.apk
```
## Sprint 14 POS queue conflict/error detail preview

Native POS queue now supports local-only detail preview:

```text
OfflineQueueDetailType(INFO_LOCAL_ONLY, ERROR_PREVIEW_LOCAL_ONLY, CONFLICT_PREVIEW_LOCAL_ONLY)
OfflineQueueDetailPreview
FakeOfflineQueueRepository.previewDetail(state, localQueueId)
```

Safety state:

- missing queue id returns local-only error preview
- blocked queue items show local error detail and recommended action
- duplicate non-blank local receipts show conflict preview only
- healthy queued items show info-only preview
- retry-preview items show retry detail preview
- no Firestore, no background worker, no persistent database, no production write
- all detail previews keep `canWriteToProduction = false` and `canSyncToFirestore = false`
- UI labels explicitly say no production write and no Firestore sync

Latest debug APK checksum after Sprint 14:

```text
c09b15842112da3b313cc01b66d4c801bb788d41412ef6a9294a8648742f0cd2  android-native/app/build/outputs/apk/debug/app-debug.apk
```

## Sprint 15 POS queue persistence boundary

Native POS queue now has a guarded local persistence boundary:

```text
OfflineQueuePersistenceMode(LOCAL_MEMORY_ONLY, ROOM_BLOCKED_LOCAL_ONLY)
OfflineQueuePersistenceSnapshot
OfflineQueuePersistenceResult
GuardedOfflineQueuePersistenceBoundary.saveLocalSnapshot/restoreLocalSnapshot/blockedRoomPersistence/clearLocalSnapshot
```

Safety state:

- local queue snapshot save/restore only encodes/decodes local in-memory queue state
- restore sanitizes `canWriteToProduction` and `canSyncToFirestore` back to `false`
- Room/DB persistence is represented by a fail-closed `ROOM_BLOCKED_LOCAL_ONLY` result
- no Room dependency, no database file, no Firestore sync, no background worker, no production write
- UI labels explicitly say `Room/DB: blocked`, `persistent storage: off`, and no Firestore sync

Latest debug APK checksum after Sprint 15:

```text
c4d2d8edd08208e7e4d24de6035129eb1596c976f118032cdc98983dd9a2578e  android-native/app/build/outputs/apk/debug/app-debug.apk
```

## Sprint 16 POS queue import/export restore preview

Native POS queue snapshot UX now validates and previews local-only import/export text:

```text
OfflineQueueSnapshotValidationStatus
OfflineQueueSnapshotValidationPreview
OfflineQueueSnapshotExportPreview
OfflineQueueSnapshotImportPreview
GuardedOfflineQueuePersistenceBoundary.validateSnapshot/previewExport/previewImport
```

Safety state:

- restore validates first and blocks corrupt/unsupported snapshots
- corrupt import text is shown as local-only validation error and does not restore rows
- export preview uses copyable `XK_QUEUE_SNAPSHOT_V1` / `LOCAL_ONLY` text only
- import/export preview does not write files, Room/DB, Firestore, or production POS data
- UI labels explicitly say preview/local-only, no Room/DB, no Firestore sync, no production write

Latest debug APK checksum after Sprint 16:

```text
d497c6585e7b6136e2e6c3f743675f2278d3959874285857b797766ae09bd754  android-native/app/build/outputs/apk/debug/app-debug.apk
```

## Sprint 17 POS queue storage selection boundary

Native POS queue now has a storage-selection/design boundary for future real local persistence:

```text
QueueStorageBackend(NONE_LOCAL_ONLY, DATASTORE, ROOM)
QueueStorageReadinessStatus(BLOCKED_LOCAL_ONLY, PREP_ONLY_LOCAL_ONLY, APPROVAL_HELD_LOCAL_ONLY)
QueueStorageRequest
QueueStorageDecision
QueueStorageComparison
GuardedQueueStorageSelectionBoundary.selectStorage/compareBackends
```

Safety state:

- default remains `NONE_LOCAL_ONLY`
- Room/DataStore candidates are compared but blocked today
- even explicit approval in the model stays held in Sprint 17; no database/storage is opened
- no Room/DataStore dependency was added
- no database file, persistence write, Firestore sync, background worker, or production write
- UI labels explicitly say no Room/DataStore file opened, no production write, no Firestore sync

Latest debug APK checksum after Sprint 17:

```text
6ffb1c3e9748698a991b19e846fe56cd02adfa3a77a04d0bebb8ca2b81a6e3c5  android-native/app/build/outputs/apk/debug/app-debug.apk
```

## Sprint 18 POS read-only data prep

Native POS now has a guarded read-only Firebase/POS data prep boundary:

```text
PosReadOnlyDataSource(FAKE_LOCAL, FIREBASE_READ_ONLY)
PosReadOnlyDataReadinessStatus(FAKE_LOCAL_ACTIVE, BLOCKED_LOCAL_ONLY, PREP_ONLY_LOCAL_ONLY)
PosReadOnlyDataRequest
PosReadOnlyDataReadiness
PosReadOnlyDataPreview
GuardedPosReadOnlyDataBoundary.evaluate/previewFakeLocalData/previewFirebaseReadOnly
```

Safety state:

- default app data remains fake/local
- Firebase read-only request is blocked without owner approval/config/Firestore SDK
- even when all read-only flags are modeled as present, Sprint 18 remains prep-only and does not read Firestore
- no Firestore SDK dependency was added
- no production POS rows were read or returned
- no writes, sync, background worker, service account, `.env`, customer/payment data, or migrations
- UI labels explicitly say no Firestore read, no production POS data returned, no writes

Latest debug APK checksum after Sprint 18:

```text
8fc50747b0a78c9862b08a89dba891a68a1c6c4a6890349eea176940cc1c95c7  android-native/app/build/outputs/apk/debug/app-debug.apk
```

## Sprint 19 Firestore read-only contract gate

Native POS now links the Firestore SDK at compile time and exposes a contract-only gate for future read-only data visibility:

```text
FirestoreReadOnlySdkMarker
PosFirestoreReadOnlyCollectionContract
PosFirestoreReadOnlyContractPreview
PosFirestoreReadOnlyContract.default()
```

Collection contracts currently modeled:

- `tables`: `id`, `label`, `status`, `total`, `itemCount`
- `inventory`: `id`, `name`, `currentQty`, `unit`, `status`
- `history`: `id`, `tableId`, `total`, `closedAt`, `status`

Safety state:

- Firestore SDK dependency is linked, but read execution remains blocked
- no `FirebaseFirestore.getInstance()`, listener, query, or `get()` is executed
- no `google-services.json` was added
- no production POS rows were read, sampled, returned, written, or synced
- UI labels explicitly say read execution blocked, no production data sampled, no writes

Latest debug APK checksum after Sprint 19:

```text
529e86bc9b86385b2ff13d03d2b6a4e6ae2bac0a32041f5b4f285b269d942ef1  android-native/app/build/outputs/apk/debug/app-debug.apk
```

## Sprint 20 Firestore read-only repository skeleton

Native POS now has a guarded Firestore read-only repository/factory skeleton:

```text
PosFirestoreReadOnlyRepositoryMode(BLOCKED_PREVIEW_ONLY, APPROVAL_HELD_PREVIEW_ONLY)
PosFirestoreReadOnlyRepositoryRequest
PosFirestoreReadOnlyCollectionPreview
PosFirestoreReadOnlyRepositoryPreview
PosFirestoreReadOnlyRepository
BlockedFirestoreReadOnlyRepository
GuardedFirestoreReadOnlyRepositoryFactory.defaultRepository/fromRequest
```

Safety state:

- default repository returns blocked metadata previews only
- all-flags-present request still returns `APPROVAL_HELD_PREVIEW_ONLY` in Sprint 20
- no `FirebaseFirestore.getInstance()`, listener, query, or `get()` is executed
- no Firestore instance is created by the repository
- no `google-services.json` was added
- no production POS rows were read, sampled, returned, written, or synced
- UI labels explicitly say no Firestore instance, no query/get/listener, no production rows, no writes

Latest debug APK checksum after Sprint 20:

```text
e7bf2570538e7c17b5bd8c1286e8fe2f765e61863f019f667dcb43ec0614e46b  android-native/app/build/outputs/apk/debug/app-debug.apk
```

## Sprint 21 Firestore read-only UI mapping

Native POS now maps blocked Firestore read-only repository previews into native UI DTOs:

```text
PosFirestoreReadOnlyUiSummary
PosFirestoreReadOnlyUiRow
PosFirestoreReadOnlyDashboardState
FirestoreReadOnlyUiMappingAdapter.fromRepositoryPreview/fromCollectionPreview/dashboardState
```

Safety state:

- adapter consumes blocked preview DTOs only
- UI rows show collection names and required fields only
- `sampleRowCount = 0` remains enforced
- no `FirebaseFirestore.getInstance()`, listener, query, or `get()` is executed
- no Firestore instance is created by the adapter
- no `google-services.json` was added
- no production POS rows were read, sampled, returned, written, or synced
- UI labels explicitly say no Firestore execution, no production rows, no writes

Latest debug APK checksum after Sprint 21:

```text
cb67a557b34f1440e1dff4c17b9a973c75b08bd9f29ab7e84051a29876e71661  android-native/app/build/outputs/apk/debug/app-debug.apk
```

## Sprint 24 artifact report + expanded server-side smoke

Native debug/pre-alpha metadata now identifies the current artifact as:

```text
applicationId: com.xekho.pos
versionCode: 24
versionName: 0.24.0-alpha24
```

Sprint 24 added a JVM/server-side artifact report harness:

```text
android-native/app/src/test/java/com/xekho/pos/release/NativeArtifactReporter.kt
android-native/app/src/test/java/com/xekho/pos/release/NativeArtifactReportTest.kt
```

It reports the debug APK path and safety scan pattern without enabling release signing or production writes. The server-side UI smoke harness now also covers Settings, Inventory, and Finance markers, including Vietnamese labels decoded from `\uXXXX` source escapes.

Latest debug APK after Sprint 24:

```text
Path: android-native/app/build/outputs/apk/debug/app-debug.apk
Size: 14M
SHA256: f583466d09c3b47fef5b7094585a2eef50b52edd6c67115b99fc20080c73b120
```

Safety state:

- debug artifact only; release signing remains a later explicit gate
- no `google-services.json` committed or packaged by the targeted scan
- no service account, `.env`, production POS rows, Firestore write, or sync enabled

## Sprint 25 APK delivery report command

After building the debug APK, refresh a Telegram-ready delivery report with:

```bash
cd /home/longnick/projects/xekho/android-native
scripts/native-apk-report.sh
```

The command prints and writes:

```text
app/build/outputs/apk/debug/xekho-native-debug-apk-report.md
```

Current output includes:

```text
APK: /home/longnick/projects/xekho/android-native/app/build/outputs/apk/debug/app-debug.apk
Size: 14M (14508094 bytes)
SHA256: f583466d09c3b47fef5b7094585a2eef50b52edd6c67115b99fc20080c73b120
Secret/config scan: APK_SCAN_NO_MATCHES
Telegram: MEDIA:/home/longnick/projects/xekho/android-native/app/build/outputs/apk/debug/app-debug.apk
```

Safety state:

- script is release/report tooling only; it does not change app runtime code
- generated report lives in ignored build output
- release signing remains blocked / not required for debug artifact
- no `google-services.json`, service account, `.env`, production POS write, Firestore write, or sync enabled

## Sprint 26 manual real-device QA checklist

Manual QA/install instructions now live at:

```text
docs/android-native-manual-qa.md
```

Before testing a device build:

```bash
cd /home/longnick/projects/xekho/android-native
./gradlew :app:assembleDebug --no-daemon
scripts/native-apk-report.sh
```

Current delivery line:

```text
MEDIA:/home/longnick/projects/xekho/android-native/app/build/outputs/apk/debug/app-debug.apk
```

Manual smoke focus:

- PIN gate: wrong PIN stays locked; demo PIN `1234` unlocks
- `Bàn`, `Kho`, `Tài chính`, `Cài đặt` tabs render
- Firestore UI mapping/checklist cards remain preview-only / blocked
- no `google-services.json`, service account, `.env`, production POS data, Firestore write, or sync

## Sprint 27 manual QA result capture

Manual QA result template source:

```text
docs/android-native-manual-qa-result-template.md
```

Generate a timestamped result draft after real-device testing:

```bash
cd /home/longnick/projects/xekho/android-native
scripts/native-qa-result-template.sh
```

The command writes drafts under:

```text
docs/ai-map/MANUAL_QA_RESULTS/
```

It fills the current debug APK SHA256 automatically when `app/build/outputs/apk/debug/app-debug.apk` exists. The result template records device, Android version, APK SHA256, install result, PIN/tabs/Firestore-card PASS/FAIL, blocked confirmations, issues, and final verdict.

Safety state remains unchanged: no runtime code change, no Firebase config, no service account, no production POS data, no Firestore read/write/sync, and no release signing.

## Sprint 28 real-data read-only direction gate

The app now has a visible `Real data direction Sprint 28` card that moves the migration toward real Firebase/POS data through a guarded checklist only.

Current behavior is still fail-closed:

- no `google-services.json` committed
- no `FirebaseFirestore.getInstance()`
- no query/listener/`get()` execution
- no production POS rows returned
- no writes
- no sync/background worker
- `canExecuteReads = false`

Targeted verification:

```bash
cd /home/longnick/projects/xekho/android-native
./gradlew :app:testDebugUnitTest --no-daemon   --tests 'com.xekho.pos.domain.RealDataDirectionGateTest'   --tests 'com.xekho.pos.ui.NativeUiServerSmokeHarnessTest'
```

Future real read work must be a separate, explicitly approved one-time read sprint. Firestore writes/sync remain separately blocked.
