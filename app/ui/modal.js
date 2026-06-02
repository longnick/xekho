/**
 * Sprint 1.5: Modal helpers extracted from app.js
 *
 * Provides generic openModal/closeModal via IIFE/global namespace.
 * Domain-specific open/close functions in app.js delegate to these.
 */
(function (global) {
  'use strict';

  var XekhoApp = global.XekhoApp = global.XekhoApp || {};
  XekhoApp.ui = XekhoApp.ui || {};

  function openModal(id) {
    var el = typeof id === 'string' ? document.getElementById(id) : id;
    if (el) el.classList.add('active');
  }

  function closeModal(id) {
    var el = typeof id === 'string' ? document.getElementById(id) : id;
    if (el) el.classList.remove('active');
  }

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
