# 2026-06-25 18:58 +07 - Android native POS local cart edit Sprint 10B

## Scope

Add local-only POS menu/cart edit flow on top of Sprint 10A. Still no Firebase/Firestore writes, no sync, and no production POS data.

Still blocked/deferred:

- No Firestore dependency/read/write/sync
- No Firebase Auth sign-in wiring
- No service account, `.env`, or `google-services.json`
- No production customer/payment/order persistence

## Implementation

- Extended `FakePosWriteRepository`:
  - `fakeMenu()` returns deterministic local menu items
  - `addMenuItem(order, itemId)` adds menu item locally or leaves order unchanged for unknown id
  - `increaseItem(order, itemId)` increments quantity locally
  - `decreaseItem(order, itemId)` decrements quantity locally and removes item at zero
  - `removeItem(order, itemId)` removes item locally
  - `clearOrder(order)` clears local cart
  - every result keeps `canWriteToProduction = false`
- Added `FakePosCartEditRepositoryTest` for menu/add/increase/decrease/remove/clear/unknown id flows.
- Updated `TablesScreen`:
  - local cart edit header
  - menu list with `Thêm`
  - cart item rows with `-`, `+`, `Xóa`
  - `Xóa giỏ` action
  - explicit safety copy: no Firestore, no production write, no sync
- Kept `rememberSaveable(stateSaver = posLocalOrderSaver)` for state retention.

## TDD evidence

RED:

```text
./gradlew :app:testDebugUnitTest --no-daemon --stacktrace
FAILED: Unresolved reference 'fakeMenu'
FAILED: Unresolved reference 'addMenuItem'
FAILED: Unresolved reference 'increaseItem'
FAILED: Unresolved reference 'decreaseItem'
FAILED: Unresolved reference 'removeItem'
FAILED: Unresolved reference 'clearOrder'
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
sha256: 4b881b6d9fc8dec0c7354be3241caafae8dcf2cd881deaa701b48945e521a2d0
```

APK secret/config scans:

```text
Targeted scan for google-services.json/.env/serviceAccount/firebase-adminsdk/secret/functions-list: no matches.
Broader scan with exact AndroidX credentials metadata allowlist: no dangerous matches.
```

Legacy web regression:

```text
npm run check               # pass
npm test -- --runInBand     # 2 suites, 12 tests pass
npm run build:hosting       # pass, dist prepared
```

Kilo review:

```text
Kilo hermes-9router/ag/gemini-3-flash reviewed Android Sprint 10B changes read-only.
Kilo ran ./gradlew test and ./gradlew :app:assembleDebug --no-daemon successfully.
No blocker found for compile, safety, default auth, cart flow, production write guard, or state retention.
```

## Next sprint

Sprint 10C can keep POS local-only and add local table/order selection or local payment draft preview. Firestore writes remain blocked unless explicitly approved.
