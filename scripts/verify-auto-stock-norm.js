const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const style = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

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
  'suggestedImportQty',
  'data-label="Cần nhập"',
  'Món / trạng thái',
  'Cần nhập đề xuất',
];
for (const marker of requiredAppMarkers) assert(app.includes(marker), `missing app marker: ${marker}`);

const requiredIndexMarkers = [
  'data-xk-auto-stock-norm="v1"',
  'Định mức tồn kho tự động',
  'id="auto-stock-norm-board"',
  'id="auto-stock-norm-filter"',
  'app.js?v=20260625-auto-stock-mobile',
  'style.css?v=20260625-auto-stock-mobile',
];
for (const marker of requiredIndexMarkers) assert(index.includes(marker), `missing index marker: ${marker}`);

const requiredStyleMarkers = [
  '.auto-stock-norm-table td::before',
  '@media (max-width: 640px)',
  '.auto-stock-norm-name-line',
  '.auto-stock-norm-suggest-cell',
  '.auto-stock-norm-scroll',
];
for (const marker of requiredStyleMarkers) assert(style.includes(marker), `missing style marker: ${marker}`);

assert(!app.includes('const byLinkedInventory = new Map();'), 'unused byLinkedInventory marker should not remain');
assert(app.includes("key === 'inventory' && typeof currentPage !== 'undefined' && currentPage === 'inventory'"), 'inventory realtime re-render missing');
assert(app.includes("try { renderAutoStockNormBoard(); } catch(_) {}"), 'history realtime board refresh missing');

console.log('verify-auto-stock-norm passed');
