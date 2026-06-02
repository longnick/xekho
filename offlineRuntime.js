// ============================================================
// OFFLINE BACKUP RUNTIME - Sprint 19 production with auto sync
// XE KHÔ POS
//
// Purpose:
//   Initialize offline backup queue/status/sync in the browser.
//   Auto sync is enabled by default with 60s interval.
// ============================================================

(function initOfflineRuntime(globalScope) {
  'use strict';

  function defaultLogger() {
    const consoleRef = globalScope.console || {};
    return {
      info: typeof consoleRef.info === 'function' ? consoleRef.info.bind(consoleRef) : function noop() {},
      warn: typeof consoleRef.warn === 'function' ? consoleRef.warn.bind(consoleRef) : function noop() {},
      error: typeof consoleRef.error === 'function' ? consoleRef.error.bind(consoleRef) : function noop() {},
    };
  }

  function resolveDependencies(overrides = {}) {
    const backupLib = overrides.backupLib || globalScope.XekhoOfflineBackup;
    const syncLib = overrides.syncLib || globalScope.XekhoOfflineSync;
    const firestoreAdapterLib = overrides.firestoreAdapterLib || globalScope.XekhoOfflineFirestoreAdapter;

    if (!backupLib || typeof backupLib.createOfflineBackup !== 'function') {
      throw new Error('[OfflineRuntime] XekhoOfflineBackup is required');
    }

    return { backupLib, syncLib, firestoreAdapterLib };
  }

  function createOfflineBackupRuntime(options = {}) {
    const logger = options.logger || defaultLogger();
    const deps = resolveDependencies(options);
    const backup = options.backup || deps.backupLib.createOfflineBackup(options.backupOptions || {});
    const enableSync = options.enableSync === true;
    let adapter = null;
    let sync = null;
    let initializedAt = new Date().toISOString();

    if (enableSync) {
      if (!deps.syncLib || typeof deps.syncLib.createOfflineSync !== 'function') {
        throw new Error('[OfflineRuntime] XekhoOfflineSync is required when enableSync=true');
      }
      if (!deps.firestoreAdapterLib || typeof deps.firestoreAdapterLib.createOfflineFirestoreAdapter !== 'function') {
        throw new Error('[OfflineRuntime] XekhoOfflineFirestoreAdapter is required when enableSync=true');
      }
      adapter = options.adapter || deps.firestoreAdapterLib.createOfflineFirestoreAdapter({
        db: options.db || globalScope.DB || (globalScope.window && globalScope.window.DB) || null,
        operations: options.operations || {},
        logger,
      });
      sync = options.sync || deps.syncLib.createOfflineSync({
        backup,
        adapter,
        logger,
        ...(options.syncOptions || {}),
      });
    }

    async function getSummary() {
      const summary = await backup.getSummary();
      return {
        ...summary,
        online: typeof navigator === 'undefined' || !navigator || navigator.onLine !== false,
        syncEnabled: enableSync,
        syncInProgress: !!(sync && sync.isSyncInProgress && sync.isSyncInProgress()),
        initializedAt,
      };
    }

    async function listPendingActions() {
      return backup.listPendingActions();
    }

    async function listFailedActions() {
      return backup.listFailedActions();
    }

    async function syncNow(runOptions = {}) {
      if (!sync) {
        return {
          ok: false,
          skipped: true,
          reason: 'sync-disabled',
          summary: await getSummary(),
        };
      }
      return sync.syncPendingActions(runOptions);
    }

    function startAutoSync(intervalMs) {
      if (!sync) {
        logger.warn('[OfflineRuntime] Auto sync skipped: sync is disabled');
        return { started: false, skipped: true, reason: 'sync-disabled' };
      }
      return sync.startAutoSync(intervalMs);
    }

    function stopAutoSync() {
      if (!sync) return { stopped: true, skipped: true, reason: 'sync-disabled' };
      return sync.stopAutoSync();
    }

    async function savePendingOrderAction(action) {
      return backup.savePendingOrderAction(action);
    }

    return {
      version: 'sprint-19-production',
      initializedAt,
      syncEnabled: enableSync,
      backup,
      adapter,
      sync,
      getSummary,
      listPendingActions,
      listFailedActions,
      savePendingOrderAction,
      syncNow,
      startAutoSync,
      stopAutoSync,
    };
  }

  function installOfflineBackupRuntime(options = {}) {
    const target = options.target || globalScope;
    if (target.XekhoOfflineBackupRuntime && options.force !== true) {
      return target.XekhoOfflineBackupRuntime;
    }

    const runtime = createOfflineBackupRuntime(options);
    target.XekhoOfflineBackupRuntime = runtime;
    return runtime;
  }

  function autoInstall() {
    try {
      if (globalScope.__XEKHO_OFFLINE_RUNTIME_NO_AUTO_INSTALL__) return;
      const runtime = installOfflineBackupRuntime({ enableSync: true });
      const logger = defaultLogger();
      runtime.startAutoSync(60000);
      logger.info('[OfflineRuntime] Ready', { version: runtime.version, syncEnabled: runtime.syncEnabled, autoSyncIntervalMs: 60000 });
      globalScope.dispatchEvent && globalScope.dispatchEvent(new CustomEvent('xekho:offline-runtime-ready', { detail: { runtime } }));
    } catch (error) {
      defaultLogger().warn('[OfflineRuntime] Auto install failed', error && error.message ? error.message : error);
    }
  }

  const api = {
    createOfflineBackupRuntime,
    installOfflineBackupRuntime,
  };

  globalScope.XekhoOfflineRuntime = api;

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
