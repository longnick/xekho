'use strict';

const vm = require('vm');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '..', 'app', 'utils', 'storage.js'), 'utf-8');
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
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
new vm.Script(src, { filename: 'storage.js' }).runInContext(sandbox);

const exported = sandbox.window.XekhoApp.utils.storage;
const expected = ['formatBytes', 'getLocalStorageUsageBytes', 'blobToBase64', 'normalizeGoogleScriptWebAppUrl', 'isGoogleAppsScriptWebAppUrl'];

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

console.log('\u2705 verify-storage-utils Sprint 5.2 verification passed');
console.log('   ' + expected.length + ' functions exported');
