// ============================================================
// AI ENGINE: DeepSeek (online) + Local NLP (offline)
// ============================================================

const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.5-flash-preview-04-17',
  'gemini-2.0-flash-lite',
];

const DEEPSEEK_MODELS = [
  'deepseek-chat',
  'deepseek-reasoner',
];

function _repairAIText(input) {
  const str = String(input ?? '');
  const badTokens = ['\uFFFD', 'Ã', 'Â', 'Ä‘', 'Æ°', 'â€™', 'â€œ', 'â€', 'ðŸ', 'á»', 'áº'];
  if (!badTokens.some(t => str.includes(t))) return str;
  try {
    return decodeURIComponent(escape(str));
  } catch (_) {}
  try {
    const bytes = Uint8Array.from(str, ch => ch.charCodeAt(0) & 0xFF);
    return new TextDecoder('utf-8').decode(bytes);
  } catch (_) {}
  return str;
}

async function callGemini(apiKey, systemPrompt, options = {}) {
  const forceJson = options.forceJson !== false;
  let lastError = null;
  for (const model of GEMINI_MODELS) {
    try {
      const generationConfig = { temperature: 0.2, maxOutputTokens: forceJson ? 700 : 900 };
      if (forceJson) generationConfig.response_mime_type = 'application/json';
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body   : JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
            generationConfig
          }),
          signal: AbortSignal.timeout(8000)
        }
      );
      const data = await res.json();
      if (data.error) {
        if (data.error.code === 404 || data.error.code === 400 ||
            (data.error.message || '').includes('no longer available') ||
            (data.error.message || '').includes('deprecated')) {
          lastError = new Error(data.error.message);
          continue;
        }
        throw new Error(data.error.message);
      }
      if (!data.candidates?.length) throw new Error(_repairAIText('Gemini khÃ´ng tráº£ vá» káº¿t quáº£.'));
      return data.candidates[0].content.parts[0].text;
    } catch(e) {
      if (e.name === 'AbortError' || e.name === 'TimeoutError') throw e;
      lastError = e;
    }
  }
  throw lastError || new Error(_repairAIText('Táº¥t cáº£ Gemini models Ä‘á»u khÃ´ng kháº£ dá»¥ng.'));
}

async function callLocalGemma(endpoint, apiKey, model, systemPrompt) {
  const url = endpoint || 'http://127.0.0.1:11434/v1/chat/completions';
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: model || 'gemma2:latest',
      messages: [{ role: 'user', content: systemPrompt }],
      response_format: { type: "json_object" },
      temperature: 0.1
    }),
    signal: AbortSignal.timeout(15000)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(_repairAIText(data.error?.message || 'Lá»—i tá»« Local API'));
  if (!data.choices || !data.choices.length) throw new Error(_repairAIText('Local AI khÃ´ng tráº£ vá» káº¿t quáº£.'));

  return data.choices[0].message.content;
}

async function callDeepSeek(apiKey, systemPrompt, options = {}) {
  const endpoint = options.endpoint || 'https://api.deepseek.com/v1/chat/completions';
  const forceJson = options.forceJson !== false;
  let lastError = null;
  const models = [options.model, ...DEEPSEEK_MODELS].filter(Boolean);

  for (const model of models) {
    try {
      const payload = {
        model,
        messages: [{ role: 'user', content: systemPrompt }],
        temperature: 0.2,
        max_tokens: forceJson ? 700 : 900,
      };
      if (forceJson) payload.response_format = { type: 'json_object' };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(12000),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'DeepSeek API error');
      const content = data?.choices?.[0]?.message?.content;
      if (!content) throw new Error('DeepSeek không trả về nội dung.');
      return content;
    } catch (e) {
      if (e.name === 'AbortError' || e.name === 'TimeoutError') throw e;
      lastError = e;
    }
  }
  throw lastError || new Error('DeepSeek không khả dụng.');
}

function _normalizeQueryKey(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFC')
    .replace(/[àáạảãăắặẳẵâấầẩẫậ]/g, 'a')
    .replace(/[èéẹẻẽêếềểễệ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôốồổỗộơớờởỡợ]/g, 'o')
    .replace(/[ùúụủũưứừựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/[đ]/g, 'd')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function _getDateRangeFromPeriodInfo(periodInfo) {
  const pi = periodInfo || { period: 'today' };
  const now = new Date();
  const fmt = (d) => d.toISOString().split('T')[0];

  if (pi.dateStr) return { fromDate: pi.dateStr, toDate: pi.dateStr };
  if (pi.fromDate && pi.toDate) return { fromDate: pi.fromDate, toDate: pi.toDate };
  if (pi.period === 'day' && pi.dateStr) return { fromDate: pi.dateStr, toDate: pi.dateStr };
  if (pi.period === 'today') {
    const d = fmt(now);
    return { fromDate: d, toDate: d };
  }
  if (pi.period === 'week') {
    const to = fmt(now);
    const fromD = new Date(now);
    fromD.setDate(fromD.getDate() - 6);
    return { fromDate: fmt(fromD), toDate: to };
  }
  if (pi.period === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { fromDate: fmt(from), toDate: fmt(to) };
  }
  const d = fmt(now);
  return { fromDate: d, toDate: d };
}

function _collectItemSalesInRange(fromDate, toDate) {
  const history = Store.getHistory() || [];
  const map = {};
  const from = new Date(fromDate); from.setHours(0, 0, 0, 0);
  const to = new Date(toDate); to.setHours(23, 59, 59, 999);

  history.forEach(h => {
    const paidAt = h?.paidAt ? new Date(h.paidAt) : null;
    if (!paidAt || paidAt < from || paidAt > to) return;
    (h.items || []).forEach(it => {
      const name = it?.name || it?.id || 'Không rõ';
      const qty = Number(it?.qty || 0);
      if (!qty) return;
      map[name] = (map[name] || 0) + qty;
    });
  });
  return map;
}

function _pickMentionedItem(text, menu) {
  try {
    const exact = extractMenuItems(text, menu || []);
    if (Array.isArray(exact) && exact.length) return exact[0].name;
  } catch (_) {}

  const q = _normalizeQueryKey(text);
  const aliases = [
    ['ken lon', ['ken lon', 'heineken', 'ken']],
    ['bia sai gon', ['sai gon', 'bia sai gon', 'saigon']],
    ['bia tiger', ['tiger', 'bia tiger']],
  ];
  for (const [label, kws] of aliases) {
    if (kws.some(k => q.includes(k))) return label;
  }
  return null;
}

function _isOpenAnalyticsQuestion(text) {
  const t = _normalizeQueryKey(text);
  if (!t) return false;

  // Không can thiệp các lệnh thao tác đơn hàng
  if (/(dat|goi|them|bot|xoa|huy|thanh toan|tinh tien|mo ban|xem ban|nhap hang)\b/.test(t)) return false;

  return /(hom qua|hom nay|so voi|so sanh|ban duoc|doanh thu|mon nao|ban nhieu nhat|top|bao nhieu|nhieu nhat)/.test(t);
}

async function tryAnswerOpenAnalyticsQuestion(text, settings, menu) {
  if (!_isOpenAnalyticsQuestion(text)) return null;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const y = new Date(now); y.setDate(y.getDate() - 1);
  const yStr = y.toISOString().split('T')[0];

  const pi = parseViDateFromText(text) || { period: 'today', label: 'hôm nay' };
  const range = _getDateRangeFromPeriodInfo(pi);
  const salesMap = _collectItemSalesInRange(range.fromDate, range.toDate);
  const topItems = Object.entries(salesMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, qty]) => ({ name, qty }));

  const mention = _pickMentionedItem(text, menu || []);
  const mentionQty = mention
    ? Object.entries(salesMap).filter(([n]) => _normalizeQueryKey(n).includes(_normalizeQueryKey(mention))).reduce((s, [, q]) => s + q, 0)
    : 0;

  const today = getRevenueSummary('day', { date: todayStr });
  const yesterday = getRevenueSummary('day', { date: yStr });
  const target = (pi.period === 'today' || (pi.period === 'day' && pi.dateStr === todayStr))
    ? today
    : (pi.period === 'day' && pi.dateStr === yStr)
      ? yesterday
      : getRevenueSummary(pi.period, pi.dateStr ? { date: pi.dateStr } : (pi.fromDate ? { fromDate: pi.fromDate, toDate: pi.toDate } : {}));

  const question = String(text || '');
  const context = {
    question,
    today: { date: todayStr, revenue: today.revenue, orders: today.orders, profit: today.profit },
    yesterday: { date: yStr, revenue: yesterday.revenue, orders: yesterday.orders, profit: yesterday.profit },
    targetPeriod: { label: pi.label || 'kỳ được hỏi', fromDate: range.fromDate, toDate: range.toDate, revenue: target.revenue, orders: target.orders, profit: target.profit },
    mentionItem: mention ? { key: mention, soldQty: mentionQty } : null,
    topItems,
  };

  const prompt = `Bạn là trợ lý phân tích dữ liệu POS. Trả lời tiếng Việt ngắn gọn, chính xác theo số liệu sau.
Nếu người dùng hỏi so sánh thì nêu chênh lệch tuyệt đối và % khi có thể.
Nếu hỏi món bán nhiều nhất thì trả đúng top 1 theo số lượng.
Nếu hỏi một sản phẩm cụ thể (ví dụ lon ken) thì trả đúng số lượng đã bán trong kỳ được hỏi.
Không bịa dữ liệu ngoài context.

Context JSON:
${JSON.stringify(context)}

Chỉ trả về câu trả lời tự nhiên (không markdown JSON).`;

  const canOnline = !settings.forceOffline && navigator.onLine;
  try {
    if (canOnline && settings.deepseekApiKey) {
      return _repairAIText(await callDeepSeek(settings.deepseekApiKey, prompt, {
        endpoint: settings.deepseekEndpoint,
        model: settings.deepseekModel,
        forceJson: false,
      })).trim();
    }
  } catch (_) {}

  // Fallback local khi không có API
  const q = _normalizeQueryKey(question);
  if (q.includes('so voi') || q.includes('so sanh') || (q.includes('hom qua') && q.includes('hom nay'))) {
    const diff = today.revenue - yesterday.revenue;
    const pct = yesterday.revenue > 0 ? ((diff / yesterday.revenue) * 100) : 0;
    const trend = diff >= 0 ? 'tăng' : 'giảm';
    return `So với hôm qua, hôm nay ${trend} ${fmtDong(Math.abs(diff))} doanh thu (${Math.abs(pct).toFixed(1)}%). Hôm nay: ${fmtDong(today.revenue)} (${today.orders} đơn), hôm qua: ${fmtDong(yesterday.revenue)} (${yesterday.orders} đơn).`;
  }
  if (q.includes('nhieu nhat') || q.includes('ban chay')) {
    const top = topItems[0];
    if (!top) return `Kỳ ${pi.label || 'được hỏi'} chưa có dữ liệu bán hàng.`;
    return `Món bán nhiều nhất ${pi.label || 'kỳ này'} là ${top.name} với ${top.qty} phần/lon/chai đã bán.`;
  }
  if ((q.includes('bao nhieu') || q.includes('ban duoc')) && mention) {
    return `${pi.label || 'Kỳ được hỏi'}, ${mention} bán được ${mentionQty} đơn vị.`;
  }
  return null;
}

// --- Main processor: Hybrid Failover ---
// Context memory for short-term session
const aiSessionContext = {
  lastTableId: null,
  lastIntent: null
};

async function processAICommand(text) {
  const s = Store.getSettings();
  const menu       = Store.getMenu();
  const tablesInfo = Store.getTables().map(t => ({ id: t.id, name: t.name, status: t.status }));

  const canUseDeepSeek = !s.forceOffline && navigator.onLine && s.deepseekApiKey;

  // Câu hỏi mở phân tích số liệu: ưu tiên DeepSeek nếu online.
  const openAnswer = await tryAnswerOpenAnalyticsQuestion(text, s, menu);
  if (openAnswer) {
    return { reply: _repairAIText(openAnswer), intent: 'report' };
  }

  let parsed;
  let modeColor = '';

  if (canUseDeepSeek) {
    try {
      const menuForAI = menu.map(m => ({ id: m.id, name: m.name, price: m.price }));
      const prompt = buildGeminiPrompt(text, tablesInfo, menuForAI);
      let raw = await callDeepSeek(s.deepseekApiKey, prompt, {
        endpoint: s.deepseekEndpoint,
        model: s.deepseekModel,
        forceJson: true,
      });
      raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      try { parsed = JSON.parse(raw); }
      catch(_) { return _repairAIText(raw); }
      modeColor = 'var(--success)';
    } catch(e) {
      console.warn('DeepSeek failed, switching to Local NLP:', e.message);
      const offlineResult = localNLPEngine(text, menu, tablesInfo);
      if (offlineResult) {
        parsed = offlineResult;
        modeColor = 'var(--warning)';
      } else {
        return `⚠️ Mất kết nối mạng và không nhận ra lệnh. Thử nói rõ hơn: "bàn 1 đặt 2 bia"`;
      }
    }
  } else {
    if (!s.deepseekApiKey) {
      parsed = localNLPEngine(text, menu, tablesInfo);
      if (!parsed) {
        return '⚠️ Chưa có API Key cho DeepSeek. Hệ thống đang dùng NLP Offline. Hãy nói rõ câu lệnh kiểu: "bàn 1 đặt 2 bia sài gòn"';
      }
      modeColor = 'var(--warning)';
    } else {
      parsed = localNLPEngine(text, menu, tablesInfo);
      if (!parsed) {
        return '📵 Đang mất mạng và không nhận ra lệnh. Thử: "bàn 1 đặt 3 bia"';
      }
      modeColor = 'var(--warning)';
    }
  }

  let finalReply = executeAIActions(parsed, menu, text);
  if (typeof finalReply === 'string' && modeColor) {
    finalReply = `<span style="color:${modeColor}">${finalReply}</span>`;
  }
  
  const intent = parsed && Array.isArray(parsed.actions) && parsed.actions.length > 0 
    ? parsed.actions[0].type 
    : 'unknown';

  return { reply: _repairAIText(finalReply), intent: intent };
}

function buildGemmaPrompt(text, tablesInfo, menu) {
  // Add current orders context just to make Gemma smarter
  const currentOrders = {};
  const orders = Store.getOrders();
  Object.keys(orders).forEach(tid => {
    if(orders[tid] && orders[tid].length > 0) {
      currentOrders[tid] = orders[tid].map(i => `${i.qty}x ${i.name}`);
    }
  });

  return `Báº¡n lÃ  trá»£ lÃ½ AI ná»™i bá»™ cho há»‡ thá»‘ng POS nhÃ  hÃ ng/quÃ¡n Äƒn.

NguyÃªn táº¯c báº¯t buá»™c:
1. Báº¡n KHÃ”NG Ä‘Æ°á»£c tá»± Ã½ thay Ä‘á»•i dá»¯ liá»‡u.
2. Báº¡n chá»‰ Ä‘Æ°á»£c tráº£ vá» JSON há»£p lá»‡ theo schema.
3. Náº¿u khÃ´ng cháº¯c cháº¯n vá» tÃªn mÃ³n, sá»‘ lÆ°á»£ng, bÃ n, hoáº·c Ã½ Ä‘á»‹nh ngÆ°á»i dÃ¹ng, pháº£i Ä‘áº·t needs_confirmation=true.
4. KhÃ´ng tá»± suy Ä‘oÃ¡n SKU náº¿u chÆ°a Ä‘á»§ cháº¯c cháº¯n.
5. Æ¯u tiÃªn an toÃ n dá»¯ liá»‡u hÆ¡n sá»± tiá»‡n lá»£i.
6. Chá»‰ sá»­ dá»¥ng thÃ´ng tin náº±m trong ngá»¯ cáº£nh mÃ  app cung cáº¥p.
7. Náº¿u ngÆ°á»i dÃ¹ng há»i bÃ¡o cÃ¡o, chá»‰ tÃ³m táº¯t tá»« sá»‘ liá»‡u Ä‘Æ°á»£c truyá»n vÃ o.
8. Náº¿u cÃ¢u há»i ngoÃ i pháº¡m vi POS, tráº£ lá»i ngáº¯n ráº±ng yÃªu cáº§u khÃ´ng thuá»™c nghiá»‡p vá»¥ POS.

Quy táº¯c Ã¡nh xáº¡ (Action Mapping):
- "thÃªm", "cho thÃªm", "order thÃªm", "Ä‘áº·t", "gá»i" => order
- "bá»›t", "giáº£m", "huá»· 1 mÃ³n", "xÃ³a" => remove 
- "ghi chÃº", "nháº¯c báº¿p", "Ã­t cay", "khÃ´ng Ä‘Ã¡" => note
- "tÃ­nh tiá»n", "thanh toÃ¡n", "bill" => pay
- "bÃ¡o cÃ¡o", "hÃ´m nay bÃ¡n Ä‘Æ°á»£c" => insight

Äáº§u ra báº¯t buá»™c lÃ  JSON Object KHÃ”NG kÃ¨m giáº£i thÃ­ch:
{
  "type": "order|remove|pay|insight|unknown",
  "tableId": "ID bÃ n (VÃ­ dá»¥: 1, 2, 3... Hoáº·c 'null' náº¿u khÃ´ng Ä‘á» cáº­p)",
  "items": [{"name": "TÃªn mÃ³n", "qty": 1}],
  "needs_confirmation": false
}

Dá»¯ liá»‡u ngá»¯ cáº£nh:
- Danh sÃ¡ch bÃ n: ${JSON.stringify(tablesInfo)}
- ÄÆ¡n hÃ ng Ä‘ang má»Ÿ: ${JSON.stringify(currentOrders)}
- Thá»±c Ä‘Æ¡n: ${JSON.stringify(menu)}

CÃ¢u lá»‡nh ngÆ°á»i dÃ¹ng: "${text}"`;
}

function buildGeminiPrompt(text, tablesInfo, menu) {
  const inventoryInfo = Store.getInventory().map(i => ({ id: i.id, name: i.name, qty: i.qty, unit: i.unit }));
  
  // Add current orders context
  const currentOrders = {};
  const orders = Store.getOrders();
  Object.keys(orders).forEach(tid => {
    if(orders[tid] && orders[tid].length > 0) {
      currentOrders[tid] = orders[tid].map(i => `${i.qty}x ${i.name}`);
    }
  });

  // Add today's summary
  const todayRev = getRevenueSummary('today');
  
  return `Báº¡n lÃ  "GÃ¡nh KhÃ´" â€“ trá»£ lÃ½ AI thu ngÃ¢n quÃ¡n nháº­u Viá»‡t Nam.
Nhiá»‡m vá»¥: PhÃ¢n tÃ­ch cÃ¢u lá»‡nh tiáº¿ng Viá»‡t vÃ  tráº£ vá» JSON.

Danh sÃ¡ch bÃ n: ${JSON.stringify(tablesInfo)}
ÄÆ¡n hÃ ng Ä‘ang má»Ÿ: ${JSON.stringify(currentOrders)}
Danh sÃ¡ch thá»±c Ä‘Æ¡n: ${JSON.stringify(menu)}
Kho hÃ ng hÃ³a: ${JSON.stringify(inventoryInfo)}
Doanh thu hÃ´m nay: ${todayRev.orders} Ä‘Æ¡n, ${todayRev.revenue}Ä‘ doanh thu, ${todayRev.expenseTotal}Ä‘ chi phÃ­, lÃ£i gá»™p ${todayRev.gross}Ä‘

ACTION há»— trá»£:
1. "order"  â€“ Gá»i/thÃªm mÃ³n: { type:"order",  tableId:"1", items:[{id:"<id>", qty:2}] }
2. "remove" â€“ Bá»›t/xoÃ¡ mÃ³n:  { type:"remove", tableId:"1", itemId:"<id>", qty:1 }
3. "pay"    â€“ Má»Ÿ bill tÃ­nh tiá»n: { type:"pay", tableId:"1" }
4. "view"   â€“ Má»Ÿ/xem tráº¡ng thÃ¡i bÃ n: { type:"view", tableId:"1" }
5. "report" â€“ BÃ¡o cÃ¡o doanh thu: { type:"report", date:"YYYY-MM-DD" } (náº¿u ngÆ°á»i dÃ¹ng há»i ngÃ y khÃ¡c. VD: "bÃ¡o cÃ¡o hÃ´m qua" tráº£ vá» date cá»§a hÃ´m qua. HÃ´m nay lÃ : ${new Date().toISOString().split('T')[0]})
6. "restock"â€“ Nháº­p thÃªm hÃ ng vÃ o kho: { type:"restock", items:[{name:"<tÃªn>", qty:5}] }
7. "unknown" - Khi khÃ´ng rÃµ hoáº·c mÃ³n khÃ´ng cÃ³: { type:"unknown", tableId:"1" }

Quy táº¯c:
- Khá»›p tÃªn mÃ³n/nguyÃªn liá»‡u Gáº¦N ÄÃšNG (sÃ i gÃ²n â‰ˆ Bia SÃ i GÃ²n, tiger â‰ˆ Bia Tiger, má»±c â‰ˆ Má»±c khÃ´ nÆ°á»›ng).
- Náº¿u ngÆ°á»i dÃ¹ng gá»i mÃ³n KHÃ”NG CÃ“ trong thá»±c Ä‘Æ¡n, dÃ¹ng "unknown".
- "report" cho cÃ¢u há»i: doanh thu, bÃ¡n Ä‘Æ°á»£c bao nhiÃªu, bÃ¡o cÃ¡o, tá»•ng káº¿t, tá»“n kho tháº¿ nÃ o, v.v.
- "restock" cho: nháº­p thÃªm Ä‘á»“, mua thÃªm hÃ ng vÃ o kho.
- reply: ngáº¯n gá»n, thÃ¢n thiá»‡n, xÆ°ng "em". Náº¿u report, tÃ³m táº¯t: doanh thu, lÃ£i, chi phÃ­, Ä‘Æ¡n, tá»“n kho cáº§n nháº­p.

CÃ¢u lá»‡nh: "${text}"

CHá»ˆ tráº£ vá» JSON: { "actions": [...], "reply": "..." }`;
}

// ============================================================
// LOCAL NLP ENGINE (Offline Fallback)
// Pattern matching for Vietnamese POS commands
// ============================================================
function localNLPEngine(text, menu, tables) {
  const t = text.toLowerCase()
    .replace(/[.,!?]/g, '')
    .normalize('NFC');

  // --- Extract table number ---
  // Handles: bàn 5, bàn số 5, ban 5, bà 5
  let tableId = null;
  const tableMatch = t.match(/(?:b[àaằảãạăắặẳẵâấầẩẫậ]n?g?\s*(?:s[ốo]\s*)?(\d+))|(?:kh[aá]ch\s*)?(mang v[ềe]|takeaway)/i);
  if (tableMatch) {
    if (tableMatch[1]) {
      tableId = tableMatch[1];
    } else if (tableMatch[2]) {
      tableId = 'takeaway';
    }
  }

  // Use session context if no tableId in current utterance
  if (!tableId && aiSessionContext.lastTableId) {
    tableId = aiSessionContext.lastTableId;
  }

  // --- Detect intent ---
  const isOrder  = /đặt|gọi|th[êe]m|lên|cho|order/i.test(t);
  const isRemove = /b[ớo]t|x[oó]a|hủy|cancel|bỏ/i.test(t);
  const isPay    = /t[íi]nh ti[ềe]n|thanh to[aá]n|check|bill|xu[ấa]t bill/i.test(t);
  const isView   = /m[ởo] b[àa]n|xem b[àa]n|qu[ảa]n l[ýy] b[àa]n|v[àa]o b[àa]n/i.test(t);
  const isQuery  = /c[òo]n m[óo]n|th[ựu]c đ[ơo]n|menu|b[àa]n n[àa]o|doanh thu|b[áa]o c[áa]o|t[ổo]ng k[ếe]t|b[áa]n đ[ưượ]c|tồn kho|nhập hàng gần đây/i.test(t);
  const isRestock = /nh[ậa]p (?:h[àa]ng|th[êe]m)|nh[ậa]p|m[ụu]c nh[ậa]p/i.test(t);

  // --- View / Manage Table ---
  if (isView && tableId) {
    aiSessionContext.lastTableId = tableId;
    aiSessionContext.lastIntent = 'view';
    return {
      actions: [{ type: 'view', tableId }],
      reply: `Dạ em mở bàn ${tableId} rồi ạ!`
    };
  }

  // --- Pay ---
  if (isPay) {
    if (tableId) {
      aiSessionContext.lastTableId = tableId;
      aiSessionContext.lastIntent = 'pay';
      return {
        actions: [{ type: 'pay', tableId }],
        reply: `Dạ em mở bill bàn ${tableId} cho anh chị ạ!`
      };
    } else {
      return {
        actions: [],
        reply: `Dạ anh chị muốn tính tiền bàn nào ạ? Ví dụ: "Tính tiền bàn 5"`
      };
    }
  }

  // --- Query / BÃ¡o cÃ¡o ---
  // Nháº­n diá»‡n bÃ¡o cÃ¡o doanh thu: "bÃ¡o cÃ¡o doanh thu ngÃ y...", "hÃ´m ... bÃ¡n Ä‘Æ°á»£c", "ngÃ y ... bÃ¡n tháº¿ nÃ o", "thÃ¡ng ... bÃ¡n tháº¿ nÃ o/bao nhiÃªu"
  const isRevReport = /b[aÃ¡]o c[aÃ¡]o doanh thu|doanh thu ng[aÃ ]y|doanh thu tuáº§n|doanh thu thÃ¡ng|doanh thu nÄƒm|b[aÃ¡]n Ä‘[uÆ°á»£c]c bao nhi[eÃª]u|b[aÃ¡]n th[eáº¿] n[aÃ ]o|b[aÃ¡]n Ä‘[uÆ°á»£c] kh[oÃ´]ng|hÃ´m.*b[aÃ¡]n|ng[aÃ ]y.*b[aÃ¡]n|tuáº§n.*b[aÃ¡]n|thÃ¡ng.*b[aÃ¡]n/i.test(t);
  const isPurchaseReport = /b[aÃ¡]o c[aÃ¡]o nh[aáº­]p h[aÃ ]ng|nh[aáº­]p h[aÃ ]ng ng[aÃ ]y|nh[aáº­]p h[aÃ ]ng tuáº§n|nh[aáº­]p h[aÃ ]ng thÃ¡ng/i.test(t);
  const isExpenseReport  = /b[aÃ¡]o c[aÃ¡]o chi ph[Ã­i]|chi ph[Ã­i] ng[aÃ ]y|chi ph[Ã­i] tuáº§n|chi ph[Ã­i] thÃ¡ng/i.test(t);
  const isFinanceReport  = /b[aÃ¡]o c[aÃ¡]o t[aÃ ]i ch[Ã­i]nh|t[aÃ ]i ch[Ã­i]nh ng[aÃ ]y|t[aÃ ]i ch[Ã­i]nh tuáº§n|t[aÃ ]i ch[Ã­i]nh thÃ¡ng|t[aÃ ]i ch[Ã­i]nh nÄƒm/i.test(t);

  if (isRevReport || isPurchaseReport || isExpenseReport || isFinanceReport) {
    const pi = parseViDateFromText(t);
    const type = isFinanceReport ? 'finance' : isPurchaseReport ? 'purchase' : isExpenseReport ? 'expense' : 'revenue';
    return buildDetailedReportReply(type, pi || { period: 'today', label: 'hÃ´m nay' });
  }

  if (isQuery) {
    if (/b[aÃ ]n n[aÃ ]o.*tr[oá»‘]ng|tr[oá»‘]ng.*b[aÃ ]n/i.test(t)) {
      const emptyTables = tables.filter(tb => tb.status === 'empty').map(tb => tb.name || `BÃ n ${tb.id}`);
      return {
        actions: [],
        reply: emptyTables.length
          ? `Hiá»‡n Ä‘ang trá»‘ng: ${emptyTables.join(', ')} áº¡!`
          : 'Hiá»‡n táº¡i táº¥t cáº£ cÃ¡c bÃ n Ä‘á»u Ä‘ang cÃ³ khÃ¡ch áº¡!'
      };
    }
    if (/menu|th[uÃº]c Ä‘[oÆ¡]n|c[oÃ²]n m[oÃ³]n/i.test(t)) {
      const names = menu.slice(0, 8).map(m => m.name).join(', ');
      return {
        actions: [],
        reply: `Thá»±c Ä‘Æ¡n cÃ³: ${names}... vÃ  nhiá»u mÃ³n khÃ¡c áº¡!`
      };
    }
    if (/doanh thu|b[aÃ ]o c[aÃ¡]o|t[oá»•]ng k[eáº¿]t|b[aÃ¡]n Ä‘[uÆ°á»£]c|tá»“n kho/i.test(t)) {
      return buildReportReply();
    }
    return null;
  }

  // --- Restock ---
  if (isRestock) {
    const matchedInv = extractMenuItems(t, Store.getInventory());
    if (matchedInv.length > 0) {
      return {
        actions: [{ type: 'restock', items: matchedInv.map(it => ({ name: it.name, qty: it.qty })) }],
        reply: `Dáº¡ em Ä‘Ã£ nháº­p thÃªm ${matchedInv.map(it => it.qty + ' ' + it.name).join(', ')} vÃ o kho rá»“i áº¡!`
      };
    }
    return null;
  }

  // --- Remove items: handle even without tableId feedback ---
  if (isRemove) {
    if (!tableId) {
      return {
        actions: [],
        reply: `Dáº¡ anh chá»‹ muá»‘n bá»›t mÃ³n á»Ÿ bÃ n nÃ o áº¡? VÃ­ dá»¥: "Bá»›t 1 bia bÃ n 2"`
      };
    }
    const matchedItems = extractMenuItems(t, menu);
    if (matchedItems.length > 0) {
      // Save to context
      aiSessionContext.lastTableId = tableId;
      aiSessionContext.lastIntent = 'remove';

      const actions = matchedItems.map(it => ({ type: 'remove', tableId, itemId: it.id, qty: it.qty }));
      const names = matchedItems.map(it => `${it.qty} ${it.name}`).join(', ');
      return {
        actions,
        reply: `Dáº¡ em Ä‘Ã£ bá»›t ${names} á»Ÿ bÃ n ${tableId} áº¡!`
      };
    }
    return {
      actions: [{ type: 'view', tableId }],
      reply: `Dáº¡ em chÆ°a xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c mÃ³n cáº§n bá»›t, má»Ÿ bÃ n ${tableId} Ä‘á»ƒ anh chá»‹ chá»‰nh thá»§ cÃ´ng áº¡!`
    };
  }

  // --- Order: need tableId ---
  if (!tableId) return null;
  
  const matchedItems = extractMenuItems(t, menu);
  
  if (isOrder) {
    if (matchedItems.length === 0) {
      return {
        actions: [{ type: 'unknown', tableId }],
        reply: `Dáº¡ em chÆ°a nghe rÃµ tÃªn mÃ³n, má»i anh chá»‹ chá»n mÃ³n thá»§ cÃ´ng cho bÃ n ${tableId} áº¡!`
      };
    }
    
    // Save to context
    aiSessionContext.lastTableId = tableId;
    aiSessionContext.lastIntent = 'order';

    const actions = [{ type: 'order', tableId, items: matchedItems.map(it => ({ id: it.id, qty: it.qty })) }];
    const names   = matchedItems.map(it => `${it.qty} ${it.name}`).join(', ');
    return {
      actions,
      reply: `Dáº¡ em Ä‘Ã£ lÃªn ${names} cho bÃ n ${tableId} rá»“i áº¡! Náº¿u thiáº¿u mÃ³n nÃ o anh chá»‹ chá»n thÃªm trong menu nhÃ©.`
    };
  }

  // If we have tableId but no clear intent, try matching items as an order
  if (matchedItems.length > 0) {
    const actions = [{ type: 'order', tableId, items: matchedItems.map(it => ({ id: it.id, qty: it.qty })) }];
    const names = matchedItems.map(it => `${it.qty} ${it.name}`).join(', ');
    return {
      actions,
      reply: `Dạ em lên ${names} cho bàn ${tableId} ạ!`
    };
  }

  return null;
}

// Äá»‹nh dáº¡ng sá»‘ tiá»n Ä‘áº§y Ä‘á»§, dÃ¹ng "Ä‘á»“ng" thay "Ä‘" cho chatbot
function fmtDong(n) {
  return n.toLocaleString('vi-VN') + ' Ä‘á»“ng';
}

// PhÃ¢n tÃ­ch ngÃ y thÃ¡ng tiáº¿ng Viá»‡t tá»« vÄƒn báº£n
// Tráº£ vá» { period, dateStr, label } hoáº·c null
function parseViDateFromText(text) {
  const t = text.toLowerCase().normalize('NFC');
  const now = new Date();

  // "hÃ´m nay" / "hÃ´m nay"
  if (/hÃ´m nay|hom nay/i.test(t)) {
    return { period: 'today', dateStr: now.toISOString().split('T')[0], label: 'hÃ´m nay' };
  }
  // "hÃ´m qua"
  if (/hÃ´m qua|hom qua/i.test(t)) {
    const d = new Date(now); d.setDate(d.getDate()-1);
    return { period: 'day', dateStr: d.toISOString().split('T')[0], label: 'hÃ´m qua' };
  }
  // "tuáº§n nÃ y" / "tuáº§n nay"
  if (/tuáº§n nÃ y|tuan nay|tuan nay|tuáº§n nay/i.test(t)) {
    return { period: 'week', label: 'tuáº§n nÃ y' };
  }
  // "tuáº§n trÆ°á»›c"
  if (/tuáº§n trÆ°á»›c|tuan truoc/i.test(t)) {
    const from = new Date(now); from.setDate(from.getDate()-14);
    const to   = new Date(now); to.setDate(to.getDate()-7);
    return { period: 'range', fromDate: from.toISOString().split('T')[0], toDate: to.toISOString().split('T')[0], label: 'tuáº§n trÆ°á»›c' };
  }
  // "thÃ¡ng nÃ y"
  if (/thÃ¡ng nÃ y|thang nay|thÃ¡ng nay/i.test(t)) {
    return { period: 'month', label: 'thÃ¡ng nÃ y' };
  }
  // "thÃ¡ng trÆ°á»›c"
  if (/thÃ¡ng trÆ°á»›c|thang truoc/i.test(t)) {
    const d = new Date(now.getFullYear(), now.getMonth()-1, 1);
    const from = d.toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    const to = lastDay.toISOString().split('T')[0];
    return { period: 'range', fromDate: from, toDate: to, label: 'thÃ¡ng trÆ°á»›c' };
  }
  // "nÄƒm nay"
  if (/nÄƒm nay|nam nay/i.test(t)) {
    const from = `${now.getFullYear()}-01-01`;
    const to   = `${now.getFullYear()}-12-31`;
    return { period: 'range', fromDate: from, toDate: to, label: `nÄƒm ${now.getFullYear()}` };
  }

  // NgÃ y cá»¥ thá»ƒ: "ngÃ y 7/4", "7 thÃ¡ng 4", "ngÃ y 7 thÃ¡ng 4"
  const dayMonthMatch = t.match(/ng[Ã a]y\s*(\d{1,2})[\/-](\d{1,2})/) ||
                        t.match(/(\d{1,2})\s*\/\s*(\d{1,2})/) ||
                        t.match(/(\d{1,2})\s*thÃ¡ng\s*(\d{1,2})/) ||
                        t.match(/(\d{1,2})\s*thang\s*(\d{1,2})/);
  if (dayMonthMatch) {
    const day = parseInt(dayMonthMatch[1]);
    const month = parseInt(dayMonthMatch[2]);
    const year = now.getFullYear();
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const d = new Date(year, month-1, day);
      return { period: 'day', dateStr: d.toISOString().split('T')[0], label: `ngÃ y ${day}/${month}` };
    }
  }

  // ThÃ¡ng cá»¥ thá»ƒ: "thÃ¡ng 3", "thÃ¡ng 12"
  const monthMatch = t.match(/thÃ¡ng\s*(\d{1,2})|thang\s*(\d{1,2})/);
  if (monthMatch) {
    const m = parseInt(monthMatch[1] || monthMatch[2]);
    const year = now.getFullYear();
    const from = new Date(year, m-1, 1).toISOString().split('T')[0];
    const lastDay = new Date(year, m, 0);
    const to = lastDay.toISOString().split('T')[0];
    return { period: 'range', fromDate: from, toDate: to, label: `thÃ¡ng ${m}` };
  }

  // Tuáº§n sá»‘ cá»¥ thá»ƒ: "tuáº§n 2", "tuáº§n 15"
  const weekMatch = t.match(/tuáº§n\s*(\d+)|tuan\s*(\d+)/);
  if (weekMatch) {
    const weekNum = parseInt(weekMatch[1] || weekMatch[2]);
    // Æ¯á»›c tÃ­nh báº¯t Ä‘áº§u tuáº§n theo weekNum trong nÄƒm hiá»‡n táº¡i
    const jan1 = new Date(now.getFullYear(), 0, 1);
    const from = new Date(jan1.getTime() + (weekNum-1)*7*86400000);
    const to   = new Date(from.getTime() + 6*86400000);
    return { period: 'range', fromDate: from.toISOString().split('T')[0], toDate: to.toISOString().split('T')[0], label: `tuáº§n ${weekNum}` };
  }

  return null; // KhÃ´ng phÃ¢n tÃ­ch Ä‘Æ°á»£c
}

// Táº¡o ná»™i dung bÃ¡o cÃ¡o chi tiáº¿t khÃ´ng viáº¿t táº¯t
function buildDetailedReportReply(type, periodInfo) {
  const pi = periodInfo || { period: 'today', label: 'hÃ´m nay' };
  const opts = pi.dateStr ? { date: pi.dateStr } : (pi.fromDate ? { fromDate: pi.fromDate, toDate: pi.toDate } : {});

  if (type === 'revenue' || type === 'finance') {
    const s = getRevenueSummary(pi.period, opts);
    const label = pi.label || 'ká»³ nÃ y';
    let reply = `ðŸ“Š <b>BÃ¡o cÃ¡o doanh thu ${label}:</b><br>`;
    reply += `â€¢ Doanh thu: <b>${fmtDong(s.revenue)}</b><br>`;
    reply += `â€¢ Sá»‘ Ä‘Æ¡n hÃ ng: <b>${s.orders} Ä‘Æ¡n hÃ ng</b><br>`;
    reply += `â€¢ Tiá»n máº·t: ${fmtDong(s.revenueCash)}<br>`;
    reply += `â€¢ Chuyá»ƒn khoáº£n: ${fmtDong(s.revenueBank)}<br>`;
    if (type === 'finance') {
      reply += `â€¢ GiÃ¡ vá»‘n: ${fmtDong(s.cost)}<br>`;
      reply += `â€¢ LÃ£i gá»™p: <b>${fmtDong(s.gross)}</b><br>`;
      reply += `â€¢ Chi phÃ­ hoáº¡t Ä‘á»™ng: ${fmtDong(s.expenseTotal)}<br>`;
      reply += `â€¢ Lá»£i nhuáº­n rÃ²ng: <b style="color:var(--success)">${fmtDong(s.profit)}</b><br>`;
      if (s.discountTotal > 0)
        reply += `â€¢ Tá»•ng giáº£m giÃ¡: ${fmtDong(s.discountTotal)}<br>`;
    }
    return { actions: [{ type: 'report' }], reply };
  }

  if (type === 'purchase') {
    const opts2 = pi.dateStr ? { date: pi.dateStr } : (pi.fromDate ? { fromDate: pi.fromDate, toDate: pi.toDate } : {});
    const purchases = Store.getPurchases();
    const label = pi.label || 'ká»³ nÃ y';
    const now = new Date();
    // Lá»c nháº­p hÃ ng theo ká»³
    const filtered = purchases.filter(p => {
      const d = new Date(p.date);
      if (pi.period === 'today') return d.toDateString() === now.toDateString();
      if (pi.period === 'day' && pi.dateStr) return d.toISOString().split('T')[0] === pi.dateStr;
      if (pi.period === 'week') return (now - d)/86400000 <= 7;
      if (pi.period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (pi.period === 'range' && pi.fromDate && pi.toDate) {
        const from = new Date(pi.fromDate); from.setHours(0,0,0,0);
        const to   = new Date(pi.toDate);   to.setHours(23,59,59,999);
        return d >= from && d <= to;
      }
      return false;
    });
    const total = filtered.reduce((s,p) => s + p.price, 0);
    let reply = `ðŸ“¦ <b>BÃ¡o cÃ¡o nháº­p hÃ ng ${label}:</b><br>`;
    if (filtered.length === 0) {
      reply += `â€¢ KhÃ´ng cÃ³ láº§n nháº­p hÃ ng nÃ o trong ${label}.`;
    } else {
      reply += `â€¢ Sá»‘ láº§n nháº­p hÃ ng: <b>${filtered.length} láº§n</b><br>`;
      reply += `â€¢ Tá»•ng tiá»n nháº­p hÃ ng: <b>${fmtDong(total)}</b><br>`;
      const top3 = filtered.slice(0,3);
      reply += `â€¢ CÃ¡c máº·t hÃ ng nháº­p gáº§n Ä‘Ã¢y: ${top3.map(p => `${p.name} (${p.qty} ${p.unit || 'pháº§n'}, ${fmtDong(p.price)})`).join('; ')}`;
    }
    return { actions: [{ type: 'report' }], reply };
  }

  if (type === 'expense') {
    const expenses = filterExpenses(pi.period, opts);
    const label = pi.label || 'ká»³ nÃ y';
    const total = expenses.reduce((s,e) => s + e.amount, 0);
    let reply = `ðŸ’¸ <b>BÃ¡o cÃ¡o chi phÃ­ ${label}:</b><br>`;
    if (expenses.length === 0) {
      reply += `â€¢ KhÃ´ng cÃ³ chi phÃ­ nÃ o trong ${label}.`;
    } else {
      reply += `â€¢ Tá»•ng chi phÃ­: <b>${fmtDong(total)}</b><br>`;
      reply += `â€¢ Sá»‘ khoáº£n chi: <b>${expenses.length} khoáº£n</b><br>`;
      // NhÃ³m theo danh má»¥c
      const bycat = {};
      expenses.forEach(e => { bycat[e.category] = (bycat[e.category]||0) + e.amount; });
      Object.entries(bycat).forEach(([cat,amt]) => {
        reply += `â€¢ ${cat}: ${fmtDong(amt)}<br>`;
      });
    }
    return { actions: [{ type: 'report' }], reply };
  }

  return buildReportReply();
}

// Build basic report reply (today, no abbreviations)
function buildReportReply() {
  const todayRev = getRevenueSummary('today');
  const weekRev = getRevenueSummary('week');
  const alerts = getInventoryAlerts();
  const needRestock = alerts.critical.length + alerts.low.length;
  
  let reply = `ðŸ“Š <b>BÃ¡o cÃ¡o hÃ´m nay:</b><br>`;
  reply += `â€¢ Doanh thu: <b>${fmtDong(todayRev.revenue)}</b> (${todayRev.orders} Ä‘Æ¡n hÃ ng)<br>`;
  reply += `â€¢ LÃ£i gá»™p: <b>${fmtDong(todayRev.gross)}</b><br>`;
  reply += `â€¢ Chi phÃ­: ${fmtDong(todayRev.expenseTotal)}<br>`;
  reply += `â€¢ Lá»£i nhuáº­n: <b>${fmtDong(todayRev.profit)}</b><br>`;
  reply += `â€¢ Tiá»n máº·t: ${fmtDong(todayRev.revenueCash)} | Chuyá»ƒn khoáº£n: ${fmtDong(todayRev.revenueBank)}<br>`;
  
  if(weekRev.orders > 0) {
    const avgDaily = Math.round(weekRev.revenue / 7);
    reply += `<br>ðŸ“ˆ <b>7 ngÃ y qua:</b> ${fmtDong(weekRev.revenue)} (Trung bÃ¬nh: ${fmtDong(avgDaily)}/ngÃ y)<br>`;
  }
  
  if(needRestock > 0) {
    reply += `<br>âš ï¸ <b>Tá»“n kho:</b> ${alerts.critical.length} máº·t hÃ ng cáº§n nháº­p gáº¥p, ${alerts.low.length} máº·t hÃ ng sáº¯p háº¿t`;
    if(alerts.critical.length > 0) {
      reply += `<br>ðŸš¨ ${alerts.critical.slice(0,3).map(i => i.name).join(', ')}`;
    }
  } else {
    reply += `<br>âœ… Tá»“n kho á»•n Ä‘á»‹nh`;
  }
  
  return {
    actions: [{ type: 'report' }],
    reply
  };
}

// Fuzzy menu matcher: tÃ¬m mÃ³n trong text + sá»‘ lÆ°á»£ng
function extractMenuItems(text, menu) {
  const results = [];

  const norm = s => s.toLowerCase()
    .replace(/[àáạảãăắặẳẵâấầẩẫậ]/g, 'a')
    .replace(/[èéẹẻẽêếềểễệ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôốồổỗộơớờởỡợ]/g, 'o')
    .replace(/[ùúụủũưứừựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/[đ]/g, 'd')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ').trim();

  const normText = norm(text);

  const sortedMenu = [...menu].sort((a, b) => b.name.length - a.name.length);

  let remaining = normText;

  for (const item of sortedMenu) {
    const normName = norm(item.name);
    const keywords = [normName];
    
    let stripped = normName.replace(/^(kho |bia |tra |ruou |combo )/i, '').trim();
    if (stripped !== normName && stripped.length > 2) {
      keywords.push(stripped);
    }
    
    const noSuffix = stripped.replace(/( nuong| chien gion| chien bo toi| chien bo| om bau)$/i, '').trim();
    if (noSuffix !== stripped && noSuffix.length > 2) {
      keywords.push(noSuffix);
    }
    
    if (normName.includes('tiger nau')) keywords.push('tiger nau', 'tiger');
    if (normName.includes('tiger bac')) keywords.push('tiger bac');
    if (normName.includes('sai gon')) keywords.push('sai gon');
    if (normName.includes('ken lon')) keywords.push('ken', 'heineken');

    const finalKeywords = [...new Set(keywords)].sort((a,b) => b.length - a.length);

    let found = false;
    for (const kw of finalKeywords) {
      const idx = remaining.indexOf(kw);
      if (idx === -1) continue;

      const beforeStr = remaining.slice(0, idx);
      const afterStr  = remaining.slice(idx + kw.length);

      const numBefore = beforeStr.match(/(\d+)\s*$/);
      const numAfter  = afterStr.match(/^\s*(\d+)/);
      const wordNum   = /(?:nam muoi|bon muoi|ba muoi|hai muoi chin|hai muoi tam|hai muoi bay|hai muoi sau|hai muoi lam|hai muoi tu|hai muoi ba|hai muoi hai|hai muoi mot|hai muoi|muoi chin|muoi tam|muoi bay|muoi sau|muoi lam|muoi bon|muoi ba|muoi hai|muoi mot|mot|hai|ba|bon|tu|nam|lam|sau|bay|tam|chin|muoi)\s*$/i.exec(beforeStr);

      const wordNumMap = {
        'nam muoi': 50,
        'bon muoi': 40,
        'ba muoi': 30,
        'hai muoi chin': 29,
        'hai muoi tam': 28,
        'hai muoi bay': 27,
        'hai muoi sau': 26,
        'hai muoi lam': 25,
        'hai muoi tu': 24,
        'hai muoi ba': 23,
        'hai muoi hai': 22,
        'hai muoi mot': 21,
        'hai muoi': 20,
        'muoi chin': 19,
        'muoi tam': 18,
        'muoi bay': 17,
        'muoi sau': 16,
        'muoi lam': 15,
        'muoi bon': 14,
        'muoi ba': 13,
        'muoi hai': 12,
        'muoi mot': 11,
        mot:1, hai:2, ba:3, bon:4, tu:4, nam:5, lam:5, sau:6, bay:7, tam:8, chin:9, muoi:10
      };
      let qty = 1;
      if (numBefore) qty = parseInt(numBefore[1]);
      else if (numAfter) qty = parseInt(numAfter[1]);
      else if (wordNum) qty = wordNumMap[norm(wordNum[0].trim())] || 1;

      results.push({ id: item.id, name: item.name, qty: Math.max(1, qty) });
      remaining = remaining.replace(kw, '   ');
      found = true;
      break;
    }
  }

  return results;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    localNLPEngine,
    extractMenuItems,
    processAICommand,
    _normalizeAIActionType,
    _normalizeAIText
  };
}

function _normalizeAIActionType(type) {
  const t = String(type || '').trim().toLowerCase();
  if (t === 'insight') return 'report';
  return t;
}

function _normalizeAIText(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFC')
    .replace(/[àáạảãăắặẳẵâấầẩẫậ]/g, 'a')
    .replace(/[èéẹẻẽêếềểễệ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôốồổỗộơớờởỡợ]/g, 'o')
    .replace(/[ùúụủũưứừựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/[đ]/g, 'd')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
