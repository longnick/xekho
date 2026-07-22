#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const modulePath = path.join(root, 'app', 'utils', 'dom.js');
const source = fs.readFileSync(modulePath, 'utf8');

const sandbox = {
  window: {},
  console,
};
sandbox.globalThis = sandbox.window;
sandbox.self = sandbox.window;

vm.runInNewContext(source, sandbox, { filename: modulePath });

const escapeHtml = sandbox.window.XekhoApp?.utils?.dom?.escapeHtml;

if (typeof escapeHtml !== 'function') {
  throw new Error('Expected window.XekhoApp.utils.dom.escapeHtml to be a function');
}

const cases = [
  { input: null, expected: '' },
  { input: undefined, expected: '' },
  { input: 'XE KHÔ', expected: 'XE KHÔ' },
  { input: '<script>alert("x")</script>', expected: '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;' },
  { input: "A&B 'quote'", expected: 'A&amp;B &#39;quote&#39;' },
  { input: 12345, expected: '12345' },
];

for (const item of cases) {
  const actual = escapeHtml(item.input);
  if (actual !== item.expected) {
    throw new Error(`escapeHtml(${String(item.input)}) expected ${item.expected}, got ${actual}`);
  }
}

console.log('verify-dom-utils passed');
