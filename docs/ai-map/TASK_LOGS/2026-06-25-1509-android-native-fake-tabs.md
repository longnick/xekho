# 2026-06-25 15:09 +07 - Android native fake tabs Sprint 2

## Scope

Add the first native MVP domain and fake UI tab shell under `android-native/` only.

Still blocked/deferred in this sprint:

- No Firebase SDK
- No Auth/PIN
- No Firestore read/write
- No service account or `.env`
- No production POS/customer/payment data

## Implementation

- Added `com.xekho.pos.domain` models:
  - `NativeTab`
  - `TableOverview` / `TableStatus`
  - `InventoryItem` / `StockStatus`
  - `FinanceSummary`
  - `OrderItem` / `OrderDraft`
  - `DashboardSnapshot`
- Added `FakeDashboardRepository` with local fake data for:
  - `Bàn`
  - `Kho`
  - `Tài chính`
  - `Cài đặt`
- Reworked `AppRoot` into a Material 3 native tab shell with summary cards and fake-data screens.
- Added `.gitignore` coverage for `android-native/.kotlin/` generated tooling cache.

## TDD evidence

RED:

```text
./gradlew :app:testDebugUnitTest --no-daemon --stacktrace
FAILED: Unresolved reference 'FakeDashboardRepository', 'TableStatus', 'StockStatus', 'OrderDraft', 'OrderItem'
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
size: 9.1M
sha256: 460ec55fd3ba38efe3bda4977c2b7e2ad34b35ec8eafc8e0f62b6dcf2f891131
```

APK filename secret scan:

```text
unzip -l app/build/outputs/apk/debug/app-debug.apk | grep -Ei 'env|serviceAccount|firebase-adminsdk|secret|credential|functions'
# no matches
```

Legacy web regression:

```text
npm run check               # pass
npm test -- --runInBand     # 2 suites, 12 tests pass
npm run build:hosting       # pass, dist prepared
```

Kilo review:

```text
Kilo hermes-9router/ag/gemini-3-flash reviewed Android Sprint 2 changes read-only.
Result: no compile/safety/Firebase/POS-data issues found.
```

## Next sprint

Sprint 3 should add native Auth/PIN shell using fake/local auth state first. Firebase Auth remains blocked until the fake auth UI and tests pass.
