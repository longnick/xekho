const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const DEFAULT_PROVIDER = 'gemini';
const DEFAULT_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';
const DEFAULT_MODEL = 'deepseek-chat';
const DEFAULT_GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_INTENT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    intent: { type: 'STRING' },
    confidence: { type: 'NUMBER' },
    time_scope: { type: 'STRING' },
    from_date: { type: 'STRING' },
    to_date: { type: 'STRING' },
    table_id: { type: 'STRING' },
    product_item_id: { type: 'STRING' },
    inventory_item_id: { type: 'STRING' },
    line_items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          item_id: { type: 'STRING' },
          qty: { type: 'NUMBER' },
        },
      },
    },
    payment_method: { type: 'STRING' },
    metric: { type: 'STRING' },
    group_by: { type: 'STRING' },
    focus_term: { type: 'STRING' },
    note: { type: 'STRING' },
  },
};
const CATALOG_CACHE_TTL_MS = 60 * 1000;

let catalogCache = {
  expiresAt: 0,
  value: null,
  promise: null,
};

function isLikelyMojibake(input) {
  const str = String(input || '');
  if (!str) return false;
  return /[\uFFFD\u0080-\u009f]|Ã|Â|Ä|Æ|áº|á»|â€|ðŸ|�/.test(str);
}

function decodeLatin1Utf8(str) {
  try {
    return Buffer.from(String(str || ''), 'latin1').toString('utf8');
  } catch (_) {
    return String(str || '');
  }
}

function repairVietnameseText(input) {
  let str = String(input ?? '');
  if (!str) return str;
  if (!isLikelyMojibake(str)) return str;

  const candidates = [str];

  try {
    candidates.push(decodeURIComponent(escape(str)));
  } catch (_) {}

  let iterative = str;
  for (let i = 0; i < 3; i += 1) {
    const next = decodeLatin1Utf8(iterative);
    if (!next || next === iterative) break;
    candidates.push(next);
    iterative = next;
  }

  const score = (value) => {
    const text = String(value || '');
    const mojibakeHits = (text.match(/[\uFFFD\u0080-\u009f]|Ã|Â|Ä|Æ|áº|á»|â€|ðŸ|�/g) || []).length;
    const vietnameseHits = (text.match(/[àáạảãăắằẳẵặâấầẩẫậèéẹẻẽêếềểễệìíịỉĩòóọỏõôốồổỗộơớờởỡợùúụủũưứừửữựỳýỵỷỹđ]/gi) || []).length;
    return (mojibakeHits * 3) - vietnameseHits;
  };

  str = candidates.sort((a, b) => score(a) - score(b))[0] || str;
  str = str.replace(/[\u0080-\u009f]/g, '').replace(/�/g, '');

  const dictionary = [
    ['hÃ´m nay', 'hôm nay'],
    ['hÃ´m qua', 'hôm qua'],
    ['tuáº§n nÃ y', 'tuần này'],
    ['thÃ¡ng nÃ y', 'tháng này'],
    ['nháº­p', 'nhập'],
    ['bÃ¡n Ä‘Æ°á»£c', 'bán được'],
    ['Ä‘Æ¡n vá»‹', 'đơn vị'],
    ['tá»•ng', 'tổng'],
    ['lÃ£i gÃ´p', 'lãi gộp'],
    ['doanh thu', 'doanh thu'],
    ['chÆ°a', 'chưa'],
    ['khÃ´ng', 'không'],
    ['máº·t hÃ ng', 'mặt hàng'],
    ['bÃ n', 'bàn'],
    ['bÃ n', 'bàn'],
    ['Táº¡m tÃ­nh', 'Tạm tính'],
    ['hiá»‡n táº¡i', 'hiện tại'],
    ['Ä‘Ã£', 'đã'],
    ['dÃ²ng mÃ³n', 'dòng món'],
    ['vÃ o', 'vào'],
    ['Ä‘á»ƒ', 'để'],
  ];
  dictionary.forEach(([bad, good]) => {
    str = str.split(bad).join(good);
  });

  return str.trim();
}

function repairPayloadText(payload) {
  if (typeof payload === 'string') return repairVietnameseTextV2(payload);
  if (Array.isArray(payload)) return payload.map(item => repairPayloadText(item));
  if (!payload || typeof payload !== 'object') return payload;

  const next = {};
  Object.keys(payload).forEach((key) => {
    next[key] = repairPayloadText(payload[key]);
  });
  return next;
}

function repairVietnameseTextV2(input) {
  let str = String(input ?? '');
  if (!str) return str;

  const hasGoodVietnamese = /[àáạảãăắằẳẵặâấầẩẫậèéẹẻẽêếềểễệìíịỉĩòóọỏõôốồổỗộơớờởỡợùúụủũưứừửữựỳýỵỷỹđ]/i.test(str);
  if (!hasGoodVietnamese && isLikelyMojibake(str)) {
    try {
      const decoded = decodeLatin1Utf8(str);
      if (decoded && !/[\u0000-\u001f]/.test(decoded)) str = decoded;
    } catch (_) {}
  }

  str = str.replace(/[\u0080-\u009f]/g, '').replace(/ï¿½|�/g, '');

  const dictionary = [
    ['bÃ¡n', 'b\u00e1n'],
    ['Ä‘Æ°á»£c', '\u0111\u01b0\u1ee3c'],
    ['Ä‘Æ¡n', '\u0111\u01a1n'],
    ['vá»‹', 'v\u1ecb'],
    ['lÃ£i', 'l\u00e3i'],
    ['gÃ´p', 'g\u1ed9p'],
    ['nháº­p', 'nh\u1eadp'],
    ['tá»•ng', 't\u1ed5ng'],
    ['chá»‘t', 'ch\u1ed1t'],
    ['hiá»‡n', 'hi\u1ec7n'],
    ['máº·t hÃ ng', 'm\u1eb7t h\u00e0ng'],
    ['mÃ³n', 'm\u00f3n'],
    ['nhiá»u nháº¥t', 'nhi\u1ec1u nh\u1ea5t'],
    ['hÃ´m nay', 'h\u00f4m nay'],
    ['hÃ´m qua', 'h\u00f4m qua'],
    ['tuáº§n nÃ y', 'tu\u1ea7n n\u00e0y'],
    ['thÃ¡ng nÃ y', 'th\u00e1ng n\u00e0y'],
    ['Táº¡m tÃ­nh', 'T\u1ea1m t\u00ednh'],
    ['hiá»‡n táº¡i', 'hi\u1ec7n t\u1ea1i'],
    ['chÆ°a', 'ch\u01b0a'],
    ['khÃ´ng', 'kh\u00f4ng'],
    ['bÃ n', 'b\u00e0n'],
    ['Ä‘Ã£', '\u0111\u00e3'],
    ['Ä‘á»ƒ', '\u0111\u1ec3'],
    ['Ä‘', '\u0111'],
    ['Ã¡', '\u00e1'],
    ['Ã ', '\u00e0'],
    ['Ã£', '\u00e3'],
    ['Ã¢', '\u00e2'],
    ['Ãª', '\u00ea'],
    ['Ã´', '\u00f4'],
    ['Æ°', '\u01b0'],
    ['Æ¡', '\u01a1'],
    ['Ã¹', '\u00f9'],
    ['Ãº', '\u00fa'],
    ['Ã²', '\u00f2'],
    ['Ã³', '\u00f3'],
    ['Ã¨', '\u00e8'],
    ['Ã©', '\u00e9'],
    ['Ã¬', '\u00ec'],
    ['Ã­', '\u00ed'],
  ];
  dictionary.forEach(([bad, good]) => {
    str = str.split(bad).join(good);
  });

  return str.trim();
}

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

function getFocusTerm(payload = {}, userText = '') {
  const direct = String(payload.focus_term || payload.note || '').trim();
  if (direct) return direct;

  const text = normalizeVi(userText || '');
  if (!text) return '';

  const keywordMap = [
    ['ken', /ken|heineken/],
    ['bia', /bia|beer|tiger|sai gon|saigon|larue|budweiser/],
    ['bo huc', /bo huc|redbull/],
    ['nuoc ngot', /nuoc ngot|soft drink|7up|pepsi|sprite|sting/],
    ['tra dao', /tra dao/],
    ['tra tac', /tra tac/],
    ['ruou', /ruou|wine|liquor/],
  ];

  for (const [label, pattern] of keywordMap) {
    if (pattern.test(text)) return label;
  }

  return String(userText || '').trim();
}

function getCatalogTokens(row = {}) {
  return [
    row.item_id,
    row.display_name,
    ...(Array.isArray(row.aliases) ? row.aliases : []),
  ].map(normalizeVi).filter(Boolean);
}

function expandSemanticTerms(term) {
  const key = normalizeVi(term);
  const set = new Set([key]);
  const addAll = list => list.forEach(item => set.add(normalizeVi(item)));

  if (/(^| )bia($| )|beer|lon/.test(key)) addAll(['bia', 'beer', 'tiger', 'sai gon', 'saigon', 'ken', 'heineken']);
  if (/ken|heineken/.test(key)) addAll(['ken', 'heineken']);
  if (/tiger/.test(key)) addAll(['tiger']);
  if (/sai gon|saigon/.test(key)) addAll(['sai gon', 'saigon']);
  if (/nuoc ngot|soft drink|giai khat/.test(key)) addAll(['7up', 'pepsi', 'sprite', 'sting', 'bo huc', 'redbull', 'tra dao', 'tra tac']);
  if (/bo huc|redbull/.test(key)) addAll(['bo huc', 'redbull']);
  if (/tr[ae] dao/.test(key)) addAll(['tra dao']);
  if (/tr[ae] tac/.test(key)) addAll(['tra tac']);
  if (/ruou|liquor|wine/.test(key)) addAll(['ruou', 'bach nhat', 'nep cam', 'nu nhi hong', 'ruou mo', 'ruou dau', 'ruou gao']);

  return [...set].filter(Boolean);
}

function scoreTextAgainstFocus(text, focusTerm) {
  const normalizedText = normalizeVi(text);
  if (!normalizedText) return 0;
  const focusTerms = expandSemanticTerms(focusTerm);
  if (!focusTerms.length) return 0;
  let score = 0;
  focusTerms.forEach(term => {
    if (!term) return;
    if (normalizedText === term) score = Math.max(score, 5);
    else if (normalizedText.includes(term) || term.includes(normalizedText)) score = Math.max(score, 3);
    else {
      const parts = term.split(' ').filter(Boolean);
      const hits = parts.filter(part => normalizedText.includes(part)).length;
      if (hits > 0) score = Math.max(score, hits);
    }
  });
  return score;
}

function inferMetric(metric, userText = '') {
  const rawMetric = String(metric || '').trim().toLowerCase();
  if (rawMetric && rawMetric !== 'summary') return rawMetric;
  const text = normalizeVi(userText);
  if (/lai|loi nhuan|profit|gross/.test(text)) return 'profit';
  if (/top|nhieu nhat|ban chay|ban nhieu nhat/.test(text)) return 'top_item';
  if (/bao nhieu don|so don|orders/.test(text)) return 'orders';
  if (/so luong|qty|bao nhieu/.test(text)) return 'qty';
  if (/doanh thu|revenue/.test(text)) return 'revenue';
  if (/ton kho|con bao nhieu|stock/.test(text)) return 'stock';
  return 'summary';
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
    focus_term: '',
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
    'metric = revenue|orders|qty|stock|value|summary|profit|top_item.',
    'group_by = none|day|item.',
    'focus_term = free text keyword/category if the user asks about a product family or fuzzy subject like "bia", "ken", "món bán nhiều nhất".',
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

async function callGeminiIntent({
  apiKey,
  model = DEFAULT_GEMINI_MODEL,
  systemPrompt,
  userText,
  timeoutMs = 6500,
}) {
  if (!apiKey) throw new Error('Thiếu Gemini API key.');

  const url = `${DEFAULT_GEMINI_ENDPOINT}/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\nUSER_REQUEST: ${String(userText || '').trim()}` }],
        },
      ],
      generationConfig: {
        temperature: 0,
        topP: 0.1,
        maxOutputTokens: 220,
        responseMimeType: 'application/json',
      },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const data = await res.json();
  if (!res.ok || data?.error) {
    throw new Error(data?.error?.message || 'Gemini API error');
  }
  const content = data?.candidates?.[0]?.content?.parts?.map(part => part?.text || '').join('').trim();
  if (!content) throw new Error('Gemini không trả về nội dung.');
  return parseJsonLoose(content);
}

async function callGeminiIntentStable({
  apiKey,
  model = DEFAULT_GEMINI_MODEL,
  endpoint = DEFAULT_GEMINI_ENDPOINT,
  systemPrompt,
  userText,
  timeoutMs = 6500,
}) {
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = await fetch(`${endpoint}/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: String(userText || '').trim() }],
          },
        ],
        generationConfig: {
          temperature: 0,
          topP: 0.1,
          maxOutputTokens: 220,
          responseMimeType: 'application/json',
          responseSchema: GEMINI_INTENT_SCHEMA,
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const data = await res.json();
    if (!res.ok || data?.error) {
      const message = data?.error?.message || 'Gemini API error';
      lastError = new Error(message);
      if (/high demand|overloaded|unavailable|try again later/i.test(message) && attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 600 * (attempt + 1)));
        continue;
      }
      throw lastError;
    }

    const content = data?.candidates?.[0]?.content?.parts?.map(part => part?.text || '').join('').trim();
    if (!content) {
      lastError = new Error('Gemini không trả về nội dung.');
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
        continue;
      }
      throw lastError;
    }

    try {
      return parseJsonLoose(content);
    } catch (error) {
      lastError = error;
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
        continue;
      }
      throw lastError;
    }
  }

  throw lastError || new Error('Gemini API error');
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
    this.provider = String(options.provider || process.env.AI_PROVIDER || DEFAULT_PROVIDER).trim().toLowerCase();
    this.apiKey = options.apiKey || (
      this.provider === 'gemini'
        ? (process.env.GEMINI_API_KEY || '')
        : (process.env.DEEPSEEK_API_KEY || '')
    );
    this.endpoint = options.endpoint || (
      this.provider === 'gemini'
        ? (process.env.GEMINI_ENDPOINT || DEFAULT_GEMINI_ENDPOINT)
        : (process.env.DEEPSEEK_ENDPOINT || DEFAULT_ENDPOINT)
    );
    this.model = options.model || (
      this.provider === 'gemini'
        ? (process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL)
        : (process.env.DEEPSEEK_MODEL || DEFAULT_MODEL)
    );
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

  inferTimeScopeFromText(userText = '') {
    const text = normalizeVi(userText);
    if (/hom qua|yesterday/.test(text)) return 'yesterday';
    if (/tuan nay|week/.test(text)) return 'this_week';
    if (/thang nay|month/.test(text)) return 'this_month';
    return 'today';
  }

  inferFocusFromText(userText = '') {
    const text = normalizeVi(userText);
    if (!text) return '';
    const keywordMap = [
      ['ken', /ken|heineken/],
      ['bia', /bia|beer|tiger|sai gon|saigon|larue|budweiser/],
      ['bo huc', /bo huc|redbull/],
      ['nuoc ngot', /nuoc ngot|soft drink|7up|pepsi|sprite|sting/],
      ['tra dao', /tra dao/],
      ['tra tac', /tra tac/],
      ['ruou', /ruou|wine|liquor/],
    ];
    for (const [label, pattern] of keywordMap) {
      if (pattern.test(text)) return label;
    }
    return '';
  }

  inferTableIdFromText(userText = '') {
    const text = normalizeVi(userText);
    const match = text.match(/(?:ban|bàn)\s*(\d+)/i);
    return match ? String(match[1]) : null;
  }

  async fallbackClassifyIntent(userText) {
    const text = normalizeVi(userText);
    const time_scope = this.inferTimeScopeFromText(userText);
    const focus_term = this.inferFocusFromText(userText);
    const table_id = this.inferTableIdFromText(userText);
    const metric = inferMetric('', userText);
    const payload = {
      intent: 'query_sales',
      confidence: 0.35,
      time_scope,
      from_date: null,
      to_date: null,
      table_id,
      product_item_id: null,
      inventory_item_id: null,
      line_items: [],
      payment_method: null,
      metric,
      group_by: 'none',
      focus_term,
      note: 'fallback_router',
      raw: { fallback: true, userText },
    };

    if (/tinh tien|thanh toan|ra bill|chot bill/.test(text) && table_id) {
      payload.intent = 'pos_checkout';
      return payload;
    }

    if (/nhap|mua vao|phieu nhap/.test(text)) {
      payload.intent = 'query_import';
      return payload;
    }

    if (/ton kho|con bao nhieu|con lai bao nhieu|so luong ton|kho con/.test(text)) {
      payload.intent = 'query_inventory';
      payload.metric = 'stock';
      return payload;
    }

    if (/ban|doanh thu|lai|loi nhuan|mon nao|ban chay|bao nhieu/.test(text)) {
      payload.intent = 'query_sales';
      const matchedCatalog = focus_term ? await this.matchCatalogByFocus(focus_term) : [];
      if (matchedCatalog.length === 1) {
        payload.product_item_id = String(matchedCatalog[0].item_id || '');
      }
      return payload;
    }

    return payload;
  }

  async classifyIntent(userText) {
    const systemPrompt = await this.buildDynamicSystemPrompt();
    const parsed = this.provider === 'gemini'
      ? await callGeminiIntentStable({
          apiKey: this.apiKey,
          model: this.model,
          endpoint: this.endpoint || DEFAULT_GEMINI_ENDPOINT,
          systemPrompt,
          userText,
          timeoutMs: this.timeoutMs,
        })
      : await callDeepSeekIntent({
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
      focus_term: String(parsed.focus_term || '').trim(),
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
        return this.handleQueryImportV2(payload, range, options);
      case 'query_sales':
        return this.handleQuerySalesV2(payload, range, options);
      case 'query_inventory':
        return this.handleQueryInventoryV2(payload, options);
      case 'pos_order':
        return this.handlePosOrderV2(payload, options);
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

  async matchCatalogByFocus(focusTerm) {
    const focus = String(focusTerm || '').trim();
    if (!focus) return [];
    const slimCatalog = await this.getSlimCatalog();
    return slimCatalog
      .map(row => ({ row, score: Math.max(...getCatalogTokens(row).map(token => scoreTextAgainstFocus(token, focus)), 0) }))
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(entry => entry.row);
  }

  async resolvePosLineItems(lineItems) {
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
    return normalizedItems;
  }

  buildClientAction(intent, payload, normalizedItems = []) {
    if (intent === 'pos_order') {
      return {
        type: 'order',
        tableId: payload.table_id ? String(payload.table_id) : null,
        items: normalizedItems.map(item => ({ id: item.id, qty: item.qty })),
      };
    }
    if (intent === 'pos_checkout') {
      return {
        type: 'pay',
        tableId: payload.table_id ? String(payload.table_id) : null,
      };
    }
    return null;
  }

  async handleQueryImport(payload, range, options = {}) {
    const rows = await queryPurchasesDocs(this.firestore, range);
    const metric = inferMetric(payload.metric, options.userText);
    const focusTerm = getFocusTerm(payload, options.userText);
    const product = payload.product_item_id
      ? await findProductById(this.firestore, payload.product_item_id)
      : null;
    const matchedCatalog = product ? [product] : await this.matchCatalogByFocus(focusTerm);
    const productName = product?.display_name || product?.name || focusTerm || null;
    const filtered = productName
      ? rows.filter(row => {
          const name = row.name || '';
          const byLabel = scoreTextAgainstFocus(name, productName) > 0;
          const byCatalog = matchedCatalog.some(item => scoreTextAgainstFocus(name, item.display_name || item.name || item.item_id) > 0);
          return byLabel || byCatalog;
        })
      : rows;

    const total = filtered.reduce((sum, row) => sum + asNumber(row.price), 0);
    const qty = filtered.reduce((sum, row) => sum + asNumber(row.qty), 0);
    if (metric === 'qty') {
      return {
        ok: true,
        intent: 'query_import',
        needs_clarification: false,
        text: productName
          ? `${range.label}, nháº­p ${productName} ${qty.toLocaleString('vi-VN')} Ä‘Æ¡n vá»‹.`
          : `${range.label}, tá»•ng sá»‘ lÆ°á»£ng nháº­p lÃ  ${qty.toLocaleString('vi-VN')} Ä‘Æ¡n vá»‹.`,
        data: {
          range,
          product: product ? { item_id: product.item_id || product.docId, display_name: productName } : null,
          total,
          qty,
          count: filtered.length,
          focus_term: productName,
        },
      };
    }

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
      const clientAction = this.buildClientAction('pos_checkout', payload);
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
          client_action: clientAction,
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

  async handleQueryImportV2(payload, range, options = {}) {
    const rows = await queryPurchasesDocs(this.firestore, range);
    const metric = inferMetric(payload.metric, options.userText);
    const focusTerm = getFocusTerm(payload, options.userText);
    const product = payload.product_item_id ? await findProductById(this.firestore, payload.product_item_id) : null;
    const matchedCatalog = product ? [product] : await this.matchCatalogByFocus(focusTerm);
    const focusLabel = product?.display_name || product?.name || focusTerm || null;
    const filtered = focusLabel
      ? rows.filter(row => {
          const name = row.name || '';
          return scoreTextAgainstFocus(name, focusLabel) > 0 ||
            matchedCatalog.some(item => scoreTextAgainstFocus(name, item.display_name || item.name || item.item_id) > 0);
        })
      : rows;
    const total = filtered.reduce((sum, row) => sum + asNumber(row.price), 0);
    const qty = filtered.reduce((sum, row) => sum + asNumber(row.qty), 0);

    if (metric === 'qty') {
      return {
        ok: true,
        intent: 'query_import',
        needs_clarification: false,
        text: focusLabel
          ? `${range.label}, nháº­p ${focusLabel} ${qty.toLocaleString('vi-VN')} Ä‘Æ¡n vá»‹.`
          : `${range.label}, tá»•ng sá»‘ lÆ°á»£ng nháº­p lÃ  ${qty.toLocaleString('vi-VN')} Ä‘Æ¡n vá»‹.`,
        data: { range, total, qty, count: filtered.length, focus_term: focusLabel },
      };
    }

    return {
      ok: true,
      intent: 'query_import',
      needs_clarification: false,
      text: focusLabel
        ? `${range.label}, nháº­p ${focusLabel}: ${qty.toLocaleString('vi-VN')} Ä‘Æ¡n vá»‹, tá»•ng ${total.toLocaleString('vi-VN')}Ä‘ (${filtered.length} phiáº¿u).`
        : `${range.label}, tá»•ng nháº­p hÃ ng lÃ  ${total.toLocaleString('vi-VN')}Ä‘ vá»›i ${filtered.length} phiáº¿u.`,
      data: { range, total, qty, count: filtered.length, focus_term: focusLabel },
    };
  }

  async handleQuerySalesV2(payload, range, options = {}) {
    const rows = maybeFilterByPayment(await queryHistoryDocs(this.firestore, range), payload.payment_method);
    const directProduct = payload.product_item_id ? await findProductById(this.firestore, payload.product_item_id) : null;
    const focusTerm = getFocusTerm(payload, options.userText);
    const matchedCatalog = directProduct ? [directProduct] : await this.matchCatalogByFocus(focusTerm);
    const matchedIds = new Set(matchedCatalog.map(item => String(item.item_id || item.docId)));
    const focusLabel = directProduct?.display_name || directProduct?.name || focusTerm || null;
    const metric = inferMetric(payload.metric, options.userText);

    const itemStats = new Map();
    rows.forEach(row => {
      const items = Array.isArray(row.items) ? row.items : [];
      items.forEach(item => {
        const name = String(item.name || item.id || 'KhÃ´ng rÃµ');
        const score = focusLabel
          ? Math.max(
              matchedIds.has(String(item.id || '')) ? 5 : 0,
              scoreTextAgainstFocus(name, focusLabel),
              ...matchedCatalog.map(product => scoreTextAgainstFocus(name, product.display_name || product.name || product.item_id))
            )
          : 1;
        if (focusLabel && score <= 0) return;
        const key = String(item.id || name);
        const current = itemStats.get(key) || { id: key, name, qty: 0, revenue: 0, cost: 0, profit: 0 };
        current.qty += asNumber(item.qty);
        current.revenue += asNumber(item.price) * asNumber(item.qty);
        current.cost += asNumber(item.cost) * asNumber(item.qty);
        current.profit = current.revenue - current.cost;
        itemStats.set(key, current);
      });
    });

    const statsList = [...itemStats.values()];
    const qty = statsList.reduce((sum, item) => sum + item.qty, 0);
    const revenue = focusLabel ? statsList.reduce((sum, item) => sum + item.revenue, 0) : rows.reduce((sum, row) => sum + asNumber(row.total), 0);
    const cost = focusLabel ? statsList.reduce((sum, item) => sum + item.cost, 0) : rows.reduce((sum, row) => sum + asNumber(row.cost), 0);
    const profit = revenue - cost;

    if (metric === 'top_item') {
      const topItem = [...statsList].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)[0];
      return {
        ok: true,
        intent: 'query_sales',
        needs_clarification: false,
        text: topItem
          ? `${range.label}, mÃ³n bÃ¡n nhiá»u nháº¥t lÃ  ${topItem.name} vá»›i ${topItem.qty.toLocaleString('vi-VN')} Ä‘Æ¡n vá»‹, doanh thu ${topItem.revenue.toLocaleString('vi-VN')}Ä‘.`
          : `${range.label}, chÆ°a cÃ³ dá»¯ liá»‡u bÃ¡n hÃ ng Ä‘á»ƒ xáº¿p háº¡ng mÃ³n.`,
        data: { range, top_item: topItem || null, focus_term: focusLabel },
      };
    }

    if (metric === 'orders') {
      return {
        ok: true,
        intent: 'query_sales',
        needs_clarification: false,
        text: `${range.label}, cÃ³ ${rows.length} Ä‘Æ¡n Ä‘Ã£ chá»‘t.`,
        data: { range, orders: rows.length, focus_term: focusLabel },
      };
    }

    if (metric === 'profit') {
      return {
        ok: true,
        intent: 'query_sales',
        needs_clarification: false,
        text: focusLabel
          ? `${range.label}, ${focusLabel} lÃ£i gÃ´p ${profit.toLocaleString('vi-VN')}Ä‘ trÃªn doanh thu ${revenue.toLocaleString('vi-VN')}Ä‘.`
          : `${range.label}, lÃ£i gÃ´p á»›c tÃ­nh ${profit.toLocaleString('vi-VN')}Ä‘ trÃªn doanh thu ${revenue.toLocaleString('vi-VN')}Ä‘.`,
        data: { range, revenue, cost, profit, qty, orders: rows.length, focus_term: focusLabel },
      };
    }

    if (focusLabel) {
      return {
        ok: true,
        intent: 'query_sales',
        needs_clarification: false,
        text: `${range.label}, ${focusLabel} bÃ¡n Ä‘Æ°á»£c ${qty.toLocaleString('vi-VN')} Ä‘Æ¡n vá»‹, doanh thu ${revenue.toLocaleString('vi-VN')}Ä‘, lÃ£i gÃ´p ${profit.toLocaleString('vi-VN')}Ä‘.`,
        data: { range, revenue, cost, profit, qty, orders: rows.length, focus_term: focusLabel, items: statsList.slice(0, 10) },
      };
    }

    return {
      ok: true,
      intent: 'query_sales',
      needs_clarification: false,
      text: `${range.label}, doanh thu ${revenue.toLocaleString('vi-VN')}Ä‘, lÃ£i gÃ´p ${profit.toLocaleString('vi-VN')}Ä‘ tá»« ${rows.length} Ä‘Æ¡n.`,
      data: { range, orders: rows.length, revenue, cost, profit },
    };
  }

  async handleQueryInventoryV2(payload, options = {}) {
    const focusTerm = getFocusTerm(payload, options.userText);
    const explicit = payload.inventory_item_id ? await findInventoryById(this.firestore, payload.inventory_item_id) : null;
    const linked = !explicit && payload.product_item_id ? await findProductById(this.firestore, payload.product_item_id) : null;
    const linkedInventory = linked?.linkedInventoryId ? await findInventoryById(this.firestore, linked.linkedInventoryId) : null;
    const target = explicit || linkedInventory;

    if (target) {
      const stock = asNumber(target.current_stock ?? target.qty);
      const unit = target.base_unit || target.unit || '';
      const name = target.material_name || target.name || target.inv_id || target.docId;
      return {
        ok: true,
        intent: 'query_inventory',
        needs_clarification: false,
        text: `${name} hiá»‡n cÃ²n ${stock.toLocaleString('vi-VN')} ${unit}`.trim(),
        data: { inventory_item_id: target.inv_id || target.docId, name, stock, unit },
      };
    }

    const snap = await this.firestore.collection('Inventory_Items').get();
    const rows = snap.docs.map(doc => ({ docId: doc.id, ...(doc.data() || {}) }));
    const filtered = focusTerm
      ? rows.filter(row => scoreTextAgainstFocus(row.material_name || row.name || row.inv_id, focusTerm) > 0)
      : [];

    if (!filtered.length) {
      return {
        ok: false,
        intent: 'query_inventory',
        needs_clarification: true,
        text: 'MÃ¬nh chÆ°a xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c máº·t hÃ ng kho cáº§n kiá»ƒm tra.',
        data: payload,
      };
    }

    const totalStock = filtered.reduce((sum, row) => sum + asNumber(row.current_stock ?? row.qty), 0);
    return {
      ok: true,
      intent: 'query_inventory',
      needs_clarification: false,
      text: `Tá»•ng tá»“n ${focusTerm}: ${totalStock.toLocaleString('vi-VN')} trÃªn ${filtered.length} máº·t hÃ ng kho.`,
      data: { focus_term: focusTerm, total_stock: totalStock, items: filtered.slice(0, 20) },
    };
  }

  async handlePosOrderV2(payload, options = {}) {
    const tableId = payload.table_id ? String(payload.table_id) : null;
    const lineItems = Array.isArray(payload.line_items) ? payload.line_items.filter(item => item && item.item_id) : [];
    if (!tableId) {
      return { ok: false, intent: 'pos_order', needs_clarification: true, text: 'Thiáº¿u table_id Ä‘á»ƒ thÃªm mÃ³n.', data: payload };
    }
    if (!lineItems.length) {
      return { ok: false, intent: 'pos_order', needs_clarification: true, text: 'KhÃ´ng cÃ³ line_items há»£p lá»‡ Ä‘á»ƒ thÃªm mÃ³n.', data: payload };
    }
    const normalizedItems = await this.resolvePosLineItems(lineItems);
    if (!normalizedItems.length) {
      return { ok: false, intent: 'pos_order', needs_clarification: true, text: 'KhÃ´ng map Ä‘Æ°á»£c item_id sang Product_Catalog.', data: payload };
    }

    const previewAddedTotal = normalizedItems.reduce((sum, item) => sum + (asNumber(item.price) * asNumber(item.qty)), 0);
    const clientAction = this.buildClientAction('pos_order', payload, normalizedItems);
    if (options.previewOnly !== false) {
      return {
        ok: true,
        intent: 'pos_order',
        needs_clarification: false,
        preview_only: true,
        text: `AI nháº­n lá»‡nh thÃªm ${normalizedItems.map(item => `${item.qty} ${item.name}`).join(', ')} cho bÃ n ${tableId}. Táº¡m tÃ­nh thÃªm ${previewAddedTotal.toLocaleString('vi-VN')}Ä‘.`,
        data: { table_id: tableId, added_items: normalizedItems, preview_added_total: previewAddedTotal, client_action: clientAction },
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
      text: `ÄÃ£ thÃªm ${normalizedItems.length} dÃ²ng mÃ³n vÃ o bÃ n ${tableId}. Táº¡m tÃ­nh hiá»‡n táº¡i ${summary.total.toLocaleString('vi-VN')}Ä‘.`,
      data: { table_id: tableId, order_id: updated.id || updated.docId, added_items: normalizedItems, order_summary: summary, client_action: clientAction },
    };
  }

  async route(userText, options = {}) {
    let intentJson;
    try {
      intentJson = await this.classifyIntent(userText);
    } catch (error) {
      const message = String(error?.message || '');
      if (/quota|high demand|overloaded|unavailable|try again later|json khong hop le|json không hợp lệ|api key|connect|econn|fetch failed/i.test(normalizeVi(message))) {
        intentJson = await this.fallbackClassifyIntent(userText);
        intentJson.fallback_reason = message;
      } else {
        throw error;
      }
    }
    const execution = await this.executeIntent(intentJson, options);
    return {
      intentJson: repairPayloadText(intentJson),
      execution: repairPayloadText(execution),
    };
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
  repairVietnameseText: repairVietnameseTextV2,
};
