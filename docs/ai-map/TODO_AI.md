# 2026-06-25 16:15 +07 - DONE: Android native Firebase Auth prep Sprint 5
- DONE: Added Firebase BoM/Auth dependency and Google Services plugin alias registered `apply false`; app module does not apply plugin and no real Firebase Auth call is wired.
- DONE: Added `FirebaseAuthSdkMarker`, Sprint 5 guard test, and `.gitignore` rule for `android-native/**/google-services.json`; `FirebaseAuthConfigGuard` still blocks real auth even if sdk/config flags look present.
- DONE: Verified TDD RED/GREEN, native unit test, debug APK build, targeted APK config/secret scan, Kilo read-only review, and legacy web `check/test/build:hosting` regression.
- DONE: Task log: `docs/ai-map/TASK_LOGS/2026-06-25-1615-android-native-firebase-auth-prep.md`.

# 2026-06-25 15:39 +07 - DONE: Android native AuthRepository boundary Sprint 4
- DONE: Added `AuthRepository` interface, `AuthRepositoryMode`, Firebase Auth guard/readiness models, and a fail-closed `BlockedFirebaseAuthRepository` placeholder.
- DONE: Updated `FakeAuthRepository` to implement the interface and `AppRoot` to depend on `AuthRepository` instead of concrete fake auth.
- DONE: Verified TDD RED/GREEN, native unit test, debug APK build, APK filename secret scan, Kilo read-only review, and legacy web `check/test/build:hosting` regression.
- DONE: Task log: `docs/ai-map/TASK_LOGS/2026-06-25-1539-android-native-auth-boundary.md`.

# 2026-06-25 15:23 +07 - DONE: Android native fake Auth/PIN Sprint 3
- DONE: Added local-only fake Auth/PIN state and tests; demo PIN `1234` unlocks fake POS tabs and wrong PIN stays locked.
- DONE: Updated Compose `AppRoot` to show PIN gate before dashboard and added `Khóa` action; auth state uses `rememberSaveable` after Kilo review flagged plain `remember` state loss.
- DONE: Verified TDD RED/GREEN, native unit test, debug APK build, APK filename secret scan, Kilo read-only re-review, and legacy web `check/test/build:hosting` regression.
- DONE: Task log: `docs/ai-map/TASK_LOGS/2026-06-25-1523-android-native-fake-auth-pin.md`.

# 2026-06-25 15:09 +07 - DONE: Android native fake tabs Sprint 2
- DONE: Added native domain models + fake repository for `Bàn`, `Kho`, `Tài chính`, `Cài đặt` without Firebase/POS production access.
- DONE: Reworked Compose `AppRoot` into a Material 3 tab shell using fake/local-only data.
- DONE: Verified TDD RED/GREEN, native unit test, debug APK build, APK filename secret scan, Kilo read-only review, and legacy web `check/test/build:hosting` regression.
- DONE: Task log: `docs/ai-map/TASK_LOGS/2026-06-25-1509-android-native-fake-tabs.md`.

# 2026-06-25 15:00 +07 - DONE: Android native skeleton Sprint 1
- DONE: Installed OpenJDK 17 + Android SDK cmdline tools/platform/build-tools on this machine.
- DONE: Created `android-native/` Kotlin/Jetpack Compose shell with Gradle wrapper and debug APK build.
- DONE: Verified native unit test, debug APK build, APK filename secret scan, and legacy web `check/test/build:hosting` regression.
- DONE: Task log: `docs/ai-map/TASK_LOGS/2026-06-25-1500-android-native-skeleton.md`; build notes: `docs/android-native-build.md`.

# 2026-06-19 18:21 +07 - DONE: POS chatbot Firestore profit report fallback
- DONE: Replace primary mock `getProfitReport()` response with read-only `history` aggregation for item profit ranking.
- DONE: Keep mock response only as an explicit fallback when Firestore read fails or the selected range has no item rows.
- DONE: Extend verifier coverage for Firestore read-only markers and fallback labeling.

# 2026-06-19 18:09 +07 - DONE: Telegram route for POS chatbot function calling
- DONE: Route owner-only Telegram report questions into the Gemini 2.5 Flash POS chatbot function-calling path before generic fallback.
- DONE: Harden GenAI initialization for API-key and Vertex AI Cloud Functions runtime.
- DONE: Extend verifier coverage for Telegram route integration.

# 2026-06-19 17:26 +07 - DONE: POS chatbot Gemini function calling
- DONE: Add `@google/genai` dependency for Cloud Functions.
- DONE: Add authenticated callable `askPosChatbot` with `getProfitReportTool` tool declarations and mock profit report function response loop.
- DONE: Add deterministic verifier for function-calling structure.

# 2026-06-19 16:58 +07 - DONE: Table special cards stale order cleanup
- DONE: Diagnose raw `onlineOrders` rendering and stale cloud `takeaway` source.
- DONE: Filter active online orders in listener/UI and preserve local takeaway only.
- DONE: Add verifier + build/check gate.

# AI TODO

## Doing

None for the auto stock compact ordering summary; awaiting owner iPhone/Safari live review.

## Next

- User to verify on iPhone/Safari after login: `Kho → TỒN KHO` should show one compact `Định mức tồn kho tự động` card; tapping it should show today's suggested order list, whole-case beer conversion, and projected purchase total. Tapping each item should show the detailed reason.
- If accepted, next phase can map menu items/combos through recipe BOM to convert POS selling-unit norms into raw-material norms and optionally suggest admin-approved `minQty` updates.
- Review final cleanup commits and continue sprint-by-sprint; the dirty tree cleanup was staged using explicit path groups.
- ESM Phase E4 image zoom UI island complete: `app/esm/ui/image-zoom.js` is importable and installed by `app/esm/main.js`; classic `ImgZoom` in `app.js` delegates when the module is ready and keeps fallback logic. Current ESM readiness is now ~55%; do not do one-shot ESM conversion.
- E5/E6 status: not safe to complete as one-shot work. Current scan shows 129 inline handlers, 34 script src tags, and 2 module script tags after removing obsolete Menu/AI Insights/Media pages. Replace handlers one island at a time with mobile QA; keep root `commonjs` until a separate package strategy sprint.
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

- 2026-06-25 07:39: Reworked `Định mức tồn kho tự động` into a compact clickable ordering summary with whole-case beer conversion (24 lon/thùng), projected purchase total, and per-item drill-down; deployed and Playwright-smoked live mobile. Task log: `docs/ai-map/TASK_LOGS/2026-06-25-0739-auto-stock-summary-card.md`
- 2026-06-25 07:14: Fixed `Định mức tồn kho tự động` mobile layout: status badge now sits beside dish name, added `Cần nhập đề xuất`, responsive card layout verified by Playwright local/live 390×844. Task log: `docs/ai-map/TASK_LOGS/2026-06-25-0714-auto-stock-mobile-layout.md`
- 2026-06-25 06:45: Added read-only `Định mức tồn kho tự động` board in `Kho → TỒN KHO`, computing 56-day demand, ABC class, P75/P90/P95, and `Tối thiểu / Chuẩn / Tối đa`; deployed Hosting-only. Task log: `docs/ai-map/TASK_LOGS/2026-06-25-0645-auto-stock-norm-board.md`
- 2026-06-22 22:18: Fixed Kho inventory type saves so `Nguyên liệu` ↔ `Hàng bán thẳng` edits persist through `itemType` + `inv_type`. Task log: `docs/ai-map/TASK_LOGS/2026-06-22-2218-inventory-type-save.md`
- 2026-06-19 16:35: Fixed Finance tab custom range reports so 2026-06-01 to 2026-06-18 keeps `financePeriod=range` in sync with `financeDateOpts`; expenses/fixed costs/charts/discount details now use the same range. Task log: `docs/ai-map/TASK_LOGS/2026-06-19-1635-finance-date-range.md`
- 2026-06-17: Fixed Telegram chart button unknown-callback regression by accepting legacy/new chart callback prefixes. Task log: `docs/ai-map/TASK_LOGS/2026-06-17-telegram-chart-callback-prefix-regression.md`
- 2026-06-17: Fixed Telegram `Doanh thu tháng này?` zero regression by restoring Firestore/POS-first direct reports and constraining BigQuery fallback. Task log: `docs/ai-map/TASK_LOGS/2026-06-17-telegram-month-revenue-zero-regression.md`
- 2026-06-17: Enabled read-only BigQuery reporting for Telegram owner assistant and fixed month-revenue source fallback. Task log: `docs/ai-map/TASK_LOGS/2026-06-17-telegram-bigquery-reporting-month-revenue.md`
- 2026-06-17: Expanded Telegram owner assistant with proactive business insights, menu price/image answers, and inline chart callbacks for reports. Task log: `docs/ai-map/TASK_LOGS/2026-06-17-telegram-owner-assistant-proactive-menu-charts.md`
- 2026-06-17 01:07: Improved Telegram owner assistant for open-ended natural Firebase/POS questions (`Hôm qua bán bao nhiêu bia?`) and deterministic capability response (`Bạn có thể làm gì?`). Task log: `docs/ai-map/TASK_LOGS/2026-06-17-0107-telegram-open-ended-firebase-assistant.md`
- 2026-06-17 00:49: Fixed Telegram bot shop name to `Xe Khô Chữa Lành` and smart report parsing for `Doanh thu từ 18h hôm qua đến bây giờ?`; range-only queries no longer become item-scoped. Task log: `docs/ai-map/TASK_LOGS/2026-06-17-0049-telegram-shop-name-smart-range.md`
- 2026-06-17 00:32: Deployed `xekho:telegramWebhook` after owner guard and Gemini thought-signature fixes. Smoke tests passed: GET 405, OPTIONS 204, missing-chat safe skip, owner revenue path `ok: true`.
- 2026-06-17 00:24: Fixed Gemini/Vertex tool-call continuity for Telegram owner assistant by preserving original function-call parts with thought-signature metadata. Added `scripts/verify-gemini-function-call-thought-signature.js`. Task log: `docs/ai-map/TASK_LOGS/2026-06-17-0024-gemini-function-call-thought-signature.md`
- 2026-06-17 00:13: Tightened Telegram owner-only AI/revenue/report assistant access. `telegramWebhook` now uses the assistant/report bot token resolver (no kitchen fallback), open AI/report paths require owner Telegram ID `6496387732` or configured `TELEGRAM_OWNER_CHAT_ID`, and `scripts/verify-telegram-owner-assistant-guard.js` guards the behavior. Task log: `docs/ai-map/TASK_LOGS/2026-06-17-0013-telegram-owner-assistant-guard.md`
- 2026-06-07 11:19: Optimized Firebase Hosting deploys by switching static hosting output from repo root `.` to prepared `dist`; `npm run build:hosting` now copies required legacy runtime assets, Firebase predeploy runs it automatically, and deploy output dropped from 238 root files to 83 dist files. Task log: `docs/ai-map/TASK_LOGS/2026-06-07-1119-hosting-deploy-speed.md`

- 2026-06-07 10:35: Updated active Gemini text-model defaults/fallbacks and `opencode.json` in `xekho` from `gemini-2.5-flash` to `gemini-3.5-flash`; task log: `docs/ai-map/TASK_LOGS/2026-06-07-1035-gemini-35-flash-routing.md`

- 2026-06-06 20:24: Refined `Kiểm kê kho` search layout so the modal keeps fixed height, the search field stays at the top, and only filtered result rows scroll in a shorter viewport to avoid iPhone keyboard covering results. Task log: `docs/ai-map/TASK_LOGS/2026-06-06-2024-stocktake-search-layout.md`
- 2026-06-06 20:11: Added item search fields in `Kho` purchase and stocktake modals; purchase select options filter by typed item/material text, and stocktake rows are hidden/shown without dropping typed actual quantities. Task log: `docs/ai-map/TASK_LOGS/2026-06-06-2011-inventory-item-search.md`
- 2026-06-04 10:17: Fixed `TỒN KHO` tab showing no stock by falling back to Firestore master `Inventory_Items` and normalizing `material_name`/`base_unit`/`current_stock`/`min_alert`/`inv_type` into POS stock fields; guarded by `scripts/verify-inventory-stock-display.js`. Task log: `docs/ai-map/TASK_LOGS/2026-06-04-1017-fix-inventory-stock-display.md`
- 2026-06-04 09:54: Compact mobile POS header/status bar so brand, offline badge, username, mic, and reload controls no longer overflow the top frame on iPhone widths. Offline badge now uses compact labels like `OK`; guarded by `scripts/verify-mobile-pos-header.js`. Task log: `docs/ai-map/TASK_LOGS/2026-06-04-0954-mobile-pos-header-compact.md`
- 2026-06-04 08:52: Improved physical table-card note readability by removing the note icon/pill and replacing the status emoji with full-width two-line note text on noted cards. Task log: `docs/ai-map/TASK_LOGS/2026-06-04-0852-readable-table-note.md`
- 2026-06-04 08:27: Added table-card note chips in the `Bàn` tab so each physical table card can show `table.note`/order note beside the table number; guarded by `scripts/verify-mobile-table-grid.js`. Task log: `docs/ai-map/TASK_LOGS/2026-06-04-0827-table-card-note-chip.md`
- 2026-06-04 08:17: Added a quick table-note input beside `Bàn X` in the order-selection header; it stays synced with the cart note/table note and is guarded by `scripts/verify-order-table-note-ui.js`. Task log: `docs/ai-map/TASK_LOGS/2026-06-04-0817-order-table-note-header.md`
- 2026-06-04 08:00: Fixed shared compact formatter so all UI surfaces using `fmt()` preserve fractional-thousand prices (`17.500đ` → `17,5K`, not `18K`), including POS menu grid/cart/menu admin; bumped `format.js` cache key. Task log: `docs/ai-map/TASK_LOGS/2026-06-04-0800-exact-price-ui.md`
- 2026-06-03 23:28: Deployed bill unit-price fix and bumped `app.js` cache key to `20260603-bill-unit-price` so mobile clients fetch the fixed `17,5K` bill formatter immediately. Task log: `docs/ai-map/TASK_LOGS/2026-06-03-2328-deploy-bill-price-cachebust.md`
- 2026-06-03 23:12: Fixed bill unit-price display for fractional-thousand menu prices; bill `Đ.Giá` now shows `17,5K` for `17.500đ` instead of rounded `18K`. Task log: `docs/ai-map/TASK_LOGS/2026-06-03-2312-fix-bill-unit-price-display.md`

- 2026-06-03 22:55: Fixed Vietnamese thousands price input in `Kho` → `Quản lý món`; `17.500đ` now parses/saves as `17500` instead of decimal `17.5`. Task log: `docs/ai-map/TASK_LOGS/2026-06-03-2255-fix-menu-price-thousands.md`

- 2026-06-03 22:49: Fixed `Kho` → `Quản lý món` price-save regression. Existing finished-good items with empty recipes can now save price edits, while new finished items still require a recipe. `db.js` mirrors price to `sell_price` + `price`. Task log: `docs/ai-map/TASK_LOGS/2026-06-03-2249-fix-menu-price-save.md`
- 2026-06-03 21:38: Fixed mobile table-screen overflow and removed the duplicate `takeaway` physical-grid tile while preserving the dedicated `Khách mang về` card. Added `scripts/verify-mobile-table-grid.js`. Task log: `docs/ai-map/TASK_LOGS/2026-06-03-2138-fix-mobile-table-overflow-takeaway.md`
- 2026-06-03 20:36: Fixed POS order menu search after ESM delegation by reading `#order-search` directly in `renderMenuItems()`, and fixed completed-order Telegram wrapper argument reset so real items/table/payment/totals flow into notifications. Task log: `docs/ai-map/TASK_LOGS/2026-06-03-2036-fix-menu-search-completed-telegram.md`
- 2026-06-03 20:02: Removed obsolete top-level admin pages/tabs for Menu, AI Insights, and Media before deploy. `index.html` removed page/menu/navigation blocks, `app.js` now explicitly denies stale `menu`/`insights`/`media` navigation, Media Refinery page rendering/styles were removed, and ESM verifier counts were adjusted. Marker scan: removed page/navigation markers = 0, inline handlers = 129. Task log: `docs/ai-map/TASK_LOGS/2026-06-03-2002-remove-unused-admin-tabs-deploy.md`
- 2026-06-02 15:29: Deep Extraction D4 small-utility cleanup completed outside E phase. Added `getTelegramReportTestUrl()` to `app/utils/storage.js`, added `getCurrentOrderActorMetaFromUser()` to `app/auth/staff.js`, delegated both legacy `app.js` functions, removed unreachable `getFinanceExpenseRows()` fallback code, and expanded storage/auth verifiers. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-1529-deep-d4-small-utils.md`
- 2026-06-02 14:58: ESM Phase E5.11 admin render controls completed. Added `app/esm/ui/admin-render-controls.js`, converted 6 low-risk admin render/search inline handlers to delegated data attributes, wired `app/esm/main.js`, added `scripts/verify-esm-admin-render-controls.js`, and reduced inline handlers to 141. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-1458-esm-e5-admin-render-controls.md`
- 2026-06-02 14:50: ESM Phase E5.10 render/filter refresh controls completed. Added `app/esm/ui/render-refresh-controls.js`, converted 12 low-risk render/filter refresh inline handlers to delegated `data-esm-render-refresh`, wired `app/esm/main.js`, added `scripts/verify-esm-render-refresh-controls.js`, and reduced inline handlers to 147. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-1450-esm-e5-render-refresh-controls.md`
- 2026-06-02 14:20: ESM Phase E5.9 modal overlay/close controls completed. Added `app/esm/ui/modal-overlay-controls.js`, converted 41 low-risk modal/image-zoom inline handlers to delegated data attributes, wired `app/esm/main.js`, added `scripts/verify-esm-modal-overlay-controls.js`, and reduced inline handlers to 159. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-1420-esm-e5-modal-overlay-controls.md`
- 2026-06-02 14:05: ESM Phase E5.8 report filter controls completed. Added `app/esm/ui/report-filter-controls.js`, converted 2 report menu filter `onchange` handlers and 2 report reset `onclick` handlers to delegated data attributes, wired `app/esm/main.js`, updated cache key, added `scripts/verify-esm-report-filter-controls.js`, expanded entry verification, and passed check/tsc/test/lint/build. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-1405-esm-e5-report-filter-controls.md`
- 2026-06-02 14:00: ESM Phase E5.7 report transaction filters completed. Added `app/esm/ui/report-transaction-filters.js`, converted 6 report transaction filter inline `onchange` handlers to `data-esm-report-transaction-filter`, wired `app/esm/main.js`, updated cache key, added `scripts/verify-esm-report-transaction-filters.js`, expanded entry verification, and passed check/tsc/test/lint/build. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-1400-esm-e5-report-transaction-filters.md`
- 2026-06-02 13:55: ESM Phase E5.6 finance period controls completed. Added `app/esm/ui/finance-period.js`, converted 5 finance period inline `onclick` handlers to `data-esm-finance-period`, wired `app/esm/main.js`, updated cache key, added `scripts/verify-esm-finance-period.js`, expanded entry verification, and passed check/tsc/test/lint/build. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-1355-esm-e5-finance-period.md`
- 2026-06-02 13:45: ESM Phase E5.5 inventory tabs completed. Added `app/esm/ui/inventory-tabs.js`, converted 5 inventory tab inline `onclick` handlers to `data-esm-inventory-tab`, wired `app/esm/main.js`, updated cache key, added `scripts/verify-esm-inventory-tabs.js`, expanded entry verification, and passed check/tsc/test/lint/build. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-1345-esm-e5-inventory-tabs.md`
- 2026-06-02 13:35: ESM Phase E5.4 report date controls completed. Added `app/esm/ui/report-date-controls.js`, converted 5 report period + 2 report date mode inline handlers to `data-esm-*`, wired `app/esm/main.js`, updated cache key, added `scripts/verify-esm-report-date-controls.js`, expanded entry verification, and passed check/tsc/test/lint/build. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-1335-esm-e5-report-date-controls.md`
- 2026-06-02 13:25: ESM Phase E5.3 settings tabs completed. Added `app/esm/ui/settings-tabs.js`, converted 7 static settings tab inline `onclick` handlers to `data-esm-settings-tab`, wired `app/esm/main.js`, updated cache key, added `scripts/verify-esm-settings-tabs.js`, expanded entry verification, and passed check/tsc/test/lint/build. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-1325-esm-e5-settings-tabs.md`
- 2026-06-02 12:55: ESM Phase E5.2 report tabs completed. Added `app/esm/ui/report-tabs.js`, converted 4 static report tab inline `onclick` handlers to `data-esm-report-tab`, wired `app/esm/main.js`, updated cache key, added `scripts/verify-esm-report-tabs.js`, expanded entry verification, and passed check/tsc/test/lint/build. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-1255-esm-e5-report-tabs.md`
- 2026-06-02 12:42: ESM Phase E5.1 header actions completed. Added `app/esm/ui/header-actions.js`, converted 4 static header inline `onclick` handlers to `data-esm-header-action`, wired `app/esm/main.js`, updated cache key, added `scripts/verify-esm-header-actions.js`, expanded entry verification, and passed check/tsc/test/lint/build. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-1242-esm-e5-header-actions.md`
- 2026-06-02 11:56: ESM Phase E4 image zoom UI island completed. Added `app/esm/ui/image-zoom.js`, wired `app/esm/main.js`, delegated classic `ImgZoom` methods in `app.js`, updated module cache key, added `scripts/verify-esm-ui-image-zoom.js`, expanded entry verification, and passed check/tsc/test/lint/build. Task log: `docs/ai-map/TASK_LOGS/2026-06-02-1156-esm-e4-image-zoom-ui-island.md`
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


- 2026-06-03 19:15: Removed obsolete `testDailyReportTelegram` endpoint and frontend test button. Production Telegram daily reports continue through `scheduledTelegramReport`; manual test endpoint is no longer a deploy target. Task log: `docs/ai-map/TASK_LOGS/2026-06-03-1915-remove-test-daily-report.md`
