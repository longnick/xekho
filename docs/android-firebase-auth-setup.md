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
