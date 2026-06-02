// @ts-check
'use strict';
const telegramReports = require('./reports');
const textUtils = require('../utils/text');

const { getVietnamDateParts, getInclusiveVietnamDateCount, formatAchievementPercent, buildMorningRevenueMood } = telegramReports;
const { escapeTelegramHtml, formatCurrencyVi } = textUtils;

// --- Date/Time helpers ---

/**
 * @param {Date} [date]
 * @returns {{from: Date, toExclusive: Date}}
 */
function getVietnamDayRange(date = new Date()) {
  const parts = getVietnamDateParts(date);
  const from = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, -7, 0, 0, 0));
  const toExclusive = new Date(from.getTime() + (24 * 60 * 60 * 1000));
  return { from, toExclusive };
}


/**
 * @param {string} text
 * @returns {string}
 */
function normalizeVi(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Ä‘/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


/**
 * @param {any[]} values
 * @returns {string[]}
 */
function uniqueTokens(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).map(v => String(v || '').trim()).filter(Boolean))];
}


/**
 * @param {string} text
 * @returns {{key: string, label: string}|null}
 */
function parseTimeEntity(text) {
  const t = normalizeVi(text);
  if (!t) return null;
  if (/(hom nay)\b/.test(t)) return { key: 'today', label: 'hôm nay' };
  if (/(hom qua)\b/.test(t)) return { key: 'yesterday', label: 'hôm qua' };
  if (/(tuan nay)\b/.test(t)) return { key: 'this_week', label: 'tuần này' };
  if (/(thang nay)\b/.test(t)) return { key: 'this_month', label: 'tháng này' };
  if (/(nam nay)\b/.test(t)) return { key: 'this_year', label: 'nm nay' };
  return null;
}


/**
 * @param {string} timeKey
 * @returns {{from: Date, to: Date}}
 */
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


/**
 * @param {number} value
 * @returns {string}
 */
function formatPercentVi(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return '0%';
  return `${numeric.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;
}


/**
 * @param {number} value
 * @returns {string}
 */
function formatMultipleVi(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return '0x';
  return `${numeric.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}x`;
}


/**
 * @param {Date} [date]
 * @returns {string}
 */
function getVietnamDateYmd(date = new Date()) {
  const parts = getVietnamDateParts(date);
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}


/**
 * @param {string} ymd
 * @returns {string}
 */
function formatVietnamDateDisplayFromYmd(ymd) {
  const match = String(ymd || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return String(ymd || '').trim();
  return `${match[3]}/${match[2]}/${match[1]}`;
}


/**
 * @param {string} ymd
 * @returns {{from: Date, toExclusive: Date, ymd: string}}
 */
function buildVietnamAbsoluteDayRangeFromYmd(ymd) {
  const match = String(ymd || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error(`Invalid date format: ${ymd}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const from = new Date(Date.UTC(year, month - 1, day, -7, 0, 0, 0));
  const toExclusive = new Date(from.getTime() + (24 * 60 * 60 * 1000));
  return { from, toExclusive, ymd };
}


/**
 * @param {string} fromYmd
 * @param {string} toYmd
 * @returns {{from: Date, toExclusive: Date, fromYmd: string, toYmd: string, label: string}}
 */
function buildVietnamAbsoluteRangeFromYmds(fromYmd, toYmd) {
  const start = buildVietnamAbsoluteDayRangeFromYmd(fromYmd);
  const end = buildVietnamAbsoluteDayRangeFromYmd(toYmd);
  if (end.from < start.from) throw new Error('Invalid date range');
  return {
    from: start.from,
    toExclusive: new Date(end.toExclusive.getTime()),
    fromYmd,
    toYmd,
    label: fromYmd === toYmd
      ? formatVietnamDateDisplayFromYmd(fromYmd)
      : `${formatVietnamDateDisplayFromYmd(fromYmd)} - ${formatVietnamDateDisplayFromYmd(toYmd)}`,
  };
}


/**
 * @param {string} text
 * @returns {string|null}
 */
function parseExplicitDateInput(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  let match = raw.match(/\b(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})\b/);
  if (match) {
    return `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`;
  }
  match = raw.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/);
  if (match) {
    return `${match[3]}-${String(match[2]).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`;
  }
  return null;
}


/**
 * @param {Date} [now]
 * @returns {string}
 */
function getVietnamYesterdayYmd(now = new Date()) {
  const todayRange = getVietnamDayRange(now);
  const yesterdayStart = new Date(todayRange.from.getTime() - (24 * 60 * 60 * 1000));
  return getVietnamDateYmd(yesterdayStart);
}


/**
 * @param {string} text
 * @param {Date} now
 * @param {Object} options
 * @returns {Object}
 */
function buildAdsDateRangeFromText(text = '', now = new Date(), options = {}) {
  const normalized = normalizeVi(text);
  const defaultYesterday = options.defaultYesterday !== false;

  const explicitDates = [...String(text || '').matchAll(/(\d{4}[\/-]\d{1,2}[\/-]\d{1,2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{4})/g)]
    .map(match => parseExplicitDateInput(match[1]))
    .filter(Boolean);
  if (explicitDates.length >= 2) {
    return buildVietnamAbsoluteRangeFromYmds(explicitDates[0], explicitDates[1]);
  }
  if (explicitDates.length === 1) {
    return buildVietnamAbsoluteRangeFromYmds(explicitDates[0], explicitDates[0]);
  }

  if (normalized.includes('hom qua')) {
    const ymd = getVietnamYesterdayYmd(now);
    return buildVietnamAbsoluteRangeFromYmds(ymd, ymd);
  }
  if (normalized.includes('hom nay')) {
    const ymd = getVietnamDateYmd(now);
    return buildVietnamAbsoluteRangeFromYmds(ymd, ymd);
  }

  const timeEntity = parseTimeEntity(text);
  if (timeEntity) {
    const baseRange = buildDateRange(timeEntity.key);
    const fromYmd = getVietnamDateYmd(baseRange.from);
    const toYmd = getVietnamDateYmd(baseRange.to);
    return {
      ...buildVietnamAbsoluteRangeFromYmds(fromYmd, toYmd),
      label: timeEntity.label || `${formatVietnamDateDisplayFromYmd(fromYmd)} - ${formatVietnamDateDisplayFromYmd(toYmd)}`,
    };
  }

  if (defaultYesterday) {
    const ymd = getVietnamYesterdayYmd(now);
    return buildVietnamAbsoluteRangeFromYmds(ymd, ymd);
  }

  const ymd = getVietnamDateYmd(now);
  return buildVietnamAbsoluteRangeFromYmds(ymd, ymd);
}


// --- Ads channel helpers ---

/**
 * @param {Object} input
 * @returns {Object}
 */
function buildAdsChannelMetrics(input = {}) {
  const spend = Number(input.spend || 0) || 0;
  const clicks = Number(input.clicks || 0) || 0;
  const interactions = Number(input.interactions || clicks || 0) || 0;
  const impressions = Number(input.impressions || 0) || 0;
  const reach = Number(input.reach || 0) || 0;
  const purchases = Number(input.purchases || 0) || 0;
  const addToCart = Number(input.addToCart || 0) || 0;
  return {
    ...input,
    spend,
    clicks,
    interactions,
    impressions,
    reach,
    purchases,
    addToCart,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpa: purchases > 0 ? spend / purchases : 0,
    conversionRate: clicks > 0 ? (purchases / clicks) * 100 : 0,
  };
}


/**
 * @param {any[]} channels
 * @returns {Object}
 */
function sumAdsChannels(channels = []) {
  return buildAdsChannelMetrics(channels.reduce((sum, channel) => ({
    spend: sum.spend + Number(channel?.spend || 0),
    clicks: sum.clicks + Number(channel?.clicks || 0),
    interactions: sum.interactions + Number(channel?.interactions || 0),
    impressions: sum.impressions + Number(channel?.impressions || 0),
    reach: sum.reach + Number(channel?.reach || 0),
    purchases: sum.purchases + Number(channel?.purchases || 0),
    addToCart: sum.addToCart + Number(channel?.addToCart || 0),
  }), {
    spend: 0,
    clicks: 0,
    interactions: 0,
    impressions: 0,
    reach: 0,
    purchases: 0,
    addToCart: 0,
  }));
}


/**
 * @param {number} value
 * @returns {string}
 */
function formatIntVi(value) {
  return Math.round(Number(value || 0)).toLocaleString('vi-VN');
}


/**
 * @param {Object} channel
 * @returns {string[]}
 */
function buildAdsChannelLines(channel = {}) {
  if (!channel.configured) return ['<i>Chưa cấu hình hoặc chưa có dữ liệu.</i>'];
  return [
    `Spend: <b>${escapeTelegramHtml(formatCurrencyVi(channel.spend))}</b>`,
    `Impression: <b>${escapeTelegramHtml(formatIntVi(channel.impressions))}</b>`,
    `Reach: <b>${escapeTelegramHtml(formatIntVi(channel.reach))}</b>`,
    `Click: <b>${escapeTelegramHtml(formatIntVi(channel.clicks))}</b>`,
    `CPM: <b>${escapeTelegramHtml(formatCurrencyVi(channel.cpm || 0))}</b>`,
    `CTR: <b>${escapeTelegramHtml(formatPercentVi(channel.ctr || 0))}</b>`,
    `CPC: <b>${escapeTelegramHtml(formatCurrencyVi(channel.cpc || 0))}</b>`,
    `Purchase: <b>${escapeTelegramHtml(formatIntVi(channel.purchases))}</b>`,
    `Add to Cart: <b>${escapeTelegramHtml(formatIntVi(channel.addToCart))}</b>`,
  ];
}


/**
 * @param {Object} report
 * @returns {string[]}
 */
function buildAdsInsightLines(report = {}) {
  const lines = [];
  const grossMargin = Number(report.revenue || 0) > 0
    ? (Number(report.grossProfit || 0) / Number(report.revenue || 1)) * 100
    : 0;
  if (Number(report.profit || 0) > 0) {
    lines.push(`Đang lãi sau ads: ${formatCurrencyVi(report.profit)}. Giữ ngân sách và ưu tiên nhóm có CTR cao, CPC/CPA thấp.`);
  } else if (Number(report.totalAds || 0) > 0) {
    lines.push(`Đang âm sau ads: ${formatCurrencyVi(report.profit)}. Giảm nhóm ads CPC/CPA cao hoặc tăng AOV bằng combo/upsell.`);
  } else {
    lines.push('Chưa có spend ads để đánh giá hiệu quả marketing.');
  }
  if (Number(report.total?.ctr || 0) < 1 && Number(report.total?.impressions || 0) > 0) {
    lines.push('CTR thấp: đổi creative, hook 3 giây đầu, ưu đãi rõ hơn hoặc tách lại đối tượng.');
  }
  if (Number(report.total?.clicks || 0) > 0 && Number(report.conversionRate || 0) < 2) {
    lines.push('Conversion Rate thấp: kiểm tra landing/menu, tốc độ phản hồi, giá/ưu đãi và quy trình chốt đơn.');
  }
  if (Number(report.aov || 0) > 0) {
    lines.push(`AOV POS ${formatCurrencyVi(report.aov)}; cần đẩy combo để AOV cao hơn CPA ${formatCurrencyVi(report.cpa)}.`);
  }
  lines.push(`Biên lợi nhuận gộp POS: ${formatPercentVi(grossMargin)}; ads/doanh thu: ${formatPercentVi(report.adsRevenueRatio || 0)}.`);
  return lines;
}


// --- Ads report builders ---

/**
 * @param {Object} report
 * @param {Object} options
 * @returns {string}
 */
function buildAdsRevenueDetailedMessage(report, options = {}) {
  const title = options.isTest ? '🧪 BÁO CÁO TEST ADS + DOANH THU' : '🌅 BÁO CÁO 7H ADS + DOANH THU';
  const dateLine = report.fromYmd === report.toYmd
    ? `Ngày: ${formatVietnamDateDisplayFromYmd(report.fromYmd)}`
    : `Khoảng: ${report.rangeLabel}`;
  const targetRevenueLine = Number(report.targetRevenueForRange || 0) > 0
    ? `${formatCurrencyVi(report.revenue)} / ${formatCurrencyVi(report.targetRevenueForRange)} = ${formatAchievementPercent(report.revenue, report.targetRevenueForRange)}`
    : 'Chưa có target doanh thu trong Sprint 0';
  const moodLine = buildMorningRevenueMood(report);

  const lines = [
    `<b>${escapeTelegramHtml(title)}</b>`,
    escapeTelegramHtml(dateLine),
    '',
    '<b>Tinh thần đầu ngày</b>',
    escapeTelegramHtml(moodLine),
    '',
    '<b>Mốc target doanh thu</b>',
    `Thực tế / target: <b>${escapeTelegramHtml(targetRevenueLine)}</b>`,
    Number(report.targetRevenueDaily || 0) > 0
      ? `Target ngày chuẩn: <b>${escapeTelegramHtml(formatCurrencyVi(report.targetRevenueDaily))}</b> | Số ngày tính: <b>${escapeTelegramHtml(String(report.rangeDays || 1))}</b>`
      : '<i>Chưa cấu hình target doanh thu tháng trong Sprint 0.</i>',
    '',
    '<b>POS</b>',
    `Doanh thu: <b>${escapeTelegramHtml(formatCurrencyVi(report.revenue))}</b>`,
    `Số đơn: <b>${escapeTelegramHtml(String(report.orders))}</b>`,
    `AOV POS: <b>${escapeTelegramHtml(formatCurrencyVi(report.aov || report.averageOrder))}</b>`,
    `Giá vốn: <b>${escapeTelegramHtml(formatCurrencyVi(report.cost || 0))}</b>`,
    `Lãi gộp: <b>${escapeTelegramHtml(formatCurrencyVi(report.grossProfit || 0))}</b>`,
    '',
    '<b>Facebook</b>',
    ...buildAdsChannelLines(report.facebook),
    '',
    '<b>TikTok</b>',
    ...buildAdsChannelLines(report.tiktok),
    '',
    '<b>Tổng hợp Ads + POS</b>',
    `Spend: <b>${escapeTelegramHtml(formatCurrencyVi(report.totalAds))}</b>`,
    `Click: <b>${escapeTelegramHtml(formatIntVi(report.total?.clicks || 0))}</b>`,
    `Impression: <b>${escapeTelegramHtml(formatIntVi(report.total?.impressions || 0))}</b>`,
    `Reach: <b>${escapeTelegramHtml(formatIntVi(report.total?.reach || 0))}</b>`,
    `Purchase: <b>${escapeTelegramHtml(formatIntVi(report.total?.purchases || 0))}</b>`,
    `Add to Cart: <b>${escapeTelegramHtml(formatIntVi(report.total?.addToCart || 0))}</b>`,
    `ROAS: <b>${escapeTelegramHtml(formatMultipleVi(report.roas))}</b>`,
    `CPA: <b>${escapeTelegramHtml(formatCurrencyVi(report.cpa || 0))}</b>`,
    `Conversion Rate: <b>${escapeTelegramHtml(formatPercentVi(report.conversionRate || 0))}</b>`,
    `AOV theo purchase: <b>${escapeTelegramHtml(formatCurrencyVi(report.adsAov || 0))}</b>`,
    `Lợi nhuận sau ads: <b>${escapeTelegramHtml(formatCurrencyVi(report.profit || 0))}</b>`,
    `Chi phí cố định kỳ này: <b>${escapeTelegramHtml(formatCurrencyVi(report.fixedCostForRange || 0))}</b>`,
    `Lợi nhuận sau ads + chi phí cố định: <b>${escapeTelegramHtml(formatCurrencyVi(report.profitAfterFixedCost || 0))}</b>`,
    '',
    '<b>AI Insights</b>',
    ...buildAdsInsightLines(report).map(line => `- ${escapeTelegramHtml(line)}`),
  ];

  if (Array.isArray(report.notes) && report.notes.length) {
    lines.push('', '<b>Ghi chú</b>');
    report.notes.forEach(note => lines.push(`- ${escapeTelegramHtml(note)}`));
  }

  return lines.join('\n');
}


/**
 * @param {Object} report
 * @param {Object} options
 * @returns {string}
 */
function buildAdsRevenueTelegramMessage(report, options = {}) {
  return buildAdsRevenueDetailedMessage(report, options);
  }

/**
 * @param {Object} range
 * @returns {Promise<Object>}
 */
/* eslint-disable no-undef */
async function buildAdsRevenueTelegramData(range) {
  const [posSummary, manualAds, metaAds, financialProfile] = await Promise.all([
    queryHistoryRevenue({ from: range.from, to: new Date(range.toExclusive.getTime() - 1) }),
    queryManualAdsDailyStats(range),
    fetchMetaAdsInsights(range),
    loadTelegramReportFinancialProfile(),
  ]);

  const facebook = (metaAds.source === 'meta-api')
    ? metaAds
    : (manualAds.facebook.spend > 0 || manualAds.facebook.clicks > 0 || manualAds.facebook.impressions > 0 ? buildAdsChannelMetrics({
      configured: true,
      source: 'manual',
      spend: manualAds.facebook.spend,
      clicks: manualAds.facebook.clicks,
      interactions: manualAds.facebook.interactions,
      impressions: manualAds.facebook.impressions,
      reach: manualAds.facebook.reach,
      purchases: manualAds.facebook.purchases,
      addToCart: manualAds.facebook.addToCart,
      warning: metaAds.error || '',
    }) : metaAds);

  const tiktok = (manualAds.tiktok.spend > 0 || manualAds.tiktok.clicks > 0 || manualAds.tiktok.impressions > 0)
    ? buildAdsChannelMetrics({
      configured: true,
      source: 'manual',
      spend: manualAds.tiktok.spend,
      clicks: manualAds.tiktok.clicks,
      interactions: manualAds.tiktok.interactions,
      impressions: manualAds.tiktok.impressions,
      reach: manualAds.tiktok.reach,
      purchases: manualAds.tiktok.purchases,
      addToCart: manualAds.tiktok.addToCart,
    })
    : buildAdsChannelMetrics({
      configured: false,
      source: 'missing-config',
    });

  const revenue = Number(posSummary.revenue || 0) || 0;
  const orders = Number(posSummary.orders || 0) || 0;
  const cost = Number(posSummary.cost || 0) || 0;
  const grossProfit = Number(posSummary.grossProfit || (revenue - cost)) || 0;
  const averageOrder = orders > 0 ? revenue / orders : 0;
  const total = sumAdsChannels([facebook, tiktok]);
  const totalAds = total.spend;
  const roas = totalAds > 0 ? revenue / totalAds : 0;
  const adsRevenueRatio = revenue > 0 ? (totalAds / revenue) * 100 : 0;
  const attributedPurchases = total.purchases > 0 ? total.purchases : orders;
  const cpa = attributedPurchases > 0 ? totalAds / attributedPurchases : 0;
  const conversionRate = total.clicks > 0 && attributedPurchases > 0 ? (attributedPurchases / total.clicks) * 100 : 0;
  const aov = orders > 0 ? revenue / orders : 0;
  const adsAov = attributedPurchases > 0 ? revenue / attributedPurchases : 0;
  const rangeDays = getInclusiveVietnamDateCount(range.fromYmd, range.toYmd);
  const targetRevenueDaily = Number(financialProfile?.targetMonthlyRevenue || 0) > 0
    ? Math.round((Number(financialProfile.targetMonthlyRevenue || 0) || 0) / 30)
    : 0;
  const targetRevenueForRange = targetRevenueDaily > 0 ? targetRevenueDaily * rangeDays : 0;
  const revenueAchievementPercent = targetRevenueForRange > 0 ? (revenue / targetRevenueForRange) * 100 : 0;
  const fixedCostDaily = Number(financialProfile?.dailyFixedCost || 0) || 0;
  const fixedCostForRange = fixedCostDaily * rangeDays;
  const profit = grossProfit - totalAds;
  const profitAfterFixedCost = profit - fixedCostForRange;
  const notes = [];
  if (total.purchases <= 0 && orders > 0) notes.push('CPA/Conversion Rate đang dùng số đơn POS làm tham khảo vì chưa có Purchase từ pixel/API ads.');
  if (facebook.error) notes.push(`Facebook Ads: ${facebook.error}`);
  if (!tiktok.configured) notes.push('TikTok Ads: chưa cấu hình API hoặc chưa có dữ liệu nhập tay.');

  return {
    type: 'ads-revenue',
    rangeLabel: range.label,
    fromYmd: range.fromYmd,
    toYmd: range.toYmd,
    revenue,
    orders,
    cost,
    grossProfit,
    averageOrder,
    facebook,
    tiktok,
    total,
    totalAds,
    roas,
    adsRevenueRatio,
    cpa,
    conversionRate,
    aov,
    adsAov,
    profit,
    profitAfterFixedCost,
    attributedPurchases,
    financialProfile,
    rangeDays,
    targetRevenueDaily,
    targetRevenueForRange,
    revenueAchievementPercent,
    fixedCostDaily,
    fixedCostForRange,
    notes,
  };
}



module.exports = {
  getVietnamDayRange,
  normalizeVi,
  uniqueTokens,
  parseTimeEntity,
  buildDateRange,
  formatPercentVi,
  formatMultipleVi,
  getVietnamDateYmd,
  formatVietnamDateDisplayFromYmd,
  buildVietnamAbsoluteDayRangeFromYmd,
  buildVietnamAbsoluteRangeFromYmds,
  parseExplicitDateInput,
  getVietnamYesterdayYmd,
  buildAdsDateRangeFromText,
  buildAdsChannelMetrics,
  sumAdsChannels,
  formatIntVi,
  buildAdsChannelLines,
  buildAdsInsightLines,
  buildAdsRevenueDetailedMessage,
  buildAdsRevenueTelegramMessage,
  buildAdsRevenueTelegramData,
};
