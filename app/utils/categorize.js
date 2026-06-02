(function (global) {
  'use strict';
  var XekhoApp = global.XekhoApp = global.XekhoApp || {};
  XekhoApp.utils = XekhoApp.utils || {};

  function _resolveRepairVietnameseText() {
    if (typeof global.repairVietnameseText === 'function') return global.repairVietnameseText;
    if (global.XekhoApp && global.XekhoApp.ui && typeof global.XekhoApp.ui.repairVietnameseText === 'function') return global.XekhoApp.ui.repairVietnameseText;
    return function (t) { return String(t || ''); };
  }

  function _resolveNormalizeViKey() {
    if (typeof global.normalizeViKey === 'function') return global.normalizeViKey;
    if (global.XekhoApp && global.XekhoApp.order && typeof global.XekhoApp.order.normalizeViKey === 'function') return global.XekhoApp.order.normalizeViKey;
    return function (t) { return String(t || '').toLowerCase().replace(/\s+/g, ' ').trim(); };
  }

  function normalizeExpenseCategoryLabel(input) {
    var rvt = _resolveRepairVietnameseText();
    var nvk = _resolveNormalizeViKey();
    var raw = rvt(input || '').trim();
    var key = nvk(raw);
    if (!key) return 'Chi phí khác';

    if (key.includes('nguyen lieu')) return 'Chi phí nguyên liệu';
    if (key.includes('kiem ke') || /ki\s?m\s?k|kiem\s?k|kiemke/.test(key)) return 'Lãi/Lỗ do kiểm kê';
    if (key.includes('chenh lech ca')) return 'Chênh lệch ca';
    if (key.includes('nhap hang') || /nh[ p]\s?h[ ng]|nhap\s?h[ ng]|nh[ p]\s?hang/.test(key)) return 'Nhập hàng';
    if (key.includes('nhan su') || /nh[ n]\s?s/.test(key)) return 'Chi phí nhân sự';
    if (key.includes('marketing')) return 'Chi phí marketing';
    if (key.includes('van chuyen') || key.includes('giao hang')) return 'Chi phí vận chuyển';
    if (key.includes('dien nuoc')) return 'Chi phí điện nước';
    if (key.includes('mat bang')) return 'Chi phí mặt bằng';
    if (key.includes('nhap so') || /nh[ p]\s?s/.test(key)) return 'Chi phí nhập sổ';
    if (key.includes('hao hut')) return 'Chi phí hao hụt';
    if (key.includes('khac')) return 'Chi phí khác';

    return raw;
  }

  function detectAdsExpensePlatform(expense) {
    expense = expense || {};
    var rvt = _resolveRepairVietnameseText();
    var nvk = _resolveNormalizeViKey();
    var raw = (expense.name || '') + ' ' + (expense.category || '');
    var key = nvk(rvt(raw));
    if (!key) return '';
    if (key.includes('facebook') || key.includes('meta')) return 'facebook';
    if (key.includes('tiktok')) return 'tiktok';
    return '';
  }

  function isAdsExpenseEntry(expense) {
    expense = expense || {};
    var rvt = _resolveRepairVietnameseText();
    var nvk = _resolveNormalizeViKey();
    var raw = (expense.name || '') + ' ' + (expense.category || '');
    var key = nvk(rvt(raw));
    if (!key) return false;
    return key.includes('facebook')
      || key.includes('meta')
      || key.includes('tiktok')
      || key.includes('ads')
      || key.includes('quang cao')
      || key.includes('marketing');
  }

  function mediaRefineryStatusClass(status) {
    var s = String(status || '').toUpperCase();
    if (['PUBLISH_READY', 'HERO_ASSET', 'TAGGED', 'REFINED'].indexOf(s) !== -1) return 'success';
    if (s === 'REJECTED') return 'danger';
    if (s === 'NEEDS_MANUAL_REVIEW') return 'warning';
    return 'info';
  }

  function countInclusiveReportDays(fromDate, toDate) {
    var start = new Date(String(fromDate || '').trim() + 'T00:00:00');
    var end = new Date(String(toDate || '').trim() + 'T00:00:00');
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
    return Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
  }

  XekhoApp.utils.categorize = {
    normalizeExpenseCategoryLabel: normalizeExpenseCategoryLabel,
    detectAdsExpensePlatform: detectAdsExpensePlatform,
    isAdsExpenseEntry: isAdsExpenseEntry,
    mediaRefineryStatusClass: mediaRefineryStatusClass,
    countInclusiveReportDays: countInclusiveReportDays,
  };
})(typeof window !== 'undefined' ? window : globalThis);
