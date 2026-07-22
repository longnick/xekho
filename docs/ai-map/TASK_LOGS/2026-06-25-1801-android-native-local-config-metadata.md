# 2026-06-25 18:01 +07 - Android native local config metadata Sprint 9

## Scope

Wire local `google-services.json` presence into build-time metadata and show it in Settings readiness, while keeping default auth fake/local and Firebase blocked.

Still blocked/deferred:

- No `google-services.json` committed or present in repo
- No Google Services plugin applied to `:app`
- No Firebase Auth sign-in call wired
- No Firestore dependency, read, or write
- No service account or `.env`
- No production POS/customer/payment data
- No real staff credential validation

## Implementation

- Updated `android-native/app/build.gradle.kts`:
  - `val googleServicesJsonPresent = file("google-services.json").exists()`
  - enabled `buildFeatures.buildConfig = true`
  - added `BuildConfig.GOOGLE_SERVICES_JSON_PRESENT`
  - added `BuildConfig.FIREBASE_LOCAL_CONFIG_SOURCE = "BuildConfig"`
- Added `FirebaseLocalConfigMetadata.kt`:
  - maps BuildConfig metadata to `FirebaseLocalConfigStatus`
  - provides display line for Settings/reporting
- Updated Settings screen:
  - `AuthReadinessReporter.report(localConfigStatus = FirebaseLocalConfigMetadata.fromBuildConfig())`
  - Sprint 9 status line says metadata reads local config presence; default remains `FAKE_LOCAL`
- Added `FirebaseLocalConfigMetadataTest`.

## TDD evidence

RED:

```text
./gradlew :app:testDebugUnitTest --no-daemon --stacktrace
FAILED: Unresolved reference 'FirebaseLocalConfigMetadata'
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
sha256: ed86e63821a63edc70bb1ce7a2a808e624530ba59e67efc2cbbf2bdd3b047d1d
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
Kilo hermes-9router/ag/gemini-3-flash reviewed Android Sprint 9 changes read-only.
No compile/safety/default-auth/local-config-metadata/google-services/auth-guard blocker surfaced.
```

## Next sprint

Sprint 10 can add a guarded Firebase Auth sign-in adapter only if explicitly approved with local config scope. Otherwise keep progressing fake/local POS/Kho/Finance parity without Firestore writes.
