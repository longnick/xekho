// @ts-check

const REPORT_MENU_FILTER_SELECTOR = '[data-esm-report-menu-filter]';
const REPORT_FILTER_RESET_SELECTOR = '[data-esm-report-filter-reset]';
const REPORT_FILTER_CONTROLS_SELECTOR = REPORT_MENU_FILTER_SELECTOR + ', ' + REPORT_FILTER_RESET_SELECTOR;

/** @param {any} root @returns {((value: string) => any) | null} */
function resolveReportMenuFilterSetter(root) {
  if (root && typeof root.setReportMenuFilter === 'function') return root.setReportMenuFilter;
  return null;
}

/** @param {any} root @returns {(() => any) | null} */
function resolveReportFilterResetter(root) {
  if (root && typeof root.resetReportFilters === 'function') return root.resetReportFilters;
  return null;
}

/**
 * @param {string} value
 * @param {any} [root]
 * @returns {any}
 */
export function callReportMenuFilter(value, root) {
  var browserRoot = root || (typeof window !== 'undefined' ? window : globalThis);
  var setter = resolveReportMenuFilterSetter(browserRoot);
  if (typeof setter !== 'function') return undefined;
  return setter(String(value || ''));
}

/**
 * @param {any} [root]
 * @returns {any}
 */
export function callReportFilterReset(root) {
  var browserRoot = root || (typeof window !== 'undefined' ? window : globalThis);
  var resetter = resolveReportFilterResetter(browserRoot);
  if (typeof resetter !== 'function') return undefined;
  return resetter();
}

/**
 * @param {any} [root]
 * @returns {{ selector: string, installed: boolean, callReportMenuFilter: typeof callReportMenuFilter, callReportFilterReset: typeof callReportFilterReset, detach: () => void }}
 */
export function installReportFilterControls(root) {
  var browserRoot = root || (typeof window !== 'undefined' ? window : globalThis);
  var doc = browserRoot && browserRoot.document;
  /** @type {any} */
  var XekhoApp = browserRoot.XekhoApp = browserRoot.XekhoApp || {};
  XekhoApp.esm = XekhoApp.esm || {};
  XekhoApp.esm.ui = XekhoApp.esm.ui || {};

  /** @param {any} event */
  function handleChange(event) {
    var target = event && event.target;
    var select = target && typeof target.closest === 'function'
      ? target.closest(REPORT_MENU_FILTER_SELECTOR)
      : null;
    if (!select) return;
    callReportMenuFilter(select.value, browserRoot);
  }

  /** @param {any} event */
  function handleClick(event) {
    var target = event && event.target;
    var button = target && typeof target.closest === 'function'
      ? target.closest(REPORT_FILTER_RESET_SELECTOR)
      : null;
    if (!button) return;
    if (typeof event.preventDefault === 'function') event.preventDefault();
    callReportFilterReset(browserRoot);
  }

  if (doc && typeof doc.addEventListener === 'function') {
    doc.addEventListener('change', handleChange);
    doc.addEventListener('click', handleClick);
  }

  var api = {
    selector: REPORT_FILTER_CONTROLS_SELECTOR,
    installed: Boolean(doc && typeof doc.addEventListener === 'function'),
    callReportMenuFilter: callReportMenuFilter,
    callReportFilterReset: callReportFilterReset,
    detach: function detach() {
      if (doc && typeof doc.removeEventListener === 'function') {
        doc.removeEventListener('change', handleChange);
        doc.removeEventListener('click', handleClick);
      }
    },
  };

  XekhoApp.esm.ui.reportFilterControls = api;
  return api;
}
