'use strict';

const vm = require('vm');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '..', 'app', 'report', 'expense.js'), 'utf-8');

// In the browser, global functions are on `window`.
// The IIFE uses `typeof window !== 'undefined' ? window : globalThis` as global.
// So we must put test functions on `sandbox.window` to match browser behavior.
const win = {
  XekhoApp: {},
  filterPurchases: function (period, opts) {
    return [
      { id: 'p1', name: 'Gạo', date: '2026-06-02T10:00:00', price: 50000, qty: 10, unit: 'kg', supplier: 'NCC A' },
    ];
  },
  filterExpenses: function (period, opts) {
    return [
      { id: 'e1', name: 'Tiền điện', date: '2026-06-02T10:00:00', amount: 200000, category: 'Ti\u1ec7n \u0111i\u1ec7n' },
    ];
  },
  normalizePositiveAmount: function (n) { return Math.max(0, Number(n) || 0); },
  uid: function () { return 'test-uid-123'; },
  fmt: function (n) { return String(n); },
  console: console,
};
const sandbox = { window: win, globalThis: win };
vm.createContext(sandbox);
new vm.Script(src, { filename: 'expense.js' }).runInContext(sandbox);

const exported = win.XekhoApp.report;
if (typeof exported.buildOperationalExpenseBreakdown !== 'function') {
  console.error('FAIL: buildOperationalExpenseBreakdown not exported');
  process.exit(1);
}

const result = exported.buildOperationalExpenseBreakdown('today', {}, { includeFixedCost: false });
if (!result || !Array.isArray(result.rows)) {
  console.error('FAIL: result should have rows array');
  process.exit(1);
}
if (result.rows.length !== 2) {
  console.error('FAIL: expected 2 rows, got', result.rows.length);
  process.exit(1);
}
if (typeof result.total !== 'number') {
  console.error('FAIL: total should be a number');
  process.exit(1);
}
console.log('\u2705 buildOperationalExpenseBreakdown: ' + result.rows.length + ' rows, total=' + result.total);

// Verify the output structure
const purchaseRow = result.rows.find(r => r.type === 'purchase');
const expenseRow = result.rows.find(r => r.type === 'expense');
if (!purchaseRow || !expenseRow) {
  console.error('FAIL: should have both purchase and expense rows');
  process.exit(1);
}
if (purchaseRow.amount !== 50000) {
  console.error('FAIL: purchase amount should be 50000, got', purchaseRow.amount);
  process.exit(1);
}
if (expenseRow.amount !== 200000) {
  console.error('FAIL: expense amount should be 200000, got', expenseRow.amount);
  process.exit(1);
}

console.log('\u2705 verify-report-expense Sprint 8.3 verification passed');
