#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const fallbackLib = require('../offlineOrderFallback.js');
const backupLib = require('../offlineBackup.js');

function assertBase(action, type) {
  assert.equal(action.type, type);
  assert.equal(action.clientOrderId, action.payload.clientOrderId);
  assert.equal(action.payload.source, 'pos_offline_fallback');
  assert.equal(action.payload.fallbackVersion, fallbackLib.version);
  assert.ok(action.payload.offlineCreatedAt);
  assert.ok(action.payload.createdAtLocal);
}

async function main() {
  const common = { backupLib, deviceId: 'device-test' };
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

  const open = fallbackLib.buildOpenOrderAction({
    tableId: '7',
    tableName: 'Bàn 7',
    staffUid: 'staff-1',
    createdBy: { uid: 'staff-1', name: 'Thu ngân' },
    clientOrderId: 'client-open-1',
  }, common);
  assertBase(open, 'open_order');
  assert.equal(open.payload.tableId, '7');
  assert.equal(open.payload.tableName, 'Bàn 7');
  assert.equal(open.payload.staffUid, 'staff-1');
  assert.deepEqual(open.payload.createdBy, { uid: 'staff-1', name: 'Thu ngân' });

  const add = fallbackLib.buildAddItemAction({
    orderId: 'ORD-7-1',
    tableId: '7',
    item: { id: 'sku-1', name: 'Khô gà', price: '45000', cost: '20000', qty: '2', note: 'ít cay' },
  }, common);
  assertBase(add, 'add_item');
  assert.equal(add.payload.orderId, 'ORD-7-1');
  assert.equal(add.payload.item.price, 45000);
  assert.equal(add.payload.item.cost, 20000);
  assert.equal(add.payload.item.qty, 2);

  const change = fallbackLib.buildChangeQtyAction({
    orderId: 'ORD-7-1',
    tableId: '7',
    itemId: 'sku-1',
    itemNote: 'ít cay',
    delta: -1,
    lineItemId: 'line-1',
  }, common);
  assertBase(change, 'change_qty');
  assert.equal(change.payload.delta, -1);
  assert.equal(change.payload.lineItemId, 'line-1');

  const remove = fallbackLib.buildRemoveItemAction({
    orderId: 'ORD-7-1',
    tableId: '7',
    itemId: 'sku-1',
    itemNote: 'ít cay',
    lineItemId: 'line-1',
  }, common);
  assertBase(remove, 'remove_item');
  assert.equal(remove.payload.method, 'Orders.removeItem');
  assert.equal(remove.payload.removeMode, 'line_item');
  assert.equal(remove.payload.lineItemId, 'line-1');
  assert.equal(Object.prototype.hasOwnProperty.call(remove.payload, 'delta'), false);

  const updateItem = fallbackLib.buildUpdateItemAction({
    orderId: 'ORD-7-1',
    tableId: '7',
    itemId: 'sku-1',
    note: 'không cay',
    lineItemId: 'line-1',
  }, common);
  assertBase(updateItem, 'update_item');
  assert.equal(updateItem.payload.note, 'không cay');

  const meta = fallbackLib.buildUpdateMetaAction({
    orderId: 'ORD-7-1',
    tableId: '7',
    meta: { note: 'khách quen', discount: 5000, shipping: 0 },
  }, common);
  assertBase(meta, 'update_meta');
  assert.deepEqual(meta.payload.meta, { note: 'khách quen', discount: 5000, shipping: 0 });

  const close = fallbackLib.buildCloseOrderAction({
    orderId: 'ORD-7-1',
    tableId: '7',
    tableName: 'Bàn 7',
    items: [{ id: 'sku-1', name: 'Khô gà', price: 45000, cost: 20000, qty: 2 }],
    payInfo: { total: 90000, cost: 40000, payMethod: 'bank', discount: 5000, vatAmount: 0, billNo: 'BILL-1', historyId: 'HIS-1' },
  }, common);
  assertBase(close, 'close_order');
  assert.equal(close.payload.total, 90000);
  assert.equal(close.payload.cost, 40000);
  assert.equal(close.payload.payMethod, 'bank');
  assert.equal(close.payload.items.length, 1);
  assert.equal(close.payload.historyId, 'HIS-1');

  const cancel = fallbackLib.buildCancelOrderAction({
    orderId: 'ORD-7-1',
    tableId: '7',
    cancelReason: 'Khách đổi ý',
  }, common);
  assertBase(cancel, 'cancel_order');
  assert.equal(cancel.payload.cancelReason, 'Khách đổi ý');

  const controller = fallbackLib.createOfflineOrderFallback({
    mode: 'disabled',
    backupLib,
    deviceId: 'device-test',
  });
  assert.equal(controller.mode, 'disabled');
  assert.equal(controller.install({ Orders: { open: async () => 'live' } }).wrapped, false);

  const dryRun = fallbackLib.createOfflineOrderFallback({
    mode: 'dry-run',
    backupLib,
    deviceId: 'device-test',
  });
  const removePayload = dryRun.actionFromMethod('removeItem', ['ORD-9-1', 'sku-2', 'ít cay', 'line-2']);
  assert.equal(removePayload.type, 'remove_item');
  assert.equal(removePayload.payload.method, 'Orders.removeItem');
  assert.equal(removePayload.payload.removeMode, 'line_item');
  assert.equal(removePayload.payload.lineItemId, 'line-2');
  assert.equal(Object.prototype.hasOwnProperty.call(removePayload.payload, 'delta'), false);

  const storedDeviceOpen = fallbackLib.buildOpenOrderAction({ tableId: '8', clientOrderId: 'client-open-2' }, { backupLib });
  const storedDeviceAdd = fallbackLib.buildAddItemAction({ orderId: 'ORD-8-1', item: { id: 'sku-3' } }, { backupLib });
  assert.match(storedDeviceOpen.payload.deviceId, /^device_/);
  assert.equal(storedDeviceAdd.payload.deviceId, storedDeviceOpen.payload.deviceId);
  assert.equal(storageState.xekho_pos_device_id, storedDeviceOpen.payload.deviceId);

  global.localStorage = {
    getItem() { throw new Error('localStorage unavailable'); },
    setItem() { throw new Error('localStorage unavailable'); },
  };
  const fallbackDeviceOpen = fallbackLib.buildOpenOrderAction({ tableId: '9', clientOrderId: 'client-open-3' }, { backupLib });
  const fallbackDeviceAdd = fallbackLib.buildAddItemAction({ orderId: 'ORD-9-2', item: { id: 'sku-4' } }, { backupLib });
  assert.match(fallbackDeviceOpen.payload.deviceId, /^device_/);
  assert.notEqual(fallbackDeviceOpen.payload.deviceId, 'device_unknown');
  assert.equal(fallbackDeviceAdd.payload.deviceId, fallbackDeviceOpen.payload.deviceId);
  global.localStorage = previousLocalStorage;

  const dryResult = await dryRun.handleFailedOrderMethod('addItem', ['ORD-9-1', { id: 'sku-2', name: 'Khô bò', qty: 1 }], new Error('network unavailable'));
  assert.equal(dryResult.dryRun, true);
  assert.equal(dryRun.getDryRunActions().length, 1);
  assert.equal(dryRun.getDryRunActions()[0].type, 'add_item');

  const storage = backupLib.createMemoryStorage();
  const backup = backupLib.createOfflineBackup({ storage });
  const enabled = fallbackLib.createOfflineOrderFallback({
    mode: 'enabled',
    backupLib,
    runtime: { savePendingOrderAction: backup.savePendingOrderAction },
    deviceId: 'device-test',
  });
  await enabled.handleFailedOrderMethod('cancel', ['ORD-9-1', 'mất mạng'], new Error('network unavailable'));
  const rows = await backup.listPendingActions();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].type, 'cancel_order');
  assert.equal(rows[0].payload.cancelReason, 'mất mạng');

  console.log('✅ offlineOrderFallback Sprint 6 verification passed');
}

main().catch(error => {
  console.error('❌ offlineOrderFallback Sprint 6 verification failed');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
