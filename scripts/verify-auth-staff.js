#!/usr/bin/env node
/**
 * Sprint 1.6 verification: app/auth/staff.js exports and compatibility.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const modulePath = path.join(root, 'app', 'auth', 'staff.js');
const src = fs.readFileSync(modulePath, 'utf8');

// 1. Verify exports in source.
var required = [
  'XekhoApp.auth.normalizeStaffRole',
  'XekhoApp.auth.normalizeStaffStatus',
  'XekhoApp.auth.getStaffIdentity',
  'XekhoApp.auth.buildCurrentUserFromStaff',
  'XekhoApp.auth.validatePinFormat',
];
required.forEach(function (name) {
  if (!src.includes(name)) {
    console.error('FAIL: missing ' + name + ' export');
    process.exit(1);
  }
});

// 2. Simulate browser globals.
var mockWindow = {};
mockWindow.globalThis = mockWindow;

var ctx = vm.createContext({
  window: mockWindow,
  globalThis: mockWindow,
});

vm.runInContext(src, ctx);

var auth = mockWindow.XekhoApp.auth;

// 3. Test normalizeStaffRole.
if (auth.normalizeStaffRole('admin') !== 'admin') {
  console.error('FAIL: normalizeStaffRole("admin") != "admin"');
  process.exit(1);
}
if (auth.normalizeStaffRole('staff') !== 'staff') {
  console.error('FAIL: normalizeStaffRole("staff") != "staff"');
  process.exit(1);
}
if (auth.normalizeStaffRole('ADMIN') !== 'admin') {
  console.error('FAIL: normalizeStaffRole("ADMIN") != "admin"');
  process.exit(1);
}
if (auth.normalizeStaffRole(null) !== 'staff') {
  console.error('FAIL: normalizeStaffRole(null) != "staff"');
  process.exit(1);
}
if (auth.normalizeStaffRole('') !== 'staff') {
  console.error('FAIL: normalizeStaffRole("") != "staff"');
  process.exit(1);
}

// 4. Test normalizeStaffStatus.
if (auth.normalizeStaffStatus('active') !== 'active') {
  console.error('FAIL: normalizeStaffStatus("active") != "active"');
  process.exit(1);
}
if (auth.normalizeStaffStatus('inactive') !== 'inactive') {
  console.error('FAIL: normalizeStaffStatus("inactive") != "inactive"');
  process.exit(1);
}
if (auth.normalizeStaffStatus('INACTIVE') !== 'inactive') {
  console.error('FAIL: normalizeStaffStatus("INACTIVE") != "inactive"');
  process.exit(1);
}
if (auth.normalizeStaffStatus(null) !== 'active') {
  console.error('FAIL: normalizeStaffStatus(null) != "active"');
  process.exit(1);
}

// 5. Test getStaffIdentity.
if (auth.getStaffIdentity({ staff_id: 's1' }) !== 's1') {
  console.error('FAIL: getStaffIdentity({staff_id:"s1"}) != "s1"');
  process.exit(1);
}
if (auth.getStaffIdentity({ id: 's2' }) !== 's2') {
  console.error('FAIL: getStaffIdentity({id:"s2"}) != "s2"');
  process.exit(1);
}
if (auth.getStaffIdentity({}) !== '') {
  console.error('FAIL: getStaffIdentity({}) != ""');
  process.exit(1);
}
if (auth.getStaffIdentity(null) !== '') {
  console.error('FAIL: getStaffIdentity(null) != ""');
  process.exit(1);
}

// 6. Test buildCurrentUserFromStaff.
var user = auth.buildCurrentUserFromStaff(
  { staff_id: 's3', full_name: 'Nguyen Van A', role: 'admin', status: 'active', pin_code: '1234' },
  '1234'
);
if (!user || user.id !== 's3' || user.name !== 'Nguyen Van A' || user.role !== 'admin' || user.status !== 'active') {
  console.error('FAIL: buildCurrentUserFromStaff returned unexpected:', JSON.stringify(user));
  process.exit(1);
}
if (auth.buildCurrentUserFromStaff(null, '1234') !== null) {
  console.error('FAIL: buildCurrentUserFromStaff(null) != null');
  process.exit(1);
}

// 7. Test validatePinFormat.
if (!auth.validatePinFormat('1234')) {
  console.error('FAIL: validatePinFormat("1234") != true');
  process.exit(1);
}
if (auth.validatePinFormat('123')) {
  console.error('FAIL: validatePinFormat("123") != false');
  process.exit(1);
}
if (auth.validatePinFormat('12345')) {
  console.error('FAIL: validatePinFormat("12345") != false');
  process.exit(1);
}
if (auth.validatePinFormat('abcd')) {
  console.error('FAIL: validatePinFormat("abcd") != false');
  process.exit(1);
}

console.log('✅ verify-auth-staff Sprint 1.6 verification passed');
