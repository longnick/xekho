#!/usr/bin/env node
'use strict';

const fs = require('fs');
const assert = require('assert');
const path = require('path');

const repo = path.resolve(__dirname, '..');
const modulePath = path.join(repo, 'app/esm/ui/report-transaction-filters.js');
const source = fs.readFileSync(modulePath, 'utf8');

async function importEsmFromSource(sourceText) {
  return import('data:text/javascript;charset=utf-8,' + encodeURIComponent(sourceText));
}

function createDocument() {
  const listeners = { change: [] };
  return {
    listeners,
    addEventListener(type, handler) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(handler);
    },
    removeEventListener(type, handler) {
      listeners[type] = (listeners[type] || []).filter((fn) => fn !== handler);
    },
  };
}

function createInput(type, checked) {
  return {
    checked,
    dataset: { esmReportTransactionFilter: type },
    closest(selector) {
      return selector === '[data-esm-report-transaction-filter]' ? this : null;
    },
  };
}

(async function main() {
  const mod = await importEsmFromSource(source);
  assert.strictEqual(typeof mod.callReportTransactionFilter, 'function', 'callReportTransactionFilter export missing');
  assert.strictEqual(typeof mod.installReportTransactionFilters, 'function', 'installReportTransactionFilters export missing');

  const calls = [];
  const doc = createDocument();
  const win = {
    document: doc,
    XekhoApp: {},
    setReportTransactionFilter(type, checked) {
      calls.push({ type, checked });
      return type + ':' + checked;
    },
  };

  assert.strictEqual(mod.callReportTransactionFilter('sales', false, win), 'sales:false', 'direct delegation failed');
  assert.deepStrictEqual(calls, [{ type: 'sales', checked: false }], 'direct delegation args mismatch');

  const api = mod.installReportTransactionFilters(win);
  assert.strictEqual(api.selector, '[data-esm-report-transaction-filter]', 'selector mismatch');
  assert.strictEqual(api.installed, true, 'installer did not attach listener');
  assert.strictEqual(win.XekhoApp.esm.ui.reportTransactionFilters, api, 'namespace not published');
  assert.strictEqual(doc.listeners.change.length, 1, 'expected one change listener');

  doc.listeners.change[0]({ target: createInput('expenses', true) });
  assert.deepStrictEqual(calls, [
    { type: 'sales', checked: false },
    { type: 'expenses', checked: true },
  ], 'delegated change did not dispatch type/checked');

  api.detach();
  assert.strictEqual(doc.listeners.change.length, 0, 'detach should remove listener');

  const html = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');
  assert(!html.includes("onchange=\"setReportTransactionFilter('sales', this.checked)\""), 'sales inline handler still present');
  assert(!html.includes("onchange=\"setReportTransactionFilter('purchases', this.checked)\""), 'purchases inline handler still present');
  assert(!html.includes("onchange=\"setReportTransactionFilter('expenses', this.checked)\""), 'expenses inline handler still present');
  assert.strictEqual((html.match(/data-esm-report-transaction-filter=/g) || []).length, 6, 'expected six report transaction filters');

  console.log('verify-esm-report-transaction-filters passed', {
    exports: Object.keys(mod).sort(),
    listenersDetached: doc.listeners.change.length === 0,
    convertedReportTransactionFilters: (html.match(/data-esm-report-transaction-filter=/g) || []).length,
  });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
