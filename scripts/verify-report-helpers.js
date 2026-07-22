const vm = require('vm');
const fs = require('fs');
const path = require('path');

const errors = [];
function assert(cond, msg) { if (!cond) errors.push(msg); }
function assertEq(actual, expected, msg) {
  if (actual !== expected) errors.push(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const sandbox = {
  window: { appState: { dailyRevenueSnapshots: [
    { date: '2026-01-01', revenue: 100 },
    { date: '2026-01-02', revenue: 200 },
    { date: '2026-01-03', revenue: 150 },
  ]}},
  globalThis: {}, console, Set, Array, String, Number, Math, Object, RegExp, Error,
  isNaN, parseFloat, parseInt, Date, JSON, setTimeout, clearTimeout,
  Store: {
    getInventory: function () {
      return [
        { id: 'inv1', name: 'Thịt bò', unit: 'kg', itemType: 'ingredient', qty: 5, hidden: false },
        { id: 'inv2', name: 'Hành tây', unit: 'kg', itemType: 'ingredient', qty: 3, hidden: false },
        { id: 'inv3', name: 'Ga tre', unit: 'con', itemType: 'retail', qty: 10, hidden: false },
      ];
    },
  },
};
sandbox.global = sandbox;
vm.createContext(sandbox);

// Load dependencies
const toastSrc = fs.readFileSync(path.join(__dirname, '..', 'app', 'ui', 'toast.js'), 'utf-8');
vm.runInContext(toastSrc, sandbox);
const orderSrc = fs.readFileSync(path.join(__dirname, '..', 'app', 'order', 'helpers.js'), 'utf-8');
vm.runInContext(orderSrc, sandbox);
const parserSrc = fs.readFileSync(path.join(__dirname, '..', 'app', 'utils', 'parser.js'), 'utf-8');
vm.runInContext(parserSrc, sandbox);

// Load report/helpers.js
const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'report', 'helpers.js'), 'utf-8');
vm.runInContext(src, sandbox);

const r = sandbox.window.XekhoApp.report;
assert(r, 'XekhoApp.report exists');
assert(typeof r.getReportMenuIngredientKeys === 'function', 'getReportMenuIngredientKeys');
assert(typeof r.doesOrderMatchReportMenuItem === 'function', 'doesOrderMatchReportMenuItem');
assert(typeof r.doesPurchaseMatchReportMenuItem === 'function', 'doesPurchaseMatchReportMenuItem');
assert(typeof r.doesExpenseMatchReportMenuItem === 'function', 'doesExpenseMatchReportMenuItem');
assert(typeof r.getIngredientMergeSuggestions === 'function', 'getIngredientMergeSuggestions');
assert(typeof r.getDailyRevenueSnapshotsInRange === 'function', 'getDailyRevenueSnapshotsInRange');

// getReportMenuIngredientKeys
const keys1 = r.getReportMenuIngredientKeys(null);
assertEq(keys1.length, 0, 'null menuItem');

const keys2 = r.getReportMenuIngredientKeys({ name: 'Phở bò', ingredients: [{ name: 'Thịt bò' }, { name: 'Hành tây' }] });
assert(keys2.length >= 3, 'ingredient keys include own name + ingredients');
assert(keys2.some(k => k.includes('thit bo')), 'includes thịt bò');
assert(keys2.some(k => k.includes('hanh tay')), 'includes hành tây');
assert(keys2.some(k => k.includes('pho bo')), 'includes own name');

// doesOrderMatchReportMenuItem
assert(r.doesOrderMatchReportMenuItem({ items: [{ id: 'm1', name: 'Phở bò' }] }, null), 'null menuItem always matches');
assert(r.doesOrderMatchReportMenuItem({ items: [{ id: 'm1', name: 'Phở bò' }] }, { id: 'm1', name: 'Phở bò' }), 'match by id');
assert(!r.doesOrderMatchReportMenuItem({ items: [{ id: 'm2', name: 'Bún riêu' }] }, { id: 'm1', name: 'Phở bò' }), 'no match');

// doesPurchaseMatchReportMenuItem
assert(r.doesPurchaseMatchReportMenuItem({ name: 'Thịt bò' }, null), 'null menuItem always matches');
assert(r.doesPurchaseMatchReportMenuItem({ name: 'Thịt bò' }, { name: 'Phở bò', ingredients: [{ name: 'Thịt bò' }] }), 'purchase matches ingredient');

// doesExpenseMatchReportMenuItem
assert(r.doesExpenseMatchReportMenuItem({ name: 'Mua thịt bò' }, null), 'null menuItem always matches');

// getIngredientMergeSuggestions
const suggestions = r.getIngredientMergeSuggestions();
assert(Array.isArray(suggestions), 'returns array');

// getDailyRevenueSnapshotsInRange
const snapshots = r.getDailyRevenueSnapshotsInRange('2026-01-01', '2026-01-02');
assertEq(snapshots.length, 2, '2 snapshots in range');

console.log(`✅ verify-report-helpers: ${errors.length === 0 ? 'ALL PASSED' : errors.join('; ')}`);
if (errors.length) process.exit(1);
