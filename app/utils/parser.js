// @ts-check
(function (global) {
  'use strict';
  /** @type {any} */
  var _global = global;
  /** @type {any} */
  var XekhoApp = _global.XekhoApp = _global.XekhoApp || {};
  XekhoApp.utils = XekhoApp.utils || {};

  /** @param {string} text @param {string} [source] @returns {{ name: string, qty: number|null, price: number|null, rawText: string, source: string|undefined }} */
  function parsePurchaseText(text, source) {
    var numbers = (String(text || '').match(/\d[\d\.]*/g) || [])
      .map(function (x) { return parseFloat(x.replace(/\./g, '')); })
      .filter(function (x) { return !isNaN(x); });
    var price = null;
    var qty = null;
    if (numbers.length) {
      price = Math.max.apply(null, numbers);
      var others = numbers.filter(function (n) { return n !== price; });
      if (others.length) qty = others[0];
    }
    var tLines = String(text || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    var bestLine = '';
    tLines.forEach(function (l) {
      if (/[A-Za-z\u00C0-\u1EF9]/.test(l) && l.length > bestLine.length) bestLine = l;
    });
    return { name: bestLine || '', qty: qty, price: price, rawText: text, source: source };
  }

  /** @param {Object} obj @param {string} [source] @returns {{ name: string, qty: number|null, price: number|null, rawText: string, source: string|undefined }} */
  function parsePurchaseJson(obj, source) {
    return {
      name: (obj && obj.name) || '',
      qty: (obj && typeof obj.qty === 'number') ? obj.qty : null,
      price: (obj && typeof obj.price === 'number') ? obj.price : null,
      rawText: (obj && obj.rawText) || '',
      source: source,
    };
  }

  /** @param {string} value @returns {string} */
  function getKitchenRoutingLabel(value) {
    var normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'kitchen_1') return 'Bếp 1';
    if (normalized === 'kitchen_2') return 'Bếp 2';
    if (normalized === 'skip') return 'Không qua bếp';
    return 'Cả 2 bếp';
  }

  /** @returns {function(string): string} */
  function _resolveNormalizeViKey() {
    if (typeof _global.normalizeViKey === 'function') return _global.normalizeViKey;
    if (_global.XekhoApp && _global.XekhoApp.order && typeof _global.XekhoApp.order.normalizeViKey === 'function') return _global.XekhoApp.order.normalizeViKey;
    return function (t) { return String(t || '').toLowerCase().replace(/\s+/g, ' ').trim(); };
  }

  /** @param {string} a @param {string} b @returns {number} */
  function tokenSimilarity(a, b) {
    var nvk = _resolveNormalizeViKey();
    var ta = new Set(nvk(a).split(' ').filter(Boolean));
    var tb = new Set(nvk(b).split(' ').filter(Boolean));
    if (!ta.size || !tb.size) return 0;
    var common = 0;
    ta.forEach(function (x) { if (tb.has(x)) common += 1; });
    return common / Math.max(ta.size, tb.size);
  }

  /** @param {Object} item @returns {string} */
  function getMenuItemImageUrl(item) {
    return String(
      (item && (item.image_url || item.imageUrl || item.photoUrl || item.thumbnail || item.photo)) || ''
    ).trim();
  }

  XekhoApp.utils.parser = {
    parsePurchaseText: parsePurchaseText,
    parsePurchaseJson: parsePurchaseJson,
    getKitchenRoutingLabel: getKitchenRoutingLabel,
    tokenSimilarity: tokenSimilarity,
    getMenuItemImageUrl: getMenuItemImageUrl,
  };
})(typeof window !== 'undefined' ? window : globalThis);
