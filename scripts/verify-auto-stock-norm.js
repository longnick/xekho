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
  'function getAutoStockNormPurchaseInfo(row)',
  'function toggleAutoStockNormOverview(event)',
  'const history = _getVisibleHistoryForUi();',
  'const inventory = _getInventory();',
  'suggestedImportQty',
  "const packageSize = isCanBeer ? 24 : 1;",
  "const packageName = isCanBeer ? 'thùng' : unit;",
  'Tổng quan nhập hàng hôm nay',
  'Hôm nay cần đặt',
  'Số thùng bia được làm tròn theo thùng chẵn 24 lon',
  'renderAutoStockNormBoard();',
];
for (const marker of requiredAppMarkers) assert(app.includes(marker), `missing app marker: ${marker}`);

const requiredIndexMarkers = [
  'data-xk-auto-stock-norm="v1"',
  'Định mức tồn kho tự động',
  'id="auto-stock-norm-board"',
  'toggleAutoStockNormOverview(event)',
  'app.js?v=20260625-auto-stock-summary',
  'style.css?v=20260626-order-actionbar',
];
for (const marker of requiredIndexMarkers) assert(index.includes(marker), `missing index marker: ${marker}`);
assert(!index.includes('id="auto-stock-norm-filter"'), 'old verbose filter should not remain in compact card');

const requiredStyleMarkers = [
  '.auto-stock-compact',
  '.auto-stock-overview',
  '.auto-stock-order-item',
  '.auto-stock-order-detail',
  '.auto-stock-total',
  '@media (max-width: 640px)',
];
for (const marker of requiredStyleMarkers) assert(style.includes(marker), `missing style marker: ${marker}`);

assert(!app.includes('const byLinkedInventory = new Map();'), 'unused byLinkedInventory marker should not remain');
assert(app.includes("key === 'inventory' && typeof currentPage !== 'undefined' && currentPage === 'inventory'"), 'inventory realtime re-render missing');
assert(app.includes("try { renderAutoStockNormBoard(); } catch(_) {}"), 'history realtime board refresh missing');

console.log('verify-auto-stock-norm passed');
