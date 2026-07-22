#!/usr/bin/env node
/**
 * Sprint 1.5 verification: app/ui/modal.js exports and compatibility.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const modulePath = path.join(root, 'app', 'ui', 'modal.js');
const src = fs.readFileSync(modulePath, 'utf8');

// 1. Verify exports in source.
if (!src.includes('XekhoApp.ui.openModal')) {
  console.error('FAIL: missing XekhoApp.ui.openModal export');
  process.exit(1);
}
if (!src.includes('XekhoApp.ui.closeModal')) {
  console.error('FAIL: missing XekhoApp.ui.closeModal export');
  process.exit(1);
}
if (!src.includes('XekhoApp.ui.isModalOpen')) {
  console.error('FAIL: missing XekhoApp.ui.isModalOpen export');
  process.exit(1);
}

// 2. Simulate browser globals.
var lastClasses = {};
function makeClassList(initial) {
  return {
    _classes: initial ? [initial] : [],
    add: function (c) { if (this._classes.indexOf(c) === -1) this._classes.push(c); },
    remove: function (c) { this._classes = this._classes.filter(function (x) { return x !== c; }); },
    contains: function (c) { return this._classes.indexOf(c) !== -1; },
  };
}
var elements = {};
var mockDocument = {
  getElementById: function (id) {
    if (!elements[id]) elements[id] = { classList: makeClassList() };
    return elements[id];
  },
};
var mockWindow = { document: mockDocument };
mockWindow.globalThis = mockWindow;

var ctx = vm.createContext({
  window: mockWindow,
  globalThis: mockWindow,
  document: mockDocument,
});

vm.runInContext(src, ctx);

var exported = mockWindow.XekhoApp.ui;

// 3. Test openModal.
elements = {};
exported.openModal('test-modal');
if (!elements['test-modal'].classList.contains('active')) {
  console.error('FAIL: openModal did not add active class');
  process.exit(1);
}

// 4. Test closeModal.
exported.closeModal('test-modal');
if (elements['test-modal'].classList.contains('active')) {
  console.error('FAIL: closeModal did not remove active class');
  process.exit(1);
}

// 5. Test isModalOpen.
elements = {};
if (exported.isModalOpen('new-modal')) {
  console.error('FAIL: isModalOpen returned true for non-existent modal');
  process.exit(1);
}
exported.openModal('new-modal');
if (!exported.isModalOpen('new-modal')) {
  console.error('FAIL: isModalOpen returned false after openModal');
  process.exit(1);
}

// 6. Test openModal with DOM element directly.
var directEl = { classList: makeClassList() };
exported.openModal(directEl);
if (!directEl.classList.contains('active')) {
  console.error('FAIL: openModal(element) did not add active class');
  process.exit(1);
}

// 7. Verify globals.
if (typeof mockWindow.openModal !== 'function') {
  console.error('FAIL: window.openModal not set');
  process.exit(1);
}
if (typeof mockWindow.closeModal !== 'function') {
  console.error('FAIL: window.closeModal not set');
  process.exit(1);
}

console.log('✅ verify-modal-ui Sprint 1.5 verification passed');
