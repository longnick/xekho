const vm = require('vm');
const fs = require('fs');
const path = require('path');

const errors = [];
function assert(cond, msg) { if (!cond) errors.push(msg); }
function assertEq(actual, expected, msg) {
  if (actual !== expected) errors.push(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const sandbox = { window: {}, globalThis: {}, console, Set, Array, String, Number, Math, Object, RegExp, Error, isNaN, parseFloat, parseInt, Set };
sandbox.global = sandbox;
vm.createContext(sandbox);

const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'utils', 'parser.js'), 'utf-8');
vm.runInContext(src, sandbox);

const p = sandbox.window.XekhoApp.utils.parser;
assert(p, 'XekhoApp.utils.parser exists');
assert(typeof p.parsePurchaseText === 'function', 'parsePurchaseText is function');
assert(typeof p.parsePurchaseJson === 'function', 'parsePurchaseJson is function');
assert(typeof p.getKitchenRoutingLabel === 'function', 'getKitchenRoutingLabel is function');
assert(typeof p.tokenSimilarity === 'function', 'tokenSimilarity is function');
assert(typeof p.getMenuItemImageUrl === 'function', 'getMenuItemImageUrl is function');

// parsePurchaseText
const r1 = p.parsePurchaseText('Ga 10 con\n50000', 'test');
assertEq(r1.name, 'Ga 10 con', 'parsePurchaseText name');
assertEq(r1.price, 50000, 'parsePurchaseText price');

// parsePurchaseJson
const r2 = p.parsePurchaseJson({ name: 'Ga', qty: 10, price: 50000, rawText: 'raw' }, 'test');
assertEq(r2.name, 'Ga', 'parsePurchaseJson name');
assertEq(r2.qty, 10, 'parsePurchaseJson qty');
assertEq(r2.price, 50000, 'parsePurchaseJson price');

// getKitchenRoutingLabel
assertEq(p.getKitchenRoutingLabel('kitchen_1'), 'Bếp 1', 'kitchen_1');
assertEq(p.getKitchenRoutingLabel('kitchen_2'), 'Bếp 2', 'kitchen_2');
assertEq(p.getKitchenRoutingLabel('skip'), 'Không qua bếp', 'skip');
assertEq(p.getKitchenRoutingLabel(''), 'Cả 2 bếp', 'default');

// tokenSimilarity
assertEq(p.tokenSimilarity('hello', 'hello'), 1, 'identical tokens');
assert(p.tokenSimilarity('hello world', 'hello there') > 0 && p.tokenSimilarity('hello world', 'hello there') < 1, 'partial similarity');
assertEq(p.tokenSimilarity('abc', 'xyz'), 0, 'no overlap');

// getMenuItemImageUrl
assertEq(p.getMenuItemImageUrl({ image_url: 'http://img.jpg' }), 'http://img.jpg', 'image_url');
assertEq(p.getMenuItemImageUrl({ imageUrl: 'http://img2.jpg' }), 'http://img2.jpg', 'imageUrl');
assertEq(p.getMenuItemImageUrl({}), '', 'empty');

console.log(`✅ verify-parser-utils: ${errors.length === 0 ? 'ALL PASSED' : errors.join('; ')}`);
if (errors.length) process.exit(1);
