# 2026-06-25 17:19 +07 - Android native runtime auth selection Sprint 7

## Scope

Add explicit runtime auth selection while keeping the default app path fake/local and keeping Firebase blocked.

Still blocked/deferred:

- No `google-services.json` committed or present
- No Firebase Auth sign-in call wired to app default
- No Firestore dependency, read, or write
- No service account or `.env`
- No production POS/customer/payment data
- No real staff credential validation

## Implementation

- Added `AuthRuntimeSelection.kt`:
  - `AuthRuntimeMode.FAKE_LOCAL`
  - `AuthRuntimeMode.FIREBASE_AUTH`
  - `AuthRuntimeConfig`
  - `AuthRuntimeSelection`
  - `AuthRuntimeSelector.select(config)`
- Updated `AuthRepositoryFactory`:
  - `defaultRepository()` now calls `fromRuntimeConfig()`
  - `fromRuntimeConfig()` defaults to `AuthRuntimeConfig()` and therefore returns `FakeAuthRepository()`
  - Firebase requested mode still routes to `BlockedFirebaseAuthRepository` while `FirebaseAuthConfigGuard.canUseRealFirebase == false`
- Updated `AppRoot` settings copy to Sprint 7 status.
- Added `AuthRuntimeSelectionTest`.

## TDD evidence

RED:

```text
./gradlew :app:testDebugUnitTest --no-daemon --stacktrace
FAILED: Unresolved reference 'AuthRuntimeConfig'
FAILED: Unresolved reference 'AuthRuntimeSelector'
FAILED: Unresolved reference 'fromRuntimeConfig'
FAILED: Unresolved reference 'AuthRuntimeMode'
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
sha256: ab8098bb31bc7658acef978d5d450e68f3baff46031664bf50341a4b4a85ffaa
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
Kilo hermes-9router/ag/gemini-3-flash reviewed Android Sprint 7 changes read-only.
It ran Gradle unit/build checks and inspected auth runtime selection/default path. No blocker surfaced; default app auth remains FAKE_LOCAL; google-services.json absent; Firebase guard remains fail-closed.
```

## Next sprint

Sprint 8 should add local runtime config discovery/readiness reporting only, still without real Firebase sign-in or Firestore. Suggested safe slice: detect whether `google-services.json` exists at runtime/build metadata level and display read-only readiness in settings while default remains `FAKE_LOCAL`.
