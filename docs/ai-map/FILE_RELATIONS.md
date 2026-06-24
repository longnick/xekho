# 2026-06-25 06:45 +07 - Auto stock norm board relations
- `index.html#auto-stock-norm-board` renders a read-only `Định mức tồn kho tự động` card in `Kho → TỒN KHO` and loads `app.js?v=20260625-auto-stock-norm`.
- `db.js` streams `history` and `Inventory_Items`/inventory into `window.appState`; `app.js#buildAutoStockNormRows()` reads them through `_getVisibleHistoryForUi()` and `_getInventory()` without writing Firestore.
- `app.js#renderAutoStockNormBoard()` computes 56-day POS item demand, ABC class, P75/P90/P95, `Tối thiểu / Chuẩn / Tối đa`, and maps current stock by `linkedInventoryId`, item id, or normalized name.
- `scripts/verify-auto-stock-norm.js` guards the DOM marker, app logic markers, cache key, and realtime refresh markers.

# 2026-06-19 18:21 +07 - POS chatbot Firestore profit report relations
- `functions/index.js#getProfitReport()` now reads `history` via Admin SDK read-only, filters visible report orders with existing Telegram report guards, and aggregates item-level qty/revenue/cost/grossProfit for Vietnam-time `today/current_month/last_month` ranges.
- `buildMockProfitReport()` remains only as a labeled fallback (`mock-firestore-error` / `mock-empty-live-data`) so Gemini does not invent numbers if Firestore is unavailable or the range has no item data.
- `runAskPosChatbot()` exposes returned tool data as `toolData` rather than `mockData`; Telegram owner route keeps this data inside `toolResults` for internal traceability.

# 2026-06-19 18:09 +07 - Telegram POS chatbot function-calling route
- `telegramWebhook` owner text branch now checks deterministic menu/proactive/finance/smart-report handlers first, then uses `tryAnswerTelegramPosChatbotFunctionCalling()` for natural report questions before the generic `askGeminiWithFirestoreTools()` fallback.
- `tryAnswerTelegramPosChatbotFunctionCalling()` delegates to `runAskPosChatbot()` and sends the resulting natural Gemini answer back through the normal Telegram message path.
- `getPosChatbotAi()` supports Gemini API-key runtime and Vertex AI runtime fallback for Cloud Functions deploys.

# 2026-06-19 17:26 +07 - POS chatbot Gemini function-calling relations
- `functions/index.js#askPosChatbot` is an authenticated callable entrypoint for POS report chat questions.
- `getProfitReportTool` lets Gemini request `timeframe` (`today/current_month/last_month`) plus optional `sort` (`highest/lowest`) instead of inventing numbers.
- `getProfitReport()` currently returns mock data only; replace it with read-only Firestore/BigQuery reporting before exposing real financial answers broadly.
- `scripts/verify-pos-chatbot-function-calling.js` guards the SDK import, tool schema, auth gate, function-response turn, and mock data markers.

# 2026-06-19 16:58 +07 - Table special-card file relations
- `index.html` cache keys -> loads fresh `db.js` and `app.js` for table special-card cleanup.
- `db.js` online-order listener -> `window.appState.onlineOrders` -> `app.js#renderTables` / `renderOnlineOrdersPanel`.
- `Store.orders.takeaway` remains canonical for local-only `Khach Mang Ve`; stale cloud `orders.takeaway` is ignored by `app.js#_getOrders` and `syncLocalOrderCacheFromCloud`.

# File Relations

## Module: POS frontend

Purpose:

Run the main restaurant point-of-sale workflow: table/order state, menu interactions, checkout, and staff/admin UI.

Related files:

- `index.html`
  - role: main POS document / UI shell.
  - depends on: root JS/CSS assets such as `app.js`, `db.js`, `style.css`.
  - used by: Firebase Hosting / local server users.
  - notes: verify script tags before changing frontend module names; obsolete top-level Menu, AI Insights, and Media pages/navigation entries were removed in the 2026-06-03 deploy cleanup.

- `app.js`
  - role: main POS client-side application logic.
  - depends on: Firebase wrapper/data helpers and DOM structure in `index.html`.
  - used by: POS page.
  - notes: now explicitly denies stale `menu` / `insights` / `media` navigation after those obsolete pages were removed; `submitMenuItem()` uses Vietnamese money parsing for menu prices and an id-aware recipe gate so existing menu items can save price edits even if they currently have no recipe rows; `openBillModal()` uses `formatBillUnitPrice()` for the bill `Đ.Giá` column so fractional-thousand prices such as `17.500đ` display as `17,5K` instead of rounded `18K`; order header `#order-table-note` syncs quick table notes with cart/order extras and table notes; `renderTables()` also displays escaped full-width note text inside physical table cards; purchase/stocktake inventory modals now use searchable item pickers guarded by `scripts/verify-inventory-item-search.js`; `submitInvEdit()` must send both `itemType` and `inv_type` so Kho edits persist Nguyên liệu/Hàng bán thẳng through `DB.Inventory.update()` and master/reporting compatibility; Finance custom date ranges persist `financePeriod=range` before rendering so revenue, expenses, fixed costs, charts, and discount details share the selected dates; the stocktake modal keeps a fixed-height sheet with a top search panel and a shorter result-scroll region for iPhone keyboard safety; inspect diff before editing.

- `app/esm/main.js`
  - role: Phase E1/E2/E3 browser-module compatibility harness for future ESM migration.
  - depends on: existing classic runtime being loaded first; imports DOM/format/date/Excel/staff ESM facades plus DOM/Store/DB runtime adapters; reads/creates `window.XekhoApp.esm` and installs compatibility globals/adapters.
  - used by: `index.html` as `<script type="module">` after offline/classic scripts and before inline DOM helpers.
  - notes: does not import `app.js`, does not change POS behavior, and is verified by `scripts/verify-esm-entry.js`.

- `app/esm/utils/dom.js`
  - role: Phase E2 importable DOM utility facade.
  - depends on: no app state; pure `escapeHtml()` plus optional global installer.
  - used by: `app/esm/main.js` and future ESM consumers.
  - notes: preserves `window.XekhoApp.utils.dom.escapeHtml()` compatibility and is verified by `scripts/verify-esm-dom-utils.js`.

- `app/esm/utils/format.js`, `app/esm/utils/date.js`, `app/esm/utils/excel.js`, `app/esm/auth/staff.js`
  - role: Phase E2 importable leaf facades for already-extracted pure helpers.
  - depends on: no app state; installer functions write only compatibility namespaces/globals.
  - used by: `app/esm/main.js`, `scripts/verify-esm-leaf-facades.js`, and future ESM consumers.
  - notes: preserves current IIFE/global API while allowing direct ESM imports for format/date/Excel/staff helpers.

- `app/esm/adapters/dom.js`, `app/esm/adapters/store.js`, `app/esm/adapters/db.js`
  - role: Phase E3 runtime adapters for future UI islands and state/data readiness without importing `app.js`.
  - depends on: existing browser globals (`document`, `window.Store`, `window.appState`, `window.DB`) only at call/install time.
  - used by: `app/esm/main.js`, `scripts/verify-esm-runtime-adapters.js`, and future ESM UI islands.
  - notes: adapters are non-mutating except for installing `window.XekhoApp.esm.adapters.*`; DB adapter observes `db:ready` and does not import Firebase directly.

- `app/esm/README.md`
  - role: ESM migration guardrails, completed facade inventory, and next safe dual-export candidates.
  - depends on: ESM audit plan in `docs/ai-map/ESM_AUDIT.md`.
  - used by: future ESM conversion sprints.
  - notes: keep root `package.json` as `commonjs` until a later package-type strategy sprint.


- `app/utils/storage.js`
  - role: extracted browser storage/upload utility module.
  - depends on: browser localStorage/FileReader/fetch only at call time.
  - used by: `app.js` compatibility wrappers and report/upload flows.
  - notes: owns storage/Drive helpers; the old Telegram daily report test URL helper was removed with the deleted test endpoint.

- `app/auth/staff.js`
  - role: extracted pure auth/staff helper module.
  - depends on: no app state; wrappers pass state-derived values in from `app.js`.
  - used by: login/session helpers and order actor metadata wrapper.
  - notes: now exports `getCurrentOrderActorMetaFromUser(posUser)` while `app.js` remains responsible for reading `getCurrentPosUser()`.

- `db.js`
  - role: Firestore/Firebase data access helper.
  - depends on: Firebase SDK/config.
  - used by: POS/KDS/AI modules.
  - notes: do not hardcode secrets; treat Firestore schema changes carefully; Menu add/update mirrors selling price into both `sell_price` and `price`.

- `offlineBackup.js`
  - role: POS offline backup queue foundation for pending order actions.
  - depends on: browser IndexedDB/localStorage when used in POS; can use in-memory storage for Node verification.
  - used by: future offline-safe order adapter and sync engine.
  - notes: stores/lists/marks queue actions, including Sprint 11 explicit `remove_item`; it does not alter live POS flow by itself.

- `offlineSync.js`
  - role: adapter-based sync engine for pending/failed offline queue actions.
  - depends on: `offlineBackup.js` backup API and an injected sync adapter.
  - used by: Firestore sync adapter and future POS offline-safe order integration.
  - notes: verifies idempotency by `clientOrderId`, retry/backoff, offline skip, and single-flight lock using an in-memory adapter.

- `offlineFirestoreAdapter.js`
  - role: Firestore/POS adapter foundation for `offlineSync.js`.
  - depends on: injected operations or existing `window.DB`/`appState`; does not import Firebase directly.
  - used by: future live Firestore sync and POS integration.
  - notes: maps `close_order` to completed history payloads, applies Sprint 11 `remove_item` through `removeItem`, and checks `history`/`orders`/`online_orders` by `clientOrderId`; verified with memory operations only.

- `offlineRuntime.js`
  - role: browser runtime installer for offline backup status.
  - depends on: `offlineBackup.js`; can optionally use `offlineSync.js` and `offlineFirestoreAdapter.js` when sync is explicitly enabled.
  - used by: `index.html` and offline status UI.
  - notes: auto-installs `window.XekhoOfflineBackupRuntime` with sync disabled by default, so it does not write Firestore or wrap order actions.

- `offlineStatusUI.js`
  - role: visible POS offline backup status badge/panel.
  - depends on: `offlineRuntime.js` runtime summary API and browser DOM.
  - used by: `index.html` header actions.
  - notes: read-only UI; displays online/offline, pending/failed/synced counts, and sync-disabled status without enabling sync or changing order flow.

- `offlineOrderFallback.js`
  - role: disabled/dry-run POS order fallback wrapper and payload builder.
  - depends on: `offlineBackup.js` helpers and optionally `window.XekhoOfflineBackupRuntime` for explicit enabled queue writes.
  - used by: `index.html` as a safe disabled controller; `offlineOrderFallbackDevTools.js` can explicitly install dry-run wrapping around `window.DB.Orders` for manual browser testing.
  - notes: builds actions for `open_order`, `add_item`, `change_qty`, `remove_item`, `update_item`, `update_meta`, `close_order`, and `cancel_order`; Sprint 11 adds stable localStorage-backed device IDs and removes the old quantity-sentinel remove surrogate. Auto-install is disabled mode and does not wrap live order methods.

- `offlineOrderFallbackDevTools.js`
  - role: Sprint 7 explicit browser/manual dry-run helpers for POS order fallback, extended in Sprint 9/9B/10/11 for payload review reports, mobile UI, validation warnings, stable device IDs, and safe remove-item semantics; Sprint 12 adds guarded queue-write enablement.
  - depends on: `offlineOrderFallback.js`, browser `window.DB.Orders` when manually enabling dry-run or guarded queue-write, optional `appState` table lookup, and `window.XekhoOfflineBackupRuntime.savePendingOrderAction` for guarded queue writes.
  - used by: browser console/manual QA via `window.XekhoOfflineOrderFallbackDevTools`; iPhone/mobile QA via `?xkPayloadReview=1` and guarded queue-write UI via `?xkQueueWriteGuard=1`.
  - notes: safe by default; loading the script only installs helper methods. `buildPayloadReviewReport()` and `printPayloadReviewReport()` generate sample payloads without wrapping or queue writes. Sprint 10 adds `warnings` for unresolved device/table/history risks, fills dry-run table IDs, and lets `close_order` include `payInfo.items`. Sprint 11 expects no `device_unknown` when localStorage works and warns if `removeItem` regresses to delta-based semantics. `enableDryRun()` wraps `DB.Orders` in dry-run mode, captures only offline/server-like failures, rethrows errors, and never writes the queue. Sprint 12 `enableQueueWriteGuarded({ confirmation: 'ENABLE_OFFLINE_QUEUE_WRITE' })` can explicitly wrap `DB.Orders` in enabled mode and enqueue offline/server failures while auto sync remains disabled. `disable()` unwraps methods.

- `scripts/verify-offline-backup.js`
  - role: safe local verification for the offline backup queue API.
  - depends on: `offlineBackup.js` CommonJS exports and Node `assert`.
  - used by: development/AI verification; does not read or write production data.

- `scripts/verify-offline-sync.js`
  - role: safe local verification for offline sync engine behavior.
  - depends on: `offlineBackup.js`, `offlineSync.js`, in-memory storage/adapter, and Node `assert`.
  - used by: development/AI verification; does not read or write Firestore/POS data.

- `scripts/verify-offline-firestore-adapter.js`
  - role: safe local verification for Firestore adapter mapping/idempotency behavior.
  - depends on: `offlineBackup.js`, `offlineSync.js`, `offlineFirestoreAdapter.js`, memory operations, and Node `assert`.
  - used by: development/AI verification; does not read or write live Firebase/POS data. Sprint 11 covers explicit `remove_item` routing to memory `removeItem`.

- `scripts/verify-offline-runtime.js`
  - role: safe local verification for browser runtime behavior.
  - depends on: `offlineBackup.js`, `offlineSync.js`, `offlineFirestoreAdapter.js`, `offlineRuntime.js`, memory storage/operations, and Node `assert`.
  - used by: development/AI verification; confirms sync-disabled mode does not apply queued actions.

- `scripts/verify-offline-status-ui.js`
  - role: safe local verification for offline status badge/panel formatting.
  - depends on: `offlineStatusUI.js` and Node `assert`.
  - used by: development/AI verification; confirms state/text mapping for ok, pending, failed, and offline conditions.

- `scripts/verify-offline-order-fallback.js`
  - role: safe local verification for POS order fallback payload shapes and safe modes.
  - depends on: `offlineBackup.js`, `offlineOrderFallback.js`, memory storage, and Node `assert`.
  - used by: development/AI verification; confirms disabled mode does not wrap, stable device IDs are generated without `device_unknown`, `removeItem` uses explicit `remove_item`, dry-run captures actions without queue writes, and enabled mode can save to memory queue when explicitly invoked.

- `scripts/verify-offline-order-fallback-devtools.js`
  - role: safe local verification for Sprint 7 browser dry-run helper behavior and Sprint 9 payload review reporting, extended in Sprint 12 for guarded queue-write checks.
  - depends on: `offlineBackup.js`, `offlineOrderFallback.js`, `offlineOrderFallbackDevTools.js`, fake `DB.Orders`, fake runtime queue, and Node `assert`.
  - used by: development/AI verification; confirms explicit dry-run wrapping, offline/server-only capture, unwrap behavior, simulated payload generation, stable device IDs, explicit `remove_item`, side-effect-free review reports, guarded queue-write confirmation requirement, queue-save behavior, and auto-sync-disabled reporting without Firestore/POS data.

- `style.css`
  - role: shared styling.
  - depends on: HTML classes/IDs.
  - used by: POS/KDS and mockup pages.
  - notes: currently modified before AI map initialization.

## Module: Kitchen Display System

Purpose:

Show kitchen orders and status updates in realtime.

Related files:

- `kitchen.html`
  - role: kitchen UI entry page.
  - depends on: Firestore order data and style/assets.
  - used by: kitchen staff.
  - notes: coordinate changes with order status schema.

- `firebase-messaging-sw.js`
  - role: service worker for FCM web push.
  - depends on: Firebase Messaging config.
  - used by: notification flow.
  - notes: changing this can affect browser notification behavior.

- `KDS_PLAN.md`, `KITCHEN_GUIDE.md`
  - role: KDS planning/operator documentation.
  - depends on: current KDS behavior.
  - used by: future AI agents and human operators.

## Module: Firebase Functions backend

Purpose:

Provide server-side triggers, HTTP endpoints, integrations, and automation logic.

Related files:

- `functions/index.js`
  - role: Firebase Functions entry point.
  - depends on: Firebase Admin, functions SDK, helper modules, environment/secrets.
  - used by: deployed Cloud Functions.
  - notes: currently modified before AI map initialization; do not deploy without review. After tooling cleanup it explicitly injects ads report data-loader dependencies into `functions/telegram/ads.js`.

- `functions/telegram/ads.js`
  - role: extracted Telegram ads/date/report helper module.
  - depends on: `functions/telegram/reports.js`, `functions/utils/text.js`, and injected stateful data loaders from `functions/index.js` via `setAdsRevenueDataDependencies()`.
  - used by: ads report endpoints/webhook flows through thin wrappers in `functions/index.js`.
  - notes: keep Firestore/API access outside the extracted module; inject loaders rather than relying on implicit globals so backend `@ts-check` remains green.

- `functions/telegram/send.js`
  - role: Telegram send/edit/photo HTTP helper module.
  - depends on: axios and `functions/utils/text.js`.
  - used by: Telegram webhook/report/notification flows through `functions/index.js` wrappers.
  - notes: axios CommonJS import is typed as `any` to avoid false-positive TypeScript CJS namespace diagnostics.

- `functions/firestoreMegaTools.js`
  - role: Firestore utility/tool layer.
  - depends on: Firebase Admin/Firestore.
  - used by: functions and AI tooling.
  - notes: changes may affect data writes.

- `functions/geminiTools.js`
  - role: Gemini/function-calling support.
  - depends on: AI service config and Firestore helpers.
  - used by: AI workflows.

- `functions/vertexAi.js`
  - role: Vertex AI integration.
  - depends on: Google Cloud credentials/environment.
  - used by: AI assistant and media/automation features.

- `firestore.rules`
  - role: Firestore security rules.
  - depends on: collection schema and auth roles.
  - used by: Firebase deployments.
  - notes: security-sensitive; test before deploy.

## Module: AI assistant and business automation

Purpose:

Provide AI-assisted operations, routing, action execution, and model integrations.

Related files:

- `ai-core.js`
  - role: AI core orchestration.
  - depends on: action definitions and model/router modules.
  - used by: AI UI/actions.

- `ai-actions.js`
  - role: executable actions for AI assistant.
  - depends on: app/db/business functions.
  - used by: AI core/UI.
  - notes: currently modified before AI map initialization.

- `ai-ui.js`
  - role: frontend UI for AI assistant.
  - depends on: DOM and AI core/actions.
  - used by: operator-facing AI interface.

- `DeepSeekRouter.js`
  - role: model/router integration.
  - depends on: provider configuration/secrets.
  - used by: AI core/actions.
  - notes: currently modified before AI map initialization.

- `prompts/`
  - role: prompt assets/AI workflow notes.
  - depends on: AI feature design.
  - used by: future AI agents and runtime logic if referenced.

## Module: Data import / maintenance

Purpose:

Load, sync, audit, or backfill operational data.

Related files:

- `import_master.js`
  - role: import master data.
  - depends on: data JSON and Firebase access.
  - used by: maintenance workflows.
  - notes: may write to database; do not run without explicit confirmation.

- `import_migrated_history_purchases.js`
  - role: import migrated purchase history.
  - depends on: migrated history data and Firebase access.
  - used by: migration/maintenance.
  - notes: may affect historical/POS data.

- `sync_master_to_app.js`
  - role: sync master data to app structures.
  - depends on: master data and app schema.
  - used by: maintenance workflows.

- `backfill_history_costs.js`
  - role: backfill costs into history.
  - depends on: history data and database access.
  - used by: one-off maintenance.
  - notes: do not run unless user explicitly approves data mutation.

## Cross-repo relations

- `xekho` owns POS/business/KDS/backend logic and may provide business/menu/order data.
- `webapp-menu` owns menu web app and online menu/admin UI; README warns feature overlap with `xekho`.
- `VIDEO AI TOOL` may generate media assets used by marketing workflows or `webapp-menu`/Facebook content.


## ESM Phase E4 relations

- `app/esm/ui/image-zoom.js`
  - role: Phase E4 importable image zoom/pan UI island.
  - depends on: DOM-like wrapper/image elements passed to `attach()`; no Store/DB/Firebase dependency.
  - used by: `app/esm/main.js`, classic `ImgZoom` wrappers in `app.js`, `scripts/verify-esm-ui-image-zoom.js`.
  - notes: preserves classic fallback logic in `app.js`; only delegates at call time when `window.XekhoApp.esm.ui.imageZoom` is ready.


## ESM Phase E5.1 relations

- `app/esm/ui/header-actions.js`
  - role: delegated click handler island for static header buttons.
  - depends on: browser `document` and existing global handlers (`openAIAssistant`, `openStockAlertPopup`, `hardReloadApp`, `handleLogout`).
  - used by: `app/esm/main.js`, `index.html` header buttons with `data-esm-header-action`, `scripts/verify-esm-header-actions.js`.
  - notes: removes inline handlers only from the four static header buttons; other inline handlers remain for later E5 islands.


## ESM Phase E5.2 relations

- `app/esm/ui/report-tabs.js`
  - role: delegated click handler island for static report tab buttons.
  - depends on: browser `document` and existing global `switchReportTab(tab, trigger)`.
  - used by: `app/esm/main.js`, `index.html` report buttons with `data-esm-report-tab`, `scripts/verify-esm-report-tabs.js`.
  - notes: removes inline handlers only from the four static report tab buttons; report filters and other report actions remain for later E5 islands.


## ESM Phase E5.3 relations

- `app/esm/ui/settings-tabs.js`
  - role: delegated click handler island for static settings tab buttons.
  - depends on: browser `document` and existing global `switchSettingsTab(tab, trigger)`.
  - used by: `app/esm/main.js`, `index.html` settings tab buttons with `data-esm-settings-tab`, `scripts/verify-esm-settings-tabs.js`.
  - notes: removes inline handlers only from the seven static settings tab buttons; settings forms/toggles/buttons remain delegated later because they touch config save/reset flows.


## ESM Phase E5.4 relations

- `app/esm/ui/report-date-controls.js`
  - role: delegated click handler island for report period and report date mode buttons.
  - depends on: browser `document`, existing global `setReportPeriod(period)`, and existing global `setDateMode(page, mode, trigger)`.
  - used by: `app/esm/main.js`, `index.html` report controls with `data-esm-report-period` / `data-esm-report-date-mode`, `scripts/verify-esm-report-date-controls.js`.
  - notes: removes inline handlers only from low-risk report date navigation; date input changes and report export/action buttons remain delegated later.


## ESM Phase E5.5 relations

- `app/esm/ui/inventory-tabs.js`
  - role: delegated click handler island for inventory tab buttons.
  - depends on: browser `document` and existing global `switchInvTab(tab, trigger)`.
  - used by: `app/esm/main.js`, `index.html` inventory tab buttons with `data-esm-inventory-tab`, `scripts/verify-esm-inventory-tabs.js`.
  - notes: removes inline handlers only from the five primary inventory tabs; the inventory more modal button remains inline for a later modal/action island.


## ESM Phase E5.6 relations

- `app/esm/ui/finance-period.js`
  - role: delegated click handler island for finance period buttons.
  - depends on: browser `document` and existing global `setFinancePeriod(period)`.
  - used by: `app/esm/main.js`, `index.html` finance period buttons with `data-esm-finance-period`, `scripts/verify-esm-finance-period.js`.
  - notes: removes inline handlers only from the five finance period buttons; finance rendering logic remains in the legacy global function.


## ESM Phase E5.7 relations

- `app/esm/ui/report-transaction-filters.js`
  - role: delegated change handler island for report transaction filter checkboxes.
  - depends on: browser `document` and existing global `setReportTransactionFilter(type, checked)`.
  - used by: `app/esm/main.js`, `index.html` report transaction filter inputs with `data-esm-report-transaction-filter`, `scripts/verify-esm-report-transaction-filters.js`.
  - notes: removes inline handlers from both duplicated report filter layouts; report filter state/rendering remains in the legacy global function.


## ESM Phase E5.8 relations

- `app/esm/ui/report-filter-controls.js`
  - role: delegated change/click handler island for report menu filters and reset buttons.
  - depends on: browser `document`, existing global `setReportMenuFilter(value)`, and existing global `resetReportFilters()`.
  - used by: `app/esm/main.js`, `index.html` report menu selects with `data-esm-report-menu-filter`, reset buttons with `data-esm-report-filter-reset`, `scripts/verify-esm-report-filter-controls.js`.
  - notes: report filter state/rendering remains in legacy global functions.


## ESM Phase E5.9 relations

- `app/esm/ui/modal-overlay-controls.js`
  - role: delegated click handler island for low-risk modal overlay self-dismiss, modal close buttons, and image-zoom modal controls.
  - depends on: browser `document`, modal element IDs in `index.html`, and existing global `ImgZoom` for reset/detach.
  - used by: `app/esm/main.js`, `index.html` elements with `data-esm-modal-self-dismiss`, `data-esm-modal-close`, `data-esm-modal-close-self`, and `data-esm-image-zoom-*`, `scripts/verify-esm-modal-overlay-controls.js`.
  - notes: modal business logic remains in legacy globals; this island only preserves existing close/dismiss behavior.


## ESM Phase E5.10 relations

- `app/esm/ui/render-refresh-controls.js`
  - role: delegated input/change/click handler island for low-risk render/filter refresh controls.
  - depends on: browser `document`, existing legacy globals `renderLedger`, `renderMediaRefinery`, `renderAttendanceManagement`, and `applyStocktakeHistoryFilter`.
  - used by: `app/esm/main.js`, `index.html` elements with `data-esm-render-refresh`, `scripts/verify-esm-render-refresh-controls.js`, and `scripts/verify-esm-entry.js`.
  - notes: allowlisted only; it does not expose submit/save/reset/POS/payment/import/export flows.


## ESM Phase E5.11 relations

- `app/esm/ui/admin-render-controls.js`
  - role: delegated click/input/change handler island for low-risk table/menu/inventory admin render controls.
  - depends on: browser `document`, existing legacy globals `renderTables`, `renderStockList`, `renderMenuAdmin`, `renderMenuItems`, and legacy `menuSearch`.
  - used by: `app/esm/main.js`, `index.html` elements with `data-esm-admin-render` / `data-esm-menu-items-search`, `scripts/verify-esm-admin-render-controls.js`, and `scripts/verify-esm-entry.js`.
  - notes: allowlisted only; it does not expose submit/save/delete/reset/import/export/POS/payment/media flows.
## 2026-06-03 bugfix relations

- POS order search: `index.html` `#order-search[data-esm-menu-items-search]` → `app/esm/ui/admin-render-controls.js` input delegation → `app.js#renderMenuItems()`, which now reads the live input value directly before filtering menu cards.
- Completed-order Telegram: Firestore/history payload → `functions/index.js#sendCompletedOrderTelegram()` → wrapper `normalizeCompletedOrderForTelegram(historyId, order)` → `functions/telegram/orders.js` normalization helpers → `buildTelegramCompletedOrderMessage()`. Wrappers must pass real arguments; resetting to `{}`/`[]` drops table/payment/items/totals.
## 2026-06-03 - Mobile table screen overflow/takeaway fix

- `app.js#renderTables()` owns the table-screen markup. It now excludes persisted `takeaway` table records from the physical table grid while preserving the dedicated `#table-card-takeaway` summary card and `openTakeaway()` flow.
- `style.css` owns `.table-grid`, `.table-card-wide`, and `.table-summary-*` mobile layout constraints. The grid uses `minmax(0, 1fr)` and summary rows use `min-width: 0` + ellipsis to prevent long labels/totals from overflowing the mobile viewport.
- `scripts/verify-mobile-table-grid.js` protects this relationship with deterministic source assertions.

## xekho_v2 Kho vận Cloud Function parity — 2026-06-14 20:06 +0700

- Legacy `db.js` / `app.js` KHO surfaces remain the schema reference for `xekho_v2` inventory writes.
- `xekho_v2/functions/src/inventory/inventoryOperationsCore.js` writes collection/field pairs compatible with this repo: `Inventory_Items.current_stock`/`stockQty`, `purchases.qty/unit/total/supplier/date`, `stocktakes.systemQty/countedQty/varianceQty`, `suppliers.name/contact`, and `Product_Catalog.cost`.
- No code in this legacy repo was changed for the bridge; this note is the cross-repo contract so future legacy edits do not unknowingly break xekho_v2 Kho vận operations.

## xekho_v2 item-scoped inventory actions — 2026-06-14 21:11 +0700

- Follow-up to the Function bridge: `xekho_v2` actions are now row-scoped, not global.
- Soft-delete/hide semantics map to common legacy-compatible flags (`active:false`, `deleted:true`, `hidden:true`) rather than hard deleting legacy collections.
- Legacy repo code was not changed.

## 2026-06-17 - Telegram owner assistant guard

- `functions/index.js#telegramWebhook` now resolves the assistant/report bot token with `getTelegramAssistantBotToken()` (`TELEGRAM_REPORT_BOT_TOKEN` -> `TELEGRAM_BOT_TOKEN`) so the open AI/revenue/report assistant path does not fall back to the kitchen-ready bot token.
- Owner-only assistant gates use `isTelegramOwnerContext()` with `TELEGRAM_OWNER_CHAT_ID` plus pinned owner Telegram ID `6496387732`.
- Guarded paths: open text AI/smart report, voice/audio AI, non-order photo OCR/import AI, and ads/revenue report commands.
- Operational Telegram order-photo draft context remains available for the configured group flow.
- `scripts/verify-telegram-owner-assistant-guard.js` protects the token separation and owner-only markers.

## 2026-06-17 - Gemini function-call thought signatures

- `functions/vertexAi.js#collectFunctionCalls()` returns the original model `part` with each parsed function call.
- `functions/index.js#runVertexToolLoop()` must append those original function-call parts before tool responses so Gemini/Vertex thought-signature metadata is preserved.
- `scripts/verify-gemini-function-call-thought-signature.js` guards against regressions.

## 2026-06-17 - Telegram smart report range parsing

- `functions/telegram/reports.js#parseTelegramSmartReportIntent()` parses `từ ... đến bây giờ` ranges and derives optional `itemName` only from text before the range marker. Range-only revenue queries such as `Doanh thu từ 18h hôm qua đến bây giờ?` must keep `itemName: ''`.
- `functions/index.js#askGeminiWithFirestoreTools()` prompt must use the exact shop name `Xe Khô Chữa Lành`.
- `scripts/verify-telegram-reports.js` and `scripts/verify-telegram-owner-assistant-guard.js` protect these cases.

## 2026-06-17 - Telegram open-ended Firebase assistant

- `functions/telegram/reports.js#parseTelegramSmartReportIntent()` now handles relative-date natural quantity questions such as `Hôm qua bán bao nhiêu bia?` and extracts `metric=quantity`, `itemName=bia`.
- `functions/index.js#tryAnswerTelegramSmartReportQuestion()` formats quantity answers from `report.itemSummary` returned by `executeReportQuery()`.
- `functions/index.js#isTelegramAssistantCapabilityQuestion()` and `#buildTelegramAssistantCapabilityResponse()` provide deterministic answers for assistant capability questions.
- Gemini prompt remains the fallback for non-fixed questions and must call read tools before returning data-backed numbers.

## 2026-06-17 - Telegram owner assistant proactive/menu/chart expansion

- `functions/index.js#tryAnswerTelegramProactiveOwnerInsight()` handles owner-analysis questions, compares current month-to-date vs comparable previous-month period, and attaches chart buttons.
- `functions/index.js#tryAnswerTelegramMenuDataQuestion()` reads `Product_Catalog` and `Inventory_Items` for menu price/image answers and sends stored dish images when present.
- `functions/index.js#createTelegramChartRequest()` stores chart payloads in `telegram_chart_requests`; `#handleTelegramChartCallback()` renders and sends charts when `chart_<id>` callback is pressed.
- `functions/telegram/send.js#sendTelegramPhotoBuffer()` uploads generated PNG buffers to Telegram via multipart `sendPhoto`.
- `scripts/verify-telegram-chart-menu-features.js` guards the proactive/menu/chart feature wiring.

## 2026-06-17 - Telegram webhook drift guard

- `scripts/check-telegram-webhook-target.js` checks the deployed Telegram bot webhook is pointed at the XE KHO `telegramwebhook` Cloud Run service, not a foreign service such as `aidirectorbrieftelegramwebhook`, and fails on Telegram `last_error_message`.
- `scripts/verify-telegram-owner-assistant-regressions.js` guards deterministic routing for owner questions seen in the incident: month revenue, month order summary, and menu price lookup before Gemini fallback.
- Incident notes live in `docs/ai-map/TASK_LOGS/2026-06-17-telegram-webhook-drift-chatbot-silence.md`.

## 2026-06-17 - Telegram BigQuery reporting + month revenue fix

- `functions/index.js#getBigQueryRuntimeConfig()` exposes optional read-only BigQuery runtime env config to deterministic reports and Gemini tool calls.
- `functions/firestoreMegaTools.js#executeBigQueryReportQuery()` queries BigQuery with Standard SQL SELECT summaries and no write operations.
- `functions/geminiTools.js` declares `truy_van_bigquery_pos` for Gemini fallback data questions.
- `scripts/verify-telegram-bigquery-reporting.js` verifies `doanh thu tháng này?` parsing and BigQuery read-only wiring.

## 2026-06-17 - Telegram month revenue zero regression

- `functions/index.js#tryAnswerTelegramSmartReportQuestion()` uses Firestore/POS-first reports for direct owner questions such as `Doanh thu tháng này?`.
- `functions/firestoreMegaTools.js#executeReportQuery()` requires explicit `allowEmptyFirestoreBigQueryFallback` before BigQuery can replace an empty Firestore report.
- `scripts/verify-telegram-bigquery-reporting.js` prevents future `preferBigQuery: true` regressions in direct Telegram report paths.

## 2026-06-17 - Telegram chart callback prefix regression

- `functions/index.js#parseTelegramChartCallbackData()` normalizes chart callback payloads from current and legacy inline buttons.
- `functions/index.js#telegramWebhook` routes parsed chart callbacks to `handleTelegramChartCallback()` before generic unknown callback handling.
- `scripts/verify-telegram-chart-menu-features.js` asserts chart callback parser coverage.
## EchoEar kitchen-ready notifier

- `functions/index.js` exports the `kitchenDeviceFeed` HTTP endpoint for device polling.
- `functions/kitchenDeviceFeed.js` contains the read-only Firestore `orders` -> ready item feed builder.
- `scripts/verify-kitchen-device-feed.js` checks endpoint security markers and feed filtering.
- Firmware lives outside this repo at `/home/longnick/echoear/xekho_kitchen_notifier`.
