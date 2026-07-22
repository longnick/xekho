# Inventory search hosting deploy

- Time: 2026-06-07 11:04 ICT
- Repo: `/home/longnick/projects/xekho`
- Branch: `push-clean-main-20260604-072900`
- Firebase project: `pos-v2-909ff`
- Hosting site: `xe-kho`
- Live URL: https://xe-kho.web.app

## Scope

- Checked prior task logs for purchase-entry (`Nhập hàng mới` / `Nhập kho`) and stocktake (`Kiểm kê kho`) search UI.
- Confirmed the current branch is `push-clean-main-20260604-072900`.
- Added an extra guardrail patch: purchase item `<option>` labels now escape item name/type before rendering.
- Kept purchase submit, stock mutation, stocktake save, Firestore, Functions, and credentials untouched.
- Deployed hosting only: `npx firebase-tools deploy --only hosting`.

## Verification

- `node --check app.js`
- `node scripts/verify-inventory-item-search.js`
- `npm run check`
- `npx tsc --noEmit -p jsconfig.json`
- `npx tsc --noEmit -p functions/tsconfig.json`
- `npm test -- --runInBand`
- `npm run lint` (0 errors, 5 existing warnings in extracted utility files)
- `git diff --check`
- Vite production build via `npx vite build` passed; classic-script bundling warnings are expected for this legacy IIFE/CommonJS app.
- Live HTTPS smoke confirmed these markers on `https://xe-kho.web.app/` and `app.js`: `#pur-item-search`, `#stocktake-item-search`, `.stocktake-results-scroll`, `.stocktake-modal-sheet`, `filterPurchaseItemOptions`, `filterStocktakeItems`, and hidden-row stocktake filtering.

## Deploy output

- Hosting upload complete.
- Version finalized.
- Release complete.
- Hosting URL: https://xe-kho.web.app

## Backup

- Focused backup before the extra guardrail patch: `/home/longnick/backups/xekho-inventory-search-20260607-040304`
