# 2026-06-17 - Telegram month revenue zero regression

## Symptom

Owner asked `Doanh thu tháng này?`; bot answered `0đ / 0 đơn / 0đ lãi gộp` even though production Firestore has month sales.

## Root cause

The previous BigQuery integration made direct Telegram smart reports use `preferBigQuery: true`. BigQuery dataset/table discovery was not proven for the production sales table, so it could return an empty/zero summary and override the correct Firestore/POS report.

A direct Firestore REST check for the same month range showed non-zero data:

- Orders: 71
- Revenue: 43,271,400đ
- Cost: 22,504,675đ
- Gross profit: 20,766,725đ

## Fix

- Removed `preferBigQuery: true` from direct Telegram smart reports and proactive comparisons.
- Kept BigQuery as read-only Gemini tool / controlled fallback, but it may not override a Firestore/POS report just because it returns zero.
- Tightened `executeReportQuery()` so empty Firestore reports only fall through to BigQuery when explicitly allowed with `allowEmptyFirestoreBigQueryFallback`.
- Updated verifier to block future direct-report `preferBigQuery: true` regressions.

## Verification

Passed:

- `node --check functions/index.js`
- `node --check functions/firestoreMegaTools.js`
- `node --check scripts/verify-telegram-bigquery-reporting.js`
- `node scripts/verify-telegram-bigquery-reporting.js`
- `git diff --check`
- `npx tsc --noEmit -p functions/tsconfig.json`
- `npm test -- --runInBand`
