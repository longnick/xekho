# 2026-06-25 16:47 +07 - Android native FirebaseAuthRepository skeleton Sprint 6

## Scope

Add a real-Firebase-shaped repository skeleton behind the existing guard without enabling real auth or Firestore.

Still blocked/deferred:

- No `google-services.json` committed or present
- Google Services Gradle plugin remains registered `apply false` only
- No Firebase Auth sign-in calls wired into the app default path
- No Firestore read/write dependency or code
- No service account or `.env`
- No production POS/customer/payment data
- No real staff credential validation

## Implementation

- Added `AuthRepositoryFactory`:
  - `defaultRepository()` returns `FakeAuthRepository()`
  - `blockedFirebaseRepository(readiness)` returns `BlockedFirebaseAuthRepository`
  - `guardedFirebaseRepository(firebaseAuth, readiness)` returns `FirebaseAuthRepository` only if readiness allows real Firebase; current guard always blocks, so it returns blocked repo today
- Added `FirebaseAuthRepository` skeleton:
  - constructor requires injected `com.google.firebase.auth.FirebaseAuth` + `FirebaseAuthReadiness`
  - implements `AuthRepository`
  - keeps mode `FIREBASE_BLOCKED`
  - never unlocks POS tabs
  - never calls Firebase APIs
- Updated `AppRoot` default auth path to `AuthRepositoryFactory.defaultRepository()` which still returns fake/local auth.
- Updated settings screen copy to Sprint 6 status.
- Added `FirebaseAuthRepositorySkeletonTest`.

## TDD evidence

RED:

```text
./gradlew :app:testDebugUnitTest --no-daemon --stacktrace
FAILED: Unresolved reference 'AuthRepositoryFactory'
FAILED: Unresolved reference 'FirebaseAuthRepository'
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
sha256: 6bbaaf191a0d18d1654bbaaa8a2d93ae0457671d6f83ea9f79bfe51089e2c32c
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
Kilo hermes-9router/ag/gemini-3-flash reviewed Android Sprint 6 changes read-only.
It ran Gradle unit/build checks and legacy npm check/test. No compile blocker surfaced; default auth path remains fake/local; google-services.json absent; Firebase guard remains fail-closed.
```

## Next sprint

Sprint 7 should introduce an explicit runtime auth selection model/config object, still defaulting to fake/local and still blocking real Firebase unless owner-approved local config is present. Do not add Firestore reads/writes yet.
