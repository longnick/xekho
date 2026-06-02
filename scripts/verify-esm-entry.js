#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const entryPath = path.join(root, 'app', 'esm', 'main.js');
const domFacadePath = path.join(root, 'app', 'esm', 'utils', 'dom.js');
const formatFacadePath = path.join(root, 'app', 'esm', 'utils', 'format.js');
const dateFacadePath = path.join(root, 'app', 'esm', 'utils', 'date.js');
const excelFacadePath = path.join(root, 'app', 'esm', 'utils', 'excel.js');
const staffFacadePath = path.join(root, 'app', 'esm', 'auth', 'staff.js');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const indexHtml = fs.readFileSync(indexPath, 'utf8');
const entrySource = fs.readFileSync(entryPath, 'utf8');
const domFacadeSource = fs.readFileSync(domFacadePath, 'utf8');
const formatFacadeSource = fs.readFileSync(formatFacadePath, 'utf8');
const dateFacadeSource = fs.readFileSync(dateFacadePath, 'utf8');
const excelFacadeSource = fs.readFileSync(excelFacadePath, 'utf8');
const staffFacadeSource = fs.readFileSync(staffFacadePath, 'utf8');
const entryTag = '<script type="module" src="app/esm/main.js?v=20260602-e2-leaf-facades"></script>';

assert(indexHtml.includes(entryTag), 'index.html must load app/esm/main.js as a module script');
assert(indexHtml.includes('offlineOrderFallbackDevTools.js'), 'expected offline devtools script marker');
assert(indexHtml.indexOf('offlineOrderFallbackDevTools.js') < indexHtml.indexOf(entryTag), 'ESM entry must load after existing offline classic scripts');
assert(indexHtml.indexOf(entryTag) < indexHtml.indexOf('// Extra helpers that reference DOM'), 'ESM entry must load before inline DOM helper script');
assert(entrySource.includes("import { escapeHtml, installGlobalDomUtils } from './utils/dom.js';"), 'ESM entry must import dom facade');
assert(entrySource.includes("from './utils/format.js';"), 'ESM entry must import format facade');
assert(entrySource.includes("from './utils/date.js';"), 'ESM entry must import date facade');
assert(entrySource.includes("from './utils/excel.js';"), 'ESM entry must import excel facade');
assert(entrySource.includes("from './auth/staff.js';"), 'ESM entry must import staff auth facade');
assert(entrySource.includes('XekhoApp.esm.harness'), 'ESM entry must set XekhoApp.esm.harness');
assert(entrySource.includes('XekhoApp.esm.facades.dom'), 'ESM entry must record dom facade readiness');
assert(entrySource.includes('XekhoApp.esm.facades.format'), 'ESM entry must record format facade readiness');
assert(entrySource.includes('XekhoApp.esm.facades.date'), 'ESM entry must record date facade readiness');
assert(entrySource.includes('XekhoApp.esm.facades.excel'), 'ESM entry must record excel facade readiness');
assert(entrySource.includes('XekhoApp.esm.facades.authStaff'), 'ESM entry must record auth staff facade readiness');
assert(entrySource.includes('xekho:esm-ready'), 'ESM entry must dispatch xekho:esm-ready when possible');
assert(domFacadeSource.includes('export function escapeHtml'), 'dom facade must export escapeHtml');
assert(domFacadeSource.includes('export function installGlobalDomUtils'), 'dom facade must export installer');
assert(formatFacadeSource.includes('export function installGlobalFormatUtils'), 'format facade must export installer');
assert(dateFacadeSource.includes('export function installGlobalDateUtils'), 'date facade must export installer');
assert(excelFacadeSource.includes('export function installGlobalExcelUtils'), 'excel facade must export installer');
assert(staffFacadeSource.includes('export function installGlobalStaffAuth'), 'staff facade must export installer');

// VM smoke test the harness body by stripping its static import and injecting the imported functions.
const classicDomSource = fs.readFileSync(path.join(root, 'app', 'utils', 'dom.js'), 'utf8');
const executableEntrySource = entrySource.replace(/^import .*;$/gm, '');
const events = [];
const win = {
  XekhoApp: {
    utils: {
      format: {},
    },
  },
  Store: {},
  CustomEvent: function CustomEvent(type, init) {
    this.type = type;
    this.detail = init && init.detail;
  },
  dispatchEvent: function dispatchEvent(event) {
    events.push(event);
  },
};
win.window = win;
const sandbox = {
  window: win,
  globalThis: win,
  Date,
  escapeHtml: function escapeHtml(text) {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },
  installGlobalDomUtils: function installGlobalDomUtils(globalScope) {
    var rootScope = globalScope || win;
    rootScope.XekhoApp = rootScope.XekhoApp || {};
    rootScope.XekhoApp.utils = rootScope.XekhoApp.utils || {};
    rootScope.XekhoApp.utils.dom = Object.assign({}, rootScope.XekhoApp.utils.dom, {
      escapeHtml: sandbox.escapeHtml,
    });
    return rootScope.XekhoApp.utils.dom;
  },
  compactNumber: function compactNumber(value) { return Number(value) >= 1000 ? '1K' : String(value); },
  currency: function currency(value) { return Number(value).toLocaleString('vi-VN') + 'đ'; },
  date: function date(value) { return new Date(value).toLocaleDateString('vi-VN'); },
  time: function time(value) { return new Date(value).toLocaleTimeString('vi-VN'); },
  dateTime: function dateTime(value) { return sandbox.date(value) + ' ' + sandbox.time(value); },
  todayKey: function todayKey() { return new Date().toISOString().split('T')[0]; },
  installGlobalFormatUtils: function installGlobalFormatUtils(globalScope) {
    var rootScope = globalScope || win;
    rootScope.XekhoApp = rootScope.XekhoApp || {};
    rootScope.XekhoApp.utils = rootScope.XekhoApp.utils || {};
    rootScope.XekhoApp.utils.format = {
      compactNumber: sandbox.compactNumber,
      currency: sandbox.currency,
      date: sandbox.date,
      time: sandbox.time,
      dateTime: sandbox.dateTime,
      todayKey: sandbox.todayKey,
    };
    rootScope.fmt = sandbox.compactNumber;
    rootScope.fmtFull = sandbox.currency;
    rootScope.fmtDate = sandbox.date;
    rootScope.fmtTime = sandbox.time;
    rootScope.fmtDateTime = sandbox.dateTime;
    rootScope.today = sandbox.todayKey;
    return rootScope.XekhoApp.utils.format;
  },
  formatLocalDateKey: function formatLocalDateKey() { return '2026-06-02'; },
  getWeekStartKey: function getWeekStartKey() { return '2026-06-01'; },
  resolvePeriodDateRangePure: function resolvePeriodDateRangePure() { return { fromDate: '2026-06-02', toDate: '2026-06-02' }; },
  installGlobalDateUtils: function installGlobalDateUtils(globalScope) {
    var rootScope = globalScope || win;
    rootScope.XekhoApp.utils.date = {
      formatLocalDateKey: sandbox.formatLocalDateKey,
      getWeekStartKey: sandbox.getWeekStartKey,
      resolvePeriodDateRangePure: sandbox.resolvePeriodDateRangePure,
    };
    rootScope.formatLocalDateKey = sandbox.formatLocalDateKey;
    rootScope.getWeekStartKey = sandbox.getWeekStartKey;
    return rootScope.XekhoApp.utils.date;
  },
  excelThinBorder: function excelThinBorder() { return { top: { style: 'thin' }, left: {}, bottom: {}, right: {} }; },
  excelColLetter: function excelColLetter() { return 'A'; },
  excelFmtVnInt: function excelFmtVnInt() { return '1.000'; },
  applyReportTitleBlock: function applyReportTitleBlock() {},
  paintExcelHeaderRow: function paintExcelHeaderRow() {},
  paintExcelTotalRow: function paintExcelTotalRow() {},
  setRowBorders: function setRowBorders() {},
  installGlobalExcelUtils: function installGlobalExcelUtils(globalScope) {
    var rootScope = globalScope || win;
    rootScope.XekhoApp.utils.excel = {
      excelThinBorder: sandbox.excelThinBorder,
      excelColLetter: sandbox.excelColLetter,
      excelFmtVnInt: sandbox.excelFmtVnInt,
      applyReportTitleBlock: sandbox.applyReportTitleBlock,
      paintExcelHeaderRow: sandbox.paintExcelHeaderRow,
      paintExcelTotalRow: sandbox.paintExcelTotalRow,
      setRowBorders: sandbox.setRowBorders,
    };
    rootScope.excelThinBorder = sandbox.excelThinBorder;
    rootScope.excelColLetter = sandbox.excelColLetter;
    rootScope.excelFmtVnInt = sandbox.excelFmtVnInt;
    rootScope.applyReportTitleBlock = sandbox.applyReportTitleBlock;
    rootScope.paintExcelHeaderRow = sandbox.paintExcelHeaderRow;
    rootScope.paintExcelTotalRow = sandbox.paintExcelTotalRow;
    rootScope.setRowBorders = sandbox.setRowBorders;
    return rootScope.XekhoApp.utils.excel;
  },
  normalizeStaffRole: function normalizeStaffRole() { return 'admin'; },
  normalizeStaffStatus: function normalizeStaffStatus() { return 'active'; },
  getStaffIdentity: function getStaffIdentity() { return 's1'; },
  buildCurrentUserFromStaff: function buildCurrentUserFromStaff() { return { id: 's1' }; },
  validatePinFormat: function validatePinFormat() { return true; },
  installGlobalStaffAuth: function installGlobalStaffAuth(globalScope) {
    var rootScope = globalScope || win;
    rootScope.XekhoApp.auth = {
      normalizeStaffRole: sandbox.normalizeStaffRole,
      normalizeStaffStatus: sandbox.normalizeStaffStatus,
      getStaffIdentity: sandbox.getStaffIdentity,
      buildCurrentUserFromStaff: sandbox.buildCurrentUserFromStaff,
      validatePinFormat: sandbox.validatePinFormat,
    };
    return rootScope.XekhoApp.auth;
  },
};
vm.createContext(sandbox);
vm.runInContext(classicDomSource, sandbox, { filename: 'app/utils/dom.js' });
vm.runInContext(executableEntrySource, sandbox, { filename: 'app/esm/main.js' });

assert(win.XekhoApp.esm.harness.loaded === true, 'harness.loaded should be true');
assert(win.XekhoApp.esm.harness.version === '20260602-e2-leaf-facades', 'harness version mismatch');
assert(win.XekhoApp.esm.harness.classicRuntimePresent === true, 'classic runtime marker should be detected');
assert(win.XekhoApp.esm.facades.dom.loaded === true, 'dom facade marker should be loaded');
assert(win.XekhoApp.esm.facades.dom.escapeHtmlMatchesGlobal === true, 'dom facade should install matching global escapeHtml');
assert(win.XekhoApp.esm.facades.format.loaded === true, 'format facade marker should be loaded');
assert(win.XekhoApp.esm.facades.date.loaded === true, 'date facade marker should be loaded');
assert(win.XekhoApp.esm.facades.excel.loaded === true, 'excel facade marker should be loaded');
assert(win.XekhoApp.esm.facades.authStaff.loaded === true, 'auth staff facade marker should be loaded');
assert(win.XekhoApp.utils.dom.escapeHtml('<b>&"\'') === '&lt;b&gt;&amp;&quot;&#39;', 'global escapeHtml should escape HTML');
assert(win.fmt(1000) === '1K', 'legacy fmt should be installed by format facade');
assert(win.XekhoApp.auth.getStaffIdentity() === 's1', 'auth staff facade should install auth namespace');
assert(events.length === 1, 'expected exactly one esm-ready event');
assert(events[0].type === 'xekho:esm-ready', 'unexpected event type');

console.log('verify-esm-entry passed', win.XekhoApp.esm.harness, win.XekhoApp.esm.facades);
