# 2026-06-25 20:26 +07 - Android native POS local payment close Sprint 10D

## Scope

Add local-only payment close transition after Sprint 10C payment draft preview. This is still a dry-run/native local UX slice, not real payment capture or production persistence.

Still blocked/deferred:

- No Firestore dependency/read/write/sync
- No Firebase Auth sign-in wiring
- No service account, `.env`, or `google-services.json`
- No production customer/payment/order persistence
- No real receipt/payment capture

## Implementation

- Added `PosOrderStatus.PAID_LOCAL_ONLY`.
- Added domain models:
  - `PaymentCloseStatus.CLOSED_LOCAL_ONLY`
  - `PaymentCloseStatus.NOT_PAYABLE_LOCAL_ONLY`
  - `PaymentCloseResult`
- Added `FakePosWriteRepository.closePaymentDraft(order, draft)`:
  - only pays an `OPEN` order with a payable local draft
  - marks successful local close as `PAID_LOCAL_ONLY`
  - creates deterministic local receipt id `local-paid-{tableId}-{totalDue}`
  - keeps `canWriteToProduction = false`
  - keeps `canSyncToFirestore = false`
  - rejects empty/zero/non-open orders without converting terminal state
- Added edit guard for terminal local orders:
  - `addMenuItem`
  - `addItem`
  - `increaseItem`
  - `decreaseItem`
  - `removeItem`
  - `clearOrder`
- Updated Tables UI:
  - added `Thu local` action
  - added retained local payment close message
  - payment result copy stays no-production-write/no-Firestore-sync
- State retention:
  - `localOrder` remains under `rememberSaveable(stateSaver = posLocalOrderSaver)`
  - `localPaymentCloseMessage` is `rememberSaveable`

## TDD evidence

RED 1:

```text
./gradlew :app:testDebugUnitTest --no-daemon --stacktrace
FAILED: Unresolved reference 'closePaymentDraft'
FAILED: Unresolved reference 'PaymentCloseStatus'
FAILED: Unresolved reference 'PAID_LOCAL_ONLY'
```

GREEN 1:

```text
./gradlew :app:testDebugUnitTest --no-daemon
BUILD SUCCESSFUL
```

RED 2 closed-order edit guard:

```text
FakePosPaymentCloseRepositoryTest > closePaymentDraftMarksOrderPaidLocalOnlyWithoutProductionWrite FAILED
```

GREEN 2:

```text
./gradlew :app:testDebugUnitTest --no-daemon
BUILD SUCCESSFUL
```

RED 3 no closed-to-paid conversion:

```text
FakePosPaymentCloseRepositoryTest > closePaymentDraftDoesNotConvertAlreadyClosedOrderToPaid FAILED
```

GREEN 3:

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
sha256: 1235175909b5c912caf872750aee8d5d49a4c000ca50eba3552f30898998084d
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
Kilo hermes-9router/ag/gemini-3-flash reviewed Sprint 10D read-only and ran ./gradlew test --no-daemon successfully.
After Kilo flagged the closed-to-paid edge, Hermes added a TDD guard and re-ran native/web verification.
```

## Next sprint

Sprint 11 can remain local-only and add local order/table selection across more tables, or begin an explicit guarded offline queue model. Firestore writes remain blocked unless separately approved.
