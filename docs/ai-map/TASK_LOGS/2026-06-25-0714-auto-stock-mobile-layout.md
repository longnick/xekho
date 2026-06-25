# Task: Auto stock norm mobile layout fix

Date: 2026-06-25 07:14 +07
Repo: `/home/longnick/projects/xekho`
Branch: `task/kilo-fix-20260623-050807`
AI/Agent: Hermes
User request: Dùng Playwright/Puppeteer fix lại giao diện mobile phần mới tạo, đưa cột trạng thái ra bên cạnh cột tên món ăn, tạo thêm 1 cột số lượng cần nhập đề xuất.

## Before state

- Existing branch: `task/kilo-fix-20260623-050807`
- Existing uncommitted files before this task: only `.understand-anything/` untracked from earlier; source tree clean after prior commit.
- Relevant AI map/skills read: `xekho-main-repo-coder`, `xekho-code-memory`, `references/puppeteer-ui-qa.md`, `references/live-ui-auth-lock-overflow-fixes.md`, `references/xekho-auto-stock-norm-board.md`.
- Relevant source files read: `app.js`, `style.css`, `index.html`, `scripts/verify-auto-stock-norm.js`.

## Goal

Sửa bảng `Định mức tồn kho tự động` cho mobile:

- Không để cột trạng thái tách rời/dưới tên món theo cách khó đọc.
- Hiển thị badge trạng thái ngay cạnh tên món.
- Thêm cột/field `Cần nhập đề xuất` để chủ quán biết số lượng cần nhập thêm.
- Dùng Playwright để kiểm tra viewport mobile 390×844, không overflow ngang.

## Files changed

- `app.js`
  - Added `suggestedImportQty = max(0, ceil(par - currentStock))` for mapped inventory rows.
  - Moved `statusBadge(row)` into the name cell beside the item name.
  - Removed separate `Trạng thái` table column.
  - Added `Cần nhập đề xuất` column and mobile `data-label` attributes.
- `style.css`
  - Added `auto-stock-norm-*` desktop table styling.
  - Added mobile card layout under `@media (max-width: 640px)` so each row becomes a readable card and avoids horizontal overflow.
- `index.html`
  - Bumped `style.css` and `app.js` cache keys to `20260625-auto-stock-mobile`.
- `scripts/verify-auto-stock-norm.js`
  - Added markers for suggested import qty, mobile labels, new cache keys, and CSS mobile layout classes.

## Code relations

- `app.js#buildAutoStockNormRows()` computes suggested import quantities from current stock and recommended `par`.
- `app.js#renderAutoStockNormBoard()` renders status inline inside `.auto-stock-norm-name-cell` and the new `.auto-stock-norm-suggest-cell`.
- `style.css` owns responsive layout for `.auto-stock-norm-table`; mobile switches table rows into card-like blocks.
- `scripts/verify-auto-stock-norm.js` guards the changed UI markers and cache keys.

## Decisions made

- Suggested import quantity uses `max(0, ceil(par - currentStock))` and shows `—` for unmapped rows.
- Status is no longer a separate table column; it is displayed inline next to the dish name.
- Desktop keeps a normal scrollable table, mobile uses stacked cards to avoid horizontal scroll.
- No Firestore/POS data writes were added.

## Verification

Commands/results:

- `node --check app.js` — passed.
- `node scripts/verify-auto-stock-norm.js` — passed.
- `npm run check` — passed.
- `npm run build:hosting` — passed.
- Playwright local smoke at `http://127.0.0.1:5179/`, viewport 390×844:
  - headers include `Món / trạng thái` and `Cần nhập đề xuất`.
  - first row had status badge inside name cell.
  - suggested import cell rendered e.g. `2 combo`.
  - `scrollWidth: 390`, `innerWidth: 390`, no overflowing elements.
  - no console/page errors.
  - screenshot: `/tmp/xekho-auto-stock-mobile-smoke.png`.
- Hosting deploy complete to `https://xe-kho.web.app`.
- Playwright live smoke at `https://xe-kho.web.app/?qa=auto-stock-mobile`, viewport 390×844:
  - `app.js?v=20260625-auto-stock-mobile` served.
  - marker `data-xk-auto-stock-norm="v1"`: 1.
  - headers include `Món / trạng thái` and `Cần nhập đề xuất`.
  - status badge inside name cell: true.
  - suggested import cell rendered: `2 combo` in seeded smoke data.
  - `scrollWidth: 390`, `innerWidth: 390`, no overflowing elements.
  - no console/page errors.
  - screenshot: `/tmp/xekho-auto-stock-mobile-live-smoke.png`.

## Remaining issues

- Need owner to verify on real iPhone/Safari after login with live Firestore data.
- Ingredient-level stock norm accuracy still requires recipe/BOM mapping in a future phase.

## Next step

If real iPhone looks OK, continue with recipe/BOM mapping so combo/món chế biến can suggest raw ingredient imports instead of POS selling-unit imports.

## Safety notes

No secrets, database, migration, POS data, or raw media were touched. Firestore data was not modified; all UI smoke data was seeded in browser memory for rendering checks.
