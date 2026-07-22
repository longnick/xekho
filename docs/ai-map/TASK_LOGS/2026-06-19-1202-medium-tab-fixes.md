# 2026-06-19 12:02 +07 — Medium tab QA fixes

## Scope

Fix the Medium findings from all-tabs Puppeteer QA on legacy `xekho`:

- `Kho / Thẻ kho` mobile ledger filter clipping `#ledger-item-select`.
- `Kho / Kiểm kê` mobile stocktake history date filter clipping `#stocktake-history-to`.
- Header action tap targets below 44px (`#ai-mic-btn`, `#header-reload-btn`, `#header-lock-btn`).
- Report filter duplicate IDs that can make tab-scoped query/event binding brittle.

## Changes

- Added semantic filter-row classes in `index.html` for ledger and stocktake history filters.
- Added responsive CSS grid/wrap rules in `style.css` so mobile filters stack instead of clipping.
- Raised `.header-btn` hit area to 44x44 while tightening mobile logo/user chip sizing to fit iPhone width.
- Removed duplicate report filter IDs and switched related app selectors to `data-esm-*` attributes.
- Bumped classic asset cache keys to `20260619-medium-tab-fixes`.

## Verification

- `node --check app.js` passed.
- `npm run check` passed.
- `npm run build:hosting` passed; Hosting dist prepared with 83 files.
- Local static smoke on `http://127.0.0.1:5191/` returned HTTP 200.
- `/tmp/xekho-puppeteer-qa/qa-xekho-all-tabs.js` rerun passed across 100 rows:
  - JS/action errors: 0
  - network errors: 0
  - auth locked rows: 0
  - horizontal overflow rows: 0
  - duplicate IDs: 0
  - `Kho / Thẻ kho` iPhone SE/iPhone 14: overflow 0, tiny targets 0
  - `Kho / Kiểm kê` iPhone SE/iPhone 14: overflow 0, tiny targets 0
