#!/usr/bin/env node
'use strict';

const fs = require('fs');
const assert = require('assert');
const path = require('path');

const repo = path.resolve(__dirname, '..');
const modulePath = path.join(repo, 'app/esm/ui/admin-render-controls.js');

function makeElement(dataset = {}, value = '') {
  return {
    dataset,
    value,
    closest(selector) {
      if (selector === '[data-esm-admin-render]' && this.dataset.esmAdminRender) return this;
      if (selector === '[data-esm-menu-items-search]' && Object.prototype.hasOwnProperty.call(this.dataset, 'esmMenuItemsSearch')) return this;
      return null;
    },
  };
}

function createDocumentStub() {
  const listeners = { click: [], change: [], input: [] };
  return {
    listeners,
    addEventListener(type, handler) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(handler);
    },
    removeEventListener(type, handler) {
      listeners[type] = (listeners[type] || []).filter((fn) => fn !== handler);
    },
    dispatch(type, target) {
      for (const handler of listeners[type] || []) handler({ type, target });
    },
  };
}

async function importEsm(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  return import('data:text/javascript;charset=utf-8,' + encodeURIComponent(source));
}

(async () => {
  const mod = await importEsm(modulePath);
  assert.strictEqual(typeof mod.callAdminRender, 'function');
  assert.strictEqual(typeof mod.callMenuItemsSearch, 'function');
  assert.strictEqual(typeof mod.installAdminRenderControls, 'function');
  assert.strictEqual(typeof mod.publishAdminRenderControls, 'function');

  const calls = [];
  const doc = createDocumentStub();
  const root = {
    document: doc,
    XekhoApp: {},
    menuSearch: '',
    renderTables() { calls.push(['renderTables']); },
    renderStockList() { calls.push(['renderStockList']); },
    renderMenuAdmin() { calls.push(['renderMenuAdmin']); },
    renderMenuItems() { calls.push(['renderMenuItems', this.menuSearch]); },
  };

  mod.callAdminRender(root, 'renderTables');
  mod.callAdminRender(root, 'renderStockList');
  mod.callAdminRender(root, 'renderMenuAdmin');
  mod.callAdminRender(root, 'resetAllData');
  mod.callMenuItemsSearch(root, 'cafe sua');
  assert.deepStrictEqual(calls, [
    ['renderTables'],
    ['renderStockList'],
    ['renderMenuAdmin'],
    ['renderMenuItems', 'cafe sua'],
  ]);

  const installed = mod.installAdminRenderControls(root);
  assert.strictEqual(installed.installed, true);
  assert.strictEqual(installed.selector, '[data-esm-admin-render], [data-esm-menu-items-search]');
  assert.strictEqual(doc.listeners.click.length, 1);
  assert.strictEqual(doc.listeners.change.length, 1);
  assert.strictEqual(doc.listeners.input.length, 1);

  doc.dispatch('click', makeElement({ esmAdminRender: 'renderTables' }));
  doc.dispatch('input', makeElement({ esmAdminRender: 'renderStockList' }));
  doc.dispatch('input', makeElement({ esmMenuItemsSearch: '' }, 'pho bo'));
  assert.deepStrictEqual(calls.slice(-3), [
    ['renderTables'],
    ['renderStockList'],
    ['renderMenuItems', 'pho bo'],
  ]);

  installed.detach();
  assert.strictEqual(doc.listeners.click.length, 0);
  assert.strictEqual(doc.listeners.change.length, 0);
  assert.strictEqual(doc.listeners.input.length, 0);

  const doc2 = createDocumentStub();
  const root2 = Object.assign({}, root, { document: doc2, XekhoApp: {} });
  const published = mod.publishAdminRenderControls(root2);
  assert.strictEqual(root2.XekhoApp.esm.ui.adminRenderControls, published);

  const html = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');
  assert.strictEqual((html.match(/data-esm-admin-render=/g) || []).length, 4);
  assert.strictEqual((html.match(/data-esm-menu-items-search/g) || []).length, 1);
  assert(!html.includes('onclick="renderTables()"'));
  assert(!html.includes('oninput="menuSearch=this.value;renderMenuItems()"'));
  assert(!html.includes('oninput="renderStockList()"'));
  assert(!html.includes('onchange="renderStockList()"'));
  assert(!html.includes('oninput="renderMenuAdmin()"'));

  const appSource = fs.readFileSync(path.join(repo, 'app.js'), 'utf8');
  assert(appSource.includes("document.getElementById('order-search')"));
  assert(appSource.includes('activeMenuSearch'));

  console.log('verify-esm-admin-render-controls passed', {
    exports: Object.keys(mod).sort(),
    listenersDetached: true,
    convertedAdminRender: (html.match(/data-esm-admin-render=/g) || []).length,
    convertedMenuItemsSearch: (html.match(/data-esm-menu-items-search/g) || []).length,
  });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
