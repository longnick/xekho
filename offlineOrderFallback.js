// ============================================================
// OFFLINE ORDER FALLBACK WRAPPER - Sprint 6 disabled/dry-run layer
// XE KHÔ POS
//
// Purpose:
//   Build and verify POS order fallback action payloads before enabling any
//   live fallback. By default this module auto-installs in disabled mode only:
//   it does NOT wrap DB.Orders, does NOT write Firestore, and does NOT enqueue
//   live POS actions unless explicitly installed with mode='enabled'.
// ============================================================

(function initOfflineOrderFallback(globalScope) {
  'use strict';

  const VERSION = 'sprint-6-disabled-dry-run';
  const VALID_MODES = new Set(['disabled', 'dry-run', 'enabled']);
  const WRAPPED_FLAG = '__xekhoOfflineOrderFallbackWrapped';
  const ORIGINALS_KEY = '__xekhoOfflineOrderFallbackOriginals';
  const DEVICE_ID_STORAGE_KEY = 'xekho_pos_device_id';
  let memoryDeviceId = '';

  function nowIso() {
    return new Date().toISOString();
  }

  function defaultLogger() {
    const consoleRef = globalScope.console || {};
    return {
      info: typeof consoleRef.info === 'function' ? consoleRef.info.bind(consoleRef) : function noop() {},
      warn: typeof consoleRef.warn === 'function' ? consoleRef.warn.bind(consoleRef) : function noop() {},
      error: typeof consoleRef.error === 'function' ? consoleRef.error.bind(consoleRef) : function noop() {},
    };
  }

  function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function cloneJson(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function cleanText(value, fallback = '') {
    const text = String(value == null ? fallback : value).trim();
    return text || fallback;
  }

  function cleanMode(mode) {
    const next = String(mode || 'disabled').trim().toLowerCase();
    return VALID_MODES.has(next) ? next : 'disabled';
  }

  function getRuntime(options = {}) {
    return options.runtime || globalScope.XekhoOfflineBackupRuntime || null;
  }

  function getBackupLib(options = {}) {
    return options.backupLib || globalScope.XekhoOfflineBackup || null;
  }

  function makeClientOrderId(options = {}) {
    const backupLib = getBackupLib(options);
    if (backupLib && typeof backupLib.makeClientOrderId === 'function') {
      return backupLib.makeClientOrderId('offline_order');
    }
    return `offline_order_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function randomToken() {
    if (globalScope.crypto && typeof globalScope.crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(8);
      globalScope.crypto.getRandomValues(bytes);
      return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return Math.random().toString(36).slice(2, 10);
  }

  function makeDeviceId() {
    return `device_${Date.now()}_${randomToken()}`;
  }

  function getDeviceId(options = {}) {
    const explicit = cleanText(options.deviceId || globalScope.XEKHO_DEVICE_ID || '', '');
    if (explicit) return explicit;
    const storageKey = cleanText(options.deviceIdStorageKey || DEVICE_ID_STORAGE_KEY, DEVICE_ID_STORAGE_KEY);
    try {
      const storage = globalScope.localStorage;
      if (storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function') {
        const existing = cleanText(storage.getItem(storageKey) || '', '');
        if (existing) return existing;
        const next = makeDeviceId();
        storage.setItem(storageKey, next);
        return next;
      }
    } catch (_) {}
    if (!memoryDeviceId) memoryDeviceId = makeDeviceId();
    return memoryDeviceId;
  }

  function shouldFallback(error, options = {}) {
    const backupLib = getBackupLib(options);
    if (backupLib && typeof backupLib.isOfflineOrServerError === 'function') {
      return backupLib.isOfflineOrServerError(error);
    }
    if (typeof navigator !== 'undefined' && navigator && navigator.onLine === false) return true;
    const text = String((error && (error.message || error.code || error.name)) || error || '').toLowerCase();
    return text.includes('offline') || text.includes('network') || text.includes('unavailable') || text.includes('timeout') || text.includes('failed to fetch') || text.includes('503') || text.includes('504');
  }

  function basePayload(type, input = {}, options = {}) {
    const createdAt = input.createdAt || nowIso();
    const clientOrderId = cleanText(input.clientOrderId || input.orderId || '', '') || makeClientOrderId(options);
    return {
      clientOrderId,
      source: 'pos_offline_fallback',
      fallbackVersion: VERSION,
      method: cleanText(input.method || type, type),
      deviceId: getDeviceId(options),
      offlineCreatedAt: createdAt,
      createdAtLocal: createdAt,
    };
  }

  function normalizeItem(item) {
    const clean = isPlainObject(item) ? cloneJson(item) : {};
    if (clean.qty != null) clean.qty = Number(clean.qty || 0) || 1;
    if (clean.price != null) clean.price = Number(clean.price || 0);
    if (clean.cost != null) clean.cost = Number(clean.cost || 0);
    return clean;
  }

  function buildOpenOrderAction(input = {}, options = {}) {
    const tableId = cleanText(input.tableId || input.table || '', '');
    const tableName = cleanText(input.tableName || (tableId ? `Ban ${tableId}` : ''), '');
    const payload = {
      ...basePayload('open_order', { ...input, method: 'Orders.open' }, options),
      tableId,
      tableName,
      staffUid: input.staffUid || null,
      createdBy: isPlainObject(input.createdBy) ? cloneJson(input.createdBy) : (input.createdBy || null),
    };
    return { type: 'open_order', clientOrderId: payload.clientOrderId, payload };
  }

  function buildAddItemAction(input = {}, options = {}) {
    const orderId = cleanText(input.orderId || '', '');
    const payload = {
      ...basePayload('add_item', { ...input, method: 'Orders.addItem' }, options),
      orderId,
      tableId: cleanText(input.tableId || '', ''),
      item: normalizeItem(input.item),
    };
    return { type: 'add_item', clientOrderId: payload.clientOrderId, payload };
  }

  function buildChangeQtyAction(input = {}, options = {}) {
    const payload = {
      ...basePayload('change_qty', { ...input, method: 'Orders.changeQty' }, options),
      orderId: cleanText(input.orderId || '', ''),
      tableId: cleanText(input.tableId || '', ''),
      itemId: cleanText(input.itemId || '', ''),
      itemNote: input.itemNote || '',
      delta: Number(input.delta || 0),
      lineItemId: cleanText(input.lineItemId || '', ''),
    };
    return { type: 'change_qty', clientOrderId: payload.clientOrderId, payload };
  }

  function buildRemoveItemAction(input = {}, options = {}) {
    const payload = {
      ...basePayload('remove_item', { ...input, method: 'Orders.removeItem' }, options),
      orderId: cleanText(input.orderId || '', ''),
      tableId: cleanText(input.tableId || '', ''),
      itemId: cleanText(input.itemId || '', ''),
      itemNote: input.itemNote || '',
      lineItemId: cleanText(input.lineItemId || '', ''),
      removeMode: 'line_item',
    };
    return { type: 'remove_item', clientOrderId: payload.clientOrderId, payload };
  }

  function buildUpdateItemAction(input = {}, options = {}) {
    const payload = {
      ...basePayload('update_item', { ...input, method: 'Orders.updateItemNote' }, options),
      orderId: cleanText(input.orderId || '', ''),
      tableId: cleanText(input.tableId || '', ''),
      itemId: cleanText(input.itemId || '', ''),
      note: input.note || input.itemNote || '',
      lineItemId: cleanText(input.lineItemId || '', ''),
    };
    return { type: 'update_item', clientOrderId: payload.clientOrderId, payload };
  }

  function buildUpdateMetaAction(input = {}, options = {}) {
    const meta = isPlainObject(input.meta) ? cloneJson(input.meta) : {};
    const payload = {
      ...basePayload('update_meta', { ...input, method: 'Orders.updateMeta' }, options),
      orderId: cleanText(input.orderId || '', ''),
      tableId: cleanText(input.tableId || meta.tableId || '', ''),
      meta,
    };
    return { type: 'update_meta', clientOrderId: payload.clientOrderId, payload };
  }

  function buildCloseOrderAction(input = {}, options = {}) {
    const payInfo = isPlainObject(input.payInfo) ? cloneJson(input.payInfo) : {};
    const rawItems = Array.isArray(input.items) ? input.items : (Array.isArray(payInfo.items) ? payInfo.items : []);
    const items = rawItems.map(normalizeItem);
    const paidAtLocal = input.paidAtLocal || nowIso();
    const payload = {
      ...basePayload('close_order', { ...input, method: 'Orders.close', createdAt: paidAtLocal }, options),
      orderId: cleanText(input.orderId || '', ''),
      tableId: cleanText(input.tableId || payInfo.tableId || '', ''),
      tableName: cleanText(input.tableName || payInfo.tableName || '', ''),
      items,
      total: Number(input.total != null ? input.total : payInfo.total || 0),
      cost: Number(input.cost != null ? input.cost : payInfo.cost || 0),
      payMethod: input.payMethod || payInfo.payMethod || payInfo.paymentMethod || 'cash',
      discount: Number(input.discount != null ? input.discount : payInfo.discount || 0),
      discountNote: input.discountNote || payInfo.discountNote || '',
      discountType: input.discountType || payInfo.discountType || 'vnd',
      shipping: Number(input.shipping != null ? input.shipping : payInfo.shipping || 0),
      vatAmount: Number(input.vatAmount != null ? input.vatAmount : payInfo.vatAmount || 0),
      taxRate: Number(input.taxRate != null ? input.taxRate : payInfo.taxRate || 0),
      billNo: input.billNo || payInfo.billNo || '',
      historyId: input.historyId || payInfo.historyId || '',
      paidAtLocal,
    };
    return { type: 'close_order', clientOrderId: payload.clientOrderId, payload };
  }

  function buildCancelOrderAction(input = {}, options = {}) {
    const cancelledAtLocal = input.cancelledAtLocal || nowIso();
    const payload = {
      ...basePayload('cancel_order', { ...input, method: 'Orders.cancel', createdAt: cancelledAtLocal }, options),
      orderId: cleanText(input.orderId || '', ''),
      tableId: cleanText(input.tableId || '', ''),
      cancelReason: cleanText(input.cancelReason || '', 'Hủy đơn hàng offline'),
      cancelledAtLocal,
    };
    return { type: 'cancel_order', clientOrderId: payload.clientOrderId, payload };
  }

  function actionFromMethod(methodName, args, options = {}) {
    const list = Array.from(args || []);
    const tableIdResolver = typeof options.tableIdResolver === 'function' ? options.tableIdResolver : null;
    const tableIdFromOrder = orderId => tableIdResolver ? tableIdResolver(orderId) : '';

    switch (methodName) {
      case 'open':
        return buildOpenOrderAction({ tableId: list[0], tableName: list[1], staffUid: list[2], createdBy: list[3] }, options);
      case 'addItem':
        return buildAddItemAction({ orderId: list[0], tableId: tableIdFromOrder(list[0]), item: list[1] }, options);
      case 'changeQty':
        return buildChangeQtyAction({ orderId: list[0], tableId: tableIdFromOrder(list[0]), itemId: list[1], itemNote: list[2], delta: list[3], lineItemId: list[4] }, options);
      case 'removeItem':
        return buildRemoveItemAction({ orderId: list[0], tableId: tableIdFromOrder(list[0]), itemId: list[1], itemNote: list[2], lineItemId: list[3] }, options);
      case 'updateItemNote':
        return buildUpdateItemAction({ orderId: list[0], tableId: tableIdFromOrder(list[0]), itemId: list[1], note: list[2], lineItemId: list[3] }, options);
      case 'updateMeta':
        return buildUpdateMetaAction({ orderId: list[0], tableId: tableIdFromOrder(list[0]), meta: list[1] }, options);
      case 'close':
        return buildCloseOrderAction({ orderId: list[0], tableId: tableIdFromOrder(list[0]), payInfo: list[1] }, options);
      case 'cancel':
        return buildCancelOrderAction({ orderId: list[0], tableId: tableIdFromOrder(list[0]), cancelReason: list[1] }, options);
      default:
        throw new Error(`[OfflineOrderFallback] unsupported Orders method: ${methodName}`);
    }
  }

  async function enqueueAction(action, options = {}) {
    const runtime = getRuntime(options);
    if (!runtime || typeof runtime.savePendingOrderAction !== 'function') {
      throw new Error('[OfflineOrderFallback] offline runtime is not available');
    }
    return runtime.savePendingOrderAction(action);
  }

  function createOfflineOrderFallback(options = {}) {
    const logger = options.logger || defaultLogger();
    let mode = cleanMode(options.mode);
    const dryRunActions = [];

    async function handleFailedOrderMethod(methodName, args, error) {
      const action = actionFromMethod(methodName, args, options);
      action.payload.fallbackReason = String((error && (error.message || error.code || error.name)) || error || 'unknown');

      if (mode === 'dry-run') {
        dryRunActions.push(cloneJson(action));
        logger.warn('[OfflineOrderFallback] dry-run captured action', action.type, action.payload.orderId || action.payload.tableId || action.clientOrderId);
        return { dryRun: true, action };
      }

      if (mode === 'enabled') {
        const saved = await enqueueAction(action, options);
        logger.warn('[OfflineOrderFallback] saved offline action', saved.type, saved.id);
        return { saved: true, action: saved };
      }

      return { skipped: true, reason: 'disabled', action };
    }

    function wrapOrders(orders) {
      if (!orders || typeof orders !== 'object') return { wrapped: false, reason: 'orders-unavailable' };
      if (orders[WRAPPED_FLAG]) return { wrapped: false, reason: 'already-wrapped' };

      const methodNames = ['open', 'addItem', 'changeQty', 'removeItem', 'updateItemNote', 'updateMeta', 'close', 'cancel'];
      const originals = {};

      methodNames.forEach(methodName => {
        if (typeof orders[methodName] !== 'function') return;
        originals[methodName] = orders[methodName];
        orders[methodName] = async function wrappedOrderMethod(...args) {
          try {
            return await originals[methodName].apply(this, args);
          } catch (error) {
            if (!shouldFallback(error, options)) throw error;
            const result = await handleFailedOrderMethod(methodName, args, error);
            if (mode === 'enabled' && methodName === 'open') {
              return result.action && result.action.clientOrderId;
            }
            throw error;
          }
        };
      });

      Object.defineProperty(orders, WRAPPED_FLAG, { value: true, enumerable: false, configurable: true });
      Object.defineProperty(orders, ORIGINALS_KEY, { value: originals, enumerable: false, configurable: true });
      return { wrapped: Object.keys(originals).length > 0, methods: Object.keys(originals) };
    }

    function unwrapOrders(orders) {
      if (!orders || !orders[WRAPPED_FLAG] || !orders[ORIGINALS_KEY]) return { unwrapped: false };
      Object.keys(orders[ORIGINALS_KEY]).forEach(methodName => {
        orders[methodName] = orders[ORIGINALS_KEY][methodName];
      });
      delete orders[WRAPPED_FLAG];
      delete orders[ORIGINALS_KEY];
      return { unwrapped: true };
    }

    function install(targetDb = options.db || globalScope.DB || null) {
      if (mode === 'disabled') {
        return { installed: true, wrapped: false, mode, reason: 'disabled-safe-default' };
      }
      const orders = targetDb && targetDb.Orders;
      return { installed: true, mode, ...wrapOrders(orders) };
    }

    return {
      version: VERSION,
      get mode() { return mode; },
      setMode(nextMode) { mode = cleanMode(nextMode); return mode; },
      install,
      unwrapOrders,
      handleFailedOrderMethod,
      actionFromMethod: (methodName, args) => actionFromMethod(methodName, args, options),
      buildOpenOrderAction: input => buildOpenOrderAction(input, options),
      buildAddItemAction: input => buildAddItemAction(input, options),
      buildChangeQtyAction: input => buildChangeQtyAction(input, options),
      buildRemoveItemAction: input => buildRemoveItemAction(input, options),
      buildUpdateItemAction: input => buildUpdateItemAction(input, options),
      buildUpdateMetaAction: input => buildUpdateMetaAction(input, options),
      buildCloseOrderAction: input => buildCloseOrderAction(input, options),
      buildCancelOrderAction: input => buildCancelOrderAction(input, options),
      getDryRunActions: () => dryRunActions.map(cloneJson),
      clearDryRunActions: () => { dryRunActions.length = 0; },
    };
  }

  function installOfflineOrderFallback(options = {}) {
    const target = options.target || globalScope;
    if (target.XekhoOfflineOrderFallbackController && options.force !== true) {
      return target.XekhoOfflineOrderFallbackController;
    }
    const controller = createOfflineOrderFallback({ mode: 'disabled', ...options });
    controller.install(options.db || target.DB || null);
    target.XekhoOfflineOrderFallbackController = controller;
    return controller;
  }

  function autoInstall() {
    try {
      if (globalScope.__XEKHO_OFFLINE_ORDER_FALLBACK_NO_AUTO_INSTALL__) return;
      const controller = installOfflineOrderFallback({ mode: 'disabled' });
      defaultLogger().info('[OfflineOrderFallback] Ready', { version: VERSION, mode: controller.mode });
    } catch (error) {
      defaultLogger().warn('[OfflineOrderFallback] Auto install failed', error && error.message ? error.message : error);
    }
  }

  const api = {
    version: VERSION,
    createOfflineOrderFallback,
    installOfflineOrderFallback,
    shouldFallback,
    buildOpenOrderAction,
    buildAddItemAction,
    buildChangeQtyAction,
    buildRemoveItemAction,
    buildUpdateItemAction,
    buildUpdateMetaAction,
    buildCloseOrderAction,
    buildCancelOrderAction,
  };

  globalScope.XekhoOfflineOrderFallback = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', autoInstall, { once: true });
    } else {
      autoInstall();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
