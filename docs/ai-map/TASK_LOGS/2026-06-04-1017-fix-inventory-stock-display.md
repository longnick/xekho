# Fix inventory stock display

## Scope
- Repo: `/home/longnick/projects/xekho`
- Branch: `test/xe-kho-repo-implementer-skill`
- Request: fix lỗi tồn kho không hiển thị, không có sản phẩm tồn kho.
- Risk level: low

## Pre-state
- Dirty files before task: pre-existing mobile header compact diff from the previous `/daily` sprint (`app.js`, `index.html`, `offlineStatusUI.js`, `style.css`, AI docs, verifier/task log). This task additionally touches inventory normalization only.
- Related docs read: focused inventory schema/search results in `docs/ai-map/DATA_SCHEMA.md` and existing inventory code paths.
- Backup dir: `/home/longnick/backups/xekho-inventory-stock-display-20260604-1016`

## Code Anchors
- `app.js::_getInventory()` — falls back to raw `window.appState.masterData.inventoryItems` if derived `window.appState.inventory` is temporarily empty. Marker: `masterInventory.length > 0`.
- `app.js::normalizeInventoryItemModel()` — normalizes Firestore master inventory fields (`material_name`, `base_unit`, `current_stock`, `min_alert`, `inv_type`) into POS display fields. Marker: `item.qty ?? item.current_stock ?? 0`.
- `app/order/helpers.js::normalizeInventoryItemModel()` — mirrors the same normalization in the extracted helper used by `app.js` delegation. Marker: `item.material_name || id`.
- `app/order/helpers.js::inferInventoryItemType()` — recognizes master retail inventory type values so stock filter `Hàng bán thẳng` works. Marker: `masterType === 'retail_item'`.
- `scripts/verify-inventory-stock-display.js` — source-level regression verifier for inventory display mapping/fallback. Marker: `verify-inventory-stock-display passed`.

## Files Changed
- `app.js` — robust inventory fallback and master field normalization.
- `app/order/helpers.js` — mirrored extracted helper normalization.
- `scripts/verify-inventory-stock-display.js` — focused verifier.
- `docs/ai-map/CHANGELOG_AI.md` — dated summary.
- `docs/ai-map/TODO_AI.md` — done-recently entry.
- `docs/ai-map/TASK_LOGS/2026-06-04-1017-fix-inventory-stock-display.md` — this task log.

## Verification
- `node --check app.js` → passed.
- `node --check app/order/helpers.js` → passed.
- `node --check scripts/verify-inventory-stock-display.js` → passed.
- `node scripts/verify-inventory-stock-display.js` → passed (`verify-inventory-stock-display passed`).
- `node scripts/verify-esm-inventory-tabs.js` → passed.
- `npm run check` → passed.
- `npm test -- --runInBand` → passed (1 suite, 6 tests).
- `npm run lint` → passed with 0 errors and 5 pre-existing warnings in `app/ui/toast.js` / `app/utils/storage.js`.
- `node - <<'NODE' ... execFileSync('npx', ['vite', 'build']) ...` → passed (`✓ built in 229ms`).
- `git diff --check` → passed.

## Handoff / Continue Here
- Current state: done, verification passed.
- Next safe step: deploy if user wants the fix live, then verify `TỒN KHO` tab on mobile/browser with real Firestore data.
- Do not touch: production database, secrets, destructive reset, deploy unless explicitly requested.

## Rollback
- Restore touched source files from backup: `/home/longnick/backups/xekho-inventory-stock-display-20260604-1016`
- Or revert this working-tree diff before commit/deploy.
