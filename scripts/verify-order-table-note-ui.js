#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const styleCss = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

function assertContains(source, needle, label) {
  assert(source.includes(needle), `${label}: missing ${needle}`);
}

assertContains(indexHtml, 'id="order-table-note"', 'order header note input');
assertContains(indexHtml, 'placeholder="Tên bàn / ghi chú..."', 'order header note placeholder');
assertContains(indexHtml, 'oninput="handleOrderTableNoteInput(this.value)"', 'order header note input handler');
assertContains(indexHtml, 'id="order-table-title"', 'order table title still present');

assertContains(styleCss, '.order-table-note-field', 'note field CSS');
assertContains(styleCss, 'flex: 1 1 260px;', 'desktop flexible note field');
assertContains(styleCss, '@media (max-width: 767px)', 'mobile media query');
assertContains(styleCss, '.order-table-note-field { flex: 1 1 calc(100% - 52px);', 'mobile note field layout');
assertContains(styleCss, '.order-header { margin-bottom: 0; flex-wrap: wrap;', 'mobile header wrap');

[
  'function getTableNoteForOrder(tableKey)',
  'function ensureOrderExtrasForCurrentTable()',
  'function syncOrderTableNoteInput(value)',
  'function updateCurrentTableNoteEverywhere(noteValue)',
  'function handleOrderTableNoteInput(value)',
  'window.DB.Tables.update(key, { note:',
  'document.getElementById(\'order-table-note\')',
].forEach((needle) => assertContains(appJs, needle, 'app note sync source'));

assert(
  /function openTable[\s\S]*ensureOrderExtrasForCurrentTable\(\);[\s\S]*syncOrderTableNoteInput\(\);[\s\S]*navigate\('orders'\);/.test(appJs),
  'openTable should prepare and render the header table note before navigating orders'
);
assert(
  /function openTakeaway[\s\S]*ensureOrderExtrasForCurrentTable\(\);[\s\S]*syncOrderTableNoteInput\(\);[\s\S]*navigate\('orders'\);/.test(appJs),
  'openTakeaway should prepare and render the header note input'
);
assert(
  /if \(noteInp && document\.activeElement === noteInp\) updateCurrentTableNoteEverywhere\(noteInp\.value \|\| ''\);/.test(appJs),
  'cart note input should use the same table note sync path'
);
assert(
  /if \(headerNoteInp && document\.activeElement === headerNoteInp\) updateCurrentTableNoteEverywhere\(headerNoteInp\.value \|\| ''\);/.test(appJs),
  'header note input should use the table note sync path in renderCart'
);

console.log('✅ verify-order-table-note-ui passed');
