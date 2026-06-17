# 2026-06-17 Telegram confirm order kitchen fix

## Symptom
- Owner pressed confirm in Telegram after asking the assistant to order food.
- Bot edited the message with mojibake text: `MÃ£`.
- Flow stopped after generic `Đã thực thi`; owner did not get a follow-up Telegram confirmation.
- Kitchen Telegram did not receive the new order.

## Root cause
1. `functions/index.js` had mojibake literals in callback result text (`MÃ£`).
2. `sendKitchenNewOrderTelegram()` used the report-bot token and the legacy new-order/group chat id. Production Telegram returned `Bad Request: chat not found` from `telegramOnKitchenOrderCreated`.
3. Confirm callback depended on Firestore background order triggers for kitchen Telegram. For Telegram-confirmed orders this was not sufficiently direct/observable; owner only saw an edited message.

## Fix
- Added dedicated kitchen new-order token/chat resolvers:
  - token priority: `TELEGRAM_KITCHEN_READY_BOT_TOKEN`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_REPORT_BOT_TOKEN`.
  - chat priority: `TELEGRAM_KITCHEN_READY_CHAT_ID`, `KITCHEN_NEW_ORDER_TELEGRAM_CHAT_ID`, `TELEGRAM_GROUP_CHAT_ID`.
- `executeOrderAction()` now returns resolved items so the callback can notify kitchen synchronously.
- Confirm callback now:
  - executes the pending action;
  - sends kitchen Telegram immediately for `goi_mon_ban`;
  - edits the original message with clean Vietnamese and kitchen delivery status;
  - sends a fresh owner confirmation message so the owner sees a new Telegram notification.
- Added `scripts/verify-telegram-confirm-order-flow.js` regression guard.

## Verification
- `node scripts/verify-telegram-confirm-order-flow.js` passed.
- `npx tsc --noEmit -p functions/tsconfig.json` passed.
- `npm test -- --runInBand` passed: 2 suites / 12 tests.
- Deployed:
  - `functions:xekho:telegramWebhook`
  - `functions:xekho:telegramOnKitchenOrderCreated`
  - `functions:xekho:telegramOnKitchenOrderUpdated`
- Telegram webhook target check passed with `pendingUpdateCount=0`.
- Live Telegram smoke sent a marked TEST message to the kitchen chat successfully (`messageId=true`, chat suffix `0976`).
- Cloud Logging check after deploy found 0 new errors for the three affected services.

## Notes
- Existing legacy chat ids ending `7614` are still present in env but do not work with the kitchen bot (`chat not found`). Code now prioritizes the working kitchen-ready chat id ending `0976`.
- A temporary local `functions/.env.pos-v2-909ff` was created for Firebase non-interactive deploy and removed after deploy.
