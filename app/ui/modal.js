/**
 * Sprint 1.5: Modal helpers extracted from app.js
 *
 * Provides generic openModal/closeModal via IIFE/global namespace.
 * Domain-specific open/close functions in app.js delegate to these.
 */
// @ts-check
(function (global) {
  'use strict';

  /** @type {any} */
  var _global = global;
  /** @type {any} */
  var XekhoApp = _global.XekhoApp = _global.XekhoApp || {};
  XekhoApp.ui = XekhoApp.ui || {};

  /** @param {string|HTMLElement} id @returns {void} */
  function openModal(id) {
    var el = typeof id === 'string' ? document.getElementById(id) : id;
    if (el) el.classList.add('active');
  }

  /** @param {string|HTMLElement} id @returns {void} */
  function closeModal(id) {
    var el = typeof id === 'string' ? document.getElementById(id) : id;
    if (el) el.classList.remove('active');
  }

  /** @param {string|HTMLElement} id @returns {boolean} */
  function isModalOpen(id) {
    var el = typeof id === 'string' ? document.getElementById(id) : id;
    return !!(el && el.classList.contains('active'));
  }

  // Export
  XekhoApp.ui.openModal = openModal;
  XekhoApp.ui.closeModal = closeModal;
  XekhoApp.ui.isModalOpen = isModalOpen;

  // Global compat
  if (typeof global.openModal !== 'function') global.openModal = openModal;
  if (typeof global.closeModal !== 'function') global.closeModal = closeModal;
  if (typeof global.isModalOpen !== 'function') global.isModalOpen = isModalOpen;

})(typeof window !== 'undefined' ? window : globalThis);
