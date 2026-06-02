#!/usr/bin/env node
/**
 * Sprint 1.4 verification: app/ui/theme.js exports and compatibility.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const modulePath = path.join(root, 'app', 'ui', 'theme.js');
const src = fs.readFileSync(modulePath, 'utf8');

// 1. Syntax check: verify IIFE exports.
if (!src.includes('XekhoApp.ui.applyTheme')) {
  console.error('FAIL: missing XekhoApp.ui.applyTheme export');
  process.exit(1);
}

// 2. Simulate browser globals and verify IIFE sets them correctly.
var lastRemoved = [];
var lastAdded = [];
var mockBody = {
  classList: {
    remove: function () { lastRemoved = Array.prototype.slice.call(arguments); },
    add: function () { lastAdded = Array.prototype.slice.call(arguments); },
  },
};
var mockDocument = { body: mockBody };
var mockWindow = { document: mockDocument };
mockWindow.globalThis = mockWindow;

var ctx = vm.createContext({
  window: mockWindow,
  globalThis: mockWindow,
  document: mockDocument,
});

vm.runInContext(src, ctx);

var exported = mockWindow.XekhoApp.ui;
if (typeof exported.applyTheme !== 'function') {
  console.error('FAIL: XekhoApp.ui.applyTheme is not a function');
  process.exit(1);
}

// 3. Verify applyTheme removes old classes and adds new one.
lastRemoved = [];
lastAdded = [];
exported.applyTheme('chill');
if (lastAdded.indexOf('theme-chill') === -1) {
  console.error('FAIL: applyTheme("chill") did not add theme-chill');
  process.exit(1);
}
if (lastRemoved.length < 3) {
  console.error('FAIL: applyTheme did not remove enough old classes');
  process.exit(1);
}

// 4. Verify default theme fallback.
lastAdded = [];
exported.applyTheme(null);
if (lastAdded.indexOf('theme-hien-dai') === -1) {
  console.error('FAIL: applyTheme(null) did not default to theme-hien-dai');
  process.exit(1);
}

// 5. Verify global compat.
if (typeof mockWindow.applyTheme !== 'function') {
  console.error('FAIL: window.applyTheme not set');
  process.exit(1);
}

console.log('✅ verify-theme-ui Sprint 1.4 verification passed');
