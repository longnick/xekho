// @ts-check

const ADMIN_RENDER_SELECTOR = '[data-esm-admin-render]';
const MENU_SEARCH_SELECTOR = '[data-esm-menu-items-search]';
const ADMIN_RENDER_COMBINED_SELECTOR = ADMIN_RENDER_SELECTOR + ', ' + MENU_SEARCH_SELECTOR;

const ALLOWED_ADMIN_RENDER_CALLS = new Set([
  'renderTables',
  'renderStockList',
  'renderMenuAdmin',
]);

/**
 * Resolve a callable global from the classic runtime.
 *
 * @param {any} root
 * @param {string} name
 * @returns {Function|null}
 */
function resolveClassicFunction(root, name) {
  if (!root || typeof root[name] !== 'function') return null;
  return root[name];
}

/**
 * Call an allowlisted admin render helper from the classic runtime.
 *
 * @param {any} root
 * @param {string} action
 * @returns {unknown}
 */
export function callAdminRender(root, action) {
  if (!ALLOWED_ADMIN_RENDER_CALLS.has(String(action || ''))) return undefined;
  const fn = resolveClassicFunction(root, String(action));
  if (!fn) return undefined;
  return fn.call(root);
}

/**
 * Update the legacy menu search global and render menu items.
 * Mirrors: menuSearch=this.value;renderMenuItems()
 *
 * @param {any} root
 * @param {unknown} value
 * @returns {unknown}
 */
export function callMenuItemsSearch(root, value) {
  if (!root) return undefined;
  root.menuSearch = String(value || '');
  const fn = resolveClassicFunction(root, 'renderMenuItems');
  if (!fn) return undefined;
  return fn.call(root);
}

/**
 * Install delegated admin render controls.
 *
 * @param {any} root
 * @returns {{ callAdminRender: typeof callAdminRender, callMenuItemsSearch: typeof callMenuItemsSearch, installed: boolean, selector: string, detach: () => void }}
 */
export function installAdminRenderControls(root = globalThis) {
  const doc = root && root.document;
  if (!doc || typeof doc.addEventListener !== 'function') {
    return {
      callAdminRender,
      callMenuItemsSearch,
      installed: false,
      selector: ADMIN_RENDER_COMBINED_SELECTOR,
      detach: function noopDetach() {},
    };
  }

  /** @param {any} event */
  function onRenderEvent(event) {
    const target = event && event.target;
    if (!target || typeof target.closest !== 'function') return;

    const renderEl = target.closest(ADMIN_RENDER_SELECTOR);
    if (renderEl && renderEl.dataset && renderEl.dataset.esmAdminRender) {
      callAdminRender(root, renderEl.dataset.esmAdminRender);
      return;
    }

    const searchEl = target.closest(MENU_SEARCH_SELECTOR);
    if (searchEl) {
      callMenuItemsSearch(root, searchEl.value);
    }
  }

  doc.addEventListener('click', onRenderEvent);
  doc.addEventListener('change', onRenderEvent);
  doc.addEventListener('input', onRenderEvent);

  return {
    callAdminRender,
    callMenuItemsSearch,
    installed: true,
    selector: ADMIN_RENDER_COMBINED_SELECTOR,
    detach: function detach() {
      doc.removeEventListener('click', onRenderEvent);
      doc.removeEventListener('change', onRenderEvent);
      doc.removeEventListener('input', onRenderEvent);
    },
  };
}

/**
 * Publish helpers under the ESM namespace.
 *
 * @param {any} root
 * @returns {ReturnType<typeof installAdminRenderControls>}
 */
export function publishAdminRenderControls(root = globalThis) {
  /** @type {any} */
  const anyRoot = root || globalThis;
  const installed = installAdminRenderControls(anyRoot);
  /** @type {any} */
  const XekhoApp = anyRoot.XekhoApp = anyRoot.XekhoApp || {};
  XekhoApp.esm = XekhoApp.esm || {};
  XekhoApp.esm.ui = XekhoApp.esm.ui || {};
  XekhoApp.esm.ui.adminRenderControls = installed;
  return installed;
}
