// @ts-check
/**
 * ESM facade for pure staff/auth helpers from `app/auth/staff.js`.
 */

/** @param {*} role @returns {'admin'|'staff'} */
export function normalizeStaffRole(role) {
  return String(role || 'staff').trim().toLowerCase() === 'admin' ? 'admin' : 'staff';
}

/** @param {*} status @returns {'inactive'|'active'} */
export function normalizeStaffStatus(status) {
  return String(status || 'active').trim().toLowerCase() === 'inactive' ? 'inactive' : 'active';
}

/** @param {Object} staff @returns {string} */
export function getStaffIdentity(staff) {
  return String((staff && (staff.staff_id || staff.id)) || '');
}

/** @param {Object|null} staff @param {string} [pin] @returns {Object|null} */
export function buildCurrentUserFromStaff(staff, pin) {
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
export function validatePinFormat(pin) {
  return /^\d{4}$/.test(String(pin || '').trim());
}

/**
 * Install/refresh classic staff/auth helper namespace.
 * @param {any} [globalScope]
 * @returns {{ normalizeStaffRole: Function, normalizeStaffStatus: Function, getStaffIdentity: Function, buildCurrentUserFromStaff: Function, validatePinFormat: Function }}
 */
export function installGlobalStaffAuth(globalScope) {
  /** @type {any} */
  var root = globalScope || (typeof window !== 'undefined' ? window : globalThis);
  /** @type {any} */
  var XekhoApp = root.XekhoApp = root.XekhoApp || {};
  XekhoApp.auth = XekhoApp.auth || {};
  XekhoApp.auth.normalizeStaffRole = normalizeStaffRole;
  XekhoApp.auth.normalizeStaffStatus = normalizeStaffStatus;
  XekhoApp.auth.getStaffIdentity = getStaffIdentity;
  XekhoApp.auth.buildCurrentUserFromStaff = buildCurrentUserFromStaff;
  XekhoApp.auth.validatePinFormat = validatePinFormat;
  return XekhoApp.auth;
}
