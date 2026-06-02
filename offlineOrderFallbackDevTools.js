// ============================================================
// OFFLINE ORDER FALLBACK DEV TOOLS - Sprint 7 browser dry-run helpers
// XE KHÔ POS
//
// Purpose:
//   Expose explicit, developer-triggered helpers for browser/manual dry-run
//   testing of offline order fallback payloads. This module is safe by default:
//   it does NOT auto-wrap DB.Orders, does NOT enqueue live queue actions, and
//   does NOT write Firestore unless a developer manually enables dry-run.
// ============================================================

(function initOfflineOrderFallbackDevTools(globalScope) {
  'use strict';

  const VERSION = 'sprint-12-guarded-queue-write-devtools';
  const DEFAULT_ERROR = new Error('network unavailable - offline fallback dry-run simulation');
  const QUEUE_WRITE_CONFIRM_TEXT = 'ENABLE_OFFLINE_QUEUE_WRITE';

  function defaultLogger() {
    const consoleRef = globalScope.console || {};
    return {
      info: typeof consoleRef.info === 'function' ? consoleRef.info.bind(consoleRef) : function noop() {},
      warn: typeof consoleRef.warn === 'function' ? consoleRef.warn.bind(consoleRef) : function noop() {},
      error: typeof consoleRef.error === 'function' ? consoleRef.error.bind(consoleRef) : function noop() {},
    };
  }

  function cloneJson(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function getFallbackLib(options = {}) {
    return options.fallbackLib || globalScope.XekhoOfflineOrderFallback || null;
  }

  function getDb(options = {}) {
    return options.db || globalScope.DB || null;
  }

  function defaultTableIdResolver(orderId) {
    const db = getDb();
    const orders = db && db.Orders;
    if (orders && typeof orders.byId === 'function') {
      try {
        const row = orders.byId(orderId);
        return row && (row.tableId || row.table || row.tableKey || '');
      } catch (_) {}
    }
    if (globalScope.appState && globalScope.appState.orders && typeof globalScope.appState.orders === 'object') {
      const found = Object.values(globalScope.appState.orders).find(order => order && order.id === orderId);
      if (found) return found.tableId || found.table || found.tableKey || '';
    }
    return '';
  }

  function payloadReviewTableIdResolver(orderId) {
    const resolved = defaultTableIdResolver(orderId);
    if (resolved) return resolved;
    if (orderId === 'dryrun-order-1') return 'dryrun-table-1';
    return '';
  }

  function getDefaultArgs(methodName) {
    const sampleItem = {
      id: 'dryrun-sku-1',
      name: 'Dry-run item',
      price: 45000,
      cost: 20000,
      qty: 1,
      note: 'dry-run',
      lineItemId: 'dryrun-line-1',
    };
    const payInfo = {
      tableId: 'dryrun-table-1',
      tableName: 'Bàn dry-run',
      items: [sampleItem],
      total: 45000,
      cost: 20000,
      payMethod: 'cash',
      discount: 0,
      vatAmount: 0,
      billNo: 'DRYRUN-BILL-1',
      historyId: 'DRYRUN-HISTORY-1',
    };
    switch (methodName) {
      case 'open':
        return ['dryrun-table-1', 'Bàn dry-run', 'dryrun-staff', { uid: 'dryrun-staff', name: 'Dry-run Staff' }];
      case 'addItem':
        return ['dryrun-order-1', sampleItem];
      case 'changeQty':
        return ['dryrun-order-1', sampleItem.id, sampleItem.note, 1, sampleItem.lineItemId];
      case 'removeItem':
        return ['dryrun-order-1', sampleItem.id, sampleItem.note, sampleItem.lineItemId];
      case 'updateItemNote':
        return ['dryrun-order-1', sampleItem.id, 'ghi chú dry-run', sampleItem.lineItemId];
      case 'updateMeta':
        return ['dryrun-order-1', { note: 'dry-run meta', discount: 0, shipping: 0 }];
      case 'close':
        return ['dryrun-order-1', payInfo];
      case 'cancel':
        return ['dryrun-order-1', 'Dry-run cancel'];
      default:
        throw new Error(`[OfflineOrderFallbackDevTools] unsupported method: ${methodName}`);
    }
  }

  function formatPayloadReviewReport(report) {
    const lines = [];
    lines.push('XE KHÔ Offline Payload Review');
    lines.push(`Generated: ${report.generatedAt || ''}`);
    lines.push(`Mode: ${report.mode || ''}`);
    lines.push('Side effects: no DB wrap, no enqueue, no Firestore, no sync');
    if (Array.isArray(report.warnings) && report.warnings.length) {
      lines.push('');
      lines.push('## Warnings');
      report.warnings.forEach(warning => lines.push(`- ${warning}`));
    }
    lines.push('');
    (report.actions || []).forEach(item => {
      lines.push(`## ${item.methodName} → ${item.type}`);
      lines.push(JSON.stringify(item.payload, null, 2));
      lines.push('');
    });
    return lines.join('\n');
  }

  function validatePayloadReviewAction(item) {
    const warnings = [];
    const payload = item && item.payload ? item.payload : {};
    const label = item && item.methodName ? item.methodName : 'unknown';
    if (!payload.clientOrderId) warnings.push(`${label}: missing clientOrderId`);
    if (!payload.deviceId || payload.deviceId === 'device_unknown') warnings.push(`${label}: missing stable deviceId; localStorage-backed device ID must be available before enabling queue writes`);
    if (label !== 'open' && !payload.orderId) warnings.push(`${label}: missing orderId`);
    if (!payload.tableId) warnings.push(`${label}: missing tableId; add/close/cancel sync should resolve tableId from live order state`);
    if (label === 'removeItem') {
      if (item.type !== 'remove_item') warnings.push('removeItem: must use remove_item action type, not a quantity delta surrogate');
      if (Object.prototype.hasOwnProperty.call(payload, 'delta')) warnings.push('removeItem: must not include delta; use explicit remove line item payload');
      if (payload.removeMode !== 'line_item') warnings.push('removeItem: missing removeMode=line_item');
      if (!payload.lineItemId && !payload.itemId) warnings.push('removeItem: missing lineItemId/itemId target');
    }
    if (label === 'close') {
      if (!Array.isArray(payload.items) || payload.items.length === 0) warnings.push('close: items is empty; close_order sync needs real order items for history');
      if (!payload.tableName) warnings.push('close: missing tableName');
      if (!payload.billNo) warnings.push('close: missing billNo');
    }
    return warnings;
  }

  function createOfflineOrderFallbackDevTools(options = {}) {
    const logger = options.logger || defaultLogger();
    const fallbackLib = getFallbackLib(options);
    let controller = options.controller || null;
    const methodNames = ['open', 'addItem', 'changeQty', 'removeItem', 'updateItemNote', 'updateMeta', 'close', 'cancel'];

    function requireFallbackLib() {
      const lib = fallbackLib || getFallbackLib(options);
      if (!lib || typeof lib.createOfflineOrderFallback !== 'function') {
        throw new Error('[OfflineOrderFallbackDevTools] XekhoOfflineOrderFallback is not available');
      }
      return lib;
    }

    function ensureController(mode = 'dry-run', extraOptions = {}) {
      if (!controller) {
        const lib = requireFallbackLib();
        controller = lib.createOfflineOrderFallback({
          mode,
          tableIdResolver: defaultTableIdResolver,
          ...options,
          ...extraOptions,
        });
      } else if (typeof controller.setMode === 'function') {
        controller.setMode(mode);
      }
      return controller;
    }

    function enableDryRun(db = getDb(options)) {
      const next = ensureController('dry-run', { db });
      const result = next.install(db);
      logger.warn('[OfflineOrderFallbackDevTools] dry-run enabled. Offline/server failures will be captured then rethrown.', result);
      return { version: VERSION, mode: next.mode, ...result };
    }

    function hasRuntimeQueue(runtime) {
      return !!(runtime && typeof runtime.savePendingOrderAction === 'function');
    }

    function enableQueueWriteGuarded(config = {}) {
      const db = config.db || getDb(options);
      const runtime = config.runtime || options.runtime || globalScope.XekhoOfflineBackupRuntime || null;
      const confirmation = config.confirmation || config.confirm || '';
      if (confirmation !== QUEUE_WRITE_CONFIRM_TEXT) {
        return {
          version: VERSION,
          enabled: false,
          mode: 'disabled',
          reason: 'confirmation-required',
          requiredConfirmation: QUEUE_WRITE_CONFIRM_TEXT,
          syncEnabled: runtime && runtime.syncEnabled === true,
        };
      }
      if (!hasRuntimeQueue(runtime)) {
        return {
          version: VERSION,
          enabled: false,
          mode: 'disabled',
          reason: 'runtime-queue-unavailable',
          requiredRuntime: 'XekhoOfflineBackupRuntime.savePendingOrderAction',
        };
      }
      if (controller && typeof controller.unwrapOrders === 'function') {
        controller.unwrapOrders(db && db.Orders);
        controller = null;
      }
      const next = ensureController('enabled', { db, runtime });
      const result = next.install(db);
      logger.warn('[OfflineOrderFallbackDevTools] guarded queue-write enabled. Auto sync remains disabled; offline/server failures will be enqueued then original errors rethrown.', result);
      return {
        version: VERSION,
        enabled: true,
        mode: next.mode,
        syncEnabled: runtime.syncEnabled === true,
        autoSyncEnabled: false,
        queueWritesEnabled: true,
        ...result,
      };
    }

    function disable(db = getDb(options)) {
      if (!controller) return { version: VERSION, disabled: true, reason: 'not-enabled' };
      const result = controller.unwrapOrders(db && db.Orders);
      if (typeof controller.setMode === 'function') controller.setMode('disabled');
      logger.info('[OfflineOrderFallbackDevTools] disabled', result);
      return { version: VERSION, disabled: true, ...result };
    }

    async function simulateFailure(methodName, args = getDefaultArgs(methodName), error = DEFAULT_ERROR) {
      const next = ensureController('dry-run');
      return next.handleFailedOrderMethod(methodName, args, error);
    }

    async function simulateAllFailures() {
      const results = [];
      for (const methodName of methodNames) {
        const result = await simulateFailure(methodName);
        results.push({ methodName, type: result.action && result.action.type, result });
      }
      return results;
    }

    function getDryRunActions() {
      if (!controller || typeof controller.getDryRunActions !== 'function') return [];
      return controller.getDryRunActions().map(cloneJson);
    }

    function clearDryRunActions() {
      if (controller && typeof controller.clearDryRunActions === 'function') controller.clearDryRunActions();
      return { cleared: true };
    }

    function buildPayloadReviewReport() {
      const lib = requireFallbackLib();
      const reportController = lib.createOfflineOrderFallback({
        mode: 'disabled',
        tableIdResolver: payloadReviewTableIdResolver,
        ...options,
      });
      const generatedAt = new Date().toISOString();
      const actions = methodNames.map(methodName => {
        const args = getDefaultArgs(methodName);
        const action = reportController.actionFromMethod(methodName, args);
        return {
          methodName,
          args: cloneJson(args),
          type: action.type,
          clientOrderId: action.clientOrderId,
          payload: cloneJson(action.payload),
        };
      });
      const warnings = actions.flatMap(validatePayloadReviewAction);
      return {
        version: VERSION,
        generatedAt,
        safeByDefault: true,
        mode: 'payload-review-only',
        sideEffects: {
          wrapsDbOrders: false,
          enqueuesOfflineActions: false,
          writesFirestore: false,
          enablesSync: false,
        },
        guardedQueueWrite: {
          available: true,
          enabledByDefault: false,
          requiredConfirmation: QUEUE_WRITE_CONFIRM_TEXT,
          autoSyncRemainsDisabled: true,
        },
        actions,
        warnings,
        instructions: [
          'Review payload.action[].payload shapes before enabling real queue writes.',
          'Use enableDryRun() only in a controlled browser session; dry-run still rethrows original errors.',
          `After payload acceptance, queue writes require enableQueueWriteGuarded({ confirmation: '${QUEUE_WRITE_CONFIRM_TEXT}' }); auto sync remains disabled.`,
        ],
      };
    }

    function printPayloadReviewReport() {
      const report = buildPayloadReviewReport();
      logger.info('[OfflineOrderFallbackDevTools] payload review report', report);
      return report;
    }

    async function copyPayloadReviewReport() {
      const report = buildPayloadReviewReport();
      const text = formatPayloadReviewReport(report);
      if (globalScope.navigator && globalScope.navigator.clipboard && typeof globalScope.navigator.clipboard.writeText === 'function') {
        await globalScope.navigator.clipboard.writeText(text);
        return { copied: true, text, report };
      }
      return { copied: false, reason: 'clipboard-unavailable', text, report };
    }

    return {
      version: VERSION,
      methodNames: methodNames.slice(),
      enableDryRun,
      enableQueueWriteGuarded,
      disable,
      simulateFailure,
      simulateAllFailures,
      getDryRunActions,
      clearDryRunActions,
      buildPayloadReviewReport,
      printPayloadReviewReport,
      copyPayloadReviewReport,
      formatPayloadReviewReport,
      getDefaultArgs,
      getController: () => controller,
    };
  }

  function installMobilePayloadReviewUI(tools, options = {}) {
    const doc = options.document || globalScope.document;
    if (!doc || !doc.body || !tools || doc.getElementById('xekho-payload-review-panel')) return { installed: false };

    const style = doc.createElement('style');
    style.id = 'xekho-payload-review-style';
    style.textContent = `
      #xekho-payload-review-button{position:fixed;right:14px;bottom:84px;z-index:999999;border:0;border-radius:999px;background:#7c3aed;color:#fff;padding:12px 14px;font-weight:900;box-shadow:0 12px 30px rgba(0,0,0,.35)}
      #xekho-payload-review-panel{position:fixed;inset:12px;z-index:1000000;background:#0f172a;color:#e5e7eb;border:1px solid rgba(148,163,184,.3);border-radius:18px;display:none;flex-direction:column;box-shadow:0 20px 70px rgba(0,0,0,.55);overflow:hidden}
      #xekho-payload-review-panel.open{display:flex}
      #xekho-payload-review-panel .payload-review-head{padding:12px 14px;border-bottom:1px solid rgba(148,163,184,.22);font-weight:900;display:flex;justify-content:space-between;gap:8px;align-items:center}
      #xekho-payload-review-panel textarea{flex:1;margin:0;border:0;background:#020617;color:#d1d5db;padding:12px;font:12px/1.35 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;resize:none;white-space:pre;overflow:auto}
      #xekho-payload-review-panel .payload-review-actions{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(148,163,184,.22);flex-wrap:wrap}
      #xekho-payload-review-panel button{border:0;border-radius:10px;padding:9px 11px;font-weight:800;background:rgba(148,163,184,.18);color:#e5e7eb}
      #xekho-payload-review-panel button.primary{background:#7c3aed;color:#fff}
    `;
    doc.head.appendChild(style);

    const button = doc.createElement('button');
    button.id = 'xekho-payload-review-button';
    button.type = 'button';
    button.textContent = 'Payload Review';

    const panel = doc.createElement('div');
    panel.id = 'xekho-payload-review-panel';
    panel.innerHTML = `
      <div class="payload-review-head"><span>Offline Payload Review</span><button type="button" data-action="close">Đóng</button></div>
      <textarea readonly aria-label="Offline payload review report"></textarea>
      <div class="payload-review-actions">
        <button type="button" class="primary" data-action="refresh">Tạo lại report</button>
        <button type="button" data-action="copy">Copy report</button>
        <button type="button" data-action="select">Chọn hết</button>
        <button type="button" data-action="enable-queue">Bật queue-write guard</button>
      </div>
    `;

    doc.body.appendChild(button);
    doc.body.appendChild(panel);
    const textarea = panel.querySelector('textarea');

    function refresh() {
      const report = tools.buildPayloadReviewReport();
      textarea.value = tools.formatPayloadReviewReport(report);
      return report;
    }

    button.addEventListener('click', () => {
      panel.classList.add('open');
      refresh();
    });

    panel.addEventListener('click', async event => {
      const action = event.target && event.target.getAttribute && event.target.getAttribute('data-action');
      if (action === 'close') panel.classList.remove('open');
      if (action === 'refresh') refresh();
      if (action === 'select') {
        textarea.focus();
        textarea.select();
      }
      if (action === 'copy') {
        const result = await tools.copyPayloadReviewReport();
        if (result && result.text) textarea.value = result.text;
        if (!result || result.copied !== true) {
          textarea.focus();
          textarea.select();
        }
      }
      if (action === 'enable-queue') {
        const result = tools.enableQueueWriteGuarded({ confirmation: QUEUE_WRITE_CONFIRM_TEXT });
        textarea.value = `${textarea.value}\n\n## Queue-write guard result\n${JSON.stringify(result, null, 2)}\n`;
      }
    });

    return { installed: true, refresh };
  }

  function shouldInstallMobilePayloadReviewUI() {
    try {
      const location = globalScope.location;
      if (location && /[?&](xkPayloadReview|payloadReview|offlinePayloadReview|xkQueueWriteGuard)=1\b/.test(location.search || '')) return true;
      const storage = globalScope.localStorage;
      return storage && storage.getItem && storage.getItem('xekho:payload-review-ui') === '1';
    } catch (_) {
      return false;
    }
  }

  function installOfflineOrderFallbackDevTools(options = {}) {
    const target = options.target || globalScope;
    if (target.XekhoOfflineOrderFallbackDevTools && options.force !== true) {
      return target.XekhoOfflineOrderFallbackDevTools;
    }
    const tools = createOfflineOrderFallbackDevTools(options);
    target.XekhoOfflineOrderFallbackDevTools = tools;
    if (options.mobileUI === true || shouldInstallMobilePayloadReviewUI()) {
      installMobilePayloadReviewUI(tools, options);
    }
    return tools;
  }

  const api = {
    version: VERSION,
    createOfflineOrderFallbackDevTools,
    installOfflineOrderFallbackDevTools,
    installMobilePayloadReviewUI,
    shouldInstallMobilePayloadReviewUI,
    formatPayloadReviewReport,
    getDefaultArgs,
  };

  globalScope.XekhoOfflineOrderFallbackDevToolsLib = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => installOfflineOrderFallbackDevTools(), { once: true });
    } else {
      installOfflineOrderFallbackDevTools();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
