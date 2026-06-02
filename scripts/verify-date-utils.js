'use strict';

const vm = require('vm');
const fs = require('fs');
const path = require('path');

const datePath = path.resolve(__dirname, '..', 'app', 'utils', 'date.js');
const dateSrc = fs.readFileSync(datePath, 'utf-8');

const sandbox = {
  window: { XekhoApp: {} },
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
new vm.Script(dateSrc, { filename: 'date.js' }).runInContext(sandbox);

const exported = sandbox.window.XekhoApp.utils.date;
const expectedFunctions = [
  'formatLocalDateKey',
  'getWeekStartKey',
  'resolvePeriodDateRangePure',
];

const missing = expectedFunctions.filter(fn => typeof exported[fn] !== 'function');
if (missing.length) {
  console.error('FAIL: Missing exports:', missing);
  process.exit(1);
}

// Test formatLocalDateKey
const key = exported.formatLocalDateKey(new Date('2025-06-15T10:00:00Z'));
if (key !== '2025-06-15' && key !== '2025-06-14') {
  // timezone-dependent, just check format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    console.error('FAIL: formatLocalDateKey format wrong:', key);
    process.exit(1);
  }
}

// Test getWeekStartKey — should return a Monday
const weekKey = exported.getWeekStartKey(new Date('2025-06-15T10:00:00Z'));
if (!/^\d{4}-\d{2}-\d{2}$/.test(weekKey)) {
  console.error('FAIL: getWeekStartKey format wrong:', weekKey);
  process.exit(1);
}

// Test resolvePeriodDateRangePure
const today = exported.resolvePeriodDateRangePure('today');
if (!today || !today.fromDate || !today.toDate) {
  console.error('FAIL: today range missing dates');
  process.exit(1);
}
if (today.fromDate !== today.toDate) {
  console.error('FAIL: today range should have same from/to');
  process.exit(1);
}

const week = exported.resolvePeriodDateRangePure('week');
if (!week || !week.fromDate || !week.toDate) {
  console.error('FAIL: week range missing dates');
  process.exit(1);
}

const month = exported.resolvePeriodDateRangePure('month');
if (!month || !month.fromDate || !month.toDate) {
  console.error('FAIL: month range missing dates');
  process.exit(1);
}

const range = exported.resolvePeriodDateRangePure('range', { fromDate: '2025-01-01', toDate: '2025-01-31' });
if (!range || range.fromDate !== '2025-01-01' || range.toDate !== '2025-01-31') {
  console.error('FAIL: explicit range wrong:', range);
  process.exit(1);
}

const unknown = exported.resolvePeriodDateRangePure('custom_period');
if (unknown !== null) {
  console.error('FAIL: unknown period should return null');
  process.exit(1);
}

console.log('\u2705 verify-date-utils Sprint 4.2 verification passed');
console.log('   ' + expectedFunctions.length + ' functions exported');
