// @ts-check
(function (global) {
  'use strict';

  /** @type {any} */
  const root = global || {};
  const XekhoApp = root.XekhoApp = root.XekhoApp || {};
  XekhoApp.utils = XekhoApp.utils || {};

  /** @param {string} text @returns {string} */
  function escapeHtml(text) {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const SAFE_DATA_IMAGE = /^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=\r\n]+$/i;

  /**
   * Accept only HTTPS images and local raster data URLs produced by the logo uploader.
   * SVG/data:text/html/javascript URLs are intentionally rejected.
   * @param {unknown} value
   * @returns {string}
   */
  function safeImageUrl(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    if (SAFE_DATA_IMAGE.test(raw)) return raw;
    try {
      const parsed = new URL(raw);
      return parsed.protocol === 'https:' ? raw : '';
    } catch (_) {
      return '';
    }
  }

  /**
   * Set an image source only after URL-policy validation.
   * @param {{ setAttribute?: Function } | null | undefined} element
   * @param {unknown} value
   * @returns {boolean}
   */
  function setSafeImageSource(element, value) {
    const safeUrl = safeImageUrl(value);
    if (!element || typeof element.setAttribute !== 'function' || !safeUrl) return false;
    element.setAttribute('src', safeUrl);
    return true;
  }

  XekhoApp.utils.dom = Object.assign({}, XekhoApp.utils.dom, {
    escapeHtml,
    safeImageUrl,
    setSafeImageSource,
  });
})(typeof window !== 'undefined' ? window : globalThis);
