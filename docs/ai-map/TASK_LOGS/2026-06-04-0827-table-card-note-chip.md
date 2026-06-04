# 2026-06-04 08:27 - Table-card note chip in table tab

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

## Request

In the `Bàn` tab, when choosing a table, show the table note/name directly inside the table card beside the table name/number.

## Changes

- `app.js#renderTables()` now reads `table.note` with `orderExtras` fallback and renders it as a compact note chip beside the table number.
- Note content is escaped with `_escapeHtml()` before being injected into the table-card markup.
- `style.css` adds `.table-title-row` and `.table-note-chip` so notes stay visible but ellipsized inside the card on mobile.
- `scripts/verify-mobile-table-grid.js` now guards the table-note rendering, escaping marker, and shrink-safe CSS.

## Files

- `app.js`
- `style.css`
- `scripts/verify-mobile-table-grid.js`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/FILE_RELATIONS.md`

## Backup

- `/home/longnick/backups/xekho-table-card-note-20260604-012649`

## Verification

Passed:

- `node --check app.js`
- `node --check scripts/verify-mobile-table-grid.js`
- `node scripts/verify-mobile-table-grid.js`
- `npm run check`
- `npx tsc --noEmit -p jsconfig.json`
- `npx tsc --noEmit -p functions/tsconfig.json`
- `npm test -- --runInBand` — 6/6 passing
- `npm run lint` — 0 errors, 5 pre-existing warnings
- `npx vite build` through `execSync` — pass with expected classic-script warnings
- `for f in scripts/verify-*.js; do node "$f"; done` — all verify scripts pass
- `git diff --check`
