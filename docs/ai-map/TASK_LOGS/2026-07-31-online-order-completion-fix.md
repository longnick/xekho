# Task: Online order completion money + Telegram callback reliability

Date: 2026-07-31
Repo: /tmp/xekho-online-order-fix
Branch: ok
AI/Agent: Hermes subagent
User request: Implement Phase 1-4 online order fix. No deploy, secrets, production DB.

## Before state

- Existing branch: `ok`, detached at `6df16d5`.
- Existing uncommitted files: none.
- Relevant AI map files read: `PROJECT_OVERVIEW.md`, `CODE_MAP.md`, `FILE_RELATIONS.md`, `CHANGELOG_AI.md`, `TODO_AI.md`, `DECISIONS.md`.
- Relevant source files read: `db.js`, `app.js`, `functions/index.js`, `functions/telegram/online-orders.js`, Telegram wiring tests.

## Goal

Giữ tiền/món live khi tạo history; thêm callable server-side hoàn tất đơn online từ canonical POS order; browser không còn tự đóng POS order; đồng bộ terminal status; ACK Telegram sớm, log lỗi edit, chặn món online giá 0.

## Files changed

- `db.js`: reread live order inside `Orders.close` transaction; history copies live order data.
- `functions/telegram/online-orders.js`: positive-price validator; percent/VND completion-total helper; fix `ĐANG GIAO` control-character label.
- `functions/index.js`: validate online POS items; calculate history discount amount; preserve explicit history money fields and `ONL-` bill number; deduct `Inventory_Items` through linked retail inventory or `Recipes_BOM` in same transaction; require recipe/link/inventory but floor insufficient stock at zero; snapshot item/history COGS; catch/log early Telegram ACK failure and edit failure.
- `functions/onlineOrderCompletionWiring.test.js`: focused percent/VND/shipping/VAT behavior tests plus completion, inventory, history, ACK source wiring.
- `docs/ai-map/CHANGELOG_AI.md`: changelog entry.
- `docs/ai-map/TODO_AI.md`: completion entry.
- `docs/ai-map/FILE_RELATIONS.md`: order/history/Telegram relations.
- `docs/ai-map/TASK_LOGS/2026-07-31-online-order-completion-fix.md`: task record.

## Code relations

- `app.js#completeOnlineOrder()` calls protected `completeOnlineOrder` callable.
- `functions/index.js#completeOnlineOrderInternal()` writes `history`, deletes `orders`, resets table, and deducts inventory in one transaction; missing inventory aborts, insufficient stock floors at zero.
- `functions/index.js#onHistoryFinalizeCustomerOrderRequests` handles created history and calls `syncOnlineOrderCompletedFromHistory()` because deleted orders cannot emit update completion.
- `functions/index.js#approveOnlineOrderInternal()` uses `functions/telegram/online-orders.js` item builder and validator.
- `functions/index.js#telegramWebhook` handles online callback ACK/edit.

## Decisions made

- Validate generated POS item prices before any approval transaction write.
- ACK Telegram online callback immediately with `Đang xử lý đơn.`; ACK and later edit are best effort, both logged on failure.
- Server completion uses existing canonical `Product_Catalog` + `Recipes_BOM` + `Inventory_Items` schema. No valid inventory mapping means transaction aborts before history/order writes.
- Keep existing history-created completion sync; no duplicate trigger added.
- Do not touch `env`, secrets, production DB, deploy, migrations, or POS data.

## Verification

- RED: `npx jest --runInBand functions/onlineOrderCompletionWiring.test.js` failed as expected: missing validator, missing live snapshot wiring, ACK order, edit logging.
- P1 RED: `npx jest --runInBand functions/onlineOrderCompletionWiring.test.js` => `PASS (13) FAIL (3)`: fractional percent money, insufficient-stock rejection, and missing retail COGS fallback.
- P1 GREEN: `npx jest --runInBand functions/onlineOrderCompletionWiring.test.js` => `PASS (16) FAIL (0)`.
- `npm run check:functions` => PASS.
- `node --input-type=module --check < db.js` => PASS.
- `node --check app.js` => PASS.
- `node --check functions/telegram/online-orders.js` => PASS.
- `git diff --check` => PASS.
- Root `npm ci --ignore-scripts` and `functions/npm ci --ignore-scripts` => completed.
- `npm test -- --runInBand` => `26 suites passed`, `267 tests passed`.
- `npm run check` => PASS.
- `npm ci` audit output: root 17 findings (3 low, 9 moderate, 4 high, 1 critical); functions 16 findings (11 moderate, 5 high).

## Remaining issues

- No live Firestore/Telegram test, deploy, or production smoke by explicit scope.
- Existing dependency audit findings remain.

## Next step

Owner review focused diff, then separately approve release/deploy and live synthetic smoke.

## Safety notes

No secrets, database, migration, POS data, or raw media were touched. No deploy.
