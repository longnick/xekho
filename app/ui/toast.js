/**
 * Sprint 1.3: Toast notification UI extracted from app.js
 *
 * Provides XekhoApp.ui.toast and repairVietnameseText via IIFE/global namespace.
 * Loaded before app.js so showToast() is available everywhere.
 */
// @ts-check
(function (global) {
  'use strict';

  /** @type {any} */
  var _global = global;
  /** @type {any} */
  var XekhoApp = _global.XekhoApp = _global.XekhoApp || {};
  XekhoApp.ui = XekhoApp.ui || {};

  // ── repairVietnameseText (shared helper) ──────────────────────────────
  /** @type {string[]} */
  var BAD_TOKENS = ['\uFFFD', 'Ã', 'Â', 'Ä\u0091', 'Æ°', 'â€™', 'â€œ', 'â€', 'ðŸ'];

  /** @param {*} input @returns {string} */
  function repairVietnameseText(input) {
    var str = String(input == null ? '' : input);
    if (!str) return str;

    // Chỉ sửa khi có dấu hiệu mojibake rõ ràng.
    if (BAD_TOKENS.some(function (t) { return str.indexOf(t) !== -1; })) {
      try { str = decodeURIComponent(escape(str)); } catch (_) {}
      try {
        var bytes = new Uint8Array(str.length);
        for (var i = 0; i < str.length; i++) {
          bytes[i] = str.charCodeAt(i) & 0xff;
        }
        str = new TextDecoder('utf-8').decode(bytes) || str;
      } catch (_) {}
    }
    return str;
  }

  // ── showToast ─────────────────────────────────────────────────────────
  /** @param {string} msg @param {'success'|'danger'|'warning'|'info'} [type] @param {number} [duration] @returns {void} */
  function showToast(msg, type, duration) {
    var toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.style.cssText = 'position:fixed;bottom:calc(var(--nav-height,70px) + env(safe-area-inset-bottom,0px) + 16px);left:50%;transform:translateX(-50%) translateY(20px);background:var(--card);color:var(--text);padding:10px 14px;border-radius:14px;font-size:13px;font-weight:600;z-index:999;opacity:0;transition:all 0.3s;white-space:normal;word-break:break-word;line-height:1.45;max-width:min(92vw,420px);text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.4);border:1px solid var(--border);';
      document.body.appendChild(toast);
    }
    // Clear previous auto-hide timer
    // @ts-ignore — custom property on toast element
    if (toast._hideTimer) clearTimeout(toast._hideTimer);
    toast.textContent = repairVietnameseText(msg);
    toast.style.borderColor = type === 'success' ? 'var(--success)'
      : type === 'danger' ? 'var(--danger)'
      : type === 'warning' ? 'var(--warning)'
      : 'var(--border)';
    requestAnimationFrame(function () {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });
    var ms = (typeof duration === 'number' && duration > 0) ? duration : 2500;
    // @ts-ignore — custom property on toast element
    toast._hideTimer = setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
    }, ms);
  }

  // ── Export ────────────────────────────────────────────────────────────
  XekhoApp.ui.toast = showToast;
  XekhoApp.ui.repairVietnameseText = repairVietnameseText;

  // Global compat: expose as window globals for code not yet migrated
  if (typeof global.showToast !== 'function') {
    global.showToast = showToast;
  }
  if (typeof global.repairVietnameseText !== 'function') {
    global.repairVietnameseText = repairVietnameseText;
  }

})(typeof window !== 'undefined' ? window : globalThis);
