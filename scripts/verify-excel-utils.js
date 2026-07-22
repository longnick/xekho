'use strict';

const vm = require('vm');
const fs = require('fs');
const path = require('path');

const excelPath = path.resolve(__dirname, '..', 'app', 'utils', 'excel.js');
const excelSrc = fs.readFileSync(excelPath, 'utf-8');

const sandbox = {
  window: { XekhoApp: {} },
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
new vm.Script(excelSrc, { filename: 'excel.js' }).runInContext(sandbox);

const exported = sandbox.window.XekhoApp.utils.excel;
const expectedFunctions = [
  'excelThinBorder',
  'excelColLetter',
  'excelFmtVnInt',
  'applyReportTitleBlock',
  'paintExcelHeaderRow',
  'paintExcelTotalRow',
  'setRowBorders',
];

const missing = expectedFunctions.filter(fn => typeof exported[fn] !== 'function');
if (missing.length) {
  console.error('FAIL: Missing exports:', missing);
  process.exit(1);
}

// Test excelThinBorder
const border = exported.excelThinBorder();
if (!border.top || !border.left || !border.bottom || !border.right) {
  console.error('FAIL: excelThinBorder missing sides');
  process.exit(1);
}
if (border.top.style !== 'thin') {
  console.error('FAIL: border style should be thin');
  process.exit(1);
}

// Test excelColLetter
if (exported.excelColLetter(1) !== 'A') {
  console.error('FAIL: col 1 should be A');
  process.exit(1);
}
if (exported.excelColLetter(26) !== 'Z') {
  console.error('FAIL: col 26 should be Z');
  process.exit(1);
}
if (exported.excelColLetter(27) !== 'AA') {
  console.error('FAIL: col 27 should be AA');
  process.exit(1);
}

// Test excelFmtVnInt
const fmt = exported.excelFmtVnInt(1234567);
if (!fmt.includes('1') || !fmt.includes('234')) {
  console.error('FAIL: excelFmtVnInt wrong:', fmt);
  process.exit(1);
}
if (exported.excelFmtVnInt(0) !== '0') {
  console.error('FAIL: excelFmtVnInt(0) wrong');
  process.exit(1);
}

console.log('\u2705 verify-excel-utils Sprint 4.1 verification passed');
console.log('   ' + expectedFunctions.length + ' functions exported');
