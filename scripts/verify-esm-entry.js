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
const domAdapterPath = path.join(root, 'app', 'esm', 'adapters', 'dom.js');
const storeAdapterPath = path.join(root, 'app', 'esm', 'adapters', 'store.js');
const dbAdapterPath = path.join(root, 'app', 'esm', 'adapters', 'db.js');
const headerActionsPath = path.join(root, 'app', 'esm', 'ui', 'header-actions.js');
const inventoryTabsPath = path.join(root, 'app', 'esm', 'ui', 'inventory-tabs.js');
const imageZoomPath = path.join(root, 'app', 'esm', 'ui', 'image-zoom.js');
const reportDateControlsPath = path.join(root, 'app', 'esm', 'ui', 'report-date-controls.js');
const reportTabsPath = path.join(root, 'app', 'esm', 'ui', 'report-tabs.js');
const settingsTabsPath = path.join(root, 'app', 'esm', 'ui', 'settings-tabs.js');

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
const domAdapterSource = fs.readFileSync(domAdapterPath, 'utf8');
const storeAdapterSource = fs.readFileSync(storeAdapterPath, 'utf8');
const dbAdapterSource = fs.readFileSync(dbAdapterPath, 'utf8');
const headerActionsSource = fs.readFileSync(headerActionsPath, 'utf8');
const inventoryTabsSource = fs.readFileSync(inventoryTabsPath, 'utf8');
const imageZoomSource = fs.readFileSync(imageZoomPath, 'utf8');
const reportDateControlsSource = fs.readFileSync(reportDateControlsPath, 'utf8');
const reportTabsSource = fs.readFileSync(reportTabsPath, 'utf8');
const settingsTabsSource = fs.readFileSync(settingsTabsPath, 'utf8');
const entryTag = '<script type="module" src="app/esm/main.js?v=20260602-e5-inventory-tabs"></script>';

assert(indexHtml.includes(entryTag), 'index.html must load app/esm/main.js as a module script');
assert(indexHtml.includes('offlineOrderFallbackDevTools.js'), 'expected offline devtools script marker');
assert(indexHtml.indexOf('offlineOrderFallbackDevTools.js') < indexHtml.indexOf(entryTag), 'ESM entry must load after existing offline classic scripts');
assert(indexHtml.indexOf(entryTag) < indexHtml.indexOf('// Extra helpers that reference DOM'), 'ESM entry must load before inline DOM helper script');
assert(entrySource.includes("import { escapeHtml, installGlobalDomUtils } from './utils/dom.js';"), 'ESM entry must import dom facade');
assert(entrySource.includes("from './utils/format.js';"), 'ESM entry must import format facade');
assert(entrySource.includes("from './utils/date.js';"), 'ESM entry must import date facade');
assert(entrySource.includes("from './utils/excel.js';"), 'ESM entry must import excel facade');
assert(entrySource.includes("from './auth/staff.js';"), 'ESM entry must import staff auth facade');
assert(entrySource.includes("from './adapters/dom.js';"), 'ESM entry must import dom adapter');
assert(entrySource.includes("from './adapters/store.js';"), 'ESM entry must import store adapter');
assert(entrySource.includes("from './adapters/db.js';"), 'ESM entry must import db adapter');
assert(entrySource.includes("from './ui/header-actions.js';"), 'ESM entry must import header actions UI island');
assert(entrySource.includes("from './ui/image-zoom.js';"), 'ESM entry must import image zoom UI island');
assert(entrySource.includes("from './ui/report-date-controls.js';"), 'ESM entry must import report date controls UI island');
assert(entrySource.includes("from './ui/report-tabs.js';"), 'ESM entry must import report tabs UI island');
assert(entrySource.includes("from './ui/settings-tabs.js';"), 'ESM entry must import settings tabs UI island');
assert(entrySource.includes('XekhoApp.esm.harness'), 'ESM entry must set XekhoApp.esm.harness');
assert(entrySource.includes('XekhoApp.esm.facades.dom'), 'ESM entry must record dom facade readiness');
assert(entrySource.includes('XekhoApp.esm.facades.format'), 'ESM entry must record format facade readiness');
assert(entrySource.includes('XekhoApp.esm.facades.date'), 'ESM entry must record date facade readiness');
assert(entrySource.includes('XekhoApp.esm.facades.excel'), 'ESM entry must record excel facade readiness');
assert(entrySource.includes('XekhoApp.esm.facades.authStaff'), 'ESM entry must record auth staff facade readiness');
assert(entrySource.includes('XekhoApp.esm.facades.runtimeAdapters'), 'ESM entry must record runtime adapter readiness');
assert(entrySource.includes('XekhoApp.esm.facades.uiIslands'), 'ESM entry must record UI island readiness');
assert(entrySource.includes('xekho:esm-ready'), 'ESM entry must dispatch xekho:esm-ready when possible');
assert(domFacadeSource.includes('export function escapeHtml'), 'dom facade must export escapeHtml');
assert(domFacadeSource.includes('export function installGlobalDomUtils'), 'dom facade must export installer');
assert(formatFacadeSource.includes('export function installGlobalFormatUtils'), 'format facade must export installer');
assert(dateFacadeSource.includes('export function installGlobalDateUtils'), 'date facade must export installer');
assert(excelFacadeSource.includes('export function installGlobalExcelUtils'), 'excel facade must export installer');
assert(staffFacadeSource.includes('export function installGlobalStaffAuth'), 'staff facade must export installer');
assert(domAdapterSource.includes('export function installDomAdapter'), 'dom adapter must export installer');
assert(storeAdapterSource.includes('export function installStoreAdapter'), 'store adapter must export installer');
assert(dbAdapterSource.includes('export function installDbAdapter'), 'db adapter must export installer');
assert(headerActionsSource.includes('export function installHeaderActions'), 'header actions island must export installer');
assert(inventoryTabsSource.includes('export function installInventoryTabs'), 'inventory tabs island must export installer');
assert(imageZoomSource.includes('export function installGlobalImageZoom'), 'image zoom island must export installer');
assert(reportDateControlsSource.includes('export function installReportDateControls'), 'report date controls island must export installer');
assert(reportTabsSource.includes('export function installReportTabs'), 'report tabs island must export installer');
assert(settingsTabsSource.includes('export function installSettingsTabs'), 'settings tabs island must export installer');

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

  getDocument: function getDocument() { return win.document || null; },
  qs: function qs() { return null; },
  qsa: function qsa() { return []; },
  on: function on() { return function noopOff() {}; },
  off: function off() {},
  installDomAdapter: function installDomAdapter(globalScope) {
    var rootScope = globalScope || win;
    rootScope.XekhoApp.esm.adapters = rootScope.XekhoApp.esm.adapters || {};
    rootScope.XekhoApp.esm.adapters.dom = {
      getDocument: sandbox.getDocument,
      qs: sandbox.qs,
      qsa: sandbox.qsa,
      on: sandbox.on,
      off: sandbox.off,
    };
    return rootScope.XekhoApp.esm.adapters.dom;
  },
  getStore: function getStore(globalScope) { return (globalScope || win).Store || null; },
  getAppState: function getAppState(globalScope) { return (globalScope || win).appState || null; },
  isAppStateReady: function isAppStateReady(globalScope) { return Boolean((globalScope || win).appState?.ready); },
  readAppStateKey: function readAppStateKey(key, fallback, globalScope) {
    var state = (globalScope || win).appState || {};
    return Object.prototype.hasOwnProperty.call(state, key) ? state[key] : fallback;
  },
  getMenu: function getMenu() { return []; },
  getInventory: function getInventory() { return []; },
  getSettings: function getSettings() { return {}; },
  getCurrentUser: function getCurrentUser() { return null; },
  createStateSnapshot: function createStateSnapshot() { return { ready: true }; },
  installStoreAdapter: function installStoreAdapter(globalScope) {
    var rootScope = globalScope || win;
    rootScope.XekhoApp.esm.adapters = rootScope.XekhoApp.esm.adapters || {};
    rootScope.XekhoApp.esm.adapters.store = {
      getStore: sandbox.getStore,
      getAppState: sandbox.getAppState,
      isAppStateReady: sandbox.isAppStateReady,
      readAppStateKey: sandbox.readAppStateKey,
      getMenu: sandbox.getMenu,
      getInventory: sandbox.getInventory,
      getSettings: sandbox.getSettings,
      getCurrentUser: sandbox.getCurrentUser,
      createStateSnapshot: sandbox.createStateSnapshot,
    };
    return rootScope.XekhoApp.esm.adapters.store;
  },
  getDB: function getDB(globalScope) { return (globalScope || win).DB || null; },
  isDBReady: function isDBReady(globalScope) { return Boolean((globalScope || win).DB); },
  waitForDB: function waitForDB(globalScope) { return Promise.resolve((globalScope || win).DB); },
  getDBSection: function getDBSection(name, globalScope) { return ((globalScope || win).DB || {})[name] || null; },
  callDBMethod: async function callDBMethod() { return null; },
  installDbAdapter: function installDbAdapter(globalScope) {
    var rootScope = globalScope || win;
    rootScope.XekhoApp.esm.adapters = rootScope.XekhoApp.esm.adapters || {};
    rootScope.XekhoApp.esm.adapters.db = {
      getDB: sandbox.getDB,
      isDBReady: sandbox.isDBReady,
      waitForDB: sandbox.waitForDB,
      getDBSection: sandbox.getDBSection,
      callDBMethod: sandbox.callDBMethod,
    };
    return rootScope.XekhoApp.esm.adapters.db;
  },

  callHeaderAction: function callHeaderAction() {},
  callInventoryTab: function callInventoryTab() {},
  installInventoryTabs: function installInventoryTabs(globalScope) {
    var rootScope = globalScope || win;
    rootScope.XekhoApp.esm.ui = rootScope.XekhoApp.esm.ui || {};
    rootScope.XekhoApp.esm.ui.inventoryTabs = {
      selector: '[data-esm-inventory-tab]',
      installed: true,
      uninstall: function uninstall() {},
      callInventoryTab: sandbox.callInventoryTab,
    };
    return rootScope.XekhoApp.esm.ui.inventoryTabs;
  },
  installHeaderActions: function installHeaderActions(globalScope) {
    var rootScope = globalScope || win;
    rootScope.XekhoApp.esm.ui = rootScope.XekhoApp.esm.ui || {};
    rootScope.XekhoApp.esm.ui.headerActions = {
      selector: '[data-esm-header-action]',
      installed: true,
      uninstall: function uninstall() {},
      callHeaderAction: sandbox.callHeaderAction,
    };
    return rootScope.XekhoApp.esm.ui.headerActions;
  },

  callReportPeriod: function callReportPeriod() {},
  callReportDateMode: function callReportDateMode() {},
  installReportDateControls: function installReportDateControls(globalScope) {
    var rootScope = globalScope || win;
    rootScope.XekhoApp.esm.ui = rootScope.XekhoApp.esm.ui || {};
    rootScope.XekhoApp.esm.ui.reportDateControls = {
      selector: '[data-esm-report-period], [data-esm-report-date-mode]',
      installed: true,
      uninstall: function uninstall() {},
      callReportPeriod: sandbox.callReportPeriod,
      callReportDateMode: sandbox.callReportDateMode,
    };
    return rootScope.XekhoApp.esm.ui.reportDateControls;
  },

  callReportTab: function callReportTab() {},
  installReportTabs: function installReportTabs(globalScope) {
    var rootScope = globalScope || win;
    rootScope.XekhoApp.esm.ui = rootScope.XekhoApp.esm.ui || {};
    rootScope.XekhoApp.esm.ui.reportTabs = {
      selector: '[data-esm-report-tab]',
      installed: true,
      uninstall: function uninstall() {},
      callReportTab: sandbox.callReportTab,
    };
    return rootScope.XekhoApp.esm.ui.reportTabs;
  },

  callSettingsTab: function callSettingsTab() {},
  installSettingsTabs: function installSettingsTabs(globalScope) {
    var rootScope = globalScope || win;
    rootScope.XekhoApp.esm.ui = rootScope.XekhoApp.esm.ui || {};
    rootScope.XekhoApp.esm.ui.settingsTabs = {
      selector: '[data-esm-settings-tab]',
      installed: true,
      uninstall: function uninstall() {},
      callSettingsTab: sandbox.callSettingsTab,
    };
    return rootScope.XekhoApp.esm.ui.settingsTabs;
  },

  createImageZoomController: function createImageZoomController() {
    return {
      attach: function attach() {},
      detach: function detach() {},
      reset: function reset() {},
      getState: function getState() { return { attached: false }; },
    };
  },
  installGlobalImageZoom: function installGlobalImageZoom(globalScope) {
    var rootScope = globalScope || win;
    rootScope.XekhoApp.esm.ui = rootScope.XekhoApp.esm.ui || {};
    var controller = sandbox.createImageZoomController();
    rootScope.XekhoApp.esm.ui.imageZoom = controller;
    rootScope.ImgZoom = controller;
    return controller;
  },
};
vm.createContext(sandbox);
vm.runInContext(classicDomSource, sandbox, { filename: 'app/utils/dom.js' });
vm.runInContext(executableEntrySource, sandbox, { filename: 'app/esm/main.js' });

assert(win.XekhoApp.esm.harness.loaded === true, 'harness.loaded should be true');
assert(win.XekhoApp.esm.harness.version === '20260602-e5-inventory-tabs', 'harness version mismatch');
assert(win.XekhoApp.esm.harness.classicRuntimePresent === true, 'classic runtime marker should be detected');
assert(win.XekhoApp.esm.facades.dom.loaded === true, 'dom facade marker should be loaded');
assert(win.XekhoApp.esm.facades.dom.escapeHtmlMatchesGlobal === true, 'dom facade should install matching global escapeHtml');
assert(win.XekhoApp.esm.facades.format.loaded === true, 'format facade marker should be loaded');
assert(win.XekhoApp.esm.facades.date.loaded === true, 'date facade marker should be loaded');
assert(win.XekhoApp.esm.facades.excel.loaded === true, 'excel facade marker should be loaded');
assert(win.XekhoApp.esm.facades.authStaff.loaded === true, 'auth staff facade marker should be loaded');
assert(win.XekhoApp.esm.facades.runtimeAdapters.loaded === true, 'runtime adapter marker should be loaded');
assert(win.XekhoApp.esm.facades.runtimeAdapters.dom.qsPresent === true, 'dom adapter marker mismatch');
assert(win.XekhoApp.esm.facades.runtimeAdapters.store.getAppStatePresent === true, 'store adapter marker mismatch');
assert(win.XekhoApp.esm.facades.runtimeAdapters.db.waitForDBPresent === true, 'db adapter marker mismatch');
assert(win.XekhoApp.esm.facades.uiIslands.loaded === true, 'ui island marker should be loaded');
assert(win.XekhoApp.esm.facades.uiIslands.headerActions.installed === true, 'header actions marker mismatch');
assert(win.XekhoApp.esm.facades.uiIslands.inventoryTabs.installed === true, 'inventory tabs marker mismatch');
assert(win.XekhoApp.esm.facades.uiIslands.inventoryTabs.selectorPresent === true, 'inventory tabs selector marker mismatch');
assert(win.XekhoApp.esm.facades.uiIslands.headerActions.selectorPresent === true, 'header actions selector marker mismatch');
assert(win.XekhoApp.esm.facades.uiIslands.reportDateControls.installed === true, 'report date controls marker mismatch');
assert(win.XekhoApp.esm.facades.uiIslands.reportDateControls.selectorPresent === true, 'report date controls selector marker mismatch');
assert(win.XekhoApp.esm.facades.uiIslands.reportTabs.installed === true, 'report tabs marker mismatch');
assert(win.XekhoApp.esm.facades.uiIslands.reportTabs.selectorPresent === true, 'report tabs selector marker mismatch');
assert(win.XekhoApp.esm.facades.uiIslands.settingsTabs.installed === true, 'settings tabs marker mismatch');
assert(win.XekhoApp.esm.facades.uiIslands.settingsTabs.selectorPresent === true, 'settings tabs selector marker mismatch');
assert(win.XekhoApp.esm.facades.uiIslands.imageZoom.attachPresent === true, 'image zoom marker mismatch');
assert(typeof win.XekhoApp.esm.ui.headerActions.callHeaderAction === 'function', 'header actions island should install under XekhoApp.esm.ui');
assert(typeof win.XekhoApp.esm.ui.inventoryTabs.callInventoryTab === 'function', 'inventory tabs island should install under XekhoApp.esm.ui');
assert(typeof win.XekhoApp.esm.ui.reportDateControls.callReportPeriod === 'function', 'report date controls island should install under XekhoApp.esm.ui');
assert(typeof win.XekhoApp.esm.ui.reportTabs.callReportTab === 'function', 'report tabs island should install under XekhoApp.esm.ui');
assert(typeof win.XekhoApp.esm.ui.settingsTabs.callSettingsTab === 'function', 'settings tabs island should install under XekhoApp.esm.ui');
assert(typeof win.XekhoApp.esm.ui.imageZoom.attach === 'function', 'image zoom island should install under XekhoApp.esm.ui');
assert(win.XekhoApp.utils.dom.escapeHtml('<b>&"\'') === '&lt;b&gt;&amp;&quot;&#39;', 'global escapeHtml should escape HTML');
assert(win.fmt(1000) === '1K', 'legacy fmt should be installed by format facade');
assert(win.XekhoApp.auth.getStaffIdentity() === 's1', 'auth staff facade should install auth namespace');
assert(events.length === 1, 'expected exactly one esm-ready event');
assert(events[0].type === 'xekho:esm-ready', 'unexpected event type');

console.log('verify-esm-entry passed', win.XekhoApp.esm.harness, win.XekhoApp.esm.facades);
