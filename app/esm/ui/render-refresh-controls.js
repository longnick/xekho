// @ts-check

const RENDER_REFRESH_SELECTOR = '[data-esm-render-refresh]';

const ALLOWED_RENDER_REFRESH_CALLS = new Set([
  'applyStocktakeHistoryFilter',
  'renderLedger',
  'renderAttendanceManagement',
]);

/**
 * Resolve a legacy render/filter function from the browser root.
 *
 * @param {any} root
 * @param {string} name
 * @returns {Function | null}
 */
function resolveRenderRefreshFunction(root, name) {
  if (!ALLOWED_RENDER_REFRESH_CALLS.has(name)) return null;
  if (root && typeof root[name] === 'function') return root[name];
  return null;
}

/**
 * Call an allowed legacy render/filter function.
 *
 * @param {any} root
 * @param {string} name
 * @returns {any}
 */
export function callRenderRefresh(root, name) {
  const fn = resolveRenderRefreshFunction(root, name);
  if (!fn) return undefined;
  return fn.call(root);
}

/**
 * Install delegated render/filter refresh controls.
 *
 * @param {any} root
 * @returns {{ callRenderRefresh: typeof callRenderRefresh, installed: boolean, selector: string, detach: () => void }}
 */
export function installRenderRefreshControls(root = globalThis) {
  const doc = root && root.document;
  if (!doc || typeof doc.addEventListener !== 'function') {
    return {
      callRenderRefresh,
      installed: false,
      selector: RENDER_REFRESH_SELECTOR,
      detach: function noopDetach() {},
    };
  }

  const onChangeOrInput = function onChangeOrInput(event) {
    const target = event && event.target;
    const el = target && typeof target.closest === 'function'
      ? target.closest(RENDER_REFRESH_SELECTOR)
      : null;
    if (!el || typeof el.getAttribute !== 'function') return;
    const name = el.getAttribute('data-esm-render-refresh') || '';
    callRenderRefresh(root, name);
  };

  const onClick = function onClick(event) {
    const target = event && event.target;
    const el = target && typeof target.closest === 'function'
      ? target.closest(RENDER_REFRESH_SELECTOR)
      : null;
    if (!el || typeof el.getAttribute !== 'function') return;
    if (typeof el.matches === 'function' && !el.matches('button,[role="button"],a')) return;
    if (typeof event.preventDefault === 'function') event.preventDefault();
    const name = el.getAttribute('data-esm-render-refresh') || '';
    callRenderRefresh(root, name);
  };

  doc.addEventListener('change', onChangeOrInput);
  doc.addEventListener('input', onChangeOrInput);
  doc.addEventListener('click', onClick);

  return {
    callRenderRefresh,
    installed: true,
    selector: RENDER_REFRESH_SELECTOR,
    detach: function detach() {
      if (typeof doc.removeEventListener === 'function') {
        doc.removeEventListener('change', onChangeOrInput);
        doc.removeEventListener('input', onChangeOrInput);
        doc.removeEventListener('click', onClick);
      }
    },
  };
}

/**
 * Publish this island for browser diagnostics and compatibility.
 *
 * @param {any} root
 * @returns {void}
 */
export function publishRenderRefreshControls(root = globalThis) {
  if (!root) return;
  /** @type {any} */
  const anyRoot = root;
  /** @type {any} */
  const XekhoApp = anyRoot.XekhoApp = anyRoot.XekhoApp || {};
  XekhoApp.esm = XekhoApp.esm || {};
  XekhoApp.esm.ui = XekhoApp.esm.ui || {};
  XekhoApp.esm.ui.renderRefreshControls = {
    callRenderRefresh,
    installRenderRefreshControls,
    publishRenderRefreshControls,
  };
}

publishRenderRefreshControls(typeof window !== 'undefined' ? window : globalThis);
