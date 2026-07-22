# 2026-06-17 - Telegram BigQuery reporting + month revenue fix

Repo: `/home/longnick/projects/xekho`
Branch: `push-clean-main-20260604-072900`

## Request

Allow the Telegram owner bot to read BigQuery for data answers, and investigate why a simple question like `doanh thu tháng này?` was not answered reliably.

## Root cause

Local parser verification showed `doanh thu tháng này?` already parses as a smart report:

- metric: `revenue`
- itemName: empty
- rangeLabel: `tháng này`
- range: start of current Vietnam month through current day boundary

The gap was in data-source coverage and fallback: deterministic report answers only read Firestore `history`; Gemini had no BigQuery tool; if Firestore was incomplete/empty for a wider range, the assistant could not use the BigQuery data source the owner expects.

## Implementation

- Added optional BigQuery runtime env support in `functions/index.js`:
  - `BIGQUERY_PROJECT_ID` optional, defaults to `pos-v2-909ff`
  - `BIGQUERY_DATASET_ID` optional
  - `BIGQUERY_SALES_TABLE` optional
- Added read-only BigQuery report executor in `functions/firestoreMegaTools.js`:
  - Uses `google-auth-library` with `bigquery.readonly` scope.
  - Uses Standard SQL only.
  - Auto-discovers a likely sales/history table when dataset/table config is not supplied.
  - Supports month/day/week/year range summaries for revenue, invoice count, cost, gross profit.
- Added Gemini tool declaration `truy_van_bigquery_pos` in `functions/geminiTools.js`.
- Wired deterministic Telegram smart reports and proactive insight comparisons to prefer BigQuery when available, with Firestore fallback if BigQuery is unavailable.
- Added regression verifier `scripts/verify-telegram-bigquery-reporting.js` for month-revenue parsing and read-only BigQuery wiring.

## Verification

Passed:

- `node --check functions/index.js`
- `node --check functions/firestoreMegaTools.js`
- `node --check functions/geminiTools.js`
- `node --check functions/telegram/reports.js`
- `node --check scripts/verify-telegram-reports.js`
- `node --check scripts/verify-telegram-owner-assistant-guard.js`
- `node --check scripts/verify-telegram-chart-menu-features.js`
- `node --check scripts/verify-telegram-bigquery-reporting.js`
- `node --check scripts/verify-gemini-function-call-thought-signature.js`
- `node scripts/verify-telegram-reports.js`
- `node scripts/verify-telegram-owner-assistant-guard.js`
- `node scripts/verify-telegram-chart-menu-features.js`
- `node scripts/verify-telegram-bigquery-reporting.js`
- `node scripts/verify-gemini-function-call-thought-signature.js`
- `git diff --check`
- `npx tsc --noEmit -p functions/tsconfig.json`
- `npm test -- --runInBand`

## Notes

BigQuery path is read-only and only executes generated SELECT summaries. It does not write, update, delete, or merge BigQuery data.

## Deploy

Deployed `functions:xekho:telegramWebhook` successfully after keeping BigQuery config optional via runtime env instead of mandatory Firebase params.

Live smoke:

- `doanh thu tháng này?` → HTTP 200 / `{ ok: true }`

Deploy env file was removed after deploy.
