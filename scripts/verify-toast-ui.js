#!/usr/bin/env node
/**
 * Sprint 1.3 verification: app/ui/toast.js exports and compatibility.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const modulePath = path.join(root, 'app', 'ui', 'toast.js');
const src = fs.readFileSync(modulePath, 'utf8');

// 1. Syntax check already passed (node --check). Verify IIFE structure.
if (!src.includes('XekhoApp.ui.toast')) {
  console.error('FAIL: missing XekhoApp.ui.toast export');
  process.exit(1);
}
if (!src.includes('XekhoApp.ui.repairVietnameseText')) {
  console.error('FAIL: missing XekhoApp.ui.repairVietnameseText export');
  process.exit(1);
}

// 2. Simulate browser globals and verify IIFE sets them correctly.
const mockDocument = {
  getElementById: () => null,
  createElement: (tag) => ({
    id: '',
    style: { cssText: '', setProperty: () => {} },
    textContent: '',
    _hideTimer: null,
  }),
  body: { appendChild: () => {} },
};
const mockWindow = { document: mockDocument, setTimeout: () => 1, clearTimeout: () => {}, requestAnimationFrame: (fn) => fn() };
mockWindow.globalThis = mockWindow;

const ctx = vm.createContext({
  window: mockWindow,
  globalThis: mockWindow,
  document: mockDocument,
  setTimeout: mockWindow.setTimeout,
  clearTimeout: mockWindow.clearTimeout,
  requestAnimationFrame: mockWindow.requestAnimationFrame,
  TextDecoder: TextDecoder,
  Uint8Array: Uint8Array,
});

vm.runInContext(src, ctx);

const exported = mockWindow.XekhoApp.ui;
if (typeof exported.toast !== 'function') {
  console.error('FAIL: XekhoApp.ui.toast is not a function');
  process.exit(1);
}
if (typeof exported.repairVietnameseText !== 'function') {
  console.error('FAIL: XekhoApp.ui.repairVietnameseText is not a function');
  process.exit(1);
}

// 3. Verify repairVietnameseText handles clean input.
const clean = exported.repairVietnameseText('Pho bo ngon');
if (clean !== 'Pho bo ngon') {
  console.error('FAIL: clean input mangled:', clean);
  process.exit(1);
}

// 4. Verify showToast does not throw with mock DOM.
try {
  exported.toast('Test message', 'success', 1000);
} catch (err) {
  console.error('FAIL: showToast threw:', err.message);
  process.exit(1);
}

// 5. Verify globals are set for backward compat.
if (typeof mockWindow.showToast !== 'function') {
  console.error('FAIL: window.showToast not set');
  process.exit(1);
}
if (typeof mockWindow.repairVietnameseText !== 'function') {
  console.error('FAIL: window.repairVietnameseText not set');
  process.exit(1);
}

console.log('✅ verify-toast-ui Sprint 1.3 verification passed');
