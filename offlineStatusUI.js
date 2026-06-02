// ============================================================
// OFFLINE STATUS UI - Sprint 19 production UI
// XE KHÔ POS
//
// Purpose:
//   Show POS offline backup queue status using window.XekhoOfflineBackupRuntime.
//   Auto sync is enabled. Provides guarded manual sync for retry of failed actions.
// ============================================================

(function initOfflineStatusUI(globalScope) {
  'use strict';

  const BADGE_ID = 'xekho-offline-backup-badge';
  const PANEL_ID = 'xekho-offline-backup-panel';
  const STYLE_ID = 'xekho-offline-backup-style';

  function defaultLogger() {
    const consoleRef = globalScope.console || {};
    return {
      info: typeof consoleRef.info === 'function' ? consoleRef.info.bind(consoleRef) : function noop() {},
      warn: typeof consoleRef.warn === 'function' ? consoleRef.warn.bind(consoleRef) : function noop() {},
      error: typeof consoleRef.error === 'function' ? consoleRef.error.bind(consoleRef) : function noop() {},
    };
  }

  function normalizeSummary(summary = {}) {
    const pending = Number(summary.pending || 0);
    const failed = Number(summary.failed || 0);
    const synced = Number(summary.synced || 0);
    const total = Number(summary.total || pending + failed + synced || 0);
    const online = summary.online !== false;
    const syncEnabled = summary.syncEnabled === true;
    return {
      ...summary,
      pending,
      failed,
      synced,
      total,
      online,
      syncEnabled,
      syncInProgress: summary.syncInProgress === true,
    };
  }

  function getBadgeState(summary) {
    const data = normalizeSummary(summary);
    if (data.failed > 0) return 'danger';
    if (!data.online) return 'offline';
    if (data.pending > 0) return 'warning';
    return 'ok';
  }

  function formatBadgeText(summary) {
    const data = normalizeSummary(summary);
    if (data.failed > 0) return `Offline: ${data.failed} lỗi`;
    if (data.pending > 0) return `Offline: ${data.pending} chờ`;
    if (!data.online) return 'Offline: mất mạng';
    return 'Offline: OK';
  }

  function formatPanelText(summary) {
    const data = normalizeSummary(summary);
    return {
      title: 'POS Offline Backup',
      network: data.online ? 'Online' : 'Offline / mất mạng',
      sync: data.syncEnabled ? (data.syncInProgress ? 'Đang đồng bộ...' : 'Auto sync đang chạy') : 'Sync đang tắt',
      counts: `Pending: ${data.pending} · Failed: ${data.failed} · Synced: ${data.synced} · Total: ${data.total}`,
    };
  }

  function ensureStyle(doc) {
    if (!doc || doc.getElementById(STYLE_ID)) return;
    const style = doc.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${BADGE_ID} {
        min-width: 86px;
        height: 34px;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 999px;
        padding: 0 10px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 800;
        color: var(--text, #f8fafc);
        background: rgba(15,23,42,.72);
        cursor: pointer;
        white-space: nowrap;
      }
      #${BADGE_ID}[data-state="ok"] { color: #22c55e; border-color: rgba(34,197,94,.35); }
      #${BADGE_ID}[data-state="warning"] { color: #f59e0b; border-color: rgba(245,158,11,.45); }
      #${BADGE_ID}[data-state="offline"] { color: #f97316; border-color: rgba(249,115,22,.45); }
      #${BADGE_ID}[data-state="danger"] { color: #ef4444; border-color: rgba(239,68,68,.55); }
      #${PANEL_ID} {
        position: fixed;
        top: 74px;
        right: 14px;
        z-index: 99999;
        width: min(360px, calc(100vw - 28px));
        border: 1px solid rgba(148,163,184,.28);
        border-radius: 18px;
        background: rgba(15,23,42,.96);
        color: #e5e7eb;
        box-shadow: 0 18px 60px rgba(0,0,0,.45);
        padding: 14px;
        display: none;
      }
      #${PANEL_ID}.open { display: block; }
      #${PANEL_ID} .offline-panel-title { font-size: 15px; font-weight: 900; margin-bottom: 8px; }
      #${PANEL_ID} .offline-panel-row { font-size: 12px; color: #cbd5e1; margin: 7px 0; line-height: 1.35; }
      #${PANEL_ID} .offline-panel-note { font-size: 11px; color: #94a3b8; margin-top: 10px; line-height: 1.35; }
      #${PANEL_ID} .offline-panel-actions { display:flex; gap:8px; margin-top: 12px; flex-wrap: wrap; }
      #${PANEL_ID} button { border:0; border-radius: 10px; padding: 8px 10px; font-size: 12px; font-weight: 800; cursor: pointer; }
      #${PANEL_ID} .btn-secondary { background: rgba(148,163,184,.18); color: #e5e7eb; }
      #${PANEL_ID} .btn-primary { background: #7c3aed; color: #fff; }
      #${PANEL_ID} .btn-sync { background: #f59e0b; color: #1e1b18; }
      #${PANEL_ID} .btn-sync.confirmed { background: #ef4444; color: #fff; }
      #${PANEL_ID} .offline-sync-status { font-size: 11px; color: #93c5fd; margin-top: 7px; min-height: 14px; }
      #${PANEL_ID} .offline-panel-confirm { display: none; margin-top: 10px; padding: 10px; border: 1px solid rgba(245,158,11,.45); border-radius: 12px; background: rgba(45,21,0,.65); }
      #${PANEL_ID} .offline-panel-confirm.open { display: block; }
      #${PANEL_ID} .offline-panel-confirm p { font-size: 12px; color: #fde68a; margin: 0 0 8px 0; line-height: 1.4; }
    `;
    doc.head.appendChild(style);
  }

  function createBadge(doc) {
    let badge = doc.getElementById(BADGE_ID);
    if (badge) return badge;
    badge = doc.createElement('button');
    badge.id = BADGE_ID;
    badge.type = 'button';
    badge.title = 'POS Offline Backup';
    badge.setAttribute('data-state', 'warning');
    badge.textContent = 'Offline: ...';

    const headerActions = doc.querySelector('.header-actions') || doc.body;
    headerActions.insertBefore(badge, headerActions.firstChild || null);
    return badge;
  }

  function createPanel(doc) {
    let panel = doc.getElementById(PANEL_ID);
    if (panel) return panel;
    panel = doc.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="offline-panel-title">POS Offline Backup</div>
      <div class="offline-panel-row" data-role="network"></div>
      <div class="offline-panel-row" data-role="sync"></div>
      <div class="offline-panel-row" data-role="counts"></div>
      <div class="offline-panel-row" data-role="updated"></div>
      <div class="offline-panel-note">Auto sync đang chạy (60s). Nếu có lỗi, dùng "Đồng bộ thủ công" để retry.</div>
      <div class="offline-panel-confirm" data-role="sync-confirm">
        <p>⚠️ <strong>Đồng bộ thủ công:</strong> retry các action bị lỗi lên Firestore.</p>
        <button class="btn-sync confirmed" type="button" data-action="confirm-sync">Xác nhận đồng bộ</button>
      </div>
      <div class="offline-sync-status" data-role="sync-status"></div>
      <div class="offline-panel-actions">
        <button class="btn-primary" type="button" data-action="refresh">Cập nhật</button>
        <button class="btn-sync" type="button" data-action="guarded-sync">Đồng bộ thủ công</button>
        <button class="btn-secondary" type="button" data-action="close">Đóng</button>
      </div>
    `;
    doc.body.appendChild(panel);
    return panel;
  }

  async function readSummary(runtime) {
    if (!runtime || typeof runtime.getSummary !== 'function') {
      return normalizeSummary({ online: typeof navigator === 'undefined' || !navigator || navigator.onLine !== false, pending: 0, failed: 0, synced: 0, total: 0, syncEnabled: false });
    }
    return normalizeSummary(await runtime.getSummary());
  }

  function formatLastUpdated(now = new Date()) {
    const pad = value => String(value).padStart(2, '0');
    return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }

  function redactLargePayload(payload = {}) {
    const clean = JSON.parse(JSON.stringify(payload || {}));
    if (Array.isArray(clean.items) && clean.items.length > 10) {
      clean.items = clean.items.slice(0, 10);
      clean.itemsTruncated = true;
    }
    return clean;
  }

  function summarizeQueuedAction(action = {}) {
    const payload = action.payload || {};
    return {
      id: action.id || '',
      type: action.type || '',
      status: action.status || '',
      clientOrderId: action.clientOrderId || payload.clientOrderId || '',
      deviceId: action.deviceId || payload.deviceId || '',
      createdAt: action.createdAt || payload.offlineCreatedAt || '',
      retryCount: Number(action.retryCount || 0),
      lastError: action.lastError || '',
      payload: redactLargePayload(payload),
    };
  }

  async function buildQueueReviewReport(runtime) {
    const activeRuntime = runtime || globalScope.XekhoOfflineBackupRuntime;
    const summary = await readSummary(activeRuntime);
    const pending = activeRuntime && typeof activeRuntime.listPendingActions === 'function'
      ? await activeRuntime.listPendingActions()
      : [];
    const failed = activeRuntime && typeof activeRuntime.listFailedActions === 'function'
      ? await activeRuntime.listFailedActions()
      : [];
    return {
      title: 'XE KHÔ Offline Queue Review',
      generatedAt: new Date().toISOString(),
      mode: 'queue-review-read-only',
      sideEffects: {
        wrapsDbOrders: false,
        enqueuesOfflineActions: false,
        writesFirestore: false,
        enablesSync: false,
      },
      summary,
      pending: pending.map(summarizeQueuedAction),
      failed: failed.map(summarizeQueuedAction),
    };
  }

  function formatQueueReviewReport(report) {
    const lines = [
      report.title,
      `Generated: ${report.generatedAt}`,
      `Mode: ${report.mode}`,
      `Side effects: ${report.sideEffects && report.sideEffects.writesFirestore ? 'writes Firestore' : 'no DB wrap, no enqueue, no Firestore, no sync'}`,
      '',
      '## Summary',
      JSON.stringify(report.summary, null, 2),
    ];

    if (Array.isArray(report.pending)) {
      lines.push('', `## Pending actions (${report.pending.length})`, JSON.stringify(report.pending, null, 2));
    }
    if (Array.isArray(report.failed)) {
      lines.push('', `## Failed actions (${report.failed.length})`, JSON.stringify(report.failed, null, 2));
    }
    if (report.syncResult) {
      lines.push('', '## Sync result', JSON.stringify(report.syncResult, null, 2));
    }
    return lines.join('\n');
  }

  function renderSummary(doc, summary, options = {}) {
    const badge = doc.getElementById(BADGE_ID);
    const panel = doc.getElementById(PANEL_ID);
    const state = getBadgeState(summary);
    if (badge) {
      badge.setAttribute('data-state', state);
      badge.textContent = formatBadgeText(summary);
      badge.title = formatPanelText(summary).counts;
    }
    if (panel) {
      const text = formatPanelText(summary);
      const network = panel.querySelector('[data-role="network"]');
      const sync = panel.querySelector('[data-role="sync"]');
      const counts = panel.querySelector('[data-role="counts"]');
      const updated = panel.querySelector('[data-role="updated"]');
      if (network) network.textContent = `Mạng: ${text.network}`;
      if (sync) sync.textContent = `Đồng bộ: ${text.sync}`;
      if (counts) counts.textContent = text.counts;
      if (updated) updated.textContent = `Cập nhật lần cuối: ${options.updatedAtText || formatLastUpdated()}`;
    }
  }

  function installOfflineStatusUI(options = {}) {
    const doc = options.document || globalScope.document;
    const runtime = options.runtime || globalScope.XekhoOfflineBackupRuntime;
    const logger = options.logger || defaultLogger();
    const intervalMs = Number(options.intervalMs == null ? 5000 : options.intervalMs);
    if (!doc || !doc.body) return { installed: false, reason: 'document-not-ready' };

    ensureStyle(doc);
    const badge = createBadge(doc);
    const panel = createPanel(doc);

    async function refresh() {
      const refreshButton = panel.querySelector('[data-action="refresh"]');
      try {
        if (refreshButton) {
          refreshButton.disabled = true;
          refreshButton.textContent = 'Đang cập nhật...';
          refreshButton.setAttribute('aria-busy', 'true');
        }
        const summary = await readSummary(runtime || globalScope.XekhoOfflineBackupRuntime);
        renderSummary(doc, summary);
        return summary;
      } catch (error) {
        logger.warn('[OfflineStatusUI] refresh failed', error && error.message ? error.message : error);
        renderSummary(doc, { failed: 1, pending: 0, synced: 0, total: 1, online: true, syncEnabled: false });
        return null;
      } finally {
        if (refreshButton) {
          refreshButton.disabled = false;
          refreshButton.textContent = 'Cập nhật';
          refreshButton.removeAttribute('aria-busy');
        }
      }
    }

    function showSyncConfirm() {
      const confirmBox = panel.querySelector('[data-role="sync-confirm"]');
      if (confirmBox) confirmBox.classList.add('open');
    }

    function hideSyncConfirm() {
      const confirmBox = panel.querySelector('[data-role="sync-confirm"]');
      if (confirmBox) confirmBox.classList.remove('open');
    }

    async function executeGuardedSync() {
      const syncButton = panel.querySelector('[data-action="guarded-sync"]');
      const confirmButton = panel.querySelector('[data-action="confirm-sync"]');
      const syncStatus = panel.querySelector('[data-role="sync-status"]');
      const reportBox = panel.querySelector('[data-role="queue-report"]');
      try {
        if (syncButton) {
          syncButton.disabled = true;
          syncButton.textContent = 'Đang đồng bộ...';
        }
        if (confirmButton) {
          confirmButton.disabled = true;
          confirmButton.textContent = 'Đang đồng bộ...';
        }
        hideSyncConfirm();
        if (syncStatus) syncStatus.textContent = 'Đang gửi pending actions lên Firestore...';

        const activeRuntime = runtime || globalScope.XekhoOfflineBackupRuntime;
        const syncLib = globalScope.XekhoOfflineSync;
        const firestoreAdapterLib = globalScope.XekhoOfflineFirestoreAdapter;
        const db = (globalScope.DB || (globalScope.window && globalScope.window.DB)) || null;

        if (!activeRuntime || !activeRuntime.backup) throw new Error('Runtime backup not available');
        if (!syncLib || typeof syncLib.createOfflineSync !== 'function') throw new Error('XekhoOfflineSync not available');
        if (!firestoreAdapterLib || typeof firestoreAdapterLib.createOfflineFirestoreAdapter !== 'function') throw new Error('XekhoOfflineFirestoreAdapter not available');

        const adapter = firestoreAdapterLib.createOfflineFirestoreAdapter({
          db,
          operations: {},
          logger,
        });
        const syncEngine = syncLib.createOfflineSync({
          backup: activeRuntime.backup,
          adapter,
          logger,
        });

        const result = await syncEngine.syncPendingActions({ maxActionsPerRun: 50 });
        const summary = await readSummary(activeRuntime);

        const syncReport = {
          title: 'XE KHÔ Manual Sync Result',
          generatedAt: new Date().toISOString(),
          mode: 'manual-guarded-sync',
          sideEffects: {
            wrapsDbOrders: false,
            enqueuesOfflineActions: false,
            writesFirestore: true,
            enablesSync: false,
          },
          syncResult: {
            ok: result.ok,
            skipped: result.skipped || false,
            reason: result.reason || '',
            results: result.results || [],
          },
          summary,
        };
        const text = formatQueueReviewReport(syncReport);
        if (reportBox) {
          reportBox.value = text;
          reportBox.classList.add('open');
        }

        const syncedCount = (result.results || []).filter(r => r.status === 'synced').length;
        const failedCount = (result.results || []).filter(r => r.status === 'failed').length;
        const skippedCount = (result.results || []).filter(r => r.status === 'skipped').length;

        if (result.skipped) {
          if (syncStatus) syncStatus.textContent = `Bỏ qua: ${result.reason}`;
        } else {
          if (syncStatus) syncStatus.textContent = `Đồng bộ xong: ${syncedCount} thành công · ${failedCount} lỗi · ${skippedCount} bỏ qua`;
        }

        await refresh();
        return syncReport;
      } catch (error) {
        logger.warn('[OfflineStatusUI] guarded sync failed', error && error.message ? error.message : error);
        if (syncStatus) syncStatus.textContent = `Lỗi đồng bộ: ${error && error.message ? error.message : error}`;
        return null;
      } finally {
        if (syncButton) {
          syncButton.disabled = false;
          syncButton.textContent = 'Đồng bộ thủ công';
        }
        if (confirmButton) {
          confirmButton.disabled = false;
          confirmButton.textContent = 'Xác nhận đồng bộ 1 lần';
        }
      }
    }

    badge.addEventListener('click', async () => {
      panel.classList.toggle('open');
      await refresh();
    });

    panel.addEventListener('click', async event => {
      const target = event.target && event.target.closest ? event.target.closest('[data-action]') : event.target;
      const action = target && target.getAttribute && target.getAttribute('data-action');
      if (!action) return;
      event.preventDefault && event.preventDefault();
      event.stopPropagation && event.stopPropagation();
      if (action === 'close') panel.classList.remove('open');
      if (action === 'refresh') await refresh();
      if (action === 'guarded-sync') showSyncConfirm();
      if (action === 'confirm-sync') await executeGuardedSync();
    });

    globalScope.addEventListener && globalScope.addEventListener('online', refresh);
    globalScope.addEventListener && globalScope.addEventListener('offline', refresh);
    globalScope.addEventListener && globalScope.addEventListener('xekho:offline-runtime-ready', refresh);

    const timer = intervalMs > 0 ? globalScope.setInterval(refresh, intervalMs) : null;
    refresh();

    const controller = {
      installed: true,
      refresh,
      showSyncConfirm,
      executeGuardedSync,
      destroy() {
        if (timer) globalScope.clearInterval(timer);
        badge.remove && badge.remove();
        panel.remove && panel.remove();
      },
    };
    globalScope.XekhoOfflineStatusUIController = controller;
    return controller;
  }

  function autoInstall() {
    try {
      if (globalScope.__XEKHO_OFFLINE_STATUS_UI_NO_AUTO_INSTALL__) return;
      installOfflineStatusUI();
    } catch (error) {
      defaultLogger().warn('[OfflineStatusUI] Auto install failed', error && error.message ? error.message : error);
    }
  }

  const api = {
    normalizeSummary,
    getBadgeState,
    formatBadgeText,
    formatPanelText,
    buildQueueReviewReport,
    formatQueueReviewReport,
    installOfflineStatusUI,
  };

  globalScope.XekhoOfflineStatusUI = api;

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
