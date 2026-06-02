'use strict';

const vm = require('vm');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '..', 'app', 'utils', 'storage.js'), 'utf-8');

let lastFetchOpts = null;
const sandbox = {
  window: { XekhoApp: {} },
  localStorage: {
    _store: {},
    get length() { return Object.keys(this._store).length; },
    key(i) { return Object.keys(this._store)[i] || null; },
    getItem(k) { return this._store[k] || null; },
    setItem(k, v) { this._store[k] = String(v); },
  },
  FileReader: class FileReader {
    constructor() { this.onload = null; this.onerror = null; }
    readAsDataURL(blob) { setTimeout(() => { if (this.onload) this.onload({ target: { result: 'data:application/octet-stream;base64,dGVzdA==' } }); }, 0); }
  },
  fetch: async function (url, opts) {
    lastFetchOpts = { url, opts };
    return {
      ok: true,
      text: async () => JSON.stringify({ success: true, fileId: 'test123' }),
    };
  },
  console: console,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
new vm.Script(src, { filename: 'storage.js' }).runInContext(sandbox);

const exported = sandbox.window.XekhoApp.utils.storage;
const expected = ['formatBytes', 'getLocalStorageUsageBytes', 'blobToBase64', 'normalizeGoogleScriptWebAppUrl', 'isGoogleAppsScriptWebAppUrl', 'uploadFileToGoogleDriveByEndpoint', 'getTelegramReportTestUrl'];

const missing = expected.filter(fn => typeof exported[fn] !== 'function');
if (missing.length) {
  console.error('FAIL: Missing exports:', missing);
  process.exit(1);
}

// formatBytes
if (exported.formatBytes(1024 * 1024) !== '1.0 MB') {
  console.error('FAIL: formatBytes(1MB) wrong:', exported.formatBytes(1024 * 1024));
  process.exit(1);
}
if (!exported.formatBytes(1024 * 1024 * 1024).includes('GB')) {
  console.error('FAIL: formatBytes(1GB) wrong');
  process.exit(1);
}

// getLocalStorageUsageBytes
const usage = exported.getLocalStorageUsageBytes();
if (typeof usage !== 'number' || usage < 0) {
  console.error('FAIL: getLocalStorageUsageBytes wrong:', usage);
  process.exit(1);
}

// normalizeGoogleScriptWebAppUrl
if (exported.normalizeGoogleScriptWebAppUrl('') !== '') {
  console.error('FAIL: empty url should return empty');
  process.exit(1);
}
if (exported.normalizeGoogleScriptWebAppUrl('https://script.google.com/macros/s/abc/exec/') !== 'https://script.google.com/macros/s/abc/exec') {
  console.error('FAIL: should strip trailing slash');
  process.exit(1);
}

// isGoogleAppsScriptWebAppUrl
if (!exported.isGoogleAppsScriptWebAppUrl('https://script.google.com/macros/s/ABC123/exec')) {
  console.error('FAIL: should detect GAS url');
  process.exit(1);
}
if (exported.isGoogleAppsScriptWebAppUrl('https://example.com')) {
  console.error('FAIL: should not match non-GAS url');
  process.exit(1);
}

// getTelegramReportTestUrl
if (exported.getTelegramReportTestUrl() !== 'https://asia-southeast1-pos-v2-909ff.cloudfunctions.net/testDailyReportTelegram') {
  console.error('FAIL: getTelegramReportTestUrl should return Cloud Function URL');
  process.exit(1);
}

// uploadFileToGoogleDriveByEndpoint — basic test
(async function () {
  try {
    const fakeBlob = { size: 4 };
    const result = await exported.uploadFileToGoogleDriveByEndpoint({
      uploadUrl: 'https://script.google.com/macros/s/TEST/exec',
      folderId: 'folder123',
      filename: 'test.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      blob: fakeBlob,
    });
    if (!result || !result.data) {
      console.error('FAIL: uploadFileToGoogleDriveByEndpoint should return result with data');
      process.exit(1);
    }
    if (!lastFetchOpts || lastFetchOpts.url !== 'https://script.google.com/macros/s/TEST/exec') {
      console.error('FAIL: fetch was not called with correct URL');
      process.exit(1);
    }
    const body = JSON.parse(lastFetchOpts.opts.body);
    if (body.filename !== 'test.xlsx' || body.folderId !== 'folder123') {
      console.error('FAIL: payload mismatch');
      process.exit(1);
    }
    console.log('\u2705 uploadFileToGoogleDriveByEndpoint test passed');
  } catch (err) {
    console.error('FAIL: uploadFileToGoogleDriveByEndpoint threw:', err.message);
    process.exit(1);
  }

  console.log('\u2705 verify-storage-utils Sprint 8.1 verification passed');
  console.log('   ' + expected.length + ' functions exported');
})();
