// ============================================================
// OFFLINE FIRESTORE SYNC ADAPTER - Sprint 18 persistent orderId resolution
// XE KHÔ POS
//
// Purpose:
//   Bridge offlineSync.js actions to Firestore/POS operations through an
//   explicit injected operations layer. This adapter does not import Firebase
//   and does not write production data by itself.
// ============================================================

(function initOfflineFirestoreAdapter(globalScope) {
  'use strict';

  function cloneJson(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function normalizeError(error) {
    if (!error) return '';
    if (typeof error === 'string') return error;
    return String(error.message || error.code || error.name || error);
  }

  function defaultLogger() {
    const consoleRef = globalScope.console || {};
    return {
      info: typeof consoleRef.info === 'function' ? consoleRef.info.bind(consoleRef) : function noop() {},
      warn: typeof consoleRef.warn === 'function' ? consoleRef.warn.bind(consoleRef) : function noop() {},
      error: typeof consoleRef.error === 'function' ? consoleRef.error.bind(consoleRef) : function noop() {},
    };
  }

  function asArray(value) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') return Object.values(value);
    return [];
  }

  function getDbState(db) {
    if (!db) return {};
    if (db.state) return db.state;
    if (globalScope.window && globalScope.window.appState) return globalScope.window.appState;
    if (globalScope.appState) return globalScope.appState;
    return {};
  }

  function findInRowsByClientOrderId(rows, clientOrderId) {
    const cleanId = normalizeText(clientOrderId);
    if (!cleanId) return null;
    return asArray(rows).find(row => normalizeText(row && row.clientOrderId) === cleanId) || null;
  }

  function findExistingInDbState(db, clientOrderId) {
    const state = getDbState(db);
    const inHistory = findInRowsByClientOrderId(state.history, clientOrderId);
    if (inHistory) return { collection: 'history', record: cloneJson(inHistory) };

    const inOrders = findInRowsByClientOrderId(state.orders, clientOrderId);
    if (inOrders) return { collection: 'orders', record: cloneJson(inOrders) };

    const inOnlineOrders = findInRowsByClientOrderId(state.onlineOrders, clientOrderId);
    if (inOnlineOrders) return { collection: 'online_orders', record: cloneJson(inOnlineOrders) };

    return null;
  }

  function buildPayInfo(payload) {
    return {
      total: Number(payload.total || 0),
      cost: Number(payload.cost || 0),
      payMethod: payload.payMethod || payload.paymentMethod || 'cash',
      shipping: Number(payload.shipping || 0),
      vatAmount: Number(payload.vatAmount || 0),
      discount: Number(payload.discount || 0),
      discountType: payload.discountType || 'vnd',
      clientOrderId: payload.clientOrderId,
      offlineCreatedAt: payload.offlineCreatedAt || payload.paidAtLocal || payload.createdAt || null,
      offlineDeviceId: payload.deviceId || null,
    };
  }

  function buildCompletedHistoryPayload(action) {
    const payload = cloneJson(action.payload || {});
    const paidAtLocal = payload.paidAtLocal || payload.closedAtLocal || action.createdAt || new Date().toISOString();

    return {
      ...payload,
      clientOrderId: action.clientOrderId || payload.clientOrderId,
      historyId: payload.historyId || null,
      orderId: payload.orderId || null,
      tableId: normalizeText(payload.tableId),
      tableName: payload.tableName || '',
      items: Array.isArray(payload.items) ? payload.items : [],
      total: Number(payload.total || 0),
      cost: Number(payload.cost || 0),
      payMethod: payload.payMethod || payload.paymentMethod || 'cash',
      shipping: Number(payload.shipping || 0),
      vatAmount: Number(payload.vatAmount || 0),
      discount: Number(payload.discount || 0),
      discountType: payload.discountType || 'vnd',
      status: 'completed',
      paidAtLocal,
      offlineCreatedAt: payload.offlineCreatedAt || paidAtLocal,
      offlineSyncedAt: new Date().toISOString(),
      offlineDeviceId: payload.deviceId || action.deviceId || null,
      source: payload.source || 'pos_offline_backup',
    };
  }

  function assertOperationsForAction(action, operations, methodName) {
    if (!operations || typeof operations[methodName] !== 'function') {
      throw new Error(`[OfflineFirestoreAdapter] ${methodName} operation is required for ${action.type}`);
    }
  }

  function createOfflineFirestoreAdapter(options = {}) {
    const db = options.db || (globalScope.window && globalScope.window.DB) || globalScope.DB || null;
    const operations = options.operations || {};
    const logger = options.logger || defaultLogger();
    const clientOrderIdToOrderId = new Map();

    async function isOnline() {
      if (typeof operations.isOnline === 'function') return operations.isOnline();
      if (typeof navigator !== 'undefined' && navigator && navigator.onLine === false) return false;
      return true;
    }

    async function findExistingByClientOrderId(clientOrderId, action) {
      if (typeof operations.findExistingByClientOrderId === 'function') {
        const found = await operations.findExistingByClientOrderId(clientOrderId, action);
        if (found) return found;
      }
      return findExistingInDbState(db, clientOrderId);
    }

    async function isActionAlreadySynced(action) {
      const existing = await findExistingByClientOrderId(action.clientOrderId, action);
      return !!existing;
    }

    async function applyOpenOrder(action) {
      const payload = action.payload || {};
      if (operations.openOrder) {
        const result = await operations.openOrder(payload, action);
        if (result && result.orderId) clientOrderIdToOrderId.set(action.clientOrderId, result.orderId);
        return result;
      }
      if (db && db.Orders && typeof db.Orders.open === 'function') {
        const firestoreOrderId = await db.Orders.open(payload.tableId, payload.tableName, payload.staffUid, payload.createdBy || null);
        clientOrderIdToOrderId.set(action.clientOrderId, firestoreOrderId);
        if (db && db.Orders && typeof db.Orders.updateMeta === 'function' && firestoreOrderId) {
          try {
            await db.Orders.updateMeta(firestoreOrderId, { clientOrderId: action.clientOrderId, offlineDeviceId: payload.deviceId || null, offlineCreatedAt: payload.offlineCreatedAt || null });
          } catch (metaErr) {
            logger.warn('[OfflineFirestoreAdapter] failed to write clientOrderId to order doc', metaErr && metaErr.message ? metaErr.message : metaErr);
          }
        }
        return firestoreOrderId;
      }
      assertOperationsForAction(action, operations, 'openOrder');
    }

    async function resolveOrderId(orderId) {
      if (!orderId) return orderId;
      const cached = clientOrderIdToOrderId.get(orderId);
      if (cached) return cached;
      if (db && db.Orders && typeof db.Orders.findByClientOrderId === 'function') {
        try {
          const existingOrder = await db.Orders.findByClientOrderId(orderId);
          if (existingOrder && existingOrder.id) {
            clientOrderIdToOrderId.set(orderId, existingOrder.id);
            return existingOrder.id;
          }
        } catch (queryErr) {
          logger.warn('[OfflineFirestoreAdapter] findByClientOrderId failed', queryErr && queryErr.message ? queryErr.message : queryErr);
        }
      }
      return orderId;
    }

    async function applyAddItem(action) {
      const payload = action.payload || {};
      const resolvedOrderId = await resolveOrderId(payload.orderId);
      if (operations.addItem) return operations.addItem({ ...payload, orderId: resolvedOrderId }, action);
      if (db && db.Orders && typeof db.Orders.addItem === 'function') {
        return db.Orders.addItem(resolvedOrderId, payload.item);
      }
      assertOperationsForAction(action, operations, 'addItem');
    }

    async function applyChangeQty(action) {
      const payload = action.payload || {};
      const resolvedOrderId = await resolveOrderId(payload.orderId);
      if (operations.changeQty) return operations.changeQty({ ...payload, orderId: resolvedOrderId }, action);
      if (db && db.Orders && typeof db.Orders.changeQty === 'function') {
        return db.Orders.changeQty(resolvedOrderId, payload.itemId, payload.itemNote || '', Number(payload.delta || 0), payload.lineItemId || '');
      }
      assertOperationsForAction(action, operations, 'changeQty');
    }

    async function applyRemoveItem(action) {
      const payload = action.payload || {};
      const resolvedOrderId = await resolveOrderId(payload.orderId);
      if (operations.removeItem) return operations.removeItem({ ...payload, orderId: resolvedOrderId }, action);
      if (db && db.Orders && typeof db.Orders.removeItem === 'function') {
        return db.Orders.removeItem(resolvedOrderId, payload.itemId, payload.itemNote || '', payload.lineItemId || '');
      }
      assertOperationsForAction(action, operations, 'removeItem');
    }

    async function applyUpdateItem(action) {
      const payload = action.payload || {};
      const resolvedOrderId = await resolveOrderId(payload.orderId);
      if (operations.updateItem) return operations.updateItem({ ...payload, orderId: resolvedOrderId }, action);
      if (db && db.Orders && typeof db.Orders.updateItemNote === 'function') {
        return db.Orders.updateItemNote(resolvedOrderId, payload.itemId, payload.note || '', payload.lineItemId || '');
      }
      assertOperationsForAction(action, operations, 'updateItem');
    }

    async function applyUpdateMeta(action) {
      const payload = action.payload || {};
      const resolvedOrderId = await resolveOrderId(payload.orderId);
      if (operations.updateMeta) return operations.updateMeta({ ...payload, orderId: resolvedOrderId }, action);
      if (db && db.Orders && typeof db.Orders.updateMeta === 'function') {
        return db.Orders.updateMeta(resolvedOrderId, payload.meta || payload);
      }
      assertOperationsForAction(action, operations, 'updateMeta');
    }

    async function applyCloseOrder(action) {
      const payload = action.payload || {};
      const resolvedOrderId = await resolveOrderId(payload.orderId);
      const resolvedPayload = { ...payload, orderId: resolvedOrderId };
      if (operations.createCompletedHistoryFromOfflineOrder) {
        return operations.createCompletedHistoryFromOfflineOrder(buildCompletedHistoryPayload({ ...action, payload: resolvedPayload }), action);
      }
      if (operations.closeOrder) {
        return operations.closeOrder(resolvedPayload, buildPayInfo(resolvedPayload), action);
      }
      if (db && db.Orders && typeof db.Orders.close === 'function' && resolvedOrderId) {
        return db.Orders.close(resolvedOrderId, buildPayInfo(resolvedPayload));
      }
      assertOperationsForAction(action, operations, 'createCompletedHistoryFromOfflineOrder');
    }

    async function applyCancelOrder(action) {
      const payload = action.payload || {};
      const resolvedOrderId = await resolveOrderId(payload.orderId);
      if (operations.cancelOrder) return operations.cancelOrder({ ...payload, orderId: resolvedOrderId }, action);
      if (db && db.Orders && typeof db.Orders.cancel === 'function') {
        return db.Orders.cancel(resolvedOrderId, payload.cancelReason || 'Hủy đơn hàng offline');
      }
      assertOperationsForAction(action, operations, 'cancelOrder');
    }

    async function applyAction(action) {
      if (!action || !action.type) {
        throw new Error('[OfflineFirestoreAdapter] invalid action');
      }

      const existing = await findExistingByClientOrderId(action.clientOrderId, action);
      if (existing) {
        logger.info('[OfflineFirestoreAdapter] skip already synced action', action.clientOrderId, existing.collection || 'custom');
        return { skipped: true, reason: 'already-synced', existing };
      }

      switch (action.type) {
        case 'open_order':
          return applyOpenOrder(action);
        case 'add_item':
          return applyAddItem(action);
        case 'change_qty':
          return applyChangeQty(action);
        case 'remove_item':
          return applyRemoveItem(action);
        case 'update_item':
          return applyUpdateItem(action);
        case 'update_meta':
          return applyUpdateMeta(action);
        case 'close_order':
          return applyCloseOrder(action);
        case 'cancel_order':
          return applyCancelOrder(action);
        default:
          throw new Error(`[OfflineFirestoreAdapter] unsupported action type: ${action.type}`);
      }
    }

    return {
      isOnline,
      findExistingByClientOrderId,
      isActionAlreadySynced,
      applyAction,
      buildCompletedHistoryPayload,
      buildPayInfo,
    };
  }

  function createMemoryFirestoreOperations(options = {}) {
    const history = asArray(options.history).map(cloneJson);
    const orders = asArray(options.orders).map(cloneJson);
    const calls = [];
    let online = options.online !== false;

    function remember(method, payload, action) {
      calls.push({ method, payload: cloneJson(payload), action: cloneJson(action) });
    }

    return {
      async isOnline() { return online; },
      setOnline(value) { online = !!value; },
      async findExistingByClientOrderId(clientOrderId) {
        return findInRowsByClientOrderId(history, clientOrderId) || findInRowsByClientOrderId(orders, clientOrderId) || null;
      },
      async createCompletedHistoryFromOfflineOrder(payload, action) {
        remember('createCompletedHistoryFromOfflineOrder', payload, action);
        if (findInRowsByClientOrderId(history, payload.clientOrderId)) {
          return { skipped: true, reason: 'duplicate-history', clientOrderId: payload.clientOrderId };
        }
        const record = { ...cloneJson(payload), historyId: payload.historyId || `hist_${history.length + 1}` };
        history.push(record);
        return { created: true, collection: 'history', record };
      },
      async openOrder(payload, action) { remember('openOrder', payload, action); orders.push(cloneJson(payload)); return { opened: true }; },
      async addItem(payload, action) { remember('addItem', payload, action); return { added: true }; },
      async changeQty(payload, action) { remember('changeQty', payload, action); return { changed: true }; },
      async removeItem(payload, action) { remember('removeItem', payload, action); return { removed: true }; },
      async updateItem(payload, action) { remember('updateItem', payload, action); return { updated: true }; },
      async updateMeta(payload, action) { remember('updateMeta', payload, action); return { updated: true }; },
      async cancelOrder(payload, action) { remember('cancelOrder', payload, action); return { cancelled: true }; },
      getHistory() { return history.map(cloneJson); },
      getOrders() { return orders.map(cloneJson); },
      getCalls() { return calls.map(cloneJson); },
    };
  }

  const api = {
    createOfflineFirestoreAdapter,
    createMemoryFirestoreOperations,
    findExistingInDbState,
    buildCompletedHistoryPayload,
    buildPayInfo,
  };

  globalScope.XekhoOfflineFirestoreAdapter = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
