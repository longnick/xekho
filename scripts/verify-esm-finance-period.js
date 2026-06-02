#!/usr/bin/env node
'use strict';

const fs = require('fs');
const assert = require('assert');
const path = require('path');

const repo = path.resolve(__dirname, '..');
const modulePath = path.join(repo, 'app/esm/ui/finance-period.js');
const source = fs.readFileSync(modulePath, 'utf8');

async function importEsmFromSource(sourceText) {
  return import('data:text/javascript;charset=utf-8,' + encodeURIComponent(sourceText));
}

function createDocument() {
  const listeners = { click: [] };
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

function createButton(period) {
  return {
    dataset: { esmFinancePeriod: period },
    closest(selector) {
      return selector === '[data-esm-finance-period]' ? this : null;
    },
  };
}

(async function main() {
  const mod = await importEsmFromSource(source);
  assert.strictEqual(typeof mod.callFinancePeriod, 'function', 'callFinancePeriod export missing');
  assert.strictEqual(typeof mod.installFinancePeriodControls, 'function', 'installFinancePeriodControls export missing');

  const calls = [];
  const doc = createDocument();
  const win = {
    document: doc,
    XekhoApp: {},
    setFinancePeriod(period) {
      calls.push(period);
      return 'ok:' + period;
    },
  };

  assert.strictEqual(mod.callFinancePeriod('today', win), 'ok:today', 'direct delegation failed');
  assert.deepStrictEqual(calls, ['today'], 'direct delegation did not pass period');

  const api = mod.installFinancePeriodControls(win);
  assert.strictEqual(api.selector, '[data-esm-finance-period]', 'selector mismatch');
  assert.strictEqual(api.installed, true, 'installer did not attach listener');
  assert.strictEqual(win.XekhoApp.esm.ui.financePeriod, api, 'namespace not published');
  assert.strictEqual(doc.listeners.click.length, 1, 'expected one click listener');

  const event = {
    target: createButton('week'),
    prevented: false,
    preventDefault() { this.prevented = true; },
  };
  doc.listeners.click[0](event);
  assert.strictEqual(event.prevented, true, 'delegated click should prevent default');
  assert.deepStrictEqual(calls, ['today', 'week'], 'delegated click did not dispatch period');

  api.detach();
  assert.strictEqual(doc.listeners.click.length, 0, 'detach should remove listener');

  const html = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');
  assert(!html.includes("onclick=\"setFinancePeriod('today')\""), 'today inline handler still present');
  assert(!html.includes("onclick=\"setFinancePeriod('day')\""), 'day inline handler still present');
  assert(!html.includes("onclick=\"setFinancePeriod('week')\""), 'week inline handler still present');
  assert(!html.includes("onclick=\"setFinancePeriod('month')\""), 'month inline handler still present');
  assert(!html.includes("onclick=\"setFinancePeriod('all')\""), 'all inline handler still present');
  assert.strictEqual((html.match(/data-esm-finance-period=/g) || []).length, 5, 'expected five finance period controls');

  console.log('verify-esm-finance-period passed', {
    exports: Object.keys(mod).sort(),
    listenersDetached: doc.listeners.click.length === 0,
    convertedFinancePeriods: (html.match(/data-esm-finance-period=/g) || []).length,
  });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
