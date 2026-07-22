const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const dbJs = fs.readFileSync(path.join(root, 'db.js'), 'utf8');

assert(
  appJs.includes('function _appInventoryTypeToMaster(itemType)') &&
    appJs.includes("? 'Retail'") &&
    appJs.includes(": 'Raw';"),
  'app.js should define inventory UI -> master type mapper'
);

assert(
  /const updateData = \{[^}]*itemType,[^}]*inv_type: _appInventoryTypeToMaster\(itemType\)/s.test(appJs),
  'submitInvEdit updateData should include both itemType and inv_type'
);

assert(
  dbJs.includes("if (Object.prototype.hasOwnProperty.call(data, 'itemType')) payload.inv_type = _appInventoryTypeToMaster(data.itemType);"),
  'DB.Inventory.update should persist inv_type when itemType is present'
);

assert(
  dbJs.includes("itemType: item.itemType || _masterInventoryTypeToApp(item.inv_type)"),
  'inventory snapshots should read inv_type back into app itemType'
);

assert(
  appJs.includes('applyMenuItemOptimisticState(savedId, payload)') &&
    dbJs.includes("if (Object.prototype.hasOwnProperty.call(data, 'itemType')) payload.item_type = _appMenuTypeToMaster(data.itemType);"),
  'menu-management save path should keep itemType/item_type persistence'
);

console.log('verify-inventory-type-save ok');
