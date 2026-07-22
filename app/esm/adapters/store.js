// @ts-check
/**
 * ESM read-only adapter for classic Store/appState globals.
 *
 * This adapter does not mutate POS data and does not import store.js/app.js.
 */

/**
 * @param {any=} globalScope
 * @returns {any}
 */
export function getRoot(globalScope) {
  return globalScope || (typeof window !== 'undefined' ? window : globalThis);
}

/**
 * @param {any=} globalScope
 * @returns {any|null}
 */
export function getStore(globalScope) {
  var root = getRoot(globalScope);
  return root && root.Store ? root.Store : null;
}

/**
 * @param {any=} globalScope
 * @returns {any|null}
 */
export function getAppState(globalScope) {
  var root = getRoot(globalScope);
  return root && root.appState ? root.appState : null;
}

/**
 * @param {any=} globalScope
 * @returns {boolean}
 */
export function isAppStateReady(globalScope) {
  var state = getAppState(globalScope);
  return Boolean(state && state.ready);
}

/**
 * @param {string} key
 * @param {any=} fallback
 * @param {any=} globalScope
 * @returns {any}
 */
export function readAppStateKey(key, fallback, globalScope) {
  var state = getAppState(globalScope);
  if (!state || typeof key !== 'string') return fallback;
  return Object.prototype.hasOwnProperty.call(state, key) ? state[key] : fallback;
}

/**
 * @param {string} methodName
 * @param {any[]=} args
 * @param {any=} fallback
 * @param {any=} globalScope
 * @returns {any}
 */
export function callStoreMethod(methodName, args, fallback, globalScope) {
  var store = getStore(globalScope);
  if (!store || typeof store[methodName] !== 'function') return fallback;
  return store[methodName].apply(store, Array.isArray(args) ? args : []);
}

/** @param {any=} globalScope @returns {any[]} */
export function getMenu(globalScope) {
  return callStoreMethod('getMenu', [], [], globalScope) || [];
}

/** @param {any=} globalScope @returns {any[]} */
export function getInventory(globalScope) {
  return callStoreMethod('getInventory', [], [], globalScope) || [];
}

/** @param {any=} globalScope @returns {any} */
export function getSettings(globalScope) {
  return callStoreMethod('getSettings', [], {}, globalScope) || {};
}

/** @param {any=} globalScope @returns {any} */
export function getCurrentUser(globalScope) {
  return readAppStateKey('currentUser', null, globalScope);
}

/**
 * @param {any=} globalScope
 * @returns {any}
 */
export function createStateSnapshot(globalScope) {
  var state = getAppState(globalScope) || {};
  return {
    ready: Boolean(state.ready),
    menuCount: Array.isArray(state.menu) ? state.menu.length : 0,
    inventoryCount: Array.isArray(state.inventory) ? state.inventory.length : 0,
    tableCount: Array.isArray(state.tables) ? state.tables.length : 0,
    orderCount: state.orders && typeof state.orders === 'object' ? Object.keys(state.orders).length : 0,
    onlineOrderCount: Array.isArray(state.onlineOrders) ? state.onlineOrders.length : 0,
    hasCurrentUser: Boolean(state.currentUser),
  };
}

/**
 * @param {any=} globalScope
 * @returns {any}
 */
export function installStoreAdapter(globalScope) {
  var root = getRoot(globalScope);
  root.XekhoApp = root.XekhoApp || {};
  root.XekhoApp.esm = root.XekhoApp.esm || {};
  root.XekhoApp.esm.adapters = root.XekhoApp.esm.adapters || {};
  root.XekhoApp.esm.adapters.store = Object.assign({}, root.XekhoApp.esm.adapters.store, {
    getRoot,
    getStore,
    getAppState,
    isAppStateReady,
    readAppStateKey,
    callStoreMethod,
    getMenu,
    getInventory,
    getSettings,
    getCurrentUser,
    createStateSnapshot,
  });
  return root.XekhoApp.esm.adapters.store;
}
