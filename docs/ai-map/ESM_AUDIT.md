# ESM Conversion Audit — 2026-06-02 09:31

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

## Executive summary

The repo is **not ready for one-shot ESM conversion**. Vite is installed and verified, and Phase E1 now provides a safe module-script bridge, but the app still mostly runs as classic-script/IIFE/global code. The safe path remains a staged frontend-only ESM migration that starts with leaf helpers and keeps compatibility globals until all inline handlers and global call sites are removed.

Current ESM readiness estimate: **~40%**.

E1/E2 status:

- `app/esm/main.js` now loads as `<script type="module">` after the existing classic runtime.
- `window.XekhoApp.esm.harness` records readiness without importing the `app.js` monolith.
- `xekho:esm-ready` is dispatched when browser event APIs exist.
- `scripts/verify-esm-entry.js` verifies load order, readiness marker, DOM facade marker, and event behavior.
- `app/esm/utils/dom.js` is the first ESM leaf facade; it exports `escapeHtml()` and `installGlobalDomUtils()` while preserving `window.XekhoApp.utils.dom.escapeHtml()`.
- `scripts/verify-esm-dom-utils.js` verifies the importable DOM facade and global installer.

- Build tooling readiness: **~80%** — Vite config, npm scripts, TypeScript checks, and build command are present and working.
- Frontend module boundary readiness: **~45%** — 19 extracted `app/` modules exist, but they are IIFE/global modules, not `export` modules.
- Runtime entry readiness: **~20%** — `app.js`, `store.js`, AI/offline scripts, and inline handlers still depend heavily on global script order.
- Backend ESM readiness: **~10%** — package is `commonjs`; Cloud Functions and Node scripts are CommonJS. Backend should stay CommonJS until frontend migration is stable.

## Evidence from audit

### Tooling state

- `package.json` has `"type": "commonjs"`.
- npm scripts exist: `dev`, `build`, `preview`, `check`, `lint`, `test`.
- `vite.config.mjs` intentionally serves the current app as static/IIFE assets and does not bundle classic scripts.
- `jsconfig.json` currently uses `module: "commonjs"` and includes only `app/**/*.js` for JS checking.
- `db.js` is already loaded as `type="module"`, but it exports browser globals instead of acting as an importable app module.

### Vite build verification

Command run through Node `execSync`:

```bash
node -e "import('./vite.config.mjs').then(m => console.log(Object.keys(m.default)))"
npx vite build
```

Result:

- Config loads successfully with keys: `root, publicDir, server, build, resolve`.
- Build passes in ~285ms.
- Output exists:
  - `dist/index.html`
  - `dist/assets/main-*.js`
  - `dist/assets/main-*.css`
  - `dist/assets/manifest-*.webmanifest`
- Vite warnings that classic script tags cannot be bundled are expected for this architecture.

### Script/load-order state

`index.html` still loads **31 local classic scripts**, **1 local module script** (`db.js`), and **2 inline scripts**.

Key order constraints that block immediate ESM conversion:

1. `format.js` must load before `store.js` because `store.js` delegates legacy formatter globals.
2. `db.js` is `type="module"` and assigns `window.DB` asynchronously; `app.js` has wait logic for this.
3. `app.js` must load after all extracted IIFE modules and AI modules.
4. Offline scripts have a strict chain: `offlineBackup.js` → `offlineSync.js` → `offlineFirestoreAdapter.js` → `offlineRuntime.js` → status/fallback/devtools.
5. Inline scripts still call global functions after `app.js`.

### Code scan summary

- JavaScript files scanned, excluding `node_modules`, `.git`, `dist`: **97**.
- Frontend files under `app/`: **19**.
- Files with native ESM import/export detected: `db.js`, plus one placeholder-looking file `path/to/inventory-handling-file.js`.
- Frontend extracted modules are IIFE/global namespace modules (`window.XekhoApp.*`), not ESM exports.
- Backend and scripts remain CommonJS (`require`, `module.exports`).
- `app.js` still has about **397 function declarations**, **631 `window` references**, **145 `XekhoApp/globalThis` references**, and **100+ event/handler bindings** by rough scan.

## Main blockers

### BLOCKER A — `app.js` remains a global runtime host

`app.js` is still ~11.9K lines and owns app state, DOM rendering, navigation, POS cart/order flows, auth/session behavior, report wiring, and global compatibility wrappers. Converting it directly to ESM would break inline handlers and classic scripts that expect globals.

### BLOCKER B — classic scripts and inline handlers still define the runtime API

The browser app still relies on `<script>` order and global function names. ESM is deferred and strict; simply adding `type="module"` to current scripts would change execution timing and top-level scope semantics.

### BLOCKER C — `db.js` is the only frontend module script, but it is not an import boundary

`db.js` imports Firebase SDK modules but exposes functionality through `window.DB` and asynchronous readiness. It needs an adapter layer before app modules can import data APIs directly.

### BLOCKER D — extracted modules have compatibility wrappers, not dual exports

The extracted `app/utils`, `app/ui`, `app/order`, and `app/report` modules are good migration candidates, but they currently assign to `window.XekhoApp.*` only. They need a dual-export strategy before ESM consumers can import them.

### BLOCKER E — backend should not be converted in the same phase

Cloud Functions, Node scripts, and verification scripts are CommonJS. Converting backend to ESM would affect deployment/runtime semantics and is not necessary for frontend Vite tree-shaking.

## Safe ESM migration plan

### Phase E0 — Audit and guardrails — COMPLETE

Status: done in this audit.

Deliverables:

- `docs/ai-map/ESM_AUDIT.md`
- task log for this audit
- Vite config/build verified
- blocker list and staged migration path documented

### Phase E1 — Add ESM compatibility harness — COMPLETE

Goal: create a minimal ESM entry without changing production runtime behavior.

Implemented:

1. Added `app/esm/README.md` documenting ESM bridge rules.
2. Added `app/esm/main.js`; it imports no legacy modules and only exposes `window.XekhoApp.esm.harness` plus an optional `xekho:esm-ready` event.
3. Added `<script type="module" src="app/esm/main.js?v=20260602-e1"></script>` after existing classic runtime scripts and before inline helpers.
4. Added `scripts/verify-esm-entry.js` to assert the ESM entry exists, load order is safe, and the harness behaves correctly in a VM sandbox.

Risk: low; verified.

### Phase E2 — Dual-export leaf utility modules — IN PROGRESS

Goal: convert the safest pure helper modules to support both global IIFE and ESM import.

Completed:

1. `app/utils/dom.js` → `app/esm/utils/dom.js` facade with `escapeHtml()` and `installGlobalDomUtils()`.
2. `app/esm/main.js` imports the DOM facade and records `window.XekhoApp.esm.facades.dom` readiness.
3. `scripts/verify-esm-dom-utils.js` verifies native dynamic import from a data URL plus global installation.

Remaining candidates, in order:

1. `app/utils/format.js` — 6 pure exports, but must preserve legacy formatter globals used by `store.js`.
2. `app/utils/date.js` — 3 pure exports.
3. `app/utils/excel.js` — 7 pure worksheet-formatting exports.
4. `app/auth/staff.js` — 5 pure staff helpers.

Pattern:

- Do **not** delete `window.XekhoApp.*` assignments.
- Add ESM facade files under `app/esm/utils/*.js` that re-export the same pure functions, or create parallel pure core modules that both IIFE and ESM facade consume.
- Keep deterministic VM verification plus add ESM import smoke tests.

Risk: low to medium.
Expected time: 2–4 hours for first 5 modules.

### Phase E3 — Extract runtime adapters before importing app state

Goal: avoid importing `app.js` monolith into ESM.

Actions:

1. Create `app/esm/adapters/dom.js` for DOM query/event helpers.
2. Create `app/esm/adapters/store.js` that wraps `window.Store` and `window.appState` read-only access.
3. Create `app/esm/adapters/db.js` that waits for `window.DB` and exposes promise-based access.
4. Add verification scripts for async `window.DB` readiness behavior.

Risk: medium.
Expected time: 1 day.

### Phase E4 — Convert leaf UI components only after adapter exists

Candidates:

1. Image zoom/touch helper cluster currently near top of `app.js`.
2. More/inventory modal navigation helpers.
3. Stock alert popup renderer if isolated enough.

Keep global wrappers until all inline handlers are replaced with event delegation/imported handlers.

Risk: medium.
Expected time: 1–2 days.

### Phase E5 — Replace inline handlers and global calls gradually

Goal: make `index.html` and templates call imported/event-delegated handlers instead of global functions.

Actions:

1. Inventory inline `onclick/onchange` usage in HTML/template strings.
2. Convert one UI island at a time to delegated event listeners.
3. Add browser/VM tests for each island.

Risk: medium/high because POS UI can break if handlers disappear.
Expected time: 2–4 days.

### Phase E6 — Only then evaluate `package.json` `type` strategy

Do not flip repo-wide `"type": "module"` now.

Options later:

- Keep root `commonjs` and use `.mjs` for Vite/ESM config and frontend ESM entry files.
- Or use nested package/config for frontend ESM only.
- Backend Cloud Functions should remain CommonJS until a separate backend migration plan exists.

Risk: high if done too early.
Expected time: separate planning sprint.

## Recommended immediate next sprint

Continue **Phase E2** with the second leaf utility facade:

- Add `app/esm/utils/format.js` for the pure formatter helpers already exposed by `app/utils/format.js`.
- Keep legacy globals (`fmt`, `fmtFull`, `fmtDate`, `fmtTime`, `fmtDateTime`, `today`) and `window.XekhoApp.utils.format.*` compatibility intact.
- Add an ESM import smoke test similar to `scripts/verify-esm-dom-utils.js`.
- Verify: `npm run check`, frontend/backend `tsc`, `npm test -- --runInBand`, `npm run lint -- --max-warnings=9999`, Vite build through execSync wrapper, and ESM verification scripts.

## Do not do now

- Do not change `package.json` from `commonjs` to `module`.
- Do not mark all existing scripts as `type="module"`.
- Do not import `app.js` from ESM.
- Do not convert Cloud Functions to ESM in the frontend ESM phase.
- Do not remove `window.XekhoApp.*` compatibility globals until all global callers are gone.
