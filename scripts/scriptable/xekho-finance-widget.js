// XE KHÔ Finance Widget — modern dark revenue trend
// Paste into iOS Scriptable. Widget parameter: endpoint|token|range
// Families: small, medium, large. Revenue chart always shows latest 30 days.

const CONFIG = {
  endpoint: 'https://asia-southeast1-pos-v2-909ff.cloudfunctions.net/scriptableFinanceWidgetData',
  token: '***REVOKED_CREDENTIAL***', // Private owner token; rotate before sharing this script.
  range: 'today', // today | 7d | month
  shopName: 'XE KHÔ',
};

const COLORS = {
  bg: '#071120',
  bg2: '#0B1628',
  panel: '#101B2F',
  pill: '#111C2F',
  border: '#263955',
  text: '#F8FAFC',
  muted: '#A6B4C8',
  subtle: '#66768E',
  blue: '#4C94FF',
  green: '#6EE66F',
  orange: '#FF8A1F',
  purple: '#8B5CF6',
  red: '#FB7185',
};

function applyWidgetParameter() {
  const raw = (args.widgetParameter || '').trim();
  if (!raw) return;
  const [endpoint, token, range] = raw.split('|').map(value => String(value || '').trim());
  if (endpoint) CONFIG.endpoint = endpoint;
  if (token) CONFIG.token = token;
  if (range) CONFIG.range = range;
}

function moneyShort(value) {
  const amount = Number(value || 0);
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  if (abs >= 1000000000) return `${sign}${(abs / 1000000000).toFixed(1).replace('.', ',')} tỷ`;
  if (abs >= 1000000) return `${sign}${(abs / 1000000).toFixed(abs >= 10000000 ? 0 : 1).replace('.', ',')}tr`;
  if (abs >= 1000) return `${sign}${Math.round(abs / 1000)}k`;
  return `${sign}${Math.round(abs)}`;
}

function formatTime(iso) {
  try { return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }); }
  catch (_) { return '--:--'; }
}

function dateLabel(value) {
  const raw = String(value || '');
  const match = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}` : raw.slice(0, 5);
}

function getSampleData() {
  const base = 2850000;
  const series = Array.from({ length: 30 }, (_, index) => {
    const wave = [0.75, 1.14, 0.92, 1.31, 0.88, 1.46, 1.08][index % 7];
    const revenue = Math.round(base * wave + index * 18000);
    const expenses = Math.round(revenue * 0.61);
    return { date: `2026-07-${String(index + 1).padStart(2, '0')}`, revenue, expenses, profit: revenue - expenses };
  });
  return {
    ok: true,
    sample: true,
    rangeLabel: CONFIG.range === 'month' ? 'Tháng này' : 'Hôm nay',
    updatedAt: new Date().toISOString(),
    revenue: 4820000,
    expenses: 3390000,
    cogs: 1530000,
    profit: 1430000,
    marginPct: 29.7,
    orders: 24,
    bank: 3310000,
    cash: 1510000,
    seriesDays: 30,
    series,
  };
}

async function loadData() {
  applyWidgetParameter();
  if (!CONFIG.token) return { ...getSampleData(), warning: 'Chưa cấu hình token · đang xem mẫu' };
  const request = new Request(`${CONFIG.endpoint}?range=${encodeURIComponent(CONFIG.range)}`);
  request.headers = { Authorization: `Bearer ${CONFIG.token}` };
  request.timeoutInterval = 15;
  const data = await request.loadJSON();
  if (!data || data.ok === false) throw new Error(data?.error || 'Không tải được dữ liệu widget');
  return data;
}

function setGradient(widget) {
  const gradient = new LinearGradient();
  gradient.colors = [new Color(COLORS.bg), new Color(COLORS.bg2)];
  gradient.locations = [0, 1];
  widget.backgroundGradient = gradient;
}

function addText(parent, text, options = {}) {
  const item = parent.addText(String(text || ''));
  item.font = options.font || Font.systemFont(options.size || 12);
  item.textColor = new Color(options.color || COLORS.text);
  item.lineLimit = options.lines || 1;
  item.minimumScaleFactor = options.minimumScaleFactor || 0.72;
  return item;
}

function addHeader(widget, data, compact = false) {
  const row = widget.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const left = row.addStack();
  left.layoutVertically();
  addText(left, compact ? CONFIG.shopName : `${CONFIG.shopName} · DOANH THU`, { font: Font.boldSystemFont(compact ? 14 : 13), color: COLORS.text });
  addText(left, `${data.seriesDays || 30} ngày gần nhất · ${formatTime(data.updatedAt)}`, { size: 9, color: COLORS.muted });
  row.addSpacer();
  const live = row.addStack();
  live.backgroundColor = new Color(data.sample ? COLORS.orange : COLORS.green, 0.15);
  live.borderColor = new Color(data.sample ? COLORS.orange : COLORS.green, 0.45);
  live.borderWidth = 0.7;
  live.cornerRadius = 9;
  live.setPadding(4, 7, 4, 7);
  addText(live, data.sample ? 'MẪU' : 'LIVE', { font: Font.boldSystemFont(8), color: data.sample ? COLORS.orange : COLORS.green });
}

function addMetricCard(parent, label, value, accent, options = {}) {
  const card = parent.addStack();
  card.layoutVertically();
  if (options.width) card.size = new Size(options.width, options.height || 76);
  card.backgroundColor = new Color(COLORS.panel);
  card.borderColor = new Color(accent, 0.72);
  card.borderWidth = 0.8;
  card.cornerRadius = 12;
  card.setPadding(8, 8, 8, 8);
  addText(card, label, { font: Font.boldSystemFont(8), color: accent, lines: 1 });
  card.addSpacer(3);
  addText(card, value, { font: Font.boldSystemFont(options.big ? 22 : 16), color: COLORS.text, lines: 1 });
  if (options.note) {
    card.addSpacer(2);
    addText(card, options.note, { size: 8, color: COLORS.muted, lines: 1 });
  }
  return card;
}

// MODERN_REVENUE_30D_LINE_CHART: connected line through all real daily revenue values.
function drawRevenueTrendChart(series, width, height, compact = false) {
  const rows = (Array.isArray(series) && series.length ? series : getSampleData().series).slice(-30);
  const context = new DrawContext();
  context.size = new Size(width, height);
  context.opaque = false;
  context.respectScreenScale = true;

  const panel = new Path();
  panel.addRoundedRect(new Rect(0, 0, width, height), 13, 13);
  context.setFillColor(new Color(COLORS.panel));
  context.addPath(panel);
  context.fillPath();
  context.setStrokeColor(new Color(COLORS.border));
  context.setLineWidth(0.8);
  context.addPath(panel);
  context.strokePath();

  const left = compact ? 10 : 38;
  const right = width - 10;
  const top = compact ? 10 : 34;
  const bottom = height - (compact ? 16 : 25);
  const chartWidth = Math.max(1, right - left);
  const chartHeight = Math.max(1, bottom - top);
  const values = rows.map(row => Math.max(0, Number(row.revenue || 0)));
  const max = Math.max(1, ...values);

  if (!compact) {
    context.setFont(Font.boldSystemFont(11));
    context.setTextColor(new Color(COLORS.text));
    context.drawTextInRect('Xu hướng doanh thu', new Rect(10, 10, 170, 15));
    context.setFont(Font.systemFont(9));
    context.setTextColor(new Color(COLORS.blue));
    context.drawTextInRect('●', new Rect(width - 69, 11, 9, 12));
    context.setTextColor(new Color(COLORS.muted));
    context.drawTextInRect('Doanh thu', new Rect(width - 58, 11, 54, 12));
  }

  for (let index = 0; index < 5; index += 1) {
    const y = top + (chartHeight / 4) * index;
    const grid = new Path();
    grid.move(new Point(left, y));
    grid.addLine(new Point(right, y));
    context.setStrokeColor(new Color(COLORS.border, 0.72));
    context.setLineWidth(0.55);
    context.addPath(grid);
    context.strokePath();
    if (!compact) {
      context.setFont(Font.systemFont(7));
      context.setTextColor(new Color(COLORS.subtle));
      context.drawTextInRect(moneyShort(max * (1 - index / 4)), new Rect(3, y - 5, 32, 11));
    }
  }

  const pointFor = (value, index) => new Point(
    left + (values.length <= 1 ? chartWidth / 2 : (index / (values.length - 1)) * chartWidth),
    bottom - (value / max) * chartHeight,
  );
  const line = new Path();
  values.forEach((value, index) => {
    const point = pointFor(value, index);
    if (index === 0) line.move(point);
    else line.addLine(point);
  });
  context.setStrokeColor(new Color(COLORS.blue));
  context.setLineWidth(compact ? 2 : 2.6);
  context.addPath(line);
  context.strokePath();

  values.forEach((value, index) => {
    if (values.length > 12 && index % 3 !== 0 && index !== values.length - 1) return;
    const point = pointFor(value, index);
    const dot = new Path();
    dot.addEllipse(new Rect(point.x - 2.6, point.y - 2.6, 5.2, 5.2));
    context.setFillColor(new Color(COLORS.panel));
    context.addPath(dot);
    context.fillPath();
    context.setStrokeColor(new Color(COLORS.blue));
    context.setLineWidth(1.8);
    context.addPath(dot);
    context.strokePath();
  });

  const labelIndexes = compact ? [0, values.length - 1] : [0, 7, 14, 21, values.length - 1];
  context.setFont(Font.systemFont(7));
  context.setTextColor(new Color(COLORS.muted));
  [...new Set(labelIndexes)].forEach(index => {
    if (!rows[index]) return;
    const point = pointFor(values[index], index);
    context.drawTextInRect(dateLabel(rows[index].date), new Rect(point.x - 11, bottom + 7, 24, 10));
  });
  return context.getImage();
}

function addWarning(widget, data) {
  if (!data.warning) return;
  widget.addSpacer(4);
  addText(widget, data.warning, { size: 8, color: COLORS.orange, lines: 1 });
}

function buildSmall(data) {
  const widget = new ListWidget();
  setGradient(widget);
  widget.setPadding(13, 13, 13, 13);
  addHeader(widget, data, true);
  widget.addSpacer(10);
  addText(widget, 'DOANH THU HÔM NAY', { font: Font.boldSystemFont(9), color: COLORS.blue });
  addText(widget, moneyShort(data.revenue), { font: Font.boldSystemFont(28), color: COLORS.text });
  widget.addSpacer(7);
  const chart = widget.addImage(drawRevenueTrendChart(data.series, 132, 58, true));
  chart.imageSize = new Size(132, 58);
  widget.addSpacer();
  addText(widget, `${data.orders || 0} đơn · LN ${moneyShort(data.profit)}`, { size: 9, color: COLORS.muted });
  addWarning(widget, data);
  return widget;
}

function buildMedium(data) {
  const widget = new ListWidget();
  setGradient(widget);
  widget.setPadding(11, 12, 10, 12);
  addHeader(widget, data);
  widget.addSpacer(8);
  const metrics = widget.addStack();
  metrics.layoutHorizontally();
  metrics.spacing = 7;
  addMetricCard(metrics, 'DOANH THU', moneyShort(data.revenue), COLORS.blue, { width: 94, height: 62, big: true });
  addMetricCard(metrics, 'LỢI NHUẬN', moneyShort(data.profit), Number(data.profit || 0) >= 0 ? COLORS.green : COLORS.red, { width: 94, height: 62, big: true });
  addMetricCard(metrics, 'ĐƠN HÀNG', String(data.orders || 0), COLORS.purple, { width: 94, height: 62, big: true });
  widget.addSpacer(8);
  const chart = widget.addImage(drawRevenueTrendChart(data.series, 296, 118));
  chart.imageSize = new Size(296, 118);
  addWarning(widget, data);
  return widget;
}

function buildLarge(data) {
  const widget = new ListWidget();
  setGradient(widget);
  widget.setPadding(10, 10, 10, 10);
  addHeader(widget, data);
  widget.addSpacer(8);

  // MODERN_DARK_FOUR_METRIC_LAYOUT
  const metrics = widget.addStack();
  metrics.layoutHorizontally();
  metrics.spacing = 6;
  addMetricCard(metrics, 'DOANH THU', moneyShort(data.revenue), COLORS.blue, { width: 72, height: 72, big: true, note: data.rangeLabel || 'Hôm nay' });
  addMetricCard(metrics, 'LỢI NHUẬN', moneyShort(data.profit), Number(data.profit || 0) >= 0 ? COLORS.green : COLORS.red, { width: 72, height: 72, big: true, note: `${Number(data.marginPct || 0).toFixed(1)}% margin` });
  addMetricCard(metrics, 'CHI PHÍ', moneyShort(data.expenses), COLORS.orange, { width: 72, height: 72, big: true, note: `Giá vốn ${moneyShort(data.cogs)}` });
  addMetricCard(metrics, 'ĐƠN HÀNG', String(data.orders || 0), COLORS.purple, { width: 72, height: 72, big: true, note: `CK ${moneyShort(data.bank)}` });
  widget.addSpacer(8);

  const chart = widget.addImage(drawRevenueTrendChart(data.series, 308, 176));
  chart.imageSize = new Size(308, 176);
  widget.addSpacer(5);
  addText(widget, `30 ngày · Tiền mặt ${moneyShort(data.cash)} · Chạm widget để mở dashboard`, { size: 9, color: COLORS.muted });
  addWarning(widget, data);
  return widget;
}

async function main() {
  const data = await loadData().catch(error => ({ ...getSampleData(), warning: `Lỗi tải: ${error.message}` }));
  const family = config.widgetFamily || 'medium';
  const widget = family === 'small' ? buildSmall(data) : family === 'large' ? buildLarge(data) : buildMedium(data);
  Script.setWidget(widget);
  if (!config.runsInWidget) await widget.presentLarge();
  Script.complete();
}

main();
