# XE KHO ESM Compatibility Harness

This directory is the first non-invasive bridge from the current classic-script/IIFE frontend toward ES modules.

## Rules

- Keep root `package.json` as `commonjs` for now.
- Do not import `app.js` from ESM.
- Do not remove `window.XekhoApp.*` compatibility globals.
- Load `app/esm/main.js` after the existing classic scripts so POS runtime order does not change.
- Start with readiness markers, leaf facades, and runtime adapters; do not convert UI islands until adapters are verified.
- Backend Cloud Functions and Node scripts stay CommonJS during frontend ESM migration.

## Current entry

- `main.js`: loaded as `<script type="module">`; sets `window.XekhoApp.esm.harness`, imports the E2 leaf facades plus E3 runtime adapters, installs compatibility globals/adapters, records `window.XekhoApp.esm.facades.*`, and dispatches `xekho:esm-ready` when browser event APIs exist.
- `utils/dom.js`: exports `escapeHtml()` and `installGlobalDomUtils()` while preserving `window.XekhoApp.utils.dom.escapeHtml()`.
- `utils/format.js`: exports formatter helpers and `installGlobalFormatUtils()` while preserving `window.XekhoApp.utils.format.*` plus legacy globals (`fmt`, `fmtFull`, `fmtDate`, `fmtTime`, `fmtDateTime`, `today`).
- `utils/date.js`: exports date helpers and `installGlobalDateUtils()` while preserving `window.XekhoApp.utils.date.*` plus legacy globals (`formatLocalDateKey`, `getWeekStartKey`).
- `utils/excel.js`: exports worksheet formatting helpers and `installGlobalExcelUtils()` while preserving `window.XekhoApp.utils.excel.*` plus legacy Excel globals.
- `auth/staff.js`: exports pure staff helpers and `installGlobalStaffAuth()` while preserving `window.XekhoApp.auth.*`.
- `adapters/dom.js`: exports DOM query/event helpers and `installDomAdapter()` under `window.XekhoApp.esm.adapters.dom`.
- `adapters/store.js`: exports read-only `Store`/`appState` accessors and `installStoreAdapter()` under `window.XekhoApp.esm.adapters.store`.
- `adapters/db.js`: exports async `window.DB` readiness helpers and `installDbAdapter()` under `window.XekhoApp.esm.adapters.db`.

## Completed ESM facade candidates

1. `app/utils/dom.js` → `app/esm/utils/dom.js` (E2)
2. `app/utils/format.js` → `app/esm/utils/format.js` (E2)
3. `app/utils/date.js` → `app/esm/utils/date.js` (E2)
4. `app/utils/excel.js` → `app/esm/utils/excel.js` (E2)
5. `app/auth/staff.js` → `app/esm/auth/staff.js` (E2)

## Completed ESM adapter candidates

1. `app/esm/adapters/dom.js` (E3)
2. `app/esm/adapters/store.js` (E3)
3. `app/esm/adapters/db.js` (E3)

## Next candidates

Phase E4 UI islands can start only as isolated, low-risk adapters/components after E3 stays green under check/tsc/lint/test/build. Do not remove inline/global handlers yet.
