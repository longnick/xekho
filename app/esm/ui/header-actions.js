// @ts-check

const HEADER_ACTION_SELECTOR = '[data-esm-header-action]';

/** @typedef {(event?: Event) => unknown} HeaderActionHandler */

/**
 * Resolve a named global function from the browser root.
 *
 * @param {any} root
 * @param {string} name
 * @returns {HeaderActionHandler | null}
 */
function resolveGlobalHandler(root, name) {
  if (!root || typeof root[name] !== 'function') return null;
  return root[name];
}

/**
 * Call one header action through the legacy global API.
 *
 * @param {any} root
 * @param {string} action
 * @param {Event=} event
 * @returns {unknown}
 */
export function callHeaderAction(root, action, event) {
  const anyRoot = root || globalThis;
  const actionName = String(action || '').trim();
  const actionMap = {
    ai: 'openAIAssistant',
    'stock-alert': 'openStockAlertPopup',
    'hard-reload': 'hardReloadApp',
    logout: 'handleLogout',
  };
  const globalName = actionMap[actionName];
  if (!globalName) {
    if (anyRoot.console && typeof anyRoot.console.warn === 'function') {
      anyRoot.console.warn('[xekho:esm] unknown header action', actionName);
    }
    return undefined;
  }
  const handler = resolveGlobalHandler(anyRoot, globalName);
  if (!handler) {
    if (anyRoot.console && typeof anyRoot.console.warn === 'function') {
      anyRoot.console.warn('[xekho:esm] missing header action handler', globalName);
    }
    return undefined;
  }
  return handler.call(anyRoot, event);
}

/**
 * Install delegated click handling for static header buttons.
 *
 * @param {any} root
 * @returns {{selector: string, installed: boolean, uninstall: () => void, callHeaderAction: typeof callHeaderAction}}
 */
export function installHeaderActions(root = globalThis) {
  /** @type {any} */
  const anyRoot = root || globalThis;
  const doc = anyRoot.document;
  let installed = false;
  /** @type {((event: Event) => void) | null} */
  let listener = null;

  if (doc && typeof doc.addEventListener === 'function') {
    listener = function onHeaderActionClick(event) {
      const target = /** @type {any} */ (event && event.target);
      const button = target && typeof target.closest === 'function'
        ? target.closest(HEADER_ACTION_SELECTOR)
        : null;
      if (!button) return;
      if (typeof event.preventDefault === 'function') event.preventDefault();
      const action = button.getAttribute('data-esm-header-action');
      callHeaderAction(anyRoot, action, event);
    };
    doc.addEventListener('click', listener);
    installed = true;
  }

  /** @type {any} */
  const XekhoApp = anyRoot.XekhoApp = anyRoot.XekhoApp || {};
  XekhoApp.esm = XekhoApp.esm || {};
  XekhoApp.esm.ui = XekhoApp.esm.ui || {};
  XekhoApp.esm.ui.headerActions = {
    selector: HEADER_ACTION_SELECTOR,
    installed,
    uninstall: function uninstall() {
      if (installed && listener && doc && typeof doc.removeEventListener === 'function') {
        doc.removeEventListener('click', listener);
      }
      installed = false;
    },
    callHeaderAction,
  };

  return XekhoApp.esm.ui.headerActions;
}
