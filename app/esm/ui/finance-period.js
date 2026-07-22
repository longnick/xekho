// @ts-check

const FINANCE_PERIOD_SELECTOR = '[data-esm-finance-period]';

/**
 * Resolve the legacy finance period switcher from the browser root.
 *
 * @param {any} root
 * @returns {((period: string) => any) | null}
 */
function resolveFinancePeriodSwitcher(root) {
  if (root && typeof root.setFinancePeriod === 'function') return root.setFinancePeriod;
  return null;
}

/**
 * Delegate to the existing classic `setFinancePeriod(period)` global.
 * Missing classic runtime is a no-op so this module stays safe in VM/syntax tests.
 *
 * @param {string} period
 * @param {any} [root]
 * @returns {any}
 */
export function callFinancePeriod(period, root) {
  var browserRoot = root || (typeof window !== 'undefined' ? window : globalThis);
  var switcher = resolveFinancePeriodSwitcher(browserRoot);
  if (typeof switcher !== 'function') return undefined;
  return switcher(String(period || ''));
}

/**
 * Install delegated click handling for finance period buttons.
 *
 * @param {any} [root]
 * @returns {{ selector: string, installed: boolean, callFinancePeriod: typeof callFinancePeriod, detach: () => void }}
 */
export function installFinancePeriodControls(root) {
  var browserRoot = root || (typeof window !== 'undefined' ? window : globalThis);
  var doc = browserRoot && browserRoot.document;
  /** @type {any} */
  var XekhoApp = browserRoot.XekhoApp = browserRoot.XekhoApp || {};
  XekhoApp.esm = XekhoApp.esm || {};
  XekhoApp.esm.ui = XekhoApp.esm.ui || {};

  /** @param {any} event */
  function handleClick(event) {
    var target = event && event.target;
    var button = target && typeof target.closest === 'function'
      ? target.closest(FINANCE_PERIOD_SELECTOR)
      : null;
    if (!button || !button.dataset || !button.dataset.esmFinancePeriod) return;
    if (typeof event.preventDefault === 'function') event.preventDefault();
    callFinancePeriod(button.dataset.esmFinancePeriod, browserRoot);
  }

  if (doc && typeof doc.addEventListener === 'function') {
    doc.addEventListener('click', handleClick);
  }

  var api = {
    selector: FINANCE_PERIOD_SELECTOR,
    installed: Boolean(doc && typeof doc.addEventListener === 'function'),
    callFinancePeriod: callFinancePeriod,
    detach: function detach() {
      if (doc && typeof doc.removeEventListener === 'function') {
        doc.removeEventListener('click', handleClick);
      }
    },
  };

  XekhoApp.esm.ui.financePeriod = api;
  return api;
}
