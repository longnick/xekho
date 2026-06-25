# 2026-06-25 15:00 +07 - Android native skeleton Sprint 1

## Scope

Create the first native Android shell under `android-native/` without touching Firebase, POS production data, service accounts, or legacy web runtime logic.

## Implementation

- Installed local Android build toolchain:
  - OpenJDK 17.0.19
  - Android SDK command-line tools 21.0
  - Android platform-tools 37.0.0
  - Android SDK Platform 35
  - Android Build Tools 35.0.0
- Added `android-native/` Kotlin/Jetpack Compose project:
  - package/application id: `com.xekho.pos`
  - app shell label: `Xe Kho POS`
  - theme colors follow current XE KHO brand palette
  - no Firebase SDK and no production data access yet
- Added Gradle wrapper (`8.10.2`) and version catalog.
- Added `.gitignore` entries for Android local/build outputs.

## TDD evidence

- RED: `./gradlew :app:testDebugUnitTest --no-daemon --stacktrace` failed because `AppBrand` did not exist.
- GREEN: added `AppBrand`, `MainActivity`, Compose `AppRoot`, and theme files.
- PASS: `./gradlew :app:testDebugUnitTest --no-daemon`.

## Verification

Android native:

```text
./gradlew :app:testDebugUnitTest --no-daemon  # BUILD SUCCESSFUL
./gradlew :app:assembleDebug --no-daemon      # BUILD SUCCESSFUL
```

Artifact:

```text
android-native/app/build/outputs/apk/debug/app-debug.apk
size: 9.0M
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

## Deferred / next sprint

- Add native domain models and fake repositories.
- Add fake tab shell for POS/Tables/Inventory/Finance before any Firebase integration.
- Keep Firebase/Auth/Firestore reads and writes blocked until separate approved sprint.
