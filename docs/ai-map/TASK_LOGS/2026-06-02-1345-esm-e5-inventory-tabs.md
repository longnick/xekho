# Task Log — ESM Phase E5.5 Inventory Tabs

- Time: 2026-06-02 13:45
- Repo: `/home/longnick/projects/xekho`
- Branch: `test/xe-kho-repo-implementer-skill`
- Task: Continue E5 by replacing the next low-risk inventory tab inline-handler island with delegated ESM handling.

## Changes

- Added `app/esm/ui/inventory-tabs.js` with delegated click handling for inventory tab controls.
- Converted 5 inventory tab buttons in `index.html` from inline `onclick` to `data-esm-inventory-tab`:
  - stock
  - menu
  - purchase
  - ledger
  - stocktake
- Updated `app/esm/main.js` to import/install `inventoryTabs` under `window.XekhoApp.esm.ui.inventoryTabs`.
- Bumped module cache/version to `20260602-e5-inventory-tabs`.
- Added `scripts/verify-esm-inventory-tabs.js`.
- Expanded `scripts/verify-esm-entry.js` for E5.5 markers.
- Kept legacy `switchInvTab` untouched; ESM delegates at click time.
- Kept the inventory more modal inline handler unchanged for a later action/modal island.

## Safety

- Backup: `/home/longnick/backups/xekho-esm-e5-inventory-tabs-20260602-134254`.
- Did not touch `.env`, credentials, production DB, migration files, POS/payment/customer data, backend Cloud Functions, or raw media.
- Did not change inventory CRUD, purchase forms, stocktake flows, package type, classic script order, or `app.js`.

## Evidence

- Inline handlers reduced from 220 to 215.
- `data-esm-inventory-tab` count: 5.
- Existing `data-esm-report-period` count: 5.
- Existing `data-esm-report-date-mode` count: 2.
- Existing `data-esm-settings-tab` count: 7.
- Existing `data-esm-report-tab` count: 4.
- Existing `data-esm-header-action` count: 4.
- Local classic scripts remain: 31.

## Verification

Passed full gate:

```bash
for f in app/esm/main.js app/esm/adapters/*.js app/esm/utils/*.js app/esm/auth/*.js app/esm/ui/*.js; do node --input-type=module --check < "$f"; done
node scripts/verify-esm-inventory-tabs.js
node scripts/verify-esm-report-date-controls.js
node scripts/verify-esm-settings-tabs.js
node scripts/verify-esm-report-tabs.js
node scripts/verify-esm-header-actions.js
node scripts/verify-esm-ui-image-zoom.js
node scripts/verify-esm-runtime-adapters.js
node scripts/verify-esm-leaf-facades.js
node scripts/verify-esm-dom-utils.js
node scripts/verify-esm-entry.js
npm run check
npx tsc --noEmit -p jsconfig.json
npx tsc --noEmit -p functions/tsconfig.json
npm test -- --runInBand
npm run lint -- --max-warnings=9999
npx vite build
git diff --check
```

Notes:

- Jest: 1 suite / 6 tests passed.
- Lint: 0 errors, 5 existing warnings in `app/ui/toast.js` and `app/utils/storage.js`.
- Vite: build passed; classic-script warnings remain expected.

## Next

Continue E5 one island at a time. Suggested next candidates: low-risk modal opener actions or read-only report export controls after scanning dependencies. Avoid POS order/payment flows and inventory CRUD/save flows until explicit mobile/browser QA is available.
