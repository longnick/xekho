// @ts-check
/**
 * ESM facade for the existing classic `app/utils/format.js` helpers.
 * Future ESM consumers can import these functions directly while the installer
 * preserves `window.XekhoApp.utils.format.*` and legacy formatter globals.
 */

/** @param {*} value @param {number} [fallback] @returns {number} */
export function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

/** @param {*} value @returns {string} */
export function compactNumber(value) {
  const number = toFiniteNumber(value);
  if (number >= 1000000) return (number / 1000000).toFixed(1) + 'M';
  if (number >= 1000) return (number / 1000).toFixed(0) + 'K';
  return number.toLocaleString('vi-VN');
}

/** @param {*} value @param {string} [suffix] @returns {string} */
export function currency(value, suffix = 'đ') {
  return toFiniteNumber(value).toLocaleString('vi-VN') + suffix;
}

/** @param {*} value @returns {string} */
export function date(value) {
  const dt = new Date(value);
  return dt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** @param {*} value @returns {string} */
export function time(value) {
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

/** @param {*} value @returns {string} */
export function dateTime(value) {
  return date(value) + ' ' + time(value);
}

/** @returns {string} */
export function todayKey() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Install/refresh the classic global namespace and legacy formatter globals.
 * @param {any} [globalScope]
 * @returns {{ toFiniteNumber: Function, compactNumber: Function, currency: Function, date: Function, time: Function, dateTime: Function, todayKey: Function }}
 */
export function installGlobalFormatUtils(globalScope) {
  /** @type {any} */
  var root = globalScope || (typeof window !== 'undefined' ? window : globalThis);
  /** @type {any} */
  var XekhoApp = root.XekhoApp = root.XekhoApp || {};
  XekhoApp.utils = XekhoApp.utils || {};
  XekhoApp.utils.format = Object.assign({}, XekhoApp.utils.format, {
    toFiniteNumber: toFiniteNumber,
    compactNumber: compactNumber,
    currency: currency,
    date: date,
    time: time,
    dateTime: dateTime,
    todayKey: todayKey,
  });

  if (typeof root.fmt !== 'function') root.fmt = compactNumber;
  if (typeof root.fmtFull !== 'function') root.fmtFull = currency;
  if (typeof root.fmtDate !== 'function') root.fmtDate = date;
  if (typeof root.fmtTime !== 'function') root.fmtTime = time;
  if (typeof root.fmtDateTime !== 'function') root.fmtDateTime = dateTime;
  if (typeof root.today !== 'function') root.today = todayKey;

  return XekhoApp.utils.format;
}
