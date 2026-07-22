# Task Log — ESM Phase E5.8 Report Filter Controls

- Time: 2026-06-02 14:05
- Repo: `/home/longnick/projects/xekho`
- Branch: `test/xe-kho-repo-implementer-skill`
- Task: Continue E5 by replacing low-risk report menu filter/reset inline handlers with delegated ESM handling.

## Changes

- Added `app/esm/ui/report-filter-controls.js` with delegated change/click handling for report menu filter selects and reset buttons.
- Converted 2 duplicated report menu filter selects in `index.html` from inline `onchange` to `data-esm-report-menu-filter`.
- Converted 2 duplicated report reset buttons in `index.html` from inline `onclick` to `data-esm-report-filter-reset`.
- Updated `app/esm/main.js` to import/install `reportFilterControls` under `window.XekhoApp.esm.ui.reportFilterControls`.
- Bumped module cache/version to `20260602-e5-report-filter-controls`.
- Added `scripts/verify-esm-report-filter-controls.js`.
- Expanded `scripts/verify-esm-entry.js` for E5.8 markers.
- Kept legacy `setReportMenuFilter` and `resetReportFilters` untouched; ESM delegates at change/click time.

## Safety

- Backup: `/home/longnick/backups/xekho-esm-e5-report-filter-controls-20260602-135701`.
- Did not touch `.env`, credentials, production DB, migration files, POS/payment/customer data, backend Cloud Functions, or raw media.
- Did not change report filtering logic, report rendering, app state, package type, classic script order, or `app.js`.

## Evidence

- Inline handlers reduced from 204 to 200.
- `data-esm-report-menu-filter` count: 2.
- `data-esm-report-filter-reset` count: 2.
- Existing `data-esm-report-transaction-filter` count: 6.
- Existing `data-esm-finance-period` count: 5.
- Existing `data-esm-inventory-tab` count: 5.
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
node scripts/verify-esm-report-filter-controls.js
node scripts/verify-esm-report-transaction-filters.js
node scripts/verify-esm-finance-period.js
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

Continue E5 one island at a time. Suggested next candidates: simple navigation shortcut groups after dependency scan. Avoid POS order/payment/customer data and save/delete flows without mobile QA.
