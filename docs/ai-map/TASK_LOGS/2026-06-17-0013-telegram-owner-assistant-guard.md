# 2026-06-17 00:13 - Telegram owner assistant guard

Repo: `/home/longnick/projects/xekho`
Branch: `push-clean-main-20260604-072900`

## Task

Owner approved tightening the Telegram bot so only the owner's Telegram ID can use the open AI/revenue/report assistant path, and the webhook uses the correct assistant/report bot function rather than falling back to kitchen bot configuration.

## Changes

- Added a pinned default owner Telegram ID allowlist entry for the current owner DM (`6496387732`) while still honoring `TELEGRAM_OWNER_CHAT_ID` when configured.
- Added `TELEGRAM_ASSISTANT_BOT_NAME` config for owner-only rejection copy and logs.
- Added assistant-specific bot token resolution for `telegramWebhook`: `TELEGRAM_REPORT_BOT_TOKEN` -> `TELEGRAM_BOT_TOKEN`; intentionally does not fall back to the kitchen-ready bot token.
- Added owner-only guards for:
  - open text AI / smart revenue questions,
  - voice/audio AI assistant path,
  - non-order photo OCR/import AI path,
  - ads/revenue report command path.
- Kept operational order-photo draft flow intact for the configured Telegram group context.
- Added `scripts/verify-telegram-owner-assistant-guard.js` to assert the guard markers and assistant bot-token separation.

## Files changed

- `functions/index.js`
- `scripts/verify-telegram-owner-assistant-guard.js`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/FILE_RELATIONS.md`
- `docs/ai-map/TASK_LOGS/2026-06-17-0013-telegram-owner-assistant-guard.md`

## Verification

- `node --check functions/index.js`
- `node --check scripts/verify-telegram-owner-assistant-guard.js`
- `node scripts/verify-telegram-owner-assistant-guard.js`

## Notes

No Firebase deploy was run. No production database/POS/payment/customer data was read or mutated.
