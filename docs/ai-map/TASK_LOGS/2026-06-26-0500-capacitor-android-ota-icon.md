# 2026-06-26 05:00 - Capacitor Android OTA and Brand App Icon Implementation

Repo: `/home/longnick/projects/xekho`

Completed Capacitor Android wrapper enhancements for live updates (OTA) and brand app icon custom resources.

## Changes

### 1. OTA / Live-Update Foundation
- Installed `@capgo/capacitor-updater@6.45.10` compatible with Capacitor 6.
- Updated `capacitor.config.ts` to include the `CapacitorUpdater` plugin configuration with `autoUpdate: false` as a safe default.
- Configured future releases to be packageable without hardcoding secrets or production channel keys.

### 2. Xe Khô Brand App Icon
- Updated `android/app/src/main/res/values/ic_launcher_background.xml` color to `#7A2B18` (warm red-brown brand color).
- Created a new solid background vector drawable in `android/app/src/main/res/drawable/ic_launcher_background.xml` using the `#7A2B18` brand color.
- Replaced the default Android bot vector in `android/app/src/main/res/drawable/ic_launcher_foreground.xml` and `android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml` with the Xe Khô brand icon (yellow-to-orange gradient background circle with stylized bowl path matching `kitchen-icon.svg`).
- Updated `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml` and `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml` to point to `@drawable/ic_launcher_foreground` so adaptive devices render the vector brand icon.

### 3. Build & SDK Adjustments
- Changed `compileSdkVersion` in `android/variables.gradle` to `35` to resolve `androidx.work:work-runtime:2.10.5` compileSdk requirement.
- Raised `minSdkVersion` in `android/variables.gradle` to `23` to resolve minimum SDK requirement for `play-services-tasks` dependencies.

### 4. Manual OTA bundle artifact
- Added `npm run cap:ota:bundle`, backed by `scripts/build-capacitor-ota-bundle.py`.
- The script builds `dist/` first, zips safe web assets into `android/app/build/outputs/ota/`, writes a `.json` manifest with SHA256/size/file count, and stores no upload/API secrets.
- This prepares the app for Capgo Cloud or a self-hosted updater endpoint once the owner provides the deployment channel/key.

### 5. Verification
- Created `scripts/verify-android-capacitor.js` to assert:
  - Capgo updater package presence.
  - Safe `autoUpdate: false` default configuration.
  - Brand background/foreground color code and path resource existence.
  - No secret keys in config files.
  - Exclusions of `android/` and `android-native/` assets in `build-hosting-dist.js` (recursive check).
- Verified with syntax checks, Jest, all project verify scripts, and clean `./gradlew assembleDebug` debug APK build.
