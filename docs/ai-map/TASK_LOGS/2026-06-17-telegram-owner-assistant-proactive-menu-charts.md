# 2026-06-17 - Telegram owner assistant: proactive insights, menu answers, report charts

Repo: `/home/longnick/projects/xekho`
Branch: `push-clean-main-20260604-072900`

## Request

Expand the Telegram owner bot so it can:

- Act as a proactive owner assistant: warn about weak business metrics, suggest improvements, compare with same period last month.
- Answer menu/data questions such as `Món mực 1 nắng nướng muối ớt giá bao nhiêu?` and include dish images when stored in menu data.
- Add an inline chart prompt at the end of revenue/profit/purchase/expense report answers; when owner taps yes, render and send a chart for the answered result.

## Implementation

- Added deterministic proactive owner insight handler in `functions/index.js`:
  - Detects business-analysis/cảnh báo/gợi ý/so sánh questions.
  - Queries current month-to-date and comparable previous-month range via existing Firebase report tool.
  - Returns warnings, suggestions, and a chart inline button.
- Added menu price/image answer path:
  - Reads `Product_Catalog` and `Inventory_Items`.
  - Fuzzy token-matches item names.
  - Uses stored price and image fields (`image_url`, `imageUrl`, `realImageUrl`, `aiImageUrl`, etc.).
  - Sends image via Telegram photo message when available.
- Added chart-button flow:
  - Persists chart requests in `telegram_chart_requests`.
  - Adds `Bạn có muốn xem biểu đồ không?` inline button to deterministic report answers.
  - Handles `chart_<id>` callback.
  - Renders SVG -> PNG with `sharp` and sends via multipart Telegram `sendPhoto`.
- Added simple finance report path for nhập hàng/chi phí:
  - Purchases from `purchases`.
  - Expenses from `expenses`, `Expense_Records`, `costs` when present.

## Verification

Passed:

- `node --check functions/index.js`
- `node --check functions/telegram/send.js`
- `node --check functions/telegram/reports.js`
- `node --check scripts/verify-telegram-reports.js`
- `node --check scripts/verify-telegram-owner-assistant-guard.js`
- `node --check scripts/verify-telegram-chart-menu-features.js`
- `node --check scripts/verify-gemini-function-call-thought-signature.js`
- `node scripts/verify-telegram-reports.js`
- `node scripts/verify-telegram-owner-assistant-guard.js`
- `node scripts/verify-telegram-chart-menu-features.js`
- `node scripts/verify-gemini-function-call-thought-signature.js`
- `git diff --check`
- `npx tsc --noEmit -p functions/tsconfig.json`
- `npm test -- --runInBand`

## Notes

Deployed to `functions:xekho:telegramWebhook`. Live smoke tests returned HTTP 200 / `{ ok: true }` for proactive business warning, menu price/image question, and `Doanh thu hôm nay` chartable report. The `Doanh thu hôm nay` test creates a chart request document by design so the inline button can render the chart when pressed.
