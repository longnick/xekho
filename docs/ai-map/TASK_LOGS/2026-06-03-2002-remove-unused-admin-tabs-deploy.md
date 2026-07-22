# Task Log — Remove unused admin tabs before deploy

- Time: 2026-06-03 20:02 +07
- Repo: `/home/longnick/projects/xekho`
- Branch: `test/xe-kho-repo-implementer-skill`
- Request: user confirmed the missing docs/AI-map step and asked to redo docs, then deploy.

## Scope

Remove obsolete top-level UI tabs/pages that were no longer intended for production deployment:

- Menu top-level page
- AI Insights page
- Media / Media Refinery page

## Files changed

- `index.html`: removed deleted page blocks and More-modal navigation entries.
- `app.js`: removed obsolete page render functions and added explicit stale route denial for `menu`, `insights`, and `media`.
- `style.css`: removed obsolete Media Refinery page styles.
- `app/esm/ui/render-refresh-controls.js`: removed obsolete Media refresh allowlist entry.
- `scripts/verify-esm-render-refresh-controls.js`: adjusted expected count after Media page removal.
- `scripts/verify-esm-admin-render-controls.js`: adjusted expected count after top-level Menu page removal.
- `docs/ai-map/CHANGELOG_AI.md`, `TODO_AI.md`, `REFACTOR_PROGRESS.md`, `FILE_RELATIONS.md`, `CODE_MAP.md`: updated AI-map status.

## Safety notes

Kept shared production-safe paths intact:

- menu CRUD/admin modal helpers
- `window.DB.MediaRefinery`
- `functions/media-refinery.js`
- server media proxy/helper code

No secrets, credentials, production database data, migration files, POS/payment/customer data, or raw media were read or modified.

## Evidence

- Removed marker counts: `page-insights=0`, `page-media=0`, `page-menu=0`, `navigateMore('menu')=0`, `navigateMore('insights')=0`, `navigateMore('media')=0`.
- `index.html` inline handlers: 129.
- `data-esm-render-refresh`: 9.
- `data-esm-admin-render`: 4.
- `app.js`: 11,565 lines / 366 function declarations.
- `functions/index.js`: 5,673 lines / 200 function declarations.

## Verification plan

Run full Firebase deploy-readiness gate before deploy:

```bash
node --check app.js
node --input-type=module --check < db.js
node --check functions/index.js
for f in functions/utils/*.js functions/telegram/*.js; do node --check "$f"; done
node all scripts/verify-*.js
npm run check
npx tsc --noEmit -p jsconfig.json
npx tsc --noEmit -p functions/tsconfig.json
npm test -- --runInBand
npm run lint
npx vite build
git diff --check
```

## Deploy plan

If the full gate passes, deploy with codebase-qualified Firebase command:

```bash
npx firebase-tools deploy --only hosting,functions:xekho
```

If functions fail after hosting succeeds, classify as partial deploy and verify hosting separately.
