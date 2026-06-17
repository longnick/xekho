const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { setGlobalOptions } = require('firebase-functions/v2');
const logger = require('firebase-functions/logger');
const { defineSecret, defineString } = require('firebase-functions/params');
const axios = require('axios');
const cors = require('cors')({ origin: true });
const admin = require('firebase-admin');
const crypto = require('crypto');
const sharp = require('sharp');
const {
  getVertexCredentials,
  getVertexAuthContexts,
  generateVertexText,
  generateVertexImage,
  probeVertexText,
  collectTextFromPayload,
  collectFunctionCalls,
  collectInlineImage,
} = require('./vertexAi');
const textUtils = require('./utils/text');
const telegramSend = require('./telegram/send');
const telegramKitchen = require('./telegram/kitchen');
const telegramReports = require('./telegram/reports');
const telegramAds = require('./telegram/ads');
const telegramOrders = require('./telegram/orders');
const telegramOnlineOrders = require('./telegram/online-orders');
const generalUtils = require('./utils/general');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
telegramAds.setAdsRevenueDataDependencies({
  queryHistoryRevenue,
  queryManualAdsDailyStats,
  fetchMetaAdsInsights,
  loadTelegramReportFinancialProfile,
});
let cachedAiDeps = null;

function getAiDeps() {
  if (cachedAiDeps) return cachedAiDeps;
  cachedAiDeps = {
    NlpManager: require('node-nlp').NlpManager,
    training: require('./POS_NLU_Training.json'),
    geminiTools: require('./geminiTools').geminiTools,
    ...require('./firestoreMegaTools'),
  };
  return cachedAiDeps;
}

function chunkArray(arr, size) { return textUtils.chunkArray(arr, size); }

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

const AI_PROVIDER = defineString('AI_PROVIDER', { default: 'vertex' });
const DEEPSEEK_API_KEY = defineSecret('DEEPSEEK_API_KEY');
const DEEPSEEK_ENDPOINT = defineString('DEEPSEEK_ENDPOINT', { default: 'https://api.deepseek.com' });
const DEEPSEEK_MODEL = defineString('DEEPSEEK_MODEL', { default: 'deepseek-chat' });
const VERTEX_SERVICE_ACCOUNT_JSON = defineSecret('VERTEX_SERVICE_ACCOUNT_JSON');
const VERTEX_PROJECT_ID = defineString('VERTEX_PROJECT_ID', { default: 'pos-v2-909ff' });
const VERTEX_LOCATION = defineString('VERTEX_LOCATION', { default: 'global' });
const VERTEX_TEXT_MODEL = defineString('VERTEX_TEXT_MODEL', { default: 'gemini-3.5-flash' });
const VERTEX_IMAGE_MODEL = defineString('VERTEX_IMAGE_MODEL', { default: 'imagen-3.0-generate-001' });
const ZALO_OA_ACCESS_TOKEN = defineString('ZALO_OA_ACCESS_TOKEN', { default: '' });
const ZALO_GROUP_ID = defineString('ZALO_GROUP_ID', { default: '' });
const TELEGRAM_BOT_TOKEN = defineString('TELEGRAM_BOT_TOKEN', { default: '' });
const TELEGRAM_GROUP_CHAT_ID = defineString('TELEGRAM_GROUP_CHAT_ID', { default: '' });
const TELEGRAM_REPORT_CHAT_ID = defineString('TELEGRAM_REPORT_CHAT_ID', { default: '' });
const TELEGRAM_REPORT_BOT_TOKEN = defineString('TELEGRAM_REPORT_BOT_TOKEN', { default: '' });
const TELEGRAM_OWNER_CHAT_ID = defineString('TELEGRAM_OWNER_CHAT_ID', { default: '' });
const TELEGRAM_ASSISTANT_BOT_NAME = defineString('TELEGRAM_ASSISTANT_BOT_NAME', { default: 'XE KHO Owner Assistant' });
const TELEGRAM_COMPLETED_ORDER_CHAT_ID = defineString('TELEGRAM_COMPLETED_ORDER_CHAT_ID', { default: '' });
const TELEGRAM_KITCHEN_READY_CHAT_ID = defineString('TELEGRAM_KITCHEN_READY_CHAT_ID', { default: '' });
const TELEGRAM_KITCHEN_READY_BOT_TOKEN = defineString('TELEGRAM_KITCHEN_READY_BOT_TOKEN', { default: '' });
const META_AD_ACCOUNT_ID = defineString('META_AD_ACCOUNT_ID', { default: '' });
const META_ACCESS_TOKEN = defineString('META_ACCESS_TOKEN', { default: '' });
const KITCHEN_NEW_ORDER_TELEGRAM_CHAT_ID = defineString('KITCHEN_NEW_ORDER_TELEGRAM_CHAT_ID', { default: '' });
const OWNER_EMAIL = 'owner@ganhkho.vn';
const DEFAULT_TELEGRAM_OWNER_CHAT_ID = '6496387732';
const DEFAULT_REGION = 'asia-southeast1';
const HEAVY_FUNCTION_MEMORY = '512MiB';
const FUNCTIONS_RUNTIME_SERVICE_ACCOUNT = 'functions-runtime@pos-v2-909ff.iam.gserviceaccount.com';

// Many functions share a large dependency graph (sharp, admin SDK, etc.).
// Using 512MiB prevents Gen2 container startup OOM for low-traffic triggers.
// serviceAccount: replaces deleted default compute SA (774115283908-compute@developer.gserviceaccount.com)
// Configured runtime service account explicitly to bypass compute SA if possible
setGlobalOptions({ region: DEFAULT_REGION, memory: HEAVY_FUNCTION_MEMORY, serviceAccount: FUNCTIONS_RUNTIME_SERVICE_ACCOUNT });

function getVertexRuntimeConfig() {
  let secretJson = '';
  try {
    secretJson = String(VERTEX_SERVICE_ACCOUNT_JSON.value() || '').trim();
  } catch (_) {
    secretJson = '';
  }
  const credentialProjectId = String(getVertexCredentials(secretJson)?.project_id || '').trim();
  const configuredProjectId = String(VERTEX_PROJECT_ID.value() || '').trim();
  return {
    secretJson,
    projectId:
      (
        configuredProjectId &&
        configuredProjectId !== 'pos-v2-909ff'
      )
        ? configuredProjectId
        : (credentialProjectId || configuredProjectId || 'pos-v2-909ff'),
    location: String(VERTEX_LOCATION.value() || '').trim() || 'global',
    textModel: String(VERTEX_TEXT_MODEL.value() || '').trim() || 'gemini-3.5-flash',
    imageModel: String(VERTEX_IMAGE_MODEL.value() || '').trim() || 'imagen-3.0-generate-001',
  };
}

function getBigQueryRuntimeConfig() {
  return {
    enabled: true,
    projectId: String(process.env.BIGQUERY_PROJECT_ID || VERTEX_PROJECT_ID.value() || 'pos-v2-909ff').trim(),
    datasetId: String(process.env.BIGQUERY_DATASET_ID || '').trim(),
    salesTable: String(process.env.BIGQUERY_SALES_TABLE || '').trim(),
  };
}

function buildVertexTextModels(preferredModel = '') {
  return [
    preferredModel,
    getVertexRuntimeConfig().textModel,
    'gemini-3.5-flash',
    'gemini-2.0-flash-001',
    'gemini-2.0-flash',
  ].filter((name, index, arr) => name && arr.indexOf(name) === index);
}

function buildVertexImageModels(preferredModel = '') {
  return [
    preferredModel,
    getVertexRuntimeConfig().imageModel,
    'imagen-3.0-generate-001',
    'imagen-4.0-fast-generate-001',
  ].filter((name, index, arr) => name && arr.indexOf(name) === index);
}

async function runVertexToolLoop({
  userParts = [],
  systemInstruction = '',
  source = 'vertex',
  chatId = '',
  userId = '',
  username = '',
  noPersist = false,
  previewOnly = false,
}) {
  const { geminiTools, executeGeminiTool } = getAiDeps();
  const vertexConfig = getVertexRuntimeConfig();
  const contents = [{ role: 'user', parts: userParts }];
  const toolResults = [];
  let finalPayload = null;

  for (let i = 0; i < 6; i += 1) {
    const { payload } = await generateVertexText({
      secretJson: vertexConfig.secretJson,
      projectId: vertexConfig.projectId,
      location: vertexConfig.location,
      modelNames: buildVertexTextModels(),
      contents,
      tools: geminiTools,
      systemInstruction,
      generationConfig: {
        temperature: 0.2,
      },
    });

    finalPayload = payload;
    const functionCalls = collectFunctionCalls(payload);
    if (!functionCalls.length) {
      return {
        text: collectTextFromPayload(payload).trim(),
        pendingActions: extractPendingActionsFromToolResults(toolResults),
        toolResults,
        payload,
      };
    }

    contents.push({
      role: 'model',
      // Preserve the original functionCall parts exactly as returned by Gemini.
      // Newer Gemini/Vertex models attach thoughtSignature metadata to function-call
      // parts and require it on the follow-up request that provides tool responses.
      parts: functionCalls.map((call) => call.part || ({
        functionCall: {
          name: call.name,
          args: call.args || {},
        },
      })),
    });

    const functionResponseParts = [];
    for (const functionCall of functionCalls) {
      const toolResult = await executeGeminiTool(functionCall, {
        db,
        chatId,
        userId,
        username,
        source,
        noPersist,
        previewOnly,
        bigQueryConfig: getBigQueryRuntimeConfig(),
      });
      toolResults.push(toolResult);
      functionResponseParts.push({
        functionResponse: {
          name: functionCall.name,
          response: toolResult,
        },
      });
    }

    contents.push({
      role: 'user',
      parts: functionResponseParts,
    });
  }

  return {
    text: collectTextFromPayload(finalPayload).trim(),
    pendingActions: extractPendingActionsFromToolResults(toolResults),
    toolResults,
    payload: finalPayload,
  };
}

function kitchenNotifDocRef(docId) {
  return db.collection('kitchen_notifications').doc(String(docId));
}

function buildKitchenNotifMessage(notif = {}, options = {}) {
  return telegramKitchen.buildKitchenNotifMessage(notif, options);
}

function parseKitchenItemSummary(itemText = '') {
  return telegramKitchen.parseKitchenItemSummary(itemText);
}

function buildTelegramFoodReadyMessage(notif = {}) {
  return telegramKitchen.buildTelegramFoodReadyMessage(notif);
}

function isKitchenOrderItemForTelegram(item = {}) {
  return telegramKitchen.isKitchenOrderItemForTelegram(item);
}

function getKitchenOrderItemKey(item = {}, index = 0) {
  return telegramKitchen.getKitchenOrderItemKey(item, index);
}

function getNewPendingKitchenItems(afterItems = [], beforeItems = []) {
  return telegramKitchen.getNewPendingKitchenItems(afterItems, beforeItems);
}

function buildTelegramNewKitchenOrderMessage(order = {}, rows = []) {
  return telegramKitchen.buildTelegramNewKitchenOrderMessage(order, rows);
}

function buildTelegramFoodReadyMessageClean(notif = {}) {
  return telegramKitchen.buildTelegramFoodReadyMessageClean(notif);
}

function buildTelegramNewKitchenOrderMessageClean(order = {}, rows = []) {
  return telegramKitchen.buildTelegramNewKitchenOrderMessageClean(order, rows);
}

async function sendKitchenNewOrderTelegram(orderId, order = {}, rows = []) {
  const botToken = getTelegramReportBotToken();
  const chatId = String(KITCHEN_NEW_ORDER_TELEGRAM_CHAT_ID.value() || TELEGRAM_GROUP_CHAT_ID.value() || '').trim();
  if (!botToken || !chatId || !rows.length) {
    logger.warn('Skipping kitchen new-order Telegram: missing token/chat/items', {
      orderId,
      hasBotToken: !!botToken,
      chatId,
      itemCount: rows.length,
    });
    return;
  }

  const unsentRows = [];
  for (const row of rows) {
    const dedupeId = `${String(orderId || '').replace(/[^A-Za-z0-9_-]/g, '_')}__${String(row.key || '').replace(/[^A-Za-z0-9_-]/g, '_')}`;
    const ref = db.collection('telegram_kitchen_new_order_sent').doc(dedupeId.slice(0, 1400));
    const created = await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (snap.exists) return false;
      tx.set(ref, {
        orderId: String(orderId || ''),
        tableId: String(order.tableId || ''),
        tableName: String(order.tableName || ''),
        itemKey: String(row.key || ''),
        itemName: String(row.item?.name || ''),
        qty: Number(row.item?.qty || 0),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return true;
    });
    if (created) unsentRows.push(row);
  }

  if (!unsentRows.length) {
    logger.info('Skipping kitchen new-order Telegram: all items already sent', { orderId });
    return;
  }

  const enrichedRows = await Promise.all(unsentRows.map(async row => {
    const [item] = await enrichTelegramItemsWithCatalog([row.item || {}]);
    return { ...row, item: item || row.item || {} };
  }));
  const text = buildTelegramNewKitchenOrderMessageClean(order, enrichedRows);
  await sendTelegramHtmlMessage({ chatId, text, botToken });
  logger.info('Kitchen new-order Telegram sent', {
    orderId,
    chatId,
    itemCount: unsentRows.length,
  });
}

function escapeTelegramHtml(text) { return textUtils.escapeTelegramHtml(text); }

function scoreTelegramTextQuality(text = '') { return textUtils.scoreTelegramTextQuality(text); }

function fixTelegramMojibake(text = '') { return textUtils.fixTelegramMojibake(text); }

function normalizeTelegramText(value = '') { return textUtils.normalizeTelegramText(value); }

function normalizeTelegramTextPreserveLines(value = '') { return textUtils.normalizeTelegramTextPreserveLines(value); }

function getTelegramProductDisplayName(product = {}, fallback = 'Món') { return textUtils.getTelegramProductDisplayName(product, fallback); }

function shouldPreferTelegramCatalogName(currentName = '', product = {}) { return textUtils.shouldPreferTelegramCatalogName(currentName, product); }

async function enrichTelegramItemsWithCatalog(items = []) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return [];
  const productMap = await loadProductsByIds(list.map(item => item?.id || item?.menuItemId || item?.productId));
  return list.map(item => {
    const product = productMap.get(String(item?.id || item?.menuItemId || item?.productId || '').trim()) || {};
    const rawName = String(item?.name || item?.productName || '').trim();
    const nextName = shouldPreferTelegramCatalogName(rawName, product)
      ? getTelegramProductDisplayName(product, rawName || 'Món')
      : normalizeTelegramText(rawName || 'Món');
    return {
      ...item,
      name: nextName || 'Món',
      productName: nextName || 'Món',
    };
  });
}

function formatCurrencyVi(amount) { return textUtils.formatCurrencyVi(amount); }

function formatQtyVi(amount) { return textUtils.formatQtyVi(amount); }

function normalizeTelegramSmartReportText(value = '') {
  return telegramReports.normalizeTelegramSmartReportText(value);
}

function normalizeTelegramWildcardText(value = '') {
  return telegramReports.normalizeTelegramWildcardText(value);
}

function buildTelegramWildcardRegex(value = '') {
  return telegramReports.buildTelegramWildcardRegex(value);
}

function parseTelegramLooseDateTime(value = '', fallbackNow = new Date()) {
  return telegramReports.parseTelegramLooseDateTime(value, fallbackNow);
}

function formatTelegramSmartRangeLabel(from, toExclusive) {
  return telegramReports.formatTelegramSmartRangeLabel(from, toExclusive);
}

function parseTelegramSmartReportIntent(userText = '') {
  return telegramReports.parseTelegramSmartReportIntent(userText);
}

function isTelegramAssistantCapabilityQuestion(userText = '') {
  const normalized = normalizeTelegramSmartReportText(userText);
  return /\b(ban|em|bot|tro ly|ai)\b.*\b(co the lam gi|lam duoc gi|giup duoc gi|biet lam gi)\b/.test(normalized)
    || /\b(co the lam gi|lam duoc gi|giup duoc gi|biet lam gi)\b/.test(normalized);
}

function buildTelegramAssistantCapabilityResponse() {
  return [
    'Em là trợ lý AI của quán Xe Khô Chữa Lành, không chỉ trả lời command cố định.',
    'Em có thể hiểu câu hỏi tự nhiên và dùng dữ liệu thật khi cần:',
    '• Đọc Firebase/POS: doanh thu, số đơn, lãi gộp, tiền mặt/chuyển khoản, món bán, tồn kho, lịch sử nhập hàng, chi phí.',
    '• Trả lời các câu như: “hôm qua bán bao nhiêu bia?”, “doanh thu từ 18h hôm qua đến bây giờ?”, “món mực 1 nắng nướng muối ớt giá bao nhiêu?”, “tồn kho bia còn bao nhiêu?”.',
    '• Chủ động cảnh báo số liệu chưa tốt, so sánh cùng kỳ tháng trước và gợi ý cải thiện.',
    '• Với báo cáo doanh thu/lợi nhuận/nhập hàng/chi phí, em có thể hiện nút xem biểu đồ và vẽ biểu đồ khi anh bấm.',
    '• Tạo đề xuất thao tác như nhập hàng/sửa menu/gọi món, nhưng chỉ ghi dữ liệu sau khi anh xác nhận.',
    'BigQuery: em đã có đường đọc BigQuery read-only để trả lời báo cáo khi Firebase/POS không đủ dữ liệu; chỉ đọc, không ghi/sửa dữ liệu.',
  ].join('\n');
}

async function tryAnswerTelegramSmartReportQuestion(userText = '') {
  const intent = parseTelegramSmartReportIntent(userText);
  if (!intent) return null;

  const { executeReportQuery } = getAiDeps();
  const report = await executeReportQuery({
    loai_bao_cao: intent.metric === 'profit' ? 'loi_nhuan' : 'doanh_thu',
    ...(intent.itemName ? { ten_mon: intent.itemName } : {}),
    tu_thoi_diem: intent.from.toISOString(),
    den_thoi_diem: intent.toExclusive.toISOString(),
  }, { db, fallbackBigQuery: true, bigQueryConfig: getBigQueryRuntimeConfig() });

  if (!report?.ok) {
    return {
      intent,
      report,
      text: intent.itemName
        ? `Em chưa tìm thấy dữ liệu phù hợp cho ${intent.itemName} ${intent.rangeLabel}.`
        : `Em chưa tìm thấy dữ liệu phù hợp cho khoảng ${intent.rangeLabel}.`,
    };
  }

  const itemSummary = report.itemSummary || {};
  const summary = report.summary || {};
  const profit = report.profit || {};
  if (intent.metric === 'profit') {
    if (!intent.itemName) {
      return {
        intent,
        report,
        text: [
          `Lãi gộp ${intent.rangeLabel} là ${formatCurrencyVi(profit.grossProfit)}.`,
          `Doanh thu: ${formatCurrencyVi(profit.revenue)}.`,
          `Giá vốn: ${formatCurrencyVi(profit.cost)}.`,
          `Số đơn: ${formatQtyVi(summary.invoiceCount || 0)}.`,
        ].join(' '),
      };
    }
    if (!report?.itemSummary) {
      return {
        intent,
        report,
        text: `Em chưa tìm thấy dữ liệu phù hợp cho ${intent.itemName} ${intent.rangeLabel}.`,
      };
    }
    return {
      intent,
      report,
      text: [
        `Lãi gộp ${intent.itemName} ${intent.rangeLabel} là ${formatCurrencyVi(profit.grossProfit)}.`,
        `Doanh thu: ${formatCurrencyVi(itemSummary.revenue)}.`,
        `Giá vốn: ${formatCurrencyVi(itemSummary.cost)}.`,
        `Số lượng đã bán: ${formatQtyVi(itemSummary.totalQty)}.`,
      ].join(' '),
    };
  }

  if (intent.metric === 'summary') {
    return {
      intent,
      report,
      text: [
        `Trong khoảng ${intent.rangeLabel}, quán bán được ${formatQtyVi(summary.invoiceCount || 0)} đơn.`,
        `Doanh thu: ${formatCurrencyVi(summary.revenue || 0)}.`,
        `Lãi gộp: ${formatCurrencyVi(summary.grossProfit || 0)}.`,
      ].join(' '),
    };
  }

  if (intent.metric === 'quantity') {
    if (!intent.itemName || !report?.itemSummary) {
      return {
        intent,
        report,
        text: intent.itemName
          ? `Em chưa tìm thấy dữ liệu bán ${intent.itemName} trong ${intent.rangeLabel}.`
          : `Anh hỏi số lượng món nào trong ${intent.rangeLabel} ạ?`,
      };
    }
    return {
      intent,
      report,
      text: [
        `${intent.rangeLabel.charAt(0).toUpperCase() + intent.rangeLabel.slice(1)}, quán bán được ${formatQtyVi(itemSummary.totalQty)} ${intent.itemName}.`,
        `Doanh thu ${intent.itemName}: ${formatCurrencyVi(itemSummary.revenue)}.`,
        `Lãi gộp: ${formatCurrencyVi(itemSummary.grossProfit)}.`,
      ].join(' '),
    };
  }

  if (!intent.itemName) {
    return {
      intent,
      report,
      text: [
        `Doanh thu ${intent.rangeLabel} là ${formatCurrencyVi(summary.revenue || 0)}.`,
        `Số đơn: ${formatQtyVi(summary.invoiceCount || 0)}.`,
        `Lãi gộp: ${formatCurrencyVi(summary.grossProfit || 0)}.`,
      ].join(' '),
    };
  }

  if (!report?.itemSummary) {
    return {
      intent,
      report,
      text: `Em chưa tìm thấy dữ liệu phù hợp cho ${intent.itemName} ${intent.rangeLabel}.`,
    };
  }

  return {
    intent,
    report,
    text: [
      `Doanh thu ${intent.itemName} ${intent.rangeLabel} là ${formatCurrencyVi(itemSummary.revenue)}.`,
      `Số lượng đã bán: ${formatQtyVi(itemSummary.totalQty)}.`,
    ].join(' '),
  };
}


function isTelegramProactiveOwnerInsightQuestion(userText = '') {
  const n = normalizeVi(userText);
  return /\b(canh bao|chu dong|goi y|tu van|so sanh|kinh doanh chua tot|tinh hinh kinh doanh|co gi bat thuong|phan tich quan)\b/.test(n);
}

function isTelegramMenuDataQuestion(userText = '') {
  const n = normalizeVi(userText);
  return /\b(gia bao nhieu|bao nhieu tien|gia may|gia mon|hinh anh|anh mon|mon .* gia)\b/.test(n)
    && !/\b(doanh thu|loi nhuan|lai|ban duoc|nhap hang|chi phi)\b/.test(n);
}

function extractTelegramMenuQuery(userText = '') {
  let n = normalizeTelegramSmartReportText(userText);
  n = n.replace(/\?/g, ' ')
    .replace(/\b(mon|hinh anh|anh mon|cho xem|xem|lay duoc|gia bao nhieu|bao nhieu tien|gia may|gia mon|co gia|la bao nhieu|bao nhieu|gia)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return n;
}

function tokenScore(query = '', name = '') {
  const q = normalizeVi(query).split(/[^a-z0-9]+/).filter(Boolean);
  const n = normalizeVi(name);
  if (!q.length || !n) return 0;
  let score = 0;
  q.forEach(token => { if (n.includes(token)) score += token.length >= 3 ? 2 : 1; });
  if (n.includes(normalizeVi(query))) score += 8;
  return score / Math.max(1, q.length);
}

function normalizeMenuItemFromDoc(doc, sourceCollection) {
  const data = doc.data ? (doc.data() || {}) : (doc || {});
  const name = String(data.display_name || data.material_name || data.name || data.productName || data.item_name || data.inv_id || doc.id || '').trim();
  const price = Number(data.sell_price ?? data.price ?? data.gia ?? data.unitPrice ?? 0) || 0;
  const imageUrl = String(
    data.image_url || data.imageUrl || data.realImageUrl || data.aiImageUrl || data.photoUrl || data.photo_url || data.thumbnailUrl || data.coverImageUrl || ''
  ).trim();
  return {
    id: String(data.item_id || data.inv_id || data.id || doc.id || '').trim(),
    name,
    price,
    unit: String(data.base_unit || data.unit || data.don_vi || '').trim(),
    category: String(data.category || data.group || '').trim(),
    imageUrl,
    hidden: data.hidden === true,
    sourceCollection,
    raw: data,
  };
}

async function findTelegramMenuItem(query = '') {
  const q = String(query || '').trim();
  if (!q) return null;
  const [productSnap, inventorySnap] = await Promise.all([
    db.collection('Product_Catalog').get().catch(() => null),
    db.collection('Inventory_Items').get().catch(() => null),
  ]);
  const items = [];
  if (productSnap?.docs) productSnap.docs.forEach(doc => items.push(normalizeMenuItemFromDoc(doc, 'Product_Catalog')));
  if (inventorySnap?.docs) inventorySnap.docs.forEach(doc => items.push(normalizeMenuItemFromDoc(doc, 'Inventory_Items')));
  const ranked = items
    .filter(item => !item.hidden && item.name && item.price > 0)
    .map(item => ({ item, score: tokenScore(q, item.name) }))
    .filter(row => row.score > 0)
    .sort((a, b) => b.score - a.score || b.item.name.length - a.item.name.length);
  return ranked[0]?.item || null;
}

async function tryAnswerTelegramMenuDataQuestion(userText = '') {
  if (!isTelegramMenuDataQuestion(userText)) return null;
  const query = extractTelegramMenuQuery(userText);
  const item = await findTelegramMenuItem(query);
  if (!item) {
    return { text: `Em chưa tìm thấy món “${query || userText}” trong menu/kho. Anh gửi tên món rõ hơn giúp em nhé.` };
  }
  const lines = [
    `${item.name} hiện có giá ${formatCurrencyVi(item.price)}${item.unit ? `/${item.unit}` : ''}.`,
  ];
  if (item.category) lines.push(`Nhóm: ${item.category}.`);
  if (item.imageUrl) lines.push('Em gửi kèm hình món bên dưới.');
  else lines.push('Món này hiện chưa có ảnh trong dữ liệu menu.');
  return {
    text: lines.join('\n'),
    photoUrl: item.imageUrl || '',
    menuItem: item,
  };
}

function getCurrentAndPreviousMonthComparableRanges(now = new Date()) {
  const parts = getVietnamDateParts(now);
  const currentFrom = new Date(Date.UTC(parts.year, parts.month - 1, 1, 0, 0, 0) - 7 * 60 * 60 * 1000);
  const currentTo = now;
  const prevMonth = parts.month === 1 ? 12 : parts.month - 1;
  const prevYear = parts.month === 1 ? parts.year - 1 : parts.year;
  const day = Math.min(parts.day, new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate());
  const previousFrom = new Date(Date.UTC(prevYear, prevMonth - 1, 1, 0, 0, 0) - 7 * 60 * 60 * 1000);
  const previousTo = new Date(Date.UTC(prevYear, prevMonth - 1, day, parts.hour, parts.minute, parts.second || 0) - 7 * 60 * 60 * 1000);
  return { currentFrom, currentTo, previousFrom, previousTo };
}

function percentChange(current, previous) {
  const c = Number(current || 0);
  const p = Number(previous || 0);
  if (!p && !c) return 0;
  if (!p) return 100;
  return ((c - p) / p) * 100;
}

function formatSignedPercent(value) {
  const n = Number(value || 0);
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

async function createTelegramChartRequest({ chatId, title, kind = 'report', rows = [], summary = {}, source = {} }) {
  const safeRows = (Array.isArray(rows) ? rows : [])
    .map(row => ({ label: String(row.label || '').slice(0, 40), value: Number(row.value || 0) || 0 }))
    .filter(row => row.label && Number.isFinite(row.value))
    .slice(0, 8);
  if (!safeRows.length) return '';
  const ref = await db.collection('telegram_chart_requests').add({
    chatId: String(chatId || ''),
    title: String(title || 'Biểu đồ báo cáo').slice(0, 120),
    kind: String(kind || 'report'),
    rows: safeRows,
    summary: sanitizeSimpleObject(summary),
    source: sanitizeSimpleObject(source),
    status: 'ready',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 6 * 60 * 60 * 1000)),
  });
  return ref.id;
}

function sanitizeSimpleObject(obj = {}) {
  const out = {};
  Object.entries(obj || {}).forEach(([key, value]) => {
    if (value == null) return;
    if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') out[key] = value;
  });
  return out;
}

function buildChartButtons(chartId) {
  return chartId ? [[{ text: '📊 Có, vẽ biểu đồ', callback_data: `chart_${chartId}` }]] : [];
}

function parseTelegramChartCallbackData(callbackData = '') {
  const data = String(callbackData || '').trim();
  const match = data.match(/^(?:chart|show_chart|tg_chart|ve_bieu_do|draw_chart)[:_](.+)$/i);
  return match ? String(match[1] || '').trim() : '';
}

function appendChartPrompt(text, chartId) {
  if (!chartId) return text;
  return `${text}\n\nBạn có muốn xem biểu đồ không?`;
}

function chartRowsFromReport(report = {}, intent = {}) {
  const summary = report.summary || {};
  const item = report.itemSummary || null;
  if (item) {
    return [
      { label: 'Doanh thu', value: item.revenue || 0 },
      { label: 'Giá vốn', value: item.cost || 0 },
      { label: 'Lãi gộp', value: item.grossProfit || 0 },
      { label: 'Số lượng', value: item.totalQty || 0 },
    ];
  }
  return [
    { label: 'Doanh thu', value: summary.revenue || 0 },
    { label: 'Giá vốn', value: summary.cost || 0 },
    { label: 'Lãi gộp', value: summary.grossProfit || 0 },
    { label: 'Số đơn', value: summary.invoiceCount || 0 },
  ];
}

async function prepareTelegramReportChart({ chatId, smartReportReply, title }) {
  const report = smartReportReply?.report || {};
  if (!report?.ok) return '';
  return createTelegramChartRequest({
    chatId,
    title: title || `Báo cáo ${smartReportReply?.intent?.rangeLabel || ''}`.trim(),
    kind: 'sales-report',
    rows: chartRowsFromReport(report, smartReportReply?.intent || {}),
    summary: report.summary || {},
    source: { tool: report.tool || 'truy_van_bao_cao', rangeLabel: smartReportReply?.intent?.rangeLabel || '' },
  });
}

async function tryAnswerTelegramProactiveOwnerInsight(userText = '', chatId = '') {
  if (!isTelegramProactiveOwnerInsightQuestion(userText)) return null;
  const { executeReportQuery } = getAiDeps();
  const ranges = getCurrentAndPreviousMonthComparableRanges(new Date());
  const [currentReport, previousReport] = await Promise.all([
    executeReportQuery({ loai_bao_cao: 'tong_quan', tu_thoi_diem: ranges.currentFrom.toISOString(), den_thoi_diem: ranges.currentTo.toISOString(), gioi_han: 5 }, { db, fallbackBigQuery: true, bigQueryConfig: getBigQueryRuntimeConfig() }),
    executeReportQuery({ loai_bao_cao: 'tong_quan', tu_thoi_diem: ranges.previousFrom.toISOString(), den_thoi_diem: ranges.previousTo.toISOString(), gioi_han: 5 }, { db, fallbackBigQuery: true, bigQueryConfig: getBigQueryRuntimeConfig() }),
  ]);
  const cur = currentReport.summary || {};
  const prev = previousReport.summary || {};
  const revenueDelta = percentChange(cur.revenue, prev.revenue);
  const profitDelta = percentChange(cur.grossProfit, prev.grossProfit);
  const orderDelta = percentChange(cur.invoiceCount, prev.invoiceCount);
  const margin = Number(cur.revenue || 0) > 0 ? (Number(cur.grossProfit || 0) / Number(cur.revenue || 0)) * 100 : 0;
  const warnings = [];
  if (revenueDelta < -10) warnings.push(`Doanh thu đang giảm ${formatSignedPercent(revenueDelta)} so với cùng kỳ tháng trước.`);
  if (profitDelta < -10) warnings.push(`Lãi gộp giảm ${formatSignedPercent(profitDelta)} — cần kiểm tra giá vốn/khuyến mãi.`);
  if (orderDelta < -10) warnings.push(`Số đơn giảm ${formatSignedPercent(orderDelta)} — cần kéo khách quay lại hoặc đẩy combo.`);
  if (margin > 0 && margin < 35) warnings.push(`Biên lãi gộp chỉ khoảng ${margin.toFixed(1)}%, hơi thấp.`);
  if (!warnings.length) warnings.push('Chưa thấy cảnh báo đỏ lớn; vẫn nên tối ưu món bán chạy và kiểm soát giá vốn.');
  const suggestions = [
    'Đẩy combo bia + món mồi có biên lãi tốt vào khung giờ thấp điểm.',
    'Kiểm tra top món bán chạy: tăng trưng bày/ảnh/menu cho món có lãi cao, không chỉ món doanh thu cao.',
    'Nếu số đơn giảm: chạy ưu đãi quay lại cho khách cũ hoặc nhắc bàn gọi thêm món mồi sau 20–30 phút.',
  ];
  const chartId = await createTelegramChartRequest({
    chatId,
    title: 'So sánh kinh doanh tháng này vs cùng kỳ tháng trước',
    kind: 'owner-insight',
    rows: [
      { label: 'DT tháng này', value: cur.revenue || 0 },
      { label: 'DT tháng trước', value: prev.revenue || 0 },
      { label: 'Lãi tháng này', value: cur.grossProfit || 0 },
      { label: 'Lãi tháng trước', value: prev.grossProfit || 0 },
      { label: 'Đơn tháng này', value: cur.invoiceCount || 0 },
      { label: 'Đơn tháng trước', value: prev.invoiceCount || 0 },
    ],
    summary: { revenue: cur.revenue || 0, previousRevenue: prev.revenue || 0, grossProfit: cur.grossProfit || 0, previousGrossProfit: prev.grossProfit || 0 },
    source: { type: 'month-comparison' },
  });
  const text = [
    '📌 Em xem nhanh tình hình kinh doanh cho chủ quán:',
    `• Doanh thu tháng này: ${formatCurrencyVi(cur.revenue || 0)} (${formatSignedPercent(revenueDelta)} so với cùng kỳ tháng trước).`,
    `• Lãi gộp: ${formatCurrencyVi(cur.grossProfit || 0)} (${formatSignedPercent(profitDelta)}).`,
    `• Số đơn: ${formatQtyVi(cur.invoiceCount || 0)} (${formatSignedPercent(orderDelta)}).`,
    '',
    '⚠️ Cảnh báo/góc cần chú ý:',
    ...warnings.map(w => `• ${w}`),
    '',
    '💡 Gợi ý cải thiện:',
    ...suggestions.map(s => `• ${s}`),
  ].join('\n');
  return { text: appendChartPrompt(text, chartId), inlineButtons: buildChartButtons(chartId), toolResults: [currentReport, previousReport] };
}

function isTelegramFinanceReportQuestion(userText = '') {
  const n = normalizeVi(userText);
  return /\b(nhap hang|da nhap|tong tien nhap|chi phi|expense|cost)\b/.test(n);
}

async function querySimpleCollectionTotal(collectionNames = [], range = {}) {
  let rows = [];
  for (const name of collectionNames) {
    const snap = await db.collection(name).get().catch(() => null);
    if (!snap?.docs) continue;
    rows = rows.concat(snap.docs.map(doc => ({ id: doc.id, collection: name, ...(doc.data() || {}) })));
  }
  const from = range.from;
  const to = range.toExclusive || range.to || new Date();
  const filtered = rows.filter(row => {
    const raw = row.date || row.createdAt || row.paidAt || row.timestamp || row.ngay;
    const d = raw?.toDate ? raw.toDate() : (raw ? new Date(raw) : null);
    return d && !Number.isNaN(d.getTime()) && (!from || d >= from) && (!to || d < to);
  });
  return {
    rows: filtered,
    total: filtered.reduce((sum, row) => sum + (Number(row.total || row.amount || row.price || row.cost || row.tong_tien || 0) || 0), 0),
    count: filtered.length,
  };
}

async function tryAnswerTelegramFinanceReportQuestion(userText = '', chatId = '') {
  if (!isTelegramFinanceReportQuestion(userText)) return null;
  const n = normalizeVi(userText);
  const intent = parseTelegramSmartReportIntent(userText) || (() => {
    const scope = telegramReports.inferTelegramRelativeScope(normalizeTelegramSmartReportText(userText)) || 'hom_nay';
    const r = telegramReports.buildTelegramRelativeReportRange(scope, new Date());
    return { rangeLabel: r?.label || 'hôm nay', from: r?.from || new Date(Date.now() - 24*60*60*1000), toExclusive: r?.toExclusive || new Date() };
  })();
  const isPurchase = /\b(nhap hang|da nhap|tong tien nhap)\b/.test(n);
  const result = isPurchase
    ? await querySimpleCollectionTotal(['purchases'], { from: intent.from, toExclusive: intent.toExclusive })
    : await querySimpleCollectionTotal(['expenses', 'Expense_Records', 'costs'], { from: intent.from, toExclusive: intent.toExclusive });
  const label = isPurchase ? 'nhập hàng' : 'chi phí';
  const chartId = await createTelegramChartRequest({
    chatId,
    title: `Báo cáo ${label} ${intent.rangeLabel}`,
    kind: isPurchase ? 'purchases' : 'expenses',
    rows: [
      { label: `Tổng ${label}`, value: result.total || 0 },
      { label: 'Số dòng', value: result.count || 0 },
    ],
    summary: { total: result.total || 0, count: result.count || 0 },
    source: { type: label, rangeLabel: intent.rangeLabel },
  });
  const text = [
    `Báo cáo ${label} ${intent.rangeLabel}:`,
    `• Tổng tiền: ${formatCurrencyVi(result.total || 0)}.`,
    `• Số dòng ghi nhận: ${formatQtyVi(result.count || 0)}.`,
  ].join('\n');
  return { text: appendChartPrompt(text, chartId), inlineButtons: buildChartButtons(chartId), toolResults: [{ ok: true, tool: isPurchase ? 'purchases' : 'expenses', ...result }] };
}

function escapeSvgText(text = '') {
  return String(text || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[ch]));
}

async function renderTelegramChartPng(chart = {}) {
  const rows = Array.isArray(chart.rows) ? chart.rows : [];
  const width = 1100;
  const height = 720;
  const max = Math.max(1, ...rows.map(row => Math.abs(Number(row.value || 0))));
  const barMax = 680;
  const rowHeight = 62;
  const top = 130;
  const bars = rows.map((row, idx) => {
    const y = top + idx * rowHeight;
    const value = Number(row.value || 0);
    const w = Math.max(4, Math.round((Math.abs(value) / max) * barMax));
    const fill = value >= 0 ? '#E10600' : '#2A1608';
    return `<g><text x="60" y="${y + 25}" font-size="24" fill="#2A1608">${escapeSvgText(row.label)}</text><rect x="330" y="${y}" width="${w}" height="34" rx="10" fill="${fill}"/><text x="${Math.min(1030, 345 + w)}" y="${y + 25}" font-size="22" fill="#2A1608">${escapeSvgText(formatCurrencyVi(value))}</text></g>`;
  }).join('\n');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="100%" height="100%" fill="#F9EAD1"/>
<text x="60" y="70" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#2A1608">${escapeSvgText(chart.title || 'Biểu đồ báo cáo')}</text>
<text x="60" y="105" font-family="Arial, sans-serif" font-size="20" fill="#2A1608">Xe Khô Chữa Lành • dữ liệu từ Firebase/POS</text>
<g font-family="Arial, sans-serif">${bars}</g>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function handleTelegramChartCallback({ chartId, callbackChatId, callbackQueryId, botToken }) {
  const snap = await db.collection('telegram_chart_requests').doc(chartId).get();
  if (!snap.exists) {
    await answerTelegramCallback({ callbackQueryId, text: 'Biểu đồ đã hết hạn hoặc không còn dữ liệu.', botToken });
    return { ok: false, error: 'chart_not_found' };
  }
  const chart = snap.data() || {};
  if (String(chart.chatId || '') && String(chart.chatId) !== String(callbackChatId || '')) {
    await answerTelegramCallback({ callbackQueryId, text: 'Biểu đồ này không thuộc chat hiện tại.', botToken });
    return { ok: false, error: 'chat_mismatch' };
  }
  const png = await renderTelegramChartPng(chart);
  await sendTelegramPhotoBuffer({
    chatId: callbackChatId,
    botToken,
    photoBuffer: png,
    caption: `📊 ${chart.title || 'Biểu đồ báo cáo'}`,
    filename: `xekho-chart-${chartId}.png`,
  });
  await answerTelegramCallback({ callbackQueryId, text: 'Đã vẽ biểu đồ.', botToken });
  await db.collection('telegram_chart_requests').doc(chartId).set({ viewedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  return { ok: true, chartId };
}

const DEFAULT_TELEGRAM_REPORT_SETTINGS = telegramReports.DEFAULT_TELEGRAM_REPORT_SETTINGS;

function getVietnamDateParts(date = new Date()) {
  return telegramReports.getVietnamDateParts(date);
}

function getVietnamBusinessReportRange(now = new Date()) {
  return telegramReports.getVietnamBusinessReportRange(now);
}

function getTelegramReportSettings(raw = {}) {
  return telegramReports.getTelegramReportSettings(raw);
}

function getTelegramReportRangeKey(range) {
  return telegramReports.getTelegramReportRangeKey(range);
}

function shouldSendTelegramReportNow(settings, now = new Date(), range = getVietnamBusinessReportRange(now)) {
  return telegramReports.shouldSendTelegramReportNow(settings, now, range);
}

function getTelegramReportTargetChatIds() {
  const reportChatId = String(TELEGRAM_REPORT_CHAT_ID.value() || '').trim();
  if (reportChatId) {
    return [reportChatId];
  }
  return uniqueTokens([
    TELEGRAM_OWNER_CHAT_ID.value(),
    TELEGRAM_GROUP_CHAT_ID.value(),
  ]);
}

function getCompletedOrderTelegramTargetChatIds() {
  const completedChatId = String(TELEGRAM_COMPLETED_ORDER_CHAT_ID.value() || '').trim();
  return uniqueTokens([
    completedChatId,
    TELEGRAM_REPORT_CHAT_ID.value(),
    TELEGRAM_OWNER_CHAT_ID.value(),
    TELEGRAM_GROUP_CHAT_ID.value(),
  ]);
}

function getTelegramReportBotToken() {
  return String(
    TELEGRAM_REPORT_BOT_TOKEN.value()
    || TELEGRAM_KITCHEN_READY_BOT_TOKEN.value()
    || TELEGRAM_BOT_TOKEN.value()
    || ''
  ).trim();
}

function getTelegramAssistantBotToken() {
  return String(
    TELEGRAM_REPORT_BOT_TOKEN.value()
    || TELEGRAM_BOT_TOKEN.value()
    || ''
  ).trim();
}

function getTelegramAssistantBotName() {
  return String(TELEGRAM_ASSISTANT_BOT_NAME.value() || 'XE KHO Owner Assistant').trim();
}

function getTelegramOwnerChatIds() {
  return uniqueTokens([
    TELEGRAM_OWNER_CHAT_ID.value(),
    DEFAULT_TELEGRAM_OWNER_CHAT_ID,
  ]);
}

function isTelegramOwnerContext(context = {}) {
  const allowlist = getTelegramOwnerChatIds();
  const chatId = String(context.chatId || '').trim();
  const userId = String(context.userId || '').trim();
  return allowlist.some(id => id && (id === chatId || id === userId));
}

function buildTelegramOwnerOnlyMessage() {
  return [
    `Bot ${getTelegramAssistantBotName()} chỉ phục vụ chủ quán đã cấu hình.`,
    'Tính năng doanh thu, báo cáo, AI trợ lý và nhập liệu thông minh chỉ mở cho Telegram ID chủ quán.',
    'Nếu cần cấp quyền, dùng /chatid rồi cấu hình TELEGRAM_OWNER_CHAT_ID đúng ID đó.',
  ].join('\n');
}

async function rejectTelegramOwnerOnlyAccess({ chatId, botToken }) {
  if (!chatId || !botToken) return;
  await sendTelegramTextMessage({
    chatId,
    botToken,
    text: buildTelegramOwnerOnlyMessage(),
  });
}

async function loadTelegramReportFinancialProfile() {
  const snap = await db.collection('settings').doc('financial_profile').get().catch(() => null);
  const data = snap?.exists ? (snap.data() || {}) : {};
  const monthlyFixedCosts = data?.monthly_fixed_costs || {};
  const monthlyFixedCostTotal =
    Number(monthlyFixedCosts.total || 0)
    || (
      (Number(monthlyFixedCosts.rent || 0) || 0)
      + (Number(monthlyFixedCosts.staff || 0) || 0)
      + (Number(monthlyFixedCosts.utilities || 0) || 0)
      + (Number(monthlyFixedCosts.other || 0) || 0)
    );

  return {
    dailyFixedCost: Number(data.daily_fixed_cost || 0) || (monthlyFixedCostTotal > 0 ? Math.round(monthlyFixedCostTotal / 30) : 0),
    monthlyFixedCostTotal,
    targetMonthlyRevenue: Number(data.target_monthly_revenue || 0) || 0,
    targetMonthlyProfit: Number(data.target_monthly_profit || 0) || 0,
  };
}

function getInclusiveVietnamDateCount(fromYmd, toYmd) {
  return telegramReports.getInclusiveVietnamDateCount(fromYmd, toYmd);
}

function formatAchievementPercent(value = 0, target = 0) {
  return telegramReports.formatAchievementPercent(value, target);
}

function buildMorningRevenueMood(report = {}) {
  return telegramReports.buildMorningRevenueMood(report);
}

async function sendTelegramHtmlMessage({ chatId, text, botToken }) {
  return telegramSend.sendTelegramHtmlMessage({ chatId, text, botToken });
}

async function sendTelegramTextMessage({ chatId, text, botToken }) {
  return telegramSend.sendTelegramTextMessage({ chatId, text, botToken });
}

async function sendTelegramActionConfirmation({ chatId, text, actionDocId, botToken }) {
  return telegramSend.sendTelegramActionConfirmation({ chatId, text, actionDocId, botToken });
}

async function sendTelegramInlineMessage({ chatId, text, buttons = [], botToken, parseMode = 'HTML' }) {
  return telegramSend.sendTelegramInlineMessage({ chatId, text, buttons, botToken, parseMode });
}

async function sendTelegramPhotoMessage({ chatId, photo, caption = '', botToken, parseMode = 'HTML', buttons = [] }) {
  return telegramSend.sendTelegramPhotoMessage({ chatId, photo, caption, botToken, parseMode, buttons });
}

async function sendTelegramPhotoBuffer({ chatId, photoBuffer, caption = '', botToken, parseMode = 'HTML', buttons = [], filename = 'chart.png', contentType = 'image/png' }) {
  return telegramSend.sendTelegramPhotoBuffer({ chatId, photoBuffer, caption, botToken, parseMode, buttons, filename, contentType });
}

function escapeXml(text) { return textUtils.escapeXml(text); }

async function answerTelegramCallback({ callbackQueryId, text, botToken }) {
  return telegramSend.answerTelegramCallback({ callbackQueryId, text, botToken });
}

async function editTelegramMessage({ chatId, messageId, text, botToken }) {
  return telegramSend.editTelegramMessage({ chatId, messageId, text, botToken });
}

async function editTelegramInlineMessage({ chatId, messageId, text, buttons = [], botToken, parseMode = 'HTML' }) {
  return telegramSend.editTelegramInlineMessage({ chatId, messageId, text, buttons, botToken, parseMode });
}

function extractPendingActionsFromToolResults(toolResults = []) {
  return (Array.isArray(toolResults) ? toolResults : [])
    .filter(result => result?.ok && result?.pending && result?.docId)
    .map(result => ({
      docId: String(result.docId),
      actionType: String(result.actionType || result.tool || ''),
      preview: String(result.preview || ''),
    }));
}

async function getTelegramPhotoAsBase64({ botToken, photo }) {
  return telegramSend.getTelegramPhotoAsBase64({ botToken, photo });
}

function normalizeTelegramServiceMode(value = '') {
  const normalized = normalizeVi(value);
  if (!normalized) return '';
  if (normalized.includes('mang ve') || normalized.includes('takeaway')) return 'takeaway';
  if (normalized.includes('tai ban') || normalized.includes('dung tai ban') || normalized.includes('dine in')) return 'dine_in';
  return '';
}

function parseTelegramOrderTable(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const normalized = normalizeVi(raw);
  if (!normalized) return '';
  if (normalized === 'takeaway' || normalized.includes('mang ve')) return 'takeaway';
  const digits = normalized.match(/\d+/);
  if (digits) return digits[0];
  if (normalized.startsWith('ban ')) return raw.replace(/^ban\s+/i, '').trim();
  return raw;
}

function isTelegramOrderPhotoContext({ message = {}, chatId = '' } = {}) {
  const safeChatId = String(chatId || '').trim();
  const configuredGroupChatId = String(TELEGRAM_GROUP_CHAT_ID.value() || '').trim();
  if (configuredGroupChatId && configuredGroupChatId === safeChatId) {
    return true;
  }

  const chatTitle = normalizeVi(
    message?.chat?.title
    || message?.chat?.username
    || message?.chat?.first_name
    || ''
  );
  const captionText = normalizeVi(message?.caption || message?.text || '');
  const replyText = normalizeVi(message?.reply_to_message?.text || message?.reply_to_message?.caption || '');
  const chatType = String(message?.chat?.type || '').trim().toLowerCase();

  if (chatTitle.includes('goi mon') || chatTitle.includes('dat mon')) return true;
  if (captionText.startsWith('/goimon') || captionText.includes('goi mon') || captionText.includes('dat mon')) return true;
  if (replyText.includes('phieu goi mon tam nhan') || replyText.includes('da len don thanh cong')) return true;

  return !configuredGroupChatId && (chatType === 'group' || chatType === 'supergroup');
}

function parseDraftItemText(input = '') {
  const raw = String(input || '').trim();
  if (!raw) return null;
  const qtyMatch = raw.match(/^(.*?)(?:\s*[xX]\s*(\d+(?:[.,]\d+)?))$/);
  const name = String(qtyMatch?.[1] || raw).trim();
  const qty = qtyMatch?.[2]
    ? Number(String(qtyMatch[2]).replace(',', '.'))
    : 1;
  if (!name) return null;
  return {
    ten_mon: name,
    so_luong: Number.isFinite(qty) && qty > 0 ? qty : 1,
  };
}

function buildDraftLineInputsFromPayload(payload = {}) {
  const itemMap = new Map();
  const items = Array.isArray(payload.items) ? payload.items : [];
  const unresolvedItems = Array.isArray(payload.unresolvedItems) ? payload.unresolvedItems : [];

  items.forEach((item, index) => {
    const slot = Number(item.slot) > 0 ? Number(item.slot) : (index + 1);
    itemMap.set(slot, {
      slot,
      ten_mon: String(item.ten_mon || item.name || '').trim(),
      so_luong: Number(item.so_luong ?? item.qty ?? item.quantity) || 1,
      ghi_chu: String(item.ghi_chu || item.note || '').trim(),
    });
  });

  unresolvedItems.forEach((item, index) => {
    const fallbackSlot = items.length + index + 1;
    const slot = Number(item.slot) > 0 ? Number(item.slot) : fallbackSlot;
    itemMap.set(slot, {
      slot,
      ten_mon: String(item.ten_mon_ai || item.ten_mon || item.name || '').trim(),
      so_luong: Number(item.so_luong ?? item.qty ?? item.quantity) || 1,
      ghi_chu: String(item.ghi_chu || item.note || '').trim(),
    });
  });

  return [...itemMap.values()].sort((a, b) => a.slot - b.slot);
}

function buildTelegramDraftButtons(draftId) {
  const safeId = String(draftId || '').trim();
  if (!safeId) return [];
  return [[
    { text: '✅ Xác nhận', callback_data: `odf_confirm_${safeId}` },
    { text: '✏️ Chỉnh sửa', callback_data: `odf_edit_${safeId}` },
    { text: '❌ Hủy', callback_data: `odf_cancel_${safeId}` },
  ]];
}

function buildTelegramOrderDraftMessage(draft = {}) {
  const payload = draft.payload || {};
  const items = Array.isArray(payload.items) ? payload.items : [];
  const unresolvedItems = Array.isArray(payload.unresolvedItems) ? payload.unresolvedItems : [];
  const lines = ['<b>PHIẾU GỌI MÓN TẠM NHẬN</b>'];

  const tableLabel = (() => {
    const tableId = String(payload.ban || '').trim();
    if (!tableId) return 'Chưa rõ';
    if (tableId === 'takeaway') return 'Mang về';
    return `Bàn ${escapeTelegramHtml(tableId)}`;
  })();
  const serviceMode = normalizeTelegramServiceMode(payload.serviceMode || '');
  const serviceLabel = serviceMode === 'takeaway' ? 'Mang về' : serviceMode === 'dine_in' ? 'Dùng tại bàn' : 'Chưa rõ';
  lines.push(`<b>Bàn:</b> ${tableLabel}`);
  lines.push(`<b>Hình thức:</b> ${escapeTelegramHtml(serviceLabel)}`);

  if (items.length) {
    lines.push('', '<b>Món đã nhận diện</b>');
    items
      .slice()
      .sort((a, b) => (Number(a.slot || 0) || 0) - (Number(b.slot || 0) || 0))
      .forEach((item, index) => {
        const slot = Number(item.slot) > 0 ? Number(item.slot) : (index + 1);
        const ratio = Number(item.ratio || 0);
        const confidence = ratio > 0 ? ` (${Math.round(ratio * 100)}%)` : '';
        lines.push(`${slot}. ${escapeTelegramHtml(String(item.ten_mon || item.name || 'Món'))} x${Number(item.so_luong || item.qty || 1)}${confidence}`);
      });
  }

  if (unresolvedItems.length) {
    lines.push('', '<b>Món cần kiểm tra lại</b>');
    unresolvedItems.forEach((item) => {
      const slot = Number(item.slot) > 0 ? Number(item.slot) : '?';
      const ratio = Number(item.ratio || 0);
      lines.push(`${slot}. ${escapeTelegramHtml(String(item.ten_mon_ai || item.ten_mon || 'Món chưa rõ'))} x${Number(item.so_luong || 1)} (${Math.round(ratio * 100)}%)`);
      const candidates = Array.isArray(item.candidates) ? item.candidates.slice(0, 3) : [];
      if (candidates.length) {
        lines.push(`Gợi ý: ${candidates.map(c => escapeTelegramHtml(String(c.ten_mon || c.name || ''))).join(' | ')}`);
      }
    });
  }

  if (payload.ghi_chu) {
    lines.push('', `<b>Ghi chú:</b> ${escapeTelegramHtml(String(payload.ghi_chu || ''))}`);
  }

  lines.push(
    '',
    'Sửa bằng cú pháp:',
    '<code>/fix mon 3 = bò khô nướng x1</code>',
    '<code>/fix xoa mon 2</code>',
    '<code>/fix them ba chỉ nướng lá lốt x1</code>',
    '<code>/fix ban 1</code>',
    '<code>/fix mang ve</code>',
  );

  if (!items.length && !unresolvedItems.length) {
    lines.push('', '<i>Chưa đọc được món nào từ phiếu.</i>');
  }

  return lines.join('\n').slice(0, 3900);
}

async function runVertexOrderSlipOcr({ caption = '', imageBase64 = '', mimeType = 'image/jpeg' } = {}) {
  const base64Data = stripDataUrlBase64(imageBase64);
  if (!base64Data) throw new Error('Thiếu ảnh phiếu gọi món.');
  const prompt = [
    'Bạn là trợ lý đọc phiếu gọi món viết tay cho quán XE KHÔ CHỮA LÀNH.',
    'Hãy đọc ảnh phiếu gọi món và trả về đúng 1 JSON duy nhất.',
    'Ưu tiên đọc: số bàn, hình thức (dine_in/takeaway), danh sách món, số lượng, ghi chú.',
    'Nếu món không chắc, vẫn ghi tên gần đúng nhất mà bạn đọc được.',
    'Schema:',
    '{"table":"<so ban hoac takeaway hoac rong>","service_mode":"dine_in|takeaway|unknown","items":[{"slot":1,"name":"<ten mon>","qty":1,"note":"","confidence":0.0}],"note":"<ghi chu chung>","rawText":"<toan bo noi dung doc duoc>","overallConfidence":0.0}',
    caption ? `Ghi chú người gửi: ${caption}` : '',
    'Không dùng markdown.',
  ].filter(Boolean).join('\n');
  const vertexConfig = getVertexRuntimeConfig();
  try {
    const { payload, modelName, authSource } = await generateVertexText({
      secretJson: vertexConfig.secretJson,
      projectId: vertexConfig.projectId,
      location: vertexConfig.location,
      modelNames: buildVertexTextModels(vertexConfig.textModel),
      authStrategy: 'adc_first',
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { data: base64Data, mimeType: mimeType || 'image/jpeg' } },
        ],
      }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        maxOutputTokens: 1200,
      },
    });

    const text = collectTextFromPayload(payload);
    const parsed = extractFirstJson(text);
    if (!parsed) {
      throw new Error('Vertex OCR phiếu gọi món không trả về JSON hợp lệ.');
    }
    logger.info('Order slip OCR used Vertex', {
      modelName,
      authSource,
      location: vertexConfig.location,
    });
    return parsed;
  } catch (vertexError) {
    logger.warn('Order slip Vertex OCR attempt failed', {
      error: vertexError?.message || String(vertexError),
      location: vertexConfig.location,
    });
    throw new Error(`OCR phiếu gọi món trên Vertex thất bại: ${vertexError?.message || String(vertexError)}`);
  }
}

async function createTelegramOrderDraftFromPhoto({ chatId, sourceMessageId, userId, username, caption, imageBase64, mimeType, botToken }) {
  const parsed = await runVertexOrderSlipOcr({ caption, imageBase64, mimeType });
  const serviceMode = normalizeTelegramServiceMode(parsed?.service_mode || parsed?.serviceMode || '');
  const tableValue = parseTelegramOrderTable(parsed?.table || parsed?.table_id || parsed?.ban || '');
  const items = (Array.isArray(parsed?.items) ? parsed.items : [])
    .map((item, index) => ({
      slot: Number(item?.slot) > 0 ? Number(item.slot) : (index + 1),
      ten_mon: String(item?.name || item?.ten_mon || '').trim(),
      so_luong: Number(item?.qty ?? item?.so_luong) || 1,
      ghi_chu: String(item?.note || item?.ghi_chu || '').trim(),
    }))
    .filter(item => item.ten_mon);

  if (!items.length) {
    throw new Error('Bot chưa đọc được món nào từ ảnh phiếu. Anh/chị chụp lại rõ hơn hoặc nhập tay bằng /fix.');
  }

  const { createPendingOrderAction } = getAiDeps();
  const validation = await createPendingOrderAction({
    ban: serviceMode === 'takeaway' ? 'takeaway' : tableValue,
    serviceMode,
    items,
    ghi_chu: String(parsed?.note || caption || '').trim(),
  }, {
    db,
    noPersist: true,
    source: 'telegram_order_draft',
    chatId,
    userId,
    username,
  });

  if (!validation?.ok || !validation?.payload) {
    throw new Error(validation?.error || 'Không tạo được bản nháp gọi món.');
  }

  const draftRef = db.collection('telegram_order_drafts').doc();
  const row = {
    id: draftRef.id,
    chatId: String(chatId || ''),
    sourceMessageId: Number(sourceMessageId || 0) || null,
    createdByUserId: String(userId || ''),
    createdByUsername: String(username || ''),
    status: 'draft',
    payload: validation.payload,
    preview: String(validation.preview || ''),
    validationSummary: validation.validation_summary || null,
    suggestedItems: validation.suggested_items || [],
    rejectedItems: validation.rejected_items || [],
    rawOcrText: String(parsed?.rawText || '').trim(),
    sourceCaption: String(caption || '').trim(),
    overallConfidence: Number(parsed?.overallConfidence || 0) || 0,
    updatedAtMs: Date.now(),
    createdAtMs: Date.now(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await draftRef.set(row);
  await setTelegramDraftSession({ chatId, userId, draftId: draftRef.id });

  const messageText = buildTelegramOrderDraftMessage(row);
  const sendResult = await sendTelegramInlineMessage({
    chatId,
    botToken,
    text: messageText,
    buttons: buildTelegramDraftButtons(draftRef.id),
  });
  const previewMessageId = Number(sendResult?.result?.message_id || 0) || null;
  await draftRef.set({
    previewMessageId,
    updatedAtMs: Date.now(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return {
    draftId: draftRef.id,
    previewMessageId,
    payload: row.payload,
    messageText,
  };
}

async function getTelegramDraftById(draftId) {
  const snap = await db.collection('telegram_order_drafts').doc(String(draftId || '').trim()).get();
  if (!snap.exists) return null;
  return { docId: snap.id, ...(snap.data() || {}) };
}

function buildTelegramDraftSessionId(chatId, userId) {
  return `${String(chatId || '').trim()}__${String(userId || '').trim()}`;
}

async function setTelegramDraftSession({ chatId, userId, draftId }) {
  const safeChatId = String(chatId || '').trim();
  const safeUserId = String(userId || '').trim();
  const safeDraftId = String(draftId || '').trim();
  if (!safeChatId || !safeUserId || !safeDraftId) return;
  const sessionId = buildTelegramDraftSessionId(safeChatId, safeUserId);
  await db.collection('telegram_order_draft_sessions').doc(sessionId).set({
    chatId: safeChatId,
    userId: safeUserId,
    draftId: safeDraftId,
    updatedAtMs: Date.now(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

async function clearTelegramDraftSession({ chatId, userId }) {
  const sessionId = buildTelegramDraftSessionId(chatId, userId);
  if (!sessionId || sessionId === '__') return;
  await db.collection('telegram_order_draft_sessions').doc(sessionId).delete().catch(() => null);
}

async function getTelegramDraftSession({ chatId, userId }) {
  const sessionId = buildTelegramDraftSessionId(chatId, userId);
  if (!sessionId || sessionId === '__') return null;
  const snap = await db.collection('telegram_order_draft_sessions').doc(sessionId).get().catch(() => null);
  if (!snap?.exists) return null;
  return snap.data() || null;
}

async function findLatestTelegramOrderDraft(chatId, replyMessageId = null) {
  const snap = await db.collection('telegram_order_drafts')
    .where('chatId', '==', String(chatId || ''))
    .where('status', '==', 'draft')
    .limit(20)
    .get()
    .catch(() => null);
  const rows = snap?.docs
    ? snap.docs.map(doc => ({ docId: doc.id, ...(doc.data() || {}) }))
    : [];
  const sorted = rows.sort((a, b) => Number(b.updatedAtMs || 0) - Number(a.updatedAtMs || 0));
  if (replyMessageId) {
    const matched = sorted.find(row => Number(row.previewMessageId || 0) === Number(replyMessageId) || Number(row.sourceMessageId || 0) === Number(replyMessageId));
    if (matched) return matched;
  }
  return sorted[0] || null;
}

function parseTelegramDraftFixCommand(text = '') {
  const raw = String(text || '').trim();
  if (!/^\/fix\b/i.test(raw)) return null;
  const body = raw.replace(/^\/fix\b/i, '').trim();
  const normalized = normalizeVi(body);
  if (!normalized) return { type: 'help' };

  const deleteMatch = normalized.match(/^xoa(?:\s+mon)?\s+(\d+)$/);
  if (deleteMatch) return { type: 'remove_item', slot: Number(deleteMatch[1]) };

  const tableMatch = normalized.match(/^ban\s+(.+)$/);
  if (tableMatch) {
    const index = body.indexOf(' ');
    return { type: 'set_table', table: String(index >= 0 ? body.slice(index + 1) : '').trim() };
  }

  if (normalized === 'mang ve' || normalized === 'takeaway') return { type: 'set_service_mode', serviceMode: 'takeaway' };
  if (normalized === 'dung tai ban' || normalized === 'tai ban') return { type: 'set_service_mode', serviceMode: 'dine_in' };

  if (normalized.startsWith('them ')) {
    const itemText = body.slice(body.indexOf(' ') + 1).trim();
    const parsed = parseDraftItemText(itemText);
    if (!parsed) return { type: 'invalid', error: 'Không đọc được món cần thêm.' };
    return { type: 'add_item', item: parsed };
  }

  const eqIndex = body.indexOf('=');
  if (eqIndex >= 0) {
    const leftNorm = normalizeVi(body.slice(0, eqIndex));
    const valueText = body.slice(eqIndex + 1).trim();
    const replaceMatch = leftNorm.match(/^(?:mon\s+)?(\d+)$/);
    if (replaceMatch) {
      const parsed = parseDraftItemText(valueText);
      if (!parsed) return { type: 'invalid', error: 'Không đọc được nội dung chỉnh món.' };
      return {
        type: 'replace_item',
        slot: Number(replaceMatch[1]),
        item: parsed,
      };
    }
  }

  return { type: 'help' };
}

function parseTelegramDraftFixCommands(text = '') {
  const raw = String(text || '').trim();
  if (!/^\/fix\b/i.test(raw)) return null;
  const lines = raw
    .split(/\r?\n+/)
    .map(line => String(line || '').trim())
    .filter(Boolean);
  if (!lines.length) return [{ type: 'help' }];

  return lines.map((line, index) => {
    const normalizedLine = index === 0 || /^\/fix\b/i.test(line) ? line : `/fix ${line}`;
    return parseTelegramDraftFixCommand(normalizedLine);
  });
}

async function refreshTelegramOrderDraft(draft, overrides = {}) {
  const { createPendingOrderAction } = getAiDeps();
  const payload = draft?.payload || {};
  const lines = Array.isArray(overrides.items) ? overrides.items : buildDraftLineInputsFromPayload(payload);
  const serviceMode = overrides.serviceMode !== undefined
    ? String(overrides.serviceMode || '').trim()
    : String(payload.serviceMode || '').trim();
  const tableId = overrides.tableId !== undefined
    ? String(overrides.tableId || '').trim()
    : String(payload.ban || '').trim();
  const note = overrides.note !== undefined
    ? String(overrides.note || '').trim()
    : String(payload.ghi_chu || '').trim();

  const validated = await createPendingOrderAction({
    ban: serviceMode === 'takeaway' ? 'takeaway' : tableId,
    serviceMode,
    items: lines,
    ghi_chu: note,
  }, {
    db,
    noPersist: true,
    source: 'telegram_order_fix',
    chatId: draft.chatId,
    userId: draft.createdByUserId,
    username: draft.createdByUsername,
  });

  if (!validated?.ok || !validated?.payload) {
    throw new Error(validated?.error || 'Không cập nhật được bản nháp.');
  }

  const nextData = {
    payload: validated.payload,
    preview: String(validated.preview || ''),
    validationSummary: validated.validation_summary || null,
    suggestedItems: validated.suggested_items || [],
    rejectedItems: validated.rejected_items || [],
    updatedAtMs: Date.now(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await db.collection('telegram_order_drafts').doc(String(draft.docId || draft.id || '')).set(nextData, { merge: true });
  return {
    ...draft,
    ...nextData,
  };
}

async function applyTelegramDraftFix({ draft, fixCommand, chatId, botToken }) {
  if (!draft) throw new Error('Không tìm thấy bản nháp đang mở.');
  if (!fixCommand || !fixCommand.type) throw new Error('Lệnh /fix không hợp lệ.');

  if (fixCommand.type === 'help') {
    await sendTelegramTextMessage({
      chatId,
      botToken,
      text: 'Cú pháp mẫu: /fix mon 3 = bò khô nướng x1 | /fix xoa mon 2 | /fix them ba chỉ nướng lá lốt x1 | /fix ban 1 | /fix mang ve',
    });
    return draft;
  }
  if (fixCommand.type === 'invalid') throw new Error(fixCommand.error || 'Lệnh /fix không hợp lệ.');

  const nextItems = buildDraftLineInputsFromPayload(draft.payload || {});
  const slotIndex = (slot) => nextItems.findIndex(item => Number(item.slot || 0) === Number(slot || 0));

  if (fixCommand.type === 'replace_item') {
    const idx = slotIndex(fixCommand.slot);
    if (idx < 0) throw new Error(`Không tìm thấy món số ${fixCommand.slot} để sửa.`);
    nextItems[idx] = {
      ...nextItems[idx],
      ten_mon: fixCommand.item.ten_mon,
      so_luong: fixCommand.item.so_luong,
      ghi_chu: String(fixCommand.item.ghi_chu || nextItems[idx].ghi_chu || '').trim(),
    };
  } else if (fixCommand.type === 'remove_item') {
    const idx = slotIndex(fixCommand.slot);
    if (idx < 0) throw new Error(`Không tìm thấy món số ${fixCommand.slot} để xóa.`);
    nextItems.splice(idx, 1);
  } else if (fixCommand.type === 'add_item') {
    const maxSlot = nextItems.reduce((max, item) => Math.max(max, Number(item.slot || 0)), 0);
    nextItems.push({
      slot: maxSlot + 1,
      ten_mon: fixCommand.item.ten_mon,
      so_luong: fixCommand.item.so_luong,
      ghi_chu: String(fixCommand.item.ghi_chu || '').trim(),
    });
  }

  const overrides = {};
  if (fixCommand.type === 'set_table') overrides.tableId = parseTelegramOrderTable(fixCommand.table);
  if (fixCommand.type === 'set_service_mode') {
    overrides.serviceMode = fixCommand.serviceMode;
    if (fixCommand.serviceMode === 'takeaway') overrides.tableId = 'takeaway';
  }
  if (['replace_item', 'remove_item', 'add_item'].includes(fixCommand.type)) overrides.items = nextItems;

  const updatedDraft = await refreshTelegramOrderDraft(draft, overrides);
  const previewText = buildTelegramOrderDraftMessage(updatedDraft);
  const edited = await editTelegramInlineMessage({
    chatId,
    messageId: updatedDraft.previewMessageId,
    botToken,
    text: previewText,
    buttons: buildTelegramDraftButtons(updatedDraft.docId || updatedDraft.id),
  });

  if (!edited) {
    const resent = await sendTelegramInlineMessage({
      chatId,
      botToken,
      text: previewText,
      buttons: buildTelegramDraftButtons(updatedDraft.docId || updatedDraft.id),
    });
    const nextMessageId = Number(resent?.result?.message_id || 0) || null;
    if (nextMessageId) {
      await db.collection('telegram_order_drafts').doc(String(updatedDraft.docId || updatedDraft.id)).set({
        previewMessageId: nextMessageId,
        updatedAtMs: Date.now(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      updatedDraft.previewMessageId = nextMessageId;
    }
  }

  return updatedDraft;
}

async function confirmTelegramOrderDraft({ draftId, chatId, messageId, botToken, actor }) {
  const draft = await getTelegramDraftById(draftId);
  if (!draft) return { ok: false, error: 'Bản nháp không tồn tại hoặc đã hết hạn.' };
  if (String(draft.status || '') !== 'draft') return { ok: false, error: 'Bản nháp này đã được xử lý trước đó.' };

  const payload = draft.payload || {};
  if (!String(payload.ban || '').trim()) {
    return { ok: false, error: 'Bản nháp chưa có số bàn. Dùng /fix ban <so ban> trước khi xác nhận.' };
  }
  if (Array.isArray(payload.unresolvedItems) && payload.unresolvedItems.length) {
    return { ok: false, error: `Còn ${payload.unresolvedItems.length} món chưa đủ chắc chắn. Dùng /fix để chỉnh lại trước khi xác nhận.` };
  }

  const { createPendingOrderAction, executePendingAction } = getAiDeps();
  const pending = await createPendingOrderAction({
    ban: String(payload.ban || '').trim(),
    serviceMode: String(payload.serviceMode || '').trim(),
    items: buildDraftLineInputsFromPayload(payload),
    ghi_chu: String(payload.ghi_chu || '').trim(),
  }, {
    db,
    chatId,
    userId: actor?.userId,
    username: actor?.username,
    source: 'telegram_order_confirm',
  });

  if (!pending?.ok || !pending?.docId) {
    return { ok: false, error: pending?.error || 'Không tạo được lệnh xác nhận đơn.' };
  }

  const result = await executePendingAction(pending.docId, { db });
  if (!result?.ok) return { ok: false, error: result?.error || 'Không lên đơn được.' };

  await db.collection('telegram_order_drafts').doc(String(draft.docId || draft.id)).set({
    status: 'confirmed',
    confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
    confirmedBy: actor || null,
    confirmedOrderId: String(result.orderId || ''),
    confirmationResult: {
      orderId: String(result.orderId || ''),
      tableId: String(result.tableId || ''),
      tableName: String(result.tableName || ''),
      total: Number(result.total || 0) || 0,
      appendedToExisting: result.appendedToExisting === true,
    },
    updatedAtMs: Date.now(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  await clearTelegramDraftSession({ chatId, userId: actor?.userId });

  const finalText = [
    '<b>ĐÃ LÊN ĐƠN THÀNH CÔNG</b>',
    `<b>Bàn:</b> ${escapeTelegramHtml(result.tableName || (payload.ban === 'takeaway' ? 'Mang về' : `Bàn ${payload.ban}`))}`,
    `<b>Order:</b> <code>${escapeTelegramHtml(String(result.orderId || ''))}</code>`,
    `<b>Số dòng món mới:</b> ${escapeTelegramHtml(String(result.itemCount || 0))}`,
    `<b>Trạng thái:</b> ${result.appendedToExisting ? 'Đã cộng vào đơn đang mở' : 'Đã tạo đơn mới'}`,
  ].join('\n');

  await editTelegramInlineMessage({
    chatId,
    messageId,
    botToken,
    text: finalText,
    buttons: [],
  });

  return { ok: true, result };
}

function getHistoryBusinessId(order) {
  return telegramOrders.getHistoryBusinessId(order);
}

function getHistoryVersionDate(order) {
  return telegramOrders.getHistoryVersionDate(order);
}

function getHistoryVersionTime(order) {
  return telegramOrders.getHistoryVersionTime(order);
}

function isCompletedHistoryOrderForReports(order) {
  return telegramOrders.isCompletedHistoryOrderForReports(order);
}

function isVisibleHistoryOrderForReports(order) {
  return telegramOrders.isVisibleHistoryOrderForReports(order);
}

function coerceHistoryDate(value) {
  return telegramReports.coerceHistoryDate(value);
}

function formatTelegramDateTimeVi(value) {
  return telegramReports.formatTelegramDateTimeVi(value);
}

function getTelegramPayMethodLabel(payMethod) {
  return telegramReports.getTelegramPayMethodLabel(payMethod);
}

function isTelegramBankPayMethod(payMethod) {
  return telegramReports.isTelegramBankPayMethod(payMethod);
}

function extractTelegramCashierName(value) {
  return telegramOrders.extractTelegramCashierName(value);
}

function getVietnamDayRange(date = new Date()) {
  return telegramAds.getVietnamDayRange(date);
}

async function buildTelegramCompletedOrderShiftSummary(order = {}) {
  const normalizedOrder = normalizeCompletedOrderForTelegram(order.historyId || order.id || order.docId || '', order);
  const orderDate = coerceHistoryDate(normalizedOrder.paidAt || normalizedOrder.updatedAt || normalizedOrder.timestamp) || new Date();
  const range = getVietnamDayRange(orderDate);
  const historySnap = await db.collection('history').get();
  const orders = historySnap.docs
    .map(doc => ({ docId: doc.id, ...(doc.data() || {}) }))
    .filter(row => {
      if (!isVisibleHistoryOrderForReports(row)) return false;
      const paidAt = coerceHistoryDate(row.paidAt || row.timestamp);
      if (!(paidAt instanceof Date) || Number.isNaN(paidAt.getTime())) return false;
      return paidAt >= range.from && paidAt <= orderDate;
    });

  let totalOrders = 0;
  let totalAmount = 0;
  let cashAmount = 0;
  let bankAmount = 0;

  orders.forEach(row => {
    const normalizedRow = normalizeCompletedOrderForTelegram(row.historyId || row.id || row.docId || '', row);
    const total = Number(normalizedRow.total || 0);
    totalOrders += 1;
    totalAmount += total;
    if (isTelegramBankPayMethod(normalizedRow.payMethod)) bankAmount += total;
    else cashAmount += total;
  });

  return { totalOrders, totalAmount, cashAmount, bankAmount };
}

function pickFirstPresentValue(...values) {
  return telegramOrders.pickFirstPresentValue(...values);
}

function toTelegramMoneyNumber(...values) {
  return telegramOrders.toTelegramMoneyNumber(...values);
}

function normalizeCompletedOrderItems(order = {}) {
  return telegramOrders.normalizeCompletedOrderItems(order);
}

function calculateCompletedOrderSubtotal(items = []) {
  return telegramOrders.calculateCompletedOrderSubtotal(items);
}

function normalizeCompletedOrderForTelegram(historyId, order = {}) {
  return telegramOrders.normalizeCompletedOrderForTelegram(historyId, order);
}

// Override formatter with clean UTF-8 text to avoid mojibake in completed-order Telegram reports.
// Final override: normalize completed-order payloads before formatting/sending.
function buildTelegramCompletedOrderMessage(historyId, order = {}, shiftSummary = null) {
  const normalizedOrder = normalizeCompletedOrderForTelegram(historyId, order);
  const items = normalizedOrder.items;
  const tableName = normalizeTelegramTableLabel(normalizedOrder.tableName || normalizedOrder.tableId || '');
  const billNo = String(normalizedOrder.billNo || normalizedOrder.id || normalizedOrder.historyId || historyId || '').trim() || 'Không rõ';
  const paidAt = normalizedOrder.paidAt || normalizedOrder.updatedAt || normalizedOrder.timestamp || null;
  const subtotal = Number(normalizedOrder.subtotal || 0);
  const discount = Number(normalizedOrder.discount || 0);
  const shipping = Number(normalizedOrder.shipping || 0);
  const vatAmount = Number(normalizedOrder.vatAmount || 0);
  const total = Number(normalizedOrder.total || 0);
  const note = String(normalizedOrder.note || '').trim();
  const discountNote = String(normalizedOrder.discountNote || '').trim();
  const cashier = extractTelegramCashierName(
    normalizedOrder.createdByName
    || normalizedOrder.paidByName
    || normalizedOrder.paidBy
    || normalizedOrder.createdBy
    || normalizedOrder.updatedBy
  );

  const itemLines = items.length
    ? items.map(item => {
      const name = String(item?.name || 'Món').trim();
      const qty = Number(item?.qty || 0) || 1;
      const price = Number(item?.price || 0);
      const lineTotal = price * qty;
      const itemNote = String(item?.note || '').trim();
      const noteText = itemNote ? ` (${escapeTelegramHtml(itemNote)})` : '';
      return `• ${escapeTelegramHtml(name)} x${escapeTelegramHtml(formatQtyVi(qty))} - ${escapeTelegramHtml(formatCurrencyVi(lineTotal))}${noteText}`;
    }).join('\n')
    : '• Không có chi tiết';

  const lines = [
    '<b>✅ HOÀN TẤT ĐƠN HÀNG</b>',
    '',
    `<b>Hóa đơn:</b> ${escapeTelegramHtml(billNo)}`,
    `<b>Bàn/Kênh:</b> ${escapeTelegramHtml(tableName)}`,
    `<b>Thời gian:</b> ${escapeTelegramHtml(formatTelegramDateTimeVi(paidAt))}`,
    `<b>Thanh toán:</b> ${escapeTelegramHtml(getTelegramPayMethodLabel(normalizedOrder.payMethod))}`,
  ];

  if (cashier) lines.push(`<b>Nhân viên:</b> ${escapeTelegramHtml(cashier)}`);
  if (note) lines.push(`<b>Ghi chú:</b> ${escapeTelegramHtml(note)}`);

  lines.push(
    '',
    '<b>Món:</b>',
    itemLines,
    '',
    `<b>Tiền hàng:</b> ${escapeTelegramHtml(formatCurrencyVi(subtotal))}`
  );

  if (discount > 0) {
    lines.push(`<b>Giảm giá${discountNote ? ` (${escapeTelegramHtml(discountNote)})` : ''}:</b> -${escapeTelegramHtml(formatCurrencyVi(discount))}`);
  }
  if (shipping > 0) lines.push(`<b>Phí giao hàng:</b> +${escapeTelegramHtml(formatCurrencyVi(shipping))}`);
  if (vatAmount > 0) lines.push(`<b>VAT${normalizedOrder.taxRate ? ` (${escapeTelegramHtml(normalizedOrder.taxRate)}%)` : ''}:</b> +${escapeTelegramHtml(formatCurrencyVi(vatAmount))}`);

  lines.push(`<b>TỔNG CỘNG:</b> ${escapeTelegramHtml(formatCurrencyVi(total))}`);
  if (shiftSummary) {
    lines.push(
      `<i>Tổng đơn trong ca: ${escapeTelegramHtml(String(shiftSummary.totalOrders || 0))} · Tổng tiền trong ca: ${escapeTelegramHtml(formatCurrencyVi(shiftSummary.totalAmount || 0))}</i>`,
      `<i>Tiền mặt trong ca: ${escapeTelegramHtml(formatCurrencyVi(shiftSummary.cashAmount || 0))} · Chuyển khoản trong ca: ${escapeTelegramHtml(formatCurrencyVi(shiftSummary.bankAmount || 0))}</i>`
    );
  }

  return lines.join('\n');
}

async function sendCompletedOrderTelegram(historyId, order = {}) {
  const botToken = getTelegramReportBotToken();
  const targetChatIds = getCompletedOrderTelegramTargetChatIds();
  if (!botToken || !targetChatIds.length) {
    logger.warn('Skipping completed-order Telegram: missing token/chat', {
      historyId,
      hasBotToken: !!botToken,
      targetChatIds,
    });
    return;
  }

  const normalizedOrder = normalizeCompletedOrderForTelegram(historyId, order);
  const dedupeId = String(historyId || normalizedOrder.historyId || normalizedOrder.id || normalizedOrder.billNo || '').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 1400);
  const ref = db.collection('telegram_completed_order_sent').doc(dedupeId || db.collection('telegram_completed_order_sent').doc().id);
  const created = await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (snap.exists) return false;
    tx.set(ref, {
      historyId: String(historyId || ''),
      billNo: String(normalizedOrder.billNo || normalizedOrder.id || ''),
      tableId: String(normalizedOrder.tableId || ''),
      tableName: String(normalizedOrder.tableName || ''),
      total: Number(normalizedOrder.total || 0),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return true;
  });

  if (!created) {
    logger.info('Skipping completed-order Telegram: already sent', { historyId });
    return;
  }

  let shiftSummary = null;
  try {
    shiftSummary = await buildTelegramCompletedOrderShiftSummary(normalizedOrder);
  } catch (error) {
    logger.warn('Completed-order Telegram shift summary failed', {
      historyId,
      message: error?.message || String(error),
    });
  }

  const enrichedItems = await enrichTelegramItemsWithCatalog(normalizedOrder.items || []);
  const text = buildTelegramCompletedOrderMessage(historyId, {
    ...normalizedOrder,
    items: enrichedItems,
  }, shiftSummary);
  let lastError = null;
  let sentChatId = '';
  for (const chatId of targetChatIds) {
    try {
      await sendTelegramHtmlMessage({ chatId, text, botToken });
      sentChatId = chatId;
      break;
    } catch (error) {
      lastError = error;
      logger.warn('Completed-order Telegram send failed for chat', {
        historyId,
        chatId,
        error: error?.message || String(error),
        responseData: error?.response?.data || null,
      });
    }
  }

  if (!sentChatId) {
    throw lastError || new Error('No Telegram chat accepted completed-order notification');
  }

  logger.info('Completed-order Telegram sent', {
    historyId,
    chatId: sentChatId,
    total: Number(normalizedOrder.total || 0),
  });
}

async function buildDailyReportTelegramData(range) {
  const [historySnap, inventorySnap] = await Promise.all([
    db.collection('history').get(),
    db.collection('Inventory_Items').get(),
  ]);

  const rawOrders = historySnap.docs.map(doc => ({
    docId: doc.id,
    ...(doc.data() || {}),
  }));
  const orders = rawOrders.filter(order => {
    if (!isVisibleHistoryOrderForReports(order)) return false;

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
    '<b>ðŸ“Š BAO CAO NGAY - XE KHO</b>',
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
      .map(item => `• <b>${escapeTelegramHtml(item.name)}</b>: ${escapeTelegramHtml(formatQtyVi(item.qty))} ${escapeTelegramHtml(item.unit)}`.trim())
      .join('\n')
    : '<i>Khong co mat hang ban thang</i>';

  const lines = [
    settings.isTest ? '<b>ðŸ§ª BAO CAO TEST - XE KHO</b>' : '<b>= BAO CAO NGAY - XE KHO</b>',
    `<i>Khung gio: ${escapeTelegramHtml(report.rangeLabel)} (GMT+7)</i>`,
  ];

  const revenueLines = [];
  if (settings.includeRevenue) {
    revenueLines.push(`• Tong doanh thu thuc te: <b>${escapeTelegramHtml(formatCurrencyVi(report.revenue))}</b>`);
  }
  if (settings.includePaymentBreakdown) {
    revenueLines.push(`• Tien mat: <b>${escapeTelegramHtml(formatCurrencyVi(report.revenueCash))}</b>`);
    revenueLines.push(`• Chuyen khoan: <b>${escapeTelegramHtml(formatCurrencyVi(report.revenueBank))}</b>`);
  }
  if (settings.includeInvoiceCount) {
    revenueLines.push(`• Tong so hoa don: <b>${escapeTelegramHtml(String(report.invoiceCount))}</b>`);
  }
  if (revenueLines.length) {
    lines.push('', '<b>Doanh thu</b>', ...revenueLines);
  }
  if (settings.includeTopItem) {
    lines.push('', '<b>Mon duoc goi nhieu nhat</b>', `• ${topItemLine}`);
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
  return telegramAds.uniqueTokens(values);
}

function normalizeVi(text) {
  return telegramAds.normalizeVi(text);
}

function parseTimeEntity(text) {
  return telegramAds.parseTimeEntity(text);
}

function buildDateRange(timeKey) {
  return telegramAds.buildDateRange(timeKey);
}

function formatPercentVi(value) {
  return telegramAds.formatPercentVi(value);
}

function formatMultipleVi(value) {
  return telegramAds.formatMultipleVi(value);
}

function getVietnamDateYmd(date = new Date()) {
  return telegramAds.getVietnamDateYmd(date);
}

function formatVietnamDateDisplayFromYmd(ymd) {
  return telegramAds.formatVietnamDateDisplayFromYmd(ymd);
}

function buildVietnamAbsoluteDayRangeFromYmd(ymd) {
  return telegramAds.buildVietnamAbsoluteDayRangeFromYmd(ymd);
}

function buildVietnamAbsoluteRangeFromYmds(fromYmd, toYmd) {
  return telegramAds.buildVietnamAbsoluteRangeFromYmds(fromYmd, toYmd);
}

function parseExplicitDateInput(text) {
  return telegramAds.parseExplicitDateInput(text);
}

function getVietnamYesterdayYmd(now = new Date()) {
  return telegramAds.getVietnamYesterdayYmd(now);
}

function buildAdsDateRangeFromText(text = '', now = new Date(), options = {}) {
  return telegramAds.buildAdsDateRangeFromText(text, now, options);
}

async function queryManualAdsDailyStats(range) {
  const snap = await db.collection('ads_daily_reports').get().catch(() => null);
  const docs = snap?.docs || [];
  const startYmd = String(range.fromYmd || '').trim();
  const endYmd = String(range.toYmd || '').trim();
  const emptyChannel = () => ({
    spend: 0,
    clicks: 0,
    interactions: 0,
    impressions: 0,
    reach: 0,
    purchases: 0,
    addToCart: 0,
  });
  const totals = {
    facebook: emptyChannel(),
    tiktok: emptyChannel(),
    source: docs.length ? 'manual' : 'missing',
  };
  docs.forEach(docSnap => {
    const row = docSnap.data() || {};
    const dateKey = String(row.date || docSnap.id || '').trim();
    const parsed = parseExplicitDateInput(dateKey) || (/^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? dateKey : '');
    if (!parsed) return;
    if (startYmd && parsed < startYmd) return;
    if (endYmd && parsed > endYmd) return;
    ['facebook', 'tiktok'].forEach(channel => {
      const payload = row[channel] || {};
      totals[channel].spend += Number(payload.spend || 0) || 0;
      totals[channel].clicks += Number(payload.clicks || 0) || 0;
      totals[channel].interactions += Number(payload.interactions || payload.clicks || 0) || 0;
      totals[channel].impressions += Number(payload.impressions || 0) || 0;
      totals[channel].reach += Number(payload.reach || 0) || 0;
      totals[channel].purchases += Number(payload.purchases ?? payload.purchase ?? 0) || 0;
      totals[channel].addToCart += Number(payload.addToCart ?? payload.add_to_cart ?? payload.addToCarts ?? 0) || 0;
    });
  });
  return totals;
}

function buildAdsChannelMetrics(input = {}) {
  return telegramAds.buildAdsChannelMetrics(input);
}

function sumAdsChannels(channels = []) {
  return telegramAds.sumAdsChannels(channels);
}

async function fetchMetaAdsInsights(range) {
  const adAccountId = String(META_AD_ACCOUNT_ID.value() || '').trim();
  const accessToken = String(META_ACCESS_TOKEN.value() || '').trim();
  if (!adAccountId || !accessToken) {
    return buildAdsChannelMetrics({ configured: false, source: 'missing-config' });
  }

  try {
    const response = await axios.get(`https://graph.facebook.com/v23.0/${encodeURIComponent(adAccountId)}/insights`, {
      params: {
        fields: 'spend,clicks,cpc,cpm,ctr,impressions,reach,actions',
        level: 'account',
        time_range: JSON.stringify({
          since: range.fromYmd,
          until: range.toYmd,
        }),
        access_token: accessToken,
      },
      timeout: 60000,
    });
    const row = Array.isArray(response.data?.data) ? (response.data.data[0] || {}) : {};
    const spend = Number(row.spend || 0) || 0;
    const clicks = Number(row.clicks || 0) || 0;
    const impressions = Number(row.impressions || 0) || 0;
    const actions = Array.isArray(row.actions) ? row.actions : [];
    const getActionValue = names => actions
      .filter(action => names.includes(String(action.action_type || '').toLowerCase()))
      .reduce((sum, action) => sum + (Number(action.value || 0) || 0), 0);
    return buildAdsChannelMetrics({
      configured: true,
      source: 'meta-api',
      spend,
      clicks,
      interactions: clicks,
      impressions,
      reach: Number(row.reach || 0) || 0,
      purchases: getActionValue(['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase']),
      addToCart: getActionValue(['add_to_cart', 'omni_add_to_cart', 'offsite_conversion.fb_pixel_add_to_cart']),
      cpc: Number(row.cpc || 0) || 0,
      cpm: Number(row.cpm || 0) || 0,
      ctr: Number(row.ctr || 0) || 0,
    });
  } catch (error) {
    const apiMessage = error?.response?.data?.error?.message || error?.message || 'Meta API error';
    logger.error('fetchMetaAdsInsights failed', {
      adAccountId,
      fromYmd: range.fromYmd,
      toYmd: range.toYmd,
      error: apiMessage,
      responseData: error?.response?.data || null,
    });
    return buildAdsChannelMetrics({
      configured: true,
      source: 'meta-api-error',
      error: apiMessage,
    });
  }
}

async function buildAdsRevenueTelegramData(range) {
  return telegramAds.buildAdsRevenueTelegramData(range);
}

function buildAdsRevenueTelegramMessage(report, options = {}) {
  return telegramAds.buildAdsRevenueTelegramMessage(report, options);
}

function formatIntVi(value) {
  return telegramAds.formatIntVi(value);
}

function buildAdsChannelLines(channel = {}) {
  return telegramAds.buildAdsChannelLines(channel);
}

function buildAdsInsightLines(report = {}) {
  return telegramAds.buildAdsInsightLines(report);
}

function buildAdsRevenueDetailedMessage(report, options = {}) {
  return telegramAds.buildAdsRevenueDetailedMessage(report, options);
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
  const { NlpManager, training } = getAiDeps();

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
      const incomingLineItemId = String(it.lineItemId || '').trim();
      const idx = incomingLineItemId
        ? list.findIndex(x => String(x.lineItemId || '').trim() === incomingLineItemId)
        : list.findIndex(x => x.id === it.id && String(x.note || '') === String(it.note || ''));
      if (idx >= 0) list[idx].qty = (Number(list[idx].qty) || 1) + (Number(it.qty) || 1);
      else list.push({ ...it, qty: Number(it.qty) || 1 });
    });
    tx.update(orderRef, { items: list });
  });
}

function shouldPublishToPublicMenu(data = {}) {
  const itemType = String(data.item_type || '').trim().toLowerCase();
  return !itemType || itemType === 'finished' || itemType === 'retail';
}

function buildPublicMenuPayload(productId, data = {}) {
  const itemType = String(data.item_type || '').trim().toLowerCase();
  const imageUrl = String(data.image_url || data.imageUrl || '').trim();
  const imageMode = String(data.imageMode || '').trim() || (data.realImageUrl ? 'real' : (data.aiImageUrl ? 'ai' : 'placeholder'));
  return {
    productId,
    display_name: data.display_name || data.name || '',
    name: data.name || data.display_name || '',
    description: data.description || data.desc || '',
    category: data.category || 'Khác',
    sell_price: Number(data.sell_price ?? data.price ?? 0) || 0,
    image_url: imageUrl,
    imageUrl,
    aiImageUrl: String(data.aiImageUrl || '').trim(),
    realImageUrl: String(data.realImageUrl || '').trim(),
    imageMode,
    aiPrompt: String(data.aiPrompt || '').trim(),
    item_type: data.item_type || '',
    kitchenRouting: String(data.kitchenRouting || '').trim().toLowerCase() || (itemType === 'retail' ? 'skip' : 'all'),
    linkedInventoryId: String(data.linkedInventoryId || '').trim() || null,
    hidden: data.hidden === true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

async function syncPublicMenuProjection(productId, data = {}) {
  const ref = db.collection('public_menu').doc(String(productId));
  if (!shouldPublishToPublicMenu(data)) {
    await ref.delete().catch(() => null);
    return;
  }
  await ref.set(buildPublicMenuPayload(String(productId), data), { merge: true });
}

function buildCustomerRequestLogPayload(type, data = {}) {
  return {
    type,
    source: 'customer_web',
    tableNumber: Number(data.tableNumber || 0) || null,
    orderRequestId: data.orderRequestId || data.requestId || null,
    paymentRequestId: data.paymentRequestId || null,
    serviceRequestId: data.serviceRequestId || null,
    status: data.status || 'new',
    message: data.message || '',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

function buildCustomerOrderRequestTelegramMessage(requestId, request = {}) {
  const items = Array.isArray(request.items) ? request.items : [];
  const lines = items.length
    ? items.map(item => {
        const name = escapeTelegramHtml(item.name || item.menuItemId || 'Mon');
        const qty = escapeTelegramHtml(formatQtyVi(item.quantity || item.qty || 1));
        const note = String(item.notes || item.note || '').trim();
        return `• ${name} x${qty}${note ? ` (${escapeTelegramHtml(note)})` : ''}`;
      }).join('\n')
    : '• Khong co chi tiet';

  const notes = String(request.notes || '').trim();
  return [
    '<b>Co yeu cau goi mon moi</b>',
    '',
    `<b>Ban:</b> ${escapeTelegramHtml(String(request.tableNumber || '?'))}`,
    `<b>Ma yeu cau:</b> ${escapeTelegramHtml(String(requestId || ''))}`,
    '<b>Mon da chon:</b>',
    lines,
    '',
    `<b>Tam tinh:</b> ${escapeTelegramHtml(formatCurrencyVi(request.totalPrice || 0))}`,
    notes ? `<b>Ghi chu:</b> ${escapeTelegramHtml(notes)}` : '',
    '',
    '<i>Bam duyet de dua mon vao POS va bep.</i>',
  ].filter(Boolean).join('\n');
}

function buildCustomerServiceRequestTelegramMessage(requestId, payload = {}) {
  return [
    '<b>Khach dang goi nhan vien</b>',
    '',
    `<b>Ban:</b> ${escapeTelegramHtml(String(payload.tableNumber || '?'))}`,
    `<b>Ma yeu cau:</b> ${escapeTelegramHtml(String(requestId || ''))}`,
    `<b>Noi dung:</b> ${escapeTelegramHtml(String(payload.message || 'Khach can ho tro tai ban.'))}`,
  ].join('\n');
}

function formatTelegramBillItems(items = [], { bullet = '•', includeNotes = true } = {}) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return `${bullet} Chưa có chi tiết món`;
  return list.map(item => {
    const name = String(item?.name || 'Món').trim();
    const qty = Number(item?.qty || item?.quantity || 0) || 1;
    const price = Number(item?.price || 0) || 0;
    const lineTotal = price * qty;
    const note = includeNotes ? String(item?.note || item?.notes || '').trim() : '';
    return `${bullet} ${escapeTelegramHtml(name)} x${escapeTelegramHtml(formatQtyVi(qty))} - ${escapeTelegramHtml(formatCurrencyVi(lineTotal))}${note ? ` (${escapeTelegramHtml(note)})` : ''}`;
  }).join('\n');
}

function mapRequestItemsToBillItems(items = []) {
  return (Array.isArray(items) ? items : []).map(item => ({
    id: String(item.menuItemId || item.id || '').trim(),
    name: String(item.name || '').trim() || 'Món',
    qty: Number(item.quantity || item.qty || 1) || 1,
    price: Number(item.price || 0) || 0,
    note: String(item.notes || item.note || '').trim(),
  }));
}

async function buildPaymentBillContextFromRequest(paymentRequestOrId) {
  const inputId = typeof paymentRequestOrId === 'string' ? String(paymentRequestOrId).trim() : '';
  const paymentSnap = inputId
    ? await db.collection('payment_requests').doc(inputId).get()
    : null;
  const paymentDoc = paymentSnap?.exists
    ? { id: paymentSnap.id, ...(paymentSnap.data() || {}) }
    : (paymentRequestOrId && typeof paymentRequestOrId === 'object' ? paymentRequestOrId : null);
  if (!paymentDoc) throw new Error('Payment request not found');

  const orderRequestId = String(paymentDoc.orderRequestId || paymentDoc.orderId || '').trim();
  const orderRequestSnap = orderRequestId
    ? await db.collection('order_requests').doc(orderRequestId).get().catch(() => null)
    : null;
  const orderRequest = orderRequestSnap?.exists ? { id: orderRequestSnap.id, ...(orderRequestSnap.data() || {}) } : null;
  const posOrderId = String(orderRequest?.posOrderId || paymentDoc.posOrderId || '').trim();
  const posOrderSnap = posOrderId
    ? await db.collection('orders').doc(posOrderId).get().catch(() => null)
    : null;
  const posOrder = posOrderSnap?.exists ? { id: posOrderSnap.id, ...(posOrderSnap.data() || {}) } : null;
  const historyId = String(paymentDoc.historyId || orderRequest?.historyId || '').trim();
  const historySnap = historyId
    ? await db.collection('history').doc(historyId).get().catch(() => null)
    : null;
  const historyDoc = historySnap?.exists ? { id: historySnap.id, ...(historySnap.data() || {}) } : null;

  const sourceOrder = posOrder || historyDoc || null;

  const billItems = sourceOrder?.items?.length
    ? (Array.isArray(sourceOrder.items) ? sourceOrder.items : []).map(item => ({
      id: String(item.id || '').trim(),
      name: String(item.name || '').trim() || 'Món',
      qty: Number(item.qty || 1) || 1,
      price: Number(item.price || 0) || 0,
      note: String(item.note || '').trim(),
      kitchenStatus: String(item.kitchenStatus || '').trim(),
    }))
    : mapRequestItemsToBillItems(orderRequest?.items || []);

  const subtotal = billItems.reduce((sum, item) => sum + ((Number(item.qty || 0) || 0) * (Number(item.price || 0) || 0)), 0);
  const discount = Number(sourceOrder?.discount || 0) || 0;
  const shipping = Number(sourceOrder?.shipping || 0) || 0;
  const vatAmount = Number(sourceOrder?.vatAmount || 0) || 0;
  const total = Number(sourceOrder?.total || paymentDoc.finalBillTotal || paymentDoc.temporaryTotal || orderRequest?.totalPrice || subtotal + shipping + vatAmount - discount) || 0;
  const tableNumber = String(paymentDoc.tableNumber || orderRequest?.tableNumber || sourceOrder?.tableId || '?').trim();
  const tableLabel = String(sourceOrder?.tableName || (tableNumber ? `Bàn ${tableNumber}` : 'Bàn ?')).trim();
  const billNo = String(sourceOrder?.billNo || sourceOrder?.id || paymentDoc.billNo || `TEMP-${String(paymentDoc.id || inputId || '').slice(-6).toUpperCase() || 'BILL'}`).trim();

  return {
    paymentRequest: paymentDoc,
    orderRequest,
    posOrder,
    historyDoc,
    orderRequestId,
    posOrderId,
    historyId,
    tableNumber,
    tableLabel,
    billNo,
    billItems,
    subtotal,
    discount,
    shipping,
    vatAmount,
    total,
    note: String(sourceOrder?.note || orderRequest?.notes || '').trim(),
  };
}

async function buildCustomerPaymentRequestTelegramPayload(requestId, payload = {}) {
  try {
    const context = await buildPaymentBillContextFromRequest({ id: requestId, ...payload });
    return {
      ...payload,
      tableNumber: context.tableNumber,
      temporaryTotal: context.total,
      items: context.billItems,
      billNo: context.billNo,
      tableLabel: context.tableLabel,
      subtotal: context.subtotal,
      discount: context.discount,
      shipping: context.shipping,
      vatAmount: context.vatAmount,
      total: context.total,
    };
  } catch (_) {
    return payload;
  }
}

function parseTelegramTablePaymentCommand(text = '') {
  const normalized = normalizeVi(String(text || '').trim()).replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  const match = normalized.match(/^\/?(?:tinhtien|tinh tien|bill)\s*(?:ban\s*)?(\d{1,3})\b/i);
  if (!match) return null;
  const tableNumber = String(match[1] || '').trim();
  if (!tableNumber) return null;
  return { tableNumber };
}

async function findOpenPosOrderByTableId(tableId) {
  const tid = String(tableId || '').trim();
  if (!tid) return null;

  const tableSnap = await db.collection('tables').doc(tid).get().catch(() => null);
  const table = tableSnap?.exists ? (tableSnap.data() || {}) : null;
  const tableName = String(table?.name || `Bàn ${tid}`).trim();
  const preferredOrderId = String(table?.orderId || '').trim();

  if (preferredOrderId) {
    const preferredOrderSnap = await db.collection('orders').doc(preferredOrderId).get().catch(() => null);
    if (preferredOrderSnap?.exists) {
      const order = preferredOrderSnap.data() || {};
      if (String(order.status || 'open').trim().toLowerCase() === 'open') {
        return { id: preferredOrderSnap.id, ...order, tableName };
      }
    }
  }

  const ordersSnap = await db.collection('orders')
    .where('tableId', '==', tid)
    .where('status', '==', 'open')
    .limit(1)
    .get()
    .catch(() => null);
  if (!ordersSnap || ordersSnap.empty) return null;
  const doc = ordersSnap.docs[0];
  return { id: doc.id, ...(doc.data() || {}), tableName: String(doc.data()?.tableName || tableName).trim() };
}

async function createOrReuseTelegramPaymentRequestByTable(tableNumber, userContext = {}) {
  const tid = String(tableNumber || '').trim();
  if (!tid) return { ok: false, error: 'Thiếu số bàn.' };

  const posOrder = await findOpenPosOrderByTableId(tid);
  if (!posOrder) {
    return { ok: false, error: `Không tìm thấy order đang mở của Bàn ${tid}.` };
  }

  const currentTotal = Number(posOrder.total || 0) || Number(posOrder.subtotal || 0) || 0;
  const relatedOrderRequestSnap = await db.collection('order_requests')
    .where('posOrderId', '==', String(posOrder.id))
    .limit(1)
    .get()
    .catch(() => null);
  const relatedOrderRequest = relatedOrderRequestSnap && !relatedOrderRequestSnap.empty
    ? { id: relatedOrderRequestSnap.docs[0].id, ...(relatedOrderRequestSnap.docs[0].data() || {}) }
    : null;

  const existingPaymentSnap = await db.collection('payment_requests')
    .where('posOrderId', '==', String(posOrder.id))
    .limit(5)
    .get()
    .catch(() => null);
  const existingDocs = existingPaymentSnap?.docs || [];
  const activePaymentDoc = existingDocs
    .map(doc => ({ id: doc.id, ...(doc.data() || {}) }))
    .find(doc => !['finalized', 'cancelled'].includes(String(doc.status || '').trim().toLowerCase()));
  if (activePaymentDoc) {
    await sendCustomerPaymentRequestTelegram(String(activePaymentDoc.id), activePaymentDoc);
    return {
      ok: true,
      reused: true,
      requestId: String(activePaymentDoc.id),
      billNo: String(activePaymentDoc.billNo || posOrder.id || '').trim(),
      tableLabel: String(posOrder.tableName || `Bàn ${tid}`).trim(),
    };
  }

  const paymentRef = db.collection('payment_requests').doc();
  const payload = {
    tableNumber: Number(tid) || tid,
    orderRequestId: relatedOrderRequest?.id || null,
    orderId: relatedOrderRequest?.id || null,
    posOrderId: String(posOrder.id || '').trim(),
    billNo: String(posOrder.id || '').trim(),
    temporaryTotal: currentTotal,
    finalBillTotal: currentTotal,
    status: 'requested',
    handledSource: 'telegram',
    source: 'telegram_staff',
    requestedBy: {
      chatId: String(userContext.chatId || '').trim(),
      userId: String(userContext.userId || '').trim(),
      username: String(userContext.username || '').trim(),
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await paymentRef.set(payload, { merge: true });

  return {
    ok: true,
    created: true,
    requestId: paymentRef.id,
    billNo: String(posOrder.id || '').trim(),
    tableLabel: String(posOrder.tableName || `Bàn ${tid}`).trim(),
  };
}

function formatTelegramBillItemsClean(items = [], { bullet = '•', includeNotes = true } = {}) {
  return telegramOnlineOrders.formatTelegramBillItemsClean(items = [], { bullet = '•', includeNotes = true } = {});
}

// Override table normalization for customer-request Telegram flows.
function normalizeTelegramTableLabel(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'Không rõ';
  const normalized = normalizeVi(raw);
  if (!normalized) return 'Không rõ';
  if (normalized === 'takeaway' || normalized.includes('mang ve')) return 'Mang về';

  const shortMatch = normalized.match(/^b\s*[- ]?\s*(\d+)$/i);
  if (shortMatch?.[1]) return `Bàn ${shortMatch[1].trim()}`;

  if (normalized.startsWith('ban ')) {
    const suffix = raw.replace(/^\s*(?:ban|bàn)\s*/i, '').trim();
    if (suffix) return `Bàn ${suffix}`;
  }
  return raw;
}

function buildCustomerOrderRequestTelegramMessageClean(requestId, request = {}) {
  const items = Array.isArray(request.items) ? request.items : [];
  const lines = items.length
    ? items.map(item => {
      const name = escapeTelegramHtml(normalizeTelegramText(item.name || item.productName || item.menuItemId || 'Món'));
      const qty = escapeTelegramHtml(formatQtyVi(item.quantity || item.qty || 1));
      const note = normalizeTelegramText(String(item.notes || item.note || '').trim());
      return `• ${name} x${qty}${note ? ` (${escapeTelegramHtml(note)})` : ''}`;
    }).join('\n')
    : '• Không có chi tiết';

  const notes = normalizeTelegramText(String(request.notes || '').trim());
  return [
    '<b>Có yêu cầu gọi món mới</b>',
    '',
    `<b>Bàn:</b> ${escapeTelegramHtml(normalizeTelegramTableLabel(`Bàn ${String(request.tableNumber || '?')}`))}`,
    `<b>Mã yêu cầu:</b> ${escapeTelegramHtml(String(requestId || ''))}`,
    '<b>Món đã chọn:</b>',
    lines,
    '',
    `<b>Tạm tính:</b> ${escapeTelegramHtml(formatCurrencyVi(request.totalPrice || 0))}`,
    notes ? `<b>Ghi chú:</b> ${escapeTelegramHtml(notes)}` : '',
    '',
    '<i>Bấm duyệt để đưa món vào POS và bếp.</i>',
  ].filter(Boolean).join('\n');
}

function buildCustomerServiceRequestTelegramMessageClean(requestId, payload = {}) {
  return [
    '<b>Khách đang gọi nhân viên</b>',
    '',
    `<b>Bàn:</b> ${escapeTelegramHtml(normalizeTelegramTableLabel(`Bàn ${String(payload.tableNumber || '?')}`))}`,
    `<b>Mã yêu cầu:</b> ${escapeTelegramHtml(String(requestId || ''))}`,
    `<b>Nội dung:</b> ${escapeTelegramHtml(normalizeTelegramText(String(payload.message || 'Khách cần hỗ trợ tại bàn.')))}`,
  ].join('\n');
}

function buildCustomerPaymentRequestTelegramMessageClean(requestId, payload = {}) {
  const itemLines = formatTelegramBillItemsClean(payload.items || []);
  return [
    '<b>Khách đang gọi tính tiền</b>',
    '',
    `<b>Bàn:</b> ${escapeTelegramHtml(normalizeTelegramTableLabel(payload.tableLabel || `Bàn ${String(payload.tableNumber || '?')}`))}`,
    payload.billNo ? `<b>Bill tạm:</b> ${escapeTelegramHtml(normalizeTelegramText(String(payload.billNo)))}` : null,
    `<b>Mã yêu cầu:</b> ${escapeTelegramHtml(String(requestId || ''))}`,
    '',
    '<b>Món tạm tính:</b>',
    itemLines,
    '',
    payload.subtotal ? `<b>Tiền hàng:</b> ${escapeTelegramHtml(formatCurrencyVi(payload.subtotal || 0))}` : null,
    payload.discount ? `<b>Giảm giá:</b> -${escapeTelegramHtml(formatCurrencyVi(payload.discount || 0))}` : null,
    payload.shipping ? `<b>Phụ thu:</b> ${escapeTelegramHtml(formatCurrencyVi(payload.shipping || 0))}` : null,
    payload.vatAmount ? `<b>VAT:</b> ${escapeTelegramHtml(formatCurrencyVi(payload.vatAmount || 0))}` : null,
    `<b>Tạm tính:</b> ${escapeTelegramHtml(formatCurrencyVi(payload.temporaryTotal || payload.total || 0))}`,
    '',
    '<i>Bấm Xác nhận bill để bot gửi ảnh bill + QR chuyển khoản.</i>',
  ].filter(Boolean).join('\n');
}

async function sendCustomerOrderRequestTelegram(requestId, request = {}) {
  const botToken = String(TELEGRAM_BOT_TOKEN.value() || '').trim();
  const chatId = String(TELEGRAM_GROUP_CHAT_ID.value() || '').trim();
  if (!botToken || !chatId) return;
  const enrichedItems = await enrichTelegramItemsWithCatalog(request.items || []);
  const preview = { ...request, items: enrichedItems };

  await sendTelegramInlineMessage({
    chatId,
    botToken,
    text: buildCustomerOrderRequestTelegramMessageClean(requestId, preview),
    buttons: [[
      { text: 'Duyệt đơn', callback_data: `cw_order_ok_${requestId}` },
      { text: 'Từ chối', callback_data: `cw_order_no_${requestId}` },
    ]],
  });
  logger.info('Customer order-request Telegram sent', {
    requestId,
    chatId,
    itemCount: enrichedItems.length,
  });
}

async function sendCustomerServiceRequestTelegram(requestId, payload = {}) {
  const botToken = String(TELEGRAM_BOT_TOKEN.value() || '').trim();
  const chatId = String(TELEGRAM_GROUP_CHAT_ID.value() || '').trim();
  if (!botToken || !chatId) return;

  await sendTelegramInlineMessage({
    chatId,
    botToken,
    text: buildCustomerServiceRequestTelegramMessageClean(requestId, payload),
    buttons: [[
      { text: 'Đã nhận', callback_data: `cw_service_ack_${requestId}` },
      { text: 'Hoàn tất', callback_data: `cw_service_done_${requestId}` },
    ]],
  });
  logger.info('Customer service-request Telegram sent', {
    requestId,
    chatId,
  });
}

async function sendCustomerPaymentRequestTelegram(requestId, payload = {}) {
  const botToken = String(TELEGRAM_BOT_TOKEN.value() || '').trim();
  const chatId = String(TELEGRAM_GROUP_CHAT_ID.value() || '').trim();
  if (!botToken || !chatId) return;
  const previewPayload = await buildCustomerPaymentRequestTelegramPayload(requestId, payload);
  previewPayload.items = await enrichTelegramItemsWithCatalog(previewPayload.items || []);

  await sendTelegramInlineMessage({
    chatId,
    botToken,
    text: buildCustomerPaymentRequestTelegramMessageClean(requestId, previewPayload),
    buttons: [[
      { text: 'Xác nhận bill', callback_data: `cw_payment_confirm_${requestId}` },
      { text: 'Đã nhận', callback_data: `cw_payment_ack_${requestId}` },
    ]],
  });
  logger.info('Customer payment-request Telegram sent', {
    requestId,
    chatId,
    itemCount: Array.isArray(previewPayload.items) ? previewPayload.items.length : 0,
  });
}

async function resolveCustomerOrderRequestTelegram(requestId, nextStatus) {
  const ref = db.collection('order_requests').doc(String(requestId || '').trim());
  const snap = await ref.get();
  if (!snap.exists) {
    return { ok: false, error: 'Yeu cau khong ton tai.' };
  }

  const current = snap.data() || {};
  const currentStatus = String(current.status || '').trim().toLowerCase();
  if (currentStatus === nextStatus) {
    return { ok: true, skipped: 'already-updated', request: current };
  }
  if (currentStatus !== 'pending_approval') {
    return { ok: false, error: `Yeu cau dang o trang thai ${currentStatus || 'khong ro'}.` };
  }

  const updates = {
    status: nextStatus,
    approvalSource: 'telegram',
    approvalActor: 'telegram_bot',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (nextStatus === 'approved') {
    updates.approvedAt = admin.firestore.FieldValue.serverTimestamp();
  }
  if (nextStatus === 'rejected') {
    updates.rejectedAt = admin.firestore.FieldValue.serverTimestamp();
    updates.approvalNote = 'Rejected from Telegram';
  }

  await ref.set(updates, { merge: true });
  await appendSystemLog(buildCustomerRequestLogPayload(
    nextStatus === 'approved' ? 'customer_order_request_approved_from_telegram' : 'customer_order_request_rejected_from_telegram',
    {
      requestId,
      tableNumber: current.tableNumber,
      status: nextStatus,
      message: nextStatus === 'approved'
        ? `Telegram da duyet yeu cau goi mon ban ${current.tableNumber || '?'}.`
        : `Telegram da tu choi yeu cau goi mon ban ${current.tableNumber || '?'}.`,
    },
  ));

  return { ok: true, request: current, nextStatus };
}

async function resolveCustomerServiceRequestTelegram(requestId, nextStatus) {
  const ref = db.collection('service_requests').doc(String(requestId || '').trim());
  const snap = await ref.get();
  if (!snap.exists) {
    return { ok: false, error: 'Yeu cau ho tro khong ton tai.' };
  }

  const current = snap.data() || {};
  const updates = {
    status: nextStatus,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    handledSource: 'telegram',
  };
  if (nextStatus === 'acknowledged') {
    updates.acknowledgedAt = admin.firestore.FieldValue.serverTimestamp();
  }
  if (nextStatus === 'resolved') {
    updates.resolvedAt = admin.firestore.FieldValue.serverTimestamp();
  }
  await ref.set(updates, { merge: true });
  await appendSystemLog(buildCustomerRequestLogPayload('customer_service_request_telegram_update', {
    serviceRequestId: requestId,
    tableNumber: current.tableNumber,
    status: nextStatus,
    message: `Telegram da cap nhat yeu cau ho tro ban ${current.tableNumber || '?'}.`,
  }));
  return { ok: true, request: current, nextStatus };
}

async function resolveCustomerPaymentRequestTelegram(requestId, nextStatus) {
  const ref = db.collection('payment_requests').doc(String(requestId || '').trim());
  const snap = await ref.get();
  if (!snap.exists) {
    return { ok: false, error: 'Yeu cau tinh tien khong ton tai.' };
  }

  const current = snap.data() || {};
  const currentStatus = String(current.status || '').trim().toLowerCase();
  if (currentStatus === 'finalized' && String(nextStatus || '').trim().toLowerCase() === 'acknowledged') {
    return { ok: true, request: current, nextStatus: 'finalized', alreadyFinalized: true };
  }
  await ref.set({
    status: nextStatus,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    handledSource: 'telegram',
    ...(nextStatus === 'acknowledged' ? { acknowledgedAt: admin.firestore.FieldValue.serverTimestamp() } : {}),
  }, { merge: true });

  const orderRequestId = String(current.orderRequestId || current.orderId || '').trim();
  if (orderRequestId) {
    await db.collection('order_requests').doc(orderRequestId).set({
      paymentRequestStatus: nextStatus,
      ...(nextStatus === 'acknowledged' ? { paymentAcknowledgedAt: admin.firestore.FieldValue.serverTimestamp() } : {}),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  await appendSystemLog(buildCustomerRequestLogPayload('customer_payment_request_telegram_update', {
    paymentRequestId: requestId,
    requestId: orderRequestId || null,
    tableNumber: current.tableNumber,
    status: nextStatus,
    message: `Telegram da tiep nhan yeu cau tinh tien ban ${current.tableNumber || '?'}.`,
  }));
  return { ok: true, request: current, nextStatus };
}

async function confirmCustomerPaymentBillTelegram(requestId) {
  const result = await resolveCustomerPaymentRequestTelegram(requestId, 'acknowledged');
  if (!result?.ok) return result;

  const context = await buildPaymentBillContextFromRequest(requestId);
  const asset = await buildPaymentBillImageAsset(context);
  const botToken = String(TELEGRAM_BOT_TOKEN.value() || '').trim();
  const chatId = String(TELEGRAM_GROUP_CHAT_ID.value() || '').trim();
  if (!botToken || !chatId) throw new Error('Missing Telegram config');

  await sendTelegramPhotoMessage({
    chatId,
    botToken,
    photo: asset.imageUrl,
    caption: [
      '<b>✅ BILL XÁC NHẬN</b>',
      `<b>Bàn:</b> ${escapeTelegramHtml(context.tableLabel)}`,
      `<b>Bill:</b> ${escapeTelegramHtml(context.billNo)}`,
      `<b>Tổng cộng:</b> ${escapeTelegramHtml(formatCurrencyVi(context.total || 0))}`,
      '',
      '<i>Chọn hình thức thanh toán để chốt bill.</i>',
    ].join('\n'),
    buttons: [[
      { text: 'Tiền mặt', callback_data: `cw_payment_cash_${requestId}` },
      { text: 'Chuyển khoản', callback_data: `cw_payment_bank_${requestId}` },
      { text: 'Hủy', callback_data: `cw_payment_cancel_${requestId}` },
    ]],
  });

  await db.collection('payment_requests').doc(String(requestId)).set({
    billPreviewImageUrl: asset.imageUrl,
    paymentQrText: asset.qrUrl,
    billPreviewSentAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  if (context.orderRequestId) {
    await db.collection('order_requests').doc(String(context.orderRequestId)).set({
      paymentPreviewImageUrl: asset.imageUrl,
      paymentQrText: asset.qrUrl,
      paymentAcknowledgedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  return { ok: true, request: result.request, nextStatus: 'acknowledged', imageUrl: asset.imageUrl, qrUrl: asset.qrUrl, total: context.total, billNo: context.billNo };
}

async function cancelCustomerPaymentTelegram(requestId) {
  const ref = db.collection('payment_requests').doc(String(requestId || '').trim());
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: 'Yeu cau tinh tien khong ton tai.' };
  const current = snap.data() || {};
  await ref.set({
    status: 'cancelled',
    cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    handledSource: 'telegram',
  }, { merge: true });
  const orderRequestId = String(current.orderRequestId || current.orderId || '').trim();
  if (orderRequestId) {
    await db.collection('order_requests').doc(orderRequestId).set({
      paymentRequestStatus: 'cancelled',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  await appendSystemLog(buildCustomerRequestLogPayload('customer_payment_request_cancelled_from_telegram', {
    paymentRequestId: requestId,
    requestId: orderRequestId || null,
    tableNumber: current.tableNumber,
    status: 'cancelled',
    message: `Telegram da huy yeu cau tinh tien ban ${current.tableNumber || '?'} .`,
  }));
  return { ok: true, request: current, nextStatus: 'cancelled' };
}

exports.approveOnlineOrder = onCall({
  region: 'asia-southeast1',
  serviceAccount: FUNCTIONS_RUNTIME_SERVICE_ACCOUNT,
}, async (request) => {
  try {
    const orderId = String(request.data?.orderId || '').trim();
    if (!orderId) {
      throw new HttpsError('invalid-argument', 'Thiếu mã đơn online.');
    }
    return await approveOnlineOrderInternal(orderId, {
      source: 'pos',
      userId: request.auth?.uid || '',
      username: request.auth?.token?.email || request.auth?.token?.name || 'pos_user',
    });
  } catch (error) {
    logger.error('approveOnlineOrder failed', {
      message: error?.message || String(error),
      stack: error?.stack || null,
    });
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error?.message || 'Không thể xác nhận đơn online.');
  }
});

exports.rejectOnlineOrder = onCall({
  region: 'asia-southeast1',
  serviceAccount: FUNCTIONS_RUNTIME_SERVICE_ACCOUNT,
}, async (request) => {
  try {
    const orderId = String(request.data?.orderId || '').trim();
    if (!orderId) {
      throw new HttpsError('invalid-argument', 'Thiếu mã đơn online.');
    }
    return await rejectOnlineOrderInternal(orderId, {
      source: 'pos',
      userId: request.auth?.uid || '',
      username: request.auth?.token?.email || request.auth?.token?.name || 'pos_user',
    });
  } catch (error) {
    logger.error('rejectOnlineOrder failed', {
      message: error?.message || String(error),
      stack: error?.stack || null,
    });
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error?.message || 'Không thể hủy đơn online.');
  }
});

async function closePosOrderFromTelegram(requestId, payMethod = 'cash') {
  const normalizedPayMethod = String(payMethod || 'cash').trim().toLowerCase();
  if (!['cash', 'bank'].includes(normalizedPayMethod)) throw new Error('Unsupported pay method');

  const context = await buildPaymentBillContextFromRequest(requestId);
  const currentStatus = String(context.paymentRequest?.status || '').trim().toLowerCase();
  if ((!context.posOrderId || !context.posOrder) && (currentStatus === 'finalized' || context.historyDoc || context.historyId)) {
    await db.collection('payment_requests').doc(String(requestId)).set({
      status: 'finalized',
      handledSource: 'telegram',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(context.paymentRequest?.finalizedAt ? {} : { finalizedAt: admin.firestore.FieldValue.serverTimestamp() }),
      ...(context.paymentRequest?.payMethod ? {} : { payMethod: normalizedPayMethod }),
    }, { merge: true });
    if (context.orderRequestId) {
      await db.collection('order_requests').doc(String(context.orderRequestId)).set({
        paymentRequestStatus: 'finalized',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(context.orderRequest?.finalizedAt ? {} : { finalizedAt: admin.firestore.FieldValue.serverTimestamp() }),
      }, { merge: true });
    }
    return {
      ok: true,
      alreadyFinalized: true,
      historyId: String(context.paymentRequest?.historyId || context.historyId || context.historyDoc?.id || '').trim(),
      billNo: context.billNo,
      total: context.total,
      payMethod: String(context.paymentRequest?.payMethod || normalizedPayMethod).trim().toLowerCase() || normalizedPayMethod,
      tableLabel: context.tableLabel,
    };
  }
  if (!context.posOrderId || !context.posOrder) {
    throw new Error('Không tìm thấy order POS để chốt bill.');
  }

  const orderRef = db.collection('orders').doc(String(context.posOrderId));
  const historyRef = db.collection('history').doc();
  const tableRef = db.collection('tables').doc(String(context.posOrder.tableId || context.tableNumber || ''));
  const deductionMap = await buildRestockMapFromHistoryOrder(context.posOrder);
  const inventoryIds = Object.keys(deductionMap);
  const paymentRequestRef = db.collection('payment_requests').doc(String(requestId));
  const orderRequestRef = context.orderRequestId ? db.collection('order_requests').doc(String(context.orderRequestId)) : null;
  const paidAt = admin.firestore.FieldValue.serverTimestamp();
  const historyPayload = {
    ...context.posOrder,
    id: context.billNo,
    billNo: context.billNo,
    historyId: historyRef.id,
    total: context.total,
    cost: Number(context.posOrder.cost || 0) || 0,
    discount: Number(context.posOrder.discount || context.discount || 0) || 0,
    discountNote: String(context.posOrder.discountNote || '').trim(),
    discountType: String(context.posOrder.discountType || 'vnd').trim(),
    shipping: Number(context.posOrder.shipping || context.shipping || 0) || 0,
    vatAmount: Number(context.posOrder.vatAmount || context.vatAmount || 0) || 0,
    taxRate: Number(context.posOrder.taxRate || 0) || 0,
    payMethod: normalizedPayMethod,
    paidAt,
    status: 'completed',
    paymentQrText: String(context.paymentRequest?.paymentQrText || context.paymentRequest?.billPreviewImageUrl || '').trim() || null,
    createdBy: 'telegram_bot',
    createdByRole: 'telegram_bot',
    paidBy: { name: 'telegram_bot', role: 'telegram_bot', source: 'telegram' },
    timestamp: paidAt,
  };

  await db.runTransaction(async tx => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) throw new Error('Order POS ?? ???c ??ng ho?c kh?ng t?n t?i.');
    const invSnaps = await Promise.all(inventoryIds.map(id => tx.get(db.collection('Inventory_Items').doc(id))));

    tx.set(historyRef, historyPayload);
    tx.delete(orderRef);
    if (String(context.posOrder.tableId || '').trim()) {
      tx.set(tableRef, {
        status: 'empty',
        orderId: null,
        openTime: null,
      }, { merge: true });
    }
    invSnaps.forEach(snap => {
      if (!snap.exists) return;
      const deductAmt = Number(deductionMap[snap.id] || 0) || 0;
      if (!(deductAmt > 0)) return;
      const currentQty = Number(snap.data().current_stock ?? snap.data().qty ?? 0);
      tx.update(snap.ref, { current_stock: Math.max(0, currentQty - deductAmt) });
    });
    tx.set(paymentRequestRef, {
      status: 'finalized',
      finalizedAt: admin.firestore.FieldValue.serverTimestamp(),
      payMethod: normalizedPayMethod,
      historyId: historyRef.id,
      billNo: context.billNo,
      finalBillTotal: context.total,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      handledSource: 'telegram',
    }, { merge: true });
    if (orderRequestRef) {
      tx.set(orderRequestRef, {
        paymentRequestStatus: 'finalized',
        finalBillTotal: context.total,
        finalizedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  });

  await appendSystemLog(buildCustomerRequestLogPayload('customer_payment_request_finalized_from_telegram', {
    paymentRequestId: requestId,
    requestId: context.orderRequestId || null,
    tableNumber: context.tableNumber,
    status: 'finalized',
    message: `Telegram da chot bill ${context.billNo} bang ${normalizedPayMethod === 'bank' ? 'chuyen khoan' : 'tien mat'} cho ban ${context.tableNumber || '?'} .`,
  }));

  return {
    ok: true,
    historyId: historyRef.id,
    billNo: context.billNo,
    total: context.total,
    payMethod: normalizedPayMethod,
    tableLabel: context.tableLabel,
  };
}

async function appendSystemLog(payload) {
  await db.collection('System_Logs').add(payload).catch(err => {
    logger.warn('System log append failed', { error: err?.message || String(err), payloadType: payload?.type || '' });
  });
}

async function loadProductsByIds(ids = []) {
  const clean = [...new Set(ids.map(id => String(id || '').trim()).filter(Boolean))];
  const map = new Map();
  await Promise.all(clean.map(async id => {
    const snap = await db.collection('Product_Catalog').doc(id).get();
    if (snap.exists) map.set(id, snap.data() || {});
  }));
  return map;
}

async function buildTelegramCatalogNameLookup() {
  const snap = await db.collection('Product_Catalog').get().catch(() => null);
  const lookup = new Map();
  (snap?.docs || []).forEach(doc => {
    const row = doc.data() || {};
    const displayName = getTelegramProductDisplayName(row, '');
    if (!displayName) return;
    const candidates = [displayName, row.name, row.display_name]
      .map(value => normalizeVi(String(value || '').trim()))
      .filter(Boolean);
    candidates.forEach(key => {
      if (!lookup.has(key)) lookup.set(key, displayName);
    });
  });
  return lookup;
}

async function enrichTelegramKitchenSummaryItems(rawItems = []) {
  const parsedItems = (Array.isArray(rawItems) ? rawItems : [])
    .map(item => parseKitchenItemSummary(normalizeTelegramText(item)))
    .filter(Boolean);
  if (!parsedItems.length) return [];

  const lookup = await buildTelegramCatalogNameLookup();
  return parsedItems.map(item => {
    const normalizedName = normalizeVi(item.name);
    const wildcardRegex = buildTelegramWildcardRegex(item.name);
    const resolvedName =
      lookup.get(normalizedName)
      || [...lookup.entries()].find(([key]) => key === normalizedName || key.includes(normalizedName) || normalizedName.includes(key))?.[1]
      || (wildcardRegex ? [...lookup.entries()].find(([key]) => wildcardRegex.test(key))?.[1] : '')
      || item.name;
    return item.qty ? `${resolvedName} x${item.qty}` : resolvedName;
  });
}

function buildPosItemFromRequest(requestId, index, requestItem = {}, product = {}) {
  return telegramOnlineOrders.buildPosItemFromRequest(requestId, index, requestItem = {}, product = {});
}

function aggregateRequestStatusFromItems(items = []) {
  return telegramOnlineOrders.aggregateRequestStatusFromItems(items = []);
}

function buildPosItemFromOnlineOrder(orderId, index, orderItem = {}, product = {}) {
  return telegramOnlineOrders.buildPosItemFromOnlineOrder(orderId, index, orderItem = {}, product = {});
}

function buildOnlineOrderTelegramStatusLabel(status) {
  return telegramOnlineOrders.buildOnlineOrderTelegramStatusLabel(status);
}

function buildOnlineOrderTelegramSummary(orderId, orderData = {}) {
  return telegramOnlineOrders.buildOnlineOrderTelegramSummary(orderId, orderData = {});
}

function buildOnlineOrderTelegramStatusLabelClean(status) {
  return telegramOnlineOrders.buildOnlineOrderTelegramStatusLabelClean(status);
}

function buildOnlineOrderTelegramSummaryClean(orderId, orderData = {}) {
  return telegramOnlineOrders.buildOnlineOrderTelegramSummaryClean(orderId, orderData = {});
}

function mapOnlineOrderStatusFromPosItems(order = {}, posItems = []) {
  return telegramOnlineOrders.mapOnlineOrderStatusFromPosItems(order = {}, posItems = []);
}

async function syncOnlineOrderTelegramMessage(orderId, orderData = {}, fallback = {}) {
  const botToken = String(TELEGRAM_BOT_TOKEN.value() || '').trim();
  const chatId = String(
    fallback.chatId
    || orderData?.telegramNotification?.chatId
    || orderData?.telegram?.chatId
    || ''
  ).trim();
  const messageId = String(
    fallback.messageId
    || orderData?.telegramNotification?.messageId
    || orderData?.telegram?.messageId
    || ''
  ).trim();

  if (!botToken || !chatId || !messageId) return false;

  const enrichedItems = await enrichTelegramItemsWithCatalog(orderData.items || []);

  await editTelegramMessage({
    chatId,
    messageId,
    botToken,
    text: buildOnlineOrderTelegramSummaryClean(orderId, {
      ...orderData,
      items: enrichedItems,
    }),
  });
  return true;
}

async function approveOnlineOrderInternal(orderId, actor = {}) {
  const cleanOrderId = String(orderId || '').trim();
  if (!cleanOrderId) return { ok: false, error: 'Thiếu mã đơn online.' };

  const onlineOrderRef = db.collection('online_orders').doc(cleanOrderId);
  const onlineSnap = await onlineOrderRef.get();
  if (!onlineSnap.exists) {
    return { ok: false, error: 'Đơn online không tồn tại.' };
  }

  const onlineOrder = onlineSnap.data() || {};
  const currentStatus = String(onlineOrder.status || '').trim().toLowerCase();
  if (['approved', 'preparing', 'ready_to_serve', 'delivering', 'completed'].includes(currentStatus) || onlineOrder.posOrderId) {
    return {
      ok: true,
      alreadyProcessed: true,
      orderId: cleanOrderId,
      posOrderId: String(onlineOrder.posOrderId || ''),
      status: currentStatus || 'approved',
    };
  }
  if (['cancelled', 'rejected'].includes(currentStatus)) {
    return { ok: false, error: 'Đơn này đã bị hủy, không thể xác nhận nữa.' };
  }

  const paymentMethod = String(onlineOrder.paymentMethod || '').trim().toLowerCase();
  const paymentStatus = String(onlineOrder.paymentStatus || '').trim().toLowerCase();
  if (paymentMethod && paymentMethod !== 'cod' && paymentStatus !== 'paid') {
    return { ok: false, error: 'Đơn chuyển khoản chưa thanh toán nên chưa thể xác nhận.' };
  }

  const items = Array.isArray(onlineOrder.items) ? onlineOrder.items : [];
  const productMap = await loadProductsByIds(items.map(item => item.productId || item.menuItemId || item.id));
  const posItems = items.map((item, index) =>
    buildPosItemFromOnlineOrder(cleanOrderId, index, item, productMap.get(String(item.productId || item.menuItemId || item.id || '').trim()) || {})
  );
  const posOrderId = `ONLINE-${cleanOrderId}`;
  const posOrderRef = db.collection('orders').doc(posOrderId);
  const actorName = String(actor.username || actor.name || actor.email || actor.userId || 'staff').trim() || 'staff';
  const customer = onlineOrder.customer || {};
  const tableName = `Đơn online ${String(onlineOrder.orderCode || '').trim() || cleanOrderId.slice(-6).toUpperCase()}`;
  const orderNote = [
    `[ONLINE ${String(paymentMethod || 'cod').toUpperCase()}] ${String(customer.fullName || '').trim()} - ${String(customer.phone || '').trim()}`,
    String(customer.addressLine1 || '').trim(),
    String(customer.ward || '').trim(),
    String(customer.district || '').trim(),
    String(customer.city || '').trim(),
    customer.note ? `Ghi chú: ${String(customer.note).trim()}` : '',
  ].filter(Boolean).join(' | ');

  await db.runTransaction(async (tx) => {
    const [latestOrderSnap, existingPosOrderSnap] = await Promise.all([
      tx.get(onlineOrderRef),
      tx.get(posOrderRef),
    ]);
    if (!latestOrderSnap.exists) {
      throw new Error('Đơn online không tồn tại.');
    }
    const latestOrder = latestOrderSnap.data() || {};
    const latestStatus = String(latestOrder.status || '').trim().toLowerCase();

    if (['approved', 'preparing', 'ready_to_serve', 'delivering', 'completed'].includes(latestStatus) || latestOrder.posOrderId) {
      return;
    }
    if (['cancelled', 'rejected'].includes(latestStatus)) {
      throw new Error('Đơn này đã bị hủy.');
    }

    if (!existingPosOrderSnap.exists) {
      tx.set(posOrderRef, {
        id: posOrderId,
        tableId: 'online',
        tableName,
        staffUid: null,
        items: posItems,
        discount: Number(latestOrder.pricing?.discountTotal || 0) || 0,
        discountType: 'vnd',
        shipping: Number(latestOrder.pricing?.shippingFee || 0) || 0,
        vatAmount: 0,
        note: orderNote,
        status: 'open',
        source: 'online_ordering',
        sourceChannel: 'website',
        onlineOrderId: cleanOrderId,
        onlineOrderCode: String(latestOrder.orderCode || '').trim(),
        customerName: String(customer.fullName || '').trim(),
        customerPhone: String(customer.phone || '').trim(),
        openedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    tx.set(onlineOrderRef, {
      status: 'approved',
      posOrderId,
      posTableId: 'online',
      posTableName: tableName,
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      approvedBy: actorName,
      approvalSource: String(actor.source || 'pos').trim() || 'pos',
      dispatchedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  const latestApprovedSnap = await onlineOrderRef.get();
  const latestApproved = latestApprovedSnap.data() || {};
  await syncOnlineOrderTelegramMessage(cleanOrderId, latestApproved).catch(() => null);
  return {
    ok: true,
    orderId: cleanOrderId,
    posOrderId,
    status: String(latestApproved.status || 'approved'),
    orderCode: String(latestApproved.orderCode || ''),
    alreadyProcessed: false,
  };
}

async function rejectOnlineOrderInternal(orderId, actor = {}) {
  const cleanOrderId = String(orderId || '').trim();
  if (!cleanOrderId) return { ok: false, error: 'Thiếu mã đơn online.' };

  const onlineOrderRef = db.collection('online_orders').doc(cleanOrderId);
  let latestOrder = null;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(onlineOrderRef);
    if (!snap.exists) throw new Error('Đơn online không tồn tại.');

    latestOrder = snap.data() || {};
    const currentStatus = String(latestOrder.status || '').trim().toLowerCase();
    if (['cancelled', 'rejected'].includes(currentStatus)) {
      return;
    }
    if (['approved', 'preparing', 'ready_to_serve', 'delivering', 'completed'].includes(currentStatus) || latestOrder.posOrderId) {
      throw new Error('Đơn đã được xác nhận vào bếp, không thể hủy nữa.');
    }

    tx.set(onlineOrderRef, {
      status: 'cancelled',
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      cancelledBy: String(actor.username || actor.name || actor.email || actor.userId || 'staff').trim() || 'staff',
      cancelSource: String(actor.source || 'pos').trim() || 'pos',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  const latestCancelledSnap = await onlineOrderRef.get();
  const latestCancelled = latestCancelledSnap.data() || latestOrder || {};
  await syncOnlineOrderTelegramMessage(cleanOrderId, latestCancelled).catch(() => null);
  return {
    ok: true,
    orderId: cleanOrderId,
    status: String(latestCancelled.status || 'cancelled'),
    orderCode: String(latestCancelled.orderCode || ''),
  };
}

function mapHistoryItemsToCustomerBill(items = []) {
  return (Array.isArray(items) ? items : []).map(item => ({
    menuItemId: String(item.id || '').trim(),
    name: String(item.name || '').trim(),
    quantity: Number(item.qty || 1) || 1,
    price: Number(item.price || 0) || 0,
    notes: String(item.note || '').trim(),
    imageUrl: String(item.image_url || item.imageUrl || '').trim(),
  }));
}

async function finalizeRequestsFromHistory(historyDoc = {}) {
  const posOrderId = String(historyDoc.id || '').trim();
  if (!posOrderId) return;

  const requestsSnap = await db.collection('order_requests')
    .where('posOrderId', '==', posOrderId)
    .get();

  if (requestsSnap.empty) return;

  const historyItems = Array.isArray(historyDoc.items) ? historyDoc.items : [];
  const total = Number(historyDoc.total || historyDoc.finalBillTotal || 0) || 0;
  const paymentQrText = String(historyDoc.paymentQrText || `PAY|${posOrderId}|TOTAL:${total}`).trim();

  await Promise.all(requestsSnap.docs.map(async docSnap => {
    const requestId = String(docSnap.id);
    const requestItems = historyItems.filter(item => String(item?.sourceRequestId || '').trim() === requestId);
    await docSnap.ref.set({
      status: 'served',
      paymentRequestStatus: 'finalized',
      finalBillTotal: total,
      finalBillItems: mapHistoryItemsToCustomerBill(requestItems.length ? requestItems : historyItems),
      paymentQrText,
      finalizedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }));
}

async function resolveOnlineOrderDocForPosContext({
  onlineOrderId = '',
  posOrderId = '',
  onlineOrderCode = '',
  orderCode = '',
} = {}) {
  const cleanOnlineOrderId = String(onlineOrderId || '').trim();
  if (cleanOnlineOrderId) {
    const directSnap = await db.collection('online_orders').doc(cleanOnlineOrderId).get().catch(() => null);
    if (directSnap?.exists) {
      return { id: directSnap.id, data: directSnap.data() || {} };
    }
  }

  const queries = [
    { field: 'posOrderId', value: String(posOrderId || '').trim() },
    { field: 'orderCode', value: String(onlineOrderCode || orderCode || '').trim() },
  ].filter(entry => entry.value);

  for (const queryConfig of queries) {
    const snap = await db.collection('online_orders')
      .where(queryConfig.field, '==', queryConfig.value)
      .limit(1)
      .get()
      .catch(() => null);
    const docSnap = snap?.docs?.[0] || null;
    if (docSnap?.exists) {
      return { id: docSnap.id, data: docSnap.data() || {} };
    }
  }

  return null;
}

async function syncOnlineOrderCompletedFromHistory(historyDoc = {}) {
  const posOrderId = String(historyDoc.id || '').trim();
  if (!posOrderId) return;
  const matchedOnlineOrder = await resolveOnlineOrderDocForPosContext({
    onlineOrderId: historyDoc.onlineOrderId,
    posOrderId,
    onlineOrderCode: historyDoc.onlineOrderCode,
    orderCode: historyDoc.orderCode,
  });
  if (!matchedOnlineOrder?.id) return;
  const onlineOrderId = String(matchedOnlineOrder.id || '').trim();

  const nextPayload = {
    status: 'completed',
    posOrderId,
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastKitchenSyncAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  const historyId = String(historyDoc.historyId || '').trim();
  if (historyId) nextPayload.historyId = historyId;

  await db.collection('online_orders').doc(onlineOrderId).set(nextPayload, { merge: true });

  const latestSnap = await db.collection('online_orders').doc(onlineOrderId).get().catch(() => null);
  if (latestSnap?.exists) {
    await syncOnlineOrderTelegramMessage(onlineOrderId, latestSnap.data() || {}).catch(() => null);
  }
}

async function queryHistoryRevenue(timeRange) {
  const snap = await db.collection('history').get();
  const list = snap.docs
    .map(d => ({ docId: d.id, ...(d.data() || {}) }))
    .filter(order => {
      if (!isVisibleHistoryOrderForReports(order)) return false;
      const rawDate = order?.paidAt || order?.timestamp || null;
      const orderDate = rawDate instanceof Date
        ? rawDate
        : (rawDate?.toDate ? rawDate.toDate() : new Date(rawDate));
      if (!(orderDate instanceof Date) || Number.isNaN(orderDate.getTime())) return false;
      return orderDate >= timeRange.from && orderDate <= timeRange.to;
    });
  const revenue = list.reduce((s, h) => s + (Number(h.total) || 0), 0);
  const cost = list.reduce((s, h) => {
    const orderCost = Number(h.cost || 0);
    if (orderCost > 0) return s + orderCost;
    const itemCost = (Array.isArray(h.items) ? h.items : [])
      .reduce((sum, item) => sum + ((Number(item.cost || 0) || 0) * (Number(item.qty || 1) || 1)), 0);
    return s + itemCost;
  }, 0);
  const orders = list.length;
  return {
    revenue,
    orders,
    cost,
    grossProfit: revenue - cost,
  };
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
  return generalUtils.json(res, code, data);
}

exports.testAdsReportTelegram = onRequest({ region: DEFAULT_REGION, memory: HEAVY_FUNCTION_MEMORY, serviceAccount: FUNCTIONS_RUNTIME_SERVICE_ACCOUNT }, (req, res) => {
  cors(req, res, async () => {
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

    try {
      const actor = await verifyAdminRequest(req);
      const debugNow = req.body?.debugNow ? new Date(String(req.body.debugNow)) : new Date();
      const customText = String(req.body?.text || '').trim();
      const range = buildAdsDateRangeFromText(customText, debugNow, { defaultYesterday: true });
      const report = await buildAdsRevenueTelegramData(range);
      const text = buildAdsRevenueTelegramMessage(report, { isTest: true });
      const botToken = String(TELEGRAM_BOT_TOKEN.value() || '').trim();
      const targetChatId = String(req.body?.chatId || getTelegramReportTargetChatIds()[0] || '').trim();
      if (!botToken || !targetChatId) throw new Error('Missing Telegram bot token or target chat id');
      await sendTelegramHtmlMessage({ chatId: targetChatId, botToken, text });
      return json(res, 200, {
        ok: true,
        actor,
        chatId: targetChatId,
        rangeLabel: report.rangeLabel,
        revenue: report.revenue,
        totalAds: report.totalAds,
        notes: report.notes || [],
      });
    } catch (err) {
      const message = String(err?.message || err || '');
      logger.error('testAdsReportTelegram failed', {
        error: message,
        responseData: err?.response?.data || null,
      });
      return json(res, /permission/i.test(message) ? 403 : 500, { ok: false, error: message || 'Request failed' });
    }
  });
});

exports.adsRevenueReportApi = onRequest({ region: DEFAULT_REGION, memory: HEAVY_FUNCTION_MEMORY, serviceAccount: FUNCTIONS_RUNTIME_SERVICE_ACCOUNT }, (req, res) => {
  cors(req, res, async () => {
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });

    try {
      const actor = await verifyAdminRequest(req);
      const debugNow = req.body?.debugNow ? new Date(String(req.body.debugNow)) : new Date();
      const customText = String(req.body?.text || '').trim();
      const range = buildAdsDateRangeFromText(customText, debugNow, { defaultYesterday: false });
      const report = await buildAdsRevenueTelegramData(range);
      const message = buildAdsRevenueTelegramMessage(report);
      return json(res, 200, { ok: true, actor, report, message, rangeLabel: report.rangeLabel });
    } catch (err) {
      const message = String(err?.message || err || '');
      logger.error('adsRevenueReportApi failed', { error: message, responseData: err?.response?.data || null });
      return json(res, /permission/i.test(message) ? 403 : 500, { ok: false, error: message || 'Request failed' });
    }
  });
});

exports.testPaymentBillTelegram = onRequest({ region: DEFAULT_REGION, memory: HEAVY_FUNCTION_MEMORY, serviceAccount: FUNCTIONS_RUNTIME_SERVICE_ACCOUNT }, (req, res) => {
  cors(req, res, async () => {
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
    try {
      const actor = await verifyAdminRequest(req);
      const requestId = String(req.body?.requestId || '').trim();
      if (!requestId) throw new Error('Missing requestId');
      const mode = String(req.body?.mode || 'confirm').trim().toLowerCase();
      let result;
      if (mode === 'preview') {
        const snap = await db.collection('payment_requests').doc(requestId).get();
        if (!snap.exists) throw new Error('Payment request not found');
        await sendCustomerPaymentRequestTelegram(requestId, snap.data() || {});
        result = { ok: true, mode: 'preview', requestId };
      } else if (mode === 'cash' || mode === 'bank') {
        result = await closePosOrderFromTelegram(requestId, mode);
      } else if (mode === 'cancel') {
        result = await cancelCustomerPaymentTelegram(requestId);
      } else {
        result = await confirmCustomerPaymentBillTelegram(requestId);
      }
      return json(res, 200, { ok: true, actor, result });
    } catch (err) {
      const message = String(err?.message || err || '');
      logger.error('testPaymentBillTelegram failed', {
        error: message,
        responseData: err?.response?.data || null,
      });
      return json(res, /permission/i.test(message) ? 403 : 500, { ok: false, error: message || 'Request failed' });
    }
  });
});

exports.testCompletedOrderTelegram = onRequest({
  region: DEFAULT_REGION,
  memory: HEAVY_FUNCTION_MEMORY,
  serviceAccount: FUNCTIONS_RUNTIME_SERVICE_ACCOUNT,
}, (req, res) => {
  cors(req, res, async () => {
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });
    try {
      const actor = await verifyAdminRequest(req);
      const historyId = String(req.body?.historyId || `manual_test_${Date.now()}`).trim();
      const order = req.body?.order && typeof req.body.order === 'object'
        ? req.body.order
        : {
            id: `TEST-${new Date().toISOString().slice(11, 19).replace(/:/g, '')}`,
            tableName: 'Bàn test',
            payMethod: 'cash',
            paidAt: new Date().toISOString(),
            total: 99000,
            items: [
              { name: 'Khô gà lá chanh', qty: 1, price: 99000 },
            ],
            note: 'Test completed order telegram',
            createdByName: actor?.email || 'admin',
          };
      await sendCompletedOrderTelegram(historyId, order);
      return json(res, 200, {
        ok: true,
        actor,
        historyId,
        targetChatIds: getCompletedOrderTelegramTargetChatIds(),
      });
    } catch (err) {
      const message = String(err?.message || err || '');
      logger.error('testCompletedOrderTelegram failed', {
        error: message,
        responseData: err?.response?.data || null,
      });
      return json(res, /permission/i.test(message) ? 403 : 500, { ok: false, error: message || 'Request failed' });
    }
  });
});

exports.telegramWebhook = onRequest({
  region: 'asia-southeast1',
  memory: '512MiB',
  serviceAccount: FUNCTIONS_RUNTIME_SERVICE_ACCOUNT,
  secrets: [VERTEX_SERVICE_ACCOUNT_JSON],
}, (req, res) => {
  cors(req, res, async () => {
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });

    const botToken = getTelegramAssistantBotToken();
    const callbackQuery = req.body?.callback_query || null;
    const message = req.body?.message || req.body?.edited_message || null;
    const callbackData = String(callbackQuery?.data || '').trim();
    const callbackChatId = callbackQuery?.message?.chat?.id ? String(callbackQuery.message.chat.id) : '';
    const callbackMessageId = callbackQuery?.message?.message_id ? String(callbackQuery.message.message_id) : '';
    const chatId = callbackChatId || (message?.chat?.id ? String(message.chat.id) : '');
    const fromUser = callbackQuery?.from || message?.from || {};
    const userContext = {
      chatId,
      userId: String(fromUser?.id || ''),
      username: String(fromUser?.username || fromUser?.first_name || ''),
    };
    const userText = String(
      message?.text
      || message?.caption
      || message?.voice?.text
      || message?.audio?.text
      || ''
    ).trim();

    try {
      if (!botToken) throw new Error('Missing TELEGRAM_BOT_TOKEN');
      logger.info('telegramWebhook incoming update', {
        chatId,
        chatType: String(callbackQuery?.message?.chat?.type || message?.chat?.type || ''),
        userId: userContext.userId,
        username: userContext.username,
        assistantBotName: getTelegramAssistantBotName(),
        ownerOnlyAllowed: isTelegramOwnerContext(userContext),
        hasCallback: !!callbackQuery,
        hasText: !!userText,
        hasPhoto: Array.isArray(message?.photo) && message.photo.length > 0,
        hasVoice: !!(message?.voice || message?.audio),
        textPreview: userText.slice(0, 160),
      });

      if (callbackQuery) {
        const onlineOrderApproveMatch = callbackData.match(/^onl_order_ok_(.+)$/);
        const onlineOrderRejectMatch = callbackData.match(/^onl_order_no_(.+)$/);
        const orderDraftConfirmMatch = callbackData.match(/^odf_confirm_(.+)$/);
        const orderDraftEditMatch = callbackData.match(/^odf_edit_(.+)$/);
        const orderDraftCancelMatch = callbackData.match(/^odf_cancel_(.+)$/);
        const customerOrderApproveMatch = callbackData.match(/^cw_order_ok_(.+)$/);
        const customerOrderRejectMatch = callbackData.match(/^cw_order_no_(.+)$/);
        const customerServiceAckMatch = callbackData.match(/^cw_service_ack_(.+)$/);
        const customerServiceDoneMatch = callbackData.match(/^cw_service_done_(.+)$/);
        const customerPaymentConfirmMatch = callbackData.match(/^cw_payment_confirm_(.+)$/);
        const customerPaymentCashMatch = callbackData.match(/^cw_payment_cash_(.+)$/);
        const customerPaymentBankMatch = callbackData.match(/^cw_payment_bank_(.+)$/);
        const customerPaymentCancelMatch = callbackData.match(/^cw_payment_cancel_(.+)$/);
        const customerPaymentAckMatch = callbackData.match(/^cw_payment_ack_(.+)$/);
        const chartIdFromCallback = parseTelegramChartCallbackData(callbackData);
        const confirmMatch = callbackData.match(/^confirm_(.+)$/);
        const cancelMatch = callbackData.match(/^cancel_(.+)$/);

        if (chartIdFromCallback) {
          const chartId = chartIdFromCallback;
          const result = await handleTelegramChartCallback({
            chartId,
            callbackChatId,
            callbackQueryId: callbackQuery.id,
            botToken,
          });
          return json(res, 200, { ok: !!result?.ok, callback: 'chart', result });
        }

        if (onlineOrderApproveMatch || onlineOrderRejectMatch) {
          const targetId = String(
            onlineOrderApproveMatch?.[1]
            || onlineOrderRejectMatch?.[1]
            || ''
          ).trim();
          const actor = {
            source: 'telegram',
            userId: String(callbackQuery?.from?.id || ''),
            username: String(callbackQuery?.from?.username || callbackQuery?.from?.first_name || 'telegram_user'),
          };
          const result = onlineOrderApproveMatch
            ? await approveOnlineOrderInternal(targetId, actor)
            : await rejectOnlineOrderInternal(targetId, actor);
          await answerTelegramCallback({
            callbackQueryId: callbackQuery.id,
            text: result?.ok ? 'Đã cập nhật.' : 'Không cập nhật được.',
            botToken,
          });

          let editText = '';
          if (result?.ok) {
            const latestSnap = await db.collection('online_orders').doc(targetId).get().catch(() => null);
            const latestOrder = latestSnap?.exists ? (latestSnap.data() || {}) : {};
            editText = buildOnlineOrderTelegramSummaryClean(targetId, {
              ...latestOrder,
              items: await enrichTelegramItemsWithCatalog(latestOrder.items || []),
            });
          } else {
            editText = onlineOrderApproveMatch
              ? `⚠️ Không xác nhận được Ä‘Æ¡n online.\n${result?.error || 'Không rõ nguyên nhÃ¢n.'}`
              : `⚠️ Không hủy được Ä‘Æ¡n online.\n${result?.error || 'Không rõ nguyên nhÃ¢n.'}`;
          }

          await editTelegramMessage({
            chatId: callbackChatId,
            messageId: callbackMessageId,
            botToken,
            text: editText,
          });
          return json(res, 200, { ok: true, callback: 'online-order', result });
        }

        if (orderDraftConfirmMatch || orderDraftEditMatch || orderDraftCancelMatch) {
          const draftId = String(
            orderDraftConfirmMatch?.[1]
            || orderDraftEditMatch?.[1]
            || orderDraftCancelMatch?.[1]
            || ''
          ).trim();
          const actor = {
            source: 'telegram',
            userId: String(callbackQuery?.from?.id || ''),
            username: String(callbackQuery?.from?.username || callbackQuery?.from?.first_name || 'telegram_user'),
          };

          if (orderDraftEditMatch) {
            await setTelegramDraftSession({
              chatId: callbackChatId,
              userId: actor.userId,
              draftId,
            });
            await answerTelegramCallback({
              callbackQueryId: callbackQuery.id,
              text: 'Dùng /fix để chỉnh tiếp bản nháp này.',
              botToken,
            });
            await sendTelegramTextMessage({
              chatId: callbackChatId,
              botToken,
              text: `Đang chỉnh bản nháp ${draftId}.\nDùng: /fix mon 3 = bò khô nướng x1`,
            });
            return json(res, 200, { ok: true, callback: 'order-draft-edit', draftId });
          }

          if (orderDraftCancelMatch) {
            await db.collection('telegram_order_drafts').doc(draftId).set({
              status: 'cancelled',
              cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
              cancelledBy: actor,
              updatedAtMs: Date.now(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            await clearTelegramDraftSession({ chatId: callbackChatId, userId: actor.userId });
            await answerTelegramCallback({
              callbackQueryId: callbackQuery.id,
              text: 'Đã hủy bản nháp.',
              botToken,
            });
            await editTelegramInlineMessage({
              chatId: callbackChatId,
              messageId: callbackMessageId,
              botToken,
              text: `❌ Đã hủy bản nháp gọi món.\nMã: ${draftId}`,
              buttons: [],
            });
            return json(res, 200, { ok: true, callback: 'order-draft-cancel', draftId });
          }

          const result = await confirmTelegramOrderDraft({
            draftId,
            chatId: callbackChatId,
            messageId: callbackMessageId,
            botToken,
            actor,
          });
          await answerTelegramCallback({
            callbackQueryId: callbackQuery.id,
            text: result?.ok ? 'Đã lên đơn.' : 'Không lên đơn được.',
            botToken,
          });
          if (!result?.ok) {
            await sendTelegramTextMessage({
              chatId: callbackChatId,
              botToken,
              text: `⚠️ Không xác nhận được phiếu gọi món.\n${result?.error || 'Không rõ nguyên nhân.'}`,
            });
          }
          return json(res, 200, { ok: !!result?.ok, callback: 'order-draft-confirm', result });
        }

        if (customerPaymentCashMatch || customerPaymentBankMatch || customerPaymentCancelMatch) {
          const targetId = String(
            customerPaymentCashMatch?.[1]
            || customerPaymentBankMatch?.[1]
            || customerPaymentCancelMatch?.[1]
            || '',
          ).trim();
          let result = null;
          let notifyText = '';
          if (customerPaymentCashMatch) {
            result = await closePosOrderFromTelegram(targetId, 'cash');
            notifyText = result.ok
              ? (result.alreadyFinalized
                ? `✅ Bill ${result.billNo} đã được chốt trước đó cho ${result.tableLabel}.`
                : `✅ Ä Ã£ nhận thanh toÃ¡n tiá» n máº·t vÃ  chá»‘t bill ${result.billNo} cho ${result.tableLabel}.`)
              : `⚠️ KhÃ´ng chá»‘t Ä‘Æ°á»£c bill tiá» n máº·t.\n${result.error || 'Không rõ nguyên nhÃ¢n.'}`;
          } else if (customerPaymentBankMatch) {
            result = await closePosOrderFromTelegram(targetId, 'bank');
            notifyText = result.ok
              ? (result.alreadyFinalized
                ? `✅ Bill ${result.billNo} đã được chốt trước đó cho ${result.tableLabel}.`
                : `✅ Ä Ã£ nhận thanh toÃ¡n chuyá»ƒn khoáº£n vÃ  chá»‘t bill ${result.billNo} cho ${result.tableLabel}.`)
              : `⚠️ KhÃ´ng chá»‘t Ä‘Æ°á»£c bill chuyá»ƒn khoáº£n.\n${result.error || 'Không rõ nguyên nhÃ¢n.'}`;
          } else {
            result = await cancelCustomerPaymentTelegram(targetId);
            notifyText = result.ok
              ? `ðŸ›‘ Đã hủy yÃªu cáº§u tính tiền.\nMÃ£: ${targetId}`
              : `⚠️ Không hủy được yÃªu cáº§u tính tiền.\n${result.error || 'Không rõ nguyên nhÃ¢n.'}`;
          }
          await answerTelegramCallback({
            callbackQueryId: callbackQuery.id,
            text: result?.ok ? 'Đã cập nhật.' : 'Không cập nhật được.',
            botToken,
          });
          await sendTelegramTextMessage({
            chatId: callbackChatId,
            botToken,
            text: notifyText,
          });
          return json(res, 200, { ok: true, callback: 'customer-payment-finalize', result });
        }

        if (customerOrderApproveMatch || customerOrderRejectMatch || customerServiceAckMatch || customerServiceDoneMatch || customerPaymentConfirmMatch || customerPaymentAckMatch) {
          const targetId = String(
            customerOrderApproveMatch?.[1]
            || customerOrderRejectMatch?.[1]
            || customerServiceAckMatch?.[1]
            || customerServiceDoneMatch?.[1]
            || customerPaymentConfirmMatch?.[1]
            || customerPaymentAckMatch?.[1]
            || '',
          ).trim();

          let result = null;
          let editText = '';
          if (customerOrderApproveMatch) {
            result = await resolveCustomerOrderRequestTelegram(targetId, 'approved');
            editText = result.ok
              ? `✅ Đã duyệt yêu cầu gọi món.\nMÃ£: ${targetId}`
              : `⚠️ Không duyệt được yÃªu cáº§u gọi món.\n${result.error || 'Không rõ nguyên nhÃ¢n.'}`;
          } else if (customerOrderRejectMatch) {
            result = await resolveCustomerOrderRequestTelegram(targetId, 'rejected');
            editText = result.ok
              ? `❌ Đã từ chối yÃªu cáº§u gọi món.\nMÃ£: ${targetId}`
              : `⚠️ Không từ chối được yÃªu cáº§u gọi món.\n${result.error || 'Không rõ nguyên nhÃ¢n.'}`;
          } else if (customerServiceAckMatch) {
            result = await resolveCustomerServiceRequestTelegram(targetId, 'acknowledged');
            editText = result.ok
              ? `✅ Đã nhận yêu cầu hỗ trợ khÃ¡ch.\nMÃ£: ${targetId}`
              : `⚠️ Không cập nhật được yÃªu cáº§u há»— trá»£.\n${result.error || 'Không rõ nguyên nhÃ¢n.'}`;
          } else if (customerServiceDoneMatch) {
            result = await resolveCustomerServiceRequestTelegram(targetId, 'resolved');
            editText = result.ok
              ? `✅ Ä Ã£ hoàn tất há»— trá»£ khÃ¡ch.\nMÃ£: ${targetId}`
              : `⚠️ Không đóng được yÃªu cáº§u há»— trá»£.\n${result.error || 'Không rõ nguyên nhÃ¢n.'}`;
          } else if (customerPaymentConfirmMatch) {
            result = await confirmCustomerPaymentBillTelegram(targetId);
            editText = result.ok
              ? `✅ Đã xác nhận bill tính tiền.\nMÃ£: ${targetId}\nBill: ${result.billNo || ''}`
              : `⚠️ Không xác nhận được bill.\n${result.error || 'Không rõ nguyên nhÃ¢n.'}`;
          } else if (customerPaymentAckMatch) {
            result = await resolveCustomerPaymentRequestTelegram(targetId, 'acknowledged');
            editText = result.ok
              ? `✅ Ä Ã£ nhận yÃªu cáº§u tính tiền.\nMÃ£: ${targetId}`
              : `⚠️ Không cập nhật được yÃªu cáº§u tính tiền.\n${result.error || 'Không rõ nguyên nhÃ¢n.'}`;
          }

          await answerTelegramCallback({
            callbackQueryId: callbackQuery.id,
            text: result?.ok ? 'Đã cập nhật.' : 'Không cập nhật được.',
            botToken,
          });
          await editTelegramMessage({
            chatId: callbackChatId,
            messageId: callbackMessageId,
            botToken,
            text: editText,
          });
          return json(res, 200, { ok: true, callback: 'customer-request', result });
        }

        if (!confirmMatch && !cancelMatch) {
          await answerTelegramCallback({ callbackQueryId: callbackQuery.id, text: 'Lệnh không hợp lệ.', botToken });
          return json(res, 200, { ok: true, skipped: 'unknown-callback' });
        }

        const actionDocId = String((confirmMatch || cancelMatch)[1] || '').trim();
        if (confirmMatch) {
          const { executePendingAction } = getAiDeps();
          const result = await executePendingAction(actionDocId, { db });
          await answerTelegramCallback({ callbackQueryId: callbackQuery.id, text: result.ok ? 'Đã thực thi.' : 'Không thực thi được.', botToken });
          await editTelegramMessage({
            chatId: callbackChatId,
            messageId: callbackMessageId,
            botToken,
            text: result.ok
              ? `✅ Đã thực thi.\nMÃ£: ${actionDocId}`
              : `⚠️ Không thực thi được.\n${result.error || 'Hành động không còn hợp lệ.'}`,
          });
          return json(res, 200, { ok: true, callback: 'confirm', result });
        }

        const { cancelPendingAction } = getAiDeps();
        const result = await cancelPendingAction(actionDocId, { db });
        await answerTelegramCallback({ callbackQueryId: callbackQuery.id, text: 'Đã hủy.', botToken });
        await editTelegramMessage({
          chatId: callbackChatId,
          messageId: callbackMessageId,
          botToken,
          text: `❌ Đã hủy.\nMÃ£: ${actionDocId}`,
        });
        return json(res, 200, { ok: true, callback: 'cancel', result });
      }

      if (!chatId) return json(res, 200, { ok: true, skipped: 'missing-chat-id' });

      const normalizedText = normalizeVi(userText);
      const replyMessageId = Number(message?.reply_to_message?.message_id || 0) || null;
      const isChatIdCommand = /^\/(chatid|myid)\b/i.test(userText) || normalizedText === 'chat id' || normalizedText === 'id telegram';
      if (isChatIdCommand) {
        await sendTelegramHtmlMessage({
          chatId,
          botToken,
          text: [
            '<b>Telegram chat id hiện tại</b>',
            `<code>${escapeTelegramHtml(chatId)}</code>`,
            '',
            'Dùng chat id này để cấu hình bot gửi báo cáo riêng cho bạn.',
          ].join('\n'),
        });
        return json(res, 200, { ok: true, chatId, command: 'chatid' });
      }

      const isAdsReportCommand = /^\/(baocao|ads)\b/i.test(userText)
        || normalizedText.startsWith('ads')
        || normalizedText.startsWith('baocao')
        || normalizedText.startsWith('bao cao')
        || normalizedText.startsWith('bao cao ads')
        || normalizedText.startsWith('bao cao doanh thu ads');
      if (isAdsReportCommand) {
        if (!isTelegramOwnerContext(userContext)) {
          await rejectTelegramOwnerOnlyAccess({ chatId, botToken });
          return json(res, 200, { ok: true, skipped: 'owner-only-ads-report' });
        }
        const reportRange = buildAdsDateRangeFromText(userText, new Date(), { defaultYesterday: false });
        const report = await buildAdsRevenueTelegramData(reportRange);
        const text = buildAdsRevenueTelegramMessage(report);
        await sendTelegramHtmlMessage({ chatId, botToken, text });
        return json(res, 200, { ok: true, command: 'ads-report', range: reportRange.label });
      }

      const tablePaymentCommand = parseTelegramTablePaymentCommand(userText);
      if (tablePaymentCommand) {
        const result = await createOrReuseTelegramPaymentRequestByTable(tablePaymentCommand.tableNumber, userContext);
        await sendTelegramTextMessage({
          chatId,
          botToken,
          text: result.ok
            ? (result.reused
              ? `✅ Đã gửi lại bill táº¡m cá»§a ${result.tableLabel}.\nBill: ${result.billNo}\nMÃ£ yÃªu cáº§u: ${result.requestId}`
              : `✅ Đã tạo yêu cầu tính tiền cho ${result.tableLabel}.\nBill: ${result.billNo}\nMÃ£ yÃªu cáº§u: ${result.requestId}`)
            : `⚠️ Không tạo được yêu cầu tính tiền.\n${result.error || 'Không rõ nguyên nhÃ¢n.'}`,
        });
        return json(res, 200, { ok: result.ok, command: 'telegram-table-payment', result });
      }

      const draftFixCommand = parseTelegramDraftFixCommand(userText);
      const draftFixCommands = parseTelegramDraftFixCommands(userText);
      if (draftFixCommands) {
        const session = await getTelegramDraftSession({ chatId, userId: userContext.userId });
        let draft = null;
        if (replyMessageId) {
          draft = await findLatestTelegramOrderDraft(chatId, replyMessageId);
        }
        if (!draft && session?.draftId) {
          draft = await getTelegramDraftById(session.draftId);
          if (String(draft?.status || '') !== 'draft') {
            draft = null;
          }
        }
        if (!draft) {
          draft = await findLatestTelegramOrderDraft(chatId, replyMessageId);
        }
        if (!draft) {
          await sendTelegramTextMessage({
            chatId,
            botToken,
            text: 'Chưa có bản nháp phiếu gọi món nào đang mở để sửa. Anh/chị gửi ảnh phiếu trước giúp em nhé.',
          });
          return json(res, 200, { ok: true, skipped: 'order-draft-not-found' });
        }
        await setTelegramDraftSession({
          chatId,
          userId: userContext.userId,
          draftId: draft.docId || draft.id,
        });
        let updatedDraft = draft;
        for (const fixCommand of draftFixCommands) {
          updatedDraft = await applyTelegramDraftFix({
            draft: updatedDraft,
            fixCommand,
            chatId,
            botToken,
          });
        }
        return json(res, 200, {
          ok: true,
          command: 'order-draft-fix',
          draftId: updatedDraft.docId || updatedDraft.id,
        });
      }

      let geminiResult = null;
      if (Array.isArray(message?.photo) && message.photo.length) {
        if (isTelegramOrderPhotoContext({ message, chatId })) {
          const image = await getTelegramPhotoAsBase64({ botToken, photo: message.photo });
          const draft = await createTelegramOrderDraftFromPhoto({
            chatId,
            sourceMessageId: message?.message_id,
            userId: userContext.userId,
            username: userContext.username,
            caption: userText,
            imageBase64: image.base64,
            mimeType: image.mimeType,
            botToken,
          });
          return json(res, 200, { ok: true, command: 'order-slip-draft', draftId: draft.draftId });
        }

        if (!isTelegramOwnerContext(userContext)) {
          await rejectTelegramOwnerOnlyAccess({ chatId, botToken });
          return json(res, 200, { ok: true, skipped: 'owner-only-photo-ai' });
        }
        const image = await getTelegramPhotoAsBase64({ botToken, photo: message.photo });
        geminiResult = await askGeminiVisionForImport({
          caption: userText,
          imageBase64: image.base64,
          mimeType: image.mimeType,
          ...userContext,
        });
      } else if (message?.voice || message?.audio) {
        if (!isTelegramOwnerContext(userContext)) {
          await rejectTelegramOwnerOnlyAccess({ chatId, botToken });
          return json(res, 200, { ok: true, skipped: 'owner-only-voice-ai' });
        }
        // Ưu tiên voice, rồi mới audio (podcast, file âm thanh đính kèm)
        const voiceObj = message.voice || message.audio;
        const voiceFileId = String(voiceObj?.file_id || '').trim();

        if (!voiceFileId) {
          logger.warn('telegramWebhook: voice/audio missing file_id', { chatId });
          await sendTelegramTextMessage({
            chatId,
            botToken,
            text: 'Dạ em không đọc được file âm thanh này. Anh/chị thử gửi lại giúp em nhé.',
          });
          return json(res, 200, { ok: true, skipped: 'voice-missing-file-id' });
        }

        const voiceMimeType = String(voiceObj?.mime_type || 'audio/ogg').trim();
        logger.info('telegramWebhook: processing voice message', {
          chatId,
          voiceFileId,
          duration: voiceObj?.duration,
          mimeType: voiceMimeType,
        });

        try {
          geminiResult = await askGeminiWithVoice({
            voiceFileId,
            mimeType: voiceMimeType,
            botToken,
            ...userContext,
          });
        } catch (voiceErr) {
          logger.error('telegramWebhook: voice processing failed', {
            error: voiceErr?.message || String(voiceErr),
            chatId,
            voiceFileId,
          });
          await sendTelegramTextMessage({
            chatId,
            botToken,
            text: 'Dạ em không xử lý được tin nhắn thoại lúc này. Anh/chị thử nhắn chữ hoặc gửi lại giúp em nhé.',
          });
          return json(res, 200, { ok: true, skipped: 'voice-processing-error' });
        }
      } else if (userText) {
        if (!isTelegramOwnerContext(userContext)) {
          await rejectTelegramOwnerOnlyAccess({ chatId, botToken });
          return json(res, 200, { ok: true, skipped: 'owner-only-text-ai' });
        }
        if (isTelegramAssistantCapabilityQuestion(userText)) {
          geminiResult = {
            text: buildTelegramAssistantCapabilityResponse(),
            pendingActions: [],
            toolResults: [],
          };
        } else {
          const menuDataReply = await tryAnswerTelegramMenuDataQuestion(userText);
          const proactiveReply = menuDataReply ? null : await tryAnswerTelegramProactiveOwnerInsight(userText, chatId);
          const financeReportReply = (menuDataReply || proactiveReply) ? null : await tryAnswerTelegramFinanceReportQuestion(userText, chatId);
          const smartReportReply = (menuDataReply || proactiveReply || financeReportReply) ? null : await tryAnswerTelegramSmartReportQuestion(userText);
          if (menuDataReply?.text) {
            geminiResult = {
              text: menuDataReply.text,
              photoUrl: menuDataReply.photoUrl || '',
              pendingActions: [],
              toolResults: menuDataReply.menuItem ? [{ ok: true, tool: 'tra_cuu_menu', item: menuDataReply.menuItem }] : [],
            };
          } else if (proactiveReply?.text) {
            geminiResult = {
              text: proactiveReply.text,
              inlineButtons: proactiveReply.inlineButtons || [],
              pendingActions: [],
              toolResults: proactiveReply.toolResults || [],
            };
          } else if (financeReportReply?.text) {
            geminiResult = {
              text: financeReportReply.text,
              inlineButtons: financeReportReply.inlineButtons || [],
              pendingActions: [],
              toolResults: financeReportReply.toolResults || [],
            };
          } else if (smartReportReply?.text) {
            const chartId = await prepareTelegramReportChart({ chatId, smartReportReply });
            geminiResult = {
              text: appendChartPrompt(smartReportReply.text, chartId),
              inlineButtons: buildChartButtons(chartId),
              pendingActions: [],
              toolResults: smartReportReply.report ? [smartReportReply.report] : [],
            };
          } else {
            geminiResult = await askGeminiWithFirestoreTools(userText, { ...userContext, source: 'telegram_text' });
          }
        }
      } else {
        await sendTelegramTextMessage({
          chatId,
          botToken,
          text: 'Dạ hiện tại em xử lý được tin nhắn chữ, ảnh hóa đơn, hoặc audio đã chuyển thành text.',
        });
        return json(res, 200, { ok: true, skipped: 'missing-text' });
      }

      const pendingActions = Array.isArray(geminiResult?.pendingActions) ? geminiResult.pendingActions : [];
      if (pendingActions.length) {
        for (const action of pendingActions) {
          await sendTelegramActionConfirmation({
            chatId,
            botToken,
            actionDocId: action.docId,
            text: [
              geminiResult.text || 'Dạ em đã tạo đề xuất cần xác nhận.',
              '',
              `Hành động: ${action.preview || action.actionType}`,
              `Mã: ${action.docId}`,
              '',
              'Anh/chị bấm xác nhận để em ghi dữ liệu thật.',
            ].join('\n'),
          });
        }
      } else {
        const responseText = geminiResult?.text || 'Dạ em chưa có câu trả lời phù hợp.';
        const inlineButtons = Array.isArray(geminiResult?.inlineButtons) ? geminiResult.inlineButtons : [];
        const photoUrl = String(geminiResult?.photoUrl || '').trim();
        if (photoUrl) {
          await sendTelegramPhotoMessage({
            chatId,
            botToken,
            photo: photoUrl,
            caption: responseText,
            buttons: inlineButtons,
          });
        } else if (inlineButtons.length) {
          await sendTelegramInlineMessage({
            chatId,
            botToken,
            text: responseText,
            buttons: inlineButtons,
          });
        } else {
          await sendTelegramTextMessage({
            chatId,
            botToken,
            text: responseText,
          });
        }
      }

      return json(res, 200, { ok: true });
    } catch (err) {
      logger.error('telegramWebhook failed', {
        error: err?.message || String(err),
        chatId,
        userText,
      });

      if (chatId && botToken) {
        await sendTelegramTextMessage({
          chatId,
          botToken,
          text: 'Dạ em đang lỗi khi truy vấn dữ liệu. Anh/chị thử lại giúp em sau ít phút nhé.',
        }).catch(sendErr => logger.error('telegramWebhook error reply failed', {
          error: sendErr?.message || String(sendErr),
          chatId,
        }));
      }

      return json(res, 200, { ok: false, error: err?.message || String(err) });
    }
  });
});

exports.cleanupDuplicateHistory = onRequest({ region: 'asia-southeast1', timeoutSeconds: 540, memory: '1GiB', serviceAccount: FUNCTIONS_RUNTIME_SERVICE_ACCOUNT }, (req, res) => {
  cors(req, res, async () => {
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

    try {
      const actor = await verifyAdminRequest(req);
      const historySnap = await db.collection('history').get();
      const rawOrders = historySnap.docs.map(doc => ({
        docId: doc.id,
        ...(doc.data() || {}),
      }));
      const duplicatesToArchive = rawOrders
        .filter(order => (
          String(order?.archiveReason || '').trim()
          || order?.supersededByHistoryId
          || order?.hiddenFromReports === true
          || order?.hiddenFromHistory === true
        ))
        .map(order => ({
          businessId: getHistoryBusinessId(order),
          keptDocId: String(order?.supersededByHistoryId || '').trim(),
          keptVersionTime: getHistoryVersionTime(order),
          duplicate: order,
        }));

      for (const chunk of chunkArray(duplicatesToArchive, 200)) {
        const batch = db.batch();
        chunk.forEach(item => {
          const duplicateDocId = String(item.duplicate?.docId || '').trim();
          if (!duplicateDocId) return;

          const archiveRef = db.collection('history_duplicates_archive').doc();
          batch.set(archiveRef, {
            ...(item.duplicate || {}),
            originalDocId: duplicateDocId,
            originalCollection: 'history',
            businessId: item.businessId,
            keptDocId: item.keptDocId,
            keptVersionTime: item.keptVersionTime,
            archivedAt: admin.firestore.FieldValue.serverTimestamp(),
            archivedBy: actor.email || actor.uid || 'system',
          });
          batch.delete(db.collection('history').doc(duplicateDocId));
        });
        await batch.commit();
      }

      logger.info('cleanupDuplicateHistory completed', {
        actor,
        duplicateGroupCount: duplicatesToArchive.length,
        duplicateDocCount: duplicatesToArchive.length,
        sampleBusinessIds: duplicatesToArchive.slice(0, 20).map(item => item.businessId),
      });

      return json(res, 200, {
        ok: true,
        actor,
        totalHistoryDocs: rawOrders.length,
        duplicateGroupCount: duplicatesToArchive.length,
        archivedDocCount: duplicatesToArchive.length,
        deletedDocCount: duplicatesToArchive.length,
        keptDocCount: duplicatesToArchive.filter(item => item.keptDocId).length,
        sampleBusinessIds: duplicatesToArchive.slice(0, 20).map(item => item.businessId),
      });
    } catch (err) {
      const message = String(err?.message || err || '');
      const status = /permission/i.test(message) ? 403 : (/token/i.test(message) ? 401 : 500);
      logger.error('cleanupDuplicateHistory failed', {
        error: message,
        responseData: err?.response?.data || null,
      });
      return json(res, status, { ok: false, error: message || 'Request failed' });
    }
  });
});

exports.apiVoice = onRequest({ region: DEFAULT_REGION, memory: HEAVY_FUNCTION_MEMORY, serviceAccount: FUNCTIONS_RUNTIME_SERVICE_ACCOUNT }, (req, res) => {
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
        if (!table) return json(res, 200, { reply: 'Bạn muốn gọi món cho bàn nào ạ? Ví dá»¥: "Bàn 5 gọi 3 tiger bạc"' });
        if (!items.length) return json(res, 200, { reply: `Dạ em chưa nghe rõ tên món. Má» i anh chị nói lại tên món cho bàn ${table} áº¡!` });

        const { orderId } = await ensureOpenOrder(table);
        await addItemsToOrder(orderId, items.map(it => ({ id: it.id, name: it.name, price: it.price, qty: it.qty, note: '' })));
        const names = items.map(x => `${x.qty} ${x.name}`).join(', ');
        return json(res, 200, { reply: `Dạ em đã lên ${names} cho bàn ${table} rồi ạ!`, intent, score });
      }

      if (intent === 'pos_checkout') {
        if (!table) return json(res, 200, { reply: 'Bạn muốn tính tiền bàn nào ạ? Ví dá»¥: "TÃ­nh tiá» n bàn 5"' });
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

exports.syncPublicMenuOnCatalogCreate = onDocumentCreated(
  { document: 'Product_Catalog/{productId}', region: DEFAULT_REGION, memory: HEAVY_FUNCTION_MEMORY, serviceAccount: FUNCTIONS_RUNTIME_SERVICE_ACCOUNT },
  async event => {
    const data = event.data?.data() || null;
    const productId = event.params?.productId;
    if (!data || !productId) return;
    await syncPublicMenuProjection(productId, data);
  }
);

exports.syncPublicMenuOnCatalogUpdate = onDocumentUpdated(
  { document: 'Product_Catalog/{productId}', region: 'asia-southeast1', serviceAccount: FUNCTIONS_RUNTIME_SERVICE_ACCOUNT },
  async event => {
    const data = event.data?.after?.data() || null;
    const productId = event.params?.productId;
    if (!data || !productId) return;
    await syncPublicMenuProjection(productId, data);
  }
);

exports.syncPublicMenuOnCatalogDelete = onDocumentDeleted(
  { document: 'Product_Catalog/{productId}', region: 'asia-southeast1', serviceAccount: FUNCTIONS_RUNTIME_SERVICE_ACCOUNT },
  async event => {
    const productId = event.params?.productId;
    if (!productId) return;
    await db.collection('public_menu').doc(String(productId)).delete().catch(() => null);
  }
);

exports.onOrderRequestCreated = onDocumentCreated(
  {
    document: 'order_requests/{requestId}',
    region: DEFAULT_REGION,
    memory: HEAVY_FUNCTION_MEMORY,
    serviceAccount: FUNCTIONS_RUNTIME_SERVICE_ACCOUNT,
  },
  async event => {
    const request = event.data?.data() || null;
    const requestId = event.params?.requestId;
    if (!request || !requestId) return;

    await appendSystemLog(buildCustomerRequestLogPayload('customer_order_request_created', {
      requestId,
      tableNumber: request.tableNumber,
      status: request.status || 'pending_approval',
      message: `Yêu cầu gọi món mới từ bàn ${request.tableNumber || '?'}`,
    }));

    try {
      await sendCustomerOrderRequestTelegram(String(requestId), request);
    } catch (err) {
      logger.error('sendCustomerOrderRequestTelegram failed', {
        requestId,
        error: err?.message || String(err),
        responseData: err?.response?.data || null,
      });
    }
  }
);

exports.onOrderRequestApproved = onDocumentUpdated(
  { document: 'order_requests/{requestId}', region: 'asia-southeast1', serviceAccount: FUNCTIONS_RUNTIME_SERVICE_ACCOUNT },
  async event => {
    const before = event.data?.before?.data() || null;
    const after = event.data?.after?.data() || null;
    const requestId = event.params?.requestId;
    if (!after || !requestId) return;

    const prevStatus = String(before?.status || '').trim().toLowerCase();
    const nextStatus = String(after.status || '').trim().toLowerCase();
    if (nextStatus !== 'approved' || prevStatus === 'approved' || after.posOrderId) return;

    const items = Array.isArray(after.items) ? after.items : [];
    const productMap = await loadProductsByIds(items.map(item => item.menuItemId || item.id));
    const posItems = items.map((item, index) =>
      buildPosItemFromRequest(requestId, index, item, productMap.get(String(item.menuItemId || item.id || '').trim()) || {}));

    const { orderId, tableName } = await ensureOpenOrder(after.tableNumber);
    await addItemsToOrder(orderId, posItems);
    await db.collection('orders').doc(orderId).set({
      source: 'customer_web',
      sourceChannel: 'webapp-menu',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      webRequestIds: admin.firestore.FieldValue.arrayUnion(String(requestId)),
      note: after.notes || '',
    }, { merge: true });

    await event.data.after.ref.set({
      posOrderId: orderId,
      posTableId: String(after.tableNumber),
      posTableName: tableName,
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      dispatchedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await appendSystemLog(buildCustomerRequestLogPayload('customer_order_request_approved', {
      requestId,
      tableNumber: after.tableNumber,
      status: 'approved',
      message: `Đã duyệt yêu cầu gọi món bàn ${after.tableNumber || '?'}`,
    }));
  }
);

exports.syncOrderRequestStatusFromPosOrder = onDocumentUpdated(
  { document: 'orders/{orderId}', region: DEFAULT_REGION, memory: HEAVY_FUNCTION_MEMORY, serviceAccount: FUNCTIONS_RUNTIME_SERVICE_ACCOUNT },
  async event => {
    const after = event.data?.after?.data() || null;
    const orderId = event.params?.orderId;
    if (!after || !orderId) return;

    const requestsSnap = await db.collection('order_requests')
      .where('posOrderId', '==', String(orderId))
      .get();

    if (requestsSnap.empty) return;

    const orderItems = Array.isArray(after.items) ? after.items : [];
    await Promise.all(requestsSnap.docs.map(async docSnap => {
      const requestId = String(docSnap.id);
      const relatedItems = orderItems.filter(item => String(item?.sourceRequestId || '').trim() === requestId);
      const nextStatus = aggregateRequestStatusFromItems(relatedItems);
      await docSnap.ref.set({
        status: nextStatus,
        lastKitchenSyncAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }));
  }
);

exports.syncOnlineOrderStatusFromPosOrder = onDocumentUpdated(
  {
    document: 'orders/{orderId}',
    region: 'asia-southeast1',
    serviceAccount: FUNCTIONS_RUNTIME_SERVICE_ACCOUNT,
  },
  async event => {
    const after = event.data?.after?.data() || null;
    const orderId = String(event.params?.orderId || '').trim();
    if (!after || !orderId) return;

    const matchedOnlineOrder = await resolveOnlineOrderDocForPosContext({
      onlineOrderId: after.onlineOrderId,
      posOrderId: orderId,
      onlineOrderCode: after.onlineOrderCode,
      orderCode: after.orderCode,
    });
    const onlineOrderId = String(matchedOnlineOrder?.id || '').trim();
    if (!onlineOrderId) return;

    const nextStatus = mapOnlineOrderStatusFromPosItems(after, after.items || []);
    const nextPayload = {
      status: nextStatus,
      posOrderId: orderId,
      lastKitchenSyncAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (nextStatus === 'preparing') {
      nextPayload.preparingAt = admin.firestore.FieldValue.serverTimestamp();
    }
    if (nextStatus === 'ready_to_serve') {
      nextPayload.readyAt = admin.firestore.FieldValue.serverTimestamp();
    }
    if (nextStatus === 'delivering') {
      nextPayload.deliveringAt = admin.firestore.FieldValue.serverTimestamp();
    }
    if (String(after.status || '').trim().toLowerCase() === 'completed' || nextStatus === 'completed') {
      nextPayload.completedAt = admin.firestore.FieldValue.serverTimestamp();
    }

    await db.collection('online_orders').doc(onlineOrderId).set(nextPayload, { merge: true });

    const latestSnap = await db.collection('online_orders').doc(onlineOrderId).get().catch(() => null);
    if (latestSnap?.exists) {
      await syncOnlineOrderTelegramMessage(onlineOrderId, latestSnap.data() || {}).catch(() => null);
    }
  }
);

exports.onPaymentRequestCreated = onDocumentCreated(
  {
    document: 'payment_requests/{requestId}',
    region: DEFAULT_REGION,
    memory: HEAVY_FUNCTION_MEMORY,
    serviceAccount: FUNCTIONS_RUNTIME_SERVICE_ACCOUNT,
  },
  async event => {
    const payload = event.data?.data() || null;
    const requestId = event.params?.requestId;
    if (!payload || !requestId) return;

    await appendSystemLog(buildCustomerRequestLogPayload('customer_payment_request_created', {
      paymentRequestId: requestId,
      requestId: payload.orderRequestId || payload.orderId || null,
      tableNumber: payload.tableNumber,
      status: payload.status || 'requested',
      message: `Khách gọi tính tiền tại bàn ${payload.tableNumber || '?'}`,
    }));

    const orderRequestId = String(payload.orderRequestId || payload.orderId || '').trim();
    if (orderRequestId) {
      await db.collection('order_requests').doc(orderRequestId).set({
        paymentRequestStatus: 'requested',
        paymentRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true }).catch(() => null);
    }

    try {
      await sendCustomerPaymentRequestTelegram(String(requestId), payload);
    } catch (err) {
      logger.error('sendCustomerPaymentRequestTelegram failed', {
        requestId,
        error: err?.message || String(err),
        responseData: err?.response?.data || null,
      });
    }
  }
);

exports.onServiceRequestCreated = onDocumentCreated(
  {
    document: 'service_requests/{requestId}',
    region: 'asia-southeast1',
    serviceAccount: FUNCTIONS_RUNTIME_SERVICE_ACCOUNT,
  },
  async event => {
    const payload = event.data?.data() || null;
    const requestId = event.params?.requestId;
    if (!payload || !requestId) return;

    await appendSystemLog(buildCustomerRequestLogPayload('customer_service_request_created', {
      serviceRequestId: requestId,
      tableNumber: payload.tableNumber,
      status: payload.status || 'pending',
      message: payload.message || `Khách gọi nhÃ¢n viÃªn tại bàn ${payload.tableNumber || '?'}`,
    }));

    try {
      await sendCustomerServiceRequestTelegram(String(requestId), payload);
    } catch (err) {
      logger.error('sendCustomerServiceRequestTelegram failed', {
        requestId,
        error: err?.message || String(err),
        responseData: err?.response?.data || null,
      });
    }
  }
);

exports.onHistoryFinalizeCustomerOrderRequests = onDocumentCreated(
  { document: 'history/{historyId}', region: DEFAULT_REGION, memory: HEAVY_FUNCTION_MEMORY, serviceAccount: FUNCTIONS_RUNTIME_SERVICE_ACCOUNT },
  async event => {
    const historyDoc = event.data?.data() || null;
    if (!historyDoc) return;
    await Promise.all([
      finalizeRequestsFromHistory(historyDoc),
      syncOnlineOrderCompletedFromHistory(historyDoc),
    ]);
  }
);

exports.onHistoryOrderCancelled = onDocumentUpdated(
  { document: 'history/{historyId}', region: 'asia-southeast1', serviceAccount: FUNCTIONS_RUNTIME_SERVICE_ACCOUNT },
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
        hiddenFromReports: true,
        hiddenFromHistory: true,
        reportExclusionReason: 'cancelled_after_completion',
        reportExcludedAt: admin.firestore.FieldValue.serverTimestamp(),
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
    region: DEFAULT_REGION,
    memory: HEAVY_FUNCTION_MEMORY,
    serviceAccount: FUNCTIONS_RUNTIME_SERVICE_ACCOUNT,
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
    region: DEFAULT_REGION,
    memory: HEAVY_FUNCTION_MEMORY,
    serviceAccount: FUNCTIONS_RUNTIME_SERVICE_ACCOUNT,
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

    const telegramBotToken = String(
      TELEGRAM_KITCHEN_READY_BOT_TOKEN.value()
      || TELEGRAM_BOT_TOKEN.value()
      || '',
    ).trim();
    const telegramKitchenReadyChatId = String(
      TELEGRAM_KITCHEN_READY_CHAT_ID.value()
      || TELEGRAM_GROUP_CHAT_ID.value()
      || '',
    ).trim();
    if (!telegramBotToken || !telegramKitchenReadyChatId) {
      logger.warn('Skipping Telegram send: missing config', {
        docId,
        hasBotToken: !!telegramBotToken,
        hasGroupChatId: !!telegramKitchenReadyChatId,
      });
      return;
    }

    try {
      const enrichedNotif = {
        ...notif,
        items: await enrichTelegramKitchenSummaryItems(notif.items || []),
      };
      const telegramText = buildTelegramFoodReadyMessageClean(enrichedNotif);
      await sendTelegramTextMessage({
        chatId: telegramKitchenReadyChatId,
        text: telegramText,
        botToken: telegramBotToken,
      });

      await kitchenNotifDocRef(docId).set({
        telegramSent: true,
        telegramSentAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      logger.info('Telegram ready notification sent', {
        docId,
        chatId: telegramKitchenReadyChatId,
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

exports.telegramOnKitchenOrderCreated = onDocumentCreated(
  {
    document: 'orders/{orderId}',
    region: DEFAULT_REGION,
    memory: HEAVY_FUNCTION_MEMORY,
    serviceAccount: FUNCTIONS_RUNTIME_SERVICE_ACCOUNT,
  },
  async event => {
    const orderId = String(event.params?.orderId || '');
    const order = event.data?.data() || {};
    if (String(order.status || '').toLowerCase() !== 'open') return;
    const rows = getNewPendingKitchenItems(order.items || [], []);
    if (!rows.length) return;
    try {
      await sendKitchenNewOrderTelegram(orderId, order, rows);
    } catch (err) {
      logger.error('telegramOnKitchenOrderCreated failed', {
        orderId,
        error: err?.message || String(err),
        responseData: err?.response?.data || null,
      });
    }
  }
);

exports.telegramOnKitchenOrderUpdated = onDocumentUpdated(
  {
    document: 'orders/{orderId}',
    region: 'asia-southeast1',
    serviceAccount: FUNCTIONS_RUNTIME_SERVICE_ACCOUNT,
  },
  async event => {
    const orderId = String(event.params?.orderId || '');
    const before = event.data?.before?.data() || {};
    const after = event.data?.after?.data() || {};
    if (String(after.status || '').toLowerCase() !== 'open') return;
    const rows = getNewPendingKitchenItems(after.items || [], before.items || []);
    if (!rows.length) return;
    try {
      await sendKitchenNewOrderTelegram(orderId, after, rows);
    } catch (err) {
      logger.error('telegramOnKitchenOrderUpdated failed', {
        orderId,
        error: err?.message || String(err),
        responseData: err?.response?.data || null,
      });
    }
  }
);

exports.telegramOnCompletedOrderCreated = onDocumentCreated(
  {
    document: 'history/{historyId}',
    region: 'asia-southeast1',
    serviceAccount: FUNCTIONS_RUNTIME_SERVICE_ACCOUNT,
  },
  async event => {
    const historyId = String(event.params?.historyId || '');
    const order = {
      historyId,
      ...(event.data?.data() || {}),
    };
    if (!isVisibleHistoryOrderForReports(order)) return;

    try {
      await sendCompletedOrderTelegram(historyId, order);
    } catch (err) {
      logger.error('telegramOnCompletedOrderCreated failed', {
        historyId,
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

  const bearerToken = match[1];
  let decoded = null;
  let email = '';
  let uid = '';
  let role = '';

  try {
    decoded = await admin.auth().verifyIdToken(bearerToken);
    email = String(decoded.email || '').trim().toLowerCase();
    uid = String(decoded.uid || '').trim();
    const userSnap = await db.collection('users').doc(uid).get().catch(() => null);
    role = String(userSnap?.exists ? (userSnap.data()?.role || '') : '').trim().toLowerCase();
  } catch (_) {
    const profileRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${bearerToken}` },
      timeout: 15000,
    }).catch(() => null);
    email = String(profileRes?.data?.email || '').trim().toLowerCase();
    if (email) {
      const userQuery = await db.collection('users').where('email', '==', email).limit(1).get().catch(() => null);
      const userDoc = userQuery?.docs?.[0];
      uid = String(userDoc?.id || '').trim();
      role = String(userDoc?.data()?.role || '').trim().toLowerCase();
    }
    if (!role && email === OWNER_EMAIL) role = 'admin';
  }

  const isAdmin = ['admin', 'owner', 'superadmin', 'manager'].includes(role) || email === OWNER_EMAIL;
  if (!isAdmin) throw new Error('Permission denied');
  return {
    uid,
    email,
    role: role || (email === OWNER_EMAIL ? 'admin' : ''),
  };
}

exports.adminProbeVertex = onRequest({
  region: 'asia-southeast1',
  memory: '512MiB',
  invoker: 'public',
  serviceAccount: FUNCTIONS_RUNTIME_SERVICE_ACCOUNT,
  secrets: [VERTEX_SERVICE_ACCOUNT_JSON],
}, (req, res) => {
  cors(req, res, async () => {
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (!['GET', 'POST'].includes(req.method)) return json(res, 405, { ok: false, error: 'Method not allowed' });

    try {
      const actor = await verifyAdminRequest(req);
      const vertexConfig = getVertexRuntimeConfig();
      const requestBody = req.method === 'POST' ? (req.body || {}) : {};
      const query = req.query || {};
      const requestedLocation = String(requestBody.location || query.location || vertexConfig.location || 'global').trim() || 'global';
      const requestedModel = String(requestBody.model || query.model || vertexConfig.textModel || 'gemini-3.5-flash').trim() || 'gemini-3.5-flash';
      const rawAuthStrategy = String(requestBody.authStrategy || query.authStrategy || 'adc_first').trim().toLowerCase();
      const authStrategy = ['adc_only', 'secret_only', 'secret_first', 'adc_first'].includes(rawAuthStrategy)
        ? rawAuthStrategy
        : 'adc_first';
      const prompt = String(requestBody.prompt || query.prompt || 'Trả về đúng 1 dòng xÃ¡c nhận ráº±ng Vertex Gemini Ä‘ang hoáº¡t Ä‘á»™ng.').trim();

      const authContexts = await getVertexAuthContexts({
        secretJson: vertexConfig.secretJson,
        projectId: vertexConfig.projectId,
        authStrategy,
      });
      const { payload, modelName, authSource, projectId } = await probeVertexText({
        secretJson: vertexConfig.secretJson,
        projectId: vertexConfig.projectId,
        location: requestedLocation,
        authStrategy,
        modelNames: [requestedModel],
        text: prompt,
      });

      return json(res, 200, {
        ok: true,
        actor,
        projectId,
        location: requestedLocation,
        requestedModel,
        usedModel: modelName,
        authStrategy,
        authSource,
        availableAuthSources: authContexts.map(ctx => ctx.source),
        text: collectTextFromPayload(payload).trim(),
        modelVersion: String(payload?.modelVersion || ''),
        usageMetadata: payload?.usageMetadata || null,
      });
    } catch (err) {
      logger.error('adminProbeVertex failed', {
        error: err?.message || String(err),
      });
      return json(res, 500, {
        ok: false,
        error: err?.message || 'Vertex probe failed',
      });
    }
  });
});

function getStorageDownloadUrl(bucketName, objectPath, token) {
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(objectPath)}?alt=media&token=${encodeURIComponent(token)}`;
}

async function saveStorageBuffer({ objectPath, contentType = 'application/octet-stream', buffer, metadata = {}, cacheControl = 'public,max-age=3600' }) {
  const token = crypto.randomUUID();
  const bucket = admin.storage().bucket();
  const file = bucket.file(objectPath);
  await file.save(buffer, {
    resumable: false,
    metadata: {
      contentType,
      metadata: {
        firebaseStorageDownloadTokens: token,
        ...metadata,
      },
      cacheControl,
    },
  });
  return {
    bucketName: bucket.name,
    objectPath,
    token,
    imageUrl: getStorageDownloadUrl(bucket.name, objectPath, token),
  };
}

async function saveMenuImageBuffer({ productId, fileName = 'menu-image.png', imageKind = 'real', contentType = 'image/png', buffer, metadata = {} }) {
  const safeName = String(fileName || 'menu-image.png').replace(/[^A-Za-z0-9._-]/g, '_') || 'menu-image.png';
  const ext = safeName.includes('.') ? safeName.split('.').pop() : 'png';
  const objectPath = `menu-images/${productId}/${Date.now()}-${imageKind}.${ext}`;
  return saveStorageBuffer({
    objectPath,
    contentType,
    buffer,
    metadata: {
      productId,
      imageKind,
      ...metadata,
    },
  });
}

async function loadStorePaymentSettings() {
  const snap = await db.collection('config').doc('settings').get().catch(() => null);
  const data = snap?.exists ? (snap.data() || {}) : {};
  return {
    storeName: String(data.storeName || 'XE KHO CHỮA LÀNH').trim(),
    storeSlogan: String(data.storeSlogan || '').trim(),
    storePhone: String(data.storePhone || '').trim(),
    storeAddress: String(data.storeAddress || '').trim(),
    bankName: String(data.bankName || 'Vietinbank').trim(),
    bankAccount: String(data.bankAccount || '').trim(),
    bankOwner: String(data.bankOwner || 'XE KHO CHỮA LÀNH').trim(),
  };
}

function wrapSvgText(text, limit = 36) {
  return generalUtils.wrapSvgText(text, limit);
}

async function buildPaymentBillImageAsset(context) {
  const settings = await loadStorePaymentSettings();
  const bank = settings.bankAccount || '0000000000';
  const bankBin = settings.bankName === 'Vietinbank' ? '970415' : '970415';
  const desc = `Thanh toán ${context.tableLabel} - ${context.billNo}`;
  const qrUrl = `https://img.vietqr.io/image/${bankBin}-${encodeURIComponent(bank)}-compact2.png?amount=${encodeURIComponent(context.total)}&addInfo=${encodeURIComponent(desc)}&accountName=${encodeURIComponent(settings.bankOwner || settings.storeName)}`;

  let qrBase64 = '';
  try {
    const qrRes = await axios.get(qrUrl, { responseType: 'arraybuffer', timeout: 30000 });
    qrBase64 = Buffer.from(qrRes.data).toString('base64');
  } catch (error) {
    logger.warn('buildPaymentBillImageAsset: QR fetch failed', {
      billNo: context.billNo,
      error: error?.message || String(error),
      responseData: error?.response?.data || null,
    });
  }

  const fontFamily = `'DejaVu Sans','Noto Sans','Arial Unicode MS',Arial,sans-serif`;
  const itemRows = [];
  (context.billItems || []).forEach(item => {
    const lines = wrapSvgText(item.name || 'Món', 26);
    lines.forEach((line, index) => {
      itemRows.push({
        type: index === 0 ? 'item' : 'sub',
        name: line,
        qty: index === 0 ? `x${Number(item.qty || 1)}` : '',
        amount: index === 0 ? formatCurrencyVi((Number(item.qty || 1) || 1) * (Number(item.price || 0) || 0)) : '',
      });
    });
    if (item.note) {
      wrapSvgText(`Ghi chú: ${item.note}`, 32).forEach(line => itemRows.push({
        type: 'note',
        name: line,
        qty: '',
        amount: '',
      }));
    }
  });

  const lineHeight = 30;
  const noteHeight = 24;
  const itemStartY = 378;
  const itemRowsHeight = itemRows.reduce((sum, row) => sum + (row.type === 'note' ? noteHeight : lineHeight), 0);
  const itemsHeight = Math.max(180, itemRowsHeight + 12);
  const summaryStartY = itemStartY + itemsHeight + 34;
  const summaryLines = [
    { label: 'Tiền hàng', value: formatCurrencyVi(context.subtotal || 0) },
    ...(context.discount ? [{ label: 'Giảm giá', value: `-${formatCurrencyVi(context.discount || 0)}` }] : []),
    ...(context.shipping ? [{ label: 'Phụ thu', value: formatCurrencyVi(context.shipping || 0) }] : []),
    ...(context.vatAmount ? [{ label: 'VAT', value: formatCurrencyVi(context.vatAmount || 0) }] : []),
  ];
  const summaryHeight = (summaryLines.length * 34) + 86;
  const qrBlockTop = summaryStartY + summaryHeight + 28;
  const qrBlockHeight = 420;
  const height = qrBlockTop + qrBlockHeight;

  let y = itemStartY;
  const rowMarkup = itemRows.map(row => {
    const fill = row.type === 'note' ? '#666666' : '#1b1b1b';
    const fontSize = row.type === 'note' ? 18 : 20;
    const markup = `
      <text x="48" y="${y}" font-size="${fontSize}" fill="${fill}" font-family="${fontFamily}">${escapeXml(row.name)}</text>
      ${row.qty ? `<text x="610" y="${y}" text-anchor="end" font-size="18" fill="#333333" font-family="${fontFamily}">${escapeXml(row.qty)}</text>` : ''}
      ${row.amount ? `<text x="852" y="${y}" text-anchor="end" font-size="18" fill="#1b1b1b" font-family="${fontFamily}" font-weight="700">${escapeXml(row.amount)}</text>` : ''}
    `;
    y += row.type === 'note' ? noteHeight : lineHeight;
    return markup;
  }).join('\n');

  const summaryMarkup = summaryLines.map((row, index) => {
    const rowY = summaryStartY + 34 + (index * 34);
    return `
      <text x="48" y="${rowY}" font-size="20" fill="#333333" font-family="${fontFamily}">${escapeXml(row.label)}</text>
      <text x="852" y="${rowY}" text-anchor="end" font-size="20" fill="#333333" font-family="${fontFamily}">${escapeXml(row.value)}</text>
    `;
  }).join('\n');

  const notePreview = context.note ? wrapSvgText(`Ghi chú: ${context.note}`, 60)[0] : '';
  const qrImageMarkup = qrBase64
    ? `<image x="340" y="${qrBlockTop + 70}" width="220" height="220" href="data:image/png;base64,${qrBase64}" />`
    : '';

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="${height}">
    <rect width="100%" height="100%" fill="#fffdf8" />
    <text x="450" y="56" text-anchor="middle" font-size="34" font-weight="800" fill="#111111" font-family="${fontFamily}">${escapeXml(settings.storeName)}</text>
    ${settings.storeSlogan ? `<text x="450" y="92" text-anchor="middle" font-size="18" fill="#7a6a45" font-family="${fontFamily}">${escapeXml(settings.storeSlogan)}</text>` : ''}
    ${settings.storePhone ? `<text x="450" y="122" text-anchor="middle" font-size="18" fill="#555555" font-family="${fontFamily}">Ä T: ${escapeXml(settings.storePhone)}</text>` : ''}
    ${settings.storeAddress ? `<text x="450" y="150" text-anchor="middle" font-size="18" fill="#555555" font-family="${fontFamily}">${escapeXml(settings.storeAddress)}</text>` : ''}
    <line x1="36" x2="864" y1="178" y2="178" stroke="#d7c28a" stroke-width="2" />

    <rect x="36" y="204" width="828" height="118" rx="16" fill="#ffffff" stroke="#efe2bc" />
    <text x="56" y="238" font-size="18" fill="#666666" font-family="${fontFamily}">Bill</text>
    <text x="56" y="266" font-size="24" font-weight="700" fill="#111111" font-family="${fontFamily}">${escapeXml(context.billNo)}</text>
    <text x="56" y="296" font-size="18" fill="#555555" font-family="${fontFamily}">Thá» i gian: ${escapeXml(formatTelegramDateTimeVi(new Date()))}</text>
    ${notePreview ? `<text x="56" y="320" font-size="17" fill="#666666" font-family="${fontFamily}">${escapeXml(notePreview)}</text>` : ''}
    <text x="844" y="238" text-anchor="end" font-size="18" fill="#666666" font-family="${fontFamily}">Bàn</text>
    <text x="844" y="272" text-anchor="end" font-size="26" font-weight="700" fill="#111111" font-family="${fontFamily}">${escapeXml(context.tableLabel)}</text>

    <text x="44" y="352" font-size="24" font-weight="700" fill="#111111" font-family="${fontFamily}">Chi tiáº¿t món</text>
    <line x1="36" x2="864" y1="366" y2="366" stroke="#efe2bc" stroke-width="1" />
    ${rowMarkup}

    <line x1="36" x2="864" y1="${summaryStartY}" y2="${summaryStartY}" stroke="#d7c28a" stroke-width="2" />
    ${summaryMarkup}
    <text x="48" y="${summaryStartY + summaryHeight - 8}" font-size="32" font-weight="800" fill="#111111" font-family="${fontFamily}">Tá»”NG Cá»˜NG</text>
    <text x="852" y="${summaryStartY + summaryHeight - 8}" text-anchor="end" font-size="34" font-weight="900" fill="#cc8f00" font-family="${fontFamily}">${escapeXml(formatCurrencyVi(context.total || 0))}</text>

    <line x1="36" x2="864" y1="${qrBlockTop}" y2="${qrBlockTop}" stroke="#efe2bc" stroke-width="1" />
    <text x="450" y="${qrBlockTop + 34}" text-anchor="middle" font-size="24" font-weight="700" fill="#1d5131" font-family="${fontFamily}">QuÃ©t QR Ä‘á»ƒ thanh toÃ¡n</text>
    ${qrImageMarkup}
    <text x="450" y="${qrBlockTop + 320}" text-anchor="middle" font-size="18" fill="#444444" font-family="${fontFamily}">${escapeXml(settings.bankName)} â€¢ ${escapeXml(bank)}</text>
    <text x="450" y="${qrBlockTop + 348}" text-anchor="middle" font-size="18" fill="#444444" font-family="${fontFamily}">${escapeXml(settings.bankOwner || settings.storeName)}</text>
    <text x="450" y="${qrBlockTop + 376}" text-anchor="middle" font-size="16" fill="#777777" font-family="${fontFamily}">${escapeXml(desc)}</text>
  </svg>`;

  const pngBuffer = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  const objectPath = `telegram-bills/${String(context.paymentRequest.id || context.paymentRequest.paymentRequestId || context.billNo).replace(/[^A-Za-z0-9_-]/g, '_')}-${Date.now()}.png`;
  const saved = await saveStorageBuffer({
    objectPath,
    contentType: 'image/png',
    buffer: pngBuffer,
    metadata: {
      paymentRequestId: String(context.paymentRequest.id || ''),
      orderRequestId: String(context.orderRequestId || ''),
      posOrderId: String(context.posOrderId || ''),
      billNo: String(context.billNo || ''),
      kind: 'telegram-payment-bill',
    },
  });

  return {
    ...saved,
    qrUrl,
  };
}

async function runDailyTelegramReport({ scheduleTime = null, force = false, isTest = false, debugNow = null } = {}) {
  const telegramBotToken = getTelegramReportBotToken();
  const telegramReportTargets = getTelegramReportTargetChatIds();
  if (!telegramBotToken || !telegramReportTargets.length) {
    logger.warn('Skipping dailyReportTelegram: missing Telegram config', {
      hasBotToken: !!telegramBotToken,
      targetCount: telegramReportTargets.length,
    });
    return { skipped: true, reason: 'missing-config' };
  }

  const settingsRef = db.collection('config').doc('settings');
  const settingsSnap = await settingsRef.get().catch(() => null);
  const rawSettings = settingsSnap?.exists ? (settingsSnap.data() || {}) : {};
  const telegramSettings = getTelegramReportSettings(rawSettings);
  const effectiveNow = debugNow ? new Date(debugNow) : new Date();
  const range = buildAdsDateRangeFromText('', effectiveNow, { defaultYesterday: true });
  const scheduleCheck = shouldSendTelegramReportNow(telegramSettings, effectiveNow, range);

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

  const report = await buildAdsRevenueTelegramData(range);
  const message = buildAdsRevenueTelegramMessage(report, { isTest });
  let deliveredChatId = '';
  let lastError = null;
  for (const targetChatId of telegramReportTargets) {
    try {
      await sendTelegramHtmlMessage({
        chatId: targetChatId,
        text: message,
        botToken: telegramBotToken,
      });
      deliveredChatId = targetChatId;
      break;
    } catch (error) {
      lastError = error;
      logger.warn('Daily ads Telegram report delivery failed for target', {
        chatId: targetChatId,
        error: error?.message || String(error),
        responseData: error?.response?.data || null,
      });
    }
  }
  if (!deliveredChatId) throw (lastError || new Error('Unable to deliver daily Telegram report'));

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
    chatId: deliveredChatId,
    invoiceCount: report.orders,
    revenue: report.revenue,
    rangeLabel: report.rangeLabel,
    isTest,
    force,
  });

  return {
    ok: true,
    chatId: deliveredChatId,
    report,
    rangeKey,
  };
}

// NOTE: exports.dailyReportTelegram (cron v1) da bi xoa de tranh gui 2 bao cao trung lap moi ngay.
// Su dung exports.scheduledTelegramReport (cuoi file) thay the — phong phu hon, co AI mood va financial profile.

exports.adminUploadMenuImage = onRequest({ region: DEFAULT_REGION, memory: HEAVY_FUNCTION_MEMORY, serviceAccount: FUNCTIONS_RUNTIME_SERVICE_ACCOUNT }, (req, res) => {
  cors(req, res, async () => {
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });

    try {
      const actor = await verifyAdminRequest(req);
      const productId = String(req.body?.productId || '').trim();
      const fileName = String(req.body?.fileName || 'menu-image.jpg').trim();
      const dataUrl = String(req.body?.dataUrl || '').trim();
      const imageKind = String(req.body?.imageKind || 'real').trim().toLowerCase();

      if (!productId) return json(res, 400, { ok: false, error: 'Missing productId' });
      if (!dataUrl.startsWith('data:')) return json(res, 400, { ok: false, error: 'Missing dataUrl image payload' });

      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) return json(res, 400, { ok: false, error: 'Invalid dataUrl format' });

      const contentType = String(match[1] || 'image/jpeg').trim();
      const base64Payload = String(match[2] || '').trim();
      const buffer = Buffer.from(base64Payload, 'base64');
      const saved = await saveMenuImageBuffer({
        productId,
        fileName,
        imageKind,
        contentType,
        buffer,
        metadata: {
          uploadedBy: actor.email || actor.uid || 'admin',
        },
      });

      return json(res, 200, {
        ok: true,
        imageUrl: saved.imageUrl,
        objectPath: saved.objectPath,
        contentType,
        actor,
      });
    } catch (err) {
      logger.error('adminUploadMenuImage failed', {
        error: err?.message || String(err),
      });
      return json(res, 500, { ok: false, error: err?.message || 'Upload failed' });
    }
  });
});

function stripDataUrlBase64(value = '') {
  return generalUtils.stripDataUrlBase64(value);
}

function extractFirstJson(text = '') {
  return generalUtils.extractFirstJson(text);
}

function mapToolActionType(actionType = '') {
  return generalUtils.mapToolActionType(actionType);
}

function buildAiRouterPendingResponse(toolResult = {}, originalText = '') {
  return generalUtils.buildAiRouterPendingResponse(toolResult, originalText);
}

function pickProvider() {
  const raw = String(AI_PROVIDER.value() || '').trim().toLowerCase();
  if (raw === 'deepseek') return 'deepseek';
  return 'vertex';
}

async function callGemini(userText) {
  const vertexConfig = getVertexRuntimeConfig();
  const system = [
    'Bạn là NLU cho POS quán ăn. Hãy trả về 1 JSON duy nhất KHÔNG kèm giải thích.',
    'Schema:',
    '{ "intent":"query_import|query_sales|query_inventory|pos_order|pos_checkout|unknown", "time_scope":"today|yesterday|this_week|this_month|this_year|null", "table_id":"<so ban>|null", "line_items":[{"name":"<ten mon>", "qty":1}], "reply":"<cau tra loi>" }',
  ].join('\n');

  const { payload } = await generateVertexText({
    secretJson: vertexConfig.secretJson,
    projectId: vertexConfig.projectId,
    location: vertexConfig.location,
    modelNames: buildVertexTextModels(vertexConfig.textModel),
    contents: [{
      role: 'user',
      parts: [{ text: `${system}\n\nCâu lệnh: ${String(userText || '').trim()}` }],
    }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  });

  const text = collectTextFromPayload(payload);
  const parsed = extractFirstJson(text);
  if (!parsed) throw new Error('Vertex returned non-JSON');
  return parsed;
}

async function askGeminiWithFirestoreTools(userText, options = {}) {
  const result = await runVertexToolLoop({
    userParts: [{ text: String(userText || '').trim() }],
    systemInstruction: [
      'Bạn là trợ lý AI thông minh của quán Xe Khô Chữa Lành.',
      'Nhiệm vụ của bạn là trả lời các câu hỏi về doanh thu, lợi nhuận, tồn kho, lịch sử nhập hàng và vận hành POS.',
      'Hãy hiểu câu hỏi tự nhiên, không chỉ các command cố định. Nếu cần dữ liệu thật, phải gọi tool đọc dữ liệu trước khi trả lời; không bịa số.',
      'Nếu người dùng hỏi một món cụ thể, ví dụ bia/bia Heineken/Tiger/nước suối, hãy trích ten_mon và trả lời theo chính món đó.',
      'Nếu người dùng hỏi giá hoặc hình ảnh món, ví dụ "Món mực 1 nắng nướng muối ớt giá bao nhiêu?", hãy dùng dữ liệu menu/kho, không tự bịa giá; nếu có ảnh món trong dữ liệu thì trả lời kèm ảnh.',
      'Nếu người dùng hỏi "hôm qua bán bao nhiêu bia" hoặc "bán mấy lon Tiger tuần này", hãy gọi tool truy_van_bao_cao với loai_bao_cao=tong_quan hoặc doanh_thu, khoang_thoi_gian phù hợp và ten_mon là mặt hàng.',
      'Nếu người dùng nói mốc giờ như "từ 18h hôm qua đến bây giờ" hoặc "từ 17h ngày 10/5 đến bây giờ", hãy ưu tiên gọi tool truy_van_bao_cao với tu_thoi_diem và den_thoi_diem hoặc den_bay_gio.',
      'Nếu người dùng hỏi khả năng của bạn, trả lời rõ bạn là trợ lý AI cho Xe Khô Chữa Lành, có thể đọc Firebase/POS khi cần, có đường BigQuery read-only cho báo cáo khi Firebase không đủ dữ liệu, và có thể tạo đề xuất thao tác cần owner xác nhận.',
      'Trả lời ngắn gọn, rõ ràng, thân thiện. Luôn gọi đúng tên quán là Xe Khô Chữa Lành. Sử dụng tools khi cần thiết.',
    ].join(' '),
    source: options.source || 'telegram_text',
    chatId: options.chatId,
    userId: options.userId,
    username: options.username,
    noPersist: options.noPersist === true,
    previewOnly: options.previewOnly === true,
  });
  return {
    text: String(result?.text || '').trim() || 'Dạ em chưa có câu trả lời phù hợp.',
    pendingActions: Array.isArray(result?.pendingActions) ? result.pendingActions : [],
    toolResults: Array.isArray(result?.toolResults) ? result.toolResults : [],
  };
}

async function askGeminiVisionForImport({ caption, imageBase64, mimeType, chatId, userId, username }) {
  const prompt = [
    'Đây là hóa đơn nhập hàng. Hãy trích xuất tên món, số lượng, đơn giá, tổng tiền và gọi Tool nhap_hang_thu_cong.',
    'Nếu thiếu đơn giá hoặc tổng tiền thì vẫn gọi tool với dữ liệu đọc được.',
    caption ? `Ghi chú từ người gửi: ${caption}` : '',
  ].filter(Boolean).join('\n');

  const result = await runVertexToolLoop({
    userParts: [
      { text: prompt },
      { inlineData: { data: String(imageBase64 || '').trim(), mimeType: mimeType || 'image/jpeg' } },
    ],
    systemInstruction: 'Bạn là trợ lý nhập kho của quán Xe KhÃƒÂ´ ChÃ¡Â»Â¯a LÃƒÂ nh. ChÃ¡Â»â€° tÃ¡ÂºÂ¡o Ã„â€˜Ã¡Â»Â  xuÃ¡ÂºÂ¥t nhÃ¡ÂºÂ­p hÃƒÂ ng, khÃƒÂ´ng tÃ¡Â»Â± xÃƒÂ¡c nhÃ¡ÂºÂ­n.',
    source: 'telegram_photo',
    chatId,
    userId,
    username,
  });

  return {
    text: String(result?.text || '').trim() || 'Dạ em đã đọc hƒÂ³a Ã„â€˜Ã†Â¡n vÃƒÂ  tÃ¡ÂºÂ¡o Ã„â€˜Ã¡Â»Â  xuÃ¡ÂºÂ¥t nhÃ¡ÂºÂ­p hÃƒÂ ng.',
    pendingActions: Array.isArray(result?.pendingActions) ? result.pendingActions : [],
    toolResults: Array.isArray(result?.toolResults) ? result.toolResults : [],
  };
}

async function askGeminiWithVoice({ voiceFileId, mimeType, botToken, chatId, userId, username }) {
  if (!botToken) throw new Error('Missing botToken');
  void mimeType;

  const fileRes = await axios.get(
    `https://api.telegram.org/bot${botToken}/getFile`,
    { params: { file_id: voiceFileId }, timeout: 15000 }
  );
  const filePath = String(fileRes?.data?.result?.file_path || '').trim();
  if (!filePath) throw new Error('Telegram getFile did not return file_path');

  const audioRes = await axios.get(
    `https://api.telegram.org/file/bot${botToken}/${filePath}`,
    { responseType: 'arraybuffer', timeout: 30000 }
  );
  const base64Data = Buffer.from(audioRes.data).toString('base64');

  const result = await runVertexToolLoop({
    userParts: [
      { inlineData: { data: base64Data, mimeType: 'audio/mp3' } },
      { text: 'Hãy nghe đoạn ghi âm này, phân tích ý đ¡Â»â€¹nh cÃ¡Â»Â§a ngÃ†Â°Ã¡Â»Â i dÃƒÂ¹ng vÃƒÂ  gÃ¡Â»Â i cÃƒÂ¡c tools tÃ†Â°Ã†Â¡ng Ã¡Â»Â©ng nÃ¡ÂºÂ¿u cần thiÃ¡ÂºÂ¿t. TrÃ¡ÂºÂ£ lÃ¡Â»Â i bÃ¡ÂºÂ±ng tiÃ¡ÂºÂ¿ng ViÃ¡Â»â€¡t.' },
    ],
    systemInstruction: 'Bạn là trợ lý AI thông minh của quán Xe Khô Chữa Lành. NhiệÂ»â€¡m vÃ¡Â»Â¥ cÃ¡Â»Â§a bÃ¡ÂºÂ¡n lÃƒÂ  hÃ¡Â»â€” trÃ¡Â»Â£ quÃ¡ÂºÂ£n lÃƒÂ½ trÃ¡ÂºÂ£ lÃ¡Â»Â i cÃƒÂ¡c cÃƒÂ¢u hÃ¡Â»Â i vÃ¡Â»Â  doanh thu, tÃ¡Â»â€œn kho, lÃ¡Â»â€¹ch sÃ¡Â»Â­ nhÃ¡ÂºÂ­p hÃƒÂ ng. TrÃ¡ÂºÂ£ lÃ¡Â»Â i ngÃ¡ÂºÂ¯n gÃ¡Â»Â n, sÃƒÂºc tÃƒÂ­ch, thÃƒÂ¢n thiÃ¡Â»â€¡n. SÃ¡Â»Â­ dÃ¡Â»Â¥ng tools khi cần thiÃ¡ÂºÂ¿t.',
    source: 'telegram_voice',
    chatId,
    userId,
    username,
  });

  return {
    text: String(result?.text || '').trim() || 'Dạ em chưa có câu trả lời phù hợp.',
    pendingActions: Array.isArray(result?.pendingActions) ? result.pendingActions : [],
    toolResults: Array.isArray(result?.toolResults) ? result.toolResults : [],
  };
}

function resolveIntentFromToolResults(toolResults = []) {
  const firstAction = (Array.isArray(toolResults) ? toolResults : []).find(item => item && typeof item === 'object');
  return mapToolActionType(firstAction?.actionType || firstAction?.tool || '');
}

async function askGeminiForPosApp({ text, imageBase64, audioBase64, mimeType } = {}) {
  const prompt = String(text || '').trim()
    || (imageBase64 ? 'Hãy phân tích nội dung ảnh này và dùng tool phù hợp nếu cần.' : '')
    || (audioBase64 ? 'Hãy phân tích nội dung âm thanh này và dùng tool phù hợp nếu cần.' : '');
  if (!prompt && !imageBase64 && !audioBase64) throw new Error('No input provided');

  const userParts = [];
  if (prompt) userParts.push({ text: prompt });
  if (imageBase64) userParts.push({ inlineData: { data: stripDataUrlBase64(imageBase64), mimeType: mimeType || 'image/jpeg' } });
  if (audioBase64) userParts.push({ inlineData: { data: stripDataUrlBase64(audioBase64), mimeType: mimeType || 'audio/webm' } });

  const result = await runVertexToolLoop({
    userParts,
    systemInstruction: 'Bạn là trợ lý AI cho POS quán Xe Khô Chữa Lành. Khi cần thao tÃƒÂ¡c, hÃƒÂ£y gÃ¡Â»Â i tool phÃƒÂ¹ hÃ¡Â»Â£p. Khi chÃ¡Â»â€° cần trÃ¡ÂºÂ£ lÃ¡Â»Â i, hÃƒÂ£y trÃ¡ÂºÂ£ lÃ¡Â»Â i ngÃ¡ÂºÂ¯n gÃ¡Â»Â n bÃ¡ÂºÂ±ng tiÃ¡ÂºÂ¿ng ViÃ¡Â»â€¡t.',
    source: 'pos_app',
    noPersist: true,
    previewOnly: false,
  });

  const routedIntent = resolveIntentFromToolResults(result?.toolResults || []) || 'unknown';
  return {
    reply: String(result?.text || '').trim() || 'AI chưa trả về nộ¢i dung.',
    intent: routedIntent,
    engine: 'vertex-server',
    pending: Array.isArray(result?.toolResults) ? result.toolResults.find(item => item?.pending) || null : null,
    toolResults: Array.isArray(result?.toolResults) ? result.toolResults : [],
  };
}

async function runVertexPurchaseOcr({ dataUrl = '' } = {}) {
  const base64Data = stripDataUrlBase64(dataUrl);
  if (!base64Data) throw new Error('Thiếu ảnh OCR.');
  const vertexConfig = getVertexRuntimeConfig();
  const prompt = [
    'Bạn là trợ lý nhập hàng cho quán ăn XE KHÔ CHỮA LÀNH.',
    'Hãy đọc ảnh hóa đơn / phiếu nhập nguyên liÃ¡Â»â€¡u vÃƒÂ  trÃ¡ÂºÂ£ vÃ¡Â»Â  Ã„â€˜ÃƒÂºng 1 JSON.',
    'Schema:',
    '{"name":"<tên hoặc rỗng nếu chưa chắc>","qty":<số˜ hoÃ¡ÂºÂ·c null>,"price":<số˜ hoÃ¡ÂºÂ·c null>,"rawText":"<toÃƒÂ n bÃ¡Â»â„¢ nÃ¡Â»â„¢i dung Ã„â€˜Ã¡Â»Â c Ã„â€˜Ã†Â°Ã¡Â»Â c>"}',
    'Nếu không rõ trường nào thì để null hoặc chuỗi rỗâ€”ng. KhÃƒÂ´ng dÃƒÂ¹ng markdown.',
  ].join('\n');

  const { payload } = await generateVertexText({
    secretJson: vertexConfig.secretJson,
    projectId: vertexConfig.projectId,
    location: vertexConfig.location,
    modelNames: buildVertexTextModels(vertexConfig.textModel),
    contents: [{
      role: 'user',
      parts: [
        { text: prompt },
        { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
      ],
    }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      maxOutputTokens: 512,
    },
  });

  const text = collectTextFromPayload(payload);
  const parsed = extractFirstJson(text);
  if (!parsed) throw new Error('Vertex OCR không trả về JSON hợp lệ.');
  return parsed;
}

exports.purchaseOcr = onRequest({
  region: DEFAULT_REGION,
  memory: HEAVY_FUNCTION_MEMORY,
  serviceAccount: FUNCTIONS_RUNTIME_SERVICE_ACCOUNT,
  secrets: [VERTEX_SERVICE_ACCOUNT_JSON],
}, (req, res) => {
  cors(req, res, async () => {
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });
    try {
      const dataUrl = String(req.body?.dataUrl || '').trim();
      if (!dataUrl.startsWith('data:')) return json(res, 400, { ok: false, error: 'Missing dataUrl image payload' });
      const parsed = await runVertexPurchaseOcr({ dataUrl });
      return json(res, 200, { ok: true, ...parsed });
    } catch (error) {
      logger.error('purchaseOcr failed', { error: error?.message || String(error) });
      return json(res, 500, { ok: false, error: error?.message || 'OCR failed' });
    }
  });
});

exports.aiStatus = onRequest({ region: 'asia-southeast1', serviceAccount: FUNCTIONS_RUNTIME_SERVICE_ACCOUNT }, (req, res) => {
  cors(req, res, () => {
    if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'Method not allowed' });
    try {
      const vertexConfig = getVertexRuntimeConfig();
      const vertexCreds = getVertexCredentials(vertexConfig.secretJson);
      return json(res, 200, {
        ok: true,
        provider: pickProvider(),
        vertexOk: !!vertexCreds,
        projectId: vertexCreds?.project_id || vertexConfig.projectId,
        region: 'asia-southeast1',
      });
    } catch (error) {
      return json(res, 200, {
        ok: false,
        provider: 'vertex',
        vertexOk: false,
        error: error?.message || String(error),
        region: 'asia-southeast1',
      });
    }
  });
});

exports.aiRouter = onRequest({
  region: DEFAULT_REGION,
  memory: HEAVY_FUNCTION_MEMORY,
  secrets: [VERTEX_SERVICE_ACCOUNT_JSON],
}, (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });

    const text = String(req.body?.text || '').trim();
    const imageBase64 = String(req.body?.imageBase64 || req.body?.image || '').trim();
    const audioBase64 = String(req.body?.audioBase64 || req.body?.audio || '').trim();
    const mimeType = String(req.body?.mimeType || '').trim();
    const previewOnly = req.body?.previewOnly !== false;

    if (!text && !imageBase64 && !audioBase64) {
      return json(res, 400, { ok: false, error: 'No input provided' });
    }

    try {
      const aiResult = await askGeminiForPosApp({ text, imageBase64, audioBase64, mimeType });
      if (aiResult?.pending) {
        return json(res, 200, buildAiRouterPendingResponse(aiResult.pending, text));
      }
      return json(res, 200, {
        ok: true,
        status: 'success',
        provider: 'vertex',
        engine: aiResult?.engine || 'vertex-server',
        intent: aiResult?.intent || 'unknown',
        reply: aiResult?.reply || '',
        message: aiResult?.reply || '',
        toolResults: aiResult?.toolResults || [],
        previewOnly,
        hasImage: !!imageBase64,
        hasAudio: !!audioBase64,
      });
    } catch (error) {
      logger.error('aiRouter (vertex) failed', { error: error?.message || String(error) });
      return json(res, 200, {
        ok: false,
        status: 'error',
        provider: 'vertex',
        error: String(error?.message || error || 'AI router failed'),
      });
    }
  });
});

exports.adminGenerateMenuImage = onRequest({ region: 'asia-southeast1' }, (req, res) => {
  cors(req, res, async () => {
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });
    try {
      const actor = await verifyAdminRequest(req);
      const productId = String(req.body?.productId || '').trim();
      const promptOverride = String(req.body?.prompt || '').trim();
      if (!productId) return json(res, 400, { ok: false, error: 'Missing productId' });

      const productSnap = await db.collection('Product_Catalog').doc(productId).get();
      if (!productSnap.exists) return json(res, 404, { ok: false, error: 'Product not found' });

      const product = productSnap.data() || {};
      const displayName = String(product.display_name || product.name || productId).trim();
      const category = String(product.category || '').trim();
      const description = String(product.description || '').trim();
      const prompt = promptOverride || [
        'Create a realistic premium restaurant menu photo.',
        `Dish name: ${displayName}.`,
        category ? `Category: ${category}.` : '',
        description ? `Description: ${description}.` : '',
        'Style: elegant plated food photography, appetizing, warm natural lighting, clean tabletop, fine-dining presentation.',
        'Composition: close-up 3/4 angle, centered dish, no text, no watermark, portrait friendly.',
      ].filter(Boolean).join(' ');

      const vertexConfig = getVertexRuntimeConfig();
      const { payload, modelName } = await generateVertexImage({
        secretJson: vertexConfig.secretJson,
        projectId: vertexConfig.projectId,
        location: vertexConfig.location,
        modelNames: buildVertexImageModels(vertexConfig.imageModel),
        prompt,
      });

      const imagePart = collectInlineImage(payload);
      if (!imagePart?.base64Data) {
        return json(res, 502, { ok: false, error: 'Vertex did not return image data' });
      }

      const saved = await saveMenuImageBuffer({
        productId,
        fileName: 'vertex-generated.png',
        imageKind: 'ai',
        contentType: imagePart.mimeType,
        buffer: Buffer.from(imagePart.base64Data, 'base64'),
        metadata: {
          uploadedBy: actor.email || actor.uid || 'admin',
          prompt,
          source: modelName || 'vertex-image',
        },
      });

      return json(res, 200, {
        ok: true,
        imageUrl: saved.imageUrl,
        objectPath: saved.objectPath,
        promptUsed: prompt,
        actor,
      });
    } catch (error) {
      logger.error('adminGenerateMenuImage (vertex) failed', { error: error?.message || String(error) });
      return json(res, 500, { ok: false, error: error?.message || 'AI image generation failed' });
    }
  });
});

exports.adminGenerateMenuDescription = onRequest({ region: 'asia-southeast1' }, (req, res) => {
  cors(req, res, async () => {
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });
    try {
      const actor = await verifyAdminRequest(req);
      void actor;
      const productId = String(req.body?.productId || '').trim();
      const promptOverride = String(req.body?.prompt || '').trim();
      const nameOverride = String(req.body?.name || '').trim();
      const categoryOverride = String(req.body?.category || '').trim();
      const imageUrlOverride = String(req.body?.imageUrl || '').trim();
      if (!productId) return json(res, 400, { ok: false, error: 'Missing productId' });

      const productSnap = await db.collection('Product_Catalog').doc(productId).get();
      if (!productSnap.exists) return json(res, 404, { ok: false, error: 'Product not found' });

      const product = productSnap.data() || {};
      const displayName = nameOverride || String(product.display_name || product.name || productId).trim();
      const category = categoryOverride || String(product.category || '').trim();
      const imageUrl = imageUrlOverride || String(product.realImageUrl || product.aiImageUrl || product.image_url || product.imageUrl || '').trim();
      const prompt = promptOverride || [
        `Viet mo ta ngan gon bang tieng Viet cho mon "${displayName}".`,
        category ? `Danh muc: ${category}.` : '',
        'Giong van sang, goi vi, phu hop menu quan an.',
        'Do dai: 18-28 tu.',
        'Khong dung emoji, khong dung gach dau dong, khong xuong dong.',
        'Tra ve dung 1 JSON dang {"description":"..."}',
      ].filter(Boolean).join(' ');

      const parts = [{ text: prompt }];
      let usedImage = false;
      if (imageUrl) {
        try {
          const imageRes = await fetch(imageUrl);
          const contentType = String(imageRes.headers.get('content-type') || 'image/jpeg');
          if (imageRes.ok && /^image\//i.test(contentType)) {
            const bytes = Buffer.from(await imageRes.arrayBuffer());
            parts.push({ inlineData: { mimeType: contentType, data: bytes.toString('base64') } });
            usedImage = true;
          }
        } catch (imageErr) {
          logger.warn('adminGenerateMenuDescription image fetch failed', {
            productId,
            imageUrl,
            error: imageErr?.message || String(imageErr),
          });
        }
      }

      const vertexConfig = getVertexRuntimeConfig();
      const { payload } = await generateVertexText({
        secretJson: vertexConfig.secretJson,
        projectId: vertexConfig.projectId,
        location: vertexConfig.location,
        modelNames: buildVertexTextModels(vertexConfig.textModel),
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.5,
          responseMimeType: 'application/json',
        },
      });

      const text = collectTextFromPayload(payload);
      const parsed = extractFirstJson(text);
      let description = String(parsed?.description || text)
        .replace(/\s+/g, ' ')
        .replace(/^["']|["']$/g, '')
        .trim();
      if (!description) return json(res, 502, { ok: false, error: 'Vertex did not return a description' });

      return json(res, 200, {
        ok: true,
        description,
        promptUsed: prompt,
        usedImage,
      });
    } catch (error) {
      logger.error('adminGenerateMenuDescription (vertex) failed', { error: error?.message || String(error) });
      return json(res, 500, { ok: false, error: error?.message || 'AI description generation failed' });
    }
  });
});

// Scheduled Telegram Daily Report
// Runs every 5 minutes, checks settings to determine if it should send
exports.scheduledTelegramReport = onSchedule({
  schedule: 'every 5 minutes',
  timeZone: 'Asia/Ho_Chi_Minh',
  region: DEFAULT_REGION,
  memory: HEAVY_FUNCTION_MEMORY,
  serviceAccount: FUNCTIONS_RUNTIME_SERVICE_ACCOUNT,
}, async (event) => {
  try {
    // Read settings from Firestore
    const settingsSnap = await db.collection('settings').doc('telegram_report').get();
    const rawSettings = settingsSnap.exists ? (settingsSnap.data() || {}) : {};
    const settings = getTelegramReportSettings(rawSettings);

    // Check if we should send now
    const now = new Date();
    const range = getVietnamBusinessReportRange(now);
    const check = shouldSendTelegramReportNow(settings, now, range);

    if (!check.shouldSend) {
      // Don't log to avoid spam - only runs when it's time to send
      return;
    }

    logger.info('scheduledTelegramReport triggered', {
      time: event.scheduleTime,
      sendHour: settings.sendHour,
      sendMinute: settings.sendMinute,
      rangeLabel: range.label,
    });

    // Get target chat IDs
    const chatIds = getTelegramReportTargetChatIds();
    if (!chatIds.length) {
      logger.warn('scheduledTelegramReport: no chat IDs configured');
      return;
    }

    // Build report data
    const reportData = await buildDailyReportTelegramData(range);
    const financial = await loadTelegramReportFinancialProfile();
    const targetRevenueForRange = financial.dailyFixedCost > 0
      ? financial.dailyFixedCost * 2
      : 0;
    const reportWithTarget = {
      ...reportData,
      targetRevenueForRange,
      dailyFixedCost: financial.dailyFixedCost,
    };

    // Build message with mood
    const message = buildConfiguredDailyReportTelegramMessage(reportWithTarget, settings);
    const mood = buildMorningRevenueMood(reportWithTarget);
    const finalMessage = `${message}\n\n<i>${escapeTelegramHtml(mood)}</i>`;

    // Send to all configured chat IDs
    const botToken = String(TELEGRAM_BOT_TOKEN.value() || '').trim();
    for (const chatId of chatIds) {
      await sendTelegramHtmlMessage({ chatId, text: finalMessage, botToken });
      logger.info('scheduledTelegramReport sent', { chatId, rangeLabel: range.label });
    }

    // Update last sent range key to prevent duplicate sends
    await db.collection('settings').doc('telegram_report').set({
      telegramReportLastSentRangeKey: check.rangeKey,
      lastSentAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    logger.info('scheduledTelegramReport completed successfully', {
      chatCount: chatIds.length,
      revenue: reportData.revenue,
    });
  } catch (error) {
    logger.error('scheduledTelegramReport failed', {
      error: error?.message || String(error),
      stack: error?.stack,
    });
  }
});
