// @ts-check
(function (global) {
  'use strict';
  /** @type {any} */
  var _global = global;
  /** @type {any} */
  var XekhoApp = _global.XekhoApp = _global.XekhoApp || {};
  XekhoApp.utils = XekhoApp.utils || {};

  /** @param {number} bytes @returns {string} */
  function formatBytes(bytes) {
    var mb = bytes / (1024 * 1024);
    if (mb < 1024) return mb.toFixed(1) + ' MB';
    return (mb / 1024).toFixed(2) + ' GB';
  }

  /** @returns {number} */
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

  /** @param {Blob} blob @returns {Promise<string>} */
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

  /** @param {string} raw @returns {string} */
  function normalizeGoogleScriptWebAppUrl(raw) {
    var u = String(raw || '').trim();
    if (!u) return '';
    u = u.replace(/\s+/g, '');
    if (/\/usercodeapp\.app$/i.test(u) || /script\.googleusercontent\.com/i.test(u)) {
      return u;
    }
    return u.replace(/\/$/, '');
  }

  /** @param {string} u @returns {boolean} */
  function isGoogleAppsScriptWebAppUrl(u) {
    if (!u) return false;
    return /script\.google\.com\/macros\/s\//i.test(u)
      || /script\.googleusercontent\.com\/macros\/exec/i.test(u);
  }

  /** @param {{ uploadUrl: string, folderId?: string, filename: string, mimeType: string, blob: Blob }} opts @returns {Promise<{ data?: Object, opaque?: boolean }>} */
  async function uploadFileToGoogleDriveByEndpoint(opts) {
    var uploadUrl = opts.uploadUrl;
    var folderId = opts.folderId;
    var filename = opts.filename;
    var mimeType = opts.mimeType;
    var blob = opts.blob;

    var url = normalizeGoogleScriptWebAppUrl(uploadUrl);
    if (!url) {
      throw new Error('Thi\u1ebfu URL Web App.');
    }
    if (!/^https:\/\//i.test(url)) {
      throw new Error('URL Web App ph\u1ea3i d\u00f9ng https://');
    }
    if (/\/dev($|\?)/i.test(url)) {
      throw new Error('Kh\u00f4ng d\u00f9ng URL /dev. H\u00e3y tri\u1ec3n khai Web App v\u00e0 d\u00f9ng URL k\u1ebft th\u00fac /exec (ho\u1eb7c URL tri\u1ec3n khai \u0111\u1ea7y \u0111\u1ee7 Google cung c\u1ea5p).');
    }

    var base64Data = await blobToBase64(blob);
    var payload = { filename: filename, mimeType: mimeType, base64Data: base64Data, folderId: folderId };
    var body = JSON.stringify(payload);

    var readResponse = async function (res) {
      var text = await res.text();
      if (!text) return null;
      try {
        return JSON.parse(text);
      } catch (_) {
        return { _raw: text };
      }
    };

    var assertOk = function (data, res) {
      if (data && data.success === false) {
        throw new Error(data.message || data.error || 'Google Drive t\u1eeb ch\u1ed1i l\u01b0u file.');
      }
      if (!res.ok) {
        var msg = (data && (data.message || data.error)) ? (data.message || data.error) : 'HTTP ' + res.status;
        throw new Error(msg);
      }
    };

    var postCorsPlain = async function (contentType) {
      var res = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        redirect: 'follow',
        cache: 'no-store',
        credentials: 'omit',
        headers: { 'Content-Type': contentType },
        body: body,
      });
      var data = await readResponse(res);
      assertOk(data, res);
      return { data: data, opaque: false };
    };

    var tryNoCorsPlain = async function () {
      var cts = ['text/plain;charset=UTF-8', 'text/plain'];
      for (var i = 0; i < cts.length; i++) {
        try {
          await fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            redirect: 'follow',
            cache: 'no-store',
            credentials: 'omit',
            headers: { 'Content-Type': cts[i] },
            body: body,
          });
          return { opaque: true };
        } catch (e) {
          /* th\u1eed Content-Type kh\u00e1c */
        }
      }
      throw new Error('Kh\u00f4ng g\u1eedi \u0111\u01b0\u1ee3c t\u1edbi Web App (ki\u1ec3m tra m\u1ea1ng ho\u1eb7c URL).');
    };

    var isNetErr = function (err) {
      var msg = String(err && err.message != null ? err.message : err);
      return !!(err && (err.name === 'TypeError' || /Failed to fetch|NetworkError|network error|Load failed|aborted/i.test(msg)));
    };

    var lastNet = null;
    var cts = ['text/plain;charset=UTF-8', 'text/plain'];
    for (var i = 0; i < cts.length; i++) {
      try {
        return await postCorsPlain(cts[i]);
      } catch (err) {
        if (!isNetErr(err)) throw err;
        lastNet = err;
        console.warn('[Drive] L\u1ed7i m\u1ea1ng/CORS v\u1edbi Content-Type', cts[i], err);
      }
    }

    if (!isGoogleAppsScriptWebAppUrl(url)) {
      throw new Error('Failed to fetch \u0111\u1edbi URL ph\u1ea3i l\u00e0 Web App Google (d\u1ea1ng script.google.com/.../exec). Ki\u1ec3m tra HTTPS, m\u1ea1ng, ho\u1eb7c t\u1eaft extension ch\u1eb7n script.google.com.');
    }

    console.warn('[Drive] Chuy\u1ec3n sang no-cors (ch\u1ec9 ph\u00f9 h\u1ee3p v\u1edbi Web App Google):', lastNet);
    return tryNoCorsPlain();
  }

  /** @returns {string} */
  function getTelegramReportTestUrl() {
    return 'https://asia-southeast1-pos-v2-909ff.cloudfunctions.net/testDailyReportTelegram';
  }

  XekhoApp.utils.storage = {
    formatBytes: formatBytes,
    getLocalStorageUsageBytes: getLocalStorageUsageBytes,
    blobToBase64: blobToBase64,
    normalizeGoogleScriptWebAppUrl: normalizeGoogleScriptWebAppUrl,
    isGoogleAppsScriptWebAppUrl: isGoogleAppsScriptWebAppUrl,
    uploadFileToGoogleDriveByEndpoint: uploadFileToGoogleDriveByEndpoint,
    getTelegramReportTestUrl: getTelegramReportTestUrl,
  };

  if (typeof global.formatBytes !== 'function') global.formatBytes = formatBytes;
  if (typeof global.getLocalStorageUsageBytes !== 'function') global.getLocalStorageUsageBytes = getLocalStorageUsageBytes;
  if (typeof global.blobToBase64 !== 'function') global.blobToBase64 = blobToBase64;
  if (typeof global.normalizeGoogleScriptWebAppUrl !== 'function') global.normalizeGoogleScriptWebAppUrl = normalizeGoogleScriptWebAppUrl;
  if (typeof global.isGoogleAppsScriptWebAppUrl !== 'function') global.isGoogleAppsScriptWebAppUrl = isGoogleAppsScriptWebAppUrl;
  if (typeof global.uploadFileToGoogleDriveByEndpoint !== 'function') global.uploadFileToGoogleDriveByEndpoint = uploadFileToGoogleDriveByEndpoint;
  if (typeof global.getTelegramReportTestUrl !== 'function') global.getTelegramReportTestUrl = getTelegramReportTestUrl;

})(typeof window !== 'undefined' ? window : globalThis);
