#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const entryPath = path.join(root, 'app', 'esm', 'main.js');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const indexHtml = fs.readFileSync(indexPath, 'utf8');
const entrySource = fs.readFileSync(entryPath, 'utf8');
const entryTag = '<script type="module" src="app/esm/main.js?v=20260602-e1"></script>';

assert(indexHtml.includes(entryTag), 'index.html must load app/esm/main.js as a module script');
assert(indexHtml.includes('offlineOrderFallbackDevTools.js'), 'expected offline devtools script marker');
assert(indexHtml.indexOf('offlineOrderFallbackDevTools.js') < indexHtml.indexOf(entryTag), 'ESM entry must load after existing offline classic scripts');
assert(indexHtml.indexOf(entryTag) < indexHtml.indexOf('// Extra helpers that reference DOM'), 'ESM entry must load before inline DOM helper script');
assert(entrySource.includes('XekhoApp.esm.harness'), 'ESM entry must set XekhoApp.esm.harness');
assert(entrySource.includes('xekho:esm-ready'), 'ESM entry must dispatch xekho:esm-ready when possible');

const events = [];
const win = {
  XekhoApp: {
    utils: {
      format: {},
    },
  },
  Store: {},
  CustomEvent: function CustomEvent(type, init) {
    this.type = type;
    this.detail = init && init.detail;
  },
  dispatchEvent: function dispatchEvent(event) {
    events.push(event);
  },
};
win.window = win;
const sandbox = {
  window: win,
  globalThis: win,
  Date,
};
vm.createContext(sandbox);
vm.runInContext(entrySource, sandbox, { filename: 'app/esm/main.js' });

assert(win.XekhoApp.esm.harness.loaded === true, 'harness.loaded should be true');
assert(win.XekhoApp.esm.harness.version === '20260602-e1', 'harness version mismatch');
assert(win.XekhoApp.esm.harness.classicRuntimePresent === true, 'classic runtime marker should be detected');
assert(events.length === 1, 'expected exactly one esm-ready event');
assert(events[0].type === 'xekho:esm-ready', 'unexpected event type');

console.log('verify-esm-entry passed', win.XekhoApp.esm.harness);
