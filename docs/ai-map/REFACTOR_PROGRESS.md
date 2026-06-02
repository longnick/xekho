# Refactor Progress and Dirty Tree Classification

**Updated:** 2026-06-02
**Repo:** `/home/longnick/projects/xekho`
**Branch:** `test/xe-kho-repo-implementer-skill`

## Progress estimate

- Total long-term `REFACTOR_PLAN.md` including optional TypeScript/CI/build-tooling: **~48% complete**.
- Core non-optional refactor/security/testing plan: **~55% complete**.
- Near-term safe-execution track: **~92% complete**.

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

Sprints 1.7, 3.3, and Phase 10 complete. 8 backend modules + 20 frontend modules active, 150+ exports across 28 modules. functions/index.js at 5702 lines (-1578 from original). Remaining ~30 functions in functions/index.js depend on db/admin/config and should stay inline. Next: targeted commit staging of extracted modules, or deeper frontend extraction (remaining state-dependent POS functions in app.js). Once baseline tests/smoke are available. Alternatively, start Phase 3 Sprint 3.3 (targeted ESLint) for code quality.

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
