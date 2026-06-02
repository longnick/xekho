/**
 * Sprint 1.6: Auth/staff helpers extracted from app.js
 *
 * Provides pure staff normalization, identity, and lookup helpers
 * via IIFE/global namespace. Functions that depend on app state
 * (currentUser, appState.staff) are NOT extracted — they stay in app.js.
 */
(function (global) {
  'use strict';

  var XekhoApp = global.XekhoApp = global.XekhoApp || {};
  XekhoApp.auth = XekhoApp.auth || {};

  // ── Pure staff helpers (no app state dependency) ──────────────────────

  function normalizeStaffRole(role) {
    return String(role || 'staff').trim().toLowerCase() === 'admin' ? 'admin' : 'staff';
  }

  function normalizeStaffStatus(status) {
    return String(status || 'active').trim().toLowerCase() === 'inactive' ? 'inactive' : 'active';
  }

  function getStaffIdentity(staff) {
    return String((staff && (staff.staff_id || staff.id)) || '');
  }

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

  function validatePinFormat(pin) {
    return /^\d{4}$/.test(String(pin || '').trim());
  }

  // ── Export ────────────────────────────────────────────────────────────
  XekhoApp.auth.normalizeStaffRole = normalizeStaffRole;
  XekhoApp.auth.normalizeStaffStatus = normalizeStaffStatus;
  XekhoApp.auth.getStaffIdentity = getStaffIdentity;
  XekhoApp.auth.buildCurrentUserFromStaff = buildCurrentUserFromStaff;
  XekhoApp.auth.validatePinFormat = validatePinFormat;

})(typeof window !== 'undefined' ? window : globalThis);
