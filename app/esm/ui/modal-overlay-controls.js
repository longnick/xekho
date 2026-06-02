// @ts-check

const MODAL_SELF_DISMISS_SELECTOR = '[data-esm-modal-self-dismiss]';
const MODAL_CLOSE_SELECTOR = '[data-esm-modal-close]';
const MODAL_CLOSE_SELF_SELECTOR = '[data-esm-modal-close-self]';
const IMAGE_ZOOM_SELF_DISMISS_SELECTOR = '[data-esm-image-zoom-self-dismiss]';
const IMAGE_ZOOM_CLOSE_SELECTOR = '[data-esm-image-zoom-close]';
const IMAGE_ZOOM_RESET_SELECTOR = '[data-esm-image-zoom-reset]';
const MODAL_OVERLAY_CONTROLS_SELECTOR = MODAL_SELF_DISMISS_SELECTOR + ', ' + MODAL_CLOSE_SELECTOR + ', ' + MODAL_CLOSE_SELF_SELECTOR + ', ' + IMAGE_ZOOM_SELF_DISMISS_SELECTOR + ', ' + IMAGE_ZOOM_CLOSE_SELECTOR + ', ' + IMAGE_ZOOM_RESET_SELECTOR;

/**
 * @param {any} root
 * @returns {any}
 */
function resolveDocument(root) {
  return root && root.document ? root.document : null;
}

/**
 * @param {any} root
 * @returns {any}
 */
function resolveImgZoom(root) {
  return root && root.ImgZoom ? root.ImgZoom : null;
}

/**
 * @param {any} root
 * @param {any} modal
 * @returns {boolean}
 */
export function dismissModal(root, modal) {
  if (!modal || !modal.classList || typeof modal.classList.remove !== 'function') return false;
  modal.classList.remove('active');
  return true;
}

/**
 * @param {any} root
 * @returns {boolean}
 */
export function closeModalById(root, modalId) {
  var doc = resolveDocument(root);
  var modal = doc && modalId ? doc.getElementById(modalId) : null;
  return dismissModal(root, modal);
}

/**
 * @param {any} root
 * @returns {boolean}
 */
export function resetImageZoom(root) {
  var imgZoom = resolveImgZoom(root);
  if (!imgZoom || typeof imgZoom.reset !== 'function') return false;
  imgZoom.reset();
  return true;
}

/**
 * @param {any} root
 * @param {string} modalId
 * @returns {boolean}
 */
export function closeImageZoomModal(root, modalId) {
  var doc = resolveDocument(root);
  var modal = doc && modalId ? doc.getElementById(modalId) : null;
  var dismissed = dismissModal(root, modal);
  var imgZoom = resolveImgZoom(root);
  if (imgZoom && typeof imgZoom.detach === 'function') imgZoom.detach();
  return dismissed;
}

/**
 * @param {any} root
 * @param {any} modal
 * @returns {boolean}
 */
export function dismissImageZoomModal(root, modal) {
  var dismissed = dismissModal(root, modal);
  var imgZoom = resolveImgZoom(root);
  if (imgZoom && typeof imgZoom.detach === 'function') imgZoom.detach();
  return dismissed;
}

/**
 * @param {any} root
 * @returns {{installed: boolean, selector: string, dismissModal: typeof dismissModal, closeModalById: typeof closeModalById, dismissImageZoomModal: typeof dismissImageZoomModal, closeImageZoomModal: typeof closeImageZoomModal, resetImageZoom: typeof resetImageZoom, detach: () => void}}
 */
export function installModalOverlayControls(root) {
  var doc = resolveDocument(root);
  var installed = false;
  /** @type {any} */
  var handler = null;

  if (doc && typeof doc.addEventListener === 'function') {
    handler = function handleModalOverlayControlClick(event) {
      var target = event && event.target;
      if (!target || typeof target.closest !== 'function') return;

      var modalCloseButton = target.closest(MODAL_CLOSE_SELECTOR);
      if (modalCloseButton) {
        if (typeof event.preventDefault === 'function') event.preventDefault();
        closeModalById(root, modalCloseButton.getAttribute('data-esm-modal-close'));
        return;
      }

      var modalCloseSelf = target.closest(MODAL_CLOSE_SELF_SELECTOR);
      if (modalCloseSelf && target === modalCloseSelf) {
        closeModalById(root, modalCloseSelf.getAttribute('data-esm-modal-close-self'));
        return;
      }

      var resetButton = target.closest(IMAGE_ZOOM_RESET_SELECTOR);
      if (resetButton) {
        if (typeof event.preventDefault === 'function') event.preventDefault();
        resetImageZoom(root);
        return;
      }

      var closeButton = target.closest(IMAGE_ZOOM_CLOSE_SELECTOR);
      if (closeButton) {
        if (typeof event.preventDefault === 'function') event.preventDefault();
        closeImageZoomModal(root, closeButton.getAttribute('data-esm-image-zoom-close'));
        return;
      }

      var imageZoomOverlay = target.closest(IMAGE_ZOOM_SELF_DISMISS_SELECTOR);
      if (imageZoomOverlay && target === imageZoomOverlay) {
        dismissImageZoomModal(root, imageZoomOverlay);
        return;
      }

      var modalOverlay = target.closest(MODAL_SELF_DISMISS_SELECTOR);
      if (modalOverlay && target === modalOverlay) {
        dismissModal(root, modalOverlay);
      }
    };
    doc.addEventListener('click', handler);
    installed = true;
  }

  var api = {
    installed: installed,
    selector: MODAL_OVERLAY_CONTROLS_SELECTOR,
    dismissModal: dismissModal,
    closeModalById: closeModalById,
    dismissImageZoomModal: dismissImageZoomModal,
    closeImageZoomModal: closeImageZoomModal,
    resetImageZoom: resetImageZoom,
    detach: function detach() {
      if (installed && doc && handler && typeof doc.removeEventListener === 'function') {
        doc.removeEventListener('click', handler);
      }
      installed = false;
      api.installed = false;
    },
  };

  if (root) {
    /** @type {any} */
    var anyRoot = root;
    /** @type {any} */
    var XekhoApp = anyRoot.XekhoApp = anyRoot.XekhoApp || {};
    XekhoApp.esm = XekhoApp.esm || {};
    XekhoApp.esm.ui = XekhoApp.esm.ui || {};
    XekhoApp.esm.ui.modalOverlayControls = api;
  }

  return api;
}
