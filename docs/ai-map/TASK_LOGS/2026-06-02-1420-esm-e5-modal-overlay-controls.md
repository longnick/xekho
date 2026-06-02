# Task Log — ESM Phase E5.9 Modal Overlay Controls

- Time: 2026-06-02 14:20
- Repo: `/home/longnick/projects/xekho`
- Branch: `test/xe-kho-repo-implementer-skill`
- Task: Continue E5 by replacing low-risk modal overlay/close/image-zoom inline handlers with delegated ESM handling.

## Changes

- Added `app/esm/ui/modal-overlay-controls.js`.
- Converted 15 modal overlay self-dismiss handlers from inline `onclick` to `data-esm-modal-self-dismiss`.
- Converted 19 modal close buttons from inline `document.getElementById(...).classList.remove('active')` to `data-esm-modal-close`.
- Converted 1 purchase-photo batch overlay self-close-by-id handler to `data-esm-modal-close-self`.
- Converted 2 image zoom overlay self-dismiss handlers to `data-esm-image-zoom-self-dismiss`.
- Converted 2 image zoom reset buttons to `data-esm-image-zoom-reset`.
- Converted 2 image zoom close buttons to `data-esm-image-zoom-close`.
- Updated `app/esm/main.js` to import/install `modalOverlayControls` under `window.XekhoApp.esm.ui.modalOverlayControls`.
- Bumped ESM entry cache/version to `20260602-e5-modal-close-controls`.
- Added `scripts/verify-esm-modal-overlay-controls.js`.
- Expanded `scripts/verify-esm-entry.js` for E5.9 markers.

## Safety

- Backup: `/home/longnick/backups/xekho-esm-e5-modal-overlay-controls-20260602-141011`.
- Did not touch `.env`, credentials, production DB, migration files, POS/payment/customer data, backend Cloud Functions, or raw media.
- Did not change modal business logic; this island only preserves existing close/dismiss/reset/detach behavior through delegated handlers.

## Evidence

- Inline handlers reduced from 200 to 159.
- `data-esm-modal-self-dismiss`: 15.
- `data-esm-modal-close`: 19.
- `data-esm-modal-close-self`: 1.
- `data-esm-image-zoom-self-dismiss`: 2.
- `data-esm-image-zoom-reset`: 2.
- `data-esm-image-zoom-close`: 2.
- Local classic scripts remain: 31.

## Verification

Passed during sprint:

```bash
for f in app/esm/main.js app/esm/adapters/*.js app/esm/utils/*.js app/esm/auth/*.js app/esm/ui/*.js; do node --input-type=module --check < "$f"; done
node scripts/verify-esm-modal-overlay-controls.js
node scripts/verify-esm-entry.js
npx tsc --noEmit -p jsconfig.json
npx tsc --noEmit -p functions/tsconfig.json
npm test -- --runInBand
npm run lint -- --max-warnings=9999
git diff --check
```

Notes:

- Jest: 1 suite / 6 tests passed.
- Lint: 0 errors, 5 existing warnings in `app/ui/toast.js` and `app/utils/storage.js`.

## Remaining / blocker classification

E5 now has 159 inline handlers left. Many remaining handlers are not safe to batch-migrate without UI/mobile QA because they include submit/save/reset/data/POS/media flows such as `submitSettings(event)`, POS/cart/order controls, uploads, imports/exports, cleanup/reset, and business-data mutation buttons.

## Next

If continuing E5, pick another narrow low-risk cluster only after scanning exact handlers. Do not one-shot migrate save/delete/payment/order/customer/media/data-reset flows.
