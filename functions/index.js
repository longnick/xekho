const { onRequest } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const { defineSecret, defineString } = require('firebase-functions/params');
const cors = require('cors')({ origin: true });
const admin = require('firebase-admin');
const { NlpManager } = require('node-nlp');
const training = require('./POS_NLU_Training.json');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const AI_PROVIDER = defineString('AI_PROVIDER', { default: 'none' });
const DEEPSEEK_API_KEY = defineSecret('DEEPSEEK_API_KEY');
const DEEPSEEK_ENDPOINT = defineString('DEEPSEEK_ENDPOINT', { default: 'https://api.deepseek.com' });
const DEEPSEEK_MODEL = defineString('DEEPSEEK_MODEL', { default: 'deepseek-chat' });
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const GEMINI_MODEL = defineString('GEMINI_MODEL', { default: 'gemini-1.5-flash' });

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
