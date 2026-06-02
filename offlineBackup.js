// ============================================================
// OFFLINE BACKUP QUEUE - Sprint 1 foundation
// XE KHÔ POS
//
// Purpose:
//   Store POS order actions locally when Firebase/server is offline.
//   This file does NOT sync to Firestore yet. Sync engine comes later.
//
// Safe to load in browser as a classic script. Also exports CommonJS helpers
// for Node verification scripts.
// ============================================================

(function initOfflineBackup(globalScope) {
  'use strict';

  const DB_NAME = 'xekho-pos-offline-backup';
  const DB_VERSION = 1;
  const STORE_ACTIONS = 'pendingOrderActions';
  const DEFAULT_MAX_RETRY_COUNT = 10;
  const VALID_STATUSES = new Set(['pending', 'syncing', 'synced', 'failed']);
  const VALID_ACTION_TYPES = new Set([
    'open_order',
    'add_item',
    'change_qty',
    'remove_item',
    'update_item',
    'update_meta',
    'close_order',
    'cancel_order',
  ]);

  function nowIso() {
    return new Date().toISOString();
  }

  function randomToken() {
    if (globalScope.crypto && typeof globalScope.crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(8);
      globalScope.crypto.getRandomValues(bytes);
      return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return Math.random().toString(36).slice(2, 10);
  }

  function makeClientOrderId(prefix = 'cko') {
    return `${prefix}_${Date.now()}_${randomToken()}`;
  }

  function makeActionId(prefix = 'offline_action') {
    return `${prefix}_${Date.now()}_${randomToken()}`;
  }

  function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function cloneJson(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeError(error) {
    if (!error) return '';
    if (typeof error === 'string') return error;
    return String(error.message || error.code || error.name || error);
  }

  function isOfflineOrServerError(error) {
    const message = normalizeError(error).toLowerCase();
    const code = String(error && error.code || '').toLowerCase();

    if (typeof navigator !== 'undefined' && navigator && navigator.onLine === false) {
      return true;
    }

    return [message, code].some(text => {
      if (!text) return false;
      return text.includes('offline') ||
        text.includes('network') ||
        text.includes('unavailable') ||
        text.includes('deadline-exceeded') ||
        text.includes('timeout') ||
        text.includes('failed to fetch') ||
        text.includes('firebaseerror') ||
        text.includes('server') ||
        text.includes('503') ||
        text.includes('504');
    });
  }

  function normalizeStatus(status) {
    const clean = String(status || 'pending').trim().toLowerCase();
    return VALID_STATUSES.has(clean) ? clean : 'pending';
  }

  function normalizeAction(input) {
    if (!isPlainObject(input)) {
      throw new Error('[OfflineBackup] action must be an object');
    }

    const type = String(input.type || '').trim();
    if (!VALID_ACTION_TYPES.has(type)) {
      throw new Error(`[OfflineBackup] unsupported action type: ${type || '(empty)'}`);
    }

    const payload = isPlainObject(input.payload) ? cloneJson(input.payload) : {};
    const createdAt = input.createdAt || nowIso();
    const updatedAt = input.updatedAt || createdAt;
    const clientOrderId = String(input.clientOrderId || payload.clientOrderId || makeClientOrderId()).trim();

    return {
      id: String(input.id || makeActionId()).trim(),
      clientOrderId,
      type,
      payload: {
        ...payload,
        clientOrderId,
      },
      status: normalizeStatus(input.status),
      retryCount: Math.max(0, Number(input.retryCount || 0)),
      maxRetryCount: Math.max(1, Number(input.maxRetryCount || DEFAULT_MAX_RETRY_COUNT)),
      createdAt,
      updatedAt,
      lastError: String(input.lastError || ''),
      syncedAt: input.syncedAt || null,
      deviceId: String(input.deviceId || getOrCreateDeviceId()).trim(),
      schemaVersion: 1,
    };
  }

  function getOrCreateDeviceId(storageKey = 'xekho_pos_device_id') {
    try {
      if (!globalScope.localStorage) return `device_${randomToken()}`;
      const existing = globalScope.localStorage.getItem(storageKey);
      if (existing) return existing;
      const next = `device_${Date.now()}_${randomToken()}`;
      globalScope.localStorage.setItem(storageKey, next);
      return next;
    } catch (_) {
      return `device_${Date.now()}_${randomToken()}`;
    }
  }

  function createIndexedDbStorage(options = {}) {
    const indexedDb = options.indexedDB || globalScope.indexedDB;
    const dbName = options.dbName || DB_NAME;
    const storeName = options.storeName || STORE_ACTIONS;
    const dbVersion = Number(options.dbVersion || DB_VERSION);

    if (!indexedDb) {
      throw new Error('[OfflineBackup] IndexedDB is not available in this browser');
    }

    let dbPromise = null;

    function openDb() {
      if (dbPromise) return dbPromise;
      dbPromise = new Promise((resolve, reject) => {
        const request = indexedDb.open(dbName, dbVersion);

        request.onupgradeneeded = event => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            store.createIndex('status', 'status', { unique: false });
            store.createIndex('clientOrderId', 'clientOrderId', { unique: false });
            store.createIndex('createdAt', 'createdAt', { unique: false });
            store.createIndex('type', 'type', { unique: false });
          }
        };

        request.onsuccess = event => resolve(event.target.result);
        request.onerror = () => reject(request.error || new Error('[OfflineBackup] Cannot open IndexedDB'));
        request.onblocked = () => reject(new Error('[OfflineBackup] IndexedDB open blocked by another tab'));
      });
      return dbPromise;
    }

    function withStore(mode, callback) {
      return openDb().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        let callbackResult;

        tx.oncomplete = () => resolve(callbackResult);
        tx.onerror = () => reject(tx.error || new Error('[OfflineBackup] IndexedDB transaction failed'));
        tx.onabort = () => reject(tx.error || new Error('[OfflineBackup] IndexedDB transaction aborted'));

        try {
          callbackResult = callback(store);
        } catch (err) {
          reject(err);
        }
      }));
    }

    function promisifyRequest(request) {
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('[OfflineBackup] IndexedDB request failed'));
      });
    }

    return {
      async put(action) {
        await withStore('readwrite', store => store.put(cloneJson(action)));
        return action;
      },

      async get(id) {
        return withStore('readonly', store => promisifyRequest(store.get(String(id))));
      },

      async list() {
        const rows = await withStore('readonly', store => promisifyRequest(store.getAll()));
        return (rows || []).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
      },

      async delete(id) {
        await withStore('readwrite', store => store.delete(String(id)));
        return true;
      },

      async clear() {
        await withStore('readwrite', store => store.clear());
        return true;
      },
    };
  }

  function createMemoryStorage(initialRows = []) {
    const rows = new Map();
    initialRows.forEach(row => rows.set(String(row.id), cloneJson(row)));

    return {
      async put(action) {
        rows.set(String(action.id), cloneJson(action));
        return action;
      },
      async get(id) {
        const found = rows.get(String(id));
        return found ? cloneJson(found) : undefined;
      },
      async list() {
        return Array.from(rows.values())
          .map(cloneJson)
          .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
      },
      async delete(id) {
        rows.delete(String(id));
        return true;
      },
      async clear() {
        rows.clear();
        return true;
      },
    };
  }

  function createOfflineBackup(options = {}) {
    const storage = options.storage || createIndexedDbStorage(options);

    async function savePendingOrderAction(actionInput) {
      const action = normalizeAction({ ...actionInput, status: actionInput.status || 'pending' });
      await storage.put(action);
      return action;
    }

    async function listActions(filter = {}) {
      const rows = await storage.list();
      return rows.filter(row => {
        if (filter.status && row.status !== filter.status) return false;
        if (filter.type && row.type !== filter.type) return false;
        if (filter.clientOrderId && row.clientOrderId !== filter.clientOrderId) return false;
        return true;
      });
    }

    async function listPendingActions() {
      return listActions({ status: 'pending' });
    }

    async function listFailedActions() {
      return listActions({ status: 'failed' });
    }

    async function updateAction(id, patch) {
      const existing = await storage.get(id);
      if (!existing) throw new Error(`[OfflineBackup] action not found: ${id}`);
      const next = normalizeAction({
        ...existing,
        ...patch,
        id: existing.id,
        clientOrderId: existing.clientOrderId,
        payload: patch.payload ? { ...existing.payload, ...patch.payload } : existing.payload,
        updatedAt: nowIso(),
      });
      await storage.put(next);
      return next;
    }

    async function markSyncing(id) {
      return updateAction(id, { status: 'syncing', lastError: '' });
    }

    async function markSynced(id) {
      return updateAction(id, { status: 'synced', lastError: '', syncedAt: nowIso() });
    }

    async function markFailed(id, error) {
      const existing = await storage.get(id);
      if (!existing) throw new Error(`[OfflineBackup] action not found: ${id}`);
      return updateAction(id, {
        status: 'failed',
        retryCount: Number(existing.retryCount || 0) + 1,
        lastError: normalizeError(error).slice(0, 500),
      });
    }

    async function resetForRetry(id) {
      return updateAction(id, { status: 'pending', lastError: '' });
    }

    async function clearSynced() {
      const rows = await listActions({ status: 'synced' });
      for (const row of rows) {
        await storage.delete(row.id);
      }
      return rows.length;
    }

    async function getSummary() {
      const rows = await storage.list();
      return rows.reduce((acc, row) => {
        acc.total += 1;
        acc[row.status] = (acc[row.status] || 0) + 1;
        return acc;
      }, { total: 0, pending: 0, syncing: 0, synced: 0, failed: 0 });
    }

    return {
      savePendingOrderAction,
      listActions,
      listPendingActions,
      listFailedActions,
      markSyncing,
      markSynced,
      markFailed,
      resetForRetry,
      clearSynced,
      getSummary,
      makeClientOrderId,
      makeActionId,
      isOfflineOrServerError,
    };
  }

  const api = {
    createOfflineBackup,
    createIndexedDbStorage,
    createMemoryStorage,
    makeClientOrderId,
    makeActionId,
    isOfflineOrServerError,
    normalizeAction,
    constants: {
      DB_NAME,
      DB_VERSION,
      STORE_ACTIONS,
      VALID_ACTION_TYPES: Array.from(VALID_ACTION_TYPES),
      VALID_STATUSES: Array.from(VALID_STATUSES),
    },
  };

  globalScope.XekhoOfflineBackup = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
