#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const root = path.resolve(__dirname, '..');
  const facadePath = path.join(root, 'app', 'esm', 'utils', 'dom.js');
  const classicPath = path.join(root, 'app', 'utils', 'dom.js');
  const source = fs.readFileSync(facadePath, 'utf8');
  const classicSource = fs.readFileSync(classicPath, 'utf8');

  assert(source.includes('export function escapeHtml'), 'expected ESM escapeHtml export');
  assert(source.includes('export function installGlobalDomUtils'), 'expected ESM installer export');
  assert(classicSource.includes('XekhoApp.utils.dom'), 'classic dom utility must keep global namespace');

  const moduleUrl = 'data:text/javascript;charset=utf-8,' + encodeURIComponent(source);
  const mod = await import(moduleUrl);

  assert(typeof mod.escapeHtml === 'function', 'escapeHtml export should be a function');
  assert(typeof mod.installGlobalDomUtils === 'function', 'installGlobalDomUtils export should be a function');
  assert(mod.escapeHtml('<div class="x">A&B\'</div>') === '&lt;div class=&quot;x&quot;&gt;A&amp;B&#39;&lt;/div&gt;', 'escapeHtml output mismatch');

  const win = { XekhoApp: { utils: { dom: { existing: true } } } };
  win.window = win;
  const installed = mod.installGlobalDomUtils(win);

  assert(installed.existing === true, 'installer must preserve existing dom namespace fields');
  assert(installed.escapeHtml === mod.escapeHtml, 'installer must expose the exact ESM escapeHtml function');
  assert(win.XekhoApp.utils.dom.escapeHtml('"<&>') === '&quot;&lt;&amp;&gt;', 'installed global escapeHtml output mismatch');

  console.log('verify-esm-dom-utils passed', {
    exports: Object.keys(mod).sort(),
    preservesExistingNamespace: installed.existing === true,
    globalMatchesExport: installed.escapeHtml === mod.escapeHtml,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
