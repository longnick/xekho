#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const modulePath = path.join(root, 'app', 'utils', 'format.js');
const storePath = path.join(root, 'store.js');
const source = fs.readFileSync(modulePath, 'utf8');
const storeSource = fs.readFileSync(storePath, 'utf8');

const sandbox = {
  window: {},
  console,
};
sandbox.globalThis = sandbox.window;
sandbox.self = sandbox.window;

vm.runInNewContext(source, sandbox, { filename: modulePath });

const format = sandbox.window.XekhoApp?.utils?.format;
if (!format || typeof format !== 'object') {
  throw new Error('Expected window.XekhoApp.utils.format to be an object');
}

const cases = [
  ['compactNumber', 999, '999'],
  ['compactNumber', 1000, '1K'],
  ['compactNumber', 2500000, '2.5M'],
  ['compactNumber', 'bad-input', '0'],
  ['currency', 1234567, '1.234.567đ'],
  ['currency', null, '0đ'],
];

for (const [fn, input, expected] of cases) {
  const actual = format[fn](input);
  if (actual !== expected) {
    throw new Error(`${fn}(${String(input)}) expected ${expected}, got ${actual}`);
  }
}

const localDate = new Date(2026, 5, 2, 9, 5, 0);
if (format.date(localDate) !== '02/06/2026') {
  throw new Error(`date(localDate) expected 02/06/2026, got ${format.date(localDate)}`);
}
if (!/^\d{2}:\d{2}$/.test(format.time(localDate))) {
  throw new Error(`time(localDate) expected HH:mm, got ${format.time(localDate)}`);
}
if (format.dateTime(localDate) !== `${format.date(localDate)} ${format.time(localDate)}`) {
  throw new Error('dateTime should compose date() and time()');
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(format.todayKey())) {
  throw new Error(`todayKey expected YYYY-MM-DD, got ${format.todayKey()}`);
}

const expectedDelegations = [
  '_formatUtils.compactNumber',
  '_formatUtils.currency',
  '_formatUtils.date',
  '_formatUtils.time',
  '_formatUtils.dateTime',
  '_formatUtils.todayKey',
];
for (const marker of expectedDelegations) {
  if (!storeSource.includes(marker)) {
    throw new Error(`store.js missing formatter delegation marker: ${marker}`);
  }
}

console.log('verify-format-utils passed');
