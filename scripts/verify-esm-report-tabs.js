#!/usr/bin/env node
'use strict';

const fs = require('fs');
const assert = require('assert');
const path = require('path');

const repo = path.resolve(__dirname, '..');
const modulePath = path.join(repo, 'app', 'esm', 'ui', 'report-tabs.js');
const indexPath = path.join(repo, 'index.html');

async function importEsmFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  return import('data:text/javascript;charset=utf-8,' + encodeURIComponent(source));
}

function createEventDocument() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    removeEventListener(type, handler) {
      if (listeners.get(type) === handler) listeners.delete(type);
    },
    dispatchClick(target) {
      const handler = listeners.get('click');
      assert.strictEqual(typeof handler, 'function', 'click handler should be registered');
      handler({ type: 'click', target });
    },
  };
}

function makeButton(tab) {
  return {
    dataset: { esmReportTab: tab },
    closest(selector) {
      assert.strictEqual(selector, '[data-esm-report-tab]');
      return this;
    },
  };
}

(async function main() {
  const mod = await importEsmFile(modulePath);
  assert.strictEqual(typeof mod.callReportTab, 'function', 'callReportTab export missing');
  assert.strictEqual(typeof mod.installReportTabs, 'function', 'installReportTabs export missing');

  const calls = [];
  const directRoot = {
    switchReportTab(tab, trigger) {
      calls.push({ tab, trigger });
      return 'ok:' + tab;
    },
  };
  const trigger = makeButton('ads');
  assert.strictEqual(mod.callReportTab('ads', trigger, directRoot), 'ok:ads', 'direct call should delegate');
  assert.deepStrictEqual(calls.map((call) => call.tab), ['ads']);
  assert.strictEqual(mod.callReportTab('', trigger, directRoot), undefined, 'empty tab should no-op');
  assert.strictEqual(mod.callReportTab('revenue', trigger, {}), undefined, 'missing legacy switcher should no-op');

  const documentRef = createEventDocument();
  const delegatedCalls = [];
  const win = {
    document: documentRef,
    XekhoApp: { esm: { ui: {} } },
    switchReportTab(tab, button) {
      delegatedCalls.push({ tab, button });
    },
  };
  const api = mod.installReportTabs(win);
  assert.strictEqual(api.installed, true, 'installer should mark installed');
  assert.strictEqual(api.selector, '[data-esm-report-tab]', 'selector mismatch');
  assert.strictEqual(win.XekhoApp.esm.ui.reportTabs, api, 'installer should publish namespace');

  const revenueButton = makeButton('revenue');
  documentRef.dispatchClick(revenueButton);
  assert.strictEqual(delegatedCalls.length, 1, 'delegated click should call once');
  assert.strictEqual(delegatedCalls[0].tab, 'revenue');
  assert.strictEqual(delegatedCalls[0].button, revenueButton);

  api.uninstall();
  assert.strictEqual(api.installed, false, 'uninstall should mark not installed');
  assert.strictEqual(documentRef.listeners.has('click'), false, 'uninstall should remove click listener');

  const indexHtml = fs.readFileSync(indexPath, 'utf8');
  assert.strictEqual((indexHtml.match(/data-esm-report-tab=/g) || []).length, 4, 'expected four delegated report tab buttons');
  assert(!indexHtml.includes("onclick=\"switchReportTab('revenue', this)\""), 'revenue inline handler should be removed');
  assert(!indexHtml.includes("onclick=\"switchReportTab('ads', this)\""), 'ads inline handler should be removed');
  assert(!indexHtml.includes("onclick=\"switchReportTab('purchase', this)\""), 'purchase inline handler should be removed');
  assert(!indexHtml.includes("onclick=\"switchReportTab('history', this)\""), 'history inline handler should be removed');

  console.log('verify-esm-report-tabs passed', {
    exports: Object.keys(mod).sort(),
    listenersDetached: !documentRef.listeners.has('click'),
    convertedReportTabs: (indexHtml.match(/data-esm-report-tab=/g) || []).length,
  });
})();
