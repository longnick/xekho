#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const {
  createOfflineBackup,
  createMemoryStorage,
  isOfflineOrServerError,
  normalizeAction,
} = require('../offlineBackup.js');

async function main() {
  const storage = createMemoryStorage();
  const backup = createOfflineBackup({ storage });

  const clientOrderId = 'cko_verify_001';
  const saved = await backup.savePendingOrderAction({
    type: 'close_order',
    clientOrderId,
    payload: {
      tableId: '1',
      tableName: 'Bàn 1',
      total: 125000,
      items: [
        { id: 'mon_1', name: 'Khô gà', qty: 2, price: 50000 },
        { id: 'drink_1', name: 'Nước sâm', qty: 1, price: 25000 },
      ],
      payMethod: 'cash',
    },
  });

  assert.equal(saved.status, 'pending');
  assert.equal(saved.clientOrderId, clientOrderId);
  assert.equal(saved.payload.clientOrderId, clientOrderId);
  assert.equal(saved.retryCount, 0);

  const pending = await backup.listPendingActions();
  assert.equal(pending.length, 1);
  assert.equal(pending[0].type, 'close_order');

  const syncing = await backup.markSyncing(saved.id);
  assert.equal(syncing.status, 'syncing');

  const failed = await backup.markFailed(saved.id, new Error('FirebaseError: unavailable'));
  assert.equal(failed.status, 'failed');
  assert.equal(failed.retryCount, 1);
  assert.match(failed.lastError, /unavailable/);

  const retry = await backup.resetForRetry(saved.id);
  assert.equal(retry.status, 'pending');
  assert.equal(retry.lastError, '');

  const synced = await backup.markSynced(saved.id);
  assert.equal(synced.status, 'synced');
  assert.ok(synced.syncedAt);

  const cleared = await backup.clearSynced();
  assert.equal(cleared, 1);

  const summary = await backup.getSummary();
  assert.deepEqual(summary, { total: 0, pending: 0, syncing: 0, synced: 0, failed: 0 });

  assert.equal(isOfflineOrServerError(new Error('Failed to fetch')), true);
  assert.equal(isOfflineOrServerError({ code: 'unavailable' }), true);
  assert.equal(isOfflineOrServerError(new Error('permission-denied')), false);

  assert.throws(() => normalizeAction({ type: 'unknown_action', payload: {} }), /unsupported action type/);

  console.log('✅ offlineBackup Sprint 1 verification passed');
}

main().catch(error => {
  console.error('❌ offlineBackup Sprint 1 verification failed');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
