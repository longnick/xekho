// @ts-check

const SETTINGS_TAB_SELECTOR = '[data-esm-settings-tab]';

/**
 * Resolve the legacy settings tab switcher from the browser root.
 *
 * @param {any} root
 * @returns {((tab: string, trigger?: HTMLElement) => any) | null}
 */
function resolveSettingsTabSwitcher(root) {
  if (root && typeof root.switchSettingsTab === 'function') return root.switchSettingsTab;
  return null;
}

/**
 * Delegate to the legacy settings tab switcher when available.
 *
 * @param {string} tab
 * @param {HTMLElement=} trigger
 * @param {any=} root
 * @returns {any}
 */
export function callSettingsTab(tab, trigger, root) {
  var browserRoot = root || (typeof window !== 'undefined' ? window : globalThis);
  var switcher = resolveSettingsTabSwitcher(browserRoot);
  if (!tab || typeof switcher !== 'function') return undefined;
  return switcher(tab, trigger);
}

/**
 * Install delegated handling for static settings tab buttons.
 *
 * @param {any=} root
 * @returns {{ installed: boolean, selector: string, callSettingsTab: typeof callSettingsTab, uninstall: () => void }}
 */
export function installSettingsTabs(root) {
  var browserRoot = root || (typeof window !== 'undefined' ? window : globalThis);
  var documentRef = browserRoot && browserRoot.document;
  /** @type {{ installed: boolean, selector: string, callSettingsTab: typeof callSettingsTab, uninstall: () => void }} */
  var api = {
    installed: false,
    selector: SETTINGS_TAB_SELECTOR,
    callSettingsTab: callSettingsTab,
    uninstall: function noop() {},
  };

  if (!browserRoot) return api;

  /** @type {any} */
  var XekhoApp = browserRoot.XekhoApp = browserRoot.XekhoApp || {};
  XekhoApp.esm = XekhoApp.esm || {};
  XekhoApp.esm.ui = XekhoApp.esm.ui || {};
  XekhoApp.esm.ui.settingsTabs = api;

  if (!documentRef || typeof documentRef.addEventListener !== 'function') return api;

  /**
   * @param {{ target?: any }} event
   */
  function handleClick(event) {
    var target = event && event.target;
    var button = target && typeof target.closest === 'function' ? target.closest(SETTINGS_TAB_SELECTOR) : null;
    if (!button || !button.dataset) return;
    callSettingsTab(button.dataset.esmSettingsTab || '', button, browserRoot);
  }

  documentRef.addEventListener('click', handleClick);
  api.installed = true;
  api.uninstall = function uninstallSettingsTabs() {
    if (documentRef && typeof documentRef.removeEventListener === 'function') {
      documentRef.removeEventListener('click', handleClick);
    }
    api.installed = false;
  };

  return api;
}
