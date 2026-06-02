const vm = require('vm');
const fs = require('fs');
const path = require('path');

const errors = [];
function assert(cond, msg) { if (!cond) errors.push(msg); }
function assertEq(actual, expected, msg) {
  if (actual !== expected) errors.push(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// Pre-load toast.js (repairVietnameseText) and order/helpers.js (normalizeViKey)
const toastSrc = fs.readFileSync(path.join(__dirname, '..', 'app', 'ui', 'toast.js'), 'utf-8');
const orderSrc = fs.readFileSync(path.join(__dirname, '..', 'app', 'order', 'helpers.js'), 'utf-8');

const sandbox = { window: {}, globalThis: {}, console, Set, Array, String, Number, Math, Object, RegExp, Error, isNaN, parseFloat, parseInt, Date, JSON };
sandbox.global = sandbox;
vm.createContext(sandbox);

// Load dependencies first
vm.runInContext(toastSrc, sandbox);
vm.runInContext(orderSrc, sandbox);

// Load categorize.js
const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'utils', 'categorize.js'), 'utf-8');
vm.runInContext(src, sandbox);

const c = sandbox.window.XekhoApp.utils.categorize;
assert(c, 'XekhoApp.utils.categorize exists');
assert(typeof c.normalizeExpenseCategoryLabel === 'function', 'normalizeExpenseCategoryLabel is function');
assert(typeof c.detectAdsExpensePlatform === 'function', 'detectAdsExpensePlatform is function');
assert(typeof c.isAdsExpenseEntry === 'function', 'isAdsExpenseEntry is function');
assert(typeof c.mediaRefineryStatusClass === 'function', 'mediaRefineryStatusClass is function');
assert(typeof c.countInclusiveReportDays === 'function', 'countInclusiveReportDays is function');

// normalizeExpenseCategoryLabel
assertEq(c.normalizeExpenseCategoryLabel('nguyên liệu'), 'Chi phí nguyên liệu', 'nguyen lieu');
assertEq(c.normalizeExpenseCategoryLabel('marketing'), 'Chi phí marketing', 'marketing');
assertEq(c.normalizeExpenseCategoryLabel(''), 'Chi phí khác', 'empty');

// detectAdsExpensePlatform
assertEq(c.detectAdsExpensePlatform({ name: 'Facebook Ads' }), 'facebook', 'facebook');
assertEq(c.detectAdsExpensePlatform({ name: 'TikTok Ads' }), 'tiktok', 'tiktok');
assertEq(c.detectAdsExpensePlatform({ name: 'Mua hàng' }), '', 'none');

// isAdsExpenseEntry
assert(c.isAdsExpenseEntry({ name: 'Facebook Ads' }), 'is ads - facebook');
assert(c.isAdsExpenseEntry({ name: 'Chi phí quảng cáo' }), 'is ads - quang cao');
assert(!c.isAdsExpenseEntry({ name: 'Mua gà' }), 'not ads');

// mediaRefineryStatusClass
assertEq(c.mediaRefineryStatusClass('PUBLISH_READY'), 'success', 'PUBLISH_READY');
assertEq(c.mediaRefineryStatusClass('REJECTED'), 'danger', 'REJECTED');
assertEq(c.mediaRefineryStatusClass('NEEDS_MANUAL_REVIEW'), 'warning', 'NEEDS_MANUAL_REVIEW');
assertEq(c.mediaRefineryStatusClass('DRAFT'), 'info', 'DRAFT');

// countInclusiveReportDays
assertEq(c.countInclusiveReportDays('2026-01-01', '2026-01-01'), 1, 'same day');
assertEq(c.countInclusiveReportDays('2026-01-01', '2026-01-07'), 7, '7 days');
assertEq(c.countInclusiveReportDays('2026-01-07', '2026-01-01'), 0, 'inverted');

console.log(`✅ verify-categorize-utils: ${errors.length === 0 ? 'ALL PASSED' : errors.join('; ')}`);
if (errors.length) process.exit(1);
