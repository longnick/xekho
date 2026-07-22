'use strict';

const onlineOrders = require('../functions/telegram/online-orders');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; console.log('  ✅ ' + msg); }
  else { failed++; console.log('  ❌ ' + msg); }
}

console.log('=== Phase 10.3: functions/telegram/online-orders.js verification ===\n');

// Check exports exist
const expectedExports = [
  'formatTelegramBillItemsClean',
  'buildPosItemFromRequest',
  'aggregateRequestStatusFromItems',
  'buildPosItemFromOnlineOrder',
  'buildOnlineOrderTelegramStatusLabel',
  'buildOnlineOrderTelegramSummary',
  'buildOnlineOrderTelegramStatusLabelClean',
  'buildOnlineOrderTelegramSummaryClean',
  'mapOnlineOrderStatusFromPosItems',
];

console.log('Export checks:');
for (const name of expectedExports) {
  assert(typeof onlineOrders[name] === 'function', `export ${name} is function`);
}

// Test formatTelegramBillItemsClean
console.log('\nformatTelegramBillItemsClean:');
const emptyBill = onlineOrders.formatTelegramBillItemsClean([]);
assert(typeof emptyBill === 'string' && emptyBill.includes('Chưa có'), 'empty items message');
const billItems = onlineOrders.formatTelegramBillItemsClean([{ name: 'Phở', qty: 2, price: 50000 }]);
assert(typeof billItems === 'string' && billItems.includes('Phở'), 'includes item name');
assert(billItems.includes('x2'), 'includes qty');

// Test buildPosItemFromRequest
console.log('\nbuildPosItemFromRequest:');
const posItem = onlineOrders.buildPosItemFromRequest('req1', 0, { name: 'Bún', quantity: 3, price: 40000 }, {});
assert(posItem.name === 'Bún', 'sets name');
assert(posItem.qty === 3, 'sets qty');
assert(posItem.source === 'customer_web', 'sets source');
assert(posItem.lineItemId === 'WEB-req1-1', 'generates lineItemId');

// Test aggregateRequestStatusFromItems
console.log('\naggregateRequestStatusFromItems:');
assert(onlineOrders.aggregateRequestStatusFromItems([]) === 'approved', 'empty is approved');
assert(onlineOrders.aggregateRequestStatusFromItems([{ kitchenStatus: 'served' }]) === 'served', 'all served');
assert(onlineOrders.aggregateRequestStatusFromItems([{ kitchenStatus: 'cooking' }]) === 'preparing', 'cooking');
assert(onlineOrders.aggregateRequestStatusFromItems([{ kitchenStatus: 'pending' }]) === 'approved', 'pending');

// Test buildPosItemFromOnlineOrder
console.log('\nbuildPosItemFromOnlineOrder:');
const onlineItem = onlineOrders.buildPosItemFromOnlineOrder('ord1', 0, { productName: 'Cơm', quantity: 1, unitPrice: 35000 }, {});
assert(onlineItem.name === 'Cơm', 'sets name');
assert(onlineItem.price === 35000, 'sets price');
assert(onlineItem.source === 'online_ordering', 'sets source');
assert(onlineItem.lineItemId === 'ONL-ord1-1', 'generates lineItemId');

// Test buildOnlineOrderTelegramStatusLabel
console.log('\nbuildOnlineOrderTelegramStatusLabel:');
assert(onlineOrders.buildOnlineOrderTelegramStatusLabel('approved').includes('XÁC NHẬN'), 'approved label');
assert(onlineOrders.buildOnlineOrderTelegramStatusLabel('preparing').includes('LÀM'), 'preparing label');
assert(onlineOrders.buildOnlineOrderTelegramStatusLabel('completed').includes('GIAO'), 'completed label');
assert(onlineOrders.buildOnlineOrderTelegramStatusLabel('cancelled').includes('HỦY'), 'cancelled label');
assert(onlineOrders.buildOnlineOrderTelegramStatusLabel('').includes('CHỜ'), 'default label');

// Test buildOnlineOrderTelegramSummary
console.log('\nbuildOnlineOrderTelegramSummary:');
const summary = onlineOrders.buildOnlineOrderTelegramSummary('ord123', {
  items: [{ productName: 'Phở', quantity: 2 }],
  customer: { fullName: 'Nguyễn', phone: '0901234567' },
  pricing: { total: 100000 },
  status: 'approved',
});
assert(typeof summary === 'string', 'returns string');
assert(summary.includes('ĐƠN ONLINE'), 'has header');
assert(summary.includes('Phở'), 'includes item');
assert(summary.includes('Nguyễn'), 'includes customer name');

// Test buildOnlineOrderTelegramStatusLabelClean
console.log('\nbuildOnlineOrderTelegramStatusLabelClean:');
assert(onlineOrders.buildOnlineOrderTelegramStatusLabelClean('approved').includes('XÁC NHẬN'), 'clean approved');
assert(onlineOrders.buildOnlineOrderTelegramStatusLabelClean('delivering').includes('GIAO'), 'clean delivering');

// Test buildOnlineOrderTelegramSummaryClean
console.log('\nbuildOnlineOrderTelegramSummaryClean:');
const cleanSummary = onlineOrders.buildOnlineOrderTelegramSummaryClean('ord456', {
  items: [{ productName: 'Bún', quantity: 1 }],
  customer: { fullName: 'Trần' },
  pricing: { total: 50000 },
  status: 'preparing',
});
assert(typeof cleanSummary === 'string', 'returns string');
assert(cleanSummary.includes('Bún'), 'includes item');
assert(cleanSummary.includes('Trần'), 'includes customer');

// Test mapOnlineOrderStatusFromPosItems
console.log('\nmapOnlineOrderStatusFromPosItems:');
assert(onlineOrders.mapOnlineOrderStatusFromPosItems({ status: 'cancelled' }) === 'cancelled', 'cancelled passthrough');
assert(onlineOrders.mapOnlineOrderStatusFromPosItems({ status: 'completed' }) === 'completed', 'completed passthrough');
assert(onlineOrders.mapOnlineOrderStatusFromPosItems({}, [{ kitchenStatus: 'served' }, { kitchenStatus: 'skip' }]) === 'delivering', 'all served/skip -> delivering');
assert(onlineOrders.mapOnlineOrderStatusFromPosItems({}, [{ kitchenStatus: 'cooking' }]) === 'preparing', 'cooking -> preparing');
assert(onlineOrders.mapOnlineOrderStatusFromPosItems({}, []) === 'approved', 'empty -> approved');

// Summary
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
