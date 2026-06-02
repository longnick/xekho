#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const backupLib = require('../offlineBackup.js');
const syncLib = require('../offlineSync.js');
const firestoreAdapterLib = require('../offlineFirestoreAdapter.js');
const { createOfflineBackupRuntime } = require('../offlineRuntime.js');

async function main() {
  const backup = backupLib.createOfflineBackup({ storage: backupLib.createMemoryStorage() });
  const runtime = createOfflineBackupRuntime({
    backup,
    backupLib,
    syncLib,
    firestoreAdapterLib,
    enableSync: false,
    logger: { info() {}, warn() {}, error() {} },
  });

  assert.equal(runtime.version, 'sprint-19-production');
  assert.equal(runtime.syncEnabled, false);

  let summary = await runtime.getSummary();
  assert.equal(summary.total, 0);
  assert.equal(summary.syncEnabled, false);

  await runtime.savePendingOrderAction({
    type: 'close_order',
    clientOrderId: 'cko_runtime_001',
    payload: {
      tableId: '1',
      tableName: 'Bàn 1',
      total: 99000,
      items: [{ id: 'mon_1', name: 'Khô gà', qty: 1, price: 99000 }],
    },
  });

  summary = await runtime.getSummary();
  assert.equal(summary.total, 1);
  assert.equal(summary.pending, 1);

  const pending = await runtime.listPendingActions();
  assert.equal(pending.length, 1);
  assert.equal(pending[0].clientOrderId, 'cko_runtime_001');

  const disabledSync = await runtime.syncNow();
  assert.equal(disabledSync.skipped, true);
  assert.equal(disabledSync.reason, 'sync-disabled');
  assert.equal((await runtime.getSummary()).pending, 1);

  const operations = firestoreAdapterLib.createMemoryFirestoreOperations();
  const syncEnabledBackup = backupLib.createOfflineBackup({ storage: backupLib.createMemoryStorage() });
  const syncEnabledRuntime = createOfflineBackupRuntime({
    backup: syncEnabledBackup,
    backupLib,
    syncLib,
    firestoreAdapterLib,
    operations,
    enableSync: true,
    syncOptions: { baseBackoffMs: 0, maxBackoffMs: 0 },
    logger: { info() {}, warn() {}, error() {} },
  });

  await syncEnabledRuntime.savePendingOrderAction({
    type: 'close_order',
    clientOrderId: 'cko_runtime_sync_001',
    payload: { tableId: '2', tableName: 'Bàn 2', total: 120000, items: [] },
  });
  const syncRun = await syncEnabledRuntime.syncNow();
  assert.equal(syncRun.ok, true);
  assert.equal(syncRun.results[0].status, 'synced');
  assert.equal(operations.getHistory().length, 1);

  console.log('✅ offlineRuntime Sprint 19 verification passed');
}

main().catch(error => {
  console.error('❌ offlineRuntime Sprint 19 verification failed');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
