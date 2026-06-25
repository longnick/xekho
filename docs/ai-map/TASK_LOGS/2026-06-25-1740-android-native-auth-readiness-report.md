# 2026-06-25 17:40 +07 - Android native auth readiness report Sprint 8

## Scope

Add read-only Firebase/auth readiness reporting in native Settings while keeping default auth fake/local and Firebase blocked.

Still blocked/deferred:

- No `google-services.json` committed or present
- No Firebase Auth sign-in call wired
- No Firestore dependency, read, or write
- No service account or `.env`
- No production POS/customer/payment data
- No real staff credential validation

## Implementation

- Added `AuthReadinessReport.kt`:
  - `FirebaseLocalConfigStatus`
  - `AuthReadinessReport`
  - `AuthReadinessReporter.report()`
- Added `AuthReadinessReportTest`.
- Updated Settings screen to show read-only auth readiness lines:
  - `Auth: FAKE_LOCAL active`
  - `Firebase: blocked — default fake/local auth`
  - `google-services.json: not present`

## TDD evidence

RED:

```text
./gradlew :app:testDebugUnitTest --no-daemon --stacktrace
FAILED: Unresolved reference 'AuthReadinessReporter'
FAILED: Unresolved reference 'FirebaseLocalConfigStatus'
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
sha256: c58ab6f07135b138f9026210938db280acd3bd2d1dbb4a68f2a77ac19872913f
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
Kilo hermes-9router/ag/gemini-3-flash reviewed Android Sprint 8 changes read-only.
No compile/safety/default-auth/readiness-report/google-services/auth-guard blocker surfaced.
```

## Next sprint

Sprint 9 should add local config presence metadata wiring only if still needed, but keep Firebase sign-in and Firestore blocked unless explicitly approved.
