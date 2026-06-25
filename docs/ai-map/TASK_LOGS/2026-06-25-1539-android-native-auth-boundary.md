# 2026-06-25 15:39 +07 - Android native AuthRepository boundary Sprint 4

## Scope

Prepare Android auth architecture for future Firebase Auth without enabling real Firebase/Auth/Firestore yet.

Still blocked/deferred:

- No Firebase Auth SDK dependency
- No `google-services.json`
- No Firestore read/write
- No service account or `.env`
- No production POS/customer/payment data
- No real staff credential validation

## Implementation

- Added `AuthRepository` interface.
- Added `AuthRepositoryMode`:
  - `FAKE_LOCAL`
  - `FIREBASE_BLOCKED`
- Updated `FakeAuthRepository` to implement `AuthRepository`.
- Updated `AppRoot` to depend on `AuthRepository` instead of concrete `FakeAuthRepository`.
- Added `FirebaseAuthConfig`, `FirebaseAuthReadiness`, and `FirebaseAuthConfigGuard`.
- Added `BlockedFirebaseAuthRepository` placeholder:
  - never unlocks POS tabs
  - returns clear blocked error
  - stays local-only
  - performs no network/Firebase calls

## TDD evidence

RED:

```text
./gradlew :app:testDebugUnitTest --no-daemon --stacktrace
FAILED: Unresolved reference 'AuthRepository', 'AuthRepositoryMode', 'FirebaseAuthConfigGuard', 'BlockedFirebaseAuthRepository'
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
sha256: 5c5dde993a42d52fea8f9d5d67a667f3236d2760a7b4dd04c990ec03c8f288d9
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
Kilo hermes-9router/ag/gemini-3-flash reviewed Android Sprint 4 changes read-only.
Result: compile pass, no credentials/service accounts/Firestore dependencies, AuthRepository boundary OK, Firebase guard failsafe active.
```

## Next sprint

Sprint 5 should add Firebase Auth SDK/config only if approved, still without Firestore writes. Recommended safe slice: add Firebase Auth dependency + checked-in sample config documentation only, require `google-services.json` to stay untracked, and keep `FirebaseAuthConfigGuard` blocking real auth until explicit runtime/config gate is present.
