'use strict';
/**
 * RED → GREEN regression test for:
 *   "POS creates kitchen items as kitchenStatus:skip / kitchenRouting:skip"
 *
 * Root cause: helpers.js uses `var ITEM_TYPES = (global.ITEM_TYPES || {})`
 * at load time. In the browser, store.js defines ITEM_TYPES as `const` (not
 * window.ITEM_TYPES), so window.ITEM_TYPES is undefined and helpers.js ends
 * up with ITEM_TYPES = {}.  Inside normalizeMenuItemModel,
 * `itemType === ITEM_TYPES.RETAIL` becomes `undefined === undefined` = true,
 * forcing kitchenRouting = 'skip' for ALL menu items regardless of type.
 * saveOrder() then calls normalizeKitchenOrderItems() which rebuilds a
 * menuMap with skip-routing, overwriting every new item to kitchenStatus:skip.
 *
 * Fix contract (tested below):
 *   1. Finished / all-routing item → kitchenStatus:'pending', kitchenRouting:'all'
 *   2. Retail item                 → kitchenStatus:'skip',    kitchenRouting:'skip'
 *   3. Explicit skip item          → kitchenStatus:'skip',    kitchenRouting:'skip'
 *   4. normalizeKitchenOrderItem via menuMap correctly promotes Finished→pending
 */

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const helpersSrc = fs.readFileSync(
  path.resolve(__dirname, '..', 'app', 'order', 'helpers.js'),
  'utf-8'
);

// Simulate the browser environment where window.ITEM_TYPES is NOT set
// (because store.js uses `const ITEM_TYPES` which is not window-scoped).
function makeHelpersSandbox({ windowItemTypes = undefined } = {}) {
  const sandbox = {
    window: {
      XekhoApp: {},
      // Intentionally NOT setting ITEM_TYPES to replicate the browser bug:
      // window.ITEM_TYPES is undefined unless the fix makes helpers.js self-contained.
    },
    uid: () => 'test1234',
    globalThis: null,
  };
  if (windowItemTypes !== undefined) {
    sandbox.window.ITEM_TYPES = windowItemTypes;
  }
  // ITEM_TYPES is also accessed as global.ITEM_TYPES in helpers.js
  // Do NOT set it on the sandbox to reproduce the bug.
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  const script = new vm.Script(helpersSrc, { filename: 'helpers.js' });
  script.runInContext(sandbox);
  const helpers = sandbox.window.XekhoApp.order;
  // Expose the sandbox-context Map so tests that pass menuMaps to helpers can use
  // the same Map constructor (vm context boundaries make cross-context instanceof fail).
  helpers._SandboxMap = vm.runInContext('Map', sandbox);
  return helpers;
}

// ------------------------------------------------------------------
// The canonical ITEM_TYPES values (from store.js)
// ------------------------------------------------------------------
const CANONICAL = {
  RETAIL:   'retail_item',
  RAW:      'raw_material',
  FINISHED: 'finished_good',
};

// ------------------------------------------------------------------
// Test 1 (key regression):
//   normalizeMenuItemModel for a Finished item must produce
//   kitchenRouting:'all', NOT 'skip', even when window.ITEM_TYPES
//   is undefined (i.e. helpers.js must be self-contained).
// ------------------------------------------------------------------
test('normalizeMenuItemModel: Finished/no-ingredients item → kitchenRouting all', () => {
  const helpers = makeHelpersSandbox(); // no window.ITEM_TYPES
  const dish = helpers.normalizeMenuItemModel({
    id: 'trung_bac_thao',
    name: 'Trứng bắc thảo củ kiệu',
    itemType: CANONICAL.FINISHED,  // 'finished_good' from Firestore
    price: 70000,
    ingredients: [],
    kitchenRouting: 'all',
  });
  expect(dish.kitchenRouting).toBe('all');
  expect(dish.itemType).toBe(CANONICAL.FINISHED);
});

// ------------------------------------------------------------------
// Test 2:
//   normalizeKitchenOrderItem for a Finished item (no menuMap)
//   must produce kitchenStatus:'pending', not 'skip'.
// ------------------------------------------------------------------
test('normalizeKitchenOrderItem: Finished item without menuMap → pending', () => {
  const helpers = makeHelpersSandbox();
  const result = helpers.normalizeKitchenOrderItem({
    id: 'mi_xao_hai_san',
    name: 'Mì xào hải sản',
    itemType: CANONICAL.FINISHED,
    kitchenRouting: 'all',
    qty: 1,
  }, null);
  expect(result.kitchenStatus).toBe('pending');
  expect(result.kitchenRouting).toBe('all');
});

// ------------------------------------------------------------------
// Test 3:
//   normalizeKitchenOrderItem via menuMap built from normalizeMenuItemModel
//   (simulates normalizeKitchenOrderItems() in app.js).
//   Finished item in menuMap → kitchenStatus:'pending'.
// ------------------------------------------------------------------
test('normalizeKitchenOrderItem: Finished item via menuMap → pending', () => {
  const helpers = makeHelpersSandbox();

  const rawDish = {
    id: 'vit_lon_om_bau',
    name: 'Vịt lộn om bầu',
    itemType: CANONICAL.FINISHED,
    price: 39000,
    ingredients: [],
    kitchenRouting: 'all',
  };
  const normalizedDish = helpers.normalizeMenuItemModel(rawDish);
  // Use the sandbox-context Map so `menuMap instanceof Map` works inside the vm sandbox.
  const SandboxMap = helpers._SandboxMap;
  const menuMap = new SandboxMap([[rawDish.id, normalizedDish]]);

  const cartItem = { id: 'vit_lon_om_bau', name: 'Vịt lộn om bầu', qty: 1 };
  const result = helpers.normalizeKitchenOrderItem(cartItem, menuMap);

  expect(result.kitchenStatus).toBe('pending');
  expect(result.kitchenRouting).toBe('all');
});

// ------------------------------------------------------------------
// Test 4:
//   Retail item → kitchenStatus:'skip' (correct, should stay skip).
// ------------------------------------------------------------------
test('normalizeKitchenOrderItem: Retail item → skip', () => {
  const helpers = makeHelpersSandbox();
  const result = helpers.normalizeKitchenOrderItem({
    id: 'pho_mai_hun_khoi',
    name: 'Phô mai hun khói kéo sợi',
    itemType: CANONICAL.RETAIL,
    qty: 1,
  }, null);
  expect(result.kitchenStatus).toBe('skip');
  expect(result.kitchenRouting).toBe('skip');
});

// ------------------------------------------------------------------
// Test 5:
//   Explicit kitchenRouting:'skip' on a Finished item → skip.
// ------------------------------------------------------------------
test('normalizeKitchenOrderItem: explicit skip routing → skip', () => {
  const helpers = makeHelpersSandbox();
  const result = helpers.normalizeKitchenOrderItem({
    id: 'duoi_1_nang',
    name: 'Đuối 1 nắng',
    itemType: CANONICAL.FINISHED,
    kitchenRouting: 'skip',
    qty: 1,
  }, null);
  expect(result.kitchenStatus).toBe('skip');
});

// ------------------------------------------------------------------
// Test 6:
//   addToOrder path: item constructed without kitchenRouting
//   but with correct itemType → pending (fallback 'all' routing).
//   This mirrors exactly what addToOrder() passes to normalizeKitchenOrderItem.
// ------------------------------------------------------------------
test('normalizeKitchenOrderItem: addToOrder-style call (no kitchenRouting) → pending for Finished', () => {
  const helpers = makeHelpersSandbox();
  // addToOrder passes: {id, name, price, cost, qty, itemType, linkedInventoryId}
  // — no kitchenRouting field.
  const result = helpers.normalizeKitchenOrderItem({
    id: 'trung_bac_thao',
    name: 'Trứng bắc thảo củ kiệu',
    price: 70000,
    cost: 0,
    qty: 1,
    itemType: CANONICAL.FINISHED,
    linkedInventoryId: null,
  });
  expect(result.kitchenStatus).toBe('pending');
  expect(result.kitchenRouting).toBe('all');
});

test('addToOrder preserves dish routing and app.js cache key is bumped', () => {
  const appSrc = fs.readFileSync(path.resolve(__dirname, '..', 'app.js'), 'utf-8');
  const indexSrc = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf-8');

  expect(appSrc).toContain("kitchenRouting: dish.kitchenRouting || undefined");
  expect(indexSrc).toContain('app.js?v=20260727-fix-item-types-self-contained');
});
