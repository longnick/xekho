const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const DEFAULT_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';
const DEFAULT_MODEL = 'deepseek-chat';
const CATALOG_CACHE_TTL_MS = 60 * 1000;

let catalogCache = {
  expiresAt: 0,
  value: null,
  promise: null,
};

function normalizeVi(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadServiceAccount() {
  const directPath = path.join(__dirname, 'serviceAccountKey.json');
  if (fs.existsSync(directPath)) return require(directPath);
  const fallback = fs.readdirSync(__dirname).find(name =>
    /^.+-firebase-adminsdk-[^.]+\.json$/i.test(name)
  );
  if (!fallback) return null;
  return require(path.join(__dirname, fallback));
}

function ensureFirestore() {
  if (!admin.apps.length) {
    const serviceAccount = loadServiceAccount();
    if (!serviceAccount) {
      throw new Error('Không tìm thấy Firebase Admin service account.');
    }
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  return admin.firestore();
}

function parseAliases(input) {
  if (Array.isArray(input)) {
    return input.map(x => String(x || '').trim()).filter(Boolean);
  }
  return String(input || '')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);
}

function compactCatalogRows(rows) {
  return rows.map(row => ({
    item_id: String(row.item_id || row.id || '').trim(),
    display_name: String(row.display_name || row.name || row.item_id || row.id || '').trim(),
    aliases: parseAliases(row.aliases).slice(0, 8),
  })).filter(row => row.item_id && row.display_name);
}

function formatNowInSaigon(date = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Saigon',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date).replace(' ', 'T') + '+07:00';
}

function toDateOnly(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Saigon',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function parseJsonLoose(input) {
  if (!input || typeof input !== 'string') return input || null;
  try {
    return JSON.parse(input);
  } catch (_) {}

  const start = input.indexOf('{');
  const end = input.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return JSON.parse(input.slice(start, end + 1));
  }
  throw new Error('DeepSeek trả về JSON không hợp lệ.');
}

function asNumber(input, fallback = 0) {
  const value = Number(input);
  return Number.isFinite(value) ? value : fallback;
}

function normalizePaymentMethod(input) {
  const key = normalizeVi(input || '');
  if (!key) return null;
  if (['cash', 'tien mat', 'tm'].includes(key)) return 'cash';
  if (['bank', 'chuyen khoan', 'ck'].includes(key)) return 'bank';
  if (['all', 'tat ca'].includes(key)) return 'all';
  return null;
}

function toJsDate(input) {
  if (!input) return null;
  if (input instanceof Date) return input;
  if (typeof input.toDate === 'function') return input.toDate();
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildDateRange({ time_scope, from_date, to_date } = {}) {
  const now = new Date();
  const startOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const endOfDay = d => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
  const scope = String(time_scope || '').trim().toLowerCase();

  if (from_date && to_date) {
    return {
      from: startOfDay(new Date(from_date)),
      to: endOfDay(new Date(to_date)),
      label: `${from_date} đến ${to_date}`,
    };
  }

  if (scope === 'yesterday') {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return { from: startOfDay(d), to: endOfDay(d), label: 'hôm qua' };
  }

  if (scope === 'this_week') {
    const d = new Date(now);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    return { from: startOfDay(d), to: endOfDay(now), label: 'tuần này' };
  }

  if (scope === 'this_month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: startOfDay(from), to: endOfDay(now), label: 'tháng này' };
  }

  if (scope === 'today' || !scope || scope === 'none') {
    return { from: startOfDay(now), to: endOfDay(now), label: 'hôm nay' };
  }

  return { from: startOfDay(now), to: endOfDay(now), label: 'hôm nay' };
}

async function loadSlimProductCatalog({ firestore, forceRefresh = false } = {}) {
  const now = Date.now();
  if (!forceRefresh && catalogCache.value && catalogCache.expiresAt > now) {
    return catalogCache.value;
  }
  if (!forceRefresh && catalogCache.promise) {
    return catalogCache.promise;
  }

  const db = firestore || ensureFirestore();
  catalogCache.promise = (async () => {
    const snap = await db.collection('Product_Catalog').get();
    const rows = compactCatalogRows(snap.docs.map(doc => doc.data() || {}));
    catalogCache = {
      expiresAt: Date.now() + CATALOG_CACHE_TTL_MS,
      value: rows,
      promise: null,
    };
    return rows;
  })();

  try {
    return await catalogCache.promise;
  } catch (error) {
    catalogCache.promise = null;
    throw error;
  }
}

function buildDynamicSystemPrompt({ nowIso, slimCatalog }) {
  const schema = {
    intent: 'query_sales',
    confidence: 0.98,
    time_scope: 'today',
    from_date: null,
    to_date: null,
    table_id: null,
    product_item_id: null,
    inventory_item_id: null,
    line_items: [{ item_id: 'sample_item', qty: 1 }],
    payment_method: null,
    metric: 'revenue',
    group_by: 'none',
    note: '',
  };

  return [
    'You are a deterministic POS intent router.',
    'Return ONLY one valid JSON object. No markdown. No prose.',
    'Choose exactly one intent from: query_import, query_sales, query_inventory, pos_order, pos_checkout.',
    'Do not invent IDs. Use product_item_id only if matched from product catalog below.',
    'If no product match, keep product_item_id = null and explain in note.',
    'If user asks to order multiple items, fill line_items with item_id + qty only.',
    'For sales/import/inventory questions, prefer the smallest useful fields.',
    'For time, use time_scope = today|yesterday|this_week|this_month|custom|none.',
    'Use from_date/to_date only when time_scope = custom.',
    'payment_method = cash|bank|all|null.',
    'metric = revenue|orders|qty|stock|value|summary.',
    'group_by = none|day|item.',
    `CURRENT_DATETIME: ${nowIso}`,
    `PRODUCT_CATALOG_SLIM: ${JSON.stringify(slimCatalog)}`,
    `OUTPUT_SCHEMA_EXAMPLE: ${JSON.stringify(schema)}`,
  ].join('\n');
}

async function callDeepSeekIntent({
  apiKey,
  endpoint = DEFAULT_ENDPOINT,
  model = DEFAULT_MODEL,
  systemPrompt,
  userText,
  timeoutMs = 6500,
}) {
  if (!apiKey) throw new Error('Thiếu DeepSeek API key.');

  const payload = {
    model,
    temperature: 0,
    top_p: 0.1,
    max_tokens: 220,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: String(userText || '').trim() },
    ],
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || 'DeepSeek API error');
  }
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('DeepSeek không trả về nội dung.');
  }
  return parseJsonLoose(content);
}

async function findProductById(db, itemId) {
  if (!itemId) return null;
  const snap = await db.collection('Product_Catalog').where('item_id', '==', String(itemId)).limit(1).get();
  if (!snap.empty) return { docId: snap.docs[0].id, ...(snap.docs[0].data() || {}) };
  const direct = await db.collection('Product_Catalog').doc(String(itemId)).get();
  return direct.exists ? { docId: direct.id, ...(direct.data() || {}) } : null;
}

async function findInventoryById(db, inventoryId) {
  if (!inventoryId) return null;
  const snap = await db.collection('Inventory_Items').where('inv_id', '==', String(inventoryId)).limit(1).get();
  if (!snap.empty) return { docId: snap.docs[0].id, ...(snap.docs[0].data() || {}) };
  const direct = await db.collection('Inventory_Items').doc(String(inventoryId)).get();
  return direct.exists ? { docId: direct.id, ...(direct.data() || {}) } : null;
}

async function findOpenOrderByTable(db, tableId) {
  const tid = String(tableId || '').trim();
  if (!tid) return null;
  const snap = await db.collection('orders')
    .where('tableId', '==', tid)
    .where('status', '==', 'open')
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { docId: snap.docs[0].id, ...(snap.docs[0].data() || {}) };
}

async function ensureOpenOrder(db, tableId) {
  const tid = String(tableId || '').trim();
  if (!tid) throw new Error('Thiếu table_id.');

  const existing = await findOpenOrderByTable(db, tid);
  if (existing) return existing;

  const tableRef = db.collection('tables').doc(tid);
  const tableSnap = await tableRef.get();
  const tableData = tableSnap.exists ? (tableSnap.data() || {}) : {};
  const orderId = `ORD-${tid}-${Date.now()}`;
  const orderRef = db.collection('orders').doc(orderId);

  await db.runTransaction(async tx => {
    tx.set(orderRef, {
      id: orderId,
      tableId: tid,
      tableName: tableData.name || `Bàn ${tid}`,
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

  return {
    docId: orderId,
    id: orderId,
    tableId: tid,
    tableName: tableData.name || `Bàn ${tid}`,
    items: [],
    status: 'open',
  };
}

async function appendItemsToOrder(db, orderId, lineItems) {
  const orderRef = db.collection('orders').doc(String(orderId));

  await db.runTransaction(async tx => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) throw new Error(`Đơn không tồn tại: ${orderId}`);
    const order = snap.data() || {};
    const items = Array.isArray(order.items) ? order.items.map(item => ({ ...item })) : [];

    for (const next of lineItems) {
      const idx = items.findIndex(item =>
        String(item.id) === String(next.id) &&
        String(item.note || '') === String(next.note || '')
      );
      if (idx >= 0) {
        items[idx].qty = asNumber(items[idx].qty, 0) + asNumber(next.qty, 1);
      } else {
        items.push({ ...next, qty: asNumber(next.qty, 1) });
      }
    }

    tx.update(orderRef, { items });
  });
}

async function queryHistoryDocs(db, range) {
  const fromTs = admin.firestore.Timestamp.fromDate(range.from);
  const toTs = admin.firestore.Timestamp.fromDate(range.to);
  const snap = await db.collection('history')
    .where('paidAt', '>=', fromTs)
    .where('paidAt', '<=', toTs)
    .get();
  return snap.docs.map(doc => ({ docId: doc.id, ...(doc.data() || {}) }));
}

async function queryPurchasesDocs(db, range) {
  const fromKey = range.from.toISOString();
  const toKey = range.to.toISOString();
  try {
    const snap = await db.collection('purchases')
      .where('date', '>=', fromKey)
      .where('date', '<=', toKey)
      .get();
    return snap.docs.map(doc => ({ docId: doc.id, ...(doc.data() || {}) }));
  } catch (_) {
    const snap = await db.collection('purchases').get();
    return snap.docs
      .map(doc => ({ docId: doc.id, ...(doc.data() || {}) }))
      .filter(row => {
        const date = toJsDate(row.date);
        return date && date >= range.from && date <= range.to;
      });
  }
}

function maybeFilterByPayment(rows, paymentMethod) {
  if (!paymentMethod || paymentMethod === 'all') return rows;
  return rows.filter(row => normalizePaymentMethod(row.payMethod) === paymentMethod);
}

function buildOrderSummary(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  const gross = items.reduce((sum, item) => sum + asNumber(item.price) * asNumber(item.qty), 0);
  const discount = asNumber(order.discount);
  const shipping = asNumber(order.shipping);
  const vatAmount = asNumber(order.vatAmount);
  const total = asNumber(order.total, gross - discount + shipping + vatAmount);
  return {
    items,
    gross,
    discount,
    shipping,
    vatAmount,
    total,
  };
}

class DeepSeekRouter {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.DEEPSEEK_API_KEY || '';
    this.endpoint = options.endpoint || process.env.DEEPSEEK_ENDPOINT || DEFAULT_ENDPOINT;
    this.model = options.model || process.env.DEEPSEEK_MODEL || DEFAULT_MODEL;
    this.timeoutMs = asNumber(options.timeoutMs, 6500);
    this.firestore = options.firestore || ensureFirestore();
  }

  async getSlimCatalog(forceRefresh = false) {
    return loadSlimProductCatalog({ firestore: this.firestore, forceRefresh });
  }

  async buildDynamicSystemPrompt() {
    const slimCatalog = await this.getSlimCatalog();
    return buildDynamicSystemPrompt({
      nowIso: formatNowInSaigon(),
      slimCatalog,
    });
  }

  async classifyIntent(userText) {
    const systemPrompt = await this.buildDynamicSystemPrompt();
    const parsed = await callDeepSeekIntent({
      apiKey: this.apiKey,
      endpoint: this.endpoint,
      model: this.model,
      systemPrompt,
      userText,
      timeoutMs: this.timeoutMs,
    });

    return {
      intent: String(parsed.intent || '').trim(),
      confidence: Math.min(Math.max(asNumber(parsed.confidence, 0), 0), 1),
      time_scope: String(parsed.time_scope || 'today').trim().toLowerCase(),
      from_date: parsed.from_date || null,
      to_date: parsed.to_date || null,
      table_id: parsed.table_id != null ? String(parsed.table_id) : null,
      product_item_id: parsed.product_item_id != null ? String(parsed.product_item_id) : null,
      inventory_item_id: parsed.inventory_item_id != null ? String(parsed.inventory_item_id) : null,
      line_items: Array.isArray(parsed.line_items) ? parsed.line_items.map(item => ({
        item_id: item && item.item_id != null ? String(item.item_id) : null,
        qty: Math.max(1, asNumber(item && item.qty, 1)),
      })) : [],
      payment_method: normalizePaymentMethod(parsed.payment_method),
      metric: String(parsed.metric || 'summary').trim().toLowerCase(),
      group_by: String(parsed.group_by || 'none').trim().toLowerCase(),
      note: String(parsed.note || '').trim(),
      raw: parsed,
    };
  }

  async executeIntent(deepseekJsonResponse, options = {}) {
    const payload = typeof deepseekJsonResponse === 'string'
      ? parseJsonLoose(deepseekJsonResponse)
      : (deepseekJsonResponse || {});

    const intent = String(payload.intent || '').trim();
    const range = buildDateRange(payload);

    switch (intent) {
      case 'query_import':
        return this.handleQueryImport(payload, range);
      case 'query_sales':
        return this.handleQuerySales(payload, range);
      case 'query_inventory':
        return this.handleQueryInventory(payload);
      case 'pos_order':
        return this.handlePosOrder(payload);
      case 'pos_checkout':
        return this.handlePosCheckout(payload, options);
      default:
        return {
          ok: false,
          intent: intent || 'unknown',
          needs_clarification: true,
          text: 'Mình chưa xác định được intent hợp lệ từ DeepSeek JSON.',
          data: payload,
        };
    }
  }

  async handleQueryImport(payload, range) {
    const rows = await queryPurchasesDocs(this.firestore, range);
    const product = payload.product_item_id
      ? await findProductById(this.firestore, payload.product_item_id)
      : null;
    const productName = product?.display_name || product?.name || null;
    const filtered = productName
      ? rows.filter(row => normalizeVi(row.name || '').includes(normalizeVi(productName)))
      : rows;

    const total = filtered.reduce((sum, row) => sum + asNumber(row.price), 0);
    const qty = filtered.reduce((sum, row) => sum + asNumber(row.qty), 0);

    return {
      ok: true,
      intent: 'query_import',
      needs_clarification: false,
      text: productName
        ? `${range.label}, nhập ${productName}: ${qty} đơn vị, tổng ${total.toLocaleString('vi-VN')}đ.`
        : `${range.label}, tổng nhập hàng là ${total.toLocaleString('vi-VN')}đ với ${filtered.length} phiếu.`,
      data: {
        range,
        product: product ? { item_id: product.item_id || product.docId, display_name: productName } : null,
        total,
        qty,
        count: filtered.length,
      },
    };
  }

  async handleQuerySales(payload, range) {
    const rows = maybeFilterByPayment(await queryHistoryDocs(this.firestore, range), payload.payment_method);
    const product = payload.product_item_id
      ? await findProductById(this.firestore, payload.product_item_id)
      : null;
    const metric = String(payload.metric || 'summary');

    if (product) {
      const key = normalizeVi(product.display_name || product.name || '');
      const matches = rows.flatMap(row => Array.isArray(row.items) ? row.items : [])
        .filter(item =>
          String(item.id || '') === String(product.item_id || product.docId) ||
          normalizeVi(item.name || '').includes(key)
        );
      const qty = matches.reduce((sum, item) => sum + asNumber(item.qty), 0);
      const revenue = matches.reduce((sum, item) => sum + (asNumber(item.price) * asNumber(item.qty)), 0);
      return {
        ok: true,
        intent: 'query_sales',
        needs_clarification: false,
        text: `${range.label}, ${product.display_name || product.name} bán được ${qty} đơn vị, doanh thu ${revenue.toLocaleString('vi-VN')}đ.`,
        data: {
          range,
          product: {
            item_id: product.item_id || product.docId,
            display_name: product.display_name || product.name,
          },
          qty,
          revenue,
          orders: rows.length,
        },
      };
    }

    const revenue = rows.reduce((sum, row) => sum + asNumber(row.total), 0);
    if (metric === 'orders') {
      return {
        ok: true,
        intent: 'query_sales',
        needs_clarification: false,
        text: `${range.label}, có ${rows.length} đơn đã chốt.`,
        data: { range, orders: rows.length },
      };
    }

    if (payload.group_by === 'day') {
      const byDay = {};
      rows.forEach(row => {
        const date = toJsDate(row.paidAt);
        const key = date ? toDateOnly(date) : 'unknown';
        byDay[key] = (byDay[key] || 0) + asNumber(row.total);
      });
      return {
        ok: true,
        intent: 'query_sales',
        needs_clarification: false,
        text: `${range.label}, doanh thu ${revenue.toLocaleString('vi-VN')}đ từ ${rows.length} đơn.`,
        data: { range, orders: rows.length, revenue, by_day: byDay },
      };
    }

    return {
      ok: true,
      intent: 'query_sales',
      needs_clarification: false,
      text: `${range.label}, doanh thu ${revenue.toLocaleString('vi-VN')}đ từ ${rows.length} đơn.`,
      data: { range, orders: rows.length, revenue },
    };
  }

  async handleQueryInventory(payload) {
    let inventory = null;
    if (payload.inventory_item_id) {
      inventory = await findInventoryById(this.firestore, payload.inventory_item_id);
    } else if (payload.product_item_id) {
      const product = await findProductById(this.firestore, payload.product_item_id);
      if (product?.linkedInventoryId) {
        inventory = await findInventoryById(this.firestore, product.linkedInventoryId);
      }
    }

    if (!inventory) {
      return {
        ok: false,
        intent: 'query_inventory',
        needs_clarification: true,
        text: 'Mình chưa xác định được mặt hàng kho cần kiểm tra.',
        data: payload,
      };
    }

    const stock = asNumber(inventory.current_stock ?? inventory.qty);
    const unit = inventory.base_unit || inventory.unit || '';
    const name = inventory.material_name || inventory.name || inventory.inv_id || inventory.docId;

    return {
      ok: true,
      intent: 'query_inventory',
      needs_clarification: false,
      text: `${name} hiện còn ${stock.toLocaleString('vi-VN')} ${unit}`.trim(),
      data: {
        inventory_item_id: inventory.inv_id || inventory.docId,
        name,
        stock,
        unit,
      },
    };
  }

  async handlePosOrder(payload) {
    const tableId = payload.table_id ? String(payload.table_id) : null;
    const lineItems = Array.isArray(payload.line_items) ? payload.line_items.filter(item => item && item.item_id) : [];

    if (!tableId) {
      return {
        ok: false,
        intent: 'pos_order',
        needs_clarification: true,
        text: 'Thiếu table_id để thêm món.',
        data: payload,
      };
    }

    if (!lineItems.length) {
      return {
        ok: false,
        intent: 'pos_order',
        needs_clarification: true,
        text: 'Không có line_items hợp lệ để thêm món.',
        data: payload,
      };
    }

    const normalizedItems = [];
    for (const row of lineItems) {
      const product = await findProductById(this.firestore, row.item_id);
      if (!product) continue;
      normalizedItems.push({
        id: product.item_id || product.docId,
        name: product.display_name || product.name || product.item_id || product.docId,
        price: asNumber(product.sell_price ?? product.price),
        qty: Math.max(1, asNumber(row.qty, 1)),
      });
    }

    if (!normalizedItems.length) {
      return {
        ok: false,
        intent: 'pos_order',
        needs_clarification: true,
        text: 'Không map được item_id sang Product_Catalog.',
        data: payload,
      };
    }

    const order = await ensureOpenOrder(this.firestore, tableId);
    await appendItemsToOrder(this.firestore, order.id || order.docId, normalizedItems);
    const updated = await findOpenOrderByTable(this.firestore, tableId);
    const summary = buildOrderSummary(updated);

    return {
      ok: true,
      intent: 'pos_order',
      needs_clarification: false,
      text: `Đã thêm ${normalizedItems.length} dòng món vào bàn ${tableId}. Tạm tính hiện tại ${summary.total.toLocaleString('vi-VN')}đ.`,
      data: {
        table_id: tableId,
        order_id: updated.id || updated.docId,
        added_items: normalizedItems,
        order_summary: summary,
      },
    };
  }

  async handlePosCheckout(payload, options = {}) {
    const tableId = payload.table_id ? String(payload.table_id) : null;
    if (!tableId) {
      return {
        ok: false,
        intent: 'pos_checkout',
        needs_clarification: true,
        text: 'Thiếu table_id để checkout.',
        data: payload,
      };
    }

    const order = await findOpenOrderByTable(this.firestore, tableId);
    if (!order) {
      return {
        ok: false,
        intent: 'pos_checkout',
        needs_clarification: true,
        text: `Không có đơn mở cho bàn ${tableId}.`,
        data: payload,
      };
    }

    const summary = buildOrderSummary(order);

    if (!options.commitCheckout) {
      return {
        ok: true,
        intent: 'pos_checkout',
        needs_clarification: false,
        text: `Bàn ${tableId} đang có ${summary.items.length} dòng món, tổng tạm tính ${summary.total.toLocaleString('vi-VN')}đ.`,
        data: {
          table_id: tableId,
          order_id: order.id || order.docId,
          order_summary: summary,
          next_action: 'handoff_to_existing_checkout_pipeline',
        },
      };
    }

    return {
      ok: false,
      intent: 'pos_checkout',
      needs_clarification: true,
      text: 'Checkout commit chưa được bật trong router này. Hãy handoff sang flow thanh toán hiện có của app.',
      data: {
        table_id: tableId,
        order_id: order.id || order.docId,
        order_summary: summary,
      },
    };
  }

  async route(userText, options = {}) {
    const intentJson = await this.classifyIntent(userText);
    const execution = await this.executeIntent(intentJson, options);
    return { intentJson, execution };
  }
}

async function executeIntent(deepseekJsonResponse, options = {}) {
  const router = new DeepSeekRouter(options);
  return router.executeIntent(deepseekJsonResponse, options);
}

module.exports = {
  DeepSeekRouter,
  buildDynamicSystemPrompt,
  callDeepSeekIntent,
  loadSlimProductCatalog,
  executeIntent,
};
