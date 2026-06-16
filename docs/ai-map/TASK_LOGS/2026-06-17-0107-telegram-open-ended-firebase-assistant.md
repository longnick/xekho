# 2026-06-17 01:07 - Telegram open-ended Firebase assistant fixes

Repo: `/home/longnick/projects/xekho`
Branch: `push-clean-main-20260604-072900`

## User report

Bot could not answer:

- `Hôm qua bán bao nhiêu bia?`
- `Bạn có thể làm gì?`

User expectation: Telegram bot should not only answer fixed commands. It should behave like a Gemini-style assistant that can understand natural questions and read real data from Firebase/BigQuery sources.

## Root cause

- `parseTelegramSmartReportIntent()` only handled explicit `từ ... đến bây giờ` ranges. Natural relative-date quantity questions such as `hôm qua bán bao nhiêu bia` fell through to the LLM path.
- The LLM prompt did not strongly require tool use for natural item-sales quantity questions.
- Capability/identity questions had no deterministic response, so they depended on generic model behavior.

## Change

- Added natural relative-date report parsing for `hôm qua/hôm nay/tuần này/tháng này/năm nay`.
- Added item extraction for questions such as `Hôm qua bán bao nhiêu bia?`, producing `metric=quantity`, `itemName=bia`, range `hôm qua`.
- Added deterministic assistant capability response explaining open-ended AI behavior, Firebase/POS data access, write-confirmation safety, and BigQuery readiness when configured.
- Strengthened Gemini system prompt so non-fixed natural questions should call read tools before answering with numbers.
- Expanded verifiers for natural item-sales questions and capability behavior.

## Verification

- `node --check functions/index.js`
- `node --check functions/vertexAi.js`
- `node --check functions/telegram/reports.js`
- `node --check scripts/verify-telegram-reports.js`
- `node --check scripts/verify-telegram-owner-assistant-guard.js`
- `node --check scripts/verify-gemini-function-call-thought-signature.js`
- `node scripts/verify-telegram-reports.js`
- `node scripts/verify-telegram-owner-assistant-guard.js`
- `node scripts/verify-gemini-function-call-thought-signature.js`
- `git diff --check`
- `npx tsc --noEmit -p functions/tsconfig.json`
- `npm test -- --runInBand`

## Notes

No database mutation. Deployed to `xekho:telegramWebhook`. Live smoke tests for `Hôm qua bán bao nhiêu bia?` and `Bạn có thể làm gì?` both returned HTTP 200 / `{ ok: true }`.
