#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const { createOfflineBackup, createMemoryStorage } = require('../offlineBackup.js');
const { createOfflineSync, createMemorySyncAdapter } = require('../offlineSync.js');

async function seedAction(backup, input) {
  return backup.savePendingOrderAction({
    type: 'close_order',
    clientOrderId: input.clientOrderId,
    payload: {
      tableId: input.tableId || '1',
      tableName: input.tableName || 'Bàn 1',
      total: input.total || 100000,
      items: input.items || [{ id: 'mon_1', name: 'Khô gà', qty: 1, price: 100000 }],
      payMethod: 'cash',
    },
    ...input,
  });
}

async function main() {
  const backup = createOfflineBackup({ storage: createMemoryStorage() });
  const adapter = createMemorySyncAdapter();
  const sync = createOfflineSync({ backup, adapter, baseBackoffMs: 0, maxBackoffMs: 0 });

  const actionA = await seedAction(backup, { clientOrderId: 'cko_sync_001' });
  const resultA = await sync.syncPendingActions();

  assert.equal(resultA.ok, true);
  assert.equal(resultA.results.length, 1);
  assert.equal(resultA.results[0].status, 'synced');
  assert.equal(resultA.results[0].reason, 'applied');
  assert.equal(adapter.getAppliedActions().length, 1);

  const summaryAfterA = await backup.getSummary();
  assert.equal(summaryAfterA.synced, 1);
  assert.equal(summaryAfterA.pending, 0);

  const actionB = await seedAction(backup, { clientOrderId: 'cko_sync_001' });
  const resultB = await sync.syncPendingActions();
  assert.equal(resultB.results.length, 1);
  assert.equal(resultB.results[0].status, 'synced');
  assert.equal(resultB.results[0].reason, 'already-synced');
  assert.equal(adapter.getAppliedActions().length, 1, 'idempotency should avoid applying duplicate clientOrderId');
  assert.notEqual(actionA.id, actionB.id);

  const failingBackup = createOfflineBackup({ storage: createMemoryStorage() });
  const failingAction = await seedAction(failingBackup, { clientOrderId: 'cko_sync_fail' });
  const failingAdapter = createMemorySyncAdapter({ failClientOrderIds: ['cko_sync_fail'] });
  const failingSync = createOfflineSync({ backup: failingBackup, adapter: failingAdapter, baseBackoffMs: 0, maxBackoffMs: 0 });

  const failRun = await failingSync.syncPendingActions();
  assert.equal(failRun.results.length, 1);
  assert.equal(failRun.results[0].status, 'failed');

  const failedRows = await failingBackup.listFailedActions();
  assert.equal(failedRows.length, 1);
  assert.equal(failedRows[0].id, failingAction.id);
  assert.equal(failedRows[0].retryCount, 1);

  const offlineBackup = createOfflineBackup({ storage: createMemoryStorage() });
  await seedAction(offlineBackup, { clientOrderId: 'cko_sync_offline' });
  const offlineAdapter = createMemorySyncAdapter({ online: false });
  const offlineSync = createOfflineSync({ backup: offlineBackup, adapter: offlineAdapter });
  const offlineRun = await offlineSync.syncPendingActions();
  assert.equal(offlineRun.ok, false);
  assert.equal(offlineRun.reason, 'offline');
  assert.equal((await offlineBackup.getSummary()).pending, 1);

  const lockBackup = createOfflineBackup({ storage: createMemoryStorage() });
  await seedAction(lockBackup, { clientOrderId: 'cko_sync_lock' });
  const slowAdapter = createMemorySyncAdapter({ delayMs: 50 });
  const lockSync = createOfflineSync({ backup: lockBackup, adapter: slowAdapter, baseBackoffMs: 0, maxBackoffMs: 0 });
  const firstRunPromise = lockSync.syncPendingActions();
  const secondRun = await lockSync.syncPendingActions();
  assert.equal(secondRun.skipped, true);
  assert.equal(secondRun.reason, 'sync-in-progress');
  await firstRunPromise;

  console.log('✅ offlineSync Sprint 2 verification passed');
}

main().catch(error => {
  console.error('❌ offlineSync Sprint 2 verification failed');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
