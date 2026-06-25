# Android Firebase Auth setup notes

Sprint 5 prepares Firebase Auth dependencies only. Real Firebase Auth is not enabled yet.

## Current state

- Firebase Auth SDK dependency is present for compile-time preparation.
- Google Services plugin is registered at root with `apply false`.
- `:app` does not apply Google Services plugin yet.
- `FirebaseAuthConfigGuard` still returns `canUseRealFirebase = false`.
- No Firestore dependencies or writes are present.

## Local config rule

If a later sprint explicitly enables real Firebase Auth, place the Android config at:

```text
android-native/app/google-services.json
```

This path is ignored by git:

```gitignore
android-native/**/google-services.json
```

Never commit `google-services.json`, service account JSON, `.env`, production POS data, customer data, payment data, or Firestore migration payloads.

## Enablement checklist for later sprint

Real Firebase Auth must remain blocked until all are true and approved:

- owner explicitly approves real Firebase Auth connection
- `google-services.json` exists locally but is untracked
- app module applies Google Services plugin
- Firebase Auth repository is wired through `AuthRepository`
- unit tests prove fake/default path remains safe
- APK scan confirms no config/secrets are bundled unexpectedly beyond approved Android Firebase config resources
- Firestore reads/writes remain blocked unless separately approved
## Sprint 6 repository skeleton

`FirebaseAuthRepository` now exists as a skeleton adapter with constructor injection:

```kotlin
FirebaseAuthRepository(firebaseAuth: FirebaseAuth, readiness: FirebaseAuthReadiness)
```

It remains blocked:

- `mode = FIREBASE_BLOCKED`
- `verifyPin()` never unlocks POS tabs
- no Firebase Auth API call is made
- `AuthRepositoryFactory.defaultRepository()` still returns `FakeAuthRepository()`
- `guardedFirebaseRepository()` returns `BlockedFirebaseAuthRepository` while `FirebaseAuthConfigGuard.canUseRealFirebase == false`
## Sprint 7 runtime auth selection

Runtime auth selection is now explicit but still safe-by-default:

```kotlin
AuthRuntimeConfig() // mode = FAKE_LOCAL
AuthRepositoryFactory.fromRuntimeConfig(AuthRuntimeConfig()) // FakeAuthRepository
```

If `AuthRuntimeMode.FIREBASE_AUTH` is requested, selection still evaluates `FirebaseAuthConfigGuard`. Because the guard currently returns `canUseRealFirebase = false`, the factory returns `BlockedFirebaseAuthRepository`, not `FirebaseAuthRepository`.

No real Firebase Auth sign-in is wired in Sprint 7.
## Sprint 8 read-only readiness report

`AuthReadinessReporter.report()` now summarizes current auth readiness for the Settings screen.

It reports:

- active runtime mode
- Firebase Auth blocked/ready label
- block reason
- `google-services.json` local presence flag

Sprint 8 remains display-only. It does not call Firebase Auth, does not read Firestore, and does not enable real auth.
## Sprint 9 local config metadata

`FirebaseLocalConfigMetadata.fromBuildConfig()` now maps build-time local config metadata into `FirebaseLocalConfigStatus`.

Build-time metadata:

```text
GOOGLE_SERVICES_JSON_PRESENT = file("google-services.json").exists()
FIREBASE_LOCAL_CONFIG_SOURCE = "BuildConfig"
```

This is reporting only. It does not apply the Google Services plugin, does not call Firebase Auth, and does not enable Firestore.

