// @ts-check
import { escapeHtml, installGlobalDomUtils } from './utils/dom.js';
import { compactNumber, currency, date, dateTime, installGlobalFormatUtils, time, todayKey } from './utils/format.js';
import { formatLocalDateKey, getWeekStartKey, installGlobalDateUtils, resolvePeriodDateRangePure } from './utils/date.js';
import { applyReportTitleBlock, excelColLetter, excelFmtVnInt, excelThinBorder, installGlobalExcelUtils, paintExcelHeaderRow, paintExcelTotalRow, setRowBorders } from './utils/excel.js';
import { buildCurrentUserFromStaff, getStaffIdentity, installGlobalStaffAuth, normalizeStaffRole, normalizeStaffStatus, validatePinFormat } from './auth/staff.js';
import { getDocument, installDomAdapter, off, on, qs, qsa } from './adapters/dom.js';
import { createStateSnapshot, getAppState, getCurrentUser, getInventory, getMenu, getSettings, getStore, installStoreAdapter, isAppStateReady, readAppStateKey } from './adapters/store.js';
import { callDBMethod, getDB, getDBSection, installDbAdapter, isDBReady, waitForDB } from './adapters/db.js';
import { callFinancePeriod, installFinancePeriodControls } from './ui/finance-period.js';
import { callHeaderAction, installHeaderActions } from './ui/header-actions.js';
import { callInventoryTab, installInventoryTabs } from './ui/inventory-tabs.js';
import { createImageZoomController, installGlobalImageZoom } from './ui/image-zoom.js';
import { callReportPeriod, callReportDateMode, installReportDateControls } from './ui/report-date-controls.js';
import { callReportTab, installReportTabs } from './ui/report-tabs.js';
import { callSettingsTab, installSettingsTabs } from './ui/settings-tabs.js';

/**
 * XE KHO ESM compatibility harness.
 *
 * This file is intentionally small and side-effect-light. It is loaded as a
 * browser module after the existing classic-script runtime so Vite can verify
 * an ESM entry while gradually adding importable facades for leaf utilities.
 */
(function initEsmHarness() {
  var root = typeof window !== 'undefined' ? window : globalThis;
  /** @type {any} */
  var anyRoot = root;
  /** @type {any} */
  var XekhoApp = anyRoot.XekhoApp = anyRoot.XekhoApp || {};
  XekhoApp.esm = XekhoApp.esm || {};
  XekhoApp.esm.facades = XekhoApp.esm.facades || {};

  var domGlobals = installGlobalDomUtils(anyRoot);
  var formatGlobals = installGlobalFormatUtils(anyRoot);
  var dateGlobals = installGlobalDateUtils(anyRoot);
  var excelGlobals = installGlobalExcelUtils(anyRoot);
  var authGlobals = installGlobalStaffAuth(anyRoot);
  var domAdapter = installDomAdapter(anyRoot);
  var storeAdapter = installStoreAdapter(anyRoot);
  var dbAdapter = installDbAdapter(anyRoot);
  var financePeriod = installFinancePeriodControls(anyRoot);
  var headerActions = installHeaderActions(anyRoot);
  var inventoryTabs = installInventoryTabs(anyRoot);
  var imageZoom = installGlobalImageZoom(anyRoot);
  var reportDateControls = installReportDateControls(anyRoot);
  var reportTabs = installReportTabs(anyRoot);
  var settingsTabs = installSettingsTabs(anyRoot);

  XekhoApp.esm.facades.dom = {
    loaded: true,
    escapeHtmlMatchesGlobal: domGlobals.escapeHtml === escapeHtml,
  };
  XekhoApp.esm.facades.format = {
    loaded: true,
    compactNumberMatchesGlobal: formatGlobals.compactNumber === compactNumber,
    currencyMatchesGlobal: formatGlobals.currency === currency,
    dateMatchesGlobal: formatGlobals.date === date,
    timeMatchesGlobal: formatGlobals.time === time,
    dateTimeMatchesGlobal: formatGlobals.dateTime === dateTime,
    todayKeyMatchesGlobal: formatGlobals.todayKey === todayKey,
  };
  XekhoApp.esm.facades.date = {
    loaded: true,
    formatLocalDateKeyMatchesGlobal: dateGlobals.formatLocalDateKey === formatLocalDateKey,
    getWeekStartKeyMatchesGlobal: dateGlobals.getWeekStartKey === getWeekStartKey,
    resolvePeriodDateRangePurePresent: dateGlobals.resolvePeriodDateRangePure === resolvePeriodDateRangePure,
  };
  XekhoApp.esm.facades.excel = {
    loaded: true,
    excelThinBorderMatchesGlobal: excelGlobals.excelThinBorder === excelThinBorder,
    excelColLetterMatchesGlobal: excelGlobals.excelColLetter === excelColLetter,
    excelFmtVnIntMatchesGlobal: excelGlobals.excelFmtVnInt === excelFmtVnInt,
    applyReportTitleBlockMatchesGlobal: excelGlobals.applyReportTitleBlock === applyReportTitleBlock,
    paintExcelHeaderRowMatchesGlobal: excelGlobals.paintExcelHeaderRow === paintExcelHeaderRow,
    paintExcelTotalRowMatchesGlobal: excelGlobals.paintExcelTotalRow === paintExcelTotalRow,
    setRowBordersMatchesGlobal: excelGlobals.setRowBorders === setRowBorders,
  };
  XekhoApp.esm.facades.authStaff = {
    loaded: true,
    normalizeStaffRolePresent: authGlobals.normalizeStaffRole === normalizeStaffRole,
    normalizeStaffStatusPresent: authGlobals.normalizeStaffStatus === normalizeStaffStatus,
    getStaffIdentityPresent: authGlobals.getStaffIdentity === getStaffIdentity,
    buildCurrentUserFromStaffPresent: authGlobals.buildCurrentUserFromStaff === buildCurrentUserFromStaff,
    validatePinFormatPresent: authGlobals.validatePinFormat === validatePinFormat,
  };

  XekhoApp.esm.adapters = Object.assign({}, XekhoApp.esm.adapters, {
    dom: domAdapter,
    store: storeAdapter,
    db: dbAdapter,
  });
  XekhoApp.esm.ui = Object.assign({}, XekhoApp.esm.ui, {
    financePeriod: financePeriod,
    headerActions: headerActions,
    inventoryTabs: inventoryTabs,
    imageZoom: imageZoom,
    reportDateControls: reportDateControls,
    reportTabs: reportTabs,
    settingsTabs: settingsTabs,
  });

  XekhoApp.esm.facades.runtimeAdapters = {
    loaded: true,
    dom: {
      getDocumentPresent: domAdapter.getDocument === getDocument,
      qsPresent: domAdapter.qs === qs,
      qsaPresent: domAdapter.qsa === qsa,
      onPresent: domAdapter.on === on,
      offPresent: domAdapter.off === off,
    },
    store: {
      getStorePresent: storeAdapter.getStore === getStore,
      getAppStatePresent: storeAdapter.getAppState === getAppState,
      isAppStateReadyPresent: storeAdapter.isAppStateReady === isAppStateReady,
      readAppStateKeyPresent: storeAdapter.readAppStateKey === readAppStateKey,
      getMenuPresent: storeAdapter.getMenu === getMenu,
      getInventoryPresent: storeAdapter.getInventory === getInventory,
      getSettingsPresent: storeAdapter.getSettings === getSettings,
      getCurrentUserPresent: storeAdapter.getCurrentUser === getCurrentUser,
      createStateSnapshotPresent: storeAdapter.createStateSnapshot === createStateSnapshot,
    },
    db: {
      getDBPresent: dbAdapter.getDB === getDB,
      isDBReadyPresent: dbAdapter.isDBReady === isDBReady,
      waitForDBPresent: dbAdapter.waitForDB === waitForDB,
      getDBSectionPresent: dbAdapter.getDBSection === getDBSection,
      callDBMethodPresent: dbAdapter.callDBMethod === callDBMethod,
    },
  };

  XekhoApp.esm.facades.uiIslands = {
    loaded: true,
    financePeriod: {
      callFinancePeriodPresent: financePeriod.callFinancePeriod === callFinancePeriod,
      installed: financePeriod.installed === true,
      selectorPresent: financePeriod.selector === '[data-esm-finance-period]',
    },
    headerActions: {
      callHeaderActionPresent: headerActions.callHeaderAction === callHeaderAction,
      installed: headerActions.installed === true,
      selectorPresent: headerActions.selector === '[data-esm-header-action]',
    },
    inventoryTabs: {
      callInventoryTabPresent: inventoryTabs.callInventoryTab === callInventoryTab,
      installed: inventoryTabs.installed === true,
      selectorPresent: inventoryTabs.selector === '[data-esm-inventory-tab]',
    },
    reportDateControls: {
      callReportPeriodPresent: reportDateControls.callReportPeriod === callReportPeriod,
      callReportDateModePresent: reportDateControls.callReportDateMode === callReportDateMode,
      installed: reportDateControls.installed === true,
      selectorPresent: reportDateControls.selector === '[data-esm-report-period], [data-esm-report-date-mode]',
    },
    reportTabs: {
      callReportTabPresent: reportTabs.callReportTab === callReportTab,
      installed: reportTabs.installed === true,
      selectorPresent: reportTabs.selector === '[data-esm-report-tab]',
    },
    settingsTabs: {
      callSettingsTabPresent: settingsTabs.callSettingsTab === callSettingsTab,
      installed: settingsTabs.installed === true,
      selectorPresent: settingsTabs.selector === '[data-esm-settings-tab]',
    },
    imageZoom: {
      createImageZoomControllerPresent: typeof createImageZoomController === 'function',
      attachPresent: typeof imageZoom.attach === 'function',
      detachPresent: typeof imageZoom.detach === 'function',
      resetPresent: typeof imageZoom.reset === 'function',
    },
  };

  XekhoApp.esm.harness = {
    version: '20260602-e5-finance-period',
    loaded: true,
    loadedAt: new Date().toISOString(),
    classicRuntimePresent: Boolean(XekhoApp.utils || XekhoApp.ui || anyRoot.Store || anyRoot.appState),
  };

  if (typeof anyRoot.dispatchEvent === 'function' && typeof anyRoot.CustomEvent === 'function') {
    anyRoot.dispatchEvent(new anyRoot.CustomEvent('xekho:esm-ready', {
      detail: XekhoApp.esm.harness,
    }));
  }
})();
