# 2026-06-02 09:07 — Tooling cleanup after refactor audit

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`
Task: Fix actionable post-audit tooling regressions so lint/typecheck commands pass reliably.

## Changes

- Added `eslint` to root `devDependencies` and updated `package-lock.json`, restoring `npm run lint`.
- Added `ignoreDeprecations: "6.0"` to `jsconfig.json` and `functions/tsconfig.json` so TypeScript 6 deprecation handling no longer blocks checks.
- Fixed frontend `@ts-check` diagnostics in extracted modules:
  - `app/report/excel.js`
  - `app/report/expense.js`
  - `app/modules/media-refinery/index.js`
- Fixed backend `@ts-check` diagnostics in extracted modules:
  - `functions/telegram/send.js`
  - `functions/telegram/reports.js`
  - `functions/telegram/ads.js`
  - `functions/index.js` dependency wiring
- `functions/telegram/ads.js` now exposes `setAdsRevenueDataDependencies()` so Firestore/API/stateful loaders remain owned by `functions/index.js` and the extracted module avoids implicit globals.

## Safety

- Backups created under `/home/longnick/backups/xekho-tooling-cleanup-20260602-0902`.
- No `.env`, service-account JSON, credentials, production database, POS/payment/customer data, or migration files touched.
- No deploy or destructive git/database command run.

## Verification

- `npm run check` — PASS.
- Backend syntax check: `node --check functions/index.js` and `functions/utils/*.js functions/telegram/*.js` — PASS.
- `npm test -- --runInBand` — PASS, 6/6 Jest tests.
- `npx tsc --noEmit -p jsconfig.json` — PASS.
- `npx tsc --noEmit -p functions/tsconfig.json` — PASS.
- `npm run lint` — PASS with 0 errors / 5 warnings.
- `npx eslint functions/utils/ functions/telegram/` — PASS with 0 errors / 3 warnings.
- 33 `scripts/verify*.js` scripts — PASS.
- Ads dependency injection smoke test — PASS.

## Remaining

- Non-blocking ESLint warnings remain in existing code (`app/ui/toast.js`, `app/utils/storage.js`, `functions/telegram/orders.js`, `functions/utils/general.js`).
- Owner/manual blockers remain unchanged: credential rotation and git history cleanup decision.
