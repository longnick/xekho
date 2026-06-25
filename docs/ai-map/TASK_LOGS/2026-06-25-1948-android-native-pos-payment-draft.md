# 2026-06-25 19:48 +07 - Android native POS local payment draft Sprint 10C

## Scope

Add local-only POS payment draft preview on top of Sprint 10B. Still no Firebase/Firestore writes, no sync, and no production POS data.

Still blocked/deferred:

- No Firestore dependency/read/write/sync
- No Firebase Auth sign-in wiring
- No service account, `.env`, or `google-services.json`
- No production customer/payment/order persistence
- No final payment capture or close-and-sync flow

## Implementation

- Added domain models in `Models.kt`:
  - `PaymentMethod.CASH`
  - `PaymentMethod.BANK_TRANSFER`
  - `PaymentDraft`
- Extended `FakePosWriteRepository`:
  - `previewPayment(order, method, discount = 0L)`
  - computes `subtotal`, safe discount, `totalDue`, item count, receipt preview
  - clamps discount to `[0, subtotal]`
  - returns `canWriteToProduction = false`
  - returns `canSyncToFirestore = false`
- Added `FakePosPaymentDraftRepositoryTest`.
- Updated Tables UI:
  - local payment draft card
  - shows payment method, item count, subtotal, total due, payable/not-payable copy
  - explicit copy: no production write, no Firestore sync
- State retention remains via `rememberSaveable(stateSaver = posLocalOrderSaver)`; payment draft is derived from retained `localOrder`.

## TDD evidence

RED:

```text
./gradlew :app:testDebugUnitTest --no-daemon --stacktrace
FAILED: Unresolved reference 'previewPayment'
FAILED: Unresolved reference 'PaymentMethod'
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
sha256: 0d0dbd14b15e8e90bda786a1906ef54b814a53ea991b14651a946d5ce2665eaf
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
Kilo hermes-9router/ag/gemini-3-flash reviewed Android Sprint 10C changes read-only.
Kilo ran ./gradlew testDebugUnitTest --no-daemon and ./gradlew test --no-daemon successfully.
No blocker found for compile, safety, Firebase/POS data, default auth path, payment draft, production write guard, state retention, or architecture.
```

## Next sprint

Sprint 10D can keep POS local-only and add local table/order selection or local close-payment draft transition. Firestore writes remain blocked unless explicitly approved.
