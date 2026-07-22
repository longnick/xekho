'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

function extractFunction(source, name) {
  const marker = `function ${name}`;
  const start = source.indexOf(marker);
  assert(start >= 0, `${name} exists`);
  const paramsEnd = source.indexOf(')', start);
  assert(paramsEnd >= 0, `${name} params end`);
  const bodyStart = source.indexOf('{', paramsEnd);
  assert(bodyStart >= 0, `${name} body start`);
  let depth = 0;
  for (let i = bodyStart; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    if (ch === '}') depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`${name} body end not found`);
}

const source = extractFunction(appSource, 'formatBillUnitPrice');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(`${source}; this.formatBillUnitPrice = formatBillUnitPrice;`, sandbox);

assert.strictEqual(sandbox.formatBillUnitPrice(17500), '17,5K', '17.500đ unit price shows as 17,5K, not rounded to 18K');
assert.strictEqual(sandbox.formatBillUnitPrice(18000), '18K', 'whole-thousand unit price stays compact');
assert.strictEqual(sandbox.formatBillUnitPrice(17550), '17,55K', 'non-half fractional thousands stay clear');
assert.strictEqual(sandbox.formatBillUnitPrice(999), '999', 'sub-thousand price stays full number');
assert(
  appSource.includes('${formatBillUnitPrice(i.price)}'),
  'openBillModal uses exact unit-price formatter for bill Đ.Giá column'
);
assert(
  !appSource.includes('<td style="text-align:right">${fmt(i.price)}</td>'),
  'bill Đ.Giá no longer uses rounding compact fmt()'
);

console.log('verify-bill-unit-price: ok');
