# Task Log - Fix inventory type save in Kho tab

Date: 2026-06-22 22:18 +07
Repo: `/home/longnick/projects/xekho`
Branch: `push-clean-main-20260604-072900`
Agent: Hermes

## User issue

On production `xe-kho.web.app`, in tab **Kho**, changing an item from **Nguyên liệu** to **Hàng bán thẳng** in the stock card / item edit modal did not persist after saving.

## Root cause

`submitInvEdit()` built an update payload containing only the master field `inv_type` for the selected type, while `DB.Inventory.update()` only persists inventory type when the payload contains app field `itemType`.

Additionally, `app.js` referenced `_appInventoryTypeToMaster(itemType)` without defining it locally in the classic app runtime.

Result: the edit path either failed at runtime or sent a payload shape that `DB.Inventory.update()` ignored for type persistence.

## Fix

- Added a local `_appInventoryTypeToMaster(itemType)` helper in `app.js`.
- Updated `submitInvEdit()` to send **both**:
  - `itemType` for `DB.Inventory.update()` and immediate UI state.
  - `inv_type` for master/report compatibility.
- Bumped `index.html` `app.js` cache key to `20260622-inventory-type-save`.
- Added deterministic verifier `scripts/verify-inventory-type-save.js`.

## Files changed

- `app.js`
- `index.html`
- `scripts/verify-inventory-type-save.js`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/FILE_RELATIONS.md`
- `docs/ai-map/TASK_LOGS/2026-06-22-2218-inventory-type-save.md`

## Verification

- `node scripts/verify-inventory-type-save.js` → passed.
- `npm run check` → passed.
- `node --input-type=module --check < db.js` → passed.
- `npm run build:hosting` → passed, hosting dist prepared with 83 files.

## Deploy

- `npm run deploy:hosting:fast` completed successfully.
- Firebase Hosting project: `pos-v2-909ff`.
- Hosting URL: `https://xe-kho.web.app`.
- Live smoke confirmed:
  - `index.html` includes `app.js?v=20260622-inventory-type-save`.
  - live `app.js` includes `_appInventoryTypeToMaster(itemType)`.
  - live `app.js` update payload includes both `itemType` and `inv_type`.
