# File Relations

## Module: POS frontend

Purpose:

Run the main restaurant point-of-sale workflow: table/order state, menu interactions, checkout, and staff/admin UI.

Related files:

- `index.html`
  - role: main POS document / UI shell.
  - depends on: root JS/CSS assets such as `app.js`, `db.js`, `style.css`.
  - used by: Firebase Hosting / local server users.
  - notes: verify script tags before changing frontend module names.

- `app.js`
  - role: main POS client-side application logic.
  - depends on: Firebase wrapper/data helpers and DOM structure in `index.html`.
  - used by: POS page.
  - notes: currently modified before AI map initialization; inspect diff before editing.

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

- `db.js`
  - role: Firestore/Firebase data access helper.
  - depends on: Firebase SDK/config.
  - used by: POS/KDS/AI modules.
  - notes: do not hardcode secrets; treat Firestore schema changes carefully.

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
