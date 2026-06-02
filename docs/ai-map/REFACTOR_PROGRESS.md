# Refactor Progress and Dirty Tree Classification

**Updated:** 2026-06-02 11:26 (ESM Phase E2 leaf facades complete)
**Repo:** `/home/longnick/projects/xekho`
**Branch:** `test/xe-kho-repo-implementer-skill`

## Progress estimate

- Total long-term `REFACTOR_PLAN.md` including optional TypeScript/CI/build-tooling: **~69% complete**.
- Core non-optional refactor/security/testing plan: **~75% complete**.
- Near-term safe-execution track: **~99.5% complete**.

These percentages are conservative because the repo is production-adjacent and still has a large pre-existing dirty tree. The plan should continue sprint-by-sprint, not as a single broad rewrite.

## Completed so far

- Safe refactor plan rewrite.
- Backup discipline established under `/home/longnick/backups/`.
- Path-only sensitive inventory completed without reading secret contents.
- Known sensitive paths removed from Git tracking only, with local files preserved where present.
- `.gitignore` expanded for env/secrets/generated artifacts.
- Jest permission blocker fixed; `npm test -- --runInBand` passes.
- First compatibility extraction completed: `app/utils/dom.js` + `_escapeHtml()` wrapper.
- Second compatibility extraction completed: `app/utils/format.js` + legacy `store.js` formatter wrappers.
- Offline runtime verification aligned to Sprint 19 marker.
- Dirty-tree classification completed in Sprint 2.
- Safe staging review completed in Sprint 4: explicit security/docs/refactor paths staged; mixed/high-impact unrelated paths left unstaged.
- Phase 13 Sprint 13.1 completed: created `jsconfig.json`, added `@ts-check` to all 18 frontend modules.
- Phase 13 Sprint 13.2 completed: added JSDoc annotations to 3 complex modules (`app/order/helpers.js`, `app/report/excel.js`, `app/report/expense.js`).
- Phase 13 COMPLETE: all 18 frontend modules have `@ts-check` + JSDoc annotations on ~150+ exported functions. `tsc --noEmit` passes with 0 type errors. jsconfig.json created for editor type checking.
- Phase 14 Sprint 14.1 completed: backend `@ts-check` + JSDoc annotations for all 8 backend modules.
- Phase 14 Sprint 14.2 completed: `tsc --noEmit` added to CI pipeline for frontend + backend type checking.
- Phase 14 Sprint 14.3 completed: `CODE_MAP.md` expanded (210→474 lines) — all 34 Cloud Functions documented, all 27 modules mapped, data flows added.
- Phase 14 Sprint 14.4 completed: `DATA_SCHEMA.md` created (855 lines) — 33+ Firestore collections documented with field schemas, indexes, and security rules.
- Phase 14 COMPLETE: backend typed, CI type checking active, CODE_MAP fully expanded, DATA_SCHEMA created.
- Tooling cleanup completed after audit: local ESLint dependency added, TypeScript 6 deprecation guard added, frontend/backend `@ts-check` errors fixed, ads data dependency injection made explicit, and lint/tsc/check/test/verify commands now pass.
- ESM conversion audit completed: Vite config/build pass, but current frontend remains classic-script/IIFE-first with 31 local classic scripts, one module script (`db.js`), and inline handlers. Documented staged ESM plan in `ESM_AUDIT.md`; current ESM readiness ~35%.
- ESM Phase E1 completed: added `app/esm/main.js` browser module harness, documented `app/esm/README.md`, loaded the module after the existing classic runtime in `index.html`, and added `scripts/verify-esm-entry.js`. Current ESM readiness ~38%.
- ESM Phase E2 complete: added importable facades for DOM, format, date, Excel, and staff helpers; updated the ESM entry to install/mark `XekhoApp.esm.facades.dom/format/date/excel/authStaff`; added `scripts/verify-esm-dom-utils.js` and `scripts/verify-esm-leaf-facades.js`; bumped the module cache key to `20260602-e2-leaf-facades`. Current ESM readiness ~43%.
- Safe dirty tree cleanup completed: current tooling cleanup, ESM audit, ESM E1 harness, and AI map docs were classified into explicit commit groups without `git add -A` or secret access.
- Third compatibility extraction completed in Sprint 5: `app/ui/toast.js` (showToast + repairVietnameseText as IIFE), compatibility wrappers in `app.js`.
- Fourth compatibility extraction completed in Sprint 6: `app/ui/theme.js` (applyTheme as IIFE), compatibility wrapper in `app.js`.
- Fifth compatibility extraction completed in Sprint 7: `app/ui/modal.js` (openModal/closeModal/isModalOpen as IIFE), 6 compatibility wrappers in `app.js`.
- Sixth compatibility extraction completed in Sprint 8: `app/auth/staff.js` (normalizeStaffRole/normalizeStaffStatus/getStaffIdentity/buildCurrentUserFromStaff/validatePinFormat as IIFE), 4 compatibility wrappers in `app.js`. Login/logout/lock/unlock stay in app.js (state-dependent).
- Phase 2 Sprint 2.1 completed: mapped all 35 exported Cloud Functions and ~241 helper functions in `functions/index.js` into `docs/ai-map/CODE_MAP.md`.
- Phase 2 Sprint 2.2 completed: extracted 11 pure text/formatting utilities
- Phase 2 Sprint 2.3 completed: extracted 9 Telegram message sending functions into `functions/telegram/send.js`. All async, depend only on axios + text utils.
- Phase 2 Sprint 2.4 completed: extracted 10 kitchen notification functions into `functions/telegram/kitchen.js`. Pure helpers with no external deps.
- Phase 2 Sprint 2.5 completed: extracted 8 pure report helper utilities into `functions/telegram/reports.js`. No external deps beyond Intl APIs.
- Phase 2 COMPLETE: 4 new modules, 38 functions extracted
- Sprint 1.7 completed: extracted 21 pure POS order/kitchen/online-order helpers into `app/order/helpers.js` (IIFE, `XekhoApp.order.*`). 20 thin wrappers in `app.js`.
- Sprint 3.3 completed: created `eslint.config.mjs`
- Phase 4 Sprint 4.1 completed: extracted 7 pure Excel formatting helpers into `app/utils/excel.js` (IIFE, `XekhoApp.utils.excel.*`).
- Phase 4 Sprint 4.2 completed: extracted 3 pure date utilities
- Phase 5 Sprint 5.1 completed: extracted `buildStandaloneBillPrintHtml` into `app/utils/print.js` (105-line pure HTML builder).
- Phase 5 Sprint 5.2 completed: extracted 5 utilities into `app/utils/storage.js` (formatBytes, getLocalStorageUsageBytes, blobToBase64, normalizeGoogleScriptWebAppUrl, isGoogleAppsScriptWebAppUrl). into `app/utils/date.js` (IIFE, `XekhoApp.utils.date.*`). (ESLint v10 flat config) targeting all extracted modules. 0 errors, 2 warnings. from `functions/index.js`, reduced from ~7280 to ~6816 lines (-464 lines). (`chunkArray`, `escapeTelegramHtml`, `escapeXml`, `scoreTelegramTextQuality`, `fixTelegramMojibake`, `normalizeTelegramText`, `normalizeTelegramTextPreserveLines`, `formatCurrencyVi`, `formatQtyVi`, `getTelegramProductDisplayName`, `shouldPreferTelegramCatalogName`) into `functions/utils/text.js`. `functions/index.js` requires the module and delegates through thin wrappers.

## Dirty tree classification (path-only)

### Security Untracked From Git (4)
- `D  functions/.env.gcloud-completed-order.yaml`
- `D  functions/.env.pos-v2-909ff`
- `D  pos-v2-909ff-firebase-adminsdk-fbsvc-abdca8f1c5.json`
- `D  project-724ee6ef-5290-41f4-892-a47703f4859e.json`

### Generated Cache Logs (3)
- ` M .firebase/hosting..cache`
- ` D firebase-debug.log`
- ` D functions-list.json`

### Docs Plans Reports (8)
- `?? CLEAN_RELEASE_READY_REPORT.md`
- `?? META_ADS_CHIEF_OF_STAFF_IMPLEMENTATION_PLAN.md`
- `?? OWNERSHIP_MAP.md`
- `?? PRE_DEPLOY_CHECK_REPORT.md`
- `?? REFACTOR_PLAN.md`
- `?? RELEASE_ISOLATION_PLAN.md`
- `?? TECH_AUDIT.md`
- `?? docs/`

### Source Runtime High Impact (10)
- ` M DEPLOYMENT_GUIDE.md`
- ` M DeepSeekRouter.js`
- ` M README.md`
- ` M ai-actions.js`
- ` M app.js`
- ` M db.js`
- ` M firestore.rules`
- ` M index.html`
- ` M server.js`
- ` M style.css`

### Backend Functions (3)
- ` M functions/index.js`
- `?? functions/media-refinery.js`
- `?? functions/scripts/`

### Import Data Scripts (6)
- ` M audit_cleanup_firebase.js`
- ` M import_master.js`
- ` M import_migrated_history_purchases.js`
- ` M sync_master_to_app.js`
- `?? backfill_history_costs.js`
- `?? loadServiceAccount.js`

### Offline Pos Modules (8)
- `?? offlineBackup.js`
- `?? offlineFirestoreAdapter.js`
- `?? offlineOrderFallback.js`
- `?? offlineOrderFallbackDevTools.js`
- `?? offlineRuntime.js`
- `?? offlineStatusUI.js`
- `?? offlineSync.js`
- `?? scripts/`

### Config Repo Metadata (3)
- ` M .gitignore`
- ` M opencode.json`
- ` M package.json`

### New App Modules (1)
- `?? app/`

### Other (3)
- `?? META_ADS_POS_TAB_ROADMAP.md`
- `?? brand/`
- `?? prompts/`

## Risk notes

- Do not stage all files with `git add -A`; only stage explicit reviewed paths.
- Security paths have been untracked from Git, but credentials still need owner/manual rotation and history cleanup planning.
- High-impact runtime files (`app.js`, `index.html`, `db.js`, `functions/index.js`, `firestore.rules`) already had pre-existing changes; inspect targeted diffs before each next edit.
- Generated/cache/log artifacts should not be part of refactor commits unless intentionally documented.
- Import/backfill scripts may touch data and should not be run casually.

## Recommended next sprint

Sprints 1.7, 3.3, Phase 10, Phase 12, Phase 13, Phase 14, post-audit tooling cleanup, and ESM audit complete. 8 backend modules + 20 frontend modules active, 150+ exports across 28 modules. All modules have `@ts-check` + JSDoc. CI includes `tsc --noEmit`, and local TypeScript 6 deprecation handling has been restored. `CODE_MAP.md` fully expanded (474 lines, 34 Cloud Functions, 27 modules). `DATA_SCHEMA.md` created (855 lines, 33+ Firestore collections). functions/index.js at 5702 lines (-1578 from original). Vite spike merged and build verified, but ESM audit says no one-shot conversion: keep root `commonjs`, keep IIFE compatibility globals, and start with Phase E1 ESM compatibility harness if moving forward. Remaining ~30 functions in functions/index.js depend on db/admin/config and should stay inline.

### ESM readiness — 2026-06-02
- Overall ESM readiness: ~43%.
- Tooling readiness: ~80% (Vite/build/scripts available and verified).
- Frontend module boundary readiness: ~50% (five leaf helpers now have ESM facades; most extracted modules remain IIFE/global).
- Runtime entry readiness: ~20% (`app.js`, inline handlers, `window.DB`, and classic script order still central).
- Backend ESM readiness: ~10% (Cloud Functions and scripts are CommonJS and should stay that way for now).
- Recommended next sprint: Phase E3 — add non-invasive ESM runtime adapters for DOM/store/db readiness; keep `app.js` and classic globals untouched.

### Phase 8 — 2026-06-02
- [x] Sprint 8.1: uploadFileToGoogleDriveByEndpoint → app/utils/storage.js (pure HTTP utility, 94 lines)
- [x] Sprint 8.2: exportReportExcel → app/report/excel.js (573 lines, largest function in app.js, 5 sheet builders)
- [x] Sprint 8.3: buildOperationalExpenseBreakdown → app/report/expense.js (86 lines, mixed-purity report builder)

### Phase 10 — 2026-06-02
- [x] Sprint 10.1: Telegram report helpers batch 2 — 11 new exports into functions/telegram/reports.js (coerceHistoryDate, formatTelegramDateTimeVi, getTelegramPayMethodLabel, isTelegramBankPayMethod, formatTelegramSmartRangeLabel, parseTelegramSmartReportIntent, DEFAULT_TELEGRAM_REPORT_SETTINGS, getVietnamBusinessReportRange, getTelegramReportSettings, getTelegramReportRangeKey, shouldSendTelegramReportNow). functions/index.js reduced by 115 lines.
- [x] Sprint 10.2: 22 ads/date/NLP helpers → functions/telegram/ads.js
- [x] Sprint 10.3a: 11 order helpers → functions/telegram/orders.js, 9 online order helpers → functions/telegram/online-orders.js
- [x] Sprint 10.3b: 6 general utilities → functions/utils/general.js
- [x] Sprint 10.4: Removed 4 duplicate declarations (-221 lines). functions/index.js now 5702 lines (from ~7280 original = -1578 lines total).
- [x] Phase 10 COMPLETE: 8 backend modules + 20 frontend modules, 150+ total exports across 28 modules, app.js at 11895 lines (from ~12099)

### Phase 12 — 2026-06-02
- [x] Rebased `spike/vite-build-tooling` onto main (fast-forward)
- [x] Merged into `test/xe-kho-repo-implementer-skill` (fast-forward)
- [x] Vite build verified: `dist/` produces `index.html`, `main.js` (103KB), `main.css` (57KB), manifest
- [x] Dev server config (`vite.config.mjs`) serves IIFE files as static assets — no ES module bundling yet
- [x] All 33 verification scripts pass, Jest 6/6, git tree clean
- [x] Phase 12 COMPLETE: Vite spike merged, build tooling available for dev workflow

### Phase 14 — 2026-06-02
- [x] Sprint 14.1: Backend `@ts-check` + JSDoc annotations for all 8 backend modules
- [x] Sprint 14.2: `tsc --noEmit` added to CI pipeline (frontend + backend)
- [x] Sprint 14.3: `CODE_MAP.md` expanded (210→474 lines) — 34 Cloud Functions, 27 modules, data flows
- [x] Sprint 14.4: `DATA_SCHEMA.md` created (855 lines) — 33+ Firestore collections, field schemas, indexes
- [x] Phase 14 COMPLETE: backend typed, CI type checking active, documentation expanded
