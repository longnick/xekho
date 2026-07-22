# 2026-06-02 10:08 — ESM Phase E1 compatibility harness

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`
Task: Implement the safe first ESM bridge after the ESM audit.

## Scope

Implemented a non-invasive ESM compatibility harness only. This sprint deliberately did **not** convert existing IIFE/classic scripts, did **not** flip `package.json` from `commonjs`, and did **not** touch backend Cloud Functions ESM strategy.

## Files changed

- `app/esm/main.js`
  - New `// @ts-check` browser module harness.
  - Creates `window.XekhoApp.esm.harness` with version/readiness metadata.
  - Dispatches `xekho:esm-ready` when browser event APIs exist.
- `app/esm/README.md`
  - Documents ESM bridge rules and future dual-export candidates.
- `index.html`
  - Adds `<script type="module" src="app/esm/main.js?v=20260602-e1"></script>` after existing classic runtime/offline scripts and before inline DOM helpers.
- `scripts/verify-esm-entry.js`
  - Verifies script tag order, harness marker, and VM event dispatch behavior.
- `docs/ai-map/ESM_AUDIT.md`
  - Marks Phase E1 complete and updates readiness from ~35% to ~38%.
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/REFACTOR_PROGRESS.md`
- `docs/ai-map/CODE_MAP.md`
- `docs/ai-map/FILE_RELATIONS.md`

## Backup

Backed up touched runtime/docs files under:

`/home/longnick/backups/xekho-esm-e1-20260602-100401`

## Verification

Commands run:

```bash
node scripts/verify-esm-entry.js
npm run check
npx tsc --noEmit -p jsconfig.json
npx tsc --noEmit -p functions/tsconfig.json
node - <<'NODE'
const { execSync } = require('child_process');
const out = execSync('npx vite build 2>&1', { timeout: 60000, encoding: 'utf8' });
console.log(out);
NODE
npm run lint -- --max-warnings=9999
```

Results:

- `scripts/verify-esm-entry.js`: PASS.
- `npm run check`: PASS.
- Frontend `tsc`: PASS.
- Backend `tsc`: PASS.
- Vite build: PASS, built in ~260ms.
- `npm run lint -- --max-warnings=9999`: PASS with existing warnings only:
  - `app/ui/toast.js`: 2 warnings.
  - `app/utils/storage.js`: 3 warnings.

## Risk notes

- Low runtime risk: new module only sets a readiness marker and event; no legacy imports and no data writes.
- Classic script load order is preserved.
- Vite warnings about non-module classic scripts remain expected until later ESM phases.

## Next safe sprint

ESM Phase E2: add the first dual-export/facade leaf utility, starting with `app/utils/dom.js`, while preserving `window.XekhoApp.utils.dom.escapeHtml()` compatibility.
