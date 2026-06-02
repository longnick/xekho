// @ts-check
import { escapeHtml, installGlobalDomUtils } from './utils/dom.js';
import { compactNumber, currency, date, dateTime, installGlobalFormatUtils, time, todayKey } from './utils/format.js';
import { formatLocalDateKey, getWeekStartKey, installGlobalDateUtils, resolvePeriodDateRangePure } from './utils/date.js';
import { applyReportTitleBlock, excelColLetter, excelFmtVnInt, excelThinBorder, installGlobalExcelUtils, paintExcelHeaderRow, paintExcelTotalRow, setRowBorders } from './utils/excel.js';
import { buildCurrentUserFromStaff, getStaffIdentity, installGlobalStaffAuth, normalizeStaffRole, normalizeStaffStatus, validatePinFormat } from './auth/staff.js';

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

  XekhoApp.esm.harness = {
    version: '20260602-e2-leaf-facades',
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
