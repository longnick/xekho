# Code Map

## Main modules

### POS frontend

- `index.html`: main POS page. Obsolete top-level Menu, AI Insights, and Media pages/navigation entries were removed in the 2026-06-03 deploy cleanup; stale markers for those pages now scan to 0.
- `app.js`: main POS application logic and UI orchestration. It now explicitly denies stale navigation to removed `menu`, `insights`, and `media` pages while preserving shared menu CRUD/backend helpers. `renderMenuItems()` reads `#order-search` directly so the POS chọn món search stays in sync with ESM delegated input events.
- `app/esm/main.js`: ESM Phase E1/E2/E3 compatibility harness. Loaded as a browser module after the existing classic runtime; imports DOM/format/date/Excel/staff leaf facades plus DOM/Store/DB runtime adapters, sets `window.XekhoApp.esm.harness`, marks `window.XekhoApp.esm.facades.*`, installs `window.XekhoApp.esm.adapters.*`, and dispatches `xekho:esm-ready` without importing the `app.js` monolith.
- `app/esm/utils/dom.js`: ESM Phase E2 DOM facade. Exports `escapeHtml()` and `installGlobalDomUtils()` while preserving `window.XekhoApp.utils.dom.escapeHtml()` compatibility.
- `app/esm/utils/format.js`: ESM Phase E2 formatter facade. Exports formatter helpers and `installGlobalFormatUtils()` while preserving `window.XekhoApp.utils.format.*` and legacy globals.
- `app/esm/utils/date.js`: ESM Phase E2 date facade. Exports date helpers and `installGlobalDateUtils()` while preserving `window.XekhoApp.utils.date.*` and legacy date globals.
- `app/esm/utils/excel.js`: ESM Phase E2 Excel facade. Exports worksheet formatting helpers and `installGlobalExcelUtils()` while preserving `window.XekhoApp.utils.excel.*` and legacy Excel globals.
- `app/esm/auth/staff.js`: ESM Phase E2 staff/auth facade. Exports pure staff helpers and `installGlobalStaffAuth()` while preserving `window.XekhoApp.auth.*`.
- `app/esm/adapters/dom.js`: ESM Phase E3 DOM runtime adapter. Exports query/event helpers and installs `window.XekhoApp.esm.adapters.dom`.
- `app/esm/adapters/store.js`: ESM Phase E3 Store/appState runtime adapter. Exports read-only accessors and state snapshot helpers; installs `window.XekhoApp.esm.adapters.store`.
- `app/esm/adapters/db.js`: ESM Phase E3 DB readiness adapter. Exports `waitForDB()`, `isDBReady()`, `getDBSection()`, and `callDBMethod()` without importing Firebase directly; installs `window.XekhoApp.esm.adapters.db`.
- `app/esm/README.md`: ESM migration guardrails, completed facade/adapter list, and next UI-island candidates.
- `scripts/verify-esm-entry.js`: Node VM verification for ESM harness load order, readiness marker, all E2/E3/E4 markers, and event dispatch behavior.
- `scripts/verify-esm-dom-utils.js`: Native dynamic-import smoke test for the DOM ESM facade and global installer.
- `scripts/verify-esm-leaf-facades.js`: Native dynamic-import smoke test for format/date/Excel/staff ESM facades and installers.
- `scripts/verify-esm-runtime-adapters.js`: Native dynamic-import smoke test for DOM/Store/DB ESM runtime adapters.
- `db.js`: Firebase/Firestore wrapper and data access helper; Menu add/update maps selling prices to `sell_price` and legacy `price`.
- `offlineBackup.js`: Sprint 1 POS offline backup queue foundation. Provides IndexedDB-backed pending order action storage plus in-memory storage for verification; Sprint 11 also accepts explicit `remove_item` actions.
- `offlineSync.js`: Sprint 2 adapter-based offline sync engine foundation. Syncs pending/failed queue actions through an injected adapter with idempotency by `clientOrderId`, retry/backoff, and single-flight lock.
- `offlineFirestoreAdapter.js`: Sprint 3 Firestore/POS adapter foundation. Bridges `offlineSync.js` actions to injected Firestore/POS operations, maps `close_order` to completed-history payloads, applies explicit `remove_item` actions through `removeItem`, and checks existing `history`/`orders`/`online_orders` by `clientOrderId`; no production writes by itself.
- `offlineRuntime.js`: Sprint 4 non-invasive browser runtime. Initializes offline queue/status as `window.XekhoOfflineBackupRuntime`; sync is disabled by default and live POS order flow is not wrapped yet.
- `offlineStatusUI.js`: Sprint 5 visible status badge/panel. Injects a read-only header badge and popup panel using runtime `getSummary()`; does not enable sync or wrap POS order flow.
- `offlineOrderFallback.js`: Sprint 6 disabled/dry-run POS order fallback wrapper, extended in Sprint 11 with a stable localStorage-backed device ID helper and explicit `remove_item` payloads for `Orders.removeItem`. Builds payloads for open/add/change/remove/update/close/cancel and can capture offline/server failures only when explicitly installed outside the safe disabled default.
- `offlineOrderFallbackDevTools.js`: Sprint 7 browser dry-run dev helpers, extended in Sprint 9/10/11 with safe mobile payload review reports, validation warnings, stable device IDs, and safe `remove_item` review coverage; Sprint 12 adds an explicit guarded queue-write helper (`enableQueueWriteGuarded`) requiring confirmation text while keeping auto sync disabled. Exposes `window.XekhoOfflineOrderFallbackDevTools` with explicit manual methods to enable dry-run wrapping, simulate failures, inspect captured actions, build/print payload review reports, guarded queue-write wrapping, and disable wrapping; no queue writes by default.
- `app/utils/dom.js`: Safe refactor Sprint 1 compatibility utility module. Exposes `window.XekhoApp.utils.dom.escapeHtml()` through an IIFE/global namespace so `app.js` can delegate HTML escaping without changing the existing non-module script loading model.
- `app/utils/format.js`: Safe refactor Sprint 3 compatibility formatter module. Exposes `window.XekhoApp.utils.format` helpers (`compactNumber`, `currency`, `date`, `time`, `dateTime`, `todayKey`) while `store.js` keeps the legacy global `fmt`/`fmtFull`/date wrappers and delegates when the utility is loaded.
- `scripts/verify-dom-utils.js`: Node VM verification for `app/utils/dom.js`; checks UTF-8-safe Vietnamese text passthrough, nullish inputs, numeric inputs, and escaping for `&`, `<`, `>`, double quotes, and apostrophes.
- `scripts/verify-format-utils.js`: Node VM verification for `app/utils/format.js`; checks compact/currency/date helper behavior and confirms `store.js` contains compatibility delegation markers.
- `scripts/verify-menu-price-save.js`: Regression verifier for `Kho` → `Quản lý món` price saves; checks Vietnamese thousands parsing (`17.500` → `17500`), existing-item recipe gating, and DB `sell_price`/`price` mapping.
- `scripts/verify-offline-runtime.js`: Sprint 19-aligned runtime verification; checks current `offlineRuntime.js` version marker plus disabled-sync and enabled-sync memory-flow behavior.
- `scripts/verify-offline-backup.js`: Node verification script for `offlineBackup.js` using in-memory storage.
- `scripts/verify-offline-sync.js`: Node verification script for `offlineSync.js` using memory backup + memory sync adapter.
- `scripts/verify-offline-firestore-adapter.js`: Node verification script for `offlineFirestoreAdapter.js` using memory Firestore operations; does not touch live Firebase.
- `scripts/verify-offline-status-ui.js`: Node verification script for `offlineStatusUI.js`; verifies badge/panel text and state formatting.
- `scripts/verify-offline-order-fallback.js`: Node verification script for `offlineOrderFallback.js`; verifies payload shape, stable localStorage/fallback device IDs, explicit `remove_item` semantics, disabled mode, dry-run capture, and explicit enabled queue save using memory storage.
- `scripts/verify-offline-order-fallback-devtools.js`: Node verification script for `offlineOrderFallbackDevTools.js`; verifies explicit dry-run wrapping, offline/server-only capture, unwrap behavior, simulated failure payloads, stable payload-review device IDs, safe `remove_item` reports, and Sprint 12 guarded queue-write confirmation/queue-save behavior without enabling auto sync.
- `data.js`: local/master data helpers where present.
- `style.css`: POS/KDS/global styling.

### Kitchen Display System

- `kitchen.html`: kitchen-facing UI.
- `KDS_PLAN.md`, `KITCHEN_GUIDE.md`: KDS design and operator documentation.
- `firebase-messaging-sw.js`: FCM service worker for browser notifications.

### AI assistant / automation

- `ai-core.js`: AI core logic.
- `ai-actions.js`: AI action handlers.
- `ai-ui.js`: AI UI layer.
- `DeepSeekRouter.js`: router/integration layer for DeepSeek-like model calls.
- `NLPEngine.js`: NLP engine integration.
- `functions/geminiTools.js`: Gemini/function-calling tools.
- `functions/vertexAi.js`: Vertex AI integration.
- `functions/media-refinery.js`: media/creative workflow helper file currently untracked at map initialization.

### Backend / Firebase Functions

- `functions/index.js`: main Firebase Cloud Functions entry point. Completed-order Telegram wrappers delegate to `functions/telegram/orders.js` while preserving real `order`/`items` arguments for table/payment/item/total normalization.
- `functions/firestoreMegaTools.js`: Firestore utility/tool functions.
- `functions/createAdminUser.js`: admin user utility.
- `firestore.rules`: Firestore security rules.
- `firebase.json`, `.firebaserc`: Firebase project/deploy configuration.

### Import / maintenance scripts

- `import_master.js`: imports master data.
- `import_migrated_history_purchases.js`: imports migrated purchase history.
- `sync_master_to_app.js`: syncs master data into app structures.
- `audit_cleanup_firebase.js`: Firebase cleanup/audit helper.
- `backfill_history_costs.js`: history cost backfill script; do not run without explicit user approval.
- `loadServiceAccount.js`: service-account loading helper; do not expose secret contents.

### Documentation / planning

- `README.md`: primary repo overview and setup notes.
- `DEPLOYMENT_GUIDE.md`: deploy instructions.
- `TECH_AUDIT.md`, `OWNERSHIP_MAP.md`, release/audit docs: current ownership and release readiness notes.
- `docs/ai-map/`: AI-readable project map and task logs.

## Entry points

- Browser/POS: `index.html` loads root JS/CSS modules.
- Kitchen: `kitchen.html`.
- Local server: `server.js`.
- Firebase Functions: `functions/index.js`.
- Tests: `npm test` / Jest.

## API routes / Cloud Functions

Source: `functions/index.js` (~5,670 lines, 33 exports). Phase 2 extracted 38+ functions into backend modules.

### Exported Cloud Functions (33)

#### Orders & Payments (2)
- `approveOnlineOrder` (onCall, L2655) — approve pending online order from POS or Telegram
- `rejectOnlineOrder` (onCall, L2679) — reject pending online order

#### Telegram Bot Webhook (1)
- `telegramWebhook` (onRequest, L3429) — main Telegram bot webhook. Handles:
  - **Callback queries**: online order approve/reject (`onl_order_ok_`, `onl_order_no_`), order draft confirm/edit/cancel (`odf_confirm_`, `odf_edit_`, `odf_cancel_`), customer order approve/reject (`cw_order_ok_`, `cw_order_no_`), customer service ack/done (`cw_service_ack_`, `cw_service_done_`), customer payment cash/bank/cancel/ack (`cw_payment_cash_`, `cw_payment_bank_`, `cw_payment_cancel_`, `cw_payment_ack_`), generic confirm/cancel
  - **Photo messages**: order slip OCR → `createTelegramOrderDraftFromPhoto()`, or general image → `askGeminiVisionForImport()`
  - **Voice/audio**: `askGeminiWithVoice()` with file_id download
  - **Text messages**: smart report Q&A (`tryAnswerTelegramSmartReportQuestion`), then AI tool loop (`askGeminiWithFirestoreTools`)
  - **Commands**: `/fix` for order draft editing

#### Telegram Reports & Notifications (4)
- `testAdsReportTelegram` (onRequest, L3295) — test ads report
- `adsRevenueReportApi` (onRequest, L3331) — ads revenue API
- `testPaymentBillTelegram` (onRequest, L3352) — test payment bill
- `testCompletedOrderTelegram` (onRequest, L3386) — test completed order

#### Scheduled Jobs (1)
- `scheduledTelegramReport` (onSchedule, L5625) — every 5 minutes, checks `settings/telegram_report` for send time, builds daily report with revenue/expense/target data, sends to configured Telegram chat IDs, updates last sent range key to prevent duplicates

#### Firestore Triggers — Menu Sync (3)
- `syncPublicMenuOnCatalogCreate` (onDocumentCreated, L4125) — `Product_Catalog/{productId}` → syncs to `public_menu`
- `syncPublicMenuOnCatalogUpdate` (onDocumentUpdated, L4135) — `Product_Catalog/{productId}` → syncs to `public_menu`
- `syncPublicMenuOnCatalogDelete` (onDocumentDeleted, L4145) — `Product_Catalog/{productId}` → deletes from `public_menu`

#### Firestore Triggers — Order Requests (2)
- `onOrderRequestCreated` (onDocumentCreated, L4154) — triggers on new `order_requests` doc, sends Telegram notification
- `onOrderRequestApproved` (onDocumentUpdated, L4185) — triggers when `order_requests` status changes to `approved`, creates POS order

#### Firestore Triggers — Order Status Sync (2)
- `syncOrderRequestStatusFromPosOrder` (onDocumentUpdated, L4229) — syncs POS order status back to `order_requests`
- `syncOnlineOrderStatusFromPosOrder` (onDocumentUpdated, L4255) — syncs POS order status back to `online_orders`

#### Firestore Triggers — Customer Workflow (4)
- `onPaymentRequestCreated` (onDocumentCreated, L4304) — triggers on new `payment_requests`, sends Telegram notification
- `onServiceRequestCreated` (onDocumentCreated, L4344) — triggers on new `service_requests`, sends Telegram notification
- `onHistoryFinalizeCustomerOrderRequests` (onDocumentCreated, L4374) — finalizes customer order requests when history doc created
- `onHistoryOrderCancelled` (onDocumentUpdated, L4386) — handles cancelled orders, sends Telegram notification

#### Firestore Triggers — Kitchen (4)
- `onKitchenNotificationCreated` (onDocumentCreated, L4429) — handles new kitchen notifications, processes food-ready logic
- `sendPushOnKitchenNotif` (onDocumentCreated, L4508) — sends FCM push notification on new kitchen notification
- `telegramOnKitchenOrderCreated` (onDocumentCreated, L4654) — sends Telegram message for new kitchen orders
- `telegramOnKitchenOrderUpdated` (onDocumentUpdated, L4679) — sends Telegram message for updated kitchen orders

#### Firestore Triggers — Completed Orders (1)
- `telegramOnCompletedOrderCreated` (onDocumentCreated, L4704) — sends Telegram message for completed orders

#### AI/Media (7)
- `adminProbeVertex` (onRequest, L4771) — Vertex AI probe/diagnostics
- `apiVoice` (onRequest, L4054) — voice processing endpoint
- `mediaRefineryApi` (onRequest, L7335 in prior count) — media refinery creative workflow
- `aiStatus` (onRequest, L5399) — AI status check
- `aiRouter` (onRequest, L5424) — AI routing endpoint for tool-calling loop
- `adminGenerateMenuImage` (onRequest, L5472) — AI menu image generation (Vertex Imagen)
- `adminGenerateMenuDescription` (onRequest, L5539) — AI menu description generation

#### Admin/Maintenance (2)
- `cleanupDuplicateHistory` (onRequest, L3977) — cleanup duplicate history orders, requires admin auth, 1GiB memory
- `adminUploadMenuImage` (onRequest, L5122) — upload menu image
- `purchaseOcr` (onRequest, L5378) — purchase receipt OCR processing

### Key helper function groups (not exported)

**Pure utilities (safe to extract):**
- `chunkArray` (L42) — delegates to `functions/utils/text.chunkArray`
- `formatCurrencyVi` (L573) — Vietnamese currency formatting
- `formatQtyVi` (L577) — quantity formatting
- `escapeTelegramHtml` (L509) — HTML escaping for Telegram
- `escapeXml` (L1464) — XML escaping
- `normalizeTelegramText` (L528) — text normalization
- `normalizeTelegramTextPreserveLines` (L532) — line-preserving normalization
- `fixTelegramMojibake` (L528) — mojibake repair
- `scoreTelegramTextQuality` (L516) — text quality scoring

**Telegram bot message sending (infrastructure):**
- `sendTelegramHtmlMessage` (L1297)
- `sendTelegramTextMessage` (L1328)
- `sendTelegramActionConfirmation` (L1358)
- `sendTelegramInlineMessage` (L1389)
- `sendTelegramPhotoMessage` (L1428)
- `answerTelegramCallback` (L1473)
- `editTelegramMessage` (L1486)
- `editTelegramInlineMessage` (L1500)

**Kitchen notifications:**
- `kitchenNotifDocRef` (L260), `buildKitchenNotifMessage` (L264)
- `parseKitchenItemSummary` (L301), `buildTelegramFoodReadyMessage` (L323)
- `isKitchenOrderItemForTelegram` (L350), `getKitchenOrderItemKey` (L362)
- `getNewPendingKitchenItems` (L366), `buildTelegramNewKitchenOrderMessage` (L379)
- `sendKitchenNewOrderTelegram` (L451)

**AI/Vertex (config-dependent):**
- `getAiDeps` (L31), `getVertexRuntimeConfig` (L132)
- `buildVertexTextModels` (L156), `buildVertexImageModels` (L166)
- `runVertexToolLoop` (L175)

**Telegram report/smart features (lines 573-1285):**
- ~40 functions for report generation, smart Q&A, inventory queries, ads insights

---

## Extracted Module Inventory

All extracted modules use an IIFE/global namespace pattern (frontend: `window.XekhoApp.*`) or CommonJS `module.exports` (backend). Stateful backend dependencies stay wired from `functions/index.js`; for example `functions/telegram/ads.js` receives Firestore/API loaders through `setAdsRevenueDataDependencies()` rather than reading implicit globals.

### Frontend Modules (19 files)

#### `app/utils/` (9 files)

| File | Namespace | Exports | Key functions |
|------|-----------|---------|---------------|
| `format.js` | `XekhoApp.utils.format` | 6 | `compactNumber`, `currency`, `date`, `time`, `dateTime`, `todayKey` |
| `dom.js` | `XekhoApp.utils.dom` | 1 | `escapeHtml` |
| `excel.js` | `XekhoApp.utils.excel` | 7 | `excelThinBorder`, `excelColLetter`, `excelFmtVnInt`, `applyReportTitleBlock`, `paintExcelHeaderRow`, `paintExcelTotalRow`, `setRowBorders` |
| `date.js` | `XekhoApp.utils.date` | 3 | `formatLocalDateKey`, `getWeekStartKey`, `resolvePeriodDateRangePure` |
| `print.js` | `XekhoApp.utils.print` | 1 | `buildStandaloneBillPrintHtml` |
| `storage.js` | `XekhoApp.utils.storage` | 6 | `formatBytes`, `getLocalStorageUsageBytes`, `blobToBase64`, `normalizeGoogleScriptWebAppUrl`, `isGoogleAppsScriptWebAppUrl`, `uploadFileToGoogleDriveByEndpoint` |
| `parser.js` | `XekhoApp.utils.parser` | 5 | `parsePurchaseText`, `parsePurchaseJson`, `getKitchenRoutingLabel`, `tokenSimilarity`, `getMenuItemImageUrl` |
| `categorize.js` | `XekhoApp.utils.categorize` | 5 | `normalizeExpenseCategoryLabel`, `detectAdsExpensePlatform`, `isAdsExpenseEntry`, `mediaRefineryStatusClass`, `countInclusiveReportDays` |
| `fixedcost.js` | `XekhoApp.utils.fixedcost` | 2 | `getFixedCostProfileForReports`, `_getPayrollProfile` |

#### `app/ui/` (3 files)

| File | Namespace | Exports | Key functions |
|------|-----------|---------|---------------|
| `toast.js` | `XekhoApp.ui` | 2 | `toast` (showToast), `repairVietnameseText` |
| `theme.js` | `XekhoApp.ui` | 1 | `applyTheme` |
| `modal.js` | `XekhoApp.ui` | 3 | `openModal`, `closeModal`, `isModalOpen` |

#### `app/auth/` (1 file)

| File | Namespace | Exports | Key functions |
|------|-----------|---------|---------------|
| `staff.js` | `XekhoApp.auth` | 5 | `normalizeStaffRole`, `normalizeStaffStatus`, `getStaffIdentity`, `buildCurrentUserFromStaff`, `validatePinFormat` |

#### `app/order/` (1 file)

| File | Namespace | Exports | Key functions |
|------|-----------|---------|---------------|
| `helpers.js` | `XekhoApp.order` | 22 | `uid`, `isCompletedHistoryOrderForUi`, `isVisibleHistoryOrderForUi`, `normalizeViKey`, `inferInventoryItemType`, `normalizeInventoryItemModel`, `inferMenuItemType`, `findLinkedInventoryIdForMenuItem`, `normalizeUnitText`, `_isKitchenSkippedItem`, `createKitchenLineItemId`, `getKitchenLineItemId`, `isKitchenFinalStatus`, `canToggleServedStatus`, `getCartItemStatusLabel`, `normalizeKitchenOrderItem`, `_mapOnlineOrderPayMethod`, `_buildOnlineOrderBillNo`, `_getOnlineOrderItemQty`, `_getOnlineOrderItemUnitPrice`, `_calculateOnlineOrderTotal`, `_resolveOnlineOrderDocId`, `_resolveDishCostPerUnit`, `normalizeMenuItemModel` |

#### `app/report/` (4 files)

| File | Namespace | Exports | Key functions |
|------|-----------|---------|---------------|
| `helpers.js` | `XekhoApp.report` | 6 | `getReportMenuIngredientKeys`, `doesOrderMatchReportMenuItem`, `doesPurchaseMatchReportMenuItem`, `doesExpenseMatchReportMenuItem`, `getIngredientMergeSuggestions`, `getDailyRevenueSnapshotsInRange` |
| `ads.js` | `XekhoApp.report` | 1 | `buildAdsRevenueReportHtml` |
| `expense.js` | `XekhoApp.report` | 1 | `buildOperationalExpenseBreakdown` |
| `excel.js` | `XekhoApp.report` | 1 | `exportReportExcel` |

#### `app/modules/` (1 file)

| File | Namespace | Notes |
|------|-----------|-------|
| `media-refinery/index.js` | — | Media/creative workflow frontend module |

### Backend Modules (8 files)

#### `functions/utils/` (2 files)

| File | Exports | Key functions |
|------|---------|---------------|
| `text.js` | 11 | `chunkArray`, `escapeTelegramHtml`, `escapeXml`, `scoreTelegramTextQuality`, `fixTelegramMojibake`, `normalizeTelegramText`, `normalizeTelegramTextPreserveLines`, `formatCurrencyVi`, `formatQtyVi`, `getTelegramProductDisplayName`, `shouldPreferTelegramCatalogName` |
| `general.js` | 6 | `json`, `wrapSvgText`, `stripDataUrlBase64`, `extractFirstJson`, `mapToolActionType`, `buildAiRouterPendingResponse` |

#### `functions/telegram/` (6 files)

| File | Exports | Key functions |
|------|---------|---------------|
| `send.js` | 9 | `sendTelegramHtmlMessage`, `sendTelegramTextMessage`, `sendTelegramActionConfirmation`, `sendTelegramInlineMessage`, `sendTelegramPhotoMessage`, `answerTelegramCallback`, `editTelegramMessage`, `editTelegramInlineMessage`, `getTelegramPhotoAsBase64` |
| `kitchen.js` | 10 | `normalizeTelegramTableLabel`, `buildKitchenNotifMessage`, `parseKitchenItemSummary`, `buildTelegramFoodReadyMessage`, `isKitchenOrderItemForTelegram`, `getKitchenOrderItemKey`, `getNewPendingKitchenItems`, `buildTelegramNewKitchenOrderMessage`, `buildTelegramFoodReadyMessageClean`, `buildTelegramNewKitchenOrderMessageClean` |
| `reports.js` | 18 | `getVietnamDateParts`, `normalizeTelegramSmartReportText`, `normalizeTelegramWildcardText`, `buildTelegramWildcardRegex`, `parseTelegramLooseDateTime`, `getInclusiveVietnamDateCount`, `formatAchievementPercent`, `buildMorningRevenueMood`, `coerceHistoryDate`, `formatTelegramDateTimeVi`, `getTelegramPayMethodLabel`, `isTelegramBankPayMethod`, `formatTelegramSmartRangeLabel`, `parseTelegramSmartReportIntent`, `DEFAULT_TELEGRAM_REPORT_SETTINGS`, `getVietnamBusinessReportRange`, `getTelegramReportSettings`, `getTelegramReportRangeKey`, `shouldSendTelegramReportNow` |
| `orders.js` | 11 | `getHistoryBusinessId`, `getHistoryVersionDate`, `getHistoryVersionTime`, `isCompletedHistoryOrderForReports`, `isVisibleHistoryOrderForReports`, `extractTelegramCashierName`, `pickFirstPresentValue`, `toTelegramMoneyNumber`, `normalizeCompletedOrderItems`, `calculateCompletedOrderSubtotal`, `normalizeCompletedOrderForTelegram` |
| `online-orders.js` | 9 | `formatTelegramBillItemsClean`, `buildPosItemFromRequest`, `aggregateRequestStatusFromItems`, `buildPosItemFromOnlineOrder`, `buildOnlineOrderTelegramStatusLabel`, `buildOnlineOrderTelegramSummary`, `buildOnlineOrderTelegramStatusLabelClean`, `buildOnlineOrderTelegramSummaryClean`, `mapOnlineOrderStatusFromPosItems` |
| `ads.js` | 23 | `getVietnamDayRange`, `normalizeVi`, `uniqueTokens`, `parseTimeEntity`, `buildDateRange`, `formatPercentVi`, `formatMultipleVi`, `getVietnamDateYmd`, `formatVietnamDateDisplayFromYmd`, `buildVietnamAbsoluteDayRangeFromYmd`, `buildVietnamAbsoluteRangeFromYmds`, `parseExplicitDateInput`, `getVietnamYesterdayYmd`, `buildAdsDateRangeFromText`, `buildAdsChannelMetrics`, `sumAdsChannels`, `formatIntVi`, `buildAdsChannelLines`, `buildAdsInsightLines`, `buildAdsRevenueDetailedMessage`, `buildAdsRevenueTelegramMessage`, `buildAdsRevenueTelegramData`, `setAdsRevenueDataDependencies` |

---

## Script Load Order

Source: `index.html` — all scripts loaded in `<body>` at bottom, non-module (IIFE/global namespace).

```
 1. CDN: chart.js@4.4.0 (UMD)
 2. CDN: exceljs@4.4.0 (UMD)
 3. data.js                    — local/master data helpers
 4. app/utils/format.js        — XekhoApp.utils.format (compactNumber, currency, date, time, dateTime, todayKey)
 5. store.js                   — legacy global store; delegates to format.js when loaded
 6. db.js                      — Firebase/Firestore data layer (type="module", loads asynchronously)
 7. app/utils/dom.js           — XekhoApp.utils.dom.escapeHtml
 8. app/ui/toast.js            — XekhoApp.ui.toast, repairVietnameseText
 9. app/ui/theme.js            — XekhoApp.ui.applyTheme
10. app/ui/modal.js            — XekhoApp.ui.openModal, closeModal, isModalOpen
11. app/auth/staff.js          — XekhoApp.auth.* (normalizeStaffRole, getStaffIdentity, buildCurrentUserFromStaff, validatePinFormat, getCurrentOrderActorMetaFromUser)
12. app/order/helpers.js       — XekhoApp.order.* (22 helpers for orders, kitchen, online orders)
13. app/utils/excel.js         — XekhoApp.utils.excel (Excel formatting helpers)
14. app/utils/date.js          — XekhoApp.utils.date (formatLocalDateKey, resolvePeriodDateRangePure)
15. app/utils/print.js         — XekhoApp.utils.print.buildStandaloneBillPrintHtml
16. app/utils/storage.js       — XekhoApp.utils.storage (formatBytes, blobToBase64, uploadFileToGoogleDriveByEndpoint)
17. app/utils/parser.js        — XekhoApp.utils.parser (parsePurchaseText, tokenSimilarity)
18. app/utils/categorize.js    — XekhoApp.utils.categorize (normalizeExpenseCategoryLabel, etc.)
19. app/report/helpers.js      — XekhoApp.report (getReportMenuIngredientKeys, doesOrderMatchReportMenuItem, etc.)
20. app/report/ads.js          — XekhoApp.report.buildAdsRevenueReportHtml
21. app/report/expense.js      — XekhoApp.report.buildOperationalExpenseBreakdown
22. app/report/excel.js        — XekhoApp.report.exportReportExcel
23. app/utils/fixedcost.js     — XekhoApp.utils.fixedcost (getFixedCostProfileForReports)
24. ai-core.js                 — AI core logic
25. ai-actions.js              — AI action handlers
26. ai-ui.js                   — AI UI layer
27. app.js                     — main POS application (must load before inline scripts)
28. offlineBackup.js           — offline queue (IndexedDB storage)
29. offlineSync.js             — offline sync engine
30. offlineFirestoreAdapter.js — offline Firestore adapter bridge
31. offlineRuntime.js          — offline runtime init
32. offlineStatusUI.js         — offline status badge/panel UI
33. offlineOrderFallback.js    — offline order fallback wrapper
34. offlineOrderFallbackDevTools.js — offline dev tools
35. <inline script>            — saveAndBack(), clearTableLegacyFallback(), etc.
```

**Load order constraints:**
- `format.js` must load before `store.js` (delegation)
- `db.js` is `type="module"` and loads asynchronously
- `dom.js` must load before `app.js` (used for HTML escaping)
- `toast.js` / `theme.js` / `modal.js` must load before `app.js` (UI dependencies)
- `app/order/helpers.js` must load before `app.js` (order helpers used by main app)
- All `app/report/*` must load before `app.js` (report rendering)
- `ai-core.js`, `ai-actions.js`, `ai-ui.js` must load before `app.js`
- `offlineBackup.js` → `offlineSync.js` → `offlineFirestoreAdapter.js` → `offlineRuntime.js` must load in order (dependency chain)
- `offlineStatusUI.js`, `offlineOrderFallback.js`, `offlineOrderFallbackDevTools.js` depend on the above chain

---

## Data Flows

### 1. POS Order → Kitchen → Telegram

```
User taps item in POS UI
  → app.js addCartItem() → Orders.open()/add()/update() (Firestore write to `orders/{tableId}`)
  → Firestore trigger: onKitchenNotificationCreated (L4429)
    → processes kitchen items, builds kitchen notification doc in `kitchen_notifications`
  → Firestore trigger: sendPushOnKitchenNotif (L4508)
    → sends FCM push notification to KDS service worker
  → Firestore trigger: telegramOnKitchenOrderCreated (L4654)
    → buildTelegramNewKitchenOrderMessageClean()
    → sendTelegramInlineMessage() to KITCHEN_NEW_ORDER_TELEGRAM_CHAT_ID
  → kitchen.html KDS receives FCM notification, updates UI
```

### 2. Kitchen Item Ready → Telegram Food-Ready

```
KDS marks item as "ready" (status update in `kitchen_notifications`)
  → Firestore trigger: telegramOnKitchenOrderUpdated (L4679)
    → buildTelegramFoodReadyMessageClean()
    → sendTelegramHtmlMessage() to TELEGRAM_KITCHEN_READY_CHAT_ID
  → Staff picks up item → marks "served"
```

### 3. POS Close Order → Completed Order Telegram

```
User closes order (close_order in POS)
  → Firestore write to `history/{docId}`
  → Firestore trigger: telegramOnCompletedOrderCreated (L4704)
    → normalizeCompletedOrderForTelegram()
    → sendTelegramHtmlMessage() to TELEGRAM_COMPLETED_ORDER_CHAT_ID
  → Firestore trigger: onHistoryFinalizeCustomerOrderRequests (L4374)
    → finalizes associated customer order requests
```

### 4. Online Order → Telegram Approval → POS Sync

```
External system writes to `online_orders/{orderId}` (status: "pending")
  → Owner receives Telegram notification with approve/reject buttons
  → Owner taps "Approve" callback button
    → telegramWebhook callback: onl_order_ok_{orderId}
    → approveOnlineOrderInternal()
    → creates POS order, updates online_order status to "approved"
  → Firestore trigger: syncOnlineOrderStatusFromPosOrder (L4255)
    → syncs POS order progress back to online_orders status
```

### 5. Telegram Bot Message → AI Tool Loop → Firestore Actions

```
User sends text/photo/voice to Telegram bot
  → telegramWebhook receives update
  → Text: tryAnswerTelegramSmartReportQuestion() first (smart report Q&A)
    → If not a report question: askGeminiWithFirestoreTools() (Vertex AI + Gemini tool loop)
  → Photo: getTelegramPhotoAsBase64() → askGeminiVisionForImport() (image analysis)
    → If order context: createTelegramOrderDraftFromPhoto() → order slip OCR
  → Voice: getTelegramPhotoAsBase64() equivalent → askGeminiWithVoice()
  → Result: geminiResult.text + pendingActions[]
    → If pendingActions: sendTelegramActionConfirmation() with confirm/cancel buttons
    → Otherwise: sendTelegramTextMessage() with answer
```

### 6. Menu Catalog → Public Menu Sync

```
Admin updates Product_Catalog in POS
  → Firestore trigger: syncPublicMenuOnCatalogCreate/Update/Delete (L4125-4152)
    → syncPublicMenuProjection() writes to `public_menu/{productId}`
    → Delete removes from `public_menu`
  → Public menu available for online ordering / customer-facing pages
```

### 7. Scheduled Daily Report → Telegram

```
Cloud Scheduler fires every 5 minutes
  → scheduledTelegramReport (L5625)
  → Reads settings/telegram_report for send time + config
  → getVietnamBusinessReportRange() → determine current business period
  → shouldSendTelegramReportNow() → check if it's time (dedup by rangeKey)
  → buildDailyReportTelegramData() → aggregates revenue, orders, expenses
  → loadTelegramReportFinancialProfile() → fixed costs, targets
  → buildConfiguredDailyReportTelegramMessage() + buildMorningRevenueMood()
  → sendTelegramHtmlMessage() to all configured chat IDs
  → Updates lastSentRangeKey in settings/telegram_report
```

### 8. Order Request (Customer Web) → POS

```
Customer submits order via customer web page
  → Writes to `order_requests/{requestId}` (status: "pending")
  → Firestore trigger: onOrderRequestCreated (L4154)
    → sends Telegram notification to owner
  → Owner approves via Telegram callback or POS
  → Firestore trigger: onOrderRequestApproved (L4185)
    → creates POS order in `orders`
    → updates order_request status to "approved"
  → Firestore trigger: syncOrderRequestStatusFromPosOrder (L4229)
    → syncs POS order completion back to order_request
```

---

## Services

- Firebase/Firestore access: `db.js`, `functions/firestoreMegaTools.js`, `functions/index.js`.
- AI/LLM services: `ai-*`, `DeepSeekRouter.js`, `functions/geminiTools.js`, `functions/vertexAi.js`.
- Notifications: Firebase Messaging service worker and Cloud Functions notification code.

## UI pages

- `index.html`: POS.
- `kitchen.html`: KDS.
- `chief-of-staff-mockup.html`, `marketing-ai-mockup.html`: mockups/planning UI.

## Data layer

- Firestore collections are described in `README.md`.
- Master/migrated JSON files exist at repo root and may contain operational data; do not modify without explicit instruction.
- Import/backfill scripts may write data; do not run without explicit instruction.

## Config layer

- `package.json`: root Node/Jest dependencies and scripts.
- `functions/package.json`: Firebase Functions dependencies and Node engine.
- `firebase.json`, `.firebaserc`, `firestore.rules`: Firebase config.
- `.gitignore`, `.gitattributes`, `.editorconfig`: repo metadata.

## Test/build commands

Known safe read-only/light commands:

```bash
git status --short
git diff --stat
npm test
```

Potentially side-effecting commands requiring explicit confirmation:

```bash
npm run backfill:history-costs
firebase deploy
firebase emulators:start
node import_master.js
node import_migrated_history_purchases.js
```


## ESM Phase E4 UI Island

- `app/esm/ui/image-zoom.js`: importable image zoom/pan controller. Installed by `app/esm/main.js` under `window.XekhoApp.esm.ui.imageZoom`; classic `ImgZoom` in `app.js` delegates at call time and keeps fallback logic. Verified by `scripts/verify-esm-ui-image-zoom.js`.


## ESM Phase E5.1 Header Actions

- `app/esm/ui/header-actions.js`: importable delegated header action island. Installed by `app/esm/main.js` under `window.XekhoApp.esm.ui.headerActions`; replaces four static header inline `onclick` handlers with `data-esm-header-action`. Verified by `scripts/verify-esm-header-actions.js`.


## ESM Phase E5.2 Report Tabs

- `app/esm/ui/report-tabs.js`: importable delegated report tab island. Installed by `app/esm/main.js` under `window.XekhoApp.esm.ui.reportTabs`; replaces four static report tab inline `onclick` handlers with `data-esm-report-tab`. Verified by `scripts/verify-esm-report-tabs.js`.


## ESM Phase E5.3 Settings Tabs

- `app/esm/ui/settings-tabs.js`: importable delegated settings tab island. Installed by `app/esm/main.js` under `window.XekhoApp.esm.ui.settingsTabs`; replaces seven static settings tab inline `onclick` handlers with `data-esm-settings-tab`. Verified by `scripts/verify-esm-settings-tabs.js`.


## ESM Phase E5.4 Report Date Controls

- `app/esm/ui/report-date-controls.js`: importable delegated report period/date mode island. Installed by `app/esm/main.js` under `window.XekhoApp.esm.ui.reportDateControls`; replaces seven report date inline handlers with `data-esm-report-period` / `data-esm-report-date-mode`. Verified by `scripts/verify-esm-report-date-controls.js`.


## ESM Phase E5.5 Inventory Tabs

- `app/esm/ui/inventory-tabs.js`: importable delegated inventory tab island. Installed by `app/esm/main.js` under `window.XekhoApp.esm.ui.inventoryTabs`; replaces five inventory tab inline handlers with `data-esm-inventory-tab`. Verified by `scripts/verify-esm-inventory-tabs.js`.


## ESM Phase E5.6 Finance Period Controls

- `app/esm/ui/finance-period.js`: importable delegated finance period island. Installed by `app/esm/main.js` under `window.XekhoApp.esm.ui.financePeriod`; replaces five finance period inline handlers with `data-esm-finance-period`. Verified by `scripts/verify-esm-finance-period.js`.


## ESM Phase E5.7 Report Transaction Filters

- `app/esm/ui/report-transaction-filters.js`: importable delegated report transaction filter island. Installed by `app/esm/main.js` under `window.XekhoApp.esm.ui.reportTransactionFilters`; replaces six duplicated report transaction filter inline handlers with `data-esm-report-transaction-filter`. Verified by `scripts/verify-esm-report-transaction-filters.js`.


## ESM Phase E5.8 Report Filter Controls

- `app/esm/ui/report-filter-controls.js`: importable delegated report menu filter/reset island. Installed by `app/esm/main.js` under `window.XekhoApp.esm.ui.reportFilterControls`; replaces two report menu filter selects and two report reset buttons with delegated data attributes. Verified by `scripts/verify-esm-report-filter-controls.js`.


## ESM Phase E5.9 Modal Overlay Controls

- `app/esm/ui/modal-overlay-controls.js`: importable delegated modal overlay/close/image-zoom control island. Installed by `app/esm/main.js` under `window.XekhoApp.esm.ui.modalOverlayControls`; replaces 41 low-risk inline modal/image-zoom handlers with delegated data attributes. Verified by `scripts/verify-esm-modal-overlay-controls.js`.


## ESM Phase E5.10 Render Refresh Controls

- `app/esm/ui/render-refresh-controls.js`: importable delegated render/filter refresh island. Installed by `app/esm/main.js` under `window.XekhoApp.esm.ui.renderRefreshControls`; now covers 9 low-risk inline handlers with `data-esm-render-refresh` after the obsolete Media page was removed. Allowlist: `renderLedger`, `renderAttendanceManagement`, `applyStocktakeHistoryFilter`. Verified by `scripts/verify-esm-render-refresh-controls.js`.


## ESM Phase E5.11 Admin Render Controls

- `app/esm/ui/admin-render-controls.js`: importable delegated admin render/search island. Installed by `app/esm/main.js` under `window.XekhoApp.esm.ui.adminRenderControls`; now covers 4 low-risk inline handlers with `data-esm-admin-render` / `data-esm-menu-items-search` after the obsolete top-level Menu page was removed. Allowlist: `renderTables`, `renderStockList`, plus menu-search assignment followed by `renderMenuItems` where the shared admin modal remains. Verified by `scripts/verify-esm-admin-render-controls.js`.
### Mobile table grid verifier — 2026-06-03

- `scripts/verify-mobile-table-grid.js`: source-level guard for the mobile table screen. Verifies that `renderTables()` filters persisted `takeaway` table records out of the physical table grid, keeps the dedicated `table-card-takeaway` card, uses shared `table-card-wide` summary rows, and keeps CSS shrink/ellipsis rules that prevent mobile horizontal overflow.
