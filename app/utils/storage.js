(function (global) {
  'use strict';
  var XekhoApp = global.XekhoApp = global.XekhoApp || {};
  XekhoApp.utils = XekhoApp.utils || {};

  function formatBytes(bytes) {
    var mb = bytes / (1024 * 1024);
    if (mb < 1024) return mb.toFixed(1) + ' MB';
    return (mb / 1024).toFixed(2) + ' GB';
  }

  function getLocalStorageUsageBytes() {
    try {
      var total = 0;
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i) || '';
        var val = localStorage.getItem(key) || '';
        total += (key.length + val.length) * 2;
      }
      return total;
    } catch (_) {
      return 0;
    }
  }

  async function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var dataUrl = reader.result || '';
        var base64 = dataUrl.toString().split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = function () { reject(new Error('Kh\u00f4ng \u0111\u1ecdc \u0111\u01b0\u1ee3c file \u0111\u1ec3 upload.')); };
      reader.readAsDataURL(blob);
    });
  }

  function normalizeGoogleScriptWebAppUrl(raw) {
    var u = String(raw || '').trim();
    if (!u) return '';
    u = u.replace(/\s+/g, '');
    if (/\/usercodeapp\.app$/i.test(u) || /script\.googleusercontent\.com/i.test(u)) {
      return u;
    }
    return u.replace(/\/$/, '');
  }

  function isGoogleAppsScriptWebAppUrl(u) {
    if (!u) return false;
    return /script\.google\.com\/macros\/s\//i.test(u)
      || /script\.googleusercontent\.com\/macros\/exec/i.test(u);
  }

  XekhoApp.utils.storage = {
    formatBytes: formatBytes,
    getLocalStorageUsageBytes: getLocalStorageUsageBytes,
    blobToBase64: blobToBase64,
    normalizeGoogleScriptWebAppUrl: normalizeGoogleScriptWebAppUrl,
    isGoogleAppsScriptWebAppUrl: isGoogleAppsScriptWebAppUrl,
  };

  if (typeof global.formatBytes !== 'function') global.formatBytes = formatBytes;
  if (typeof global.getLocalStorageUsageBytes !== 'function') global.getLocalStorageUsageBytes = getLocalStorageUsageBytes;
  if (typeof global.blobToBase64 !== 'function') global.blobToBase64 = blobToBase64;
  if (typeof global.normalizeGoogleScriptWebAppUrl !== 'function') global.normalizeGoogleScriptWebAppUrl = normalizeGoogleScriptWebAppUrl;
  if (typeof global.isGoogleAppsScriptWebAppUrl !== 'function') global.isGoogleAppsScriptWebAppUrl = isGoogleAppsScriptWebAppUrl;

})(typeof window !== 'undefined' ? window : globalThis);
