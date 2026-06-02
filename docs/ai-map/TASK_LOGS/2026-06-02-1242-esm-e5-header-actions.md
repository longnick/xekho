# Task Log — ESM Phase E5.1 Header Actions

- Time: 2026-06-02 12:42
- Repo: `/home/longnick/projects/xekho`
- Branch: `test/xe-kho-repo-implementer-skill`
- Task: Continue E5 by replacing one low-risk inline-handler island with delegated ESM handling.

## Changes

- Added `app/esm/ui/header-actions.js` with delegated click handling for static header actions.
- Converted 4 header buttons in `index.html` from inline `onclick` to `data-esm-header-action`:
  - `ai-mic-btn` → `ai`
  - `header-alert-btn` → `stock-alert`
  - `header-reload-btn` → `hard-reload`
  - `header-logout-btn` → `logout`
- Updated `app/esm/main.js` to import/install `headerActions` under `window.XekhoApp.esm.ui.headerActions`.
- Bumped module cache/version to `20260602-e5-header-actions`.
- Added `scripts/verify-esm-header-actions.js`.
- Expanded `scripts/verify-esm-entry.js` for E5.1 markers.

## Safety

- Backup: `/home/longnick/backups/xekho-esm-e5-header-actions-20260602-123606`.
- Did not touch `.env`, credentials, production DB, migration files, POS/payment/customer data, backend Cloud Functions, or raw media.
- Did not remove global fallback functions; header actions still call existing legacy globals.
- Did not change package type or classic script order.

## Evidence

- Inline handlers reduced from 243 to 238.
- `data-esm-header-action` count: 4.
- Local classic scripts remain: 31.
- Local module scripts remain: 2.

## Verification

Passed full gate:

```bash
for f in app/esm/main.js app/esm/adapters/*.js app/esm/utils/*.js app/esm/auth/*.js app/esm/ui/*.js; do node --input-type=module --check < "$f"; done
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

Continue E5 one island at a time. Suggested next candidate: a similarly static header/sidebar/report filter cluster, not a POS order/payment flow, unless mobile QA is available immediately.
