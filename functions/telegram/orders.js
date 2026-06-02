'use strict';

function getHistoryBusinessId(order) {
  return String(order?.id || order?.historyId || order?.docId || '').trim() || String(order?.docId || '').trim();
}

function getHistoryVersionDate(order) {
  const rawDate = order?.updatedAt || order?.paidAt || order?.timestamp || null;
  if (rawDate instanceof Date) return rawDate;
  if (rawDate?.toDate) return rawDate.toDate();
  return new Date(rawDate || 0);
}

function getHistoryVersionTime(order) {
  const date = getHistoryVersionDate(order);
  return date instanceof Date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

function isCompletedHistoryOrderForReports(order) {
  const status = String(order?.status || '').trim().toLowerCase();
  if (!status) return !order?.cancelledAt && !order?.cancelReason;
  return status === 'completed' || status === 'closed';
}

function isVisibleHistoryOrderForReports(order) {
  if (!order || typeof order !== 'object') return false;
  if (!isCompletedHistoryOrderForReports(order)) return false;
  if (order.hidden === true) return false;
  if (order.hiddenFromReports === true) return false;
  if (order.hiddenFromHistory === true) return false;
  if (order.deletedAt || order.deletedFromAppAt) return false;
  if (order.archivedAt || order.archivedFromHistoryId) return false;
  if (order.supersededAt || order.supersededByHistoryId) return false;
  return true;
}

function extractTelegramCashierName(value) {
// Override table normalization so customer-request flows do not render labels like duplicated "BAN".
function normalizeTelegramTableLabel(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'Không rõ';
  if (/^(takeaway|mang ve|mangv[eá»])$/i.test(raw)) return 'Mang về';

  const repeatedPrefixMatch = raw.match(/^(?:b[aà]n?\s*)?(?:ban|b[aà]n)\s*(.+)$/i);
  if (repeatedPrefixMatch?.[1]) return `Bàn ${repeatedPrefixMatch[1].trim()}`;

  const shortMatch = raw.match(/^b\s*[- ]?\s*(\d+)$/i);
  if (shortMatch?.[1]) return `Bàn ${shortMatch[1].trim()}`;

  return raw;
}

  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value !== 'object') return String(value).trim();

  const candidates = [
    value.name,
    value.full_name,
    value.fullName,
    value.username,
    value.displayName,
    value.email,
    value.id,
    value.uid,
  ];

  for (const candidate of candidates) {
    const name = String(candidate || '').trim();
    if (name && name !== '[object Object]') return name;
  }
  return '';
}

function pickFirstPresentValue(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && !value.trim()) continue;
    return value;
  }
  return null;
}

function toTelegramMoneyNumber(...values) {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return 0;
}

function normalizeCompletedOrderItems(order = {}) {
  const rawItems = pickFirstPresentValue(
    Array.isArray(order.items) ? order.items : null,
    Array.isArray(order.billItems) ? order.billItems : null,
    Array.isArray(order.lineItems) ? order.lineItems : null,
    Array.isArray(order.cartItems) ? order.cartItems : null,
    Array.isArray(order.products) ? order.products : null
  );

  if (!Array.isArray(rawItems)) return [];

  return rawItems.map(item => {
    if (!item || typeof item !== 'object') return null;
    const qty = toTelegramMoneyNumber(item.qty, item.quantity, item.count, 1) || 1;
    const price = toTelegramMoneyNumber(item.price, item.unitPrice, item.sellPrice, item.subtotal && qty ? Number(item.subtotal) / qty : 0);
    const cost = toTelegramMoneyNumber(item.cost, item.unitCost, item.baseCost, 0);
    return {
      ...item,
      name: String(pickFirstPresentValue(item.name, item.itemName, item.productName, item.title, item.label, 'Món')).trim(),
      qty,
      price,
      cost,
      note: String(pickFirstPresentValue(item.note, item.notes, item.description, '') || '').trim(),
    };
  }).filter(Boolean);
}

function calculateCompletedOrderSubtotal(items = []) {
  return items.reduce((sum, item) => {
    const qty = toTelegramMoneyNumber(item?.qty, 0);
    const price = toTelegramMoneyNumber(item?.price, item?.subtotal && qty ? Number(item.subtotal) / qty : 0);
    const lineTotal = qty > 0 ? qty * price : toTelegramMoneyNumber(item?.subtotal, item?.total, 0);
    return sum + lineTotal;
  }, 0);
}

function normalizeCompletedOrderForTelegram(historyId, order = {}) {
  const items = normalizeCompletedOrderItems(order);
  const subtotalFromItems = calculateCompletedOrderSubtotal(items);
  const discount = toTelegramMoneyNumber(order.discount, order.discountAmount, order.extras?.discount, 0);
  const shipping = toTelegramMoneyNumber(order.shipping, order.shippingFee, order.deliveryFee, order.extras?.shipping, 0);
  const vatAmount = toTelegramMoneyNumber(order.vatAmount, order.taxAmount, order.extras?.vatAmount, 0);
  const subtotal = toTelegramMoneyNumber(order.subtotal, order.itemsTotal, order.amountBeforeTax, subtotalFromItems);
  const total = toTelegramMoneyNumber(order.total, order.finalBillTotal, order.grandTotal, order.amount, order.totalAmount, subtotal - discount + shipping + vatAmount);
  const cost = toTelegramMoneyNumber(
    order.cost,
    order.totalCost,
    items.reduce((sum, item) => sum + (toTelegramMoneyNumber(item.cost, 0) * toTelegramMoneyNumber(item.qty, 0)), 0)
  );

  return {
    ...order,
    historyId: String(pickFirstPresentValue(order.historyId, order.docId, historyId, '') || '').trim(),
    id: String(pickFirstPresentValue(order.id, order.billNo, order.orderId, historyId, '') || '').trim(),
    billNo: String(pickFirstPresentValue(order.billNo, order.id, order.orderCode, order.historyId, historyId, '') || '').trim(),
    tableId: String(pickFirstPresentValue(order.tableId, order.tableNumber, order.table, order.ban, '') || '').trim(),
    tableName: String(pickFirstPresentValue(order.tableName, order.tableLabel, order.posTableName, order.channelName, order.tableId, order.tableNumber, '') || '').trim(),
    payMethod: String(pickFirstPresentValue(order.payMethod, order.paymentMethod, order.payment?.method, '') || '').trim(),
    paidAt: pickFirstPresentValue(order.paidAt, order.completedAt, order.closedAt, order.updatedAt, order.timestamp, order.createdAt),
    note: String(pickFirstPresentValue(order.note, order.notes, order.message, '') || '').trim(),
    discountNote: String(pickFirstPresentValue(order.discountNote, order.promotionName, order.discountReason, '') || '').trim(),
    createdByName: pickFirstPresentValue(order.createdByName, order.cashierName, order.staffName, order.staff?.name, order.createdByName),
    paidByName: pickFirstPresentValue(order.paidByName, order.cashierName, order.staffName, order.payment?.collectedByName, order.paidByName),
    items,
    subtotal,
    discount,
    shipping,
    vatAmount,
    total,
    cost,
  };
}

module.exports = {
  getHistoryBusinessId,
  getHistoryVersionDate,
  getHistoryVersionTime,
  isCompletedHistoryOrderForReports,
  isVisibleHistoryOrderForReports,
  extractTelegramCashierName,
  pickFirstPresentValue,
  toTelegramMoneyNumber,
  normalizeCompletedOrderItems,
  calculateCompletedOrderSubtotal,
  normalizeCompletedOrderForTelegram,
};
