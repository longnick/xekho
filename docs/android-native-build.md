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
## Sprint 6 FirebaseAuthRepository skeleton

Native app now contains a `FirebaseAuthRepository` class shaped like the future real auth adapter, but it is still guard-blocked and never used by the default app path.

Important safety state:

- `AppRoot` defaults to `AuthRepositoryFactory.defaultRepository()`.
- `AuthRepositoryFactory.defaultRepository()` returns `FakeAuthRepository()`.
- `FirebaseAuthRepository` requires injected `FirebaseAuth` and `FirebaseAuthReadiness`, but does not call Firebase APIs.
- `FirebaseAuthConfigGuard` still returns `canUseRealFirebase = false`.
- No Firestore dependencies or reads/writes are wired.

Latest debug APK checksum after Sprint 6:

```text
6bbaaf191a0d18d1654bbaaa8a2d93ae0457671d6f83ea9f79bfe51089e2c32c  android-native/app/build/outputs/apk/debug/app-debug.apk
```
## Sprint 7 runtime auth selection

Native app now has an explicit runtime auth selection model:

```text
AuthRuntimeMode.FAKE_LOCAL
AuthRuntimeMode.FIREBASE_AUTH
AuthRuntimeConfig
AuthRuntimeSelector
```

Safety state:

- `AuthRuntimeConfig()` defaults to `FAKE_LOCAL`.
- `AuthRepositoryFactory.defaultRepository()` calls `fromRuntimeConfig()` with the default config and still returns `FakeAuthRepository()`.
- Requesting `FIREBASE_AUTH` routes through `FirebaseAuthConfigGuard`; current guard always returns `canUseRealFirebase = false`, so repository selection returns `BlockedFirebaseAuthRepository`.
- No Firestore dependencies or reads/writes are wired.

Latest debug APK checksum after Sprint 7:

```text
ab8098bb31bc7658acef978d5d450e68f3baff46031664bf50341a4b4a85ffaa  android-native/app/build/outputs/apk/debug/app-debug.apk
```
## Sprint 8 auth readiness report

Settings now displays a read-only auth readiness report from `AuthReadinessReporter`.

Default display state:

```text
Auth: FAKE_LOCAL active
Firebase: blocked — default fake/local auth
google-services.json: not present
```

Safety state:

- report is local/read-only
- default auth remains `FAKE_LOCAL`
- no Firebase Auth sign-in is wired
- no Firestore dependencies or reads/writes are wired

Latest debug APK checksum after Sprint 8:

```text
c58ab6f07135b138f9026210938db280acd3bd2d1dbb4a68f2a77ac19872913f  android-native/app/build/outputs/apk/debug/app-debug.apk
```
## Sprint 9 local config metadata

Native build now exposes local `google-services.json` presence through BuildConfig metadata:

```text
BuildConfig.GOOGLE_SERVICES_JSON_PRESENT
BuildConfig.FIREBASE_LOCAL_CONFIG_SOURCE = "BuildConfig"
```

The value is derived from:

```kotlin
val googleServicesJsonPresent = file("google-services.json").exists()
```

Settings reads it through:

```kotlin
FirebaseLocalConfigMetadata.fromBuildConfig()
```

Safety state:

- `google-services.json` remains untracked/ignored and absent from committed repo
- Google Services plugin is still not applied to `:app`
- default auth remains `FAKE_LOCAL`
- Firebase Auth sign-in and Firestore remain unwired

Latest debug APK checksum after Sprint 9:

```text
ed86e63821a63edc70bb1ce7a2a808e624530ba59e67efc2cbbf2bdd3b047d1d  android-native/app/build/outputs/apk/debug/app-debug.apk
```
## Sprint 10A POS fake write flow

Native POS tab now has a local-only fake write flow:

```text
Mở lại       -> open local order for ban-02
+ Miến       -> add/merge local demo item
Đóng local   -> mark order CLOSED_LOCAL_ONLY
```

Safety state:

- `FakePosWriteRepository` has no Firebase/Firestore dependency
- `PosLocalOrder.canWriteToProduction = false`
- `PosWriteResult.canWriteToProduction = false`
- UI labels explicitly say no Firestore, no production write, no sync
- local order state uses `rememberSaveable` with `posLocalOrderSaver`

Latest debug APK checksum after Sprint 10A:

```text
b3c18fe00c33d9a3f797e17bb231ec536ee0f236c0b4c1b8cd2527ac8e4e364d  android-native/app/build/outputs/apk/debug/app-debug.apk
```
## Sprint 10B POS local cart edit flow

Native POS tab now supports a local-only menu/cart edit flow:

```text
Thêm      -> add local menu item
+         -> increase local quantity
-         -> decrease local quantity; zero removes item
Xóa       -> remove local item
Xóa giỏ   -> clear local cart
```

Safety state:

- `FakePosWriteRepository` still has no Firebase/Firestore dependency
- all cart edit results keep `canWriteToProduction = false`
- UI labels explicitly say no Firestore, no production write, no sync
- local order state continues through `rememberSaveable(posLocalOrderSaver)`

Latest debug APK checksum after Sprint 10B:

```text
4b881b6d9fc8dec0c7354be3241caafae8dcf2cd881deaa701b48945e521a2d0  android-native/app/build/outputs/apk/debug/app-debug.apk
```
## Sprint 10C POS local payment draft preview

Native POS tab now shows a local-only payment draft preview derived from local cart state:

```text
PaymentMethod.CASH
PaymentMethod.BANK_TRANSFER
PaymentDraft(subtotal, discount, totalDue, itemCount, receiptPreview)
```

Safety state:

- `previewPayment()` has no Firebase/Firestore dependency
- discount clamps to `[0, subtotal]`
- `PaymentDraft.canWriteToProduction = false`
- `PaymentDraft.canSyncToFirestore = false`
- UI labels explicitly say no production write and no Firestore sync
- payment draft is derived from `rememberSaveable` local order state

Latest debug APK checksum after Sprint 10C:

```text
0d0dbd14b15e8e90bda786a1906ef54b814a53ea991b14651a946d5ce2665eaf  android-native/app/build/outputs/apk/debug/app-debug.apk
```

