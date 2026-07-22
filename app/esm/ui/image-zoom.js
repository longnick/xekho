// @ts-check
/**
 * ESM image zoom/pan UI island.
 *
 * This mirrors the classic ImgZoom controller but keeps it importable and
 * installable under window.XekhoApp.esm.ui.imageZoom for gradual migration.
 */

const MIN_SCALE = 1;
const MAX_SCALE = 5;

/**
 * @param {any} img
 * @param {number} scale
 * @param {number} translateX
 * @param {number} translateY
 */
function applyTransform(img, scale, translateX, translateY) {
  if (!img) return;
  img.style.transform = `scale(${scale}) translate(${translateX / scale}px, ${translateY / scale}px)`;
  img.style.cursor = scale > 1 ? 'grab' : 'default';
}

/**
 * @returns {{ attach: Function, detach: Function, reset: Function, getState: Function }}
 */
export function createImageZoomController() {
  let img = null;
  let wrap = null;
  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let startX = 0;
  let startY = 0;
  let lastDist = null;
  let lastScale = 1;
  let isDragging = false;
  let lastTap = 0;

  function localApplyTransform() {
    applyTransform(img, scale, translateX, translateY);
  }

  function clampTranslate() {
    if (!img || !wrap) return;
    const ww = wrap.clientWidth;
    const wh = wrap.clientHeight;
    const iw = img.naturalWidth || img.clientWidth;
    const ih = img.naturalHeight || img.clientHeight;
    const scaledW = Math.min(iw, ww) * scale;
    const scaledH = Math.min(ih, wh) * scale;
    const maxX = Math.max(0, (scaledW - ww) / 2);
    const maxY = Math.max(0, (scaledH - wh) / 2);
    translateX = Math.max(-maxX, Math.min(maxX, translateX));
    translateY = Math.max(-maxY, Math.min(maxY, translateY));
  }

  /** @param {any} event */
  function onTouchStart(event) {
    if (event.touches.length === 2) {
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      lastDist = Math.hypot(dx, dy);
      lastScale = scale;
      isDragging = false;
    } else if (event.touches.length === 1) {
      startX = event.touches[0].clientX - translateX;
      startY = event.touches[0].clientY - translateY;
      isDragging = true;
    }
  }

  /** @param {any} event */
  function onTouchMove(event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (event.touches.length === 2 && lastDist !== null) {
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / lastDist;
      scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, lastScale * ratio));
      if (scale <= MIN_SCALE) { translateX = 0; translateY = 0; }
      clampTranslate();
      localApplyTransform();
    } else if (event.touches.length === 1 && isDragging && scale > 1) {
      translateX = event.touches[0].clientX - startX;
      translateY = event.touches[0].clientY - startY;
      clampTranslate();
      localApplyTransform();
    }
  }

  /** @param {any} event */
  function onTouchEnd(event) {
    if (event.touches.length < 2) lastDist = null;
    if (event.touches.length === 0) isDragging = false;
    if (scale < 1.05) { scale = 1; translateX = 0; translateY = 0; localApplyTransform(); }
  }

  /** @param {any} event */
  function onTouchEndTap(event) {
    onTouchEnd(event);
    if (event.changedTouches.length !== 1) return;
    const now = Date.now();
    if (now - lastTap < 300) {
      if (scale > 1) { scale = 1; translateX = 0; translateY = 0; }
      else { scale = 2.5; }
      localApplyTransform();
    }
    lastTap = now;
  }

  /** @param {any} event */
  function onMouseDown(event) {
    if (scale <= 1 || !img) return;
    isDragging = true;
    startX = event.clientX - translateX;
    startY = event.clientY - translateY;
    img.style.cursor = 'grabbing';
  }

  /** @param {any} event */
  function onMouseMove(event) {
    if (!isDragging || scale <= 1) return;
    translateX = event.clientX - startX;
    translateY = event.clientY - startY;
    clampTranslate();
    localApplyTransform();
  }

  function onMouseUp() {
    isDragging = false;
    if (img) img.style.cursor = scale > 1 ? 'grab' : 'default';
  }

  /** @param {any} event */
  function onWheel(event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    const delta = event.deltaY > 0 ? 0.85 : 1.2;
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * delta));
    if (scale <= MIN_SCALE) { translateX = 0; translateY = 0; }
    clampTranslate();
    localApplyTransform();
  }

  /**
   * @param {any} wrapEl
   * @param {any} imgEl
   */
  function attach(wrapEl, imgEl) {
    detach();
    img = imgEl;
    wrap = wrapEl;
    scale = 1;
    translateX = 0;
    translateY = 0;
    localApplyTransform();
    img.style.transformOrigin = 'center center';
    img.style.transition = 'none';
    img.style.willChange = 'transform';
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    img.style.userSelect = 'none';
    img.style.webkitUserSelect = 'none';
    img.draggable = false;

    wrap.addEventListener('touchstart', onTouchStart, { passive: false });
    wrap.addEventListener('touchmove', onTouchMove, { passive: false });
    wrap.addEventListener('touchend', onTouchEndTap, { passive: false });
    wrap.addEventListener('mousedown', onMouseDown);
    wrap.addEventListener('mousemove', onMouseMove);
    wrap.addEventListener('mouseup', onMouseUp);
    wrap.addEventListener('mouseleave', onMouseUp);
    wrap.addEventListener('wheel', onWheel, { passive: false });
  }

  function detach() {
    if (wrap) {
      wrap.removeEventListener('touchstart', onTouchStart);
      wrap.removeEventListener('touchmove', onTouchMove);
      wrap.removeEventListener('touchend', onTouchEndTap);
      wrap.removeEventListener('mousedown', onMouseDown);
      wrap.removeEventListener('mousemove', onMouseMove);
      wrap.removeEventListener('mouseup', onMouseUp);
      wrap.removeEventListener('mouseleave', onMouseUp);
      wrap.removeEventListener('wheel', onWheel);
    }
    img = null;
    wrap = null;
    scale = 1;
    translateX = 0;
    translateY = 0;
  }

  function reset() {
    scale = 1;
    translateX = 0;
    translateY = 0;
    if (img) localApplyTransform();
  }

  function getState() {
    return {
      attached: Boolean(img && wrap),
      scale,
      translateX,
      translateY,
      isDragging,
    };
  }

  return { attach, detach, reset, getState };
}

/**
 * @param {any} root
 * @returns {{ attach: Function, detach: Function, reset: Function, getState: Function }}
 */
export function installGlobalImageZoom(root = globalThis) {
  /** @type {any} */
  const anyRoot = root || globalThis;
  /** @type {any} */
  const XekhoApp = anyRoot.XekhoApp = anyRoot.XekhoApp || {};
  XekhoApp.esm = XekhoApp.esm || {};
  XekhoApp.esm.ui = XekhoApp.esm.ui || {};
  const controller = XekhoApp.esm.ui.imageZoom || createImageZoomController();
  XekhoApp.esm.ui.imageZoom = controller;
  if (!anyRoot.ImgZoom) anyRoot.ImgZoom = controller;
  return controller;
}
