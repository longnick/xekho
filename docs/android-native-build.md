# Android Native Build Notes

Native Android work lives in:

```text
android-native/
```

Current scope is a Kotlin + Jetpack Compose shell only. It does not include Firebase, POS writes, production data, or service-account credentials.

## Toolchain installed on this machine

```text
OpenJDK 17.0.19
Android SDK command-line tools 21.0
Android platform-tools 37.0.0
Android SDK Platform 35
Android Build Tools 35.0.0
```

SDK path:

```text
/home/longnick/Android/Sdk
```

`android-native/local.properties` points Gradle at that SDK and is intentionally ignored by Git.

## Commands

```bash
cd /home/longnick/projects/xekho/android-native
./gradlew :app:testDebugUnitTest --no-daemon
./gradlew :app:assembleDebug --no-daemon
```

Debug APK:

```text
android-native/app/build/outputs/apk/debug/app-debug.apk
```

## Safety gate

Before continuing native work, keep root web regression green:

```bash
cd /home/longnick/projects/xekho
npm run check
npm test -- --runInBand
npm run build:hosting
```

Do not add Firebase/Firestore write logic until the dry-run and emulator-test phases are approved.
## Sprint 2 fake UI tabs

The native app currently renders fake/local-only MVP tabs:

- `Bàn`
- `Kho`
- `Tài chính`
- `Cài đặt`

Data is supplied by `FakeDashboardRepository`; there is still no Firebase SDK, Firestore read/write, service account, `.env`, or production POS data access in the APK.

Latest debug APK checksum after Sprint 2:

```text
460ec55fd3ba38efe3bda4977c2b7e2ad34b35ec8eafc8e0f62b6dcf2f891131  android-native/app/build/outputs/apk/debug/app-debug.apk
```
## Sprint 3 fake Auth/PIN

Native app now starts behind a fake/local-only PIN gate:

```text
Demo PIN: 1234
```

The gate is local-only and does not use Firebase Auth, Firestore, service accounts, `.env`, or production POS data. Unlocking exposes the existing fake `Bàn` / `Kho` / `Tài chính` / `Cài đặt` tabs. Locking returns to the PIN screen.

Latest debug APK checksum after Sprint 3:

```text
564f1a4cf569e070937f0c84fd3be1887f9b43e5a8a88f63963f5ed76fe3a53a  android-native/app/build/outputs/apk/debug/app-debug.apk
```
## Sprint 4 AuthRepository boundary

Native auth is now behind an `AuthRepository` interface. The app still defaults to `FakeAuthRepository`, while `BlockedFirebaseAuthRepository` and `FirebaseAuthConfigGuard` define a fail-closed Firebase Auth boundary for future sprints.

Sprint 4 intentionally does **not** add Firebase Auth SDK, `google-services.json`, Firestore, `.env`, service accounts, or production POS data.

Latest debug APK checksum after Sprint 4:

```text
5c5dde993a42d52fea8f9d5d67a667f3236d2760a7b4dd04c990ec03c8f288d9  android-native/app/build/outputs/apk/debug/app-debug.apk
```
## Sprint 5 Firebase Auth SDK prep

Native app now includes Firebase Auth SDK dependency for compile-time preparation only. Real Firebase Auth remains blocked by `FirebaseAuthConfigGuard`.

Important safety state:

- `android-native/**/google-services.json` is ignored.
- Google Services Gradle plugin is registered with `apply false` only.
- `:app` does not apply Google Services plugin yet.
- No Firebase Auth sign-in calls or Firestore code are wired.

Latest debug APK checksum after Sprint 5:

```text
2f56eb6faae4b4e7470db4fc834670e86c26b5e9c5043cf0f36fb31638a9f9eb  android-native/app/build/outputs/apk/debug/app-debug.apk
```

