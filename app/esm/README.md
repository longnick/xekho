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

- `main.js`: loaded as `<script type="module">`; sets `window.XekhoApp.esm.harness`, imports the first ESM leaf facade, and dispatches `xekho:esm-ready` when browser event APIs exist.
- `utils/dom.js`: exports `escapeHtml()` and `installGlobalDomUtils()` for the E2 DOM facade while preserving `window.XekhoApp.utils.dom.escapeHtml()`.

## Completed ESM facade candidates

1. `app/utils/dom.js` → `app/esm/utils/dom.js` (E2)

## Next candidates

Continue adding ESM facades or shared pure core modules for leaf utilities in this order:

1. `app/utils/format.js`
2. `app/utils/date.js`
3. `app/utils/excel.js`
4. `app/auth/staff.js`
