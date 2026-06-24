const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function assert(cond, msg) {
  if (!cond) {
    console.error('verify-auto-stock-norm failed:', msg);
    process.exit(1);
  }
}

const requiredAppMarkers = [
  'function buildAutoStockNormRows(days = 56)',
  'function renderAutoStockNormBoard()',
  'function getAutoStockNormLevels(row)',
  'function autoStockNormQuantile(values, q)',
  'function escapeAutoStockNormHtml(value)',
  'const history = _getVisibleHistoryForUi();',
  'const inventory = _getInventory();',
  'Đơn vị là đơn vị bán trên POS',
  'renderAutoStockNormBoard();',
  "if (filter === 'need') rows = rows.filter(r => r.status === 'need' || r.status === 'watch');",
];
for (const marker of requiredAppMarkers) assert(app.includes(marker), `missing app marker: ${marker}`);

const requiredIndexMarkers = [
  'data-xk-auto-stock-norm="v1"',
  'Định mức tồn kho tự động',
  'id="auto-stock-norm-board"',
  'id="auto-stock-norm-filter"',
  'app.js?v=20260625-auto-stock-norm',
];
for (const marker of requiredIndexMarkers) assert(index.includes(marker), `missing index marker: ${marker}`);

assert(!app.includes('const byLinkedInventory = new Map();'), 'unused byLinkedInventory marker should not remain');
assert(app.includes("key === 'inventory' && typeof currentPage !== 'undefined' && currentPage === 'inventory'"), 'inventory realtime re-render missing');
assert(app.includes("try { renderAutoStockNormBoard(); } catch(_) {}"), 'history realtime board refresh missing');

console.log('verify-auto-stock-norm passed');
