// @ts-check
(function (global) {
  'use strict';

  /** @type {any} */
  const root = global || {};
  const XekhoApp = root.XekhoApp = root.XekhoApp || {};
  XekhoApp.utils = XekhoApp.utils || {};

  /** @param {*} value @param {number} [fallback] @returns {number} */
  function toFiniteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  /** @param {*} value @returns {string} */
  function compactNumber(value) {
    const number = toFiniteNumber(value);
    if (number >= 1000000) return (number / 1000000).toFixed(1) + 'M';
    if (number >= 1000) return (number / 1000).toFixed(0) + 'K';
    return number.toLocaleString('vi-VN');
  }

  /** @param {*} value @param {string} [suffix] @returns {string} */
  function currency(value, suffix = 'đ') {
    return toFiniteNumber(value).toLocaleString('vi-VN') + suffix;
  }

  /** @param {*} value @returns {string} */
  function date(value) {
    const dt = new Date(value);
    return dt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  /** @param {*} value @returns {string} */
  function time(value) {
    return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  /** @param {*} value @returns {string} */
  function dateTime(value) {
    return `${date(value)} ${time(value)}`;
  }

  /** @returns {string} */
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
