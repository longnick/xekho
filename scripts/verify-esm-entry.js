#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const entryPath = path.join(root, 'app', 'esm', 'main.js');
const domFacadePath = path.join(root, 'app', 'esm', 'utils', 'dom.js');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const indexHtml = fs.readFileSync(indexPath, 'utf8');
const entrySource = fs.readFileSync(entryPath, 'utf8');
const domFacadeSource = fs.readFileSync(domFacadePath, 'utf8');
const entryTag = '<script type="module" src="app/esm/main.js?v=20260602-e2-dom"></script>';

assert(indexHtml.includes(entryTag), 'index.html must load app/esm/main.js as a module script');
assert(indexHtml.includes('offlineOrderFallbackDevTools.js'), 'expected offline devtools script marker');
assert(indexHtml.indexOf('offlineOrderFallbackDevTools.js') < indexHtml.indexOf(entryTag), 'ESM entry must load after existing offline classic scripts');
assert(indexHtml.indexOf(entryTag) < indexHtml.indexOf('// Extra helpers that reference DOM'), 'ESM entry must load before inline DOM helper script');
assert(entrySource.includes("import { escapeHtml, installGlobalDomUtils } from './utils/dom.js';"), 'ESM entry must import dom facade');
assert(entrySource.includes('XekhoApp.esm.harness'), 'ESM entry must set XekhoApp.esm.harness');
assert(entrySource.includes('XekhoApp.esm.facades.dom'), 'ESM entry must record dom facade readiness');
assert(entrySource.includes('xekho:esm-ready'), 'ESM entry must dispatch xekho:esm-ready when possible');
assert(domFacadeSource.includes('export function escapeHtml'), 'dom facade must export escapeHtml');
assert(domFacadeSource.includes('export function installGlobalDomUtils'), 'dom facade must export installer');

// VM smoke test the harness body by stripping its static import and injecting the imported functions.
const classicDomSource = fs.readFileSync(path.join(root, 'app', 'utils', 'dom.js'), 'utf8');
const executableEntrySource = entrySource.replace("import { escapeHtml, installGlobalDomUtils } from './utils/dom.js';", '');
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
  escapeHtml: function escapeHtml(text) {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },
  installGlobalDomUtils: function installGlobalDomUtils(globalScope) {
    var rootScope = globalScope || win;
    rootScope.XekhoApp = rootScope.XekhoApp || {};
    rootScope.XekhoApp.utils = rootScope.XekhoApp.utils || {};
    rootScope.XekhoApp.utils.dom = Object.assign({}, rootScope.XekhoApp.utils.dom, {
      escapeHtml: sandbox.escapeHtml,
    });
    return rootScope.XekhoApp.utils.dom;
  },
};
vm.createContext(sandbox);
vm.runInContext(classicDomSource, sandbox, { filename: 'app/utils/dom.js' });
vm.runInContext(executableEntrySource, sandbox, { filename: 'app/esm/main.js' });

assert(win.XekhoApp.esm.harness.loaded === true, 'harness.loaded should be true');
assert(win.XekhoApp.esm.harness.version === '20260602-e2-dom', 'harness version mismatch');
assert(win.XekhoApp.esm.harness.classicRuntimePresent === true, 'classic runtime marker should be detected');
assert(win.XekhoApp.esm.facades.dom.loaded === true, 'dom facade marker should be loaded');
assert(win.XekhoApp.esm.facades.dom.escapeHtmlMatchesGlobal === true, 'dom facade should install matching global escapeHtml');
assert(win.XekhoApp.utils.dom.escapeHtml('<b>&"\'') === '&lt;b&gt;&amp;&quot;&#39;', 'global escapeHtml should escape HTML');
assert(events.length === 1, 'expected exactly one esm-ready event');
assert(events[0].type === 'xekho:esm-ready', 'unexpected event type');

console.log('verify-esm-entry passed', win.XekhoApp.esm.harness, win.XekhoApp.esm.facades.dom);
