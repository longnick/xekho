# 2026-06-04 08:52 - Make table-card note readable

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

## Request

User screenshot showed table 2 note rendered as `📝 To...`, unreadable in the table card. User asked to remove the icon inside the table and show the note content more fully.

## Changes

- `app.js#renderTables()` now renders noted table cards with `has-note`.
- Removed the `📝` note icon/pill from table cards.
- When a table has note text, the status icon/emoji is replaced by a full-width `.table-note-text` line so the note has more horizontal/vertical room.
- `style.css` replaces `.table-note-chip` with `.table-note-text`: full width, two-line clamp, centered, wrap-safe.
- `scripts/verify-mobile-table-grid.js` now asserts the old icon chip is removed and noted cards hide the status icon while keeping escaped note text.

## Files

- `app.js`
- `style.css`
- `scripts/verify-mobile-table-grid.js`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/FILE_RELATIONS.md`

## Backup

- `/home/longnick/backups/xekho-table-note-readable-20260604-013606`

## Verification

Targeted check passed before full gate:

- `node --check app.js`
- `node --check scripts/verify-mobile-table-grid.js`
- `node scripts/verify-mobile-table-grid.js`
- `git diff --check`

Full gate passed:

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
