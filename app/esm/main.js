// @ts-check
/**
 * XE KHO ESM compatibility harness.
 *
 * This file is intentionally tiny and side-effect-light. It is loaded as a
 * browser module after the existing classic-script runtime so Vite can verify
 * an ESM entry without changing the POS global/IIFE execution order yet.
 */
(function initEsmHarness() {
  var root = typeof window !== 'undefined' ? window : globalThis;
  /** @type {any} */
  var anyRoot = root;
  /** @type {any} */
  var XekhoApp = anyRoot.XekhoApp = anyRoot.XekhoApp || {};
  XekhoApp.esm = XekhoApp.esm || {};

  XekhoApp.esm.harness = {
    version: '20260602-e1',
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
