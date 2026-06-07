'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const styleCss = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
}

assert(indexHtml.includes('id="pur-item-search"'), 'purchase modal should include item search input');
assert(indexHtml.includes('oninput="filterPurchaseItemOptions()"'), 'purchase search should filter options while typing');
assert(indexHtml.includes('id="pur-item-search-hint"'), 'purchase modal should include search result hint');
assert(indexHtml.includes('id="stocktake-item-search"'), 'stocktake modal should include item search input');
assert(indexHtml.includes('oninput="filterStocktakeItems()"'), 'stocktake search should filter rows while typing');
assert(indexHtml.includes('id="stocktake-search-hint"'), 'stocktake modal should include search result hint');
assert(indexHtml.includes('modal-sheet stocktake-modal-sheet'), 'stocktake modal should use fixed-height sheet class');
assert(indexHtml.includes('stocktake-search-panel') && indexHtml.includes('stocktake-results-scroll'), 'stocktake search should stay outside the scrollable results area');

assert(appJs.includes('function getInventorySearchText(item = {})'), 'shared inventory search text helper should exist');
assert(appJs.includes('function renderPurchaseItemOptions(query = \'\', selectedId = \'\')'), 'purchase option renderer should exist');
assert(appJs.includes('function filterPurchaseItemOptions()'), 'purchase filter function should exist');
assert(appJs.includes('const safeName = _escapeHtml(i.name || \'\');') && appJs.includes('const safeType = _escapeHtml(ITEM_TYPE_LABELS[i.itemType]'), 'purchase option renderer should escape item names/types');
assert(appJs.includes("const search = document.getElementById('pur-item-search');") && appJs.includes("renderPurchaseItemOptions('', '');"), 'openPurchaseModal should reset and render searchable options');
assert(appJs.includes('function renderStocktakeItemsList(items)'), 'stocktake list renderer should exist');
assert(appJs.includes('function filterStocktakeItems()'), 'stocktake filter function should exist');
assert(appJs.includes('class="list-item stocktake-item-row"') && appJs.includes('data-stocktake-search='), 'stocktake rows should carry searchable metadata');
assert(appJs.includes("row.style.display = matches ? '' : 'none'"), 'stocktake filter should hide rows without removing inputs');
assert(appJs.includes("filterStocktakeItems();\n\n  document.getElementById('stocktake-modal').classList.add('active');"), 'openStocktakeModal should initialize filter before showing modal');

assert(styleCss.includes('.inventory-modal-search') && styleCss.includes('.inventory-search-hint'), 'search field styles should be present');
assert(styleCss.includes('.stocktake-modal-sheet') && styleCss.includes('height: 90svh'), 'stocktake sheet should keep a fixed mobile viewport height');
assert(styleCss.includes('.stocktake-results-scroll') && styleCss.includes('max-height: 34svh'), 'stocktake results should have a smaller dedicated mobile scroll area');
assert(styleCss.includes('.stocktake-search-panel') && styleCss.includes('position: sticky'), 'stocktake search panel should stay pinned at the top of the modal body');

console.log('OK: inventory item search UI verified');
