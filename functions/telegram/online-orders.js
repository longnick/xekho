// @ts-check
'use strict';
const textUtils = require('../utils/text');

const { escapeTelegramHtml, normalizeTelegramText, formatQtyVi, formatCurrencyVi } = textUtils;

/**
 * @param {any[]} items
 * @param {Object} options
 * @returns {string}
 */
function formatTelegramBillItemsClean(items = [], { bullet = '•', includeNotes = true } = {}) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return `${bullet} Chưa có chi tiết món`;
  return list.map(item => {
    const name = normalizeTelegramText(String(item?.name || item?.productName || 'Món').trim());
    const qty = Number(item?.qty || item?.quantity || 0) || 1;
    const price = Number(item?.price || 0) || 0;
    const lineTotal = price * qty;
    const note = includeNotes ? normalizeTelegramText(String(item?.note || item?.notes || '').trim()) : '';
    return `${bullet} ${escapeTelegramHtml(name || 'Món')} x${escapeTelegramHtml(formatQtyVi(qty))} - ${escapeTelegramHtml(formatCurrencyVi(lineTotal))}${note ? ` (${escapeTelegramHtml(note)})` : ''}`;
  }).join('\n');
}

/**
 * @param {string} requestId
 * @param {number} index
 * @param {Object} requestItem
 * @param {Object} product
 * @returns {Object}
 */
function buildPosItemFromRequest(requestId, index, requestItem = {}, product = {}) {
  const itemTypeRaw = String(product.item_type || '').trim().toLowerCase();
  const itemType = itemTypeRaw === 'retail' ? 'retail_item' : 'finished_good';
  const kitchenRouting = String(product.kitchenRouting || '').trim().toLowerCase() || (itemType === 'retail_item' ? 'skip' : 'all');
  const qty = Number(requestItem.quantity || requestItem.qty || 1) || 1;
  const lineItemId = `WEB-${String(requestId)}-${index + 1}`;
  return {
    id: String(requestItem.menuItemId || requestItem.id || '').trim(),
    name: String(requestItem.name || product.display_name || product.name || 'Món').trim(),
    price: Number(requestItem.price ?? product.sell_price ?? product.price ?? 0) || 0,
    qty,
    note: String(requestItem.notes || requestItem.note || '').trim(),
    lineItemId,
    sourceRequestId: String(requestId),
    source: 'customer_web',
    sourceChannel: 'webapp-menu',
    itemType,
    kitchenRouting,
    kitchenStatus: kitchenRouting === 'skip' ? 'skip' : 'pending',
    saleMode: itemType === 'retail_item' ? 'retail' : 'dish',
    directSale: itemType === 'retail_item',
    forceKitchen: false,
    linkedInventoryId: String(product.linkedInventoryId || '').trim() || null,
  };
}

/**
 * @param {any[]} items
 * @returns {string}
 */
function aggregateRequestStatusFromItems(items = []) {
  const statuses = items
    .map(item => String(item?.kitchenStatus || '').trim().toLowerCase())
    .filter(Boolean);

  if (!statuses.length) return 'approved';
  if (statuses.every(status => status === 'served')) return 'served';
  if (statuses.every(status => ['done', 'served', 'skip'].includes(status))) return 'ready_to_serve';
  if (statuses.some(status => status === 'cooking')) return 'preparing';
  return 'approved';
}

/**
 * @param {string} orderId
 * @param {number} index
 * @param {Object} orderItem
 * @param {Object} product
 * @returns {Object}
 */
function buildPosItemFromOnlineOrder(orderId, index, orderItem = {}, product = {}) {
  const itemTypeRaw = String(product.item_type || '').trim().toLowerCase();
  const itemType = itemTypeRaw === 'retail' ? 'retail_item' : 'finished_good';
  const kitchenRouting = String(product.kitchenRouting || '').trim().toLowerCase() || (itemType === 'retail_item' ? 'skip' : 'all');
  const qty = Number(orderItem.quantity || orderItem.qty || 1) || 1;
  const lineItemId = `ONL-${String(orderId)}-${index + 1}`;
  return {
    id: String(orderItem.productId || orderItem.menuItemId || orderItem.id || '').trim(),
    name: String(orderItem.productName || orderItem.name || product.display_name || product.name || 'Món').trim(),
    price: Number(orderItem.unitPrice ?? orderItem.price ?? product.sell_price ?? product.price ?? 0) || 0,
    qty,
    note: String(orderItem.note || orderItem.notes || '').trim(),
    lineItemId,
    onlineOrderId: String(orderId),
    source: 'online_ordering',
    sourceChannel: 'website',
    itemType,
    kitchenRouting,
    kitchenStatus: kitchenRouting === 'skip' ? 'skip' : 'pending',
    saleMode: itemType === 'retail_item' ? 'retail' : 'dish',
    directSale: itemType === 'retail_item',
    forceKitchen: false,
    linkedInventoryId: String(product.linkedInventoryId || '').trim() || null,
    kitchenSentAt: kitchenRouting === 'skip' ? null : Date.now(),
  };
}

/**
 * @param {string} status
 * @returns {string}
 */
function buildOnlineOrderTelegramStatusLabel(status) {
  switch (String(status || '').trim().toLowerCase()) {
    case 'approved':
      return 'ĐÃ XÁC NHẬN';
    case 'preparing':
      return 'ĐANG LÀM';
    case 'ready_to_serve':
      return 'XONG';
    case 'delivering':
      return 'ANG GIAO';
    case 'completed':
      return 'ĐÃ GIAO';
    case 'cancelled':
    case 'rejected':
      return 'ĐÃ HỦY';
    default:
      return 'CHỜ XÁC NHẬN';
  }
}

/**
 * @param {string} orderId
 * @param {Object} orderData
 * @returns {string}
 */
function buildOnlineOrderTelegramSummary(orderId, orderData = {}) {
  const items = Array.isArray(orderData.items) ? orderData.items : [];
  const itemLines = items.length
    ? items.map((item) => {
      const noteText = item.note ? ` (${item.note})` : '';
      return `- ${item.productName || item.name || 'Món'} x${Number(item.quantity || item.qty || 0)}${noteText}`;
    }).join('\n')
    : '- Không có chi tiết';

  const address = [
    orderData.customer?.addressLine1,
    orderData.customer?.ward,
    orderData.customer?.district,
    orderData.customer?.city,
  ].filter(Boolean).join(', ');

  return [
    'ĐƠN ONLINE MỚI',
    `Mã đơn: ${String(orderData.orderCode || String(orderId).slice(-8).toUpperCase()).trim()}`,
    `Khách: ${String(orderData.customer?.fullName || '--').trim()}`,
    `SDT: ${String(orderData.customer?.phone || '--').trim()}`,
    `Địa chỉ: ${address || '--'}`,
    `Thanh toán: ${String(orderData.paymentMethod || 'cod').toUpperCase()} / ${String(orderData.paymentStatus || 'pending')}`,
    `Tổng tiền: ${formatCurrencyVi(Number(orderData.pricing?.total || 0) || 0)}`,
    `Trạng thái: ${buildOnlineOrderTelegramStatusLabel(orderData.status)}`,
    '',
    'Món hàng:',
    itemLines,
  ].join('\n');
}

/**
 * @param {string} status
 * @returns {string}
 */
function buildOnlineOrderTelegramStatusLabelClean(status) {
  switch (String(status || '').trim().toLowerCase()) {
    case 'approved':
      return 'ĐÃ XÁC NHẬN';
    case 'preparing':
      return 'ĐANG LÀM';
    case 'ready_to_serve':
      return 'XONG';
    case 'delivering':
      return 'ĐANG GIAO';
    case 'completed':
      return 'ĐÃ GIAO';
    case 'cancelled':
    case 'rejected':
      return 'ĐÃ HỦY';
    default:
      return 'CHỜ XÁC NHẬN';
  }
}

/**
 * @param {string} orderId
 * @param {Object} orderData
 * @returns {string}
 */
function buildOnlineOrderTelegramSummaryClean(orderId, orderData = {}) {
  const items = Array.isArray(orderData.items) ? orderData.items : [];
  const itemLines = items.length
    ? items.map((item) => {
      const note = normalizeTelegramText(String(item.note || item.notes || '').trim());
      const noteText = note ? ` (${note})` : '';
      return `- ${normalizeTelegramText(item.productName || item.name || 'Món')} x${Number(item.quantity || item.qty || 0)}${noteText}`;
    }).join('\n')
    : '- Không có chi tiết';

  const address = [
    orderData.customer?.addressLine1,
    orderData.customer?.ward,
    orderData.customer?.district,
    orderData.customer?.city,
  ].filter(Boolean).map(part => normalizeTelegramText(part)).join(', ');

  return [
    'ĐƠN ONLINE MỚI',
    `Mã đơn: ${String(orderData.orderCode || String(orderId).slice(-8).toUpperCase()).trim()}`,
    `Khách: ${normalizeTelegramText(String(orderData.customer?.fullName || '--').trim())}`,
    `SDT: ${String(orderData.customer?.phone || '--').trim()}`,
    `Địa chỉ: ${address || '--'}`,
    `Thanh toán: ${String(orderData.paymentMethod || 'cod').toUpperCase()} / ${normalizeTelegramText(String(orderData.paymentStatus || 'pending'))}`,
    `Tổng tiền: ${formatCurrencyVi(Number(orderData.pricing?.total || 0) || 0)}`,
    `Trạng thái: ${buildOnlineOrderTelegramStatusLabelClean(orderData.status)}`,
    '',
    'Món hàng:',
    itemLines,
  ].join('\n');
}

/**
 * @param {Object} order
 * @param {any[]} posItems
 * @returns {string}
 */
function mapOnlineOrderStatusFromPosItems(order = {}, posItems = []) {
  const orderStatus = String(order?.status || '').trim().toLowerCase();
  if (['cancelled', 'rejected'].includes(orderStatus)) return orderStatus;
  if (orderStatus === 'completed') return 'completed';

  const statuses = (Array.isArray(posItems) ? posItems : [])
    .map(item => String(item?.kitchenStatus || '').trim().toLowerCase())
    .filter(Boolean);

  if (!statuses.length) return 'approved';
  if (statuses.every(status => status === 'skip')) return 'approved';
  if (statuses.every(status => ['served', 'skip'].includes(status))) return 'delivering';
  if (statuses.every(status => ['done', 'served', 'skip'].includes(status))) return 'ready_to_serve';
  if (statuses.some(status => status === 'cooking')) return 'preparing';
  return 'approved';
}

module.exports = {
  formatTelegramBillItemsClean,
  buildPosItemFromRequest,
  aggregateRequestStatusFromItems,
  buildPosItemFromOnlineOrder,
  buildOnlineOrderTelegramStatusLabel,
  buildOnlineOrderTelegramSummary,
  buildOnlineOrderTelegramStatusLabelClean,
  buildOnlineOrderTelegramSummaryClean,
  mapOnlineOrderStatusFromPosItems,
};
