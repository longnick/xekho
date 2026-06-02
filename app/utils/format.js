(function (global) {
  'use strict';

  const root = global || {};
  const XekhoApp = root.XekhoApp = root.XekhoApp || {};
  XekhoApp.utils = XekhoApp.utils || {};

  function toFiniteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function compactNumber(value) {
    const number = toFiniteNumber(value);
    if (number >= 1000000) return (number / 1000000).toFixed(1) + 'M';
    if (number >= 1000) return (number / 1000).toFixed(0) + 'K';
    return number.toLocaleString('vi-VN');
  }

  function currency(value, suffix = 'đ') {
    return toFiniteNumber(value).toLocaleString('vi-VN') + suffix;
  }

  function date(value) {
    const dt = new Date(value);
    return dt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function time(value) {
    return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  function dateTime(value) {
    return `${date(value)} ${time(value)}`;
  }

  function todayKey() {
    return new Date().toISOString().split('T')[0];
  }

  XekhoApp.utils.format = Object.assign({}, XekhoApp.utils.format, {
    toFiniteNumber,
    compactNumber,
    currency,
    date,
    time,
    dateTime,
    todayKey,
  });
})(typeof window !== 'undefined' ? window : globalThis);
