// @ts-check
(function (global) {
  'use strict';

  /** @type {any} */
  const root = global || {};
  const XekhoApp = root.XekhoApp = root.XekhoApp || {};
  XekhoApp.utils = XekhoApp.utils || {};

  /** @param {string} text @returns {string} */
  function escapeHtml(text) {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  XekhoApp.utils.dom = Object.assign({}, XekhoApp.utils.dom, {
    escapeHtml,
  });
})(typeof window !== 'undefined' ? window : globalThis);
