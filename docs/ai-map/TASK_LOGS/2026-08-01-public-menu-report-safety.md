# Public-menu report safety

- Scope: read-only report paths only.
- Fix: `executeReportQuery`, `getProfitReport`, and daily Telegram report read `public_menu` in same run.
- Saleable: document exists and `hidden !== true`; `available` intentionally unused because projection does not write it.
- Price: output exposes `livePrice` from `public_menu`; historical POS price retained as `historicalPrice`.
- Failure: `public_menu` read failure is fail-closed for report query; no BigQuery/POS-only fallback.
- Verification: `functions/public-menu-report.test.js`, `node --check`, `git diff --check`.
- Not deployed.
