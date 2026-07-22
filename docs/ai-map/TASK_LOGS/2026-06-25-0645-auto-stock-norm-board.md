# Task: Auto stock norm board in Kho

Date: 2026-06-25 06:45 +07
Repo: `/home/longnick/projects/xekho`
Branch: `task/kilo-fix-20260623-050807`
AI/Agent: Hermes
User request: Tạo bảng "định mức tồn kho tự động" trong web app sau phân tích đơn hàng live.

## Before state

- Existing branch: `task/kilo-fix-20260623-050807`
- Existing uncommitted files: `.understand-anything/` was already untracked before this task.
- Relevant AI map files read: `PROJECT_OVERVIEW.md`, `CODE_MAP.md`, `FILE_RELATIONS.md`, `CHANGELOG_AI.md`, `TODO_AI.md`.
- Relevant source files read: `index.html`, `app.js`, `db.js`, `store.js`, inventory workflow references.

## Goal

Thêm bảng read-only trong tab **Kho → Tồn kho** để tự tính `Tối thiểu / Chuẩn / Tối đa` từ lịch sử bán live gần đây, so với tồn hiện tại, và cảnh báo cần nhập/dư tồn/chưa map kho.

## Files changed

- `index.html`
  - Added `📊 Định mức tồn kho tự động` card under the stock list.
  - Added filter: all, need, over, unmapped, A/B/C.
  - Bumped `app.js` cache key to `20260625-auto-stock-norm`.
- `app.js`
  - Added demand analysis helpers over `_getVisibleHistoryForUi()` and `_getInventory()`.
  - Computes 56-day daily series, ABC class, P75/P90/P95, min/par/max.
  - Renders summary counts and table in the stock tab.
  - Refreshes board on history/inventory updates while on inventory page.
- `scripts/verify-auto-stock-norm.js`
  - Deterministic marker verifier for DOM, app logic, cache key, and realtime-refresh markers.
- `docs/ai-map/*`
  - Changelog, todo, file relations, code map, and this task log.

## Code relations

- `db.js` streams `history` and `inventory` into `window.appState`.
- `app.js#_getVisibleHistoryForUi()` supplies completed/visible order history to `buildAutoStockNormRows()`.
- `app.js#_getInventory()` supplies normalized live inventory to match current stock by linked inventory id, item id, or normalized name.
- `index.html#auto-stock-norm-board` displays the computed board.
- `scripts/verify-auto-stock-norm.js` guards source markers and cache key.

## Decisions made

- Kept the feature read-only: no Firestore writes, no minQty auto-update, no inventory mutations.
- Used 56 calendar days by default to match the recent May-to-current analysis and keep the UI responsive on the existing 500-history snapshot.
- Report units remain POS selling units; combos/prepared dishes show `Chưa map kho` until recipes/ingredient mapping are used.
- Deployed Hosting-only because the user asked to create the web-app feature and no Functions/rules changes were needed.

## Verification

Commands/results:

- `node --check app.js` — passed.
- `node scripts/verify-auto-stock-norm.js` — passed.
- `npm run check` — passed.
- `npm run build:hosting` — passed.
- `npm run deploy:hosting:fast -- --project pos-v2-909ff` — Hosting deploy complete to `https://xe-kho.web.app`.
- Browser local smoke on `http://127.0.0.1:5178/`:
  - marker `[data-xk-auto-stock-norm="v1"]`: 1
  - app src: `app.js?v=20260625-auto-stock-norm`
  - global functions present: `renderAutoStockNormBoard`, `buildAutoStockNormRows`
  - no horizontal overflow at smoke viewport.
- Browser live smoke on `https://xe-kho.web.app`:
  - marker `[data-xk-auto-stock-norm="v1"]`: 1
  - app src: `app.js?v=20260625-auto-stock-norm`
  - global functions present: `renderAutoStockNormBoard`, `buildAutoStockNormRows`
  - no console/page JS errors observed before login.

## Remaining issues

- Need user/mobile-Safari verification after login: `Kho → TỒN KHO` should show the board under the stock list.
- True raw-material norms require mapping recipes/combos to ingredients; current board is POS selling-unit based.

## Next step

After user confirms the board display, optionally add a second phase that maps menu items/combos through recipe BOM and writes admin-approved suggested `minQty` updates, still behind explicit confirmation.

## Safety notes

No secrets, database, migration, POS data, or raw media were touched. Firestore data was read by the existing live app only; this task changed Hosting frontend files and deployed Hosting-only.
