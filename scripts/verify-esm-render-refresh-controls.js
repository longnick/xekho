#!/usr/bin/env node
'use strict';

const fs = require('fs');
const assert = require('assert');
const path = require('path');

const repo = path.resolve(__dirname, '..');
const modulePath = path.join(repo, 'app/esm/ui/render-refresh-controls.js');
const htmlPath = path.join(repo, 'index.html');

function makeDocument() {
  const listeners = { change: [], input: [], click: [] };
  return {
    listeners,
    addEventListener(type, fn) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(fn);
    },
    removeEventListener(type, fn) {
      listeners[type] = (listeners[type] || []).filter((item) => item !== fn);
    },
  };
}

function makeElement(name, tag = 'input') {
  return {
    attrs: { 'data-esm-render-refresh': name },
    getAttribute(attr) { return this.attrs[attr] || ''; },
    closest(selector) { return selector === '[data-esm-render-refresh]' ? this : null; },
    matches(selector) {
      if (selector === 'button,[role="button"],a') return tag === 'button' || tag === 'a';
      return false;
    },
  };
}

function count(re, text) {
  return (text.match(re) || []).length;
}

(async function main() {
  const source = fs.readFileSync(modulePath, 'utf8');
  const mod = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(source));

  assert.strictEqual(typeof mod.callRenderRefresh, 'function');
  assert.strictEqual(typeof mod.installRenderRefreshControls, 'function');
  assert.strictEqual(typeof mod.publishRenderRefreshControls, 'function');

  const calls = [];
  const doc = makeDocument();
  const root = {
    document: doc,
    XekhoApp: {},
    applyStocktakeHistoryFilter() { calls.push('applyStocktakeHistoryFilter'); },
    renderLedger() { calls.push('renderLedger'); },
    renderAttendanceManagement() { calls.push('renderAttendanceManagement'); },
    resetAllData() { calls.push('resetAllData'); },
  };

  assert.strictEqual(mod.callRenderRefresh(root, 'renderLedger'), undefined);
  assert.deepStrictEqual(calls, ['renderLedger']);
  mod.callRenderRefresh(root, 'resetAllData');
  assert.deepStrictEqual(calls, ['renderLedger'], 'disallowed legacy functions must not be callable');

  mod.publishRenderRefreshControls(root);
  assert.strictEqual(typeof root.XekhoApp.esm.ui.renderRefreshControls.callRenderRefresh, 'function');

  const installed = mod.installRenderRefreshControls(root);
  assert.strictEqual(installed.installed, true);
  assert.strictEqual(installed.selector, '[data-esm-render-refresh]');
  assert.strictEqual(doc.listeners.change.length, 1);
  assert.strictEqual(doc.listeners.input.length, 1);
  assert.strictEqual(doc.listeners.click.length, 1);

  doc.listeners.change[0]({ target: makeElement('applyStocktakeHistoryFilter') });
  let prevented = false;
  doc.listeners.click[0]({ target: makeElement('renderAttendanceManagement', 'button'), preventDefault() { prevented = true; } });
  doc.listeners.click[0]({ target: makeElement('renderLedger', 'input'), preventDefault() { calls.push('unexpected-prevent'); } });
  assert.strictEqual(prevented, true);
  assert.deepStrictEqual(calls, [
    'renderLedger',
    'applyStocktakeHistoryFilter',
    'renderAttendanceManagement',
  ]);

  installed.detach();
  assert.strictEqual(doc.listeners.change.length, 0);
  assert.strictEqual(doc.listeners.input.length, 0);
  assert.strictEqual(doc.listeners.click.length, 0);

  const html = fs.readFileSync(htmlPath, 'utf8');
  assert.strictEqual(count(/onchange="renderLedger\(\)"/g, html), 0);
  assert.strictEqual(count(/on(?:click|input|change)="renderMediaRefinery\(\)"/g, html), 0);
  assert.strictEqual(count(/on(?:click|change)="renderAttendanceManagement\(\)"/g, html), 0);
  assert.strictEqual(count(/onchange="applyStocktakeHistoryFilter\(\)"/g, html), 0);
  assert.strictEqual(count(/data-esm-render-refresh="renderLedger"/g, html), 3);
  assert.strictEqual(count(/data-esm-render-refresh="renderMediaRefinery"/g, html), 0);
  assert.strictEqual(count(/data-esm-render-refresh="renderAttendanceManagement"/g, html), 3);
  assert.strictEqual(count(/data-esm-render-refresh="applyStocktakeHistoryFilter"/g, html), 3);

  console.log('verify-esm-render-refresh-controls passed', {
    exports: Object.keys(mod).sort(),
    listenersDetached: true,
    renderLedger: count(/data-esm-render-refresh="renderLedger"/g, html),
    renderAttendanceManagement: count(/data-esm-render-refresh="renderAttendanceManagement"/g, html),
    applyStocktakeHistoryFilter: count(/data-esm-render-refresh="applyStocktakeHistoryFilter"/g, html),
  });
})();
