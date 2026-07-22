// @ts-check

const REPORT_TAB_SELECTOR = '[data-esm-report-tab]';

/**
 * Resolve the legacy report tab switcher from the browser root.
 *
 * @param {any} root
 * @returns {((tab: string, trigger?: Element | null) => unknown) | null}
 */
function resolveSwitchReportTab(root) {
  if (root && typeof root.switchReportTab === 'function') return root.switchReportTab;
  return null;
}

/**
 * Call the legacy report tab switcher through a narrow delegated ESM boundary.
 *
 * @param {string} tab
 * @param {Element | null | undefined} trigger
 * @param {any=} root
 * @returns {unknown}
 */
export function callReportTab(tab, trigger, root) {
  var globalRoot = root || (typeof window !== 'undefined' ? window : globalThis);
  var normalizedTab = String(tab || '').trim();
  if (!normalizedTab) return undefined;
  var switchReportTab = resolveSwitchReportTab(globalRoot);
  if (typeof switchReportTab !== 'function') return undefined;
  return switchReportTab(normalizedTab, trigger || null);
}

/**
 * Install delegated click handling for static report tab buttons.
 *
 * @param {any=} globalScope
 * @returns {{ selector: string, installed: boolean, uninstall: () => void, callReportTab: typeof callReportTab }}
 */
export function installReportTabs(globalScope) {
  var root = globalScope || (typeof window !== 'undefined' ? window : globalThis);
  root.XekhoApp = root.XekhoApp || {};
  root.XekhoApp.esm = root.XekhoApp.esm || {};
  root.XekhoApp.esm.ui = root.XekhoApp.esm.ui || {};

  var documentRef = root.document || null;
  /** @type {{ selector: string, installed: boolean, uninstall: () => void, callReportTab: typeof callReportTab }} */
  var api = {
    selector: REPORT_TAB_SELECTOR,
    installed: false,
    uninstall: function noopUninstall() {},
    callReportTab: callReportTab,
  };

  if (!documentRef || typeof documentRef.addEventListener !== 'function') {
    root.XekhoApp.esm.ui.reportTabs = api;
    return api;
  }

  var clickHandler = function handleReportTabClick(event) {
    var target = event && event.target;
    var button = null;
    if (target && typeof target.closest === 'function') {
      button = target.closest(REPORT_TAB_SELECTOR);
    } else if (target && target.dataset && target.dataset.esmReportTab) {
      button = target;
    }
    if (!button || !button.dataset || !button.dataset.esmReportTab) return;
    callReportTab(button.dataset.esmReportTab, button, root);
  };

  documentRef.addEventListener('click', clickHandler);
  api.installed = true;
  api.uninstall = function uninstallReportTabs() {
    if (documentRef && typeof documentRef.removeEventListener === 'function') {
      documentRef.removeEventListener('click', clickHandler);
    }
    api.installed = false;
  };

  root.XekhoApp.esm.ui.reportTabs = api;
  return api;
}
