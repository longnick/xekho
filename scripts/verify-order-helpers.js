'use strict';

const vm = require('vm');
const fs = require('fs');
const path = require('path');

const helpersPath = path.resolve(__dirname, '..', 'app', 'order', 'helpers.js');
const helpersSrc = fs.readFileSync(helpersPath, 'utf-8');

const expectedFunctions = [
  'isCompletedHistoryOrderForUi',
  'isVisibleHistoryOrderForUi',
  'normalizeViKey',
  'inferInventoryItemType',
  'normalizeInventoryItemModel',
  'inferMenuItemType',
  'findLinkedInventoryIdForMenuItem',
  'normalizeUnitText',
  '_isKitchenSkippedItem',
  'createKitchenLineItemId',
  'getKitchenLineItemId',
  'isKitchenFinalStatus',
  'canToggleServedStatus',
  'getCartItemStatusLabel',
  'normalizeKitchenOrderItem',
  '_mapOnlineOrderPayMethod',
  '_buildOnlineOrderBillNo',
  '_getOnlineOrderItemQty',
  '_getOnlineOrderItemUnitPrice',
  '_calculateOnlineOrderTotal',
  '_resolveOnlineOrderDocId',
  '_resolveDishCostPerUnit',
  'normalizeMenuItemModel',
];

const ITEM_TYPES = { RETAIL: 'retail_item', RAW: 'raw_material', FINISHED: 'finished_product' };

const sandbox = {
  window: {
    XekhoApp: {},
    ITEM_TYPES: ITEM_TYPES,
    uid: () => 'test1234',
  },
  ITEM_TYPES: ITEM_TYPES,
  uid: () => 'test1234',
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
const script = new vm.Script(helpersSrc, { filename: 'helpers.js' });
script.runInContext(sandbox);

const exported = sandbox.window.XekhoApp.order;
const exportedKeys = Object.keys(exported);
const missing = expectedFunctions.filter(fn => typeof exported[fn] !== 'function');

if (missing.length) {
  console.error('FAIL: Missing exports:', missing);
  process.exit(1);
}

if (exportedKeys.length !== expectedFunctions.length) {
  console.error('FAIL: Expected ' + expectedFunctions.length + ' exports, got ' + exportedKeys.length + ':', exportedKeys);
  process.exit(1);
}

// Test isCompletedHistoryOrderForUi
if (!exported.isCompletedHistoryOrderForUi({ status: 'completed' })) {
  console.error('FAIL: completed order should return true');
  process.exit(1);
}
if (exported.isCompletedHistoryOrderForUi({ status: 'open' })) {
  console.error('FAIL: open order should return false');
  process.exit(1);
}

// Test isVisibleHistoryOrderForUi
if (!exported.isVisibleHistoryOrderForUi({ status: 'completed' })) {
  console.error('FAIL: visible completed order should return true');
  process.exit(1);
}
if (exported.isVisibleHistoryOrderForUi({ status: 'completed', hidden: true })) {
  console.error('FAIL: hidden order should return false');
  process.exit(1);
}
if (exported.isVisibleHistoryOrderForUi(null)) {
  console.error('FAIL: null should return false');
  process.exit(1);
}

// Test normalizeViKey
if (exported.normalizeViKey('Ph\u1edf B\u00f2') !== 'pho bo') {
  console.error('FAIL: normalizeViKey wrong:', exported.normalizeViKey('Ph\u1edf B\u00f2'));
  process.exit(1);
}

// Test inferInventoryItemType
if (exported.inferInventoryItemType({ saleMode: 'retail' }) !== ITEM_TYPES.RETAIL) {
  console.error('FAIL: retail should return RETAIL');
  process.exit(1);
}
if (exported.inferInventoryItemType({}) !== ITEM_TYPES.RAW) {
  console.error('FAIL: default should return RAW');
  process.exit(1);
}

// Test inferMenuItemType
if (exported.inferMenuItemType({ itemType: ITEM_TYPES.RETAIL }) !== ITEM_TYPES.RETAIL) {
  console.error('FAIL: retail item should return RETAIL');
  process.exit(1);
}
if (exported.inferMenuItemType({ ingredients: ['a', 'b'] }) !== ITEM_TYPES.FINISHED) {
  console.error('FAIL: item with ingredients should return FINISHED');
  process.exit(1);
}

// Test kitchen helpers
if (!exported._isKitchenSkippedItem({ itemType: ITEM_TYPES.RETAIL })) {
  console.error('FAIL: retail item should be kitchen-skipped');
  process.exit(1);
}
if (exported.isKitchenFinalStatus('done')) {
  console.error('FAIL: done is not final');
  process.exit(1);
}
if (!exported.isKitchenFinalStatus('served')) {
  console.error('FAIL: served is final');
  process.exit(1);
}
if (!exported.canToggleServedStatus({ kitchenStatus: 'done' })) {
  console.error('FAIL: done should be toggleable');
  process.exit(1);
}

// Test createKitchenLineItemId
const lineId = exported.createKitchenLineItemId();
if (!lineId.startsWith('li_')) {
  console.error('FAIL: line item ID should start with li_');
  process.exit(1);
}

// Test normalizeKitchenOrderItem
const normalized = exported.normalizeKitchenOrderItem({ id: 'item1', name: 'Ph\u1edf' }, null);
if (!normalized.lineItemId || !normalized.kitchenStatus) {
  console.error('FAIL: normalized item missing required fields:', normalized);
  process.exit(1);
}

// Test online order helpers
if (exported._mapOnlineOrderPayMethod({ paymentMethod: 'bank', paymentStatus: 'paid' }) !== 'bank') {
  console.error('FAIL: bank+paid should return bank');
  process.exit(1);
}
if (exported._mapOnlineOrderPayMethod({}) !== 'cash') {
  console.error('FAIL: default should return cash');
  process.exit(1);
}

const billNo = exported._buildOnlineOrderBillNo({ orderCode: 'ABC123' });
if (billNo !== 'ONL-ABC123') {
  console.error('FAIL: bill number wrong:', billNo);
  process.exit(1);
}

if (exported._getOnlineOrderItemQty({ qty: 3 }) !== 3) {
  console.error('FAIL: qty wrong');
  process.exit(1);
}
if (exported._getOnlineOrderItemQty({}) !== 1) {
  console.error('FAIL: default qty should be 1');
  process.exit(1);
}

if (exported._getOnlineOrderItemUnitPrice({ price: 50000 }) !== 50000) {
  console.error('FAIL: price wrong');
  process.exit(1);
}

const total = exported._calculateOnlineOrderTotal({ items: [{ price: 10000, qty: 2 }], shipping: 5000 });
if (total !== 25000) {
  console.error('FAIL: total wrong:', total);
  process.exit(1);
}

if (exported._resolveOnlineOrderDocId({ _docId: 'doc1' }) !== 'doc1') {
  console.error('FAIL: doc id wrong');
  process.exit(1);
}

// Test normalizeUnitText
if (exported.normalizeUnitText('phan') !== 'ph\u1ea7n') {
  console.error('FAIL: unit normalization wrong');
  process.exit(1);
}

// Test getCartItemStatusLabel
if (exported.getCartItemStatusLabel({ kitchenStatus: 'served' }) !== 'Da mang ra') {
  console.error('FAIL: served label wrong');
  process.exit(1);
}

console.log('\u2705 verify-order-helpers Sprint 1.7 verification passed');
console.log('   ' + expectedFunctions.length + ' functions exported: ' + exportedKeys.join(', '));
