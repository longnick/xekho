# 2026-06-26 09:06 - Capacitor OTA Self-Hosted Firebase Hosting Pipeline

Repo: `/home/longnick/projects/xekho`

Sprint: Self-host OTA pipeline using Firebase Hosting as the bundle CDN, backed by `@capgo/capacitor-updater`.

## Changes

### 1. `scripts/build-capacitor-ota-bundle.py` (modified)
- Added `'ota'` to `FORBIDDEN_PARTS` to prevent the OTA directory itself from being zipped (no recursion).
- After building the zip in `android/app/build/outputs/ota/`, copies zip + per-release manifest into `dist/ota/`.
- Writes `dist/ota/latest.json` with fields: `version`, `url`, `sha256`, `sizeBytes`, `fileCount`, `appId`, `createdAt`, `enabled`.
- URL path follows pattern `/ota/<stamp>.zip` served from Firebase Hosting `dist/`.

### 2. `cap-ota-updater.js` (new)
- IIFE, loaded as classic `<script>` tag; entirely no-op in browser (`Capacitor.isNativePlatform()` guard).
- On native: calls `notifyAppReady()`, fetches `https://xe-kho.web.app/ota/latest.json` with `cache: 'no-store'` by default.
- Supports override via `window.XEKHO_OTA_MANIFEST_URL` or `localStorage.cap_ota_manifest_url` for staging/testing.
- If `manifest.enabled && manifest.version` differs from `localStorage.cap_ota_last_attempted`, resolves relative manifest URLs against the manifest origin, downloads via `CapacitorUpdater.download({version, url})`, and applies via `set()`.
- Stores `version` to localStorage before download attempt; does not retry same broken version to prevent update loops.

### 3. `index.html` (modified)
- Added `<script src="cap-ota-updater.js?v=20260626-ota-firebase"></script>` after the ESM harness line.
- `build-hosting-dist.js` automatically copies root `.js` files — no build script change needed.

### 4. `scripts/verify-ota-firebase.js` (new)
- Checks `dist/ota/latest.json` exists and has all required fields.
- Checks `url` starts with `/ota/` and ends with `.zip`.
- Verifies zip file present in `dist/ota/`.
- Verifies sha256 and sizeBytes match manifest.
- Inspects zip entries via `unzip -Z1` (python3 fallback) — asserts `fileCount` and no forbidden entries (`ota/`, `android/`, `functions/`, `node_modules/`, `.env`, `google-services.json`, `serviceAccount*.json`).
- Checks per-release `.json` manifest also present in `dist/ota/`.

### 5. `package.json` + `firebase.json` (modified)
- Added `"cap:ota:verify": "node scripts/verify-ota-firebase.js"`.
- Firebase Hosting `predeploy` now runs `npm run cap:ota:bundle`, so `firebase deploy --only hosting` does not wipe `dist/ota/` with a plain rebuild.
- `deploy:hosting:fast` now lets Firebase run the hosting predeploy once instead of building twice.

## Verification Results

```
npm run cap:ota:bundle  → PASS (84 files, 451356 bytes)
npm run cap:ota:verify  → All OTA Firebase checks passed ✓
npm run check           → PASS (no syntax errors)
npm run cap:build       → PASS (BUILD SUCCESSFUL in 16s; existing AGP compileSdk 35 warning remains)
```

## Notes
- `dist/ota/` is served by Firebase Hosting (`"public": "dist"`) without any special rewrite rules.
- Native runtime fetches the remote Firebase Hosting manifest by default: `https://xe-kho.web.app/ota/latest.json`.
- No secrets touched. No deploy performed.
