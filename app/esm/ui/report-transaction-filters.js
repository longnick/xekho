// @ts-check

const REPORT_TRANSACTION_FILTER_SELECTOR = '[data-esm-report-transaction-filter]';

/**
 * @param {any} root
 * @returns {((type: string, checked: boolean) => any) | null}
 */
function resolveReportTransactionFilterSetter(root) {
  if (root && typeof root.setReportTransactionFilter === 'function') return root.setReportTransactionFilter;
  return null;
}

/**
 * Delegate to the existing classic `setReportTransactionFilter(type, checked)` global.
 *
 * @param {string} type
 * @param {boolean} checked
 * @param {any} [root]
 * @returns {any}
 */
export function callReportTransactionFilter(type, checked, root) {
  var browserRoot = root || (typeof window !== 'undefined' ? window : globalThis);
  var setter = resolveReportTransactionFilterSetter(browserRoot);
  if (typeof setter !== 'function') return undefined;
  return setter(String(type || ''), Boolean(checked));
}

/**
 * Install delegated change handling for report transaction filter toggles.
 *
 * @param {any} [root]
 * @returns {{ selector: string, installed: boolean, callReportTransactionFilter: typeof callReportTransactionFilter, detach: () => void }}
 */
export function installReportTransactionFilters(root) {
  var browserRoot = root || (typeof window !== 'undefined' ? window : globalThis);
  var doc = browserRoot && browserRoot.document;
  /** @type {any} */
  var XekhoApp = browserRoot.XekhoApp = browserRoot.XekhoApp || {};
  XekhoApp.esm = XekhoApp.esm || {};
  XekhoApp.esm.ui = XekhoApp.esm.ui || {};

  /** @param {any} event */
  function handleChange(event) {
    var target = event && event.target;
    var input = target && typeof target.closest === 'function'
      ? target.closest(REPORT_TRANSACTION_FILTER_SELECTOR)
      : null;
    if (!input || !input.dataset || !input.dataset.esmReportTransactionFilter) return;
    callReportTransactionFilter(input.dataset.esmReportTransactionFilter, Boolean(input.checked), browserRoot);
  }

  if (doc && typeof doc.addEventListener === 'function') {
    doc.addEventListener('change', handleChange);
  }

  var api = {
    selector: REPORT_TRANSACTION_FILTER_SELECTOR,
    installed: Boolean(doc && typeof doc.addEventListener === 'function'),
    callReportTransactionFilter: callReportTransactionFilter,
    detach: function detach() {
      if (doc && typeof doc.removeEventListener === 'function') {
        doc.removeEventListener('change', handleChange);
      }
    },
  };

  XekhoApp.esm.ui.reportTransactionFilters = api;
  return api;
}
