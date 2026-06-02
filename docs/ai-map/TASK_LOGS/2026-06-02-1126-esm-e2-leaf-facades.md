# Task Log — ESM Phase E2 Leaf Facades Complete

- Time: 2026-06-02 11:26
- Repo: `/home/longnick/projects/xekho`
- Branch: `test/xe-kho-repo-implementer-skill`
- Task: Finish the safe ESM Phase E2 leaf facade set after user explicitly allowed file writes.

## Changes

- Added `app/esm/utils/format.js` with importable formatter helpers and `installGlobalFormatUtils()`.
- Added `app/esm/utils/date.js` with importable date helpers and `installGlobalDateUtils()`.
- Added `app/esm/utils/excel.js` with importable worksheet-formatting helpers and `installGlobalExcelUtils()`.
- Added `app/esm/auth/staff.js` with importable pure staff helpers and `installGlobalStaffAuth()`.
- Updated `app/esm/main.js` to import/install DOM + format + date + Excel + staff facades and record `XekhoApp.esm.facades.*`.
- Updated `index.html` module cache key to `20260602-e2-leaf-facades`.
- Added `scripts/verify-esm-leaf-facades.js` and expanded `scripts/verify-esm-entry.js`.
- Updated AI map docs: changelog, TODO, refactor progress, ESM audit, code map, file relations.

## Safety

- Backed up touched files under `/home/longnick/backups/xekho-esm-e2-leaf-facades-20260602-112000`.
- Did not touch `.env`, credentials, production database, migration files, POS/payment/customer data, or backend Cloud Functions.
- Did not change `app.js`; classic IIFE/global runtime remains in place.
- Kept root `package.json` as `commonjs`.

## Verification

Passed:

```bash
node scripts/verify-esm-leaf-facades.js
node scripts/verify-esm-dom-utils.js
node scripts/verify-esm-entry.js
npm run check
npx tsc --noEmit -p jsconfig.json
npx tsc --noEmit -p functions/tsconfig.json
npm test -- --runInBand
npm run lint -- --max-warnings=9999
node - <<'JS'
const { execSync } = require('child_process');
const out = execSync('npx vite build 2>&1', { timeout: 30000, encoding: 'utf8' });
console.log(out);
JS
git diff --check
```

Notes:

- Jest: 1 suite / 6 tests passed.
- Lint: 0 errors, 5 existing warnings in `app/ui/toast.js` and `app/utils/storage.js`.
- Vite: build passed; classic-script bundling warnings are expected for this migration stage.

## Next

- Continue with Phase E3 runtime adapters (`app/esm/adapters/dom.js`, `store.js`, `db.js`) before importing any stateful code.
