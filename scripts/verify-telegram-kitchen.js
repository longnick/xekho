'use strict';

const vm = require('vm');
const fs = require('fs');
const path = require('path');

const kitchenPath = path.resolve(__dirname, '..', 'functions', 'telegram', 'kitchen.js');
const kitchenSrc = fs.readFileSync(kitchenPath, 'utf-8');

const expectedFunctions = [
  'normalizeTelegramTableLabel',
  'buildKitchenNotifMessage',
  'parseKitchenItemSummary',
  'buildTelegramFoodReadyMessage',
  'isKitchenOrderItemForTelegram',
  'getKitchenOrderItemKey',
  'getNewPendingKitchenItems',
  'buildTelegramNewKitchenOrderMessage',
  'buildTelegramFoodReadyMessageClean',
  'buildTelegramNewKitchenOrderMessageClean',
];

const sandbox = {
  module: { exports: {} },
  exports: {},
  require: (mod) => {
    if (mod === '../utils/text') {
      return {
        escapeTelegramHtml: (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
        normalizeTelegramText: (s) => String(s || '').trim(),
        formatQtyVi: (n) => String(n),
      };
    }
    throw new Error(`Unexpected require: ${mod}`);
  },
};
vm.createContext(sandbox);
const script = new vm.Script(kitchenSrc, { filename: 'kitchen.js' });
script.runInContext(sandbox);

const exported = sandbox.module.exports;
const exportedKeys = Object.keys(exported);
const missing = expectedFunctions.filter(fn => typeof exported[fn] !== 'function');

if (missing.length) {
  console.error('FAIL: Missing exports:', missing);
  process.exit(1);
}

if (exportedKeys.length !== expectedFunctions.length) {
  console.error(`FAIL: Expected ${expectedFunctions.length} exports, got ${exportedKeys.length}:`, exportedKeys);
  process.exit(1);
}

// Verify buildKitchenNotifMessage returns correct types
const ready = exported.buildKitchenNotifMessage({ type: 'ready', tableName: 'B\u00e0n 1', items: ['Ph\u1edf'] });
if (!ready.title.includes('Xong') || !ready.zaloText.includes('XE KH')) {
  console.error('FAIL: buildKitchenNotifMessage ready type wrong:', ready);
  process.exit(1);
}

const accepted = exported.buildKitchenNotifMessage({ type: 'accepted', tableName: 'B\u00e0n 2', items: [] });
if (!accepted.title.includes('NH\u1eacN')) {
  console.error('FAIL: buildKitchenNotifMessage accepted type wrong:', accepted);
  process.exit(1);
}

// Verify parseKitchenItemSummary
const parsed = exported.parseKitchenItemSummary('Ph\u1edf x2');
if (!parsed || parsed.name !== 'Ph\u1edf' || parsed.qty !== '2') {
  console.error('FAIL: parseKitchenItemSummary wrong:', parsed);
  process.exit(1);
}

const noQty = exported.parseKitchenItemSummary('C\u01a1m tr\u1ed1n');
if (!noQty || noQty.name !== 'C\u01a1m tr\u1ed1n' || noQty.qty !== '') {
  console.error('FAIL: parseKitchenItemSummary no qty wrong:', noQty);
  process.exit(1);
}

const empty = exported.parseKitchenItemSummary('');
if (empty !== null) {
  console.error('FAIL: parseKitchenItemSummary empty should be null:', empty);
  process.exit(1);
}

// Verify isKitchenOrderItemForTelegram
if (exported.isKitchenOrderItemForTelegram({ kitchenStatus: 'done' })) {
  console.error('FAIL: done item should not be for Telegram');
  process.exit(1);
}
if (!exported.isKitchenOrderItemForTelegram({ kitchenStatus: 'pending' })) {
  console.error('FAIL: pending item should be for Telegram');
  process.exit(1);
}
if (exported.isKitchenOrderItemForTelegram({ kitchenStatus: 'pending', itemType: 'retail_item' })) {
  console.error('FAIL: retail_item should not be for Telegram');
  process.exit(1);
}
if (!exported.isKitchenOrderItemForTelegram({ kitchenStatus: 'pending', itemType: 'retail_item', forceKitchen: true })) {
  console.error('FAIL: forced retail_item should be for Telegram');
  process.exit(1);
}

// Verify getKitchenOrderItemKey
const key = exported.getKitchenOrderItemKey({ lineItemId: 'line1' }, 0);
if (key !== 'line1') {
  console.error('FAIL: getKitchenOrderItemKey wrong:', key);
  process.exit(1);
}

// Verify getNewPendingKitchenItems
const after = [
  { kitchenStatus: 'pending', id: 'a' },
  { kitchenStatus: 'pending', id: 'b' },
  { kitchenStatus: 'done', id: 'c' },
];
const before = [
  { kitchenStatus: 'pending', id: 'a' },
];
const newItems = exported.getNewPendingKitchenItems(after, before);
if (newItems.length !== 1 || newItems[0].item.id !== 'b') {
  console.error('FAIL: getNewPendingKitchenItems wrong:', newItems);
  process.exit(1);
}

// Verify normalizeTelegramTableLabel
if (exported.normalizeTelegramTableLabel('') !== 'Kh\u00f4ng r\u00f5') {
  console.error('FAIL: empty table label should return default');
  process.exit(1);
}
if (exported.normalizeTelegramTableLabel('takeaway') !== 'Mang v\u1ec1') {
  console.error('FAIL: takeaway should normalize');
  process.exit(1);
}

// Verify buildTelegramFoodReadyMessage returns string
const foodReady = exported.buildTelegramFoodReadyMessage({ items: ['Ph\u1edf x2'], tableName: 'B\u00e0n 1' });
if (typeof foodReady !== 'string' || !foodReady.includes('XONG')) {
  console.error('FAIL: buildTelegramFoodReadyMessage wrong:', foodReady);
  process.exit(1);
}

console.log('\u2705 verify-telegram-kitchen Sprint 2.4 verification passed');
console.log(`   ${expectedFunctions.length} functions exported: ${exportedKeys.join(', ')}`);
