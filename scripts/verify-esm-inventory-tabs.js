#!/usr/bin/env node
'use strict';

const fs = require('fs');
const assert = require('assert');
const path = require('path');

const repo = path.resolve(__dirname, '..');
const modulePath = path.join(repo, 'app', 'esm', 'ui', 'inventory-tabs.js');
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

function makeButton(tab) {
  return {
    dataset: { esmInventoryTab: tab },
    closest(selector) {
      assert.strictEqual(selector, '[data-esm-inventory-tab]');
      return this;
    },
  };
}

(async function main() {
  const mod = await importEsmFile(modulePath);
  assert.strictEqual(typeof mod.callInventoryTab, 'function', 'callInventoryTab export missing');
  assert.strictEqual(typeof mod.installInventoryTabs, 'function', 'installInventoryTabs export missing');

  const calls = [];
  const root = {
    switchInvTab(tab, trigger) {
      calls.push({ tab, trigger });
      return 'tab:' + tab;
    },
  };
  const trigger = makeButton('menu');
  assert.strictEqual(mod.callInventoryTab('menu', trigger, root), 'tab:menu', 'direct call should delegate');
  assert.strictEqual(calls[0].tab, 'menu');
  assert.strictEqual(calls[0].trigger, trigger);
  assert.strictEqual(mod.callInventoryTab('', trigger, root), undefined, 'empty tab should no-op');
  assert.strictEqual(mod.callInventoryTab('stock', trigger, {}), undefined, 'missing legacy switcher should no-op');

  const documentRef = createEventDocument();
  const delegatedCalls = [];
  const win = {
    document: documentRef,
    XekhoApp: { esm: { ui: {} } },
    switchInvTab(tab, button) { delegatedCalls.push({ tab, button }); },
  };
  const api = mod.installInventoryTabs(win);
  assert.strictEqual(api.installed, true, 'installer should mark installed');
  assert.strictEqual(api.selector, '[data-esm-inventory-tab]', 'selector mismatch');
  assert.strictEqual(win.XekhoApp.esm.ui.inventoryTabs, api, 'installer should publish namespace');

  const stocktakeButton = makeButton('stocktake');
  documentRef.dispatchClick(stocktakeButton);
  assert.strictEqual(delegatedCalls.length, 1, 'delegated click should call legacy switcher once');
  assert.strictEqual(delegatedCalls[0].tab, 'stocktake');
  assert.strictEqual(delegatedCalls[0].button, stocktakeButton);

  api.uninstall();
  assert.strictEqual(api.installed, false, 'uninstall should mark not installed');
  assert.strictEqual(documentRef.listeners.has('click'), false, 'uninstall should remove click listener');

  const indexHtml = fs.readFileSync(indexPath, 'utf8');
  assert.strictEqual((indexHtml.match(/data-esm-inventory-tab=/g) || []).length, 5, 'expected five delegated inventory tab buttons');
  for (const tab of ['stock', 'menu', 'purchase', 'ledger', 'stocktake']) {
    assert(!indexHtml.includes("onclick=\"switchInvTab('" + tab + "',this)\""), tab + ' inline inventory tab handler should be removed');
  }
  assert(indexHtml.includes('onclick="openInvMoreModal()"'), 'inventory more modal inline handler intentionally remains');

  console.log('verify-esm-inventory-tabs passed', {
    exports: Object.keys(mod).sort(),
    listenersDetached: !documentRef.listeners.has('click'),
    convertedInventoryTabs: (indexHtml.match(/data-esm-inventory-tab=/g) || []).length,
  });
})();
