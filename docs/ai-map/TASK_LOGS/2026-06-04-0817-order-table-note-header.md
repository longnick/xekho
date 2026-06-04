# 2026-06-04 08:17 - Order table note header input

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

## Request

Add a visible note field beside the table number in the choose-order screen so staff can quickly see/type a table name or table note while selecting dishes.

## Changes

- Added `#order-table-note` next to `#order-table-title` in the order page header.
- Added responsive `.order-table-note-field` styling so the note is beside the table title on desktop and wraps safely on mobile.
- Added shared note sync helpers in `app.js` so the header note and existing cart note use the same `orderExtras.note` / `table.note` path.
- Queued Cloud table note updates through `DB.Tables.update()` when available, without touching production data directly during local verification.
- Added `scripts/verify-order-table-note-ui.js` to lock the header input, handler, mobile CSS, and note-sync source markers.

## Files

- `index.html`
- `style.css`
- `app.js`
- `scripts/verify-order-table-note-ui.js`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/FILE_RELATIONS.md`

## Backup

- `/home/longnick/backups/xekho-order-table-note-20260604-011229`

## Verification

Passed:

- `node --check app.js`
- `node --check scripts/verify-order-table-note-ui.js`
- `node scripts/verify-order-table-note-ui.js`
- `npm run check`
- `npx tsc --noEmit -p jsconfig.json`
- `npx tsc --noEmit -p functions/tsconfig.json`
- `npm test -- --runInBand` — 6/6 passing
- `npm run lint` — 0 errors, 5 pre-existing warnings
- `npx vite build` through `execSync` — pass with expected classic-script warnings
- `for f in scripts/verify-*.js; do node "$f"; done` — all verify scripts pass
- `git diff --check`
