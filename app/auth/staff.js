/**
 * Sprint 1.6: Auth/staff helpers extracted from app.js
 *
 * Provides pure staff normalization, identity, and lookup helpers
 * via IIFE/global namespace. Functions that depend on app state
 * (currentUser, appState.staff) are NOT extracted — they stay in app.js.
 */
// @ts-check
(function (global) {
  'use strict';

  /** @type {any} */
  var _global = global;
  /** @type {any} */
  var XekhoApp = _global.XekhoApp = _global.XekhoApp || {};
  XekhoApp.auth = XekhoApp.auth || {};

  // ── Pure staff helpers (no app state dependency) ──────────────────────

  /** @param {*} role @returns {'admin'|'staff'} */
  function normalizeStaffRole(role) {
    return String(role || 'staff').trim().toLowerCase() === 'admin' ? 'admin' : 'staff';
  }

  /** @param {*} status @returns {'inactive'|'active'} */
  function normalizeStaffStatus(status) {
    return String(status || 'active').trim().toLowerCase() === 'inactive' ? 'inactive' : 'active';
  }

  /** @param {Object} staff @returns {string} */
  function getStaffIdentity(staff) {
    return String((staff && (staff.staff_id || staff.id)) || '');
  }

  /** @param {Object|null} staff @param {string} [pin] @returns {Object|null} */
  function buildCurrentUserFromStaff(staff, pin) {
    if (!staff) return null;
    var normalizedRole = normalizeStaffRole(staff.role);
    return {
      id: getStaffIdentity(staff),
      staff_id: getStaffIdentity(staff),
      pin: String(pin || staff.pin_code || '').trim(),
      name: staff.full_name || staff.username || 'Nhân viên',
      username: staff.full_name || staff.username || 'Nhân viên',
      role: normalizedRole,
      status: normalizeStaffStatus(staff.status),
    };
  }

  /** @param {*} pin @returns {boolean} */
  function validatePinFormat(pin) {
    return /^\d{4}$/.test(String(pin || '').trim());
  }

  /** @param {Object|null|undefined} posUser @returns {{ updatedBy: string|null, updatedByRole: string|null }} */
  function getCurrentOrderActorMetaFromUser(posUser) {
    return {
      updatedBy: posUser && posUser.name ? posUser.name : null,
      updatedByRole: posUser && posUser.role ? posUser.role : null,
    };
  }

  // ── Export ────────────────────────────────────────────────────────────
  XekhoApp.auth.normalizeStaffRole = normalizeStaffRole;
  XekhoApp.auth.normalizeStaffStatus = normalizeStaffStatus;
  XekhoApp.auth.getStaffIdentity = getStaffIdentity;
  XekhoApp.auth.buildCurrentUserFromStaff = buildCurrentUserFromStaff;
  XekhoApp.auth.validatePinFormat = validatePinFormat;
  XekhoApp.auth.getCurrentOrderActorMetaFromUser = getCurrentOrderActorMetaFromUser;

})(typeof window !== 'undefined' ? window : globalThis);
