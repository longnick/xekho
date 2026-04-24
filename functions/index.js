const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');
const { defineSecret, defineString } = require('firebase-functions/params');
const axios = require('axios');
const cors = require('cors')({ origin: true });
const admin = require('firebase-admin');
const { NlpManager } = require('node-nlp');
const training = require('./POS_NLU_Training.json');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

async function buildRestockMapFromHistoryOrder(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const parentIds = [...new Set(items.map(item => String(item.id || '').trim()).filter(Boolean))];
  if (!parentIds.length) return {};

  const recipesByParent = new Map();
  for (const chunk of chunkArray(parentIds, 10)) {
    const snap = await db.collection('Recipes_BOM')
      .where('parent_item_id', 'in', chunk)
      .get();
    snap.docs.forEach(doc => {
      const row = doc.data() || {};
      const parentId = String(row.parent_item_id || '').trim();
      if (!parentId) return;
      if (!recipesByParent.has(parentId)) recipesByParent.set(parentId, []);
      recipesByParent.get(parentId).push(row);
    });
  }

  const productDocs = await Promise.all(parentIds.map(id => db.collection('Product_Catalog').doc(id).get()));
  const productsById = new Map();
  productDocs.forEach(doc => {
    if (!doc.exists) return;
    productsById.set(String(doc.id), doc.data() || {});
  });

  const restockMap = {};
  items.forEach(item => {
    const parentId = String(item.id || '').trim();
    const itemQty = Number(item.qty || 0);
    if (!parentId || !(itemQty > 0)) return;

    const product = productsById.get(parentId) || {};
    const itemType = String(product.item_type || '').toLowerCase();
    const linkedInventoryId = String(product.linkedInventoryId || '').trim();
    if (itemType === 'retail' && linkedInventoryId) {
      restockMap[linkedInventoryId] = (restockMap[linkedInventoryId] || 0) + itemQty;
    }

    const bomLines = recipesByParent.get(parentId) || [];
    bomLines.forEach(line => {
      const ingredientId = String(line.ingredient_inv_id || '').trim();
      const qtyNeeded = Number(line.quantity_needed ?? line.qty ?? 0);
      if (!ingredientId || !(qtyNeeded > 0)) return;
      restockMap[ingredientId] = (restockMap[ingredientId] || 0) + (qtyNeeded * itemQty);
    });
  });

  return restockMap;
}

const AI_PROVIDER = defineString('AI_PROVIDER', { default: 'none' });
const DEEPSEEK_API_KEY = defineSecret('DEEPSEEK_API_KEY');
const DEEPSEEK_ENDPOINT = defineString('DEEPSEEK_ENDPOINT', { default: 'https://api.deepseek.com' });
const DEEPSEEK_MODEL = defineString('DEEPSEEK_MODEL', { default: 'deepseek-chat' });
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const GEMINI_MODEL = defineString('GEMINI_MODEL', { default: 'gemini-1.5-flash' });
const ZALO_OA_ACCESS_TOKEN = defineString('ZALO_OA_ACCESS_TOKEN', { default: '' });
const ZALO_GROUP_ID = defineString('ZALO_GROUP_ID', { default: '' });
const TELEGRAM_BOT_TOKEN = defineString('TELEGRAM_BOT_TOKEN', { default: '' });
const TELEGRAM_GROUP_CHAT_ID = defineString('TELEGRAM_GROUP_CHAT_ID', { default: '' });
const TELEGRAM_REPORT_CHAT_ID = defineString('TELEGRAM_REPORT_CHAT_ID', { default: '' });
const OWNER_EMAIL = 'owner@ganhkho.vn';

function kitchenNotifDocRef(docId) {
  return db.collection('kitchen_notifications').doc(String(docId));
}

function buildKitchenNotifMessage(notif = {}, options = {}) {
  const type = String(notif.type || '').toLowerCase();
  const tableName = String(notif.tableName || notif.tableId || 'Ban');
  const items = Array.isArray(notif.items) ? notif.items.filter(Boolean) : [];
  const body = items.join(', ');
  const prefix = String(options.prefix || '').trim();
  const prefixText = prefix ? `${prefix}\n` : '';
  const groupLabel = String(options.groupLabel || '').trim();
  const groupLine = groupLabel ? `\nNhom: ${groupLabel}` : '';
  if (type === 'ready') {
    return {
      title: `🍽️ ${tableName} - Xong roi!`,
      body: body || 'Mang ra ngay.',
      zaloText: `✅ [XE KHO POS]\n${tableName} xong roi! Mang ra ngay!\n\nMon:\n• ${items.join('\n• ') || 'Khong co chi tiet'}`,
    };
  }
  if (type === 'accepted') {
    return {
      title: `BEP DA NHAN - ${tableName}`,
      body: body || 'Nhan vien theo doi de lay mon khi can.',
      zaloText: '',
    };
  }
  if (type === 'delay') {
    return {
      title: `⚠️ ${tableName} - Dang cham`,
      body: body || 'Bao khach cho them.',
      zaloText: `⚠️ [XE KHO POS]\n${tableName} dang cham - Bao khach cho them${items.length ? `\n\nMon:\n• ${items.join('\n• ')}` : ''}`,
    };
  }
  return {
    title: `📣 ${tableName}`,
    body: body || String(notif.message || 'Co cap nhat tu bep'),
    zaloText: '',
  };
}

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
    '🔔 MÓN ĐÃ XONG!',
    '',
    `Món: ${itemNames}`,
    '',
    `Bàn: ${tableName}`,
    '',
    `Số lượng: ${qtyText || 'Khong ro'}`,
    '',
    'Tiếp thực vui lòng lấy món!',
  ].join('\n');
}

function escapeTelegramHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatCurrencyVi(amount) {
  return `${Number(amount || 0).toLocaleString('vi-VN')}đ`;
}

function formatQtyVi(amount) {
  const value = Number(amount || 0);
  if (!Number.isFinite(value)) return '0';
  if (Math.abs(value - Math.round(value)) < 1e-9) return Math.round(value).toLocaleString('vi-VN');
  return value.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const DEFAULT_TELEGRAM_REPORT_SETTINGS = {
  enabled: true,
  sendHour: 7,
  sendMinute: 0,
  includeRevenue: true,
  includePaymentBreakdown: true,
  includeInvoiceCount: true,
  includeTopItem: true,
  includeRetailStock: true,
};

function getVietnamDateParts(date = new Date()) {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = dtf.formatToParts(date);
  const map = {};
  parts.forEach(part => {
    if (part.type !== 'literal') map[part.type] = part.value;
  });
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
}

function getVietnamBusinessReportRange(now = new Date()) {
  const parts = getVietnamDateParts(now);
  const todaySixAmUtc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, -1, 0, 0, 0));
  const latestWindowEnd = (parts.hour >= 6)
    ? todaySixAmUtc
    : new Date(todaySixAmUtc.getTime() - (24 * 60 * 60 * 1000));
  const from = new Date(latestWindowEnd.getTime() - (24 * 60 * 60 * 1000));
  const toExclusive = latestWindowEnd;
  const labelStart = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(from);
  const labelEnd = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(toExclusive.getTime() - 1));

  return {
    from,
    toExclusive,
    label: `${labelStart} -> ${labelEnd}`,
  };
}

function getTelegramReportSettings(raw = {}) {
  const hour = Math.min(23, Math.max(0, parseInt(raw.telegramReportSendHour, 10) || DEFAULT_TELEGRAM_REPORT_SETTINGS.sendHour));
  const minute = Math.min(59, Math.max(0, parseInt(raw.telegramReportSendMinute, 10) || DEFAULT_TELEGRAM_REPORT_SETTINGS.sendMinute));
  return {
    enabled: raw.telegramReportEnabled !== false,
    sendHour: hour,
    sendMinute: minute,
    includeRevenue: raw.telegramReportIncludeRevenue !== false,
    includePaymentBreakdown: raw.telegramReportIncludePaymentBreakdown !== false,
    includeInvoiceCount: raw.telegramReportIncludeInvoiceCount !== false,
    includeTopItem: raw.telegramReportIncludeTopItem !== false,
    includeRetailStock: raw.telegramReportIncludeRetailStock !== false,
    lastSentRangeKey: String(raw.telegramReportLastSentRangeKey || '').trim(),
  };
}

function getTelegramReportRangeKey(range) {
  return `${range.from.toISOString()}__${range.toExclusive.toISOString()}`;
}

function shouldSendTelegramReportNow(settings, now = new Date(), range = getVietnamBusinessReportRange(now)) {
  if (!settings?.enabled) return { shouldSend: false, reason: 'disabled', range };
  const parts = getVietnamDateParts(now);
  const currentMinuteOfDay = (parts.hour * 60) + parts.minute;
  const targetMinuteOfDay = (Number(settings.sendHour || 0) * 60) + Number(settings.sendMinute || 0);
  if (currentMinuteOfDay < targetMinuteOfDay || currentMinuteOfDay >= (targetMinuteOfDay + 5)) {
    return { shouldSend: false, reason: 'outside-window', range };
  }
  const rangeKey = getTelegramReportRangeKey(range);
  if (String(settings.lastSentRangeKey || '') === rangeKey) {
    return { shouldSend: false, reason: 'already-sent', range, rangeKey };
  }
  return { shouldSend: true, reason: 'ready', range, rangeKey };
}

async function sendTelegramHtmlMessage({ chatId, text, botToken }) {
  const finalBotToken = String(botToken || '').trim();
  const finalChatId = String(chatId || '').trim();
  if (!finalBotToken || !finalChatId) {
    throw new Error('Missing Telegram bot token or chat id');
  }

  const response = await axios.post(
    `https://api.telegram.org/bot${finalBotToken}/sendMessage`,
    {
      chat_id: finalChatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  );

  if (response?.data?.ok !== true) {
    throw new Error(`Telegram API returned not ok: ${JSON.stringify(response?.data || {})}`);
  }

  return response.data;
}

async function buildDailyReportTelegramData(range) {
  const [historySnap, inventorySnap] = await Promise.all([
    db.collection('history').get(),
    db.collection('Inventory_Items').get(),
  ]);

  const orders = historySnap.docs
    .map(doc => ({ id: doc.id, ...(doc.data() || {}) }))
    .filter(order => {
      const status = String(order?.status || '').trim().toLowerCase();
      if (status && status !== 'completed' && status !== 'closed') return false;
      if (!status && (order?.cancelledAt || order?.cancelReason)) return false;

      const rawDate = order?.paidAt || order?.timestamp || null;
      const orderDate = rawDate instanceof Date
        ? rawDate
        : (rawDate?.toDate ? rawDate.toDate() : new Date(rawDate));
      if (!(orderDate instanceof Date) || Number.isNaN(orderDate.getTime())) return false;
      return orderDate >= range.from && orderDate < range.toExclusive;
    });
  const inventoryItems = inventorySnap.docs.map(doc => ({ id: doc.id, ...(doc.data() || {}) }));

  let revenue = 0;
  let revenueCash = 0;
  let revenueBank = 0;
  const topItemMap = new Map();

  orders.forEach(order => {
    const total = Number(order.total || 0);
    revenue += total;
    if (String(order.payMethod || '').toLowerCase() === 'bank') revenueBank += total;
    else revenueCash += total;

    const items = Array.isArray(order.items) ? order.items : [];
    items.forEach(item => {
      const name = String(item.name || 'Khong ro').trim();
      const qty = Number(item.qty || 0);
      const lineRevenue = (Number(item.price || 0) * qty);
      if (!name || !(qty > 0)) return;
      if (!topItemMap.has(name)) {
        topItemMap.set(name, {
          name,
          qty: 0,
          revenue: 0,
        });
      }
      const current = topItemMap.get(name);
      current.qty += qty;
      current.revenue += lineRevenue;
    });
  });

  const topItem = [...topItemMap.values()]
    .sort((a, b) => {
      if (b.qty !== a.qty) return b.qty - a.qty;
      return b.revenue - a.revenue;
    })[0] || null;

  const retailStocks = inventoryItems
    .filter(item => {
      if (item.hidden) return false;
      return String(item.inv_type || item.itemType || '').trim().toLowerCase() === 'retail';
    })
    .map(item => ({
      name: String(item.material_name || item.name || item.id || 'Khong ro').trim(),
      qty: Number(item.current_stock ?? item.qty ?? 0),
      unit: String(item.base_unit || item.unit || '').trim(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
    .slice(0, 50);

  return {
    rangeLabel: range.label,
    revenue,
    revenueCash,
    revenueBank,
    invoiceCount: orders.length,
    topItem,
    retailStocks,
  };
}

function buildDailyReportTelegramMessage(report) {
  const topItemLine = report.topItem
    ? `<b>${escapeTelegramHtml(report.topItem.name)}</b> - ${formatQtyVi(report.topItem.qty)} mon`
    : '<i>Chua co du lieu</i>';

  const retailLines = report.retailStocks.length
    ? report.retailStocks
      .map(item => `• <b>${escapeTelegramHtml(item.name)}</b>: ${escapeTelegramHtml(formatQtyVi(item.qty))} ${escapeTelegramHtml(item.unit)}`.trim())
      .join('\n')
    : '<i>Khong co mat hang ban thang</i>';

  return [
    '<b>📊 BAO CAO NGAY - XE KHO</b>',
    `<i>Khung gio: ${escapeTelegramHtml(report.rangeLabel)} (GMT+7)</i>`,
    '',
    '<b>Doanh thu</b>',
    `• Tong doanh thu thuc te: <b>${escapeTelegramHtml(formatCurrencyVi(report.revenue))}</b>`,
    `• Tien mat: <b>${escapeTelegramHtml(formatCurrencyVi(report.revenueCash))}</b>`,
    `• Chuyen khoan: <b>${escapeTelegramHtml(formatCurrencyVi(report.revenueBank))}</b>`,
    `• Tong so hoa don: <b>${escapeTelegramHtml(String(report.invoiceCount))}</b>`,
    '',
    '<b>Mon duoc goi nhieu nhat</b>',
    `• ${topItemLine}`,
    '',
    '<b>Ton kho mat hang ban thang</b>',
    retailLines,
  ].join('\n');
}

function buildConfiguredDailyReportTelegramMessage(report, options = {}) {
  const settings = {
    ...DEFAULT_TELEGRAM_REPORT_SETTINGS,
    ...(options || {}),
  };
  const topItemLine = report.topItem
    ? `<b>${escapeTelegramHtml(report.topItem.name)}</b> - ${formatQtyVi(report.topItem.qty)} mon`
    : '<i>Chua co du lieu</i>';

  const retailLines = report.retailStocks.length
    ? report.retailStocks
      .map(item => `â€¢ <b>${escapeTelegramHtml(item.name)}</b>: ${escapeTelegramHtml(formatQtyVi(item.qty))} ${escapeTelegramHtml(item.unit)}`.trim())
      .join('\n')
    : '<i>Khong co mat hang ban thang</i>';

  const lines = [
    settings.isTest ? '<b>🧪 BAO CAO TEST - XE KHO</b>' : '<b>ðŸ“Š BAO CAO NGAY - XE KHO</b>',
    `<i>Khung gio: ${escapeTelegramHtml(report.rangeLabel)} (GMT+7)</i>`,
  ];

  const revenueLines = [];
  if (settings.includeRevenue) {
    revenueLines.push(`â€¢ Tong doanh thu thuc te: <b>${escapeTelegramHtml(formatCurrencyVi(report.revenue))}</b>`);
  }
  if (settings.includePaymentBreakdown) {
    revenueLines.push(`â€¢ Tien mat: <b>${escapeTelegramHtml(formatCurrencyVi(report.revenueCash))}</b>`);
    revenueLines.push(`â€¢ Chuyen khoan: <b>${escapeTelegramHtml(formatCurrencyVi(report.revenueBank))}</b>`);
  }
  if (settings.includeInvoiceCount) {
    revenueLines.push(`â€¢ Tong so hoa don: <b>${escapeTelegramHtml(String(report.invoiceCount))}</b>`);
  }
  if (revenueLines.length) {
    lines.push('', '<b>Doanh thu</b>', ...revenueLines);
  }
  if (settings.includeTopItem) {
    lines.push('', '<b>Mon duoc goi nhieu nhat</b>', `â€¢ ${topItemLine}`);
  }
  if (settings.includeRetailStock) {
    lines.push('', '<b>Ton kho mat hang ban thang</b>', retailLines);
  }
  if (!revenueLines.length && !settings.includeTopItem && !settings.includeRetailStock) {
    lines.push('', '<i>Chua chon du lieu nao de gui.</i>');
  }

  return lines.join('\n');
}

function uniqueTokens(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).map(v => String(v || '').trim()).filter(Boolean))];
}

function normalizeVi(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseTimeEntity(text) {
  const t = normalizeVi(text);
  if (!t) return null;
  if (/(hom nay)\b/.test(t)) return { key: 'today', label: 'hôm nay' };
  if (/(hom qua)\b/.test(t)) return { key: 'yesterday', label: 'hôm qua' };
  if (/(tuan nay)\b/.test(t)) return { key: 'this_week', label: 'tuần này' };
  if (/(thang nay)\b/.test(t)) return { key: 'this_month', label: 'tháng này' };
  if (/(nam nay)\b/.test(t)) return { key: 'this_year', label: 'năm nay' };
  return null;
}

function buildDateRange(timeKey) {
  const now = new Date();
  const startOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const endOfDay = d => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

  if (timeKey === 'today') return { from: startOfDay(now), to: endOfDay(now) };
  if (timeKey === 'yesterday') {
    const d = new Date(now); d.setDate(d.getDate() - 1);
    return { from: startOfDay(d), to: endOfDay(d) };
  }
  if (timeKey === 'this_week') {
    const d = new Date(now);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    return { from: startOfDay(d), to: endOfDay(now) };
  }
  if (timeKey === 'this_month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: startOfDay(from), to: endOfDay(now) };
  }
  if (timeKey === 'this_year') {
    const from = new Date(now.getFullYear(), 0, 1);
    return { from: startOfDay(from), to: endOfDay(now) };
  }
  return { from: startOfDay(now), to: endOfDay(now) };
}

function extractTable(text) {
  const t = normalizeVi(text);
  const m = t.match(/\bban\s*(?:so\s*)?(\d+)\b/);
  if (!m) return null;
  return String(parseInt(m[1], 10));
}

function extractQty(text) {
  const t = normalizeVi(text);
  const m = t.match(/\b(\d+)\b/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

let cachedCatalog = { at: 0, items: [] };
async function getProductCatalog() {
  const now = Date.now();
  if (cachedCatalog.items.length && now - cachedCatalog.at < 2 * 60 * 1000) {
    return cachedCatalog.items;
  }
  const snap = await db.collection('Product_Catalog').get();
  const items = snap.docs.map(d => d.data() || {}).map(p => ({
    id: String(p.item_id || p.id || ''),
    name: String(p.display_name || p.name || ''),
    price: Number(p.price) || 0,
    category: String(p.category || ''),
  })).filter(p => p.id && p.name);
  cachedCatalog = { at: now, items };
  return items;
}

function detectItems(text, catalog) {
  const normText = normalizeVi(text);
  if (!normText) return [];
  const candidates = catalog
    .map(it => ({ ...it, norm: normalizeVi(it.name) }))
    .filter(it => it.norm.length >= 2)
    .sort((a, b) => b.norm.length - a.norm.length);

  const hits = [];
  const used = new Set();
  for (const it of candidates) {
    if (used.has(it.norm)) continue;
    const re = new RegExp(`\\b${it.norm.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`, 'i');
    if (!re.test(normText)) continue;
    hits.push({ id: it.id, name: it.name, qty: 1, price: it.price });
    used.add(it.norm);
  }
  return hits;
}

function expandTrainingPhrase(phrase, samples) {
  const p = String(phrase || '');
  if (!p) return [];

  const slotValues = {
    '%time%': ['hôm nay', 'hôm qua', 'tuần này', 'tháng này'],
    '%qty%': ['1', '2', '3', '5'],
    '%table%': ['1', '2', '3', '5', '10'],
    '%item%': samples.items.length ? samples.items : ['tiger bạc', 'ken lớn'],
  };

  let results = [p];
  Object.entries(slotValues).forEach(([slot, vals]) => {
    if (!results.some(r => r.includes(slot))) return;
    const next = [];
    results.forEach(r => {
      if (!r.includes(slot)) { next.push(r); return; }
      vals.forEach(v => next.push(r.split(slot).join(v)));
    });
    results = next.slice(0, 160);
  });
  return results;
}

let nlp = { ready: false, manager: null, trainedAt: 0 };
async function ensureNlp() {
  const now = Date.now();
  if (nlp.ready && now - nlp.trainedAt < 10 * 60 * 1000) return nlp.manager;

  const catalog = await getProductCatalog();
  const itemSamples = catalog.slice(0, 25).map(x => x.name);
  const manager = new NlpManager({ languages: ['vi'], autoSave: false, forceNER: false });
  manager.nlp.settings.autoSave = false;

  const intents = training?.intents || {};
  Object.entries(intents).forEach(([intent, meta]) => {
    const phrases = Array.isArray(meta?.phrases) ? meta.phrases : [];
    phrases.forEach(phrase => {
      const expanded = expandTrainingPhrase(phrase, { items: itemSamples });
      (expanded.length ? expanded : [String(phrase || '')]).forEach(sample => {
        manager.addDocument('vi', String(sample || ''), intent);
      });
    });
  });

  await manager.train();
  nlp = { ready: true, manager, trainedAt: now };
  return manager;
}

async function ensureOpenOrder(tableId) {
  const tid = String(tableId);
  const tableRef = db.collection('tables').doc(tid);
  const tableSnap = await tableRef.get();
  const table = tableSnap.exists ? tableSnap.data() : null;
  const existingOrderId = table?.orderId ? String(table.orderId) : null;

  if (existingOrderId) {
    const orderSnap = await db.collection('orders').doc(existingOrderId).get();
    if (orderSnap.exists) return { orderId: existingOrderId, tableName: table?.name || `Bàn ${tid}` };
  }

  const orderId = `ORD-${tid}-${Date.now()}`;
  const orderRef = db.collection('orders').doc(orderId);
  const tableName = table?.name || `Bàn ${tid}`;

  await db.runTransaction(async tx => {
    tx.set(orderRef, {
      id: orderId,
      tableId: tid,
      tableName,
      staffUid: null,
      items: [],
      discount: 0,
      discountType: 'vnd',
      shipping: 0,
      vatAmount: 0,
      note: '',
      status: 'open',
      openedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.set(tableRef, {
      status: 'occupied',
      orderId,
      openTime: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  return { orderId, tableName };
}

async function addItemsToOrder(orderId, items) {
  const orderRef = db.collection('orders').doc(orderId);
  await db.runTransaction(async tx => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) throw new Error('Đơn không tồn tại: ' + orderId);
    const current = snap.data() || {};
    const list = Array.isArray(current.items) ? current.items.map(i => ({ ...i })) : [];
    items.forEach(it => {
      const idx = list.findIndex(x => x.id === it.id && String(x.note || '') === String(it.note || ''));
      if (idx >= 0) list[idx].qty = (Number(list[idx].qty) || 1) + (Number(it.qty) || 1);
      else list.push({ ...it, qty: Number(it.qty) || 1 });
    });
    tx.update(orderRef, { items: list });
  });
}

async function queryHistoryRevenue(timeRange) {
  const fromTs = admin.firestore.Timestamp.fromDate(timeRange.from);
  const toTs = admin.firestore.Timestamp.fromDate(timeRange.to);
  const snap = await db.collection('history')
    .where('paidAt', '>=', fromTs)
    .where('paidAt', '<=', toTs)
    .get();
  const list = snap.docs.map(d => d.data() || {});
  const revenue = list.reduce((s, h) => s + (Number(h.total) || 0), 0);
  const orders = list.length;
  return { revenue, orders };
}

async function queryPurchases(timeRange, itemName) {
  const snap = await db.collection('purchases').get();
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const from = timeRange.from;
  const to = timeRange.to;
  const key = itemName ? normalizeVi(itemName) : '';

  const filtered = list.filter(p => {
    const d = p.date ? new Date(p.date) : null;
    if (!d || isNaN(d.getTime())) return false;
    if (d < from || d > to) return false;
    if (!key) return true;
    const n = normalizeVi(p.name);
    return n.includes(key) || key.includes(n);
  });

  const total = filtered.reduce((s, p) => s + (Number(p.price) || 0), 0);
  const count = filtered.length;
  return { total, count };
}

function json(res, code, data) {
  res.status(code).set('Content-Type', 'application/json; charset=utf-8').send(JSON.stringify(data));
}

exports.testDailyReportTelegram = onRequest({ region: 'asia-southeast1' }, (req, res) => {
  cors(req, res, async () => {
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

    try {
      const actor = await verifyAdminRequest(req);
      const result = await runDailyTelegramReport({
        scheduleTime: new Date().toISOString(),
        force: true,
        isTest: true,
      });

      return json(res, 200, {
        ok: true,
        actor,
        chatId: result.chatId,
        revenue: result.report?.revenue || 0,
        invoiceCount: result.report?.invoiceCount || 0,
        rangeLabel: result.report?.rangeLabel || '',
      });
    } catch (err) {
      const message = String(err?.message || err || '');
      const status = /permission/i.test(message) ? 403 : (/token/i.test(message) ? 401 : 500);
      logger.error('testDailyReportTelegram failed', {
        error: message,
        responseData: err?.response?.data || null,
      });
      return json(res, status, { ok: false, error: message || 'Request failed' });
    }
  });
});

exports.apiVoice = onRequest({ region: 'asia-southeast1' }, (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

    const text = String(req.body?.text || '').trim();
    if (!text) return json(res, 400, { error: 'No text provided' });

    logger.info('Voice command received', { text });

    try {
      const manager = await ensureNlp();
      const nlpResult = await manager.process('vi', text);
      const intent = nlpResult?.intent || 'None';
      const score = typeof nlpResult?.score === 'number' ? nlpResult.score : 0;

      const time = parseTimeEntity(text);
      const timeRange = buildDateRange(time?.key || 'today');
      const table = extractTable(text);
      const qty = extractQty(text);

      const catalog = await getProductCatalog();
      const detected = detectItems(text, catalog);
      const items = detected.map(it => ({ ...it, qty: qty || 1 }));

      if (intent === 'pos_order') {
        if (!table) return json(res, 200, { reply: 'Bạn muốn gọi món cho bàn nào ạ? Ví dụ: "Bàn 5 gọi 3 tiger bạc"' });
        if (!items.length) return json(res, 200, { reply: `Dạ em chưa nghe rõ tên món. Mời anh chị nói lại tên món cho bàn ${table} ạ!` });

        const { orderId } = await ensureOpenOrder(table);
        await addItemsToOrder(orderId, items.map(it => ({ id: it.id, name: it.name, price: it.price, qty: it.qty, note: '' })));
        const names = items.map(x => `${x.qty} ${x.name}`).join(', ');
        return json(res, 200, { reply: `Dạ em đã lên ${names} cho bàn ${table} rồi ạ!`, intent, score });
      }

      if (intent === 'pos_checkout') {
        if (!table) return json(res, 200, { reply: 'Bạn muốn tính tiền bàn nào ạ? Ví dụ: "Tính tiền bàn 5"' });
        return json(res, 200, { reply: `Dạ em đã nhận lệnh tính tiền bàn ${table}.`, intent, score });
      }

      if (intent === 'query_inventory') {
        if (!items.length) return json(res, 200, { reply: 'Bạn muốn kiểm tra tồn kho món/nguyên liệu nào ạ?' });
        const invSnap = await db.collection('inventory').get();
        const inv = invSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const key = normalizeVi(items[0].name);
        const hit = inv.find(i => normalizeVi(i.name) === key) || inv.find(i => normalizeVi(i.name).includes(key) || key.includes(normalizeVi(i.name)));
        if (!hit) return json(res, 200, { reply: `Không tìm thấy "${items[0].name}" trong kho.`, intent, score });
        return json(res, 200, { reply: `Tồn kho ${hit.name}: ${Number(hit.qty) || 0} ${hit.unit || ''}`.trim(), intent, score });
      }

      if (intent === 'query_sales') {
        const { revenue, orders } = await queryHistoryRevenue(timeRange);
        const label = time?.label || 'hôm nay';
        return json(res, 200, { reply: `Doanh thu ${label}: ${revenue.toLocaleString('vi-VN')}đ (${orders} đơn).`, intent, score });
      }

      if (intent === 'query_import') {
        const label = time?.label || 'hôm nay';
        const focus = items[0]?.name || null;
        const s = await queryPurchases(timeRange, focus);
        const itemLabel = focus ? ` ${focus}` : '';
        return json(res, 200, { reply: `Nhập hàng${itemLabel} ${label}: ${s.total.toLocaleString('vi-VN')}đ (${s.count} lần).`, intent, score });
      }

      return json(res, 200, { reply: 'Em chưa hiểu lệnh này. Anh chị nói rõ hơn giúp em nhé.', intent, score });
    } catch (err) {
      logger.error('apiVoice error', err);
      return json(res, 200, { reply: 'Có lỗi khi xử lý lệnh. Vui lòng thử lại.' });
    }
  });
});

exports.onHistoryOrderCancelled = onDocumentUpdated(
  { document: 'history/{historyId}', region: 'asia-southeast1' },
  async event => {
    const before = event.data?.before?.data() || null;
    const after = event.data?.after?.data() || null;
    if (!after) return;
    if (String(before?.status || '').toLowerCase() === 'cancelled') return;
    if (String(after.status || '').toLowerCase() !== 'cancelled') return;
    if (after.inventoryRestockedAt) return;

    const restockMap = await buildRestockMapFromHistoryOrder(after);
    const orderRef = event.data.after.ref;
    const inventoryIds = Object.keys(restockMap);

    await db.runTransaction(async tx => {
      const invSnaps = await Promise.all(inventoryIds.map(id => tx.get(db.collection('Inventory_Items').doc(id))));

      invSnaps.forEach(snap => {
        if (!snap.exists) return;
        const addQty = Number(restockMap[snap.id] || 0);
        if (!(addQty > 0)) return;
        const currentQty = Number(snap.data().current_stock ?? snap.data().qty ?? 0);
        tx.update(snap.ref, { current_stock: currentQty + addQty });
      });

      tx.update(orderRef, {
        inventoryRestockedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    logger.info('Restocked inventory for cancelled history order', {
      historyId: event.params.historyId,
      cancelReason: after.cancelReason || '',
      itemCount: Array.isArray(after.items) ? after.items.length : 0,
      inventoryCount: inventoryIds.length,
    });
  }
);

exports.onKitchenNotificationCreated = onDocumentCreated(
  {
    document: 'kitchen_notifications/{docId}',
    region: 'asia-southeast1',
  },
  async event => {
    const notif = event.data?.data() || null;
    const docId = event.params?.docId;
    if (!notif || !docId) return;

    const type = String(notif.type || '').toLowerCase();
    if (!['ready', 'delay'].includes(type)) return;
    if (notif.zaloSent === true) return;

    const settingsSnap = await db.collection('config').doc('settings').get().catch(() => null);
    const settings = settingsSnap?.exists ? (settingsSnap.data() || {}) : {};
    if (settings.zaloOaEnabled === false) {
      logger.info('Skipping Zalo send: disabled in settings', { docId, type });
      return;
    }
    if (type === 'ready' && settings.zaloNotifyReady === false) {
      logger.info('Skipping Zalo send: ready notifications disabled', { docId });
      return;
    }
    if (type === 'delay' && settings.zaloNotifyDelay === false) {
      logger.info('Skipping Zalo send: delay notifications disabled', { docId });
      return;
    }

    const token = ZALO_OA_ACCESS_TOKEN.value();
    const groupId = String(ZALO_GROUP_ID.value() || '').trim();
    if (!token || !groupId) {
      logger.warn('Skipping Zalo send: missing config', { docId, hasToken: !!token, hasGroupId: !!groupId });
      return;
    }

    const { zaloText } = buildKitchenNotifMessage(notif);
    const prefix = String(settings.zaloMessagePrefix || '[XE KHO POS]').trim();
    const groupLabel = String(settings.zaloGroupLabel || '').trim();
    const normalizedZaloText = String(zaloText || '')
      .replace('[XE KHO POS]', prefix)
      .trim();
    const finalZaloText = groupLabel
      ? `${normalizedZaloText}\nNhom: ${groupLabel}`
      : normalizedZaloText;
    if (!finalZaloText) return;

    try {
      const res = await fetch('https://openapi.zalo.me/v2.0/oa/message/cs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          access_token: token,
        },
        body: JSON.stringify({
          recipient: { group_id: groupId },
          message: { text: finalZaloText },
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        logger.error('Zalo OA send failed', { docId, status: res.status, data });
        return;
      }

      await kitchenNotifDocRef(docId).set({
        zaloSent: true,
        zaloSentAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      logger.info('Zalo OA message sent', { docId, type });
    } catch (err) {
      logger.error('Zalo OA send exception', { docId, error: err?.message || String(err) });
    }
  }
);

exports.sendPushOnKitchenNotif = onDocumentCreated(
  {
    document: 'kitchen_notifications/{docId}',
    region: 'asia-southeast1',
  },
  async event => {
    const notif = event.data?.data() || null;
    const docId = event.params?.docId;
    if (!notif || !docId) return;
    if (notif.pushSent === true) return;

    const usersSnap = await db.collection('users')
      .where('role', 'in', ['staff', 'admin', 'manager'])
      .get();

    const tokens = [];
    const tokenOwners = new Map();
    usersSnap.forEach(docSnap => {
      const data = docSnap.data() || {};
      const userTokens = uniqueTokens(data.fcmTokens || []);
      userTokens.forEach(token => {
        tokens.push(token);
        tokenOwners.set(token, docSnap.ref);
      });
    });

    const unique = uniqueTokens(tokens);
    if (!unique.length) {
      logger.info('Skipping push send: no FCM tokens', { docId });
    } else {
      const { title, body } = buildKitchenNotifMessage(notif);

      try {
        const response = await admin.messaging().sendEachForMulticast({
          tokens: unique,
          notification: {
            title,
            body: body || String(notif.message || ''),
          },
          data: {
            type: String(notif.type || ''),
            tableId: String(notif.tableId || ''),
            tableName: String(notif.tableName || ''),
            orderId: String(notif.orderId || ''),
          },
          webpush: {
            notification: {
              icon: '/kitchen-icon.svg',
              badge: '/kitchen-badge.svg',
              tag: 'kitchen-alert',
              renotify: true,
            },
          },
        });

        const invalidByUser = new Map();
        response.responses.forEach((item, index) => {
          if (item.success) return;
          const code = String(item.error?.code || '');
          const token = unique[index];
          if (!token) return;
          if (!['messaging/registration-token-not-registered', 'messaging/invalid-argument'].includes(code)) return;
          const ownerRef = tokenOwners.get(token);
          if (!ownerRef) return;
          if (!invalidByUser.has(ownerRef.path)) invalidByUser.set(ownerRef.path, { ref: ownerRef, tokens: [] });
          invalidByUser.get(ownerRef.path).tokens.push(token);
        });

        await Promise.all([...invalidByUser.values()].map(({ ref, tokens: badTokens }) =>
          ref.set({
            fcmTokens: admin.firestore.FieldValue.arrayRemove(...badTokens),
          }, { merge: true })
        ));

        await kitchenNotifDocRef(docId).set({
          pushSent: true,
          pushSentAt: admin.firestore.FieldValue.serverTimestamp(),
          pushTargetCount: unique.length,
        }, { merge: true });

        logger.info('Kitchen push sent', {
          docId,
          successCount: response.successCount,
          failureCount: response.failureCount,
          tokenCount: unique.length,
        });
      } catch (err) {
        logger.error('Kitchen push send exception', { docId, error: err?.message || String(err) });
      }
    }

    if (String(notif.type || '').toLowerCase() !== 'ready') return;
    if (notif.telegramSent === true) return;

    const telegramBotToken = TELEGRAM_BOT_TOKEN.value();
    const telegramGroupChatId = String(TELEGRAM_GROUP_CHAT_ID.value() || '').trim();
    if (!telegramBotToken || !telegramGroupChatId) {
      logger.warn('Skipping Telegram send: missing config', {
        docId,
        hasBotToken: !!telegramBotToken,
        hasGroupChatId: !!telegramGroupChatId,
      });
      return;
    }

    try {
      const telegramText = buildTelegramFoodReadyMessage(notif);
      const response = await axios.post(
        `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
        {
          chat_id: telegramGroupChatId,
          text: telegramText,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      if (response?.data?.ok !== true) {
        logger.error('Telegram send failed', { docId, data: response?.data || null });
        return;
      }

      await kitchenNotifDocRef(docId).set({
        telegramSent: true,
        telegramSentAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      logger.info('Telegram ready notification sent', {
        docId,
        chatId: telegramGroupChatId,
      });
    } catch (err) {
      logger.error('Telegram send exception', {
        docId,
        error: err?.message || String(err),
        responseData: err?.response?.data || null,
      });
    }
  }
);

async function verifyAdminRequest(req) {
  const authHeader = String(req.headers?.authorization || '');
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error('Missing bearer token');

  const decoded = await admin.auth().verifyIdToken(match[1]);
  const email = String(decoded.email || '').trim().toLowerCase();
  const userSnap = await db.collection('users').doc(String(decoded.uid || '')).get().catch(() => null);
  const role = String(userSnap?.exists ? (userSnap.data()?.role || '') : '').trim().toLowerCase();
  const isAdmin = ['admin', 'owner', 'superadmin', 'manager'].includes(role) || email === OWNER_EMAIL;
  if (!isAdmin) throw new Error('Permission denied');
  return {
    uid: decoded.uid,
    email: decoded.email || '',
    role: role || (email === OWNER_EMAIL ? 'admin' : ''),
  };
}

async function runDailyTelegramReport({ scheduleTime = null, force = false, isTest = false } = {}) {
  const telegramBotToken = String(TELEGRAM_BOT_TOKEN.value() || '').trim();
  const telegramReportChatId = String(TELEGRAM_REPORT_CHAT_ID.value() || TELEGRAM_GROUP_CHAT_ID.value() || '').trim();
  if (!telegramBotToken || !telegramReportChatId) {
    logger.warn('Skipping dailyReportTelegram: missing Telegram config', {
      hasBotToken: !!telegramBotToken,
      hasReportChatId: !!telegramReportChatId,
    });
    return { skipped: true, reason: 'missing-config' };
  }

  const settingsRef = db.collection('config').doc('settings');
  const settingsSnap = await settingsRef.get().catch(() => null);
  const rawSettings = settingsSnap?.exists ? (settingsSnap.data() || {}) : {};
  const telegramSettings = getTelegramReportSettings(rawSettings);
  const range = getVietnamBusinessReportRange();
  const scheduleCheck = shouldSendTelegramReportNow(telegramSettings, new Date(), range);

  if (!force && !scheduleCheck.shouldSend) {
    logger.info('Skipping dailyReportTelegram by settings', {
      reason: scheduleCheck.reason,
      rangeLabel: range.label,
      sendHour: telegramSettings.sendHour,
      sendMinute: telegramSettings.sendMinute,
      enabled: telegramSettings.enabled,
    });
    return { skipped: true, reason: scheduleCheck.reason, rangeLabel: range.label };
  }

  const report = await buildDailyReportTelegramData(range);
  const message = buildConfiguredDailyReportTelegramMessage(report, {
    ...telegramSettings,
    isTest,
  });
  await sendTelegramHtmlMessage({
    chatId: telegramReportChatId,
    text: message,
    botToken: telegramBotToken,
  });

  const rangeKey = scheduleCheck.rangeKey || getTelegramReportRangeKey(range);
  if (!isTest) {
    await settingsRef.set({
      telegramReportLastSentAt: admin.firestore.FieldValue.serverTimestamp(),
      telegramReportLastSentRangeKey: rangeKey,
    }, { merge: true });
  } else {
    await settingsRef.set({
      telegramReportLastTestAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  logger.info('Daily Telegram report sent', {
    scheduleTime,
    chatId: telegramReportChatId,
    invoiceCount: report.invoiceCount,
    revenue: report.revenue,
    rangeLabel: report.rangeLabel,
    isTest,
    force,
  });

  return {
    ok: true,
    chatId: telegramReportChatId,
    report,
    rangeKey,
  };
}

exports.dailyReportTelegram = onSchedule(
  {
    schedule: '*/5 * * * *',
    timeZone: 'Asia/Ho_Chi_Minh',
    region: 'asia-southeast1',
  },
  async event => {
    try {
      await runDailyTelegramReport({
        scheduleTime: event.scheduleTime || null,
      });
    } catch (err) {
      logger.error('dailyReportTelegram failed', {
        error: err?.message || String(err),
        responseData: err?.response?.data || null,
        scheduleTime: event.scheduleTime || null,
      });
    }
  }
);

function pickProvider() {
  const p = String(AI_PROVIDER.value() || '').trim().toLowerCase();
  if (p === 'deepseek' || p === 'gemini') return p;
  return 'none';
}

function extractFirstJson(text) {
  const raw = String(text || '');
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(raw.slice(start, end + 1)); } catch (_) { return null; }
}

async function callDeepSeek(userText) {
  const apiKey = DEEPSEEK_API_KEY.value();
  if (!apiKey) throw new Error('Missing DEEPSEEK_API_KEY');
  const endpoint = DEEPSEEK_ENDPOINT.value().replace(/\/+$/, '');
  const model = DEEPSEEK_MODEL.value();
  const system = [
    'Bạn là NLU cho POS quán ăn. Hãy trả về 1 JSON duy nhất KHÔNG kèm giải thích.',
    'Schema:',
    '{ "intent":"query_import|query_sales|query_inventory|pos_order|pos_checkout|unknown", "time_scope":"today|yesterday|this_week|this_month|this_year|null", "table_id":"<so ban>|null", "line_items":[{"name":"<ten mon>", "qty":1}], "reply":"<cau tra loi>" }',
  ].join('\n');

  const payload = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userText },
    ],
    temperature: 0.2,
  };

  const res = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || 'DeepSeek API error');
  const content = data?.choices?.[0]?.message?.content || '';
  const parsed = extractFirstJson(content);
  if (!parsed) throw new Error('DeepSeek returned non-JSON');
  return parsed;
}

async function callGemini(userText) {
  const apiKey = GEMINI_API_KEY.value();
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY');
  const model = GEMINI_MODEL.value();
  const system = [
    'Bạn là NLU cho POS quán ăn. Hãy trả về 1 JSON duy nhất KHÔNG kèm giải thích.',
    'Schema:',
    '{ "intent":"query_import|query_sales|query_inventory|pos_order|pos_checkout|unknown", "time_scope":"today|yesterday|this_week|this_month|this_year|null", "table_id":"<so ban>|null", "line_items":[{"name":"<ten mon>", "qty":1}], "reply":"<cau tra loi>" }',
  ].join('\n');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `${system}\n\nCâu lệnh: ${userText}` }] }],
      generationConfig: { temperature: 0.2 },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || 'Gemini API error');
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
  const parsed = extractFirstJson(text);
  if (!parsed) throw new Error('Gemini returned non-JSON');
  return parsed;
}

exports.aiStatus = onRequest({
  region: 'asia-southeast1',
  secrets: [DEEPSEEK_API_KEY, GEMINI_API_KEY],
}, (req, res) => {
  cors(req, res, () => {
    if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'Method not allowed' });
    const provider = pickProvider();
    const deepseekOk = !!DEEPSEEK_API_KEY.value();
    const geminiOk = !!GEMINI_API_KEY.value();
    return json(res, 200, {
      ok: true,
      provider,
      deepseekOk,
      geminiOk,
      region: 'asia-southeast1',
    });
  });
});

exports.aiRouter = onRequest({
  region: 'asia-southeast1',
  secrets: [DEEPSEEK_API_KEY, GEMINI_API_KEY],
}, (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });

    const text = String(req.body?.text || '').trim();
    const previewOnly = req.body?.previewOnly !== false;
    if (!text) return json(res, 400, { ok: false, error: 'No text provided' });

    try {
      const manager = await ensureNlp();
      const base = await manager.process('vi', text);
      let intent = base?.intent || 'unknown';
      let confidence = typeof base?.score === 'number' ? base.score : 0;

      const time = parseTimeEntity(text);
      const time_scope = time?.key || 'today';
      const timeRange = buildDateRange(time_scope);
      const table_id = extractTable(text);
      const qty = extractQty(text) || 1;

      const catalog = await getProductCatalog();
      const detected = detectItems(text, catalog);
      const line_items = detected.map(it => ({ name: it.name, qty }));

      const provider = pickProvider();
      if ((intent === 'None' || confidence < 0.55) && provider !== 'none') {
        try {
          const parsed = provider === 'gemini' ? await callGemini(text) : await callDeepSeek(text);
          intent = String(parsed.intent || intent);
          confidence = Math.max(confidence, 0.65);
          if (parsed.time_scope) {
            const normalized = String(parsed.time_scope);
            if (['today', 'yesterday', 'this_week', 'this_month', 'this_year'].includes(normalized)) {
              timeRange.from = buildDateRange(normalized).from;
              timeRange.to = buildDateRange(normalized).to;
            }
          }
        } catch (llmErr) {
          logger.warn('aiRouter LLM fallback error', llmErr);
        }
      }

      const intentJson = {
        intent,
        confidence,
        time_scope,
        table_id: table_id || null,
        line_items,
      };

      let reply = '';
      let execution = null;

      if (intent === 'pos_order') {
        if (!table_id) {
          return json(res, 200, { ok: true, intentJson, needs_clarification: true, reply: 'Bạn muốn gọi món cho bàn nào ạ? Ví dụ: "Bàn 5 gọi 3 tiger bạc"' });
        }
        if (!line_items.length) {
          return json(res, 200, { ok: true, intentJson, needs_clarification: true, reply: `Dạ em chưa nghe rõ tên món. Mời anh chị nói lại tên món cho bàn ${table_id} ạ!` });
        }

        const resolved = detected.map(it => ({ id: it.id, name: it.name, price: it.price, qty, note: '' }));
        execution = {
          intent: 'pos_order',
          data: {
            client_action: {
              tableId: table_id,
              items: resolved.map(it => ({ id: it.id, qty: it.qty })),
            },
          },
        };

        if (!previewOnly) {
          const { orderId } = await ensureOpenOrder(table_id);
          await addItemsToOrder(orderId, resolved);
        }

        reply = `Dạ em đã lên ${resolved.map(x => `${x.qty} ${x.name}`).join(', ')} cho bàn ${table_id} rồi ạ!`;
      } else if (intent === 'pos_checkout') {
        if (!table_id) {
          return json(res, 200, { ok: true, intentJson, needs_clarification: true, reply: 'Bạn muốn tính tiền bàn nào ạ? Ví dụ: "Tính tiền bàn 5"' });
        }
        execution = { intent: 'pos_checkout', data: { client_action: { tableId: table_id } } };
        reply = `Dạ em đã nhận lệnh tính tiền bàn ${table_id}.`;
      } else if (intent === 'query_sales') {
        const s = await queryHistoryRevenue(timeRange);
        reply = `Doanh thu ${time?.label || 'hôm nay'}: ${s.revenue.toLocaleString('vi-VN')}đ (${s.orders} đơn).`;
      } else if (intent === 'query_import') {
        const focus = line_items[0]?.name || null;
        const s = await queryPurchases(timeRange, focus);
        const itemLabel = focus ? ` ${focus}` : '';
        reply = `Nhập hàng${itemLabel} ${time?.label || 'hôm nay'}: ${s.total.toLocaleString('vi-VN')}đ (${s.count} lần).`;
      } else if (intent === 'query_inventory') {
        const focus = line_items[0]?.name || null;
        if (!focus) {
          return json(res, 200, { ok: true, intentJson, needs_clarification: true, reply: 'Bạn muốn kiểm tra tồn kho món/nguyên liệu nào ạ?' });
        }
        const invSnap = await db.collection('inventory').get();
        const inv = invSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const key = normalizeVi(focus);
        const hit = inv.find(i => normalizeVi(i.name) === key) || inv.find(i => normalizeVi(i.name).includes(key) || key.includes(normalizeVi(i.name)));
        if (!hit) reply = `Không tìm thấy "${focus}" trong kho.`;
        else reply = `Tồn kho ${hit.name}: ${Number(hit.qty) || 0} ${hit.unit || ''}`.trim();
      } else {
        reply = 'Em chưa hiểu lệnh này. Anh chị nói rõ hơn giúp em nhé.';
      }

      return json(res, 200, {
        ok: true,
        provider: pickProvider(),
        intentJson,
        execution,
        reply,
      });
    } catch (err) {
      logger.error('aiRouter error', err);
      return json(res, 200, { ok: false, error: 'AI router failed' });
    }
  });
});
