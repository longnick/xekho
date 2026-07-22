'use strict';

const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const DAY_MS = 24 * 60 * 60 * 1000;

function pad2(value) { return String(value).padStart(2, '0'); }

function toFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toPositiveAmount(value) {
  const n = toFiniteNumber(value, 0);
  return n > 0 ? n : 0;
}

function valueToDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  if (value?.toDate) {
    const d = value.toDate();
    return Number.isFinite(d.getTime()) ? d : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  if (value?.seconds) {
    const d = new Date(Number(value.seconds) * 1000);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

function getVietnamDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

function utcDateFromVietnamYmd(ymd, endOfDay = false) {
  const [year, month, day] = String(ymd).split('-').map(Number);
  const utcMs = Date.UTC(year, month - 1, day, endOfDay ? 16 : 17, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  // VN midnight is previous UTC day 17:00. End-of-day is same UTC day 16:59:59.999.
  return new Date(endOfDay ? utcMs : Date.UTC(year, month - 1, day - 1, 17, 0, 0, 0));
}

function addDaysYmd(ymd, days) {
  const [year, month, day] = String(ymd).split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day + days, 0, 0, 0, 0));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function resolveWidgetRange(range = 'today', now = new Date()) {
  const today = getVietnamDateParts(now).dateKey;
  const [year, month] = today.split('-');
  const normalized = String(range || 'today').trim().toLowerCase();
  if (['month', 'this_month', 'thang', 'thang-nay'].includes(normalized)) {
    const fromYmd = `${year}-${month}-01`;
    return {
      key: 'month',
      rangeLabel: 'Tháng này',
      fromYmd,
      toYmd: today,
      from: utcDateFromVietnamYmd(fromYmd, false),
      to: utcDateFromVietnamYmd(today, true),
    };
  }
  if (['7d', 'week', 'last_7d', '7ngay'].includes(normalized)) {
    const fromYmd = addDaysYmd(today, -6);
    return {
      key: '7d',
      rangeLabel: '7 ngày',
      fromYmd,
      toYmd: today,
      from: utcDateFromVietnamYmd(fromYmd, false),
      to: utcDateFromVietnamYmd(today, true),
    };
  }
  return {
    key: 'today',
    rangeLabel: 'Hôm nay',
    fromYmd: today,
    toYmd: today,
    from: utcDateFromVietnamYmd(today, false),
    to: utcDateFromVietnamYmd(today, true),
  };
}

function dateKeyForValue(value) {
  const d = valueToDate(value);
  if (!d) return '';
  return getVietnamDateParts(d).dateKey;
}

function isVisibleHistoryOrderForWidget(order = {}) {
  const status = String(order.status || '').trim().toLowerCase();
  if (['cancelled', 'canceled', 'rejected', 'declined', 'expired', 'archived', 'deleted', 'void'].includes(status)) return false;
  if (order.hidden || order.isHidden || order.deleted || order.archived) return false;
  if (order.cancelledAt || order.canceledAt || order.cancelReason) return false;
  if (!status) return true;
  return ['completed', 'closed', 'paid', 'done'].includes(status);
}

function isNhapHangExpense(row = {}) {
  const category = String(row.category || '').trim().toLowerCase();
  const name = String(row.name || '').trim().toLowerCase();
  return category === 'nhập hàng' || category === 'nhap hang' || /^nhập hàng:/i.test(name) || /^nhap hang:/i.test(name);
}

function computeOrderCost(order = {}) {
  const lineCost = (Array.isArray(order.items) ? order.items : []).reduce((sum, item) => {
    return sum + (toFiniteNumber(item.cost, 0) * toFiniteNumber(item.qty, 0));
  }, 0);
  if (lineCost > 0) return lineCost;
  return toPositiveAmount(order.cost);
}

function computeSalesSummary(orders = []) {
  const grossSales = orders.reduce((sum, order) => {
    return sum + (Array.isArray(order.items) ? order.items : []).reduce((itemSum, item) => {
      return itemSum + (toFiniteNumber(item.price, 0) * toFiniteNumber(item.qty, 0));
    }, 0);
  }, 0);
  const discountTotal = orders.reduce((sum, order) => sum + toPositiveAmount(order.discount), 0);
  const netSales = grossSales - discountTotal;
  const cogs = orders.reduce((sum, order) => sum + computeOrderCost(order), 0);
  const grossProfit = netSales - cogs;
  const bank = orders.filter(order => String(order.payMethod || order.paymentMethod || '').toLowerCase().includes('bank'))
    .reduce((sum, order) => sum + toPositiveAmount(order.total), 0);
  const revenue = orders.reduce((sum, order) => sum + toPositiveAmount(order.total), 0);
  const cash = Math.max(0, revenue - bank);
  return { grossSales, discountTotal, netSales, cogs, grossProfit, revenue, bank, cash, orders: orders.length };
}

function summarizeRowsInRange({ orders = [], expenses = [], purchases = [], fixedProfile = {}, range }) {
  const rangeDays = Math.max(1, Math.round((new Date(`${range.toYmd}T00:00:00Z`) - new Date(`${range.fromYmd}T00:00:00Z`)) / DAY_MS) + 1);
  const sales = computeSalesSummary(orders);
  const operatingExpense = expenses.filter(row => !isNhapHangExpense(row)).reduce((sum, row) => sum + toPositiveAmount(row.amount), 0);
  const purchaseTotal = purchases.reduce((sum, row) => sum + toPositiveAmount(row.price ?? row.amount ?? row.total), 0);
  const dailyFixedCost = toPositiveAmount(fixedProfile.dailyFixedCost ?? fixedProfile.daily_fixed_cost);
  const fixedCost = dailyFixedCost * rangeDays;
  const profit = sales.grossProfit - operatingExpense - fixedCost;
  const marginPct = sales.netSales > 0 ? (profit / sales.netSales) * 100 : 0;
  const totalCostForWidget = sales.cogs + operatingExpense + fixedCost;
  return {
    rangeLabel: range.rangeLabel,
    from: range.fromYmd,
    to: range.toYmd,
    rangeDays,
    revenue: Math.round(sales.netSales),
    grossSales: Math.round(sales.grossSales),
    discountTotal: Math.round(sales.discountTotal),
    cogs: Math.round(sales.cogs),
    grossProfit: Math.round(sales.grossProfit),
    operatingExpense: Math.round(operatingExpense),
    purchaseTotal: Math.round(purchaseTotal),
    fixedCost: Math.round(fixedCost),
    expenses: Math.round(totalCostForWidget),
    profit: Math.round(profit),
    marginPct: Number(marginPct.toFixed(1)),
    orders: sales.orders,
    bank: Math.round(sales.bank),
    cash: Math.round(sales.cash),
    expenseBreakdown: [
      { label: 'Giá vốn', amount: Math.round(sales.cogs) },
      { label: 'Vận hành', amount: Math.round(operatingExpense) },
      { label: 'Cố định', amount: Math.round(fixedCost) },
      { label: 'Nhập hàng', amount: Math.round(purchaseTotal), note: 'Theo dõi dòng tiền, không trừ lần 2 vào lãi' },
    ],
  };
}

function filterRowsForRange(rows, range, datePicker) {
  return rows.filter(row => {
    const date = valueToDate(datePicker(row));
    return date && date >= range.from && date <= range.to;
  });
}

function buildSeries({ historyRows = [], expenseRows = [], fixedProfile = {}, now = new Date() }) {
  const today = getVietnamDateParts(now).dateKey;
  const days = Array.from({ length: 7 }, (_, idx) => addDaysYmd(today, idx - 6));
  return days.map(ymd => {
    const range = resolveWidgetRange('today', utcDateFromVietnamYmd(ymd, true));
    range.fromYmd = ymd;
    range.toYmd = ymd;
    range.from = utcDateFromVietnamYmd(ymd, false);
    range.to = utcDateFromVietnamYmd(ymd, true);
    range.rangeLabel = ymd;
    const orders = filterRowsForRange(historyRows, range, row => row.paidAt || row.timestamp || row.createdAt)
      .filter(isVisibleHistoryOrderForWidget);
    const expenses = filterRowsForRange(expenseRows, range, row => row.date || row.createdAt);
    const summary = summarizeRowsInRange({ orders, expenses, purchases: [], fixedProfile, range });
    return { date: ymd, revenue: summary.revenue, expenses: summary.expenses, profit: summary.profit };
  });
}

async function loadFinancialProfile(db) {
  const snap = await db.collection('settings').doc('financial_profile').get().catch(() => null);
  const data = snap?.exists ? (snap.data() || {}) : {};
  const monthly = data.monthly_fixed_costs || {};
  const monthlyTotal = toPositiveAmount(monthly.total)
    || toPositiveAmount(monthly.rent) + toPositiveAmount(monthly.staff) + toPositiveAmount(monthly.utilities) + toPositiveAmount(monthly.other);
  return {
    dailyFixedCost: toPositiveAmount(data.daily_fixed_cost) || (monthlyTotal > 0 ? Math.round(monthlyTotal / 30) : 0),
    monthlyFixedCostTotal: monthlyTotal,
  };
}

async function buildFinanceWidgetPayload({ db, rangeKey = 'today', now = new Date() }) {
  const range = resolveWidgetRange(rangeKey, now);
  const [historySnap, expenseSnap, purchaseSnap, fixedProfile] = await Promise.all([
    db.collection('history').get(),
    db.collection('expenses').get(),
    db.collection('purchases').get(),
    loadFinancialProfile(db),
  ]);
  const historyRows = historySnap.docs.map(doc => ({ id: doc.id, ...(doc.data() || {}) }));
  const expenseRows = expenseSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() || {}) }));
  const purchaseRows = purchaseSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() || {}) }));
  const orders = filterRowsForRange(historyRows, range, row => row.paidAt || row.timestamp || row.createdAt)
    .filter(isVisibleHistoryOrderForWidget);
  const expenses = filterRowsForRange(expenseRows, range, row => row.date || row.createdAt);
  const purchases = filterRowsForRange(purchaseRows, range, row => row.date || row.createdAt);
  const summary = summarizeRowsInRange({ orders, expenses, purchases, fixedProfile, range });
  return {
    ok: true,
    source: 'firestore-readonly',
    timezone: VN_TIME_ZONE,
    updatedAt: now.toISOString(),
    ...summary,
    series: buildSeries({ historyRows, expenseRows, fixedProfile, now }),
  };
}

function getBearerToken(req) {
  const auth = String(req.headers?.authorization || '');
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1] || '';
  return String(req.query?.token || req.get?.('x-widget-token') || bearer || '').trim();
}

function timingSafeEqualString(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (!left.length || left.length !== right.length) return false;
  return require('crypto').timingSafeEqual(left, right);
}

function createFinanceWidgetHandler({ db, cors, json, logger, tokenParam }) {
  return (req, res) => {
    cors(req, res, async () => {
      if (req.method === 'OPTIONS') return res.status(204).send('');
      if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'Method not allowed' });
      const expectedToken = String(tokenParam?.value?.() || process.env.SCRIPTABLE_FINANCE_WIDGET_TOKEN || '').trim();
      if (!expectedToken) return json(res, 503, { ok: false, error: 'SCRIPTABLE_FINANCE_WIDGET_TOKEN is not configured' });
      if (!timingSafeEqualString(getBearerToken(req), expectedToken)) {
        return json(res, 401, { ok: false, error: 'Unauthorized' });
      }
      try {
        const payload = await buildFinanceWidgetPayload({ db, rangeKey: req.query?.range || 'today' });
        return json(res, 200, payload);
      } catch (err) {
        logger?.error?.('scriptableFinanceWidgetData failed', { error: err?.message || String(err) });
        return json(res, 500, { ok: false, error: 'Failed to build finance widget payload' });
      }
    });
  };
}

module.exports = {
  VN_TIME_ZONE,
  valueToDate,
  resolveWidgetRange,
  isVisibleHistoryOrderForWidget,
  computeSalesSummary,
  summarizeRowsInRange,
  buildSeries,
  buildFinanceWidgetPayload,
  createFinanceWidgetHandler,
};
