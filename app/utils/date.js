// @ts-check
(function (global) {
  'use strict';
  /** @type {any} */
  var _global = global;
  /** @type {any} */
  var XekhoApp = _global.XekhoApp = _global.XekhoApp || {};
  XekhoApp.utils = XekhoApp.utils || {};

  /** @param {Date|string|number} date @returns {string} */
  function formatLocalDateKey(date) {
    var value = new Date(date);
    var year = value.getFullYear();
    var month = String(value.getMonth() + 1).padStart(2, '0');
    var day = String(value.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  /** @param {Date|string|number} d @returns {string} */
  function getWeekStartKey(d) {
    var x = new Date(d);
    x.setHours(0, 0, 0, 0);
    var diff = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - diff);
    return x.toISOString().slice(0, 10);
  }

  /** @param {'today'|'day'|'week'|'month'|'year'|'range'} period @param {{ date?: string, singleDate?: string, fromDate?: string, toDate?: string }} [opts] @returns {{ fromDate: string, toDate: string }|null} */
  function resolvePeriodDateRangePure(period, opts) {
    opts = opts || {};
    var now = new Date();

    if (period === 'today') {
      var dateKey = formatLocalDateKey(now);
      return { fromDate: dateKey, toDate: dateKey };
    }

    if (period === 'day') {
      var singleDate = (opts.date || opts.singleDate);
      if (singleDate) {
        return { fromDate: String(singleDate), toDate: String(singleDate) };
      }
    }

    if (period === 'range' && opts.fromDate && opts.toDate) {
      return { fromDate: String(opts.fromDate), toDate: String(opts.toDate) };
    }

    if (period === 'week') {
      var end = new Date(now);
      end.setHours(0, 0, 0, 0);
      var start = new Date(end);
      start.setDate(start.getDate() - 6);
      return { fromDate: formatLocalDateKey(start), toDate: formatLocalDateKey(end) };
    }

    if (period === 'month') {
      var mStart = new Date(now.getFullYear(), now.getMonth(), 1);
      var mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { fromDate: formatLocalDateKey(mStart), toDate: formatLocalDateKey(mEnd) };
    }

    if (period === 'year') {
      var yStart = new Date(now.getFullYear(), 0, 1);
      var yEnd = new Date(now.getFullYear(), 11, 31);
      return { fromDate: formatLocalDateKey(yStart), toDate: formatLocalDateKey(yEnd) };
    }

    return null;
  }

  XekhoApp.utils.date = {
    formatLocalDateKey: formatLocalDateKey,
    getWeekStartKey: getWeekStartKey,
    resolvePeriodDateRangePure: resolvePeriodDateRangePure,
  };

  if (typeof global.formatLocalDateKey !== 'function') global.formatLocalDateKey = formatLocalDateKey;
  if (typeof global.getWeekStartKey !== 'function') global.getWeekStartKey = getWeekStartKey;

})(typeof window !== 'undefined' ? window : globalThis);
