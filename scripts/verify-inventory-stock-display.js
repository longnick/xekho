'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const orderHelpers = fs.readFileSync(path.join(root, 'app/order/helpers.js'), 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

assert(
  appJs.includes('window.appState.masterData.inventoryItems') && appJs.includes('masterInventory.length > 0'),
  '_getInventory falls back to masterData.inventoryItems when derived appState.inventory is still empty'
);
assert(
  appJs.includes('map(normalizeInventoryItemModel).filter(i => i && i.id && i.name)'),
  '_getInventory returns normalized visible stock models with id/name guards'
);
assert(
  appJs.includes('item.material_name || id') && orderHelpers.includes('item.material_name || id'),
  'inventory normalizer maps Firestore material_name into POS name'
);
assert(
  appJs.includes('item.unit || item.base_unit') && orderHelpers.includes('item.unit || item.base_unit'),
  'inventory normalizer maps Firestore base_unit into POS unit'
);
assert(
  appJs.includes('item.qty ?? item.current_stock ?? 0') && orderHelpers.includes('item.qty ?? item.current_stock ?? 0'),
  'inventory normalizer maps Firestore current_stock into POS qty without losing zero values'
);
assert(
  appJs.includes('item.minQty ?? item.min_alert ?? 0') && orderHelpers.includes('item.minQty ?? item.min_alert ?? 0'),
  'inventory normalizer maps Firestore min_alert into POS minQty'
);
assert(
  appJs.includes("masterType === 'retail'") && appJs.includes("masterType === 'retail_item'"),
  'inventory type inference recognizes master retail stock values'
);
assert(
  orderHelpers.includes("masterType === 'retail'") && orderHelpers.includes("masterType === 'retail_item'"),
  'extracted order helper type inference recognizes master retail stock values'
);
assert(
  appJs.includes('const filtered = inv') && appJs.includes("document.getElementById('stock-list').innerHTML = html"),
  'renderStockList still renders from _getInventory into #stock-list'
);

console.log('verify-inventory-stock-display passed');
