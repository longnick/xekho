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

- `main.js`: loaded as `<script type="module">`; sets `window.XekhoApp.esm.harness`, imports the E2 leaf facades, E3 runtime adapters, plus the E4 image zoom UI island E5 header action delegated handler island, E5.2 report tab delegated handler island, E5.3 settings tab delegated handler island, E5.4 report date controls delegated handler island, and E5.5 inventory tab delegated handler island, installs compatibility globals/adapters, records `window.XekhoApp.esm.facades.*`, and dispatches `xekho:esm-ready` when browser event APIs exist.
- `utils/dom.js`: exports `escapeHtml()` and `installGlobalDomUtils()` while preserving `window.XekhoApp.utils.dom.escapeHtml()`.
- `utils/format.js`: exports formatter helpers and `installGlobalFormatUtils()` while preserving `window.XekhoApp.utils.format.*` plus legacy globals (`fmt`, `fmtFull`, `fmtDate`, `fmtTime`, `fmtDateTime`, `today`).
- `utils/date.js`: exports date helpers and `installGlobalDateUtils()` while preserving `window.XekhoApp.utils.date.*` plus legacy globals (`formatLocalDateKey`, `getWeekStartKey`).
- `utils/excel.js`: exports worksheet formatting helpers and `installGlobalExcelUtils()` while preserving `window.XekhoApp.utils.excel.*` plus legacy Excel globals.
- `auth/staff.js`: exports pure staff helpers and `installGlobalStaffAuth()` while preserving `window.XekhoApp.auth.*`.
- `adapters/dom.js`: exports DOM query/event helpers and `installDomAdapter()` under `window.XekhoApp.esm.adapters.dom`.
- `adapters/store.js`: exports read-only `Store`/`appState` accessors and `installStoreAdapter()` under `window.XekhoApp.esm.adapters.store`.
- `adapters/db.js`: exports async `window.DB` readiness helpers and `installDbAdapter()` under `window.XekhoApp.esm.adapters.db`.
- `ui/image-zoom.js`: exports the importable image zoom/pan controller and `installGlobalImageZoom()` under `window.XekhoApp.esm.ui.imageZoom`.
- `ui/header-actions.js`: exports delegated header action handling and `installHeaderActions()` under `window.XekhoApp.esm.ui.headerActions`.
- `ui/report-tabs.js`: exports delegated report tab handling and `installReportTabs()` under `window.XekhoApp.esm.ui.reportTabs`.
- `ui/report-date-controls.js`: exports delegated report period/date mode handling and `installReportDateControls()` under `window.XekhoApp.esm.ui.reportDateControls`.
- `ui/inventory-tabs.js`: exports delegated inventory tab handling and `installInventoryTabs()` under `window.XekhoApp.esm.ui.inventoryTabs`.
- `ui/settings-tabs.js`: exports delegated settings tab handling and `installSettingsTabs()` under `window.XekhoApp.esm.ui.settingsTabs`.
- `ui/settings-tabs.js`: exports delegated settings tab handling and `installSettingsTabs()` under `window.XekhoApp.esm.ui.settingsTabs`.

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

## Completed ESM UI island candidates

1. `app/esm/ui/image-zoom.js` (E4)
2. `app/esm/ui/header-actions.js` (E5.1)
3. `app/esm/ui/report-tabs.js` (E5.2)
4. `app/esm/ui/settings-tabs.js` (E5.3)
5. `app/esm/ui/report-date-controls.js` (E5.4)
6. `app/esm/ui/inventory-tabs.js` (E5.5)
4. `app/esm/ui/settings-tabs.js` (E5.3)
5. `app/esm/ui/report-date-controls.js` (E5.4)
6. `app/esm/ui/inventory-tabs.js` (E5.5)

## Next candidates / blockers

- Phase E5 inline handler cleanup is not safe as a one-shot change: current audit still shows 215 inline handlers and 31 local classic scripts after E5.5. Replace handlers one island at a time only after a browser/mobile QA loop.
- Phase E6 package strategy remains planning-only: keep root `commonjs`; do not flip to repo-wide `module` while backend/scripts remain CommonJS.
- No Phase E7/E8 is currently defined in the ESM plan.
