function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function text(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function normalizeTableName(order = {}) {
  return text(order.tableName || order.tableLabel || order.posTableName || order.tableId || 'Ban');
}

function isKitchenReadyItem(item = {}) {
  const status = text(item.kitchenStatus).toLowerCase();
  const routing = text(item.kitchenRouting).toLowerCase();
  const itemType = text(item.itemType).toLowerCase();
  const saleMode = text(item.saleMode).toLowerCase();
  if (status !== 'done') return false;
  if (routing === 'skip') return false;
  if (itemType === 'retail_item' || saleMode === 'retail' || item.directSale === true) return false;
  return true;
}

function kitchenLineKey(item = {}, index = 0) {
  return text(item.lineItemId || item.kitchenLineItemId || `${item.id || item.productId || 'item'}:${item.kitchenSentAt || 0}:${index}`);
}

function buildReadyItemsFromOrders(orderDocs = [], options = {}) {
  const station = text(options.station || 'all').toLowerCase() || 'all';
  const limit = Math.max(1, Math.min(20, toNumber(options.limit, 8)));
  const now = Date.now();
  const items = [];

  orderDocs.forEach(doc => {
    const order = typeof doc.data === 'function' ? (doc.data() || {}) : (doc || {});
    const orderId = text(doc.id || order.id || order.orderId);
    const tableId = text(order.tableId || order.table || '');
    const tableName = normalizeTableName(order);
    const orderItems = Array.isArray(order.items) ? order.items : [];

    orderItems.forEach((item, index) => {
      if (!isKitchenReadyItem(item)) return;
      const routing = text(item.kitchenRouting || 'all').toLowerCase() || 'all';
      if (station !== 'all' && routing !== 'all' && routing !== station) return;
      const readyAt = toNumber(item.kitchenUpdatedAt || item.doneAt || item.updatedAt || item.kitchenSentAt || order.updatedAt || 0, 0);
      const qty = Math.max(1, toNumber(item.qty || item.quantity, 1));
      const lineKey = kitchenLineKey(item, index);
      items.push({
        id: `${orderId}:${lineKey}`,
        orderId,
        tableId,
        tableName,
        lineKey,
        name: text(item.name || item.productName || item.title || 'Mon xong'),
        qty,
        note: text(item.note || item.notes || ''),
        station: routing,
        readyAt,
        ageSeconds: readyAt > 0 ? Math.max(0, Math.floor((now - readyAt) / 1000)) : 0,
      });
    });
  });

  items.sort((a, b) => (b.readyAt || 0) - (a.readyAt || 0));
  return items.slice(0, limit);
}

async function fetchKitchenReadyFeed({ db, station = 'all', limit = 8 } = {}) {
  if (!db) throw new Error('missing-db');
  const snap = await db.collection('orders')
    .where('status', '==', 'open')
    .limit(80)
    .get();
  return buildReadyItemsFromOrders(snap.docs, { station, limit });
}

module.exports = {
  isKitchenReadyItem,
  buildReadyItemsFromOrders,
  fetchKitchenReadyFeed,
};
