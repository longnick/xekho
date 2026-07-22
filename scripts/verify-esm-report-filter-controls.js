#!/usr/bin/env node
'use strict';

const fs = require('fs');
const assert = require('assert');
const path = require('path');

const repo = path.resolve(__dirname, '..');
const modulePath = path.join(repo, 'app/esm/ui/report-filter-controls.js');
const source = fs.readFileSync(modulePath, 'utf8');

async function importEsmFromSource(sourceText) {
  return import('data:text/javascript;charset=utf-8,' + encodeURIComponent(sourceText));
}

function createDocument() {
  const listeners = { change: [], click: [] };
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

function createSelect(value) {
  return {
    value,
    closest(selector) {
      return selector === '[data-esm-report-menu-filter]' ? this : null;
    },
  };
}

function createButton() {
  return {
    closest(selector) {
      return selector === '[data-esm-report-filter-reset]' ? this : null;
    },
  };
}

(async function main() {
  const mod = await importEsmFromSource(source);
  assert.strictEqual(typeof mod.callReportMenuFilter, 'function', 'callReportMenuFilter export missing');
  assert.strictEqual(typeof mod.callReportFilterReset, 'function', 'callReportFilterReset export missing');
  assert.strictEqual(typeof mod.installReportFilterControls, 'function', 'installReportFilterControls export missing');

  const calls = [];
  const doc = createDocument();
  const win = {
    document: doc,
    XekhoApp: {},
    setReportMenuFilter(value) { calls.push({ fn: 'menu', value }); return 'menu:' + value; },
    resetReportFilters() { calls.push({ fn: 'reset' }); return 'reset'; },
  };

  assert.strictEqual(mod.callReportMenuFilter('pho', win), 'menu:pho', 'direct menu delegation failed');
  assert.strictEqual(mod.callReportFilterReset(win), 'reset', 'direct reset delegation failed');

  const api = mod.installReportFilterControls(win);
  assert.strictEqual(api.selector, '[data-esm-report-menu-filter], [data-esm-report-filter-reset]', 'selector mismatch');
  assert.strictEqual(api.installed, true, 'installer did not attach listener');
  assert.strictEqual(win.XekhoApp.esm.ui.reportFilterControls, api, 'namespace not published');
  assert.strictEqual(doc.listeners.change.length, 1, 'expected one change listener');
  assert.strictEqual(doc.listeners.click.length, 1, 'expected one click listener');

  doc.listeners.change[0]({ target: createSelect('bun') });
  const clickEvent = { target: createButton(), prevented: false, preventDefault() { this.prevented = true; } };
  doc.listeners.click[0](clickEvent);
  assert.strictEqual(clickEvent.prevented, true, 'reset click should prevent default');
  assert.deepStrictEqual(calls, [
    { fn: 'menu', value: 'pho' },
    { fn: 'reset' },
    { fn: 'menu', value: 'bun' },
    { fn: 'reset' },
  ], 'delegated dispatch mismatch');

  api.detach();
  assert.strictEqual(doc.listeners.change.length, 0, 'detach should remove change listener');
  assert.strictEqual(doc.listeners.click.length, 0, 'detach should remove click listener');

  const html = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');
  assert(!html.includes('onchange="setReportMenuFilter(this.value)"'), 'menu filter inline handler still present');
  assert(!html.includes('onclick="resetReportFilters()"'), 'reset inline handler still present');
  assert.strictEqual((html.match(/data-esm-report-menu-filter/g) || []).length, 2, 'expected two report menu filters');
  assert.strictEqual((html.match(/data-esm-report-filter-reset/g) || []).length, 2, 'expected two report filter reset buttons');

  console.log('verify-esm-report-filter-controls passed', {
    exports: Object.keys(mod).sort(),
    listenersDetached: doc.listeners.change.length === 0 && doc.listeners.click.length === 0,
    convertedReportMenuFilters: (html.match(/data-esm-report-menu-filter/g) || []).length,
    convertedReportFilterResets: (html.match(/data-esm-report-filter-reset/g) || []).length,
  });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
