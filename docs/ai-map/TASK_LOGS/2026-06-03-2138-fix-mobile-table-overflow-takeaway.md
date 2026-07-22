# Fix mobile table overflow and duplicate takeaway tile

- Time: 2026-06-03 21:38 +07
- Repo: `/home/longnick/projects/xekho`
- Branch: `test/xe-kho-repo-implementer-skill`

## User report

Screenshot showed the mobile table screen overflowing horizontally and a duplicate physical-grid `takeaway` tile below numbered tables, duplicating the dedicated `Khách mang về` card.

## Changes

- `app.js`
  - `renderTables()` filters `String(t.id).toLowerCase() !== 'takeaway'` before calculating occupied/empty counts and rendering physical table cards.
  - Dedicated `Khách mang về` card remains full-width and continues to call `openTakeaway()`.
  - `Khách mang về` and `Bàn online` rows now use shared `table-card-wide` and `table-summary-*` classes.
- `style.css`
  - `.table-grid` now uses `repeat(..., minmax(0, 1fr))`, `width/max-width: 100%`, and hidden overflow.
  - `.table-card` now has `min-width: 0` and `overflow: hidden`.
  - Added summary-row classes with shrink/ellipsis behavior for mobile rows.
- `scripts/verify-mobile-table-grid.js`
  - Adds deterministic assertions for the takeaway filter, preserved dedicated card, wide-card classes, removed inline wide styles, and CSS overflow guardrails.

## Verification

Passed:

```bash
node --check app.js
node --check scripts/verify-mobile-table-grid.js
node scripts/verify-mobile-table-grid.js
npm run check
npx tsc --noEmit -p jsconfig.json
npx tsc --noEmit -p functions/tsconfig.json
npm test -- --runInBand
npm run lint
node -e "vite build wrapper via execSync"
node scripts/verify-*.js
git diff --check
```

Notes:

- Jest: 6/6 passed.
- Verify scripts: 50/50 passed.
- Lint: 0 errors, 5 existing warnings.
- Vite classic-script warnings are expected for the current IIFE/classic architecture.

## Risk

Low. This is a presentation/rendering fix on the table screen. It does not touch POS order save/payment/customer data paths or production database code.
