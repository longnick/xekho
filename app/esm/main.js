// @ts-check
import { escapeHtml, installGlobalDomUtils } from './utils/dom.js';

/**
 * XE KHO ESM compatibility harness.
 *
 * This file is intentionally small and side-effect-light. It is loaded as a
 * browser module after the existing classic-script runtime so Vite can verify
 * an ESM entry while gradually adding importable facades for leaf utilities.
 */
(function initEsmHarness() {
  var root = typeof window !== 'undefined' ? window : globalThis;
  /** @type {any} */
  var anyRoot = root;
  /** @type {any} */
  var XekhoApp = anyRoot.XekhoApp = anyRoot.XekhoApp || {};
  XekhoApp.esm = XekhoApp.esm || {};
  XekhoApp.esm.facades = XekhoApp.esm.facades || {};

  var domGlobals = installGlobalDomUtils(anyRoot);
  XekhoApp.esm.facades.dom = {
    loaded: true,
    escapeHtmlMatchesGlobal: domGlobals.escapeHtml === escapeHtml,
  };

  XekhoApp.esm.harness = {
    version: '20260602-e2-dom',
    loaded: true,
    loadedAt: new Date().toISOString(),
    classicRuntimePresent: Boolean(XekhoApp.utils || XekhoApp.ui || anyRoot.Store || anyRoot.appState),
  };

  if (typeof anyRoot.dispatchEvent === 'function' && typeof anyRoot.CustomEvent === 'function') {
    anyRoot.dispatchEvent(new anyRoot.CustomEvent('xekho:esm-ready', {
      detail: XekhoApp.esm.harness,
    }));
  }
})();
