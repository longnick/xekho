# XE KHO ESM Compatibility Harness

This directory is the first non-invasive bridge from the current classic-script/IIFE frontend toward ES modules.

## Rules

- Keep root `package.json` as `commonjs` for now.
- Do not import `app.js` from ESM.
- Do not remove `window.XekhoApp.*` compatibility globals.
- Load `app/esm/main.js` after the existing classic scripts so POS runtime order does not change.
- Start with readiness markers and verification only; dual-export leaf utilities in later sprints.
- Backend Cloud Functions and Node scripts stay CommonJS during frontend ESM migration.

## Current entry

- `main.js`: loaded as `<script type="module">`; sets `window.XekhoApp.esm.harness` and dispatches `xekho:esm-ready` when browser event APIs exist.

## Next candidates

After this harness is stable, add ESM facades or shared pure core modules for leaf utilities in this order:

1. `app/utils/dom.js`
2. `app/utils/format.js`
3. `app/utils/date.js`
4. `app/utils/excel.js`
5. `app/auth/staff.js`
