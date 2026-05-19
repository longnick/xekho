const admin = require('firebase-admin');

const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

function getFirestoreDb(explicitDb) {
  if (explicitDb) return explicitDb;
  if (!admin.apps.length) admin.initializeApp();
  return admin.firestore();
}

function normalizeVi(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Levenshtein distance giữa 2 chuỗi đã chuẩn hoá.
 * Dùng để đo mức độ tương đồng ký tự.
 */
function levenshteinDistance(a, b) {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length;
  const n = b.length;
  // Chỉ giữ 2 hàng để tiết kiệm bộ nhớ
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,      // xóa
        curr[j - 1] + 1,  // thêm
        prev[j - 1] + cost // thay
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * Tính tỉ lệ tương đồng [0, 1] giữa hai tên món (đã normalizeVi).
 * 1.0 = giống nhau hoàn toàn.
 */
function similarityRatio(normA, normB) {
  if (normA === normB) return 1;
  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1;
  const dist = levenshteinDistance(normA, normB);
  return 1 - dist / maxLen;
}

/**
 * Fetch tất cả món hợp lệ (có price/sell_price > 0, không bị ẩn)
 * từ collection Inventory_Items và trả về mảng chuẩn.
 */
async function fetchValidMenuItems(db) {
  const [productSnap, inventorySnap] = await Promise.all([
    db.collection('Product_Catalog').get().catch(() => null),
    db.collection('Inventory_Items').get().catch(() => null),
  ]);

  const products = productSnap?.docs
    ? productSnap.docs.map(doc => ({ docId: doc.id, ...(doc.data() || {}), sourceCollection: 'Product_Catalog' }))
    : [];
  const inventory = inventorySnap?.docs
    ? inventorySnap.docs.map(doc => ({ docId: doc.id, ...(doc.data() || {}), sourceCollection: 'Inventory_Items' }))
    : [];

  return [...products, ...inventory]
    .filter(item => {
      if (item.hidden === true) return false;
      const price = toFiniteNumber(item.sell_price ?? item.price ?? item.gia);
      return price > 0;
    })
    .map(item => ({
      docId: String(item.item_id || item.inv_id || item.docId || '').trim(),
      name: String(item.display_name || item.material_name || item.name || item.item_id || item.inv_id || '').trim(),
      price: toFiniteNumber(item.sell_price ?? item.price ?? item.gia),
      unit: String(item.base_unit || item.unit || '').trim(),
      normName: normalizeVi(item.display_name || item.material_name || item.name || item.item_id || item.inv_id || ''),
    }))
    .filter(item => item.name && item.normName);
}

/**
 * So khớp một tên món (do AI đề xuất) với danh sách chuẩn.
 * Trả về { matched, ratio, menuItem } hoặc null nếu không khớp.
 */
function fuzzyMatchMenuItem(aiName, menuItems) {
  const normAi = normalizeVi(aiName);
  if (!normAi) return null;

  let bestRatio = 0;
  let bestItem = null;

  for (const item of menuItems) {
    // 1. Khớp chính xác chuỗi chuẩn hoá
    if (item.normName === normAi) return { ratio: 1, menuItem: item };

    // 2. Một bên chứa bên kia (substring)
    const subRatio = (item.normName.includes(normAi) || normAi.includes(item.normName))
      ? 0.85  // thưởng bonus nhẹ cho substring
      : 0;

    // 3. Levenshtein ratio
    const levRatio = similarityRatio(normAi, item.normName);

    const ratio = Math.max(subRatio, levRatio);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestItem = item;
    }
  }

  if (!bestItem || bestRatio < 0.3) return null;
  return { ratio: bestRatio, menuItem: bestItem };
}

function findTopMenuCandidates(aiName, menuItems, limit = 5) {
  const normAi = normalizeVi(aiName);
  if (!normAi) return [];

  return (Array.isArray(menuItems) ? menuItems : [])
    .map((item) => {
      const subRatio = (item.normName.includes(normAi) || normAi.includes(item.normName)) ? 0.85 : 0;
      const levRatio = similarityRatio(normAi, item.normName);
      return {
        ma_mon: String(item.docId || '').trim(),
        ten_mon: String(item.name || '').trim(),
        gia: toFiniteNumber(item.price),
        don_vi: String(item.unit || '').trim(),
        ratio: Number(Math.max(subRatio, levRatio).toFixed(2)),
      };
    })
    .filter(item => item.ten_mon && item.ratio >= 0.35)
    .sort((a, b) => b.ratio - a.ratio || a.ten_mon.localeCompare(b.ten_mon, 'vi'))
    .slice(0, Math.max(1, Number(limit) || 5));
}

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function limitNumber(value, fallback = 10, max = 50) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
}

function coerceDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (value?.toDate) {
    const date = value.toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'string' && value.trim()) {
    const raw = value.trim();
    const vi = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (vi) return vnDateStart(Number(vi[3]), Number(vi[2]), Number(vi[1]));
    const isoDay = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoDay) return vnDateStart(Number(isoDay[1]), Number(isoDay[2]), Number(isoDay[3]));
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function coerceDateTime(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (value?.toDate) {
    const date = value.toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value !== 'string' || !value.trim()) return null;

  const raw = value.trim();
  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct;

  const viDateTime = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s+(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?$/);
  if (viDateTime) {
    const day = Number(viDateTime[1]);
    const month = Number(viDateTime[2]);
    const year = Number(viDateTime[3]);
    const hour = Number(viDateTime[4] || 0);
    const minute = Number(viDateTime[5] || 0);
    const second = Number(viDateTime[6] || 0);
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second) - VN_OFFSET_MS);
  }

  const isoDateTime = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?$/);
  if (isoDateTime) {
    const year = Number(isoDateTime[1]);
    const month = Number(isoDateTime[2]);
    const day = Number(isoDateTime[3]);
    const hour = Number(isoDateTime[4] || 0);
    const minute = Number(isoDateTime[5] || 0);
    const second = Number(isoDateTime[6] || 0);
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second) - VN_OFFSET_MS);
  }

  return null;
}

function vnDateStart(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day) - VN_OFFSET_MS);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getVnParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: VN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map(p => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: parts.weekday,
  };
}

function buildDateRange(args = {}) {
  const now = new Date();
  const today = getVnParts(now);
  const todayStart = vnDateStart(today.year, today.month, today.day);
  const scope = String(args.khoang_thoi_gian || args.time_scope || '').trim().toLowerCase();

  if (args.thoi_diem) {
    const from = coerceDateTime(args.thoi_diem);
    if (!from) throw new Error(`Thoi diem khong hop le: ${args.thoi_diem}`);
    return makeRange(from, new Date(from.getTime() + 60 * 1000), `luc ${formatDateTimeLabel(from)}`);
  }

  if (args.tu_thoi_diem || args.den_thoi_diem || scope === 'den_bay_gio') {
    const from = args.tu_thoi_diem
      ? coerceDateTime(args.tu_thoi_diem)
      : (args.tu_ngay ? coerceDate(args.tu_ngay) : todayStart);
    const toExclusive = args.den_thoi_diem
      ? coerceDateTime(args.den_thoi_diem)
      : (args.den_ngay ? addDays(coerceDate(args.den_ngay), 1) : now);
    if (!from) throw new Error(`Tu thoi diem khong hop le: ${args.tu_thoi_diem || args.tu_ngay}`);
    if (!toExclusive) throw new Error(`Den thoi diem khong hop le: ${args.den_thoi_diem || args.den_ngay}`);
    return makeRange(from, toExclusive, `${formatDateTimeLabel(from)} - ${formatDateTimeLabel(toExclusive)}`);
  }

  if (args.ngay) {
    const from = coerceDate(args.ngay);
    if (!from) throw new Error(`Ngay khong hop le: ${args.ngay}`);
    return makeRange(from, addDays(from, 1), `ngay ${formatDateLabel(from)}`);
  }

  if (args.tu_ngay || args.den_ngay) {
    const from = args.tu_ngay ? coerceDate(args.tu_ngay) : todayStart;
    const toDay = args.den_ngay ? coerceDate(args.den_ngay) : from;
    if (!from) throw new Error(`Tu ngay khong hop le: ${args.tu_ngay}`);
    if (!toDay) throw new Error(`Den ngay khong hop le: ${args.den_ngay}`);
    return makeRange(from, addDays(toDay, 1), `${formatDateLabel(from)} - ${formatDateLabel(toDay)}`);
  }

  if (scope === 'hom_qua' || scope === 'yesterday') {
    const from = addDays(todayStart, -1);
    return makeRange(from, todayStart, 'hom qua');
  }

  if (scope === 'tuan_nay' || scope === 'this_week') {
    const dayIndex = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[today.weekday] ?? 0;
    const from = addDays(todayStart, -dayIndex);
    return makeRange(from, addDays(todayStart, 1), 'tuan nay');
  }

  if (scope === 'thang_nay' || scope === 'this_month') {
    const from = vnDateStart(today.year, today.month, 1);
    return makeRange(from, addDays(todayStart, 1), 'thang nay');
  }

  if (scope === 'nam_nay' || scope === 'this_year') {
    const from = vnDateStart(today.year, 1, 1);
    return makeRange(from, addDays(todayStart, 1), 'nam nay');
  }

  return makeRange(todayStart, addDays(todayStart, 1), 'hom nay');
}

function makeRange(from, toExclusive, label) {
  if (!(from < toExclusive)) throw new Error('Khoang ngay khong hop le.');
  return {
    from,
    toExclusive,
    label,
    fromISO: from.toISOString(),
    toExclusiveISO: toExclusive.toISOString(),
  };
}

function formatDateLabel(date) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatDateTimeLabel(date) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function isVisibleHistoryOrder(order) {
  if (!order || typeof order !== 'object') return false;
  const status = String(order.status || '').trim().toLowerCase();
  const completed = status ? (status === 'completed' || status === 'closed') : (!order.cancelledAt && !order.cancelReason);
  if (!completed) return false;
  if (order.hidden === true || order.hiddenFromReports === true || order.hiddenFromHistory === true) return false;
  if (order.deletedAt || order.deletedFromAppAt) return false;
  if (order.archivedAt || order.archivedFromHistoryId) return false;
  if (order.supersededAt || order.supersededByHistoryId) return false;
  return true;
}

function paymentMatches(order, method) {
  const wanted = String(method || 'all').trim().toLowerCase();
  if (!wanted || wanted === 'all') return true;
  return String(order.payMethod || '').trim().toLowerCase() === wanted;
}

function nameMatches(value, keyword) {
  const key = normalizeVi(keyword);
  if (!key) return true;
  const name = normalizeVi(value);
  return name.includes(key) || key.includes(name);
}

function tokenizeNormalizedText(value) {
  return normalizeVi(value)
    .split(/[^a-z0-9]+/i)
    .map(token => token.trim())
    .filter(Boolean);
}

const REPORT_ITEM_GENERIC_TOKENS = new Set(['bia', 'nuoc', 'mon', 'phần', 'phan', 'ly', 'chai', 'lon']);

function itemNameMatchesReportFilter(value, keyword) {
  const key = normalizeVi(keyword);
  if (!key) return true;
  const name = normalizeVi(value);
  if (!name) return false;
  if (name === key) return true;

  const keyTokens = tokenizeNormalizedText(keyword);
  if (!keyTokens.length) return false;

  const significantTokens = keyTokens.filter(token => token.length >= 3 && !REPORT_ITEM_GENERIC_TOKENS.has(token));
  const requiredTokens = significantTokens.length ? significantTokens : keyTokens;
  return requiredTokens.every(token => name.includes(token));
}

function compactHistoryOrder(order) {
  const paidAt = coerceDate(order.paidAt || order.timestamp || order.updatedAt);
  return {
    id: String(order.id || order.historyId || order.docId || ''),
    tableName: String(order.tableName || order.tableId || ''),
    total: toFiniteNumber(order.total),
    cost: toFiniteNumber(order.cost),
    discount: toFiniteNumber(order.discount),
    payMethod: String(order.payMethod || ''),
    paidAt: paidAt ? paidAt.toISOString() : null,
  };
}

function makeId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeActionContext(options = {}) {
  return {
    chatId: String(options.chatId || ''),
    userId: String(options.userId || ''),
    username: String(options.username || ''),
    source: String(options.source || 'telegram'),
  };
}

function compactActionPreview(actionType, payload = {}) {
  if (actionType === 'nhap_hang_thu_cong') {
    const items = Array.isArray(payload.items) ? payload.items : [];
    const total = items.reduce((sum, item) => sum + toFiniteNumber(item.tong_tien ?? item.totalPrice ?? item.price), 0);
    return `Nhập ${items.length} dòng hàng${total > 0 ? `, tổng ${total.toLocaleString('vi-VN')}đ` : ''}`;
  }
  if (actionType === 'sua_menu') {
    return `Sửa menu/kho: ${payload.ten_hang_hien_tai || payload.ma_hang || 'chưa rõ'}`
      + `${payload.ten_moi ? ` -> ${payload.ten_moi}` : ''}`
      + `${payload.gia_moi ? `, giá ${Number(payload.gia_moi).toLocaleString('vi-VN')}đ` : ''}`;
  }
  if (actionType === 'goi_mon_ban') {
    const items = Array.isArray(payload.items) ? payload.items : [];
    const unresolved = Array.isArray(payload.unresolvedItems) ? payload.unresolvedItems.length : 0;
    return `Lên order ${payload.ban ? `bàn ${payload.ban}` : ''}: ${items.length} món`
      + `${unresolved > 0 ? `, ${unresolved} món cần xem lại` : ''}`;
  }
  return actionType;
}

function shouldReturnPendingPayloadOnly(options = {}) {
  return options.noPersist === true
    || options.previewOnly === true
    || String(options.source || '').trim() === 'pos_app';
}

async function createPendingAction(actionType, payload = {}, options = {}) {
  const db = getFirestoreDb(options.db);
  const context = normalizeActionContext(options);
  const safePayload = sanitizeForFirestore(payload);
  const preview = compactActionPreview(actionType, safePayload);

  if (shouldReturnPendingPayloadOnly(options)) {
    return {
      ok: true,
      pending: true,
      previewOnly: true,
      tool: actionType,
      actionType,
      payload: safePayload,
      context,
      preview,
      message: `Cần xác nhận trước khi thực hiện: ${preview}`,
    };
  }

  const ref = await db.collection('telegram_pending_actions').add({
    actionType,
    payload: safePayload,
    context,
    status: 'pending',
    preview,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
  });
  return {
    ok: true,
    pending: true,
    tool: actionType,
    docId: ref.id,
    actionType,
    payload: safePayload,
    preview,
    message: 'Đã tạo hành động cho quản lý xác nhận trên Telegram.',
  };
}

function sanitizeForFirestore(value) {
  if (Array.isArray(value)) return value.map(sanitizeForFirestore).filter(v => v !== undefined);
  if (value && typeof value === 'object') {
    const out = {};
    Object.entries(value).forEach(([key, val]) => {
      const next = sanitizeForFirestore(val);
      if (next !== undefined) out[key] = next;
    });
    return out;
  }
  return value === undefined ? null : value;
}

async function createPendingImportAction(args = {}, options = {}) {
  try {
    const items = (Array.isArray(args.items) ? args.items : [])
      .map(item => ({
        ten_hang: String(item.ten_hang || item.name || item.ten_mon || '').trim(),
        so_luong: toFiniteNumber(item.so_luong ?? item.qty ?? item.quantity),
        don_vi: String(item.don_vi || item.unit || '').trim(),
        don_gia: toFiniteNumber(item.don_gia ?? item.unitPrice ?? item.costPerUnit),
        tong_tien: toFiniteNumber(item.tong_tien ?? item.totalPrice ?? item.price),
        ghi_chu: String(item.ghi_chu || item.note || '').trim(),
      }))
      .filter(item => item.ten_hang && item.so_luong > 0);
    if (!items.length) throw new Error('Khong co dong hang hop le de nhap.');
    return await createPendingAction('nhap_hang_thu_cong', {
      items,
      nha_cung_cap: String(args.nha_cung_cap || args.supplier || '').trim(),
      ngay: String(args.ngay || '').trim(),
      ghi_chu: String(args.ghi_chu || args.note || '').trim(),
    }, options);
  } catch (error) {
    return { ok: false, tool: 'nhap_hang_thu_cong', error: String(error?.message || error) };
  }
}

async function createPendingMenuAction(args = {}, options = {}) {
  try {
    const payload = {
      ma_hang: String(args.ma_hang || args.inv_id || args.id || '').trim(),
      ten_hang_hien_tai: String(args.ten_hang_hien_tai || args.ten_hang || args.name || '').trim(),
      ten_moi: String(args.ten_moi || args.newName || '').trim(),
      gia_moi: args.gia_moi === undefined ? null : toFiniteNumber(args.gia_moi),
      ghi_chu: String(args.ghi_chu || args.note || '').trim(),
    };
    if (!payload.ma_hang && !payload.ten_hang_hien_tai) throw new Error('Can co ma hang hoac ten hang hien tai.');
    if (!payload.ten_moi && !(payload.gia_moi > 0)) throw new Error('Can co ten moi hoac gia moi.');
    return await createPendingAction('sua_menu', payload, options);
  } catch (error) {
    return { ok: false, tool: 'sua_menu', error: String(error?.message || error) };
  }
}

async function createPendingOrderAction(args = {}, options = {}) {
  try {
    // ── Bước 1: Fetch danh sách món chuẩn từ Inventory_Items ──────────────────
    const db = getFirestoreDb(options.db);
    let menuItems = [];
    try {
      menuItems = await fetchValidMenuItems(db);
    } catch (fetchErr) {
      // Nếu fetch thất bại, vẫn tiếp tục nhưng sẽ không validate được
      // (an toàn hơn là chặn hoàn toàn khi DB tạm thời lỗi)
      menuItems = [];
    }

    // ── Bước 2 & 3: Fuzzy match từng món AI đề xuất ───────────────────────────
    const MATCH_THRESHOLD = 0.7;   // < 70% → yêu cầu nhân viên xem lại
    const EXACT_THRESHOLD = 0.95;  // >= 95% → coi là khớp chính xác

    const validItems = [];          // món vào pending action
    const suggestedItems = [];      // đã được tự động sửa tên/giá
    const rejectedItems = [];       // không có trong menu → bị loại
    const unresolvedItems = [];     // món cần nhân viên sửa/xác nhận
    const serviceMode = String(args.serviceMode || args.service_mode || '').trim().toLowerCase();

    const rawItems = (Array.isArray(args.items) ? args.items : [])
      .map((item, index) => ({
        slot: Number(item.slot) > 0 ? Number(item.slot) : (index + 1),
        ma_mon:   String(item.ma_mon || item.id || item.item_id || '').trim(),
        ten_mon:  String(item.ten_mon || item.name || '').trim(),
        so_luong: toFiniteNumber(item.so_luong ?? item.qty ?? item.quantity) || 1,
        gia_ai:   toFiniteNumber(item.gia ?? item.price),  // giá AI tự bịa — KHÔNG DÙNG
        ghi_chu:  String(item.ghi_chu || item.note || '').trim(),
      }))
      .filter(item => item.ten_mon && item.so_luong > 0);

    if (!rawItems.length) throw new Error('Khong co mon hop le de len order.');

    // Nếu không lấy được menu (DB offline), dùng tên AI nhưng không có giá
    const menuUnavailable = menuItems.length === 0;

    for (const item of rawItems) {
      if (menuUnavailable) {
        // Không thể validate — vẫn tạo pending nhưng gia = 0 (sẽ resolve ở executeOrderAction)
        validItems.push({
          slot: item.slot,
          ma_mon:  item.ma_mon,
          ten_mon: item.ten_mon,
          so_luong: item.so_luong,
          gia: 0,
          ghi_chu: item.ghi_chu,
          is_suggested: false,
          validation: 'menu_unavailable',
        });
        continue;
      }

      const candidates = findTopMenuCandidates(item.ten_mon, menuItems, 5);
      const match = fuzzyMatchMenuItem(item.ten_mon, menuItems);

      if (!match || match.ratio < MATCH_THRESHOLD) {
        // < 70% → không cho xác nhận thẳng, buộc nhân viên xem lại
        unresolvedItems.push({
          slot: item.slot,
          ten_mon_ai: item.ten_mon,
          so_luong: item.so_luong,
          ghi_chu: item.ghi_chu,
          ratio: match ? Number(match.ratio.toFixed(2)) : 0,
          issue: 'low_confidence_match',
          candidates,
        });
        rejectedItems.push({
          slot: item.slot,
          ten_mon_ai: item.ten_mon,
          ly_do: 'Khong du tin cay de len don thang. Can nhan vien kiem tra lai.',
          ratio: match ? Number(match.ratio.toFixed(2)) : 0,
          candidates,
        });
        continue;
      }

      const canonical = match.menuItem;
      const isExact = match.ratio >= EXACT_THRESHOLD;

      const finalItem = {
        slot:      item.slot,
        ma_mon:    canonical.docId || item.ma_mon,
        ten_mon:   canonical.name,         // luôn dùng tên chuẩn từ DB
        so_luong:  item.so_luong,
        gia:       canonical.price,        // luôn dùng giá từ DB — KHÔNG dùng giá AI
        don_vi:    canonical.unit,
        ghi_chu:   item.ghi_chu,
        is_suggested: !isExact,
        validation: isExact ? 'exact' : 'fuzzy_corrected',
        ratio: Number(match.ratio.toFixed(2)),
      };

      validItems.push(finalItem);
      if (!isExact) {
        suggestedItems.push({
          ten_mon_ai:       item.ten_mon,
          ten_mon_chinh_ta: canonical.name,
          gia_db:           canonical.price,
          ratio:            Number(match.ratio.toFixed(2)),
        });
      }
    }

    if (!validItems.length && !unresolvedItems.length) {
      return {
        ok: false,
        tool: 'goi_mon_ban',
        error: 'Tat ca cac mon deu khong co trong menu. Khong the tao order.',
        rejected_items: rejectedItems,
        message_for_ai:
          `Khong the len order vi tat ca cac mon deu khong khop voi menu:\n` +
          rejectedItems.map(r => `• "${r.ten_mon_ai}" (ty le khop: ${(r.ratio * 100).toFixed(0)}%)`).join('\n') +
          `\nVui long hoi lai khach xem ho muon mon gi trong menu hien co.`,
      };
    }

    // ── Bước 4: Tạo pending action với dữ liệu đã validate ──────────────────
    const pendingResult = await createPendingAction('goi_mon_ban', {
      ban: String(
        serviceMode === 'takeaway'
          ? 'takeaway'
          : (args.ban || args.tableId || args.table || '')
      ).trim(),
      serviceMode,
      items: validItems,
      unresolvedItems,
      ghi_chu: String(args.ghi_chu || args.note || '').trim(),
    }, options);

    // Gắn thêm thông tin validation để Gemini phản hồi chính xác cho người dùng
    return {
      ...pendingResult,
      validation_summary: {
        total_requested: rawItems.length,
        total_accepted: validItems.length,
        total_unresolved: unresolvedItems.length,
        total_rejected: rejectedItems.length,
        auto_corrected: suggestedItems.length,
        menu_was_available: !menuUnavailable,
      },
      // Để Gemini biết cần thông báo gì cho quản lý
      suggested_items: suggestedItems.length > 0 ? suggestedItems : undefined,
      rejected_items: rejectedItems.length > 0 ? rejectedItems : undefined,
      message_for_ai:
        [
          validItems.length > 0
            ? `Da them ${validItems.length} mon vao pending order.`
            : '',
          suggestedItems.length > 0
            ? `Luu y: ${suggestedItems.length} mon da duoc tu dong sua ten theo menu:\n` +
              suggestedItems.map(s =>
                `  • AI goi "${s.ten_mon_ai}" → da sua thanh "${s.ten_mon_chinh_ta}" (${(s.ratio * 100).toFixed(0)}% khop), gia chinh thuc: ${s.gia_db.toLocaleString('vi-VN')}d`
              ).join('\n')
            : '',
          unresolvedItems.length > 0
            ? `${unresolvedItems.length} mon can nhan vien kiem tra lai:\n` +
              unresolvedItems.map(r => `  • [${r.slot}] "${r.ten_mon_ai}" (${(r.ratio * 100).toFixed(0)}%)`).join('\n')
            : '',
          rejectedItems.length > 0
            ? `${rejectedItems.length} mon bi loai vi khong co trong menu:\n` +
              rejectedItems.map(r => `  • "${r.ten_mon_ai}" (chi khop ${(r.ratio * 100).toFixed(0)}%)`).join('\n')
            : '',
        ].filter(Boolean).join('\n'),
    };
  } catch (error) {
    return { ok: false, tool: 'goi_mon_ban', error: String(error?.message || error) };
  }
}

async function executeReportQuery(args = {}, options = {}) {
  try {
    const db = getFirestoreDb(options.db);
    const range = buildDateRange(args);
    const limit = limitNumber(args.gioi_han, 10, 50);
    const reportType = String(args.loai_bao_cao || 'tong_quan').trim().toLowerCase();
    const itemFilter = String(args.ten_mon || '').trim();

    const [historySnap, inventorySnap] = await Promise.all([
      db.collection('history').get(),
      db.collection('Inventory_Items').get(),
    ]);

    const orders = historySnap.docs
      .map(doc => ({ docId: doc.id, ...(doc.data() || {}) }))
      .filter(order => {
        if (!isVisibleHistoryOrder(order)) return false;
        if (!paymentMatches(order, args.phuong_thuc_thanh_toan)) return false;
        const paidAt = coerceDate(order.paidAt || order.timestamp || order.updatedAt);
        if (!paidAt || paidAt < range.from || paidAt >= range.toExclusive) return false;
        if (!itemFilter) return true;
        return (Array.isArray(order.items) ? order.items : []).some(item => itemNameMatchesReportFilter(item.name || item.id, itemFilter));
      });

    const summary = buildSalesSummary(orders);
    const topItems = buildTopItems(orders, limit);
    const retailStocks = inventorySnap.docs
      .map(doc => ({ id: doc.id, ...(doc.data() || {}) }))
      .filter(item => !item.hidden && normalizeVi(item.inv_type || item.itemType) === 'retail')
      .map(item => ({
        id: String(item.inv_id || item.id || ''),
        name: String(item.material_name || item.name || item.id || ''),
        qty: toFiniteNumber(item.current_stock ?? item.qty),
        unit: String(item.base_unit || item.unit || ''),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
      .slice(0, limit);

    const payload = {
      ok: true,
      tool: 'truy_van_bao_cao',
      loai_bao_cao: reportType,
      range,
      filters: {
        ten_mon: itemFilter || null,
        phuong_thuc_thanh_toan: args.phuong_thuc_thanh_toan || 'all',
      },
      summary,
    };
    const itemSummary = itemFilter ? buildItemSummary(orders, itemFilter) : null;

    if (['tong_quan', 'mon_ban_chay'].includes(reportType)) payload.topItems = topItems;
    if (['tong_quan', 'ton_kho_ban_thang'].includes(reportType)) payload.retailStocks = retailStocks;
    if (reportType === 'doanh_thu') payload.orders = orders.slice(0, limit).map(compactHistoryOrder);
    if (itemSummary) payload.itemSummary = itemSummary;
    if (reportType === 'loi_nhuan') {
      payload.profit = {
        revenue: itemSummary ? itemSummary.revenue : summary.revenue,
        cost: itemSummary ? itemSummary.cost : summary.cost,
        grossProfit: itemSummary ? itemSummary.grossProfit : summary.grossProfit,
        grossMarginPercent: itemSummary
          ? itemSummary.grossMarginPercent
          : (summary.revenue > 0 ? Number(((summary.grossProfit / summary.revenue) * 100).toFixed(2)) : 0),
        scopedToItem: Boolean(itemSummary),
      };
    }

    return payload;
  } catch (error) {
    return {
      ok: false,
      tool: 'truy_van_bao_cao',
      error: String(error?.message || error),
    };
  }
}

function buildSalesSummary(orders) {
  let revenue = 0;
  let revenueCash = 0;
  let revenueBank = 0;
  let cost = 0;

  orders.forEach(order => {
    const total = toFiniteNumber(order.total);
    revenue += total;
    cost += toFiniteNumber(order.cost);
    if (String(order.payMethod || '').toLowerCase() === 'bank') revenueBank += total;
    else revenueCash += total;
  });

  return {
    invoiceCount: orders.length,
    revenue,
    revenueCash,
    revenueBank,
    cost,
    grossProfit: revenue - cost,
  };
}

function buildTopItems(orders, limit) {
  const map = new Map();
  orders.forEach(order => {
    (Array.isArray(order.items) ? order.items : []).forEach(item => {
      const id = String(item.id || item.item_id || item.name || '').trim();
      const name = String(item.name || id || 'Khong ro').trim();
      const qty = toFiniteNumber(item.qty);
      if (!id || qty <= 0) return;
      const current = map.get(id) || { id, name, qty: 0, revenue: 0, cost: 0 };
      current.qty += qty;
      current.revenue += toFiniteNumber(item.price) * qty;
      current.cost += toFiniteNumber(item.cost) * qty;
      map.set(id, current);
    });
  });
  return [...map.values()]
    .sort((a, b) => (b.qty - a.qty) || (b.revenue - a.revenue))
    .slice(0, limit);
}

function buildItemSummary(orders, itemFilter = '') {
  const key = String(itemFilter || '').trim();
  if (!key) return null;

  const rows = [];
  orders.forEach(order => {
    (Array.isArray(order.items) ? order.items : []).forEach(item => {
      const name = String(item.name || item.id || '').trim();
      if (!name || !itemNameMatchesReportFilter(name, key)) return;
      const qty = toFiniteNumber(item.qty);
      if (qty <= 0) return;
      const revenue = toFiniteNumber(item.price) * qty;
      const cost = toFiniteNumber(item.cost) * qty;
      rows.push({
        id: String(item.id || item.item_id || name).trim(),
        name,
        qty,
        revenue,
        cost,
      });
    });
  });

  if (!rows.length) return null;

  const variantsMap = new Map();
  rows.forEach(row => {
    const id = normalizeVi(row.id || row.name) || row.name;
    const current = variantsMap.get(id) || {
      id: row.id,
      name: row.name,
      qty: 0,
      revenue: 0,
      cost: 0,
    };
    current.qty += row.qty;
    current.revenue += row.revenue;
    current.cost += row.cost;
    variantsMap.set(id, current);
  });

  const variants = [...variantsMap.values()].sort((a, b) => b.revenue - a.revenue || b.qty - a.qty);
  const revenue = variants.reduce((sum, row) => sum + row.revenue, 0);
  const cost = variants.reduce((sum, row) => sum + row.cost, 0);

  return {
    keyword: key,
    matchedCount: variants.length,
    totalQty: variants.reduce((sum, row) => sum + row.qty, 0),
    revenue,
    cost,
    grossProfit: revenue - cost,
    grossMarginPercent: revenue > 0 ? Number((((revenue - cost) / revenue) * 100).toFixed(2)) : 0,
    variants,
  };
}

async function executeImportQuery(args = {}, options = {}) {
  try {
    const db = getFirestoreDb(options.db);
    const range = buildDateRange(args);
    const limit = limitNumber(args.gioi_han, 10, 50);
    const itemFilter = String(args.ten_hang || args.ten_mon || '').trim();
    const supplierFilter = String(args.nha_cung_cap || '').trim();

    const snap = await db.collection('purchases').get();
    const rows = snap.docs
      .map(doc => ({ docId: doc.id, ...(doc.data() || {}) }))
      .filter(row => {
        const date = coerceDate(row.date || row.createdAt || row.timestamp);
        if (!date || date < range.from || date >= range.toExclusive) return false;
        if (itemFilter && !nameMatches(row.name || row.id, itemFilter)) return false;
        if (supplierFilter && !nameMatches(row.supplier || row.supplierId, supplierFilter)) return false;
        return true;
      })
      .sort((a, b) => {
        const da = coerceDate(a.date || a.createdAt || a.timestamp)?.getTime() || 0;
        const dbTime = coerceDate(b.date || b.createdAt || b.timestamp)?.getTime() || 0;
        return dbTime - da;
      });

    const itemMap = new Map();
    rows.forEach(row => {
      const key = normalizeVi(row.name || row.id || 'unknown');
      const current = itemMap.get(key) || {
        name: String(row.name || 'Khong ro'),
        qty: 0,
        unit: String(row.unit || ''),
        totalPrice: 0,
        count: 0,
      };
      current.qty += toFiniteNumber(row.qty);
      current.totalPrice += toFiniteNumber(row.price);
      current.count += 1;
      if (!current.unit && row.unit) current.unit = String(row.unit);
      itemMap.set(key, current);
    });

    return {
      ok: true,
      tool: 'tra_cuu_lich_su_nhap_kho',
      range,
      filters: {
        ten_hang: itemFilter || null,
        nha_cung_cap: supplierFilter || null,
      },
      summary: {
        purchaseCount: rows.length,
        totalPrice: rows.reduce((sum, row) => sum + toFiniteNumber(row.price), 0),
        totalQty: rows.reduce((sum, row) => sum + toFiniteNumber(row.qty), 0),
      },
      byItem: [...itemMap.values()]
        .sort((a, b) => b.totalPrice - a.totalPrice)
        .slice(0, limit),
      purchases: rows.slice(0, limit).map(row => {
        const date = coerceDate(row.date || row.createdAt || row.timestamp);
        return {
          id: String(row.id || row.docId || ''),
          name: String(row.name || ''),
          qty: toFiniteNumber(row.qty),
          unit: String(row.unit || ''),
          price: toFiniteNumber(row.price),
          costPerUnit: toFiniteNumber(row.costPerUnit),
          date: date ? date.toISOString() : null,
          supplier: String(row.supplier || ''),
          note: String(row.note || ''),
        };
      }),
    };
  } catch (error) {
    return {
      ok: false,
      tool: 'tra_cuu_lich_su_nhap_kho',
      error: String(error?.message || error),
    };
  }
}

async function findProductForOrder(db, item) {
  const explicitId = String(item.ma_mon || item.id || '').trim();
  if (explicitId) {
    const direct = await db.collection('Product_Catalog').doc(explicitId).get().catch(() => null);
    if (direct?.exists) return { id: direct.id, ...(direct.data() || {}) };
    const byField = await db.collection('Product_Catalog').where('item_id', '==', explicitId).limit(1).get().catch(() => null);
    if (byField && !byField.empty) return { id: byField.docs[0].id, ...(byField.docs[0].data() || {}) };
  }

  const key = normalizeVi(item.ten_mon || item.name);
  if (!key) return null;
  const snap = await db.collection('Product_Catalog').get();
  const rows = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() || {}) }));
  return rows.find(row => normalizeVi(row.display_name || row.name || row.item_id) === key)
    || rows.find(row => {
      const name = normalizeVi(row.display_name || row.name || row.item_id);
      return name.includes(key) || key.includes(name);
    })
    || null;
}

async function executeImportAction(db, pending) {
  const payload = pending.payload || {};
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) throw new Error('Pending nhap hang khong co items.');

  const now = new Date();
  const date = coerceDate(payload.ngay) || now;
  const batch = db.batch();
  const purchaseIds = [];

  items.forEach(item => {
    const qty = toFiniteNumber(item.so_luong);
    const unitPrice = toFiniteNumber(item.don_gia);
    const totalPrice = toFiniteNumber(item.tong_tien) || (unitPrice > 0 ? unitPrice * qty : 0);
    const ref = db.collection('purchases').doc(makeId('pur'));
    purchaseIds.push(ref.id);
    batch.set(ref, {
      id: ref.id,
      name: String(item.ten_hang || ''),
      qty,
      unit: String(item.don_vi || ''),
      price: totalPrice,
      costPerUnit: qty > 0 ? (unitPrice || totalPrice / qty) : 0,
      date: date.toISOString(),
      supplier: String(payload.nha_cung_cap || ''),
      supplierId: '',
      supplierPhone: '',
      supplierAddress: '',
      note: String(item.ghi_chu || payload.ghi_chu || ''),
      photoBatchId: null,
      source: 'telegram_confirm',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  return { ok: true, actionType: 'nhap_hang_thu_cong', purchaseIds, count: purchaseIds.length };
}

async function findInventoryDoc(db, payload) {
  const explicitId = String(payload.ma_hang || '').trim();
  if (explicitId) {
    const direct = await db.collection('Inventory_Items').doc(explicitId).get().catch(() => null);
    if (direct?.exists) return direct;
    const byInvId = await db.collection('Inventory_Items').where('inv_id', '==', explicitId).limit(1).get().catch(() => null);
    if (byInvId && !byInvId.empty) return byInvId.docs[0];
  }

  const key = normalizeVi(payload.ten_hang_hien_tai);
  if (!key) return null;
  const snap = await db.collection('Inventory_Items').get();
  return snap.docs.find(doc => {
    const row = doc.data() || {};
    const name = normalizeVi(row.material_name || row.name || row.inv_id || doc.id);
    return name === key || name.includes(key) || key.includes(name);
  }) || null;
}

async function findProductDoc(db, payload) {
  const explicitId = String(payload.ma_hang || '').trim();
  if (explicitId) {
    const direct = await db.collection('Product_Catalog').doc(explicitId).get().catch(() => null);
    if (direct?.exists) return direct;
    const byItemId = await db.collection('Product_Catalog').where('item_id', '==', explicitId).limit(1).get().catch(() => null);
    if (byItemId && !byItemId.empty) return byItemId.docs[0];
  }

  const key = normalizeVi(payload.ten_hang_hien_tai);
  if (!key) return null;
  const snap = await db.collection('Product_Catalog').get();
  return snap.docs.find(doc => {
    const row = doc.data() || {};
    const name = normalizeVi(row.display_name || row.name || row.item_id || doc.id);
    const aliases = String(row.aliases || '')
      .split(',')
      .map(alias => normalizeVi(alias))
      .filter(Boolean);
    return name === key || name.includes(key) || key.includes(name)
      || aliases.some(alias => alias === key || alias.includes(key) || key.includes(alias));
  }) || null;
}

async function executeMenuAction(db, pending) {
  const payload = pending.payload || {};
  const productDoc = await findProductDoc(db, payload);
  if (productDoc?.exists) {
    const updates = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: 'telegram_confirm',
    };
    if (payload.ten_moi) {
      updates.display_name = String(payload.ten_moi);
      updates.name = String(payload.ten_moi);
    }
    if (toFiniteNumber(payload.gia_moi) > 0) {
      updates.sell_price = toFiniteNumber(payload.gia_moi);
      updates.price = toFiniteNumber(payload.gia_moi);
    }
    if (payload.ghi_chu) updates.telegramUpdateNote = String(payload.ghi_chu);

    await productDoc.ref.set(updates, { merge: true });
    return { ok: true, actionType: 'sua_menu', productDocId: productDoc.id, collection: 'Product_Catalog', updates };
  }

  const doc = await findInventoryDoc(db, payload);
  if (!doc?.exists) throw new Error('Khong tim thay mon trong Product_Catalog hoac hang trong Inventory_Items.');
  const updates = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: 'telegram_confirm',
  };
  if (payload.ten_moi) {
    updates.material_name = String(payload.ten_moi);
    updates.name = String(payload.ten_moi);
  }
  if (toFiniteNumber(payload.gia_moi) > 0) {
    updates.price = toFiniteNumber(payload.gia_moi);
    updates.sell_price = toFiniteNumber(payload.gia_moi);
  }
  if (payload.ghi_chu) updates.telegramUpdateNote = String(payload.ghi_chu);

  await doc.ref.set(updates, { merge: true });
  return { ok: true, actionType: 'sua_menu', inventoryDocId: doc.id, collection: 'Inventory_Items', updates };
}

async function executeOrderAction(db, pending) {
  const payload = pending.payload || {};
  const items = Array.isArray(payload.items) ? payload.items : [];
  const unresolvedItems = Array.isArray(payload.unresolvedItems) ? payload.unresolvedItems : [];
  if (!items.length) throw new Error('Pending order khong co items.');
  if (unresolvedItems.length) {
    throw new Error(`Con ${unresolvedItems.length} mon chua duoc xac nhan. Vui long /fix hoac xoa truoc khi len don.`);
  }

  const tableId = String(payload.ban || 'takeaway').trim() || 'takeaway';
  const tableName = tableId.toLowerCase() === 'takeaway' || normalizeVi(tableId).includes('mang ve')
    ? 'Mang ve'
    : `Ban ${tableId}`;
  const existingOrderSnap = await db.collection('orders')
    .where('status', '==', 'open')
    .where('tableId', '==', tableId)
    .limit(1)
    .get()
    .catch(() => null);
  const existingOrderDoc = existingOrderSnap && !existingOrderSnap.empty ? existingOrderSnap.docs[0] : null;
  const orderId = existingOrderDoc?.id || `TG-${tableId.replace(/[^A-Za-z0-9_-]/g, '_')}-${Date.now()}`;
  const resolvedItems = [];

  for (const item of items) {
    const product = await findProductForOrder(db, item);
    const qty = toFiniteNumber(item.so_luong) || 1;

    // Ưu tiên giá đã validate từ DB (item.gia được set bởi createPendingOrderAction).
    // Fallback sang Product_Catalog nếu item.gia = 0 (pending cũ trước khi có validation).
    const price = toFiniteNumber(item.gia) > 0
      ? toFiniteNumber(item.gia)
      : toFiniteNumber(product?.sell_price ?? product?.price);

    // ── BẢO VỆ LỚP 2: Bỏ qua items không có giá (không có trong menu) ──────
    if (!(price > 0)) {
      console.warn('[executeOrderAction] Skipping item with price=0 (not in menu):', {
        ten_mon: item.ten_mon,
        ma_mon: item.ma_mon,
        gia_pending: item.gia,
        orderId,
        tableId,
      });
      continue; // bỏ qua item này, KHÔNG đưa vào resolvedItems
    }

    resolvedItems.push({
      id: String(product?.item_id || product?.id || item.ma_mon || normalizeVi(item.ten_mon).replace(/\s+/g, '_')),
      name: String(product?.display_name || product?.name || item.ten_mon || ''),
      price,
      qty,
      note: String(item.ghi_chu || ''),
      kitchenStatus: 'pending',
      kitchenRouting: 'kitchen',
      lineItemId: makeId('line'),
      addedAt: Date.now(),
      source: 'telegram_confirm',
    });
  }

  // ── Nếu không còn item hợp lệ → ABORT toàn bộ, không ghi gì vào DB ──────
  if (!resolvedItems.length) {
    throw new Error(
      'Tat ca cac mon trong order deu khong co gia hop le (khong co trong menu). ' +
      'Khong tao order va khong gui thong bao bep.'
    );
  }

  const total = resolvedItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const batch = db.batch();
  const orderRef = existingOrderDoc ? existingOrderDoc.ref : db.collection('orders').doc(orderId);
  const existingOrder = existingOrderDoc?.data() || {};
  const mergedItems = Array.isArray(existingOrder.items) ? existingOrder.items.map(row => ({ ...(row || {}) })) : [];
  for (const item of resolvedItems) {
    const noteKey = String(item.note || '').trim();
    const idx = mergedItems.findIndex(row => (
      String(row?.id || '').trim() === String(item.id || '').trim()
      && String(row?.note || '').trim() === noteKey
      && String(row?.kitchenStatus || '').toLowerCase() !== 'served'
    ));
    if (idx >= 0) {
      mergedItems[idx].qty = toFiniteNumber(mergedItems[idx].qty) + item.qty;
      mergedItems[idx].price = toFiniteNumber(mergedItems[idx].price) || item.price;
    } else {
      mergedItems.push(item);
    }
  }
  const mergedTotal = mergedItems.reduce((sum, item) => sum + (toFiniteNumber(item.price) * toFiniteNumber(item.qty || 1)), 0);
  const nextNote = [String(existingOrder.note || '').trim(), String(payload.ghi_chu || '').trim()]
    .filter(Boolean)
    .filter((val, index, arr) => arr.indexOf(val) === index)
    .join(' | ');

  batch.set(orderRef, existingOrderDoc ? {
    tableName,
    items: mergedItems,
    note: nextNote,
    total: mergedTotal,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    source: existingOrder.source || 'telegram_confirm',
  } : {
    id: orderId,
    tableId,
    tableName,
    staffUid: null,
    items: mergedItems,
    discount: 0,
    discountType: 'vnd',
    shipping: 0,
    vatAmount: 0,
    note: nextNote,
    status: 'open',
    total: mergedTotal,
    source: 'telegram_confirm',
    openedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: !!existingOrderDoc });

  const notifRef = db.collection('kitchen_notifications').doc();
  batch.set(notifRef, {
    type: 'new_order',
    tableId,
    tableName,
    orderId,
    message: existingOrderDoc ? `${tableName} co them mon tu Telegram` : `${tableName} co order moi tu Telegram`,
    items: resolvedItems.map(item => `${item.name} x${item.qty}`),
    createdAt: Date.now(),
    createdByUid: 'telegram_bot',
    createdByRole: 'telegram',
    readBy: [],
    status: 'unread',
    zaloSent: false,
    pushSent: false,
  });

  // ── Cập nhật bảng: query theo field 'tableId' thay vì assume doc ID = tableId ──
  if (tableId && tableId !== 'takeaway') {
    // Thử tìm doc bàn có field tableId hoặc id khớp (POS có thể dùng auto-ID)
    const tableSnap = await db.collection('tables')
      .where('tableId', '==', tableId)
      .limit(1)
      .get()
      .catch(() => null);

    const tableDocRef = (tableSnap && !tableSnap.empty)
      ? tableSnap.docs[0].ref                    // doc thực của POS
      : db.collection('tables').doc(tableId);    // fallback: doc ID = tableId

    batch.set(tableDocRef, {
      status: 'occupied',
      orderId,
      openTime: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  await batch.commit();
  return {
    ok: true,
    actionType: 'goi_mon_ban',
    orderId,
    kitchenNotificationId: notifRef.id,
    total: mergedTotal,
    tableId,
    tableName,
    itemCount: resolvedItems.length,
    appendedToExisting: !!existingOrderDoc,
  };
}

async function executePendingAction(docId, options = {}) {
  const db = getFirestoreDb(options.db);
  const ref = db.collection('telegram_pending_actions').doc(String(docId || ''));
  const pending = await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const row = { docId: snap.id, ...(snap.data() || {}) };
    if (String(row.status || '') !== 'pending') return row;
    tx.set(ref, {
      status: 'executing',
      executingAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return row;
  });

  if (!pending) return { ok: false, error: 'Hanh dong khong ton tai hoac da duoc xu ly.' };
  if (String(pending.status || '') !== 'pending') {
    return { ok: false, error: `Hanh dong da o trang thai ${pending.status || 'unknown'}.` };
  }

  let result;
  try {
    if (pending.actionType === 'nhap_hang_thu_cong') result = await executeImportAction(db, pending);
    else if (pending.actionType === 'sua_menu') result = await executeMenuAction(db, pending);
    else if (pending.actionType === 'goi_mon_ban') result = await executeOrderAction(db, pending);
    else throw new Error(`Action khong duoc ho tro: ${pending.actionType}`);
    await ref.delete();
    return { ok: true, docId: pending.docId, ...result };
  } catch (error) {
    await ref.set({
      status: 'pending',
      lastError: String(error?.message || error),
      failedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true }).catch(() => null);
    throw error;
  }
}

async function cancelPendingAction(docId, options = {}) {
  const db = getFirestoreDb(options.db);
  const ref = db.collection('telegram_pending_actions').doc(String(docId || ''));
  const snap = await ref.get();
  if (!snap.exists) return { ok: true, skipped: 'not-found' };
  await ref.delete();
  return { ok: true, docId: snap.id, cancelled: true };
}

async function executeGeminiTool(functionCall, options = {}) {
  const name = String(functionCall?.name || '');
  const args = functionCall?.args || {};
  if (name === 'truy_van_bao_cao') return executeReportQuery(args, options);
  if (name === 'tra_cuu_lich_su_nhap_kho') return executeImportQuery(args, options);
  if (name === 'nhap_hang_thu_cong') return createPendingImportAction(args, options);
  if (name === 'sua_menu') return createPendingMenuAction(args, options);
  if (name === 'goi_mon_ban') return createPendingOrderAction(args, options);
  return { ok: false, error: `Tool khong duoc ho tro: ${name}` };
}

module.exports = {
  executeReportQuery,
  executeImportQuery,
  createPendingImportAction,
  createPendingMenuAction,
  createPendingOrderAction,
  fetchValidMenuItems,
  fuzzyMatchMenuItem,
  findTopMenuCandidates,
  normalizeVi,
  executePendingAction,
  cancelPendingAction,
  executeGeminiTool,
};
