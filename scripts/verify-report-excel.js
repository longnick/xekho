'use strict';

const vm = require('vm');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '..', 'app', 'report', 'excel.js'), 'utf-8');

// Mock worksheet
function createMockWorksheet() {
  const rows = {};
  return {
    getRow(n) {
      if (!rows[n]) {
        rows[n] = {
          getCell(c) {
            if (!rows[n]['_' + c]) rows[n]['_' + c] = { value: null, alignment: {}, font: {} };
            return rows[n]['_' + c];
          }
        };
      }
      return rows[n];
    },
    mergeCells() {},
    set autoFilter(v) { this._autoFilter = v; },
    set columns(v) { this._columns = v; },
  };
}

const sandbox = {
  window: { XekhoApp: {} },
  document: {
    getElementById: function () { return null; },
    createElement: function () { return { href: '', download: '', click: function () {} }; },
  },
  URL: { createObjectURL: function () { return 'blob:test'; }, revokeObjectURL: function () {} },
  ExcelJS: {
    Workbook: class Workbook {
      constructor() { this.creator = ''; this._sheets = []; }
      addWorksheet(name) {
        const ws = createMockWorksheet();
        this._sheets.push({ name, ws });
        return ws;
      }
      get xlsx() {
        return { writeBuffer: async () => new Uint8Array(10) };
      }
    }
  },
  Store: {
    getSettings: function () { return { taxRate: 10, autoUploadToGoogleDrive: false }; },
    getPurchases: function () { return []; },
    getInventory: function () { return []; },
  },
  filterHistory: function () { return []; },
  filterExpenses: function () { return []; },
  showToast: function () {},
  Blob: class Blob { constructor(parts, opts) { this.parts = parts; this.type = opts && opts.type; } },
  console: console,
  setTimeout: setTimeout,
};
sandbox.globalThis = sandbox;
sandbox.window = sandbox;

vm.createContext(sandbox);
new vm.Script(src, { filename: 'excel.js' }).runInContext(sandbox);

const exported = sandbox.window.XekhoApp.report;
if (typeof exported.exportReportExcel !== 'function') {
  console.error('FAIL: exportReportExcel not exported');
  process.exit(1);
}

// Run the function
(async function () {
  try {
    const result = await exported.exportReportExcel({
      type: 'revenue',
      period: 'today',
      skipLocalDownload: true,
    });
    if (result !== true) {
      console.error('FAIL: exportReportExcel should return true, got:', result);
      process.exit(1);
    }
    console.log('\u2705 exportReportExcel ran successfully (revenue, skip download)');
    
    // Test 'all' type
    const result2 = await exported.exportReportExcel({
      type: 'all',
      period: 'today',
      skipLocalDownload: true,
    });
    if (result2 !== true) {
      console.error('FAIL: exportReportExcel all type should return true');
      process.exit(1);
    }
    console.log('\u2705 exportReportExcel ran successfully (all type)');
    
    console.log('\u2705 verify-report-excel Sprint 8.2 verification passed');
  } catch (err) {
    console.error('FAIL: exportReportExcel threw:', err.message, err.stack);
    process.exit(1);
  }
})();
