// ============================================================
// OFFLINE SYNC ENGINE - Sprint 2 foundation
// XE KHÔ POS
//
// Purpose:
//   Sync pending POS offline backup actions when Firebase/server is back.
//   This file is adapter-based and does NOT talk to Firestore directly yet.
//   Live Firestore adapter and POS flow integration come in later sprints.
// ============================================================

(function initOfflineSync(globalScope) {
  'use strict';

  const DEFAULT_INTERVAL_MS = 60 * 1000;
  const DEFAULT_MAX_ACTIONS_PER_RUN = 25;
  const DEFAULT_BASE_BACKOFF_MS = 5 * 1000;
  const DEFAULT_MAX_BACKOFF_MS = 5 * 60 * 1000;

  function nowMs() {
    return Date.now();
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, Math.max(0, Number(ms || 0))));
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

  function computeBackoffMs(action, options = {}) {
    const retryCount = Math.max(0, Number(action && action.retryCount || 0));
    const base = Math.max(0, Number(options.baseBackoffMs || DEFAULT_BASE_BACKOFF_MS));
    const max = Math.max(base, Number(options.maxBackoffMs || DEFAULT_MAX_BACKOFF_MS));
    const exponential = base * Math.pow(2, Math.max(0, retryCount - 1));
    return Math.min(max, exponential);
  }

  function shouldRetryAction(action, options = {}) {
    if (!action) return false;
    const status = String(action.status || '').toLowerCase();
    if (status !== 'pending' && status !== 'failed') return false;

    const maxRetryCount = Math.max(1, Number(action.maxRetryCount || options.maxRetryCount || 10));
    if (Number(action.retryCount || 0) >= maxRetryCount) return false;

    if (status === 'pending') return true;

    const updatedAtMs = Date.parse(action.updatedAt || action.createdAt || '') || 0;
    const waitMs = computeBackoffMs(action, options);
    return nowMs() - updatedAtMs >= waitMs;
  }

  function sortActionsForSync(actions) {
    return (actions || [])
      .slice()
      .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  }

  function assertBackupApi(backup) {
    const required = [
      'listActions',
      'markSyncing',
      'markSynced',
      'markFailed',
      'resetForRetry',
      'getSummary',
    ];
    required.forEach(name => {
      if (!backup || typeof backup[name] !== 'function') {
        throw new Error(`[OfflineSync] backup API missing method: ${name}`);
      }
    });
  }

  function assertAdapter(adapter) {
    if (!adapter || typeof adapter.applyAction !== 'function') {
      throw new Error('[OfflineSync] adapter.applyAction(action) is required');
    }
  }

  function createOfflineSync(options = {}) {
    const backup = options.backup;
    const adapter = options.adapter;
    const logger = options.logger || defaultLogger();
    const maxActionsPerRun = Math.max(1, Number(options.maxActionsPerRun || DEFAULT_MAX_ACTIONS_PER_RUN));
    const retryOptions = {
      maxRetryCount: options.maxRetryCount,
      baseBackoffMs: options.baseBackoffMs,
      maxBackoffMs: options.maxBackoffMs,
    };

    assertBackupApi(backup);
    assertAdapter(adapter);

    let syncInProgress = false;
    let timerId = null;
    let lastRun = null;

    async function isOnline() {
      if (typeof adapter.isOnline === 'function') {
        return adapter.isOnline();
      }
      if (typeof navigator !== 'undefined' && navigator && navigator.onLine === false) {
        return false;
      }
      return true;
    }

    async function isAlreadySynced(action) {
      if (typeof adapter.isActionAlreadySynced === 'function') {
        return !!(await adapter.isActionAlreadySynced(action));
      }
      if (typeof adapter.findExistingByClientOrderId === 'function') {
        const found = await adapter.findExistingByClientOrderId(action.clientOrderId, action);
        return !!found;
      }
      return false;
    }

    async function syncOneAction(action) {
      if (!action || !action.id) {
        return { actionId: action && action.id, status: 'skipped', reason: 'invalid-action' };
      }

      if (!(await isOnline())) {
        return { actionId: action.id, status: 'skipped', reason: 'offline' };
      }

      if (!shouldRetryAction(action, retryOptions)) {
        return { actionId: action.id, status: 'skipped', reason: 'backoff-or-max-retry' };
      }

      await backup.markSyncing(action.id);

      try {
        const alreadySynced = await isAlreadySynced(action);
        if (alreadySynced) {
          const synced = await backup.markSynced(action.id);
          return { actionId: action.id, status: 'synced', reason: 'already-synced', action: synced };
        }

        const result = await adapter.applyAction(action);
        const synced = await backup.markSynced(action.id);
        return { actionId: action.id, status: 'synced', reason: 'applied', result, action: synced };
      } catch (error) {
        const failed = await backup.markFailed(action.id, error);
        logger.warn('[OfflineSync] action sync failed', action.id, normalizeError(error));
        return { actionId: action.id, status: 'failed', error: normalizeError(error), action: failed };
      }
    }

    async function syncPendingActions(runOptions = {}) {
      if (syncInProgress) {
        return {
          ok: false,
          skipped: true,
          reason: 'sync-in-progress',
          results: [],
          summary: await backup.getSummary(),
        };
      }

      syncInProgress = true;
      const startedAt = new Date().toISOString();
      const results = [];

      try {
        if (!(await isOnline())) {
          const summary = await backup.getSummary();
          lastRun = { startedAt, finishedAt: new Date().toISOString(), ok: false, reason: 'offline', results, summary };
          return lastRun;
        }

        const includeFailed = runOptions.includeFailed !== false;
        const allRows = await backup.listActions();
        const candidates = sortActionsForSync(allRows)
          .filter(action => action.status === 'pending' || (includeFailed && action.status === 'failed'))
          .filter(action => shouldRetryAction(action, retryOptions))
          .slice(0, Math.max(1, Number(runOptions.maxActionsPerRun || maxActionsPerRun)));

        for (const action of candidates) {
          results.push(await syncOneAction(action));
        }

        const summary = await backup.getSummary();
        lastRun = { startedAt, finishedAt: new Date().toISOString(), ok: true, results, summary };
        return lastRun;
      } finally {
        syncInProgress = false;
      }
    }

    function startAutoSync(intervalMs = DEFAULT_INTERVAL_MS) {
      stopAutoSync();
      const delay = Math.max(1000, Number(intervalMs || DEFAULT_INTERVAL_MS));
      timerId = globalScope.setInterval(() => {
        syncPendingActions().catch(error => logger.error('[OfflineSync] auto sync failed', normalizeError(error)));
      }, delay);

      if (globalScope.addEventListener) {
        globalScope.addEventListener('online', handleOnline);
      }

      return { started: true, intervalMs: delay };
    }

    function stopAutoSync() {
      if (timerId !== null) {
        globalScope.clearInterval(timerId);
        timerId = null;
      }
      if (globalScope.removeEventListener) {
        globalScope.removeEventListener('online', handleOnline);
      }
      return { stopped: true };
    }

    function handleOnline() {
      syncPendingActions().catch(error => logger.error('[OfflineSync] online-triggered sync failed', normalizeError(error)));
    }

    function isSyncInProgress() {
      return syncInProgress;
    }

    function getLastRun() {
      return lastRun;
    }

    return {
      syncOneAction,
      syncPendingActions,
      startAutoSync,
      stopAutoSync,
      isSyncInProgress,
      getLastRun,
      shouldRetryAction: action => shouldRetryAction(action, retryOptions),
      computeBackoffMs: action => computeBackoffMs(action, retryOptions),
    };
  }

  function createMemorySyncAdapter(options = {}) {
    const syncedClientOrderIds = new Set(options.syncedClientOrderIds || []);
    const appliedActions = [];
    let online = options.online !== false;
    const failActionIds = new Set(options.failActionIds || []);
    const failClientOrderIds = new Set(options.failClientOrderIds || []);
    const delayMs = Math.max(0, Number(options.delayMs || 0));

    return {
      async isOnline() {
        return online;
      },
      setOnline(value) {
        online = !!value;
      },
      async isActionAlreadySynced(action) {
        return syncedClientOrderIds.has(action.clientOrderId);
      },
      async applyAction(action) {
        if (delayMs) await sleep(delayMs);
        if (failActionIds.has(action.id) || failClientOrderIds.has(action.clientOrderId)) {
          throw new Error(`Simulated sync failure for ${action.id}`);
        }
        syncedClientOrderIds.add(action.clientOrderId);
        appliedActions.push(JSON.parse(JSON.stringify(action)));
        return { applied: true, clientOrderId: action.clientOrderId, type: action.type };
      },
      getAppliedActions() {
        return appliedActions.map(action => JSON.parse(JSON.stringify(action)));
      },
      getSyncedClientOrderIds() {
        return Array.from(syncedClientOrderIds);
      },
    };
  }

  const api = {
    createOfflineSync,
    createMemorySyncAdapter,
    shouldRetryAction,
    computeBackoffMs,
    constants: {
      DEFAULT_INTERVAL_MS,
      DEFAULT_MAX_ACTIONS_PER_RUN,
      DEFAULT_BASE_BACKOFF_MS,
      DEFAULT_MAX_BACKOFF_MS,
    },
  };

  globalScope.XekhoOfflineSync = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
