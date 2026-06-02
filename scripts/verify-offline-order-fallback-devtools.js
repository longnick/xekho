#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const fallbackLib = require('../offlineOrderFallback.js');
const devToolsLib = require('../offlineOrderFallbackDevTools.js');
const backupLib = require('../offlineBackup.js');

async function main() {
  const logs = [];
  const logger = {
    info: (...args) => logs.push(['info', ...args]),
    warn: (...args) => logs.push(['warn', ...args]),
    error: (...args) => logs.push(['error', ...args]),
  };

  const tools = devToolsLib.createOfflineOrderFallbackDevTools({
    fallbackLib,
    backupLib,
    deviceId: 'device-devtools-test',
    logger,
  });

  assert.equal(tools.version, devToolsLib.version);
  assert.deepEqual(tools.methodNames, ['open', 'addItem', 'changeQty', 'removeItem', 'updateItemNote', 'updateMeta', 'close', 'cancel']);
  assert.equal(tools.getDryRunActions().length, 0);

  const orders = {
    open: async () => { throw new Error('network unavailable'); },
    addItem: async () => 'live-add',
    changeQty: async () => { throw new Error('validation error'); },
    removeItem: async () => { throw new Error('failed to fetch'); },
    updateItemNote: async () => 'live-note',
    updateMeta: async () => 'live-meta',
    close: async () => { throw new Error('timeout'); },
    cancel: async () => 'live-cancel',
  };
  const enabled = tools.enableDryRun({ Orders: orders });
  assert.equal(enabled.mode, 'dry-run');
  assert.equal(enabled.wrapped, true);
  assert.ok(enabled.methods.includes('open'));

  await assert.rejects(() => orders.open('T1', 'Bàn 1', 'staff-1', { uid: 'staff-1' }), /network unavailable/);
  assert.equal(await orders.addItem('ORD-1', { id: 'sku-ok', qty: 1 }), 'live-add');
  await assert.rejects(() => orders.removeItem('ORD-1', 'sku-1', 'ít cay', 'line-1'), /failed to fetch/);
  await assert.rejects(() => orders.close('ORD-1', { total: 100000, payMethod: 'cash' }), /timeout/);
  await assert.rejects(() => orders.changeQty('ORD-1', 'sku-1', '', 1, 'line-1'), /validation error/);

  const capturedFromWrappedCalls = tools.getDryRunActions();
  assert.equal(capturedFromWrappedCalls.length, 3);
  assert.deepEqual(capturedFromWrappedCalls.map(action => action.type), ['open_order', 'remove_item', 'close_order']);
  assert.equal(capturedFromWrappedCalls[1].payload.method, 'Orders.removeItem');
  assert.equal(capturedFromWrappedCalls[1].payload.removeMode, 'line_item');
  assert.equal(Object.prototype.hasOwnProperty.call(capturedFromWrappedCalls[1].payload, 'delta'), false);

  const disableResult = tools.disable({ Orders: orders });
  assert.equal(disableResult.disabled, true);
  assert.equal(disableResult.unwrapped, true);
  assert.equal(await orders.addItem('ORD-1', { id: 'sku-ok', qty: 1 }), 'live-add');

  tools.clearDryRunActions();
  const simulations = await tools.simulateAllFailures();
  assert.equal(simulations.length, 8);
  assert.deepEqual(simulations.map(row => row.type), [
    'open_order',
    'add_item',
    'change_qty',
    'remove_item',
    'update_item',
    'update_meta',
    'close_order',
    'cancel_order',
  ]);
  assert.equal(tools.getDryRunActions().length, 8);

  const sampleCloseArgs = tools.getDefaultArgs('close');
  assert.equal(sampleCloseArgs[0], 'dryrun-order-1');
  assert.equal(sampleCloseArgs[1].billNo, 'DRYRUN-BILL-1');

  const review = tools.buildPayloadReviewReport();
  assert.equal(review.safeByDefault, true);
  assert.equal(review.mode, 'payload-review-only');
  assert.equal(review.sideEffects.wrapsDbOrders, false);
  assert.equal(review.sideEffects.enqueuesOfflineActions, false);
  assert.equal(review.sideEffects.writesFirestore, false);
  assert.equal(review.sideEffects.enablesSync, false);
  assert.equal(review.guardedQueueWrite.available, true);
  assert.equal(review.guardedQueueWrite.enabledByDefault, false);
  assert.equal(review.guardedQueueWrite.requiredConfirmation, 'ENABLE_OFFLINE_QUEUE_WRITE');
  assert.equal(review.actions.length, 8);
  assert.deepEqual(review.actions.map(row => row.type), [
    'open_order',
    'add_item',
    'change_qty',
    'remove_item',
    'update_item',
    'update_meta',
    'close_order',
    'cancel_order',
  ]);
  assert.equal(review.actions[3].payload.method, 'Orders.removeItem');
  assert.equal(review.actions[3].payload.removeMode, 'line_item');
  assert.equal(Object.prototype.hasOwnProperty.call(review.actions[3].payload, 'delta'), false);
  assert.deepEqual(review.warnings, []);
  assert.equal(tools.getDryRunActions().length, 8);

  const previousLocalStorage = global.localStorage;
  const storageState = {};
  global.localStorage = {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(storageState, key) ? storageState[key] : null;
    },
    setItem(key, value) {
      storageState[key] = String(value);
    },
  };
  const storageBackedTools = devToolsLib.createOfflineOrderFallbackDevTools({
    fallbackLib,
    backupLib,
    logger,
  });
  const storageBackedReview = storageBackedTools.buildPayloadReviewReport();
  const deviceIds = storageBackedReview.actions.map(row => row.payload.deviceId);
  assert.equal(new Set(deviceIds).size, 1);
  assert.match(deviceIds[0], /^device_/);
  assert.equal(storageState.xekho_pos_device_id, deviceIds[0]);
  assert.equal(storageBackedReview.warnings.some(warning => warning.includes('device_unknown')), false);
  assert.equal(storageBackedReview.warnings.some(warning => warning.includes('-999999')), false);
  global.localStorage = previousLocalStorage;

  const formattedReview = tools.formatPayloadReviewReport(review);
  assert.ok(formattedReview.includes('XE KHÔ Offline Payload Review'));
  assert.ok(formattedReview.includes('## close → close_order'));
  assert.ok(formattedReview.includes('Side effects: no DB wrap, no enqueue, no Firestore, no sync'));

  const copyResult = await tools.copyPayloadReviewReport();
  assert.equal(copyResult.copied, false);
  assert.equal(copyResult.reason, 'clipboard-unavailable');
  assert.ok(copyResult.text.includes('## cancel → cancel_order'));

  const queueGuardWithoutConfirm = tools.enableQueueWriteGuarded({ db: { Orders: orders }, runtime: { savePendingOrderAction: async action => action, syncEnabled: false } });
  assert.equal(queueGuardWithoutConfirm.enabled, false);
  assert.equal(queueGuardWithoutConfirm.reason, 'confirmation-required');
  assert.equal(queueGuardWithoutConfirm.requiredConfirmation, 'ENABLE_OFFLINE_QUEUE_WRITE');

  const savedActions = [];
  const queueOrders = {
    open: async () => { throw new Error('network unavailable'); },
    addItem: async () => { throw new Error('failed to fetch'); },
  };
  const queueRuntime = {
    syncEnabled: false,
    savePendingOrderAction: async action => {
      const saved = { ...action, id: `queued-${savedActions.length + 1}` };
      savedActions.push(saved);
      return saved;
    },
  };
  const queueGuardEnabled = tools.enableQueueWriteGuarded({
    db: { Orders: queueOrders },
    runtime: queueRuntime,
    confirmation: 'ENABLE_OFFLINE_QUEUE_WRITE',
  });
  assert.equal(queueGuardEnabled.enabled, true);
  assert.equal(queueGuardEnabled.mode, 'enabled');
  assert.equal(queueGuardEnabled.queueWritesEnabled, true);
  assert.equal(queueGuardEnabled.autoSyncEnabled, false);
  assert.equal(queueGuardEnabled.syncEnabled, false);
  const queuedOpenId = await queueOrders.open('Q1', 'Bàn queue');
  assert.match(queuedOpenId, /offline_order_|Q1|device_|client/);
  await assert.rejects(() => queueOrders.addItem('Q-ORD-1', { id: 'sku-q', qty: 1 }), /failed to fetch/);
  assert.equal(savedActions.length, 2);
  assert.deepEqual(savedActions.map(action => action.type), ['open_order', 'add_item']);
  tools.disable({ Orders: queueOrders });

  const installedTarget = {};
  const installed = devToolsLib.installOfflineOrderFallbackDevTools({
    target: installedTarget,
    fallbackLib,
    backupLib,
    logger,
  });
  assert.equal(installedTarget.XekhoOfflineOrderFallbackDevTools, installed);
  assert.equal(installed.version, devToolsLib.version);

  console.log('✅ offlineOrderFallbackDevTools Sprint 7 verification passed');
}

main().catch(error => {
  console.error('❌ offlineOrderFallbackDevTools Sprint 7 verification failed');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
