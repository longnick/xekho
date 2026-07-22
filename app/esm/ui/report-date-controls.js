// @ts-check

const REPORT_PERIOD_SELECTOR = '[data-esm-report-period]';
const REPORT_DATE_MODE_SELECTOR = '[data-esm-report-date-mode]';
const REPORT_DATE_CONTROLS_SELECTOR = REPORT_PERIOD_SELECTOR + ', ' + REPORT_DATE_MODE_SELECTOR;

/**
 * @param {any} root
 * @returns {((period: string) => any) | null}
 */
function resolveReportPeriodSetter(root) {
  if (root && typeof root.setReportPeriod === 'function') return root.setReportPeriod;
  return null;
}

/**
 * @param {any} root
 * @returns {((page: string, mode: string, trigger?: HTMLElement) => any) | null}
 */
function resolveDateModeSetter(root) {
  if (root && typeof root.setDateMode === 'function') return root.setDateMode;
  return null;
}

/**
 * Delegate to legacy report period setter.
 *
 * @param {string} period
 * @param {any=} root
 * @returns {any}
 */
export function callReportPeriod(period, root) {
  var browserRoot = root || (typeof window !== 'undefined' ? window : globalThis);
  var setter = resolveReportPeriodSetter(browserRoot);
  if (!period || typeof setter !== 'function') return undefined;
  return setter(period);
}

/**
 * Delegate to legacy report date mode setter.
 *
 * @param {string} mode
 * @param {HTMLElement=} trigger
 * @param {any=} root
 * @returns {any}
 */
export function callReportDateMode(mode, trigger, root) {
  var browserRoot = root || (typeof window !== 'undefined' ? window : globalThis);
  var setter = resolveDateModeSetter(browserRoot);
  if (!mode || typeof setter !== 'function') return undefined;
  return setter('report', mode, trigger);
}

/**
 * Install delegated handling for static report date controls.
 *
 * @param {any=} root
 * @returns {{ installed: boolean, selector: string, callReportPeriod: typeof callReportPeriod, callReportDateMode: typeof callReportDateMode, uninstall: () => void }}
 */
export function installReportDateControls(root) {
  var browserRoot = root || (typeof window !== 'undefined' ? window : globalThis);
  var documentRef = browserRoot && browserRoot.document;
  /** @type {{ installed: boolean, selector: string, callReportPeriod: typeof callReportPeriod, callReportDateMode: typeof callReportDateMode, uninstall: () => void }} */
  var api = {
    installed: false,
    selector: REPORT_DATE_CONTROLS_SELECTOR,
    callReportPeriod: callReportPeriod,
    callReportDateMode: callReportDateMode,
    uninstall: function noop() {},
  };

  if (!browserRoot) return api;

  /** @type {any} */
  var XekhoApp = browserRoot.XekhoApp = browserRoot.XekhoApp || {};
  XekhoApp.esm = XekhoApp.esm || {};
  XekhoApp.esm.ui = XekhoApp.esm.ui || {};
  XekhoApp.esm.ui.reportDateControls = api;

  if (!documentRef || typeof documentRef.addEventListener !== 'function') return api;

  /**
   * @param {{ target?: any }} event
   */
  function handleClick(event) {
    var target = event && event.target;
    var button = target && typeof target.closest === 'function' ? target.closest(REPORT_DATE_CONTROLS_SELECTOR) : null;
    if (!button || !button.dataset) return;
    if (button.dataset.esmReportPeriod) {
      callReportPeriod(button.dataset.esmReportPeriod, browserRoot);
      return;
    }
    if (button.dataset.esmReportDateMode) {
      callReportDateMode(button.dataset.esmReportDateMode, button, browserRoot);
    }
  }

  documentRef.addEventListener('click', handleClick);
  api.installed = true;
  api.uninstall = function uninstallReportDateControls() {
    if (documentRef && typeof documentRef.removeEventListener === 'function') {
      documentRef.removeEventListener('click', handleClick);
    }
    api.installed = false;
  };

  return api;
}
