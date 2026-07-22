# 2026-06-25 18:42 +07 - Android native POS fake write flow Sprint 10A

## Scope

Add local-only POS fake write flow for open/add/close order in the native Android app. No Firebase/Firestore writes.

Still blocked/deferred:

- No Firestore dependency, read, write, sync, or migration
- No Firebase Auth sign-in call wired
- No production POS/customer/payment data
- No service account, `.env`, or `google-services.json` committed
- No real order persistence beyond Compose local state

## Implementation

- Added POS local write domain models in `Models.kt`:
  - `PosOrderStatus.OPEN`
  - `PosOrderStatus.CLOSED_LOCAL_ONLY`
  - `PosLocalOrder`
  - `PosWriteResult`
- Added `FakePosWriteRepository`:
  - `openOrder(tableId)` creates a `local-*` client order id
  - `addItem(order, item)` merges same item quantity locally
  - `closeOrder(order)` marks order `CLOSED_LOCAL_ONLY`
  - every result keeps `canWriteToProduction = false`
- Added `FakePosWriteRepositoryTest`.
- Wired UI in `TablesScreen`:
  - local order card
  - `Mở lại`
  - `+ Miến`
  - `Đóng local`
  - explicit label: `Local-only: không Firestore, không production write, không sync.`
- Applied Kilo review fix:
  - local POS order state now uses `rememberSaveable(stateSaver = posLocalOrderSaver)` instead of plain `remember`.
  - avoids losing local fake order state on configuration recreation.

## TDD evidence

RED:

```text
./gradlew :app:testDebugUnitTest --no-daemon --stacktrace
FAILED: Unresolved reference 'FakePosWriteRepository'
FAILED: Unresolved reference 'PosOrderStatus'
```

GREEN:

```text
./gradlew :app:testDebugUnitTest --no-daemon
BUILD SUCCESSFUL
```

## Verification

Android native:

```text
./gradlew :app:testDebugUnitTest --no-daemon  # BUILD SUCCESSFUL
./gradlew :app:assembleDebug --no-daemon      # BUILD SUCCESSFUL
```

APK:

```text
android-native/app/build/outputs/apk/debug/app-debug.apk
size: 11M
sha256: b3c18fe00c33d9a3f797e17bb231ec536ee0f236c0b4c1b8cd2527ac8e4e364d
```

APK secret/config scans:

```text
unzip -l app/build/outputs/apk/debug/app-debug.apk | grep -Ei '(^|/)(google-services\.json|.*\.env|serviceAccount|firebase-adminsdk|secret|functions-list\.json)$'
# no matches

# Broader scan with exact AndroidX credentials metadata allowlist also returned no dangerous matches.
```

Legacy web regression:

```text
npm run check               # pass
npm test -- --runInBand     # 2 suites, 12 tests pass
npm run build:hosting       # pass, dist prepared
```

Kilo review:

```text
Kilo hermes-9router/ag/gemini-3-flash reviewed Android Sprint 10A changes read-only.
Initial review flagged local POS order state loss from plain remember; patched to rememberSaveable with custom saver.
Kilo re-review ran ./gradlew test successfully after the fix.
```

## Next sprint

Sprint 10B should keep POS local-only and add either menu item selection/read model or local cart edit/remove flow. Firestore writes remain blocked unless explicitly approved.
