#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function toDataModuleUrl(source) {
  return 'data:text/javascript;base64,' + Buffer.from(source, 'utf8').toString('base64');
}

async function importAdapter(relPath) {
  const source = fs.readFileSync(path.join(root, relPath), 'utf8');
  return import(toDataModuleUrl(source));
}

function createEventRoot() {
  const listeners = {};
  return {
    XekhoApp: {},
    setTimeout,
    addEventListener(type, fn) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(fn);
    },
    removeEventListener(type, fn) {
      listeners[type] = (listeners[type] || []).filter((item) => item !== fn);
    },
    dispatchEvent(event) {
      (listeners[event.type] || []).forEach((fn) => fn(event));
    },
  };
}

(async function main() {
  const dom = await importAdapter('app/esm/adapters/dom.js');
  const store = await importAdapter('app/esm/adapters/store.js');
  const db = await importAdapter('app/esm/adapters/db.js');

  const fakeElement = { id: 'target' };
  const fakeDocument = {
    querySelector(selector) { return selector === '#target' ? fakeElement : null; },
    querySelectorAll(selector) { return selector === '.row' ? [{ id: 'a' }, { id: 'b' }] : []; },
  };
  let added = 0;
  let removed = 0;
  const target = {
    addEventListener(type, fn) { added += type === 'click' && typeof fn === 'function' ? 1 : 0; },
    removeEventListener(type, fn) { removed += type === 'click' && typeof fn === 'function' ? 1 : 0; },
  };
  const domRoot = { XekhoApp: {}, document: fakeDocument };
  assert(dom.getDocument(domRoot) === fakeDocument, 'getDocument should return root document');
  assert(dom.qs('#target', fakeDocument) === fakeElement, 'qs should find fake element');
  assert(dom.qsa('.row', fakeDocument).length === 2, 'qsa should return array');
  const unsubscribe = dom.on(target, 'click', function noop() {});
  unsubscribe();
  assert(added === 1 && removed === 1, 'on should return unsubscribe function');
  const domAdapter = dom.installDomAdapter(domRoot);
  assert(domAdapter.qs === dom.qs, 'dom installer should expose qs');

  const storeRoot = {
    XekhoApp: {},
    appState: {
      ready: true,
      menu: [{ id: 'm1' }],
      inventory: [{ id: 'i1' }, { id: 'i2' }],
      tables: [{ id: 't1' }],
      orders: { a: {}, b: {} },
      onlineOrders: [{ id: 'o1' }],
      currentUser: { id: 'u1' },
    },
    Store: {
      getMenu() { return [{ id: 'menu-from-store' }]; },
      getInventory() { return [{ id: 'inv-from-store' }]; },
      getSettings() { return { storeName: 'XE KHO' }; },
    },
  };
  assert(store.isAppStateReady(storeRoot) === true, 'appState should be ready');
  assert(store.getMenu(storeRoot)[0].id === 'menu-from-store', 'getMenu should delegate to Store');
  assert(store.getInventory(storeRoot)[0].id === 'inv-from-store', 'getInventory should delegate to Store');
  assert(store.getSettings(storeRoot).storeName === 'XE KHO', 'getSettings should delegate to Store');
  assert(store.getCurrentUser(storeRoot).id === 'u1', 'getCurrentUser should read appState');
  const snapshot = store.createStateSnapshot(storeRoot);
  assert(snapshot.ready === true && snapshot.inventoryCount === 2 && snapshot.orderCount === 2, 'snapshot mismatch');
  const storeAdapter = store.installStoreAdapter(storeRoot);
  assert(storeAdapter.createStateSnapshot(storeRoot).tableCount === 1, 'store installer should expose snapshot');

  const dbRoot = createEventRoot();
  dbRoot.appState = { ready: false };
  dbRoot.DB = { Inventory: { getAll: () => ['inv'] } };
  assert(db.isDBReady(dbRoot) === false, 'db should not be ready before appState.ready');
  const pending = db.waitForDB(dbRoot);
  dbRoot.appState.ready = true;
  dbRoot.dispatchEvent({ type: 'db:ready' });
  const resolvedDB = await pending;
  assert(resolvedDB === dbRoot.DB, 'waitForDB should resolve DB after db:ready');
  assert(db.getDBSection('Inventory', dbRoot) === dbRoot.DB.Inventory, 'getDBSection mismatch');
  const result = await db.callDBMethod('Inventory', 'getAll', [], dbRoot);
  assert(result[0] === 'inv', 'callDBMethod mismatch');
  const dbAdapter = db.installDbAdapter(dbRoot);
  assert(dbAdapter.isDBReady(dbRoot) === true, 'db installer should expose isDBReady');

  console.log('verify-esm-runtime-adapters passed', {
    dom: Object.keys(dom).length,
    store: Object.keys(store).length,
    db: Object.keys(db).length,
  });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
