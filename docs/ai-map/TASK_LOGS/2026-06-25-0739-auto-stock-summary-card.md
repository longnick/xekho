# Task: Auto stock norm compact ordering summary

Date: 2026-06-25 07:39 +07
Repo: `/home/longnick/projects/xekho`
Branch: `task/kilo-fix-20260623-050807`
AI/Agent: Hermes
User request: Rút gọn `Định mức tồn kho tự động` thành một thẻ tổng quan; bấm vào thẻ mới hiện hôm nay cần đặt gì, tổng tiền dự kiến, quy đổi bia lon thành thùng chẵn 24 lon/thùng; chi tiết chỉ mở khi bấm từng món.

## Before state

- Existing branch: `task/kilo-fix-20260623-050807`
- Existing uncommitted files before this task: `.understand-anything/` untracked only.
- Relevant skills/references read: `xekho-main-repo-coder`, `xekho-code-memory`, `references/xekho-auto-stock-norm-board.md`.
- Relevant image inspected: user screenshot showing the auto stock norm section was too long/dense on mobile.
- Relevant source files read: `index.html`, `app.js`, `style.css`, `scripts/verify-auto-stock-norm.js`.

## Goal

Làm giao diện ngắn gọn và có tính hành động hơn:

- Màn hình chính chỉ thấy một thẻ `Định mức tồn kho tự động` gọn.
- Bấm vào thẻ thì hiện tổng quan nhập hàng hôm nay.
- Với bia/lon, quy đổi số lượng cần nhập sang thùng chẵn 24 lon/thùng.
- Hiển thị tổng tiền nhập hàng dự kiến trước.
- Không còn bảng dài nhiều chỉ số; muốn xem lý do thì bấm từng món.

## Files changed

- `index.html`
  - Removed old filter select from the card header.
  - Made the auto-stock card clickable via `toggleAutoStockNormOverview(event)`.
  - Bumped `style.css` and `app.js` cache keys to `20260625-auto-stock-summary`.
- `app.js`
  - Added `getAutoStockNormPurchaseInfo(row)`.
  - Added `toggleAutoStockNormOverview(event)`.
  - Replaced verbose summary/table render with compact summary card + expandable item list.
  - Calculates beer/lon packaging as 24 cans per case and rounds up to whole cases.
  - Calculates estimated purchase cost from current inventory `costPerUnit` multiplied by rounded order quantity.
- `style.css`
  - Added compact summary UI classes: `.auto-stock-compact`, `.auto-stock-overview`, `.auto-stock-order-item`, `.auto-stock-total`, etc.
- `scripts/verify-auto-stock-norm.js`
  - Updated deterministic markers for compact summary, 24-lon case conversion, no old filter, and new cache keys.

## Code relations

- `buildAutoStockNormRows()` still computes demand/par/current stock read-only.
- `getAutoStockNormPurchaseInfo()` converts `suggestedImportQty` into ordering units and cost estimate.
- `renderAutoStockNormBoard()` now renders only the compact summary by default; expanded overview shows one item card per order recommendation.
- `toggleAutoStockNormOverview()` switches `data-auto-stock-expanded` and re-renders the card.
- `style.css` controls the compact mobile-first presentation.

## Decisions made

- Beer/can conversion rule: if unit contains `lon` or item name looks like beer, order in whole cases of 24 cans.
- Display recommendation line as `45 Lon = 2 thùng` and use rounded quantity for cost: `2 * 24 * costPerUnit`.
- Keep non-beer items in their own unit without case conversion.
- Keep the whole feature read-only; no Firestore writes, no stock mutations, no purchase entries created.

## Verification

Commands/results:

- `node --check app.js` — passed.
- `node scripts/verify-auto-stock-norm.js` — passed.
- `npm run check` — passed.
- `npm run build:hosting` — passed.
- Playwright local smoke at `http://127.0.0.1:5180/`, viewport 390×844:
  - collapsed card has no old table (`tableCount: 0`).
  - compact text includes `Cần đặt thêm 2 món`, `3 thùng bia chẵn`, total `1.065.024đ`.
  - after click, overview shows `Bia Heineken 45 Lon = 2 thùng 770.016đ` and `Bia Tiger Bạc 20 Lon = 1 thùng 295.008đ`.
  - `scrollWidth: 390`, `innerWidth: 390`, no overflowing elements, no console/page errors.
  - screenshot: `/tmp/xekho-auto-stock-summary-smoke.png`.
- Hosting deploy complete to `https://xe-kho.web.app`.
- Playwright live smoke at `https://xe-kho.web.app/?qa=auto-stock-summary`, viewport 390×844:
  - served `app.js?v=20260625-auto-stock-summary`.
  - same compact/click overview/case conversion checks passed.
  - `scrollWidth: 390`, `innerWidth: 390`, no overflowing elements, no console/page errors.
  - screenshot: `/tmp/xekho-auto-stock-summary-live-smoke.png`.

## Remaining issues

- Needs owner review on real iPhone/Safari with live Firestore data.
- Ingredient-level conversion for combos/prepared dishes still requires recipe/BOM mapping in a future phase.

## Next step

If this compact summary is accepted, map recipe/BOM so prepared dishes can become raw-ingredient purchase recommendations, while keeping ordering suggestions owner-approved/read-only first.

## Safety notes

No secrets, database, migration, POS data, or raw media were touched. The feature still reads existing client state only and does not write Firestore or create purchase records.
