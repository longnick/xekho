# Hosting deploy speed optimization

- Time: 2026-06-07 11:19 ICT
- Repo: `/home/longnick/projects/xekho`
- Branch: `push-clean-main-20260604-072900`
- Firebase project: `pos-v2-909ff`
- Hosting site: `xe-kho`
- Live URL: https://xe-kho.web.app

## Problem

Firebase Hosting previously deployed from repo root (`hosting.public = "."`). That made Firebase scan a broad working tree and report 238 deployable files even for small UI changes.

## Change

- Switched Hosting public directory to `dist`.
- Added `scripts/build-hosting-dist.js` to build Vite output and copy only runtime static assets required by the legacy classic-script app into `dist`.
- Added `npm run build:hosting` and `npm run deploy:hosting:fast`.
- Added Firebase Hosting `predeploy` so `npx firebase-tools deploy --only hosting` automatically prepares `dist` first.
- Ignored `.firebase/` generated cache files in `.gitignore`.
- Kept Functions, Firestore rules, secrets, service accounts, production data, and stock/POS logic untouched.

## Result

- Hosting artifact: 83 files, 1.73 MB prepared in `dist`.
- Firebase deploy now reports `found 83 files in dist` instead of the previous `found 238 files in .`.
- Measured deploy command wall time: 12 seconds, including predeploy build.
- Live smoke on https://xe-kho.web.app confirmed inventory search markers and app JS markers after release.
- `/functions/index.js` now returns 404 from Hosting, confirming backend source is no longer part of static hosting output.

## Verification

- `node --check scripts/build-hosting-dist.js`
- JSON parse `package.json` and `firebase.json`
- `npm run build:hosting`
- Checked required runtime files exist in `dist`: `index.html`, `app.js`, `data.js`, `store.js`, `db.js`, AI scripts, offline scripts, `kitchen.html`, `manifest.json`.
- Checked forbidden paths absent from `dist`: `serviceAccountKey.json`, `functions/index.js`, `.env.local`, `docs/ai-map`, `.codex`.
- Local static smoke via `python3 -m http.server 5179 --directory dist` and `curl`.
- `node scripts/verify-inventory-item-search.js`
- `git diff --check`
- `npx firebase-tools deploy --only hosting`
- Live HTTPS curl smoke for `#pur-item-search`, `#stocktake-item-search`, `/assets/main-`, `filterPurchaseItemOptions()`, and `filterStocktakeItems()`.

## New command

```bash
npm run deploy:hosting:fast
```

or existing command remains safe/fast because Firebase runs the predeploy build:

```bash
npx firebase-tools deploy --only hosting
```
