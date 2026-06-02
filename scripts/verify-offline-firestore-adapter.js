#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const { createOfflineBackup, createMemoryStorage } = require('../offlineBackup.js');
const { createOfflineSync } = require('../offlineSync.js');
const {
  createOfflineFirestoreAdapter,
  createMemoryFirestoreOperations,
  findExistingInDbState,
  buildCompletedHistoryPayload,
  buildPayInfo,
} = require('../offlineFirestoreAdapter.js');

async function seedCloseOrder(backup, clientOrderId, overrides = {}) {
  return backup.savePendingOrderAction({
    type: 'close_order',
    clientOrderId,
    payload: {
      orderId: `ord_${clientOrderId}`,
      tableId: '1',
      tableName: 'Bàn 1',
      items: [{ id: 'mon_1', name: 'Khô gà', qty: 2, price: 50000 }],
      total: 100000,
      cost: 40000,
      payMethod: 'cash',
      paidAtLocal: '2026-06-01T10:00:00.000Z',
      ...overrides,
    },
  });
}

async function main() {
  assert.equal(findExistingInDbState({ state: { history: [{ clientOrderId: 'cko_exists' }] } }, 'cko_exists').collection, 'history');

  const actionShape = {
    id: 'offline_action_shape',
    type: 'close_order',
    clientOrderId: 'cko_shape',
    createdAt: '2026-06-01T09:00:00.000Z',
    deviceId: 'device_1',
    payload: {
      clientOrderId: 'cko_shape',
      tableId: '5',
      tableName: 'Bàn 5',
      total: '250000',
      cost: '90000',
      payMethod: 'bank',
      items: [{ id: 'mon_2', qty: 1 }],
    },
  };
  const historyPayload = buildCompletedHistoryPayload(actionShape);
  assert.equal(historyPayload.clientOrderId, 'cko_shape');
  assert.equal(historyPayload.status, 'completed');
  assert.equal(historyPayload.total, 250000);
  assert.equal(historyPayload.source, 'pos_offline_backup');

  const payInfo = buildPayInfo(actionShape.payload);
  assert.equal(payInfo.clientOrderId, 'cko_shape');
  assert.equal(payInfo.total, 250000);
  assert.equal(payInfo.payMethod, 'bank');

  const backup = createOfflineBackup({ storage: createMemoryStorage() });
  await seedCloseOrder(backup, 'cko_firestore_001');

  const operations = createMemoryFirestoreOperations();
  const adapter = createOfflineFirestoreAdapter({ operations });
  const sync = createOfflineSync({ backup, adapter, baseBackoffMs: 0, maxBackoffMs: 0 });
  const run = await sync.syncPendingActions();

  assert.equal(run.ok, true);
  assert.equal(run.results.length, 1);
  assert.equal(run.results[0].status, 'synced');
  assert.equal(run.results[0].reason, 'applied');
  assert.equal(operations.getHistory().length, 1);
  assert.equal(operations.getHistory()[0].clientOrderId, 'cko_firestore_001');
  assert.equal(operations.getCalls()[0].method, 'createCompletedHistoryFromOfflineOrder');

  const duplicateBackup = createOfflineBackup({ storage: createMemoryStorage() });
  await seedCloseOrder(duplicateBackup, 'cko_firestore_001');
  const duplicateAdapter = createOfflineFirestoreAdapter({ operations });
  const duplicateSync = createOfflineSync({ backup: duplicateBackup, adapter: duplicateAdapter, baseBackoffMs: 0, maxBackoffMs: 0 });
  const duplicateRun = await duplicateSync.syncPendingActions();
  assert.equal(duplicateRun.results[0].reason, 'already-synced');
  assert.equal(operations.getHistory().length, 1, 'duplicate clientOrderId must not create second history row');

  const stateBackedAdapter = createOfflineFirestoreAdapter({
    db: { state: { history: [{ clientOrderId: 'cko_state_history', historyId: 'hist_state' }] } },
    operations: createMemoryFirestoreOperations(),
  });
  assert.equal(await stateBackedAdapter.isActionAlreadySynced({ clientOrderId: 'cko_state_history' }), true);

  const offlineOps = createMemoryFirestoreOperations({ online: false });
  const offlineAdapter = createOfflineFirestoreAdapter({ operations: offlineOps });
  assert.equal(await offlineAdapter.isOnline(), false);

  const removeBackup = createOfflineBackup({ storage: createMemoryStorage() });
  await removeBackup.savePendingOrderAction({
    type: 'remove_item',
    clientOrderId: 'cko_remove_001',
    payload: {
      clientOrderId: 'cko_remove_001',
      method: 'Orders.removeItem',
      orderId: 'ord_remove_001',
      tableId: '1',
      itemId: 'mon_3',
      lineItemId: 'line_3',
      removeMode: 'line_item',
    },
  });
  const removeOps = createMemoryFirestoreOperations();
  const removeAdapter = createOfflineFirestoreAdapter({ operations: removeOps });
  const removeSync = createOfflineSync({ backup: removeBackup, adapter: removeAdapter, baseBackoffMs: 0, maxBackoffMs: 0 });
  const removeRun = await removeSync.syncPendingActions();
  assert.equal(removeRun.results[0].status, 'synced');
  assert.equal(removeOps.getCalls()[0].method, 'removeItem');
  assert.equal(Object.prototype.hasOwnProperty.call(removeOps.getCalls()[0].payload, 'delta'), false);

  console.log('✅ offlineFirestoreAdapter Sprint 3 verification passed');
}

main().catch(error => {
  console.error('❌ offlineFirestoreAdapter Sprint 3 verification failed');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
