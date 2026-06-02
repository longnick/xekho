# XE KHO ESM Compatibility Harness

This directory is the first non-invasive bridge from the current classic-script/IIFE frontend toward ES modules.

## Rules

- Keep root `package.json` as `commonjs` for now.
- Do not import `app.js` from ESM.
- Do not remove `window.XekhoApp.*` compatibility globals.
- Load `app/esm/main.js` after the existing classic scripts so POS runtime order does not change.
- Start with readiness markers and verification only; dual-export leaf utilities one at a time.
- Backend Cloud Functions and Node scripts stay CommonJS during frontend ESM migration.

## Current entry

- `main.js`: loaded as `<script type="module">`; sets `window.XekhoApp.esm.harness`, imports the E2 leaf facades, installs compatibility globals, records `window.XekhoApp.esm.facades.*`, and dispatches `xekho:esm-ready` when browser event APIs exist.
- `utils/dom.js`: exports `escapeHtml()` and `installGlobalDomUtils()` while preserving `window.XekhoApp.utils.dom.escapeHtml()`.
- `utils/format.js`: exports formatter helpers and `installGlobalFormatUtils()` while preserving `window.XekhoApp.utils.format.*` plus legacy globals (`fmt`, `fmtFull`, `fmtDate`, `fmtTime`, `fmtDateTime`, `today`).
- `utils/date.js`: exports date helpers and `installGlobalDateUtils()` while preserving `window.XekhoApp.utils.date.*` plus legacy globals (`formatLocalDateKey`, `getWeekStartKey`).
- `utils/excel.js`: exports worksheet formatting helpers and `installGlobalExcelUtils()` while preserving `window.XekhoApp.utils.excel.*` plus legacy Excel globals.
- `auth/staff.js`: exports pure staff helpers and `installGlobalStaffAuth()` while preserving `window.XekhoApp.auth.*`.

## Completed ESM facade candidates

1. `app/utils/dom.js` → `app/esm/utils/dom.js` (E2)
2. `app/utils/format.js` → `app/esm/utils/format.js` (E2)
3. `app/utils/date.js` → `app/esm/utils/date.js` (E2)
4. `app/utils/excel.js` → `app/esm/utils/excel.js` (E2)
5. `app/auth/staff.js` → `app/esm/auth/staff.js` (E2)

## Next candidates

Move to Phase E3 runtime adapters only after this E2 facade set stays green under check/tsc/lint/test/build.
