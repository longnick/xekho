'use strict';

const orders = require('../functions/telegram/orders');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; console.log('  ✅ ' + msg); }
  else { failed++; console.log('  ❌ ' + msg); }
}

console.log('=== Phase 10.3: functions/telegram/orders.js verification ===\n');

// Check exports exist
const expectedExports = [
  'getHistoryBusinessId',
  'getHistoryVersionDate',
  'getHistoryVersionTime',
  'isCompletedHistoryOrderForReports',
  'isVisibleHistoryOrderForReports',
  'extractTelegramCashierName',
  'pickFirstPresentValue',
  'toTelegramMoneyNumber',
  'normalizeCompletedOrderItems',
  'calculateCompletedOrderSubtotal',
  'normalizeCompletedOrderForTelegram',
];

console.log('Export checks:');
for (const name of expectedExports) {
  assert(typeof orders[name] === 'function', `export ${name} is function`);
}

// Test getHistoryBusinessId
console.log('\ngetHistoryBusinessId:');
assert(orders.getHistoryBusinessId({ id: 'abc' }) === 'abc', 'uses order.id');
assert(orders.getHistoryBusinessId({ historyId: 'h1' }) === 'h1', 'falls back to historyId');
assert(orders.getHistoryBusinessId({ docId: 'd1' }) === 'd1', 'falls back to docId');
assert(orders.getHistoryBusinessId({}) === '', 'returns empty for no id');

// Test getHistoryVersionDate
console.log('\ngetHistoryVersionDate:');
const d1 = orders.getHistoryVersionDate({ updatedAt: new Date('2024-01-15') });
assert(d1 instanceof Date && d1.getFullYear() === 2024, 'uses updatedAt');
const d2 = orders.getHistoryVersionDate({});
assert(d2 instanceof Date, 'returns Date for empty order');

// Test getHistoryVersionTime
console.log('\ngetHistoryVersionTime:');
const t1 = orders.getHistoryVersionTime({ updatedAt: new Date('2024-01-15T12:00:00Z') });
assert(typeof t1 === 'number' && t1 > 0, 'returns timestamp number');
const t2 = orders.getHistoryVersionTime({});
assert(t2 === 0, 'returns 0 for invalid date');

// Test isCompletedHistoryOrderForReports
console.log('\nisCompletedHistoryOrderForReports:');
assert(orders.isCompletedHistoryOrderForReports({ status: 'completed' }) === true, 'completed');
assert(orders.isCompletedHistoryOrderForReports({ status: 'closed' }) === true, 'closed');
assert(orders.isCompletedHistoryOrderForReports({ status: 'open' }) === false, 'open is false');
assert(orders.isCompletedHistoryOrderForReports({}) === true, 'no status, no cancel flags');

// Test isVisibleHistoryOrderForReports
console.log('\nisVisibleHistoryOrderForReports:');
assert(orders.isVisibleHistoryOrderForReports(null) === false, 'null is false');
assert(orders.isVisibleHistoryOrderForReports({ status: 'completed' }) === true, 'completed visible');
assert(orders.isVisibleHistoryOrderForReports({ status: 'completed', hidden: true }) === false, 'hidden');
assert(orders.isVisibleHistoryOrderForReports({ status: 'completed', deletedAt: 'x' }) === false, 'deleted');

// Test extractTelegramCashierName
console.log('\nextractTelegramCashierName:');
assert(orders.extractTelegramCashierName('John') === 'John', 'string passthrough');
assert(orders.extractTelegramCashierName({ name: 'Jane' }) === 'Jane', 'extracts name');
assert(orders.extractTelegramCashierName({ fullName: 'Bob' }) === 'Bob', 'extracts fullName');
assert(orders.extractTelegramCashierName(null) === '', 'null returns empty');

// Test pickFirstPresentValue
console.log('\npickFirstPresentValue:');
assert(orders.pickFirstPresentValue(null, undefined, 'hello') === 'hello', 'picks first present');
assert(orders.pickFirstPresentValue(undefined, 42, 'x') === 42, 'picks number');
assert(orders.pickFirstPresentValue(null, '', undefined) === null, 'empty string skipped');
assert(orders.pickFirstPresentValue() === null, 'no args returns null');

// Test toTelegramMoneyNumber
console.log('\ntoTelegramMoneyNumber:');
assert(orders.toTelegramMoneyNumber('100') === 100, 'parses string number');
assert(orders.toTelegramMoneyNumber(undefined, '50') === 50, 'falls back past undefined');
assert(orders.toTelegramMoneyNumber('abc', 'xyz') === 0, 'returns 0 for non-numbers');
assert(orders.toTelegramMoneyNumber(3.14) === 3.14, 'handles float');

// Test normalizeCompletedOrderItems
console.log('\nnormalizeCompletedOrderItems:');
const items = orders.normalizeCompletedOrderItems({ items: [{ name: 'Phở', qty: 2, price: 50000 }] });
assert(Array.isArray(items) && items.length === 1, 'returns array of items');
assert(items[0].name === 'Phở', 'preserves name');
assert(items[0].qty === 2, 'preserves qty');
const emptyItems = orders.normalizeCompletedOrderItems({});
assert(Array.isArray(emptyItems) && emptyItems.length === 0, 'empty for no items');

// Test calculateCompletedOrderSubtotal
console.log('\ncalculateCompletedOrderSubtotal:');
assert(orders.calculateCompletedOrderSubtotal([]) === 0, 'empty array is 0');
const sub = orders.calculateCompletedOrderSubtotal([{ qty: 2, price: 50000 }, { qty: 1, price: 30000 }]);
assert(sub === 130000, 'sums qty * price');

// Test normalizeCompletedOrderForTelegram
console.log('\nnormalizeCompletedOrderForTelegram:');
const norm = orders.normalizeCompletedOrderForTelegram('h1', { items: [{ name: 'A', qty: 1, price: 10000 }], total: 10000 });
assert(norm.historyId === 'h1', 'sets historyId');
assert(Array.isArray(norm.items), 'has items');
assert(typeof norm.total === 'number', 'has numeric total');
assert(norm.id || norm.billNo, 'has id or billNo');

// Summary
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
