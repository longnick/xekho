const assert = require('assert');
const fs = require('fs');
const path = require('path');
const feed = require('../functions/kitchenDeviceFeed');

const indexSource = fs.readFileSync(path.join(__dirname, '../functions/index.js'), 'utf8');
assert(indexSource.includes('exports.kitchenDeviceFeed = onRequest'), 'kitchenDeviceFeed HTTP endpoint missing');
assert(indexSource.includes("KITCHEN_DEVICE_TOKEN"), 'device endpoint must require a configured token');
assert(indexSource.includes("error: 'device_token_not_configured'"), 'endpoint must fail closed when token is not configured');
assert(indexSource.includes("error: 'unauthorized'"), 'endpoint must reject bad tokens');

const docs = [
  {
    id: 'ORD-1',
    data: () => ({
      status: 'open',
      tableId: 'B3',
      tableName: 'Ban 3',
      items: [
        { id: 'p1', lineItemId: 'li-1', name: 'Mi xao bo', qty: 2, kitchenStatus: 'done', kitchenRouting: 'all', kitchenUpdatedAt: 2000 },
        { id: 'p2', lineItemId: 'li-2', name: 'Bia', qty: 1, kitchenStatus: 'done', kitchenRouting: 'skip', itemType: 'retail_item', kitchenUpdatedAt: 3000 },
        { id: 'p3', lineItemId: 'li-3', name: 'Com chien', qty: 1, kitchenStatus: 'cooking', kitchenRouting: 'all', kitchenUpdatedAt: 4000 },
      ],
    }),
  },
  {
    id: 'ORD-2',
    data: () => ({
      status: 'open',
      tableId: 'T2',
      tableName: 'Mang ve',
      items: [
        { id: 'p4', lineItemId: 'li-4', name: 'Lau ga', qty: 1, kitchenStatus: 'done', kitchenRouting: 'hot', kitchenUpdatedAt: 5000 },
      ],
    }),
  },
];

const all = feed.buildReadyItemsFromOrders(docs, { station: 'all', limit: 8 });
assert.strictEqual(all.length, 2, 'only kitchen done items should be returned');
assert.strictEqual(all[0].name, 'Lau ga', 'newest ready item should sort first');
assert.strictEqual(all[1].tableName, 'Ban 3', 'table name should be preserved');

const hot = feed.buildReadyItemsFromOrders(docs, { station: 'hot', limit: 8 });
assert.strictEqual(hot.length, 2, 'station filter should keep matching route plus all-route items');
assert.strictEqual(hot[0].name, 'Lau ga');

const cold = feed.buildReadyItemsFromOrders(docs, { station: 'cold', limit: 8 });
assert.strictEqual(cold.length, 1, 'station filter should keep only all-route items when no station-specific route matches');
assert.strictEqual(cold[0].name, 'Mi xao bo');

console.log('verify-kitchen-device-feed: ok');
