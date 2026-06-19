# 2026-06-19 16:58 +07 - Table special cards cleanup

## Scope
- User reported tab Ban special cards `Khach Mang Ve` and `Ban Online` kept old/cancelled orders hanging.
- Repo: `/home/longnick/projects/xekho`.
- Branch: `push-clean-main-20260604-072900`.

## Root cause
- `Ban Online` card/modal used raw `window.appState.onlineOrders`; Firestore listener only excluded `completed`, so `cancelled/rejected/expired` rows could still render.
- `_getOrders()` preferred cloud `appState.orders` and could surface stale cloud `tableId=takeaway` orders while takeaway cancel/payment flow intentionally skips cloud writes.

## Fix
- Added shared active online-order filter in `app.js` and matching listener filter in `db.js`.
- `renderTables()` and `renderOnlineOrdersPanel()` now use active online orders only.
- `_getOrders()` and `syncLocalOrderCacheFromCloud()` ignore cloud `takeaway` but preserve a live local Store takeaway order.
- Online approve/reject/complete/cancel now patches local state and refreshes table cards immediately.
- Bumped `db.js` and `app.js` cache keys in `index.html`.
- Added regression verifier `scripts/verify-table-special-cards-cleanup.js`.

## Verification
- `node scripts/verify-table-special-cards-cleanup.js` passed.
- `node --check app.js` passed.
- `node --check scripts/verify-table-special-cards-cleanup.js` passed.
- `node --input-type=module --check < db.js` passed.
- `npm run check` passed.
- `npm run build:hosting` passed.
- `git diff --check` passed.

## Risk notes
- No Firestore/POS production data mutation was run.
- Existing unrelated dirty files were left untouched.
