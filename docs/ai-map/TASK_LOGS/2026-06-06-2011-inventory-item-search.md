# Inventory modal item search

- Time: 2026-06-06 20:11 ICT
- Repo: `/home/longnick/projects/xekho`
- Branch: `push-clean-main-20260604-072900`
- Task: Add item search boxes in the inventory purchase-entry modal and stocktake modal, then open a local host for testing.

## Scope

- Added `#pur-item-search` in the purchase modal so staff can type item/material text before choosing from `#pur-name`.
- Added `#stocktake-item-search` in the stocktake modal so staff can filter the long physical-count list.
- Kept purchase submit and stocktake save logic unchanged.
- Stocktake filtering hides non-matching rows instead of removing them, so any typed actual quantities stay in the DOM until save/close.

## Files changed

- `index.html`
- `app.js`
- `style.css`
- `scripts/verify-inventory-item-search.js`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/FILE_RELATIONS.md`
- `docs/ai-map/CODE_MAP.md`

## Verification

- `node --check app.js`
- `node scripts/verify-inventory-item-search.js`
- `npm run check`
- `npx tsc --noEmit -p jsconfig.json`
- `npx tsc --noEmit -p functions/tsconfig.json`
- `npm test -- --runInBand`
- `npm run lint` (0 errors, 5 pre-existing warnings in extracted utility files)
- Vite build via Node `execSync('npx vite build 2>&1')` passed; classic-script bundling warnings are expected for this IIFE/CommonJS app.

## Notes

- Existing dirty files before this sprint: `app.js`, `index.html`, `style.css`.
- No production DB, credentials, payment/customer data, or raw media touched.
