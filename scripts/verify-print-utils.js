'use strict';

const vm = require('vm');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '..', 'app', 'utils', 'print.js'), 'utf-8');
const sandbox = { window: { XekhoApp: {} } };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
new vm.Script(src, { filename: 'print.js' }).runInContext(sandbox);

const exported = sandbox.window.XekhoApp.utils.print;

if (typeof exported.buildStandaloneBillPrintHtml !== 'function') {
  console.error('FAIL: buildStandaloneBillPrintHtml missing');
  process.exit(1);
}

const html = exported.buildStandaloneBillPrintHtml('<div>Test bill</div>');
if (!html.includes('<!DOCTYPE html>')) {
  console.error('FAIL: should start with DOCTYPE');
  process.exit(1);
}
if (!html.includes('<div>Test bill</div>')) {
  console.error('FAIL: should include markup');
  process.exit(1);
}
if (!html.includes('window.print()')) {
  console.error('FAIL: should include print trigger');
  process.exit(1);
}
if (!html.includes('</html>')) {
  console.error('FAIL: should end with </html>');
  process.exit(1);
}

console.log('\u2705 verify-print-utils Sprint 5.1 verification passed');
