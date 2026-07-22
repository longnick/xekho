# Phase 10 Sprint 10.1: Telegram report helpers batch 2

**Date:** 2026-06-02
**Repo:** `/home/longnick/projects/xekho`
**Branch:** `test/xe-kho-repo-implementer-skill`

## Summary

Extended `functions/telegram/reports.js` with 11 new pure functions/constants extracted from `functions/index.js`. Added delegation wrappers. Updated verification script.

## Functions extracted

1. `coerceHistoryDate` - Pure date coercion (Date/string/number/Firestore Timestamp → Date)
2. `formatTelegramDateTimeVi` - Vietnamese date-time formatting via Intl
3. `getTelegramPayMethodLabel` - Pay method → Vietnamese label
4. `isTelegramBankPayMethod` - Check if pay method is bank/transfer/QR
5. `formatTelegramSmartRangeLabel` - Date range → Vietnamese label
6. `parseTelegramSmartReportIntent` - Parse Vietnamese smart report query intent
7. `DEFAULT_TELEGRAM_REPORT_SETTINGS` - Default report settings constant
8. `getVietnamBusinessReportRange` - Calculate Vietnam business day report range
9. `getTelegramReportSettings` - Parse report settings from raw config
10. `getTelegramReportRangeKey` - Generate unique range key for dedup
11. `shouldSendTelegramReportNow` - Check if report should send now

## Stats

- `functions/telegram/reports.js`: 8 → 19 exports (+11)
- `functions/index.js`: 6816 → 6701 lines (-115 lines)
- Delegation wrappers added: 10 functions + 1 constant

## Verification

- `node --check functions/index.js` ✅
- `node --check functions/telegram/reports.js` ✅
- `node scripts/verify-telegram-reports.js` ✅ (19 exports verified)
- VM sandbox `instanceof Date` pitfall fixed (use `typeof value.getTime === 'function'` instead)

## Pitfalls encountered

- `instanceof Date` fails in VM sandbox (same as `instanceof RegExp` pitfall)
- Fixed by checking `typeof value.getTime === 'function'` instead
