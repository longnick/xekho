// @ts-check
/**
 * ESM runtime DOM adapter for future XE KHO UI islands.
 *
 * The adapter intentionally avoids importing app.js or mutating POS state.
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
 * @returns {Document|null}
 */
export function getDocument(globalScope) {
  var root = getRoot(globalScope);
  return root && root.document ? root.document : null;
}

/**
 * @param {string} selector
 * @param {ParentNode|any=} scope
 * @returns {Element|null}
 */
export function qs(selector, scope) {
  var target = scope || getDocument();
  if (!target || typeof target.querySelector !== 'function') return null;
  return target.querySelector(selector);
}

/**
 * @param {string} selector
 * @param {ParentNode|any=} scope
 * @returns {Element[]}
 */
export function qsa(selector, scope) {
  var target = scope || getDocument();
  if (!target || typeof target.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(target.querySelectorAll(selector));
}

/**
 * @param {EventTarget|any} target
 * @param {string} type
 * @param {EventListenerOrEventListenerObject|Function} handler
 * @param {any=} options
 * @returns {Function}
 */
export function on(target, type, handler, options) {
  if (!target || typeof target.addEventListener !== 'function' || typeof handler !== 'function') {
    return function noopOff() {};
  }
  target.addEventListener(type, /** @type {EventListener} */ (handler), options);
  return function off() {
    target.removeEventListener(type, /** @type {EventListener} */ (handler), options);
  };
}

/**
 * @param {EventTarget|any} target
 * @param {string} type
 * @param {EventListenerOrEventListenerObject|Function} handler
 * @param {any=} options
 * @returns {void}
 */
export function off(target, type, handler, options) {
  if (!target || typeof target.removeEventListener !== 'function' || typeof handler !== 'function') return;
  target.removeEventListener(type, /** @type {EventListener} */ (handler), options);
}

/**
 * @param {any=} globalScope
 * @returns {any}
 */
export function installDomAdapter(globalScope) {
  var root = getRoot(globalScope);
  root.XekhoApp = root.XekhoApp || {};
  root.XekhoApp.esm = root.XekhoApp.esm || {};
  root.XekhoApp.esm.adapters = root.XekhoApp.esm.adapters || {};
  root.XekhoApp.esm.adapters.dom = Object.assign({}, root.XekhoApp.esm.adapters.dom, {
    getRoot,
    getDocument,
    qs,
    qsa,
    on,
    off,
  });
  return root.XekhoApp.esm.adapters.dom;
}
