// XE KHÔ Finance Widget — Variant A Owner Glance
// Paste into iOS Scriptable. Configure endpoint/token below or via Scriptable args.widgetParameter:
//   https://.../scriptableFinanceWidgetData|YOUR_TOKEN|today
// Families: small, medium, large.

const CONFIG = {
  endpoint: 'https://asia-southeast1-pos-v2-909ff.cloudfunctions.net/scriptableFinanceWidgetData',
  token: '***REVOKED_CREDENTIAL***', // Private owner token; rotate before sharing this script.
  range: 'today', // today | 7d | month
  shopName: 'Xe Khô Chữa Lành',
};

const BRAND = {
  primary: '#E10600',
  secondary: '#FCE100',
  accent: '#E78170',
  dark: '#2A1608',
  light: '#F9EAD1',
  paper: '#FFF6DF',
  ok: '#12805C',
  muted: '#7A5B3B',
};

function applyWidgetParameter() {
  const raw = (args.widgetParameter || '').trim();
  if (!raw) return;
  const [endpoint, token, range] = raw.split('|').map(v => String(v || '').trim());
  if (endpoint) CONFIG.endpoint = endpoint;
  if (token) CONFIG.token = token;
  if (range) CONFIG.range = range;
}

function moneyShort(value) {
  const n = Number(value || 0);
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1000000000) return `${sign}${(abs / 1000000000).toFixed(1)}tỷ`;
  if (abs >= 1000000) return `${sign}${(abs / 1000000).toFixed(abs >= 10000000 ? 0 : 1)}tr`;
  if (abs >= 1000) return `${sign}${Math.round(abs / 1000)}k`;
  return `${sign}${Math.round(abs)}`;
}

function moneyFull(value) {
  return `${Math.round(Number(value || 0)).toLocaleString('vi-VN')}đ`;
}

function pct(value) {
  const n = Number(value || 0);
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch (_) {
    return '--:--';
  }
}

function getSampleData() {
  return {
    ok: true,
    sample: true,
    rangeLabel: CONFIG.range === 'month' ? 'Tháng này' : 'Hôm nay',
    updatedAt: new Date().toISOString(),
    revenue: 4820000,
    cogs: 1530000,
    operatingExpense: 1210000,
    fixedCost: 650000,
    expenses: 3390000,
    profit: 1430000,
    marginPct: 29.7,
    orders: 24,
    bank: 3310000,
    cash: 1510000,
    series: [
      { date: 'T-6', revenue: 3200000, expenses: 2350000, profit: 850000 },
      { date: 'T-5', revenue: 4100000, expenses: 2980000, profit: 1120000 },
      { date: 'T-4', revenue: 3600000, expenses: 2600000, profit: 1000000 },
      { date: 'T-3', revenue: 5200000, expenses: 3500000, profit: 1700000 },
      { date: 'T-2', revenue: 3900000, expenses: 3350000, profit: 550000 },
      { date: 'T-1', revenue: 5600000, expenses: 3600000, profit: 2000000 },
      { date: 'Nay', revenue: 4820000, expenses: 3390000, profit: 1430000 },
    ],
    expenseBreakdown: [
      { label: 'Giá vốn', amount: 1530000 },
      { label: 'Vận hành', amount: 1210000 },
      { label: 'Cố định', amount: 650000 },
      { label: 'Nhập hàng', amount: 1570000 },
    ],
  };
}

async function loadData() {
  applyWidgetParameter();
  if (!CONFIG.token) return { ...getSampleData(), warning: 'Chưa cấu hình token — đang xem mẫu' };
  const url = `${CONFIG.endpoint}?range=${encodeURIComponent(CONFIG.range)}`;
  const req = new Request(url);
  req.headers = { Authorization: `Bearer ${CONFIG.token}` };
  req.timeoutInterval = 12;
  const data = await req.loadJSON();
  if (!data || data.ok === false) throw new Error(data?.error || 'Không tải được dữ liệu widget');
  return data;
}

function setGradient(widget) {
  const g = new LinearGradient();
  g.colors = [new Color(BRAND.paper), new Color(BRAND.light), new Color('#F5D9B8')];
  g.locations = [0, 0.62, 1];
  widget.backgroundGradient = g;
}

function addText(parent, text, options = {}) {
  const t = parent.addText(String(text || ''));
  t.textColor = new Color(options.color || BRAND.dark);
  t.font = options.font || Font.systemFont(options.size || 12);
  if (options.lineLimit) t.lineLimit = options.lineLimit;
  if (options.opacity != null) t.textOpacity = options.opacity;
  return t;
}

function addTopBar(widget, data, compact = false) {
  const row = widget.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const left = row.addStack();
  left.layoutVertically();
  addText(left, compact ? 'XE KHÔ' : CONFIG.shopName, { font: Font.blackSystemFont(compact ? 16 : 15), color: BRAND.dark, lineLimit: 1 });
  addText(left, `${data.rangeLabel || 'Hôm nay'} · ${formatTime(data.updatedAt)}`, { font: Font.mediumSystemFont(10), color: BRAND.muted, lineLimit: 1 });
  row.addSpacer();
  const pill = row.addStack();
  pill.backgroundColor = new Color(BRAND.dark);
  pill.cornerRadius = 10;
  pill.setPadding(4, 7, 4, 7);
  addText(pill, data.sample ? 'MẪU' : 'LIVE', { font: Font.boldSystemFont(9), color: BRAND.secondary });
}

function addMetricTile(parent, label, value, options = {}) {
  const tile = parent.addStack();
  tile.layoutVertically();
  tile.backgroundColor = new Color('#FFFFFF', 0.38);
  tile.cornerRadius = 14;
  tile.setPadding(7, 8, 7, 8);
  addText(tile, label, { font: Font.boldSystemFont(9), color: BRAND.muted, lineLimit: 1 });
  addText(tile, value, { font: Font.blackSystemFont(options.big ? 19 : 16), color: options.color || BRAND.dark, lineLimit: 1 });
  return tile;
}

function addBars(parent, series = [], height = 54) {
  const rows = Array.isArray(series) && series.length ? series.slice(-7) : getSampleData().series;
  const max = Math.max(1, ...rows.map(r => Math.max(Number(r.revenue || 0), Number(r.expenses || 0))));
  const stack = parent.addStack();
  stack.layoutHorizontally();
  stack.bottomAlignContent();
  stack.spacing = 6;
  rows.forEach(row => {
    const wrap = stack.addStack();
    wrap.layoutVertically();
    wrap.addSpacer();
    const revenueH = Math.max(7, Math.round((Number(row.revenue || 0) / max) * height));
    const expenseH = Math.max(4, Math.round((Number(row.expenses || 0) / max) * height));
    const bar = wrap.addStack();
    bar.size = new Size(10, revenueH);
    bar.backgroundColor = new Color(Number(row.profit || 0) >= 0 ? BRAND.primary : BRAND.accent);
    bar.cornerRadius = 5;
    const expense = wrap.addStack();
    expense.size = new Size(10, expenseH);
    expense.backgroundColor = new Color(BRAND.dark);
    expense.cornerRadius = 5;
  });
}

function addWarning(widget, data) {
  if (!data.warning) return;
  widget.addSpacer(4);
  addText(widget, data.warning, { font: Font.mediumSystemFont(9), color: BRAND.primary, lineLimit: 2 });
}

// ─── Sparkline chart via DrawContext ────────────────────────────────────────
// Returns an Image drawn directly, no external libs.
// BALANCED_LAYOUT_SPARKLINE_DRAWCONTEXT — marker for layout assertions
function drawSparkline(series, w, h) {
  const rows = Array.isArray(series) && series.length ? series.slice(-7) : getSampleData().series;
  const revenues = rows.map(r => Number(r.revenue || 0));
  const expenses = rows.map(r => Number(r.expenses || 0));
  const maxVal = Math.max(1, ...revenues, ...expenses);

  const ctx = new DrawContext();
  ctx.size = new Size(w, h);
  ctx.opaque = false;
  ctx.respectScreenScale = true;

  const barW = Math.floor((w - (rows.length - 1) * 3) / rows.length);
  const barSlot = barW + 3;

  rows.forEach((row, i) => {
    const x = i * barSlot;
    const revH = Math.max(4, Math.round((revenues[i] / maxVal) * (h - 14)));
    const expH = Math.max(3, Math.round((expenses[i] / maxVal) * (h - 14)));
    const isProfit = Number(row.profit || 0) >= 0;

    // Revenue bar (back, slightly transparent)
    const revColor = new Color(isProfit ? BRAND.primary : BRAND.accent, 0.45);
    const revRect = new Rect(x, h - 14 - revH, barW, revH);
    ctx.setFillColor(revColor);
    const revPath = new Path();
    revPath.addRoundedRect(revRect, 3, 3);
    ctx.addPath(revPath);
    ctx.fillPath();

    // Expense bar (front, solid dark)
    const expColor = new Color(BRAND.dark, 0.80);
    const expRect = new Rect(x + Math.floor(barW * 0.28), h - 14 - expH, Math.ceil(barW * 0.44), expH);
    ctx.setFillColor(expColor);
    const expPath = new Path();
    expPath.addRoundedRect(expRect, 2, 2);
    ctx.addPath(expPath);
    ctx.fillPath();

    // Date label
    ctx.setFont(Font.systemFont(8));
    ctx.setTextColor(new Color(BRAND.muted));
    const labelRect = new Rect(x, h - 13, barW, 13);
    ctx.drawTextInRect(String(row.date || '').slice(0, 3), labelRect);
  });

  return ctx.getImage();
}

// ─── KPI ledger row helper (right column) ────────────────────────────────────
// Creates a single label+value row that fills its container width.
function addLedgerRow(parent, label, value, options = {}) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  if (options.topPad) row.setPadding(options.topPad, 0, 0, 0);
  addText(row, label, { font: Font.mediumSystemFont(10), color: options.labelColor || BRAND.muted, lineLimit: 1 });
  row.addSpacer();
  addText(row, value, { font: Font.boldSystemFont(10), color: options.valueColor || BRAND.dark, lineLimit: 1 });
}

// ─── Divider helper ───────────────────────────────────────────────────────────
function addDivider(parent, opacity) {
  const div = parent.addStack();
  div.size = new Size(0, 1);
  div.backgroundColor = new Color(BRAND.muted, opacity != null ? opacity : 0.25);
}

// ─── Small ───────────────────────────────────────────────────────────────────
function buildSmall(data) {
  const widget = new ListWidget();
  setGradient(widget);
  widget.setPadding(14, 14, 14, 14);
  addTopBar(widget, data, true);
  widget.addSpacer(12);
  addText(widget, 'Lợi nhuận', { font: Font.boldSystemFont(11), color: BRAND.muted });
  addText(widget, moneyShort(data.profit), { font: Font.blackSystemFont(31), color: Number(data.profit || 0) >= 0 ? BRAND.ok : BRAND.primary, lineLimit: 1 });
  widget.addSpacer();
  const row = widget.addStack();
  row.layoutHorizontally();
  row.spacing = 8;
  addMetricTile(row, 'Doanh thu', moneyShort(data.revenue));
  addMetricTile(row, 'Chi phí', moneyShort(data.expenses));
  addWarning(widget, data);
  return widget;
}

// ─── Medium ──────────────────────────────────────────────────────────────────
function buildMedium(data) {
  const widget = new ListWidget();
  setGradient(widget);
  widget.setPadding(15, 16, 13, 16);
  addTopBar(widget, data, false);
  widget.addSpacer(10);
  const row = widget.addStack();
  row.layoutHorizontally();
  row.spacing = 10;
  addMetricTile(row, 'Doanh thu thuần', moneyShort(data.revenue), { big: true });
  addMetricTile(row, 'Lợi nhuận ròng', moneyShort(data.profit), { big: true, color: Number(data.profit || 0) >= 0 ? BRAND.ok : BRAND.primary });
  widget.addSpacer(9);
  addBars(widget, data.series, 48);
  widget.addSpacer(4);
  addText(widget, `${data.orders || 0} đơn · Margin ${pct(data.marginPct)} · CK/TM ${moneyShort(data.bank)} / ${moneyShort(data.cash)}`, { font: Font.mediumSystemFont(10), color: BRAND.muted, lineLimit: 1 });
  addWarning(widget, data);
  return widget;
}

// ─── Large — BALANCED_LAYOUT_TWO_COLUMN ──────────────────────────────────────
// Layout: explicit horizontal split, left ≈ 47 % / right ≈ 53 %.
// Scriptable does not reliably stretch an unsized trailing stack; fixed columns
// consume the whole large-widget body instead of leaving a blank right side.
//   Left  : brand header + profit hero + margin badge + sparkline chart
//   Right : KPI ledger (revenue, expenses, COGS, orders, cash/bank) + expense breakdown
// This avoids empty right-side space and disconnected bar sticks.
function buildLarge(data) {
  const widget = new ListWidget();
  setGradient(widget);
  widget.setPadding(14, 14, 14, 14);

  // ── Top bar (full-width) ──────────────────────────────────────────────────
  addTopBar(widget, data, false);
  widget.addSpacer(10);

  // ── Body: two columns ─────────────────────────────────────────────────────
  const body = widget.addStack();
  body.layoutHorizontally();
  body.spacing = 10;

  // ── LEFT COLUMN ───────────────────────────────────────────────────────────
  // BALANCED_LAYOUT_LEFT_PROFIT_SPARKLINE
  const leftCol = body.addStack();
  leftCol.layoutVertically();
  leftCol.size = new Size(142, 0);

  // Profit hero section
  const profitLabel = leftCol.addStack();
  profitLabel.layoutHorizontally();
  profitLabel.centerAlignContent();
  addText(profitLabel, 'LỢI NHUẬN', { font: Font.boldSystemFont(9), color: BRAND.muted, lineLimit: 1 });

  leftCol.addSpacer(3);
  const isPositive = Number(data.profit || 0) >= 0;
  const profitColor = isPositive ? BRAND.ok : BRAND.primary;
  addText(leftCol, moneyShort(data.profit), {
    font: Font.blackSystemFont(36),
    color: profitColor,
    lineLimit: 1,
  });

  // Margin badge row
  leftCol.addSpacer(4);
  const badgeRow = leftCol.addStack();
  badgeRow.layoutHorizontally();
  badgeRow.spacing = 5;
  badgeRow.centerAlignContent();

  const marginPill = badgeRow.addStack();
  marginPill.backgroundColor = new Color(isPositive ? BRAND.ok : BRAND.primary, 0.15);
  marginPill.cornerRadius = 8;
  marginPill.setPadding(3, 7, 3, 7);
  addText(marginPill, `${pct(data.marginPct)} margin`, {
    font: Font.boldSystemFont(9),
    color: isPositive ? BRAND.ok : BRAND.primary,
    lineLimit: 1,
  });

  const orderPill = badgeRow.addStack();
  orderPill.backgroundColor = new Color(BRAND.dark, 0.10);
  orderPill.cornerRadius = 8;
  orderPill.setPadding(3, 7, 3, 7);
  addText(orderPill, `${data.orders || 0} đơn`, {
    font: Font.boldSystemFont(9),
    color: BRAND.dark,
    lineLimit: 1,
  });

  leftCol.addSpacer(10);

  // Sparkline chart — BALANCED_LAYOUT_SPARKLINE_DRAWCONTEXT
  const chartImg = drawSparkline(data.series, 142, 70);
  const chartView = leftCol.addImage(chartImg);
  chartView.imageSize = new Size(142, 70);
  chartView.cornerRadius = 8;

  leftCol.addSpacer(); // push everything up

  // ── RIGHT COLUMN ──────────────────────────────────────────────────────────
  // BALANCED_LAYOUT_RIGHT_KPI_BREAKDOWN
  const rightCol = body.addStack();
  rightCol.layoutVertically();
  rightCol.size = new Size(149, 0);

  // KPI card (revenue, expenses, COGS)
  const kpiCard = rightCol.addStack();
  kpiCard.layoutVertically();
  kpiCard.backgroundColor = new Color('#FFFFFF', 0.38);
  kpiCard.cornerRadius = 12;
  kpiCard.setPadding(9, 10, 9, 10);

  addText(kpiCard, 'CHỈ SỐ CHÍNH', { font: Font.boldSystemFont(8), color: BRAND.muted, lineLimit: 1 });
  kpiCard.addSpacer(6);

  addLedgerRow(kpiCard, 'Doanh thu thuần', moneyShort(data.revenue), { valueColor: BRAND.dark });
  kpiCard.addSpacer(5);
  addLedgerRow(kpiCard, 'Tổng chi phí', moneyShort(data.expenses), { valueColor: BRAND.primary });
  kpiCard.addSpacer(5);
  addLedgerRow(kpiCard, 'Giá vốn', moneyShort(data.cogs), { valueColor: BRAND.muted });
  kpiCard.addSpacer(5);
  addLedgerRow(kpiCard, 'Tiền CK / TM', `${moneyShort(data.bank)} / ${moneyShort(data.cash)}`, { valueColor: BRAND.dark });

  rightCol.addSpacer(8);

  // Expense breakdown card — BALANCED_LAYOUT_EXPENSE_BREAKDOWN
  const breakdownCard = rightCol.addStack();
  breakdownCard.layoutVertically();
  breakdownCard.backgroundColor = new Color('#FFFFFF', 0.28);
  breakdownCard.cornerRadius = 12;
  breakdownCard.setPadding(9, 10, 9, 10);

  addText(breakdownCard, 'CƠ CẤU CHI PHÍ', { font: Font.boldSystemFont(8), color: BRAND.muted, lineLimit: 1 });
  breakdownCard.addSpacer(6);

  const breakdown = (data.expenseBreakdown || []).slice(0, 4);
  const bMax = Math.max(1, ...breakdown.map(r => Number(r.amount || 0)));
  breakdown.forEach((row, idx) => {
    if (idx > 0) breakdownCard.addSpacer(4);
    addLedgerRow(breakdownCard, row.label, moneyShort(row.amount));

    // Mini proportion bar
    const barTrack = breakdownCard.addStack();
    barTrack.layoutHorizontally();
    const barFill = barTrack.addStack();
    const fillPct = Math.max(0.08, Number(row.amount || 0) / bMax);
    const fillWidth = Math.round(88 * fillPct);
    barFill.size = new Size(fillWidth, 3);
    barFill.backgroundColor = new Color(BRAND.accent, 0.7);
    barFill.cornerRadius = 2;
    const barEmpty = barTrack.addStack();
    barEmpty.size = new Size(Math.max(1, 88 - fillWidth), 3);
    barEmpty.backgroundColor = new Color(BRAND.dark, 0.08);
    barEmpty.cornerRadius = 2;
  });

  rightCol.addSpacer(); // push cards to top

  // ── Warning (full-width, below columns) ──────────────────────────────────
  addWarning(widget, data);

  return widget;
}

async function main() {
  const data = await loadData().catch(err => ({ ...getSampleData(), warning: `Lỗi tải dữ liệu: ${err.message}` }));
  const family = config.widgetFamily || 'medium';
  const widget = family === 'small' ? buildSmall(data) : family === 'large' ? buildLarge(data) : buildMedium(data);
  Script.setWidget(widget);
  if (!config.runsInWidget) await widget.presentMedium();
  Script.complete();
}

main();
