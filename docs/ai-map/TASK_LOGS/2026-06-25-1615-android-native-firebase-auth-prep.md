# 2026-06-25 16:15 +07 - Android native Firebase Auth prep Sprint 5

## Scope

Prepare Firebase Auth SDK/dependency/config metadata while keeping real Firebase Auth and all Firestore/POS data blocked.

Still blocked/deferred:

- No `google-services.json` committed
- Google Services Gradle plugin is registered but not applied to `:app`
- No Firebase Auth sign-in calls
- No Firestore read/write
- No service account or `.env`
- No production POS/customer/payment data
- No real staff credential validation

## Implementation

- Added Firebase BoM + Firebase Auth dependency:
  - `firebaseBom = "33.7.0"`
  - `firebase-auth`
- Added Google Services plugin alias only:
  - `googleServices = "4.4.2"`
  - root `build.gradle.kts` registers plugin with `apply false`
  - app module does **not** apply the plugin yet
- Added `.gitignore` rule:
  - `android-native/**/google-services.json`
- Added `FirebaseAuthSdkMarker` with compile-time Firebase Auth SDK reference.
- Updated `FirebaseAuthConfigGuard` to keep real Firebase Auth blocked in Sprint 5 even if approval/config/sdk flags look present.
- Updated settings copy to say SDK is prepared but auth/firestore remain guarded.

## TDD evidence

RED:

```text
./gradlew :app:testDebugUnitTest --no-daemon --stacktrace
FAILED: Unresolved reference 'FirebaseAuthSdkMarker'
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
sha256: 2f56eb6faae4b4e7470db4fc834670e86c26b5e9c5043cf0f36fb31638a9f9eb
```

APK secret/config scans:

```text
unzip -l app/build/outputs/apk/debug/app-debug.apk | grep -Ei '(^|/)(google-services\.json|.*\.env|serviceAccount|firebase-adminsdk|secret|functions-list\.json)$'
# no matches

# Broader scan produced only AndroidX credentials metadata files, not secrets; allowlisted and rechecked with no matches.
```

Legacy web regression:

```text
npm run check               # pass
npm test -- --runInBand     # 2 suites, 12 tests pass
npm run build:hosting       # pass, dist prepared
```

Kilo review:

```text
Kilo hermes-9router/ag/gemini-3-flash reviewed Android Sprint 5 changes read-only.
Result: compile pass, no .env/Firebase config reads/live DB access, google-services.json absent+ignored, auth guard remains fail-closed, architecture OK.
```

## Next sprint

Sprint 6 should add the real Firebase Auth repository skeleton only behind the existing guard, still without Firestore writes. Recommended slice: `FirebaseAuthRepository` constructor takes an injected `FirebaseAuth` provider but remains unreachable unless `FirebaseAuthConfigGuard.canUseRealFirebase` is explicitly enabled in a later approved sprint.
