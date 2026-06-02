#!/usr/bin/env node
'use strict';

const fs = require('fs');
const assert = require('assert');
const path = require('path');

const repo = path.resolve(__dirname, '..');
const modulePath = path.join(repo, 'app', 'esm', 'ui', 'report-date-controls.js');
const indexPath = path.join(repo, 'index.html');

async function importEsmFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  return import('data:text/javascript;charset=utf-8,' + encodeURIComponent(source));
}

function createEventDocument() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, handler) { listeners.set(type, handler); },
    removeEventListener(type, handler) { if (listeners.get(type) === handler) listeners.delete(type); },
    dispatchClick(target) {
      const handler = listeners.get('click');
      assert.strictEqual(typeof handler, 'function', 'click handler should be registered');
      handler({ type: 'click', target });
    },
  };
}

function makePeriodButton(period) {
  return {
    dataset: { esmReportPeriod: period },
    closest(selector) {
      assert.strictEqual(selector, '[data-esm-report-period], [data-esm-report-date-mode]');
      return this;
    },
  };
}

function makeModeButton(mode) {
  return {
    dataset: { esmReportDateMode: mode },
    closest(selector) {
      assert.strictEqual(selector, '[data-esm-report-period], [data-esm-report-date-mode]');
      return this;
    },
  };
}

(async function main() {
  const mod = await importEsmFile(modulePath);
  assert.strictEqual(typeof mod.callReportPeriod, 'function', 'callReportPeriod export missing');
  assert.strictEqual(typeof mod.callReportDateMode, 'function', 'callReportDateMode export missing');
  assert.strictEqual(typeof mod.installReportDateControls, 'function', 'installReportDateControls export missing');

  const calls = [];
  const directRoot = {
    setReportPeriod(period) {
      calls.push({ kind: 'period', period });
      return 'period:' + period;
    },
    setDateMode(page, mode, trigger) {
      calls.push({ kind: 'mode', page, mode, trigger });
      return page + ':' + mode;
    },
  };
  const trigger = makeModeButton('range');
  assert.strictEqual(mod.callReportPeriod('week', directRoot), 'period:week', 'period call should delegate');
  assert.strictEqual(mod.callReportDateMode('range', trigger, directRoot), 'report:range', 'mode call should delegate');
  assert.deepStrictEqual(calls.map((call) => call.kind), ['period', 'mode']);
  assert.strictEqual(mod.callReportPeriod('', directRoot), undefined, 'empty period should no-op');
  assert.strictEqual(mod.callReportDateMode('single', trigger, {}), undefined, 'missing date mode setter should no-op');

  const documentRef = createEventDocument();
  const delegatedCalls = [];
  const win = {
    document: documentRef,
    XekhoApp: { esm: { ui: {} } },
    setReportPeriod(period) { delegatedCalls.push({ kind: 'period', period }); },
    setDateMode(page, mode, button) { delegatedCalls.push({ kind: 'mode', page, mode, button }); },
  };
  const api = mod.installReportDateControls(win);
  assert.strictEqual(api.installed, true, 'installer should mark installed');
  assert.strictEqual(api.selector, '[data-esm-report-period], [data-esm-report-date-mode]', 'selector mismatch');
  assert.strictEqual(win.XekhoApp.esm.ui.reportDateControls, api, 'installer should publish namespace');

  const dayButton = makePeriodButton('day');
  const singleButton = makeModeButton('single');
  documentRef.dispatchClick(dayButton);
  documentRef.dispatchClick(singleButton);
  assert.deepStrictEqual(delegatedCalls.map((call) => call.kind), ['period', 'mode']);
  assert.strictEqual(delegatedCalls[0].period, 'day');
  assert.strictEqual(delegatedCalls[1].page, 'report');
  assert.strictEqual(delegatedCalls[1].mode, 'single');
  assert.strictEqual(delegatedCalls[1].button, singleButton);

  api.uninstall();
  assert.strictEqual(api.installed, false, 'uninstall should mark not installed');
  assert.strictEqual(documentRef.listeners.has('click'), false, 'uninstall should remove click listener');

  const indexHtml = fs.readFileSync(indexPath, 'utf8');
  assert.strictEqual((indexHtml.match(/data-esm-report-period=/g) || []).length, 5, 'expected five delegated report period buttons');
  assert.strictEqual((indexHtml.match(/data-esm-report-date-mode=/g) || []).length, 2, 'expected two delegated report date mode buttons');
  for (const period of ['today', 'day', 'week', 'month', 'all']) {
    assert(!indexHtml.includes("onclick=\"setReportPeriod('" + period + "')\""), period + ' inline period handler should be removed');
  }
  assert(!indexHtml.includes("onclick=\"setDateMode('report','single',this)\""), 'single mode inline handler should be removed');
  assert(!indexHtml.includes("onclick=\"setDateMode('report','range',this)\""), 'range mode inline handler should be removed');

  console.log('verify-esm-report-date-controls passed', {
    exports: Object.keys(mod).sort(),
    listenersDetached: !documentRef.listeners.has('click'),
    convertedReportPeriods: (indexHtml.match(/data-esm-report-period=/g) || []).length,
    convertedReportDateModes: (indexHtml.match(/data-esm-report-date-mode=/g) || []).length,
  });
})();
