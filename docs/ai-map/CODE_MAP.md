# Code Map

## Main modules

### POS frontend

- `index.html`: main POS page.
- `app.js`: main POS application logic and UI orchestration.
- `db.js`: Firebase/Firestore wrapper and data access helper.
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

- `functions/index.js`: main Firebase Cloud Functions entry point.
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

Source: `functions/index.js` (~6,816 lines, 35 exports, ~241 top-level functions). Phase 2 extracted 38 functions into 4 new modules.

### Exported Cloud Functions (35)

**Orders & Payments:**
- `approveOnlineOrder` (onCall, L4204) — approve pending online order
- `rejectOnlineOrder` (onCall, L4228) — reject pending online order

**Telegram Reports & Notifications:**
- `testDailyReportTelegram` (onRequest, L5378) — test daily report
- `testAdsReportTelegram` (onRequest, L5414) — test ads report
- `adsRevenueReportApi` (onRequest, L5450) — ads revenue API
- `testPaymentBillTelegram` (onRequest, L5471) — test payment bill
- `testCompletedOrderTelegram` (onRequest, L5505) — test completed order
- `telegramWebhook` (onRequest, L5548) — main Telegram bot webhook
- `scheduledTelegramReport` (onSchedule, L8290) — scheduled report cron

**Firestore Triggers:**
- `syncPublicMenuOnCatalogCreate/Update/Delete` (onDocument*, L6410-6439)
- `onOrderRequestCreated` (onDocumentCreated, L6439)
- `onOrderRequestApproved` (onDocumentUpdated, L6470)
- `syncOrderRequestStatusFromPosOrder` (onDocumentUpdated, L6514)
- `syncOnlineOrderStatusFromPosOrder` (onDocumentUpdated, L6540)
- `onPaymentRequestCreated` (onDocumentCreated, L6589)
- `onServiceRequestCreated` (onDocumentCreated, L6629)
- `onHistoryFinalizeCustomerOrderRequests` (onDocumentCreated, L6659)
- `onHistoryOrderCancelled` (onDocumentUpdated, L6671)
- `onKitchenNotificationCreated` (onDocumentCreated, L6714)
- `sendPushOnKitchenNotif` (onDocumentCreated, L6793)
- `telegramOnKitchenOrderCreated` (onDocumentCreated, L6937)
- `telegramOnKitchenOrderUpdated` (onDocumentUpdated, L6962)
- `telegramOnCompletedOrderCreated` (onDocumentCreated, L6987)

**AI/Media:**
- `adminProbeVertex` (onRequest, L7054) — Vertex AI probe
- `apiVoice` (onRequest, L6333) — voice processing
- `mediaRefineryApi` (onRequest, L7335) — media refinery
- `aiStatus` (onRequest, L8026) — AI status check
- `aiRouter` (onRequest, L8051) — AI routing endpoint
- `adminGenerateMenuImage` (onRequest, L8099) — AI menu image gen
- `adminGenerateMenuDescription` (onRequest, L8204) — AI menu description gen

**Admin/Maintenance:**
- `cleanupDuplicateHistory` (onRequest, L6256) — cleanup duplicates
- `adminUploadMenuImage` (onRequest, L7635) — upload menu image
- `purchaseOcr` (onRequest, L8005) — purchase receipt OCR

### Key helper function groups (not exported)

**Pure utilities (safe to extract):**
- `chunkArray` (L42) — array chunking
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
