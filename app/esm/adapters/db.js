// @ts-check
/**
 * ESM adapter for async classic `window.DB` readiness.
 *
 * This does not import Firebase or Cloud Functions. It only observes the
 * existing browser globals/events that db.js already publishes.
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
export function getDB(globalScope) {
  var root = getRoot(globalScope);
  return root && root.DB ? root.DB : null;
}

/**
 * @param {any=} globalScope
 * @returns {boolean}
 */
export function isDBReady(globalScope) {
  var root = getRoot(globalScope);
  return Boolean(root && root.DB && root.appState && root.appState.ready);
}

/**
 * @param {any=} globalScope
 * @returns {Promise<any>}
 */
export function waitForDB(globalScope) {
  var root = getRoot(globalScope);
  if (isDBReady(root)) return Promise.resolve(root.DB);
  return new Promise(function waitForDBPromise(resolve) {
    function cleanup() {
      if (root && typeof root.removeEventListener === 'function') {
        root.removeEventListener('db:ready', handleReady);
      }
    }
    function handleReady() {
      if (!isDBReady(root)) return;
      cleanup();
      resolve(root.DB);
    }
    if (root && typeof root.addEventListener === 'function') {
      root.addEventListener('db:ready', handleReady);
    }
    // Resolve on the next macrotask if DB became ready after the initial check
    // but before the event listener was attached.
    var setTimer = root && typeof root.setTimeout === 'function' ? root.setTimeout.bind(root) : setTimeout;
    setTimer(handleReady, 0);
  });
}

/**
 * @param {string} name
 * @param {any=} globalScope
 * @returns {any|null}
 */
export function getDBSection(name, globalScope) {
  var db = getDB(globalScope);
  if (!db || !name) return null;
  return db[name] || null;
}

/**
 * @param {string} sectionName
 * @param {string} methodName
 * @param {any[]=} args
 * @param {any=} globalScope
 * @returns {Promise<any>}
 */
export async function callDBMethod(sectionName, methodName, args, globalScope) {
  var db = await waitForDB(globalScope);
  var section = sectionName ? db[sectionName] : db;
  if (!section || typeof section[methodName] !== 'function') {
    throw new Error('DB method not available: ' + (sectionName ? sectionName + '.' : '') + methodName);
  }
  return section[methodName].apply(section, Array.isArray(args) ? args : []);
}

/**
 * @param {any=} globalScope
 * @returns {any}
 */
export function installDbAdapter(globalScope) {
  var root = getRoot(globalScope);
  root.XekhoApp = root.XekhoApp || {};
  root.XekhoApp.esm = root.XekhoApp.esm || {};
  root.XekhoApp.esm.adapters = root.XekhoApp.esm.adapters || {};
  root.XekhoApp.esm.adapters.db = Object.assign({}, root.XekhoApp.esm.adapters.db, {
    getRoot,
    getDB,
    isDBReady,
    waitForDB,
    getDBSection,
    callDBMethod,
  });
  return root.XekhoApp.esm.adapters.db;
}
