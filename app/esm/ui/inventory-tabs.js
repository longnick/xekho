// @ts-check

const INVENTORY_TAB_SELECTOR = '[data-esm-inventory-tab]';

/**
 * @param {any} root
 * @returns {((tab: string, trigger?: HTMLElement) => any) | null}
 */
function resolveInventoryTabSwitcher(root) {
  if (root && typeof root.switchInvTab === 'function') return root.switchInvTab;
  return null;
}

/**
 * Delegate to the legacy inventory tab switcher.
 *
 * @param {string} tab
 * @param {HTMLElement=} trigger
 * @param {any=} root
 * @returns {any}
 */
export function callInventoryTab(tab, trigger, root) {
  var browserRoot = root || (typeof window !== 'undefined' ? window : globalThis);
  var switcher = resolveInventoryTabSwitcher(browserRoot);
  if (!tab || typeof switcher !== 'function') return undefined;
  return switcher(tab, trigger);
}

/**
 * Install delegated handling for static inventory tab buttons.
 *
 * @param {any=} root
 * @returns {{ installed: boolean, selector: string, callInventoryTab: typeof callInventoryTab, uninstall: () => void }}
 */
export function installInventoryTabs(root) {
  var browserRoot = root || (typeof window !== 'undefined' ? window : globalThis);
  var documentRef = browserRoot && browserRoot.document;
  /** @type {{ installed: boolean, selector: string, callInventoryTab: typeof callInventoryTab, uninstall: () => void }} */
  var api = {
    installed: false,
    selector: INVENTORY_TAB_SELECTOR,
    callInventoryTab: callInventoryTab,
    uninstall: function noop() {},
  };

  if (!browserRoot) return api;

  /** @type {any} */
  var XekhoApp = browserRoot.XekhoApp = browserRoot.XekhoApp || {};
  XekhoApp.esm = XekhoApp.esm || {};
  XekhoApp.esm.ui = XekhoApp.esm.ui || {};
  XekhoApp.esm.ui.inventoryTabs = api;

  if (!documentRef || typeof documentRef.addEventListener !== 'function') return api;

  /**
   * @param {{ target?: any }} event
   */
  function handleClick(event) {
    var target = event && event.target;
    var button = target && typeof target.closest === 'function' ? target.closest(INVENTORY_TAB_SELECTOR) : null;
    if (!button || !button.dataset || !button.dataset.esmInventoryTab) return;
    callInventoryTab(button.dataset.esmInventoryTab, button, browserRoot);
  }

  documentRef.addEventListener('click', handleClick);
  api.installed = true;
  api.uninstall = function uninstallInventoryTabs() {
    if (documentRef && typeof documentRef.removeEventListener === 'function') {
      documentRef.removeEventListener('click', handleClick);
    }
    api.installed = false;
  };

  return api;
}
