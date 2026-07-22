# 2026-06-23 05:12 UTC — Kilo lint/error fixes

## Scope

User requested Hermes to run Kilo with `--auto` in `/home/longnick/projects/xekho`, then independently verify results.

## Changes

- `functions/telegram/orders.js`
  - Fixed a malformed duplicate `extractTelegramCashierName` declaration left around `normalizeTelegramTableLabel`.
  - Exported `normalizeTelegramTableLabel` for consistency with the compatibility wrapper path.
- `functions/index.js`
  - Removed a duplicate `getVietnamDateParts` compatibility wrapper; `telegramReports.getVietnamDateParts` remains the source of truth.
- `eslint.config.mjs`
  - Added `FormData` as a readonly browser/Node global so `functions/telegram/send.js` passes `no-undef`.

## Verification

- `npm run check` — pass
- `npm test -- --runInBand` — pass, 2 suites / 12 tests
- `npx eslint .` — pass with warnings only
- `npm run build:hosting` — pass, 83 files prepared
- `node scripts/verify-telegram-reports.js` — pass
- `node scripts/verify-telegram-orders.js` — pass, 55 checks
- `node scripts/verify-telegram-send.js` — pass
- `git diff --check` — pass
- `node --check functions/index.js functions/telegram/orders.js functions/telegram/send.js` — pass

## Notes

- No deployment was run.
- Existing untracked `.understand-anything/` was left untouched.
