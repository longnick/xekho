# AI TODO

## Doing

- `REFACTOR_PLAN.md` execution is progressing sprint-by-sprint.
- Phase 14 COMPLETE: Backend @ts-check + JSDoc for all 8 modules, `tsc --noEmit` in CI, `CODE_MAP.md` expanded (210→474 lines, 34 Cloud Functions, 27 modules), `DATA_SCHEMA.md` created (855 lines, 33+ Firestore collections). Post-audit tooling cleanup restored local lint/typecheck command reliability. ESM Phase E1/E2/E3 are complete: harness, DOM/format/date/Excel/staff leaf facades, and runtime adapters for DOM/Store/appState/DB readiness.
- Current conservative progress estimate:
 - Total long-term plan including optional TypeScript/CI/build tooling: ~71% complete.
 - Core non-optional refactor/security/testing plan: ~77% complete.
 - Near-term safe-execution track: ~99.8% complete.

## Next

- Review final cleanup commits and continue sprint-by-sprint; the dirty tree cleanup was staged using explicit path groups.
- ESM Phase E3 runtime adapters complete: `app/esm/adapters/dom.js`, `store.js`, and `db.js` are importable and installed by `app/esm/main.js`. Current ESM readiness is now ~50%; do not do one-shot ESM conversion.
- Next safe coding sprint candidate: ESM Phase E4 first isolated UI island (`app/ui/image-zoom.js` or an equivalent low-risk component) after reviewing inline/global handlers, or `Deep Extraction D1`.
- For every next refactor sprint:
  - create backup under `/home/longnick/backups/`
  - write or update deterministic verification first when practical
  - implement the smallest compatibility wrapper
  - run syntax checks, targeted verification, offline verification scripts, `npm test -- --runInBand`, and UTF-8/mojibake checks
- Rotate any credentials that were previously tracked in Git. This is an owner/manual task; do not read or paste secret values.
- Continue avoiding production database, migration files, POS/payment/customer data, and destructive commands.
- Before any coding task, inspect current dirty working tree carefully with:
  - `git status --short`
  - `git diff --stat`
  - `git diff -- <file>` for files to be edited.
- Update this AI map after each future coding/refactor task.
- Consider targeted commit staging of all 28 extracted modules and verification scripts.
- Remaining ~30 functions in `functions/index.js` depend on db/admin/config and should stay inline for now.
- ~~Consider adding `@ts-check` + JSDoc to backend modules~~ — Done in Phase 14.1.
- ~~Consider adding `tsc --noEmit` to CI/pre-commit hooks~~ — Done in Phase 14.2.
- Expand `CODE_MAP.md` — Done in Phase 14.3 (210→474 lines, 34 Cloud Functions, 27 modules).
- Expand data schema notes — Done in Phase 14.4 (`DATA_SCHEMA.md` created, 855 lines, 33+ Firestore collections).
- Consider ES module conversion planning for proper Vite tree-shaking.
- Consider deeper frontend extraction (remaining state-dependent POS functions in app.js).

## Blocked

- Full 100% refactor completion is not safe as a single unbounded operation because the repo has a large pre-existing dirty tree and production-sensitive paths/history; continue sprint-by-sprint.
- Credential rotation cannot be completed by the agent without secret-owner action.
- Deploy/DB mutation tasks are blocked until the user explicitly confirms scope and credentials/data safety.
- Any task touching secret values, production database, migration, POS data, payment/customer data is blocked until explicitly allowed and backed up.

## Risks

- Repo currently has many modified/untracked/deleted files before this refactor sprint; see `docs/ai-map/REFACTOR_PROGRESS.md`.
- `.gitignore`, `app.js`, and `index.html` already had pre-existing changes; current diff stats include prior work, not only the refactor sprints.
- Sensitive-file paths were removed from Git tracking, but credentials may still need rotation and Git history cleanup.
- `functions/index.js`, `app.js`, `db.js`, and `firestore.rules` are high-impact files; changes may affect production behavior.
- Import/backfill scripts may mutate database/POS history; do not run casually.
- Immediate ES modules/Vite migration may break global script order and browser runtime assumptions; use compatibility-first extraction. ESM Phase E1 harness is loaded safely after classic scripts.
- Vite spike merged but IIFE→ESM conversion not yet started; dev server serves IIFE files as static assets.
- ESM audit confirms Vite build passes, but current `index.html` still has 31 local classic scripts, 1 module script (`db.js`), and 2 inline scripts. Keep `package.json` as `commonjs` for now.
- TypeScript migration complete via JSDoc + @ts-check (no .ts files); backend modules annotated in Phase 14. Post-audit tooling cleanup restored frontend/backend `tsc` with TypeScript 6 deprecation handling.

## Done recently
- 2026-06-02 11:39: ESM Phase E3 runtime adapters completed. Added DOM/Store/DB adapters under `app/esm/adapters/`, wired them into `app/esm/main.js`, updated module cache key, added `scripts/verify-esm-runtime-adapters.js`, expanded `scripts/verify-esm-entry.js`, and passed check/tsc/test/lint/build. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-1139-esm-e3-runtime-adapters.md`
- 2026-06-02 11:26: ESM Phase E2 leaf facades completed. Added importable facades for format/date/excel/staff, wired them into `app/esm/main.js`, preserved all classic globals, updated `scripts/verify-esm-entry.js`, added `scripts/verify-esm-leaf-facades.js`, and passed check/tsc/test/lint/build. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-1126-esm-e2-leaf-facades.md`
- 2026-06-02 10:08: ESM Phase E1 compatibility harness completed. Added `app/esm/main.js`, `app/esm/README.md`, module script tag in `index.html`, and `scripts/verify-esm-entry.js`. Verified ESM readiness marker/event, syntax checks, frontend/backend tsc, Vite build, and lint with existing warnings only. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-1008-esm-e1-compat-harness.md`
- 2026-06-02 09:31: ESM conversion audit completed. Verified Vite config/build, scanned script/load-order and JS module format state, documented blockers and staged ESM plan in `docs/ai-map/ESM_AUDIT.md`. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-0931-esm-audit.md`
- 2026-06-02 09:07: Tooling cleanup restored `npm run lint`, frontend/backend `tsc`, backend module lint, and all 33 verification scripts. Added local ESLint devDependency, TypeScript 6 deprecation guard, frontend/backend `@ts-check` fixes, and explicit ads data dependency injection. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-0907-tooling-cleanup.md`
- 2026-06-02: Phase 14 COMPLETE: Backend @ts-check + JSDoc for all 8 modules, tsc --noEmit in CI, CODE_MAP.md expanded (210→474 lines, 34 Cloud Functions, 27 modules, data flows), DATA_SCHEMA.md created (855 lines, 33+ Firestore collections). Progress: ~65% total / ~72% core / ~99% near-term.
- 2026-06-02: Phase 13 COMPLETE: TypeScript JSDoc migration. Created jsconfig.json, added @ts-check to all 18 frontend modules, added JSDoc annotations to ~150+ exported functions. tsc --noEmit passes with 0 type errors. 33 verification scripts pass, Jest 6/6. Progress: ~58% total / ~65% core / ~97% near-term. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-phase13-typescript-jsdoc.md`

- 2026-06-02: Phase 12 COMPLETE: Rebased and merged `spike/vite-build-tooling` into `test/xe-kho-repo-implementer-skill`. Vite build verified (dist/ with index.html, main.js 103KB, main.css 57KB, manifest). All 33 verification scripts pass, Jest 6/6, git tree clean. Progress: ~52% total / ~60% core / ~95% near-term. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-phase12-vite-spike-merged.md`
- 2026-06-02: Phase 10 COMPLETE: extracted 48+ pure functions from `functions/index.js` into 4 new backend modules (`functions/telegram/ads.js`, `functions/telegram/orders.js`, `functions/telegram/online-orders.js`, `functions/utils/general.js`), cleaned 4 duplicate declarations. functions/index.js at 5702 lines (from ~7280 = -1578 lines). 8 backend modules + 20 frontend modules, 150+ exports across 28 modules. 33 verification scripts (29 existing + 4 new). Progress: ~48% total / ~55% core / ~92% near-term. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-phase10-full-extraction.md`
- 2026-06-02 01:44: Safe refactor Sprint 9 (Phase 2 Sprint 2.1+2.2): mapped all 35 exports in `functions/index.js` into CODE_MAP.md, extracted 11 pure text/formatting utilities into `functions/utils/text.js` with delegation wrappers. Progress: ~21% total / ~25% core / ~52% near-term. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-0144-safe-refactor-sprint-9-phase2-mapping-text-utils.md`
- 2026-06-02 01:38: Safe refactor Sprint 8: extracted pure staff helpers into `app/auth/staff.js` IIFE, added 4 compatibility wrappers in `app.js`. Progress: ~19% total / ~23% core / ~48% near-term. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-0138-safe-refactor-sprint-8-auth-staff.md`
- 2026-06-02 01:36: Safe refactor Sprint 7: extracted `openModal`/`closeModal`/`isModalOpen` into `app/ui/modal.js` IIFE, wrapped 6 existing modal functions in `app.js`. Progress: ~18% total / ~22% core / ~45% near-term. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-0136-safe-refactor-sprint-7-modal-ui.md`
- 2026-06-02 01:32: Safe refactor Sprint 6: extracted `applyTheme()` into `app/ui/theme.js` IIFE module with `XekhoApp.ui.applyTheme`, added compatibility wrapper in `app.js`, added `scripts/verify-theme-ui.js`. Progress: ~17% total / ~21% core / ~43% near-term. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-0132-safe-refactor-sprint-6-theme-ui.md`
- 2026-06-02 01:25: Safe refactor Sprint 5: extracted `showToast()` and `repairVietnameseText()` into `app/ui/toast.js` IIFE module with `XekhoApp.ui.*` namespace, added compatibility wrappers in `app.js`, added `scripts/verify-toast-ui.js`. Progress: ~16% total / ~20% core / ~40% near-term. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-0125-safe-refactor-sprint-5-toast-ui.md`
- 2026-06-02 00:44: Safe refactor Sprint 4 direction 1: performed safe staging review, staged only explicit security/docs/refactor paths, documented staged vs unstaged groups in `docs/ai-map/STAGING_REVIEW.md`, and left mixed/high-impact unrelated changes unstaged. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-0044-safe-refactor-sprint-4-staging-review.md`
- 2026-06-02 00:32: Safe refactor Sprint 3: added `app/utils/format.js`, loaded it before `store.js`, kept legacy `store.js` formatter names as wrappers/delegates, added `scripts/verify-format-utils.js`, and updated progress to ~15% total / ~19% core / ~36% near-term. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-0032-safe-refactor-sprint-3-format-utils.md`
- 2026-06-02 00:16: Safe refactor Sprint 2: created `docs/ai-map/REFACTOR_PROGRESS.md`, classified dirty tree path-only, recorded progress percentages, and removed duplicate CODE_MAP runtime verification entry. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-0016-safe-refactor-sprint-2-dirty-tree-progress.md`
- 2026-06-02 00:07: Safe refactor Sprint 1: expanded `.gitignore`, untracked sensitive paths without reading contents, fixed Jest permission blocker, added `app/utils/dom.js`, added `scripts/verify-dom-utils.js`, loaded the DOM utility before `app.js`, delegated `_escapeHtml()` through compatibility wrapper, updated stale offline runtime verification to Sprint 19, and passed verification. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-0007-safe-refactor-sprint-1.md`
- 2026-06-01 18:58: Rewrote `REFACTOR_PLAN.md` into a sprint-safe production refactor plan. Task log: `docs/ai-map/TASK_LOGS/2026-06-01-1858-safe-refactor-plan-rewrite.md`
- 2026-05-31 09:35: Initialized AI code map. Task log: `docs/ai-map/TASK_LOGS/2026-05-31-0935-initialize-ai-code-map.md`

## Phase 6 — 2026-06-02
- [x] Sprint 6.1: parser utilities (parsePurchaseText, parsePurchaseJson, getKitchenRoutingLabel, tokenSimilarity, getMenuItemImageUrl)
- [x] Sprint 6.2: categorize utilities (normalizeExpenseCategoryLabel, detectAdsExpensePlatform, isAdsExpenseEntry, mediaRefineryStatusClass, countInclusiveReportDays)
- [x] Sprint 6.3: report filter/query helpers (getReportMenuIngredientKeys, doesOrderMatch*, getIngredientMergeSuggestions, getDailyRevenueSnapshotsInRange)

## Phase 7 — 2026-06-02
- [x] Sprint 7.1: ads revenue report HTML builder (buildAdsRevenueReportHtml)
- [x] Sprint 7.2: fixed cost/payroll helpers (getFixedCostProfileForReports, _getPayrollProfile)
- [x] Sprint 7.3: dish cost resolution + menu normalization (_resolveDishCostPerUnit, normalizeMenuItemModel)

## Phase 8 — 2026-06-02
- [x] Sprint 8.1: uploadFileToGoogleDriveByEndpoint → app/utils/storage.js
- [x] Sprint 8.2: exportReportExcel (573 lines) → app/report/excel.js
- [x] Sprint 8.3: buildOperationalExpenseBreakdown → app/report/expense.js

## Phase 10 — 2026-06-02
- [x] Sprint 10.1: 11 Telegram report helpers → functions/telegram/reports.js
- [x] Sprint 10.2: 22 ads/date/NLP helpers → functions/telegram/ads.js
- [x] Sprint 10.3a: 11 order helpers → functions/telegram/orders.js, 9 online order helpers → functions/telegram/online-orders.js
- [x] Sprint 10.3b: 6 general utilities → functions/utils/general.js
- [x] Sprint 10.4: Removed 4 duplicate declarations (-221 lines)

## Phase 12 — 2026-06-02
- [x] Rebased `spike/vite-build-tooling` onto main (fast-forward)
- [x] Merged into `test/xe-kho-repo-implementer-skill` (fast-forward)
- [x] Vite build verified: dist/ produces index.html, main.js (103KB), main.css (57KB), manifest
- [x] All 33 verification scripts pass, Jest 6/6, git tree clean

## Phase 13 — 2026-06-02
- [x] Sprint 13.1: Created jsconfig.json, added @ts-check to all 18 frontend modules
- [x] Sprint 13.2: Added JSDoc annotations to 3 complex modules (order/helpers.js, report/excel.js, report/expense.js)
- [x] tsc --noEmit passes with 0 type errors

## Phase 14 — 2026-06-02
- [x] Sprint 14.1: Backend `@ts-check` + JSDoc annotations for all 8 backend modules
- [x] Sprint 14.2: `tsc --noEmit` added to CI pipeline (frontend + backend)
- [x] Sprint 14.3: `CODE_MAP.md` expanded (210→474 lines) — 34 Cloud Functions, 27 modules, data flows
- [x] Sprint 14.4: `DATA_SCHEMA.md` created (855 lines) — 33+ Firestore collections, field schemas, indexes
