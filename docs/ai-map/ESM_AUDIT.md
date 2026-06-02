# ESM Conversion Audit — 2026-06-02 09:31

Repo: `/home/longnick/projects/xekho`
Branch: `test/xe-kho-repo-implementer-skill`

## Executive summary

The repo is **not ready for one-shot ESM conversion**. Vite is installed and verified, and Phase E1 now provides a safe module-script bridge, but the app still mostly runs as classic-script/IIFE/global code. The safe path remains a staged frontend-only ESM migration that starts with leaf helpers and keeps compatibility globals until all inline handlers and global call sites are removed.

Current ESM readiness estimate: **~56%**.

E1/E2/E3/E4/E5.1 status:

- `app/esm/main.js` now loads as `<script type="module">` after the existing classic runtime.
- `window.XekhoApp.esm.harness` records readiness without importing the `app.js` monolith.
- `xekho:esm-ready` is dispatched when browser event APIs exist.
- `scripts/verify-esm-entry.js` verifies load order, readiness marker, all E2 facade markers, and event behavior.
- `app/esm/utils/dom.js`, `format.js`, `date.js`, `excel.js`, and `app/esm/auth/staff.js` are ESM leaf facades with installers that preserve classic globals/namespaces.
- `scripts/verify-esm-dom-utils.js` and `scripts/verify-esm-leaf-facades.js` verify native dynamic imports plus global installers.
- `app/esm/adapters/dom.js`, `store.js`, and `db.js` provide Phase E3 importable runtime adapters without importing `app.js` or Firebase directly.
- `scripts/verify-esm-runtime-adapters.js` verifies DOM querying/events, read-only Store/appState access, and async DB readiness behavior.
- `app/esm/ui/image-zoom.js` provides Phase E4 importable image zoom/pan UI island.
- `scripts/verify-esm-ui-image-zoom.js` verifies controller attach/detach/reset behavior, listener cleanup, installer publishing, and classic `app.js` delegation marker.
- `app/esm/ui/header-actions.js` provides Phase E5.1 delegated header actions for AI assistant, stock alert, hard reload, and logout buttons.
- `scripts/verify-esm-header-actions.js` verifies delegated dispatch, installer publishing, listener cleanup, and removal of inline `onclick` from the four header buttons.

- Build tooling readiness: **~80%** — Vite config, npm scripts, TypeScript checks, and build command are present and working.
- Frontend module boundary readiness: **~61%** — 19 extracted `app/` IIFE modules exist, 5 low-risk leaf helpers, 3 runtime adapters, and 1 UI island are importable.
- Runtime entry readiness: **~37%** — ESM can now access DOM/Store/appState/DB through adapters and one UI island, but `app.js`, AI/offline scripts, 238 inline handlers, and 31 local classic scripts still depend heavily on global script order.
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

### Phase E2 — Dual-export leaf utility modules — COMPLETE

Goal: convert the safest pure helper modules to support both global IIFE and ESM import.

Completed:

1. `app/utils/dom.js` → `app/esm/utils/dom.js` facade with `escapeHtml()` and `installGlobalDomUtils()`.
2. `app/utils/format.js` → `app/esm/utils/format.js` facade with formatter helpers and legacy globals.
3. `app/utils/date.js` → `app/esm/utils/date.js` facade with date helpers and legacy globals.
4. `app/utils/excel.js` → `app/esm/utils/excel.js` facade with worksheet formatting helpers and legacy globals.
5. `app/auth/staff.js` → `app/esm/auth/staff.js` facade with pure staff helpers.
6. `app/esm/main.js` imports the full E2 facade set and records `window.XekhoApp.esm.facades.*` readiness.
7. `scripts/verify-esm-dom-utils.js` and `scripts/verify-esm-leaf-facades.js` verify native dynamic imports plus global installation.

Pattern:

- Do **not** delete `window.XekhoApp.*` assignments.
- Add ESM facade files under `app/esm/utils/*.js` that re-export the same pure functions, or create parallel pure core modules that both IIFE and ESM facade consume.
- Keep deterministic VM verification plus add ESM import smoke tests.

Risk: low to medium.
Expected time: 2–4 hours for first 5 modules.

### Phase E3 — Extract runtime adapters before importing app state — COMPLETE

Goal: avoid importing `app.js` monolith into ESM.

Completed:

1. Created `app/esm/adapters/dom.js` for DOM query/event helpers.
2. Created `app/esm/adapters/store.js` that wraps `window.Store` and `window.appState` read-only access.
3. Created `app/esm/adapters/db.js` that waits for `window.DB` and exposes promise-based access.
4. Added `scripts/verify-esm-runtime-adapters.js` for DOM, Store/appState, and async `window.DB` readiness behavior.
5. Updated `app/esm/main.js` to install adapters under `window.XekhoApp.esm.adapters.*` and mark `runtimeAdapters` readiness.

Risk: medium; verified without POS/backend/data mutations.

### Phase E4 — Convert leaf UI components only after adapter exists — COMPLETE

Completed first UI island:

1. Added `app/esm/ui/image-zoom.js` for image zoom/touch/pan behavior.
2. Updated `app/esm/main.js` to import/install the island under `window.XekhoApp.esm.ui.imageZoom`.
3. Updated classic `ImgZoom` in `app.js` to delegate `attach()`, `detach()`, and `reset()` when the ESM island is ready, while preserving original fallback logic.
4. Added `scripts/verify-esm-ui-image-zoom.js` and expanded `scripts/verify-esm-entry.js`.

Risk: medium; verified without changing modal call sites or POS/backend/data flows.

### Phase E5 — Replace inline handlers and global calls gradually — IN PROGRESS

Goal: make `index.html` and templates call imported/event-delegated handlers instead of global functions.

Current evidence after E4:

- `index.html` scan after E5.1: 238 inline handlers.
- Script scan: 31 local classic scripts, 2 local module scripts (`db.js`, `app/esm/main.js`).
- E5.1 converted 4 static header buttons to delegated ESM handling. Image zoom classic calls are safely delegated, but most POS/inventory/report handlers still depend on globals.

Safe next action: continue replacing handlers one island at a time with deterministic tests and mobile Safari QA. Do not attempt repo-wide inline handler removal in one sprint.

Risk: medium/high because POS UI can break if handlers disappear.

### Phase E6 — Only then evaluate `package.json` `type` strategy — DEFERRED/BLOCKED

Do not flip repo-wide `"type": "module"` now.

Current decision:

- Keep root `commonjs`.
- Continue using `<script type="module">` for browser ESM and `.mjs` for Vite config.
- Backend Cloud Functions and Node scripts remain CommonJS.

Risk: high if done before E5 removes most global/inline handler coupling.

## Recommended immediate next sprint

Phase E4 is complete. Remaining E phases are now gated by handler/package blockers:

- E5: inline handler cleanup requires island-by-island work and mobile QA because 238 inline handlers remain.
- E6: package strategy remains `commonjs` until E5 is substantially complete.
- E7/E8: no E7/E8 exists in the current documented plan.

## Do not do now

- Do not change `package.json` from `commonjs` to `module`.
- Do not mark all existing scripts as `type="module"`.
- Do not import `app.js` from ESM.
- Do not convert Cloud Functions to ESM in the frontend ESM phase.
- Do not remove `window.XekhoApp.*` compatibility globals until all global callers are gone.
