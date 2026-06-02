// @ts-check
/**
 * ESM facade for the existing classic `app/utils/dom.js` helper.
 *
 * This module is intentionally pure and also exposes an installer so the ESM
 * harness can keep `window.XekhoApp.utils.dom.escapeHtml()` compatible while
 * future ESM consumers import `escapeHtml` directly.
 */

/**
 * Escape text for safe HTML insertion.
 * @param {unknown} text
 * @returns {string}
 */
export function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Install/refresh the classic global namespace from the ESM facade.
 * @param {any} [globalScope]
 * @returns {{ escapeHtml: (text: unknown) => string }}
 */
export function installGlobalDomUtils(globalScope) {
  /** @type {any} */
  var root = globalScope || (typeof window !== 'undefined' ? window : globalThis);
  /** @type {any} */
  var XekhoApp = root.XekhoApp = root.XekhoApp || {};
  XekhoApp.utils = XekhoApp.utils || {};
  XekhoApp.utils.dom = Object.assign({}, XekhoApp.utils.dom, {
    escapeHtml: escapeHtml,
  });
  return XekhoApp.utils.dom;
}
