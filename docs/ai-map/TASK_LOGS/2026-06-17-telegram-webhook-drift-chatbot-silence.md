# 2026-06-17 Telegram webhook drift incident

## Symptom
- Owner sent three messages to ChatbotXeKho and saw no replies.
- Telegram `getWebhookInfo` reported `pending_update_count=9` and `last_error_message="Wrong response from the webhook: 500 Internal Server Error"`.

## Root cause
- The bot token used by the XE KHO owner assistant was pointed at the wrong webhook target: `aidirectorbrieftelegramwebhook`.
- That service returned repeated HTTP 500 errors with `ReferenceError: extractTelegramMediaPayload is not defined`.
- Therefore updates never reached the XE KHO `telegramWebhook` deterministic handlers.

## Fix
- Repointed Telegram webhook to the deployed XE KHO Cloud Run service `telegramwebhook`.
- Used `drop_pending_updates=true` to clear stale retries from the wrong target and avoid delayed spam.
- Added guards:
  - `scripts/verify-telegram-owner-assistant-regressions.js`
  - `scripts/check-telegram-webhook-target.js`

## Verification
- `getWebhookInfo`: webhook URL is the XE KHO `telegramwebhook` service, `pendingUpdateCount=0`, no last error.
- Direct live smoke through `telegramWebhook` for:
  - `Doanh thu thang nay?`
  - `Thang nay ban duoc bao nhieu`
  - `Muc kho gia bao nhieu?`
- All three returned HTTP 200 with `{ ok: true }` and sent Telegram replies.
- Checks run:
  - `node --check scripts/verify-telegram-owner-assistant-regressions.js`
  - `node --check scripts/check-telegram-webhook-target.js`
  - `node --check functions/index.js`
  - `node --check functions/telegram/reports.js`
  - `node --check functions/telegram/send.js`
  - `node scripts/verify-telegram-owner-assistant-regressions.js`
  - `node scripts/check-telegram-webhook-target.js`
  - `git diff --check`
  - `npx tsc --noEmit -p functions/tsconfig.json`
  - `npm test -- --runInBand`

## Notes
- No secrets, bot tokens, or full webhook URLs were printed.
- No database writes were performed by the fix besides Telegram webhook configuration at Telegram API level.
