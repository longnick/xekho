/**
 * Sprint 1.4: Theme helper extracted from app.js
 *
 * Provides XekhoApp.ui.applyTheme via IIFE/global namespace.
 * Loaded before app.js so applyTheme() is available everywhere.
 */
// @ts-check
(function (global) {
  'use strict';

  /** @type {any} */
  var _global = global;
  /** @type {any} */
  var XekhoApp = _global.XekhoApp = _global.XekhoApp || {};
  XekhoApp.ui = XekhoApp.ui || {};

  // Theme class names used in the app
  var THEME_CLASSES = ['theme-nang-dong', 'theme-nhe-nhang', 'theme-chill', 'theme-ruc-ro', 'theme-hien-dai'];
  var DEFAULT_THEME = 'hien-dai';

  /** @param {string} [themeName] @returns {void} */
  function applyTheme(themeName) {
    var body = document.body;
    if (!body) return;

    body.classList.remove.apply(body.classList, THEME_CLASSES);
    body.classList.add('theme-' + (themeName || DEFAULT_THEME));
  }

  // Export
  XekhoApp.ui.applyTheme = applyTheme;

  // Global compat
  if (typeof global.applyTheme !== 'function') {
    global.applyTheme = applyTheme;
  }

})(typeof window !== 'undefined' ? window : globalThis);
