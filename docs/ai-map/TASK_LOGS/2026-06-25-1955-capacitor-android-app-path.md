# 2026-06-26 03:12 +07 - Capacitor Android App Path Added

Capacitor Android integration package added to bundle the existing xe-kho.web.app UI:
- Added `@capacitor/core` and `@capacitor/android` dependency in `package.json`.
- Added `@capacitor/cli` in devDependencies.
- Created `capacitor.config.ts` mapping the appId to `com.xekho.pos.capacitor` and `webDir` to `dist`.
- Added the standard `android/` Capacitor directory.
- Paused `android-native` Kotlin project (marked manual QA checklists and build notes as paused).
- Updated `scripts/build-hosting-dist.js` to exclude generated Android directories before preparing `dist`.
- Updated Jest ignore patterns so generated/copied web assets under `dist/`, `android/`, and `android-native/` do not duplicate tests.
- Successfully built Capacitor Android project debug APK via `npm run cap:build`.

Verification:
- `npm run cap:build` passed and produced `/home/longnick/projects/xekho/android/app/build/outputs/apk/debug/app-debug.apk`.
- APK forbidden-name scan for `google-services.json`, `.env`, service accounts, credentials, secrets, and `functions-list.json` returned no matches.
- APK SHA256: `7ead2f61787626b68f74dd8177406f95d45473dbf1093efb8d6cad4e99348a76` (4.2M).
- `npm run check` passed.
- `npm test -- --runInBand` passed with 1 suite / 6 tests after Jest ignores generated asset copies.
- Hosting/Capacitor asset exclusion check passed: no `dist/android` and no nested `android/app/src/main/assets/public/android`.
