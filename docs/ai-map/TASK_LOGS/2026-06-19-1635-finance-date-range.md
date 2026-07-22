# Finance date-range report sync

Time: 2026-06-19 16:35 +07
Repo: `/home/longnick/projects/xekho`
Branch: `push-clean-main-20260604-072900`

## User request

Check and fix the Finance tab when selecting a report from 2026-06-01 to 2026-06-18 because the displayed data is incorrect.

## Root cause

`applyDateFilter('finance')` computed `period = 'range'` when the user selected range mode, but it only updated `financeDateOpts`. It did not update the global `financePeriod` before calling `updateFinanceUI()`. Revenue used the local `period` argument, but operational expenses, fixed-cost day counts, chart/list helpers, and some detail popups read `financePeriod` + `financeDateOpts`, so they could still render as the previous `day` or `month` period.

`openDiscountDetails()` also read `filterHistory(financePeriod)` without passing `financeDateOpts`, so discount details could ignore the selected custom range.

## Changes

- `app.js`
  - In the Finance branch of `applyDateFilter()`, assign `financePeriod = period` before `getRevenueSummary()` and `updateFinanceUI()`.
  - Pass `financeDateOpts` into `openDiscountDetails()` filtering.
- `index.html`
  - Bumped `app.js` cache key to `20260619-finance-range-fix`.
- `scripts/verify-finance-date-range.js`
  - Added a deterministic regression verifier for the Finance custom range state sync and discount details range filter.
- `docs/ai-map/*`
  - Updated changelog/TODO/code map/file relations and this task log.

## Verification

- RED before fix: `node scripts/verify-finance-date-range.js` failed with `finance date filter must persist computed period...`.
- GREEN after fix:
  - `node scripts/verify-finance-date-range.js`
  - `node --check app.js`
  - `node --check scripts/verify-finance-date-range.js`
  - `npm run check`
  - `npm run build:hosting`
  - `git diff --check`

## Notes

No production database, POS data, secrets, or migrations were touched. Pre-existing dirty files outside this task were left untouched.
