# 2026-06-17 00:49 - Telegram shop name and 18h yesterday range fix

Repo: `/home/longnick/projects/xekho`
Branch: `push-clean-main-20260604-072900`

## User report

- Bot replied with the wrong shop name: `Xe Kho Chứa Lạnh`.
- Correct shop name: `Xe Khô Chữa Lành`.
- Bot did not answer: `Doanh thu từ 18h hôm qua đến bây giờ?`

## Root cause

- `askGeminiWithFirestoreTools()` system prompt still used the old/wrong unaccented shop name.
- `parseTelegramSmartReportIntent()` could parse the time range, but incorrectly captured the entire range text as `itemName` when the query was range-only (`doanh thu từ ... đến ...`). That sent a needless `ten_mon` filter and prevented the generic revenue answer.

## Change

- Corrected the Telegram AI system prompt to `Xe Khô Chữa Lành` and added an explicit instruction to always use that exact name.
- Changed smart-report item extraction to derive item text from the content before `từ ... đến ...`, so range-only questions keep `itemName: ''` while item-scoped questions still work.
- Expanded verifiers for:
  - `Doanh thu từ 18h hôm qua đến bây giờ?`
  - item-scoped range queries,
  - exact shop name in the assistant prompt.

## Verification

- `node --check functions/index.js`
- `node --check functions/telegram/reports.js`
- `node --check scripts/verify-telegram-reports.js`
- `node --check scripts/verify-telegram-owner-assistant-guard.js`
- `node scripts/verify-telegram-reports.js`
- `node scripts/verify-telegram-owner-assistant-guard.js`

## Notes

No database mutation. Deploy after verification is required for Telegram production behavior.
