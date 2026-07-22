# Stocktake search layout fix

- Time: 2026-06-06 20:24 ICT
- Repo: `/home/longnick/projects/xekho`
- Branch: `push-clean-main-20260604-072900`
- Task: Refine the `Kiểm kê kho` item search so the modal does not shrink when results are filtered and iPhone keyboard does not cover the result area.

## Scope

- Replaced inline stocktake modal layout styles with named classes.
- Kept `#stocktake-item-search` in a top search panel.
- Moved `#stocktake-list` into `.stocktake-results-scroll` so filtering only changes the result viewport, not the whole modal height.
- Set `.stocktake-modal-sheet` to a fixed viewport height and `.stocktake-results-scroll` to a shorter scroll region on mobile (`34svh`).
- Expanded `scripts/verify-inventory-item-search.js` to assert the stocktake layout guardrails.

## Files changed

- `index.html`
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
- `git diff --check`
- Vite build via Node `execSync('npx vite build 2>&1')` passed; classic-script bundling warnings are expected for this IIFE/CommonJS app.

## Notes

- No purchase/stocktake save logic changed.
- No production data, credentials, payment/customer data, or raw media touched.
