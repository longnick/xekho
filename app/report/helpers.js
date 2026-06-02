// @ts-check
(function (global) {
  'use strict';
  /** @type {any} */
  var _global = global;
  /** @type {any} */
  var XekhoApp = _global.XekhoApp = _global.XekhoApp || {};

  /** @returns {function(string): string} */
  function _resolveNormalizeViKey() {
    if (typeof _global.normalizeViKey === 'function') return _global.normalizeViKey;
    if (_global.XekhoApp && _global.XekhoApp.order && typeof _global.XekhoApp.order.normalizeViKey === 'function') return _global.XekhoApp.order.normalizeViKey;
    return function (t) { return String(t || '').toLowerCase().replace(/\s+/g, ' ').trim(); };
  }

  /** @returns {function(string, string): number} */
  function _resolveTokenSimilarity() {
    if (_global.XekhoApp && _global.XekhoApp.utils && _global.XekhoApp.utils.parser && typeof _global.XekhoApp.utils.parser.tokenSimilarity === 'function') return _global.XekhoApp.utils.parser.tokenSimilarity;
    return function (a, b) { return String(a) === String(b) ? 1 : 0; };
  }

  /** @returns {function(): Object[]} */
  function _resolveGetInventory() {
    if (typeof _global._getInventory === 'function') return _global._getInventory;
    if (_global.Store && typeof _global.Store.getInventory === 'function') return _global.Store.getInventory;
    return function () { return []; };
  }

  /** @param {Object} menuItem @returns {string[]} */
  function getReportMenuIngredientKeys(menuItem) {
    if (!menuItem) return [];
    var nvk = _resolveNormalizeViKey();
    var inventory = _resolveGetInventory()();
    var ingredientNames = {};

    if (Array.isArray(menuItem.ingredients)) {
      menuItem.ingredients.forEach(function (ing) {
        var name = String(ing && ing.name || '').trim();
        if (name) ingredientNames[nvk(name)] = true;
      });
    }

    var ownName = String(menuItem.name || '').trim();
    if (ownName) ingredientNames[nvk(ownName)] = true;

    return Object.keys(ingredientNames).filter(Boolean);
  }

  /** @param {Object} order @param {Object|null} menuItem @returns {boolean} */
  function doesOrderMatchReportMenuItem(order, menuItem) {
    if (!menuItem) return true;
    var nvk = _resolveNormalizeViKey();
    var menuItemKey = nvk(menuItem.name);
    return (order.items || []).some(function (item) {
      if (String(item.id || '') === String(menuItem.id)) return true;
      return nvk(item.name) === menuItemKey;
    });
  }

  /** @param {Object} purchase @param {Object|null} menuItem @returns {boolean} */
  function doesPurchaseMatchReportMenuItem(purchase, menuItem) {
    if (!menuItem) return true;
    var nvk = _resolveNormalizeViKey();
    var ingredientKeys = getReportMenuIngredientKeys(menuItem);
    if (!ingredientKeys.length) return false;
    var purchaseKey = nvk(purchase && purchase.name || '');
    return ingredientKeys.indexOf(purchaseKey) !== -1;
  }

  /** @param {Object} expense @param {Object|null} menuItem @returns {boolean} */
  function doesExpenseMatchReportMenuItem(expense, menuItem) {
    if (!menuItem) return true;
    var nvk = _resolveNormalizeViKey();
    var ingredientKeys = getReportMenuIngredientKeys(menuItem);
    if (!ingredientKeys.length) return false;
    var haystack = nvk([
      expense && expense.name || '',
      expense && expense.note || '',
      expense && expense.category || '',
    ].join(' '));
    return ingredientKeys.some(function (key) { return key && haystack.includes(key); });
  }

  /** @returns {Array<{ id: string, source: Object, target: Object, score: number }>} */
  function getIngredientMergeSuggestions() {
    var nvk = _resolveNormalizeViKey();
    var ts = _resolveTokenSimilarity();
    var inv = _resolveGetInventory()().filter(function (i) { return !i.hidden && !i.mergedInto; });
    var suggestions = [];
    for (var i = 0; i < inv.length; i++) {
      for (var j = i + 1; j < inv.length; j++) {
        var a = inv[i];
        var b = inv[j];
        if (a.itemType !== b.itemType || a.unit !== b.unit) continue;
        var na = nvk(a.name);
        var nb = nvk(b.name);
        var score = na === nb ? 1 : (na.includes(nb) || nb.includes(na) ? 0.9 : ts(a.name, b.name));
        if (score < 0.72) continue;
        var target = a.qty >= b.qty ? a : b;
        var source = target.id === a.id ? b : a;
        if (suggestions.some(function (s) { return s.source.id === source.id || s.target.id === source.id; })) continue;
        suggestions.push({ id: 'merge_' + source.id + '_' + target.id, source: source, target: target, score: score });
      }
    }
    return suggestions.sort(function (a, b) { return b.score - a.score; });
  }

  /** @param {string} fromDate @param {string} toDate @returns {Object[]} */
  function getDailyRevenueSnapshotsInRange(fromDate, toDate) {
    /** @type {Object[]} */
    var rows = [];
    try { rows = _global.appState && Array.isArray(_global.appState.dailyRevenueSnapshots) ? _global.appState.dailyRevenueSnapshots : []; } catch (_e) { rows = []; }
    return rows.filter(function (snapshot) {
      var dateKey = String(snapshot && snapshot.date || '').trim().slice(0, 10);
      return !!dateKey && dateKey >= fromDate && dateKey <= toDate;
    });
  }

  XekhoApp.report = {
    getReportMenuIngredientKeys: getReportMenuIngredientKeys,
    doesOrderMatchReportMenuItem: doesOrderMatchReportMenuItem,
    doesPurchaseMatchReportMenuItem: doesPurchaseMatchReportMenuItem,
    doesExpenseMatchReportMenuItem: doesExpenseMatchReportMenuItem,
    getIngredientMergeSuggestions: getIngredientMergeSuggestions,
    getDailyRevenueSnapshotsInRange: getDailyRevenueSnapshotsInRange,
  };
})(typeof window !== 'undefined' ? window : globalThis);
