// @ts-check
'use strict';

const { escapeTelegramHtml, normalizeTelegramText, formatQtyVi } = require('../utils/text');

/**
 * @param {string} value
 * @returns {string}
 */
function normalizeTelegramTableLabel(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'Kh\u00f4ng r\u00f5';
  if (/^(takeaway|mang ve|mangv[e\u1ec1])$/i.test(raw)) return 'Mang v\u1ec1';
  const fullMatch = raw.match(/^ban\s*(.+)$/i);
  if (fullMatch?.[1]) return `B\u00e0n ${fullMatch[1].trim()}`;
  const shortMatch = raw.match(/^b\s*[- ]?\s*(\d+)$/i);
  if (shortMatch?.[1]) return `B\u00e0n ${shortMatch[1].trim()}`;
  return raw;
}

/**
 * @param {Object} notif
 * @param {Object} options
 * @returns {{title: string, body: string, zaloText: string}}
 */
function buildKitchenNotifMessage(notif = {}, options = {}) {
  const type = String(notif.type || '').toLowerCase();
  const tableName = String(notif.tableName || notif.tableId || 'Ban');
  const items = Array.isArray(notif.items) ? notif.items.filter(Boolean) : [];
  const body = items.join(', ');
  const prefix = String(options.prefix || '').trim();
  const _prefixText = prefix ? `${prefix}\\n` : '';
  const groupLabel = String(options.groupLabel || '').trim();
  const _groupLine = groupLabel ? `\\nNh\u00f3m: ${groupLabel}` : '';
  if (type === 'ready') {
    return {
      title: `\ud83c\udf7d\ufe0f ${tableName} - Xong r\u1ed3i!`,
      body: body || 'Mang ra ngay.',
      zaloText: `\u2705 [XE KH\u00d4 POS]\\n${tableName} xong r\u1ed3i! Mang ra ngay!\\n\\nM\u00f3n:\\n\u2022 ${items.join('\\n\u2022 ') || 'Kh\u00f4ng c\u00f3 chi ti\u1ebft'}`,
    };
  }
  if (type === 'accepted') {
    return {
      title: `B\u1ebeP \u0110\u00c3 NH\u1eacN - ${tableName}`,
      body: body || 'Nh\u00e2n vi\u00ean theo d\u00f5i \u0111\u1ec3 l\u1ea5y m\u00f3n khi c\u1ea7n.',
      zaloText: '',
    };
  }
  if (type === 'delay') {
    return {
      title: `\u26a0\ufe0f ${tableName} - \u0110ang ch\u1eadm`,
      body: body || 'B\u00e1o kh\u00e1ch ch\u1edd th\u00eam.',
      zaloText: `\u26a0\ufe0f [XE KH\u00d4 POS]\\n${tableName} \u0111ang ch\u1eadm - B\u00e1o kh\u00e1ch ch\u1edd th\u00eam${items.length ? `\\n\\nM\u00f3n:\\n\u2022 ${items.join('\\n\u2022 ')}` : ''}`,
    };
  }
  return {
    title: `\ud83d\udce3 ${tableName}`,
    body: body || String(notif.message || 'C\u00f3 c\u1eadp nh\u1eadt t\u1eeb b\u1ebfp'),
    zaloText: '',
  };
}

/**
 * @param {string} itemText
 * @returns {{name: string, qty: string, summary: string}|null}
 */
function parseKitchenItemSummary(itemText = '') {
  const raw = String(itemText || '').trim();
  if (!raw) return null;

  const match = raw.match(/^(.*?)\s*x\s*(\d+(?:[.,]\d+)?)$/i);
  if (!match) {
    return {
      name: raw,
      qty: '',
      summary: raw,
    };
  }

  const name = String(match[1] || '').trim();
  const qty = String(match[2] || '').replace(',', '.').trim();
  return {
    name: name || raw,
    qty,
    summary: `${name || raw} x${qty}`,
  };
}

/**
 * @param {Object} notif
 * @returns {string}
 */
function buildTelegramFoodReadyMessage(notif = {}) {
  const rawItems = Array.isArray(notif.items) ? notif.items.filter(Boolean) : [];
  const parsedItems = rawItems
    .map(parseKitchenItemSummary)
    .filter(Boolean);

  const itemNames = parsedItems.length
    ? parsedItems.map(item => item.name).join(', ')
    : 'Khong co chi tiet';
  const qtyText = parsedItems.length
    ? parsedItems.map(item => item.qty ? `${item.name} x${item.qty}` : item.summary).join(', ')
    : '';
  const tableName = String(notif.tableName || notif.tableId || 'Khong ro');

  return [
    '\ud83d\udd14 M\u00d3N \u0110\u00c3 XONG!',
    '',
    `M\u00f3n: ${itemNames}`,
    '',
    `B\u00e0n: ${tableName}`,
    '',
    `S\u1ed1 l\u01b0\u1ee3ng: ${qtyText || 'Kh\u00f4ng r\u00f5'}`,
    '',
    'Ti\u1ebfp t\u1ee1c vui l\u00f2ng l\u1ea5y m\u00f3n!',
  ].join('\\n');
}

/**
 * @param {Object} item
 * @returns {boolean}
 */
function isKitchenOrderItemForTelegram(item = {}) {
  const status = String(item?.kitchenStatus || '').trim().toLowerCase();
  const itemType = String(item?.itemType || '').trim().toLowerCase();
  const routing = String(item?.kitchenRouting || '').trim().toLowerCase();
  const saleMode = String(item?.saleMode || '').trim().toLowerCase();
  const forceKitchen = item?.forceKitchen === true;
  if (status !== 'pending') return false;
  if (!forceKitchen && (itemType === 'retail_item' || saleMode === 'retail' || item?.directSale === true)) return false;
  if (!forceKitchen && routing === 'skip') return false;
  return true;
}

/**
 * @param {Object} item
 * @param {number} index
 * @returns {string}
 */
function getKitchenOrderItemKey(item = {}, index = 0) {
  return String(item?.lineItemId || `${item?.id || 'item'}:${item?.kitchenSentAt || 0}:${index}`);
}

/**
 * @param {any[]} afterItems
 * @param {any[]} beforeItems
 * @returns {any[]}
 */
function getNewPendingKitchenItems(afterItems = [], beforeItems = []) {
  const beforeKeys = new Set((Array.isArray(beforeItems) ? beforeItems : [])
    .map((item, index) => {
      const status = String(item?.kitchenStatus || '').trim().toLowerCase();
      return status === 'pending' ? getKitchenOrderItemKey(item, index) : '';
    })
    .filter(Boolean));

  return (Array.isArray(afterItems) ? afterItems : [])
    .map((item, index) => ({ item, index, key: getKitchenOrderItemKey(item, index) }))
    .filter(row => isKitchenOrderItemForTelegram(row.item) && !beforeKeys.has(row.key));
}

/**
 * @param {Object} order
 * @param {any[]} rows
 * @returns {string}
 */
function buildTelegramNewKitchenOrderMessage(order = {}, rows = []) {
  const tableName = String(order.tableName || order.tableId || 'Khong ro');
  const itemLines = rows.length
    ? rows.map(row => {
      const item = row.item || {};
      const qty = Number(item.qty || 0);
      const note = String(item.note || '').trim();
      return `\u2022 ${escapeTelegramHtml(item.name || 'M\u00f3n')} x${escapeTelegramHtml(formatQtyVi(qty || 1))}${note ? ` (${escapeTelegramHtml(note)})` : ''}`;
    }).join('\\n')
    : '\u2022 Kh\u00f4ng c\u00f3 chi ti\u1ebft';

  return [
    '<b>\ud83d\udd14 C\u00d3 M\u00d3N M\u1edaI</b>',
    '',
    `<b>B\u00e0n/\u0110\u01a1n:</b> ${escapeTelegramHtml(tableName)}`,
    `<b>M\u00f3n m\u1edbi:</b>`,
    itemLines,
    '',
    '<i>Vui l\u00f2ng ki\u1ec3m tra m\u00e0n h\u00ecnh b\u1ebfp.</i>',
  ].join('\\n');
}

/**
 * @param {Object} notif
 * @returns {string}
 */
function buildTelegramFoodReadyMessageClean(notif = {}) {
  const rawItems = Array.isArray(notif.items) ? notif.items.filter(Boolean) : [];
  const parsedItems = rawItems
    .map(item => parseKitchenItemSummary(normalizeTelegramText(item)))
    .filter(Boolean);

  const itemNames = parsedItems.length
    ? parsedItems.map(item => item.name).join(', ')
    : 'Kh\u00f4ng c\u00f3 chi ti\u1ebft';
  const qtyText = parsedItems.length
    ? parsedItems.map(item => item.qty ? `${item.name} x${item.qty}` : item.summary).join(', ')
    : '';
  const tableName = normalizeTelegramTableLabel(notif.tableName || notif.tableId || '');

  return [
    '\ud83d\udd14 M\u00d3N \u0110\u00c3 XONG!',
    '',
    `M\u00f3n: ${itemNames}`,
    '',
    `B\u00e0n: ${tableName}`,
    '',
    `S\u1ed1 l\u01b0\u1ee3ng: ${qtyText || 'Kh\u00f4ng r\u00f5'}`,
    '',
    'Ti\u1ebfp t\u1ee1c vui l\u00f2ng l\u1ea5y m\u00f3n!',
  ].join('\\n');
}

/**
 * @param {Object} order
 * @param {any[]} rows
 * @returns {string}
 */
function buildTelegramNewKitchenOrderMessageClean(order = {}, rows = []) {
  const tableName = normalizeTelegramTableLabel(order.tableName || order.tableId || '');
  const itemLines = rows.length
    ? rows.map(row => {
      const item = row.item || {};
      const qty = Number(item.qty || 0);
      const note = normalizeTelegramText(String(item.note || '').trim());
      const itemName = normalizeTelegramText(item.name || item.productName || 'M\u00f3n');
      return `\u2022 ${escapeTelegramHtml(itemName)} x${escapeTelegramHtml(formatQtyVi(qty || 1))}${note ? ` (${escapeTelegramHtml(note)})` : ''}`;
    }).join('\\n')
    : '\u2022 Kh\u00f4ng c\u00f3 chi ti\u1ebft';

  return [
    '<b>\ud83d\udd14 C\u00d3 M\u00d3N M\u1edaI</b>',
    '',
    `<b>B\u00e0n/\u0110\u01a1n:</b> ${escapeTelegramHtml(tableName)}`,
    '<b>M\u00f3n m\u1edbi:</b>',
    itemLines,
    '',
    '<i>Vui l\u00f2ng ki\u1ec3m tra m\u00e0n h\u00ecnh b\u1ebfp.</i>',
  ].join('\\n');
}

module.exports = {
  normalizeTelegramTableLabel,
  buildKitchenNotifMessage,
  parseKitchenItemSummary,
  buildTelegramFoodReadyMessage,
  isKitchenOrderItemForTelegram,
  getKitchenOrderItemKey,
  getNewPendingKitchenItems,
  buildTelegramNewKitchenOrderMessage,
  buildTelegramFoodReadyMessageClean,
  buildTelegramNewKitchenOrderMessageClean,
};
