// @ts-check
(function (global) {
  'use strict';
  /** @type {any} */
  var XekhoApp = global.XekhoApp = global.XekhoApp || {};
  XekhoApp.report = XekhoApp.report || {};

  function _resolveFmt() {
    if (typeof global.fmt === 'function') return global.fmt;
    if (global.XekhoApp && global.XekhoApp.utils && global.XekhoApp.utils.format && typeof global.XekhoApp.utils.format.compactNumber === 'function') return global.XekhoApp.utils.format.compactNumber;
    return function (n) { return String(n); };
  }
  function _resolveRepairVietnameseText() {
    if (global.XekhoApp && global.XekhoApp.ui && typeof global.XekhoApp.ui.repairVietnameseText === 'function') return global.XekhoApp.ui.repairVietnameseText;
    if (typeof global.repairVietnameseText === 'function') return global.repairVietnameseText;
    return function (t) { return String(t || ''); };
  }
  function _resolveNormalizeExpenseCategoryLabel() {
    if (global.XekhoApp && global.XekhoApp.utils && global.XekhoApp.utils.categorize && typeof global.XekhoApp.utils.categorize.normalizeExpenseCategoryLabel === 'function') return global.XekhoApp.utils.categorize.normalizeExpenseCategoryLabel;
    if (typeof global.normalizeExpenseCategoryLabel === 'function') return global.normalizeExpenseCategoryLabel;
    return function (t) { return String(t || ''); };
  }
  function _resolveResolvePeriodDateRange() {
    if (global.XekhoApp && global.XekhoApp.utils && global.XekhoApp.utils.date && typeof global.XekhoApp.utils.date.resolvePeriodDateRangePure === 'function') return global.XekhoApp.utils.date.resolvePeriodDateRangePure;
    if (typeof global.resolvePeriodDateRange === 'function') return global.resolvePeriodDateRange;
    return function () { return { fromDate: '', toDate: '' }; };
  }
  function _resolveGetFixedCostProfileForReports() {
    if (global.XekhoApp && global.XekhoApp.utils && global.XekhoApp.utils.fixedcost && typeof global.XekhoApp.utils.fixedcost.getFixedCostProfileForReports === 'function') return global.XekhoApp.utils.fixedcost.getFixedCostProfileForReports;
    if (typeof global.getFixedCostProfileForReports === 'function') return global.getFixedCostProfileForReports;
    return function () { return {}; };
  }
  function _resolveCountInclusiveReportDays() {
    if (global.XekhoApp && global.XekhoApp.utils && global.XekhoApp.utils.categorize && typeof global.XekhoApp.utils.categorize.countInclusiveReportDays === 'function') return global.XekhoApp.utils.categorize.countInclusiveReportDays;
    if (typeof global.countInclusiveReportDays === 'function') return global.countInclusiveReportDays;
    return function () { return 0; };
  }
  function _resolveFilterPurchases() {
    if (typeof global.filterPurchases === 'function') return global.filterPurchases;
    return function () { return []; };
  }
  function _resolveFilterExpenses() {
    if (typeof global.filterExpenses === 'function') return global.filterExpenses;
    return function () { return []; };
  }
  function _resolveGetFilteredReportPurchases() {
    if (typeof global.getFilteredReportPurchases === 'function') return global.getFilteredReportPurchases;
    return function () { return []; };
  }
  function _resolveGetFilteredReportExpenses() {
    if (typeof global.getFilteredReportExpenses === 'function') return global.getFilteredReportExpenses;
    return function () { return []; };
  }
  function _resolveNormalizePositiveAmount() {
    if (typeof global.normalizePositiveAmount === 'function') return global.normalizePositiveAmount;
    return function (n) { return Math.max(0, Number(n) || 0); };
  }
  function _resolveUid() {
    if (typeof global.uid === 'function') return global.uid;
    return function () { return 'uid_' + Math.random().toString(36).slice(2, 10); };
  }

  function buildOperationalExpenseBreakdown(period, opts, options) {
    if (!opts) opts = {};
    if (!options) options = {};
    var includeFixedCost = options.includeFixedCost !== false;
    var ignoreMenuFilter = options.ignoreMenuFilter !== false;
    var filterPurchases = _resolveFilterPurchases();
    var filterExpenses = _resolveFilterExpenses();
    var getFilteredReportPurchases = _resolveGetFilteredReportPurchases();
    var getFilteredReportExpenses = _resolveGetFilteredReportExpenses();
    var normalizePositiveAmount = _resolveNormalizePositiveAmount();
    var uid = _resolveUid();
    var fmt = _resolveFmt();
    var repairVietnameseText = _resolveRepairVietnameseText();
    var normalizeExpenseCategoryLabel = _resolveNormalizeExpenseCategoryLabel();
    var resolvePeriodDateRange = _resolveResolvePeriodDateRange();
    var getFixedCostProfileForReports = _resolveGetFixedCostProfileForReports();
    var countInclusiveReportDays = _resolveCountInclusiveReportDays();

    var purchases = ignoreMenuFilter ? filterPurchases(period, opts) : getFilteredReportPurchases();
    var expenses = ignoreMenuFilter ? filterExpenses(period, opts) : getFilteredReportExpenses();

    var purchaseRows = purchases.map(function (p) {
      return {
        type: 'purchase',
        id: p.id || uid(),
        name: p.name,
        category: 'Chi ph\u00ed nguy\u00ean li\u1ec7u',
        date: p.date,
        amount: normalizePositiveAmount(p.price),
        qty: Number(p.qty) || 0,
        unit: p.unit || '',
        supplier: p.supplier || '',
        note: fmt(Number(p.qty) || 0) + ' ' + repairVietnameseText(p.unit || '') + ' - ' + repairVietnameseText(p.supplier || ''),
      };
    }).filter(function (row) { return row.date && row.amount > 0; });

    var expenseRows = expenses.map(function (e) {
      return {
        type: 'expense',
        id: e.id || uid(),
        name: repairVietnameseText(e.name),
        category: normalizeExpenseCategoryLabel(e.category || 'Chi ph\u00ed kh\u00e1c'),
        date: e.date,
        amount: normalizePositiveAmount(e.amount),
        note: repairVietnameseText(e.category || ''),
      };
    }).filter(function (row) { return row.date && row.amount > 0; });

    var range = resolvePeriodDateRange(period, opts);
    var fixedCostProfile = getFixedCostProfileForReports();
    var reportDays = countInclusiveReportDays(range.fromDate, range.toDate);
    var fixedCostDaily = Number(fixedCostProfile.dailyFixedCost || 0) || 0;
    var fixedCostTotal = includeFixedCost ? fixedCostDaily * (Number(reportDays || 0) || 0) : 0;
    var managementSalaryTotal = includeFixedCost
      ? (Number(fixedCostProfile.dailyManagementSalary || 0) || 0) * (Number(reportDays || 0) || 0)
      : 0;
    var otherFixedCostTotal = Math.max(0, fixedCostTotal - managementSalaryTotal);
    var fixedCostRows = [];
    if (managementSalaryTotal > 0) {
      fixedCostRows.push({
        type: 'fixed_cost',
        id: 'management_salary_' + range.fromDate + '_' + range.toDate,
        name: 'L\u01b0\u1ee3ng qu\u1ea3n l\u00fd',
        category: 'L\u01b0\u1ee3ng qu\u1ea3n l\u00fd',
        date: range.toDate + 'T23:59:59',
        amount: managementSalaryTotal,
        note: fmt(reportDays) + ' ng\u00e0y x ' + fmt(fixedCostProfile.dailyManagementSalary || 0) + '\u0111/ng\u00e0y',
      });
    }
    if (otherFixedCostTotal > 0) {
      fixedCostRows.push({
        type: 'fixed_cost',
        id: 'fixed_cost_' + range.fromDate + '_' + range.toDate,
        name: 'Chi ph\u00ed c\u1ed1 \u0111\u1ecbnh',
        category: 'Chi ph\u00ed c\u1ed1 \u0111\u1ecbnh',
        date: range.toDate + 'T23:59:59',
        amount: otherFixedCostTotal,
        note: fmt(reportDays) + ' ng\u00e0y x ' + fmt(Math.max(0, fixedCostDaily - (Number(fixedCostProfile.dailyManagementSalary || 0) || 0))) + '\u0111/ng\u00e0y',
      });
    }

    var rows = purchaseRows.concat(expenseRows).concat(fixedCostRows)
      .sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    var sums = rows.reduce(function (acc, row) {
      acc[row.category] = (acc[row.category] || 0) + (Number(row.amount) || 0);
      return acc;
    }, {});

    var purchaseTotal = purchaseRows.reduce(function (sum, row) { return sum + (Number(row.amount) || 0); }, 0);
    var otherExpenseTotal = expenseRows.reduce(function (sum, row) { return sum + (Number(row.amount) || 0); }, 0);
    var total = purchaseTotal + otherExpenseTotal + fixedCostTotal;

    return {
      rows: rows,
      sums: sums,
      total: total,
      purchaseTotal: purchaseTotal,
      otherExpenseTotal: otherExpenseTotal,
      fixedCostTotal: fixedCostTotal,
      managementSalaryTotal: managementSalaryTotal,
      otherFixedCostTotal: otherFixedCostTotal,
      fixedCostDaily: fixedCostDaily,
      dailyManagementSalary: fixedCostProfile.dailyManagementSalary,
      fixedCostConfigured: fixedCostProfile.isConfigured,
      reportDays: reportDays,
      range: range,
    };
  }

  XekhoApp.report.buildOperationalExpenseBreakdown = buildOperationalExpenseBreakdown;
  if (typeof global.buildOperationalExpenseBreakdown !== 'function') {
    global.buildOperationalExpenseBreakdown = buildOperationalExpenseBreakdown;
  }

})(typeof window !== 'undefined' ? window : globalThis);
