// @ts-check
'use strict';

/**
 * Pure Telegram report helper utilities.
 * No external dependencies beyond basic JS and Intl APIs.
 */

/**
 * @param {Date} [date]
 * @returns {{year: number, month: number, day: number, hour: number, minute: number}}
 */
function getVietnamDateParts(date) {
  if (!date) date = new Date();
  var dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  var parts = dtf.formatToParts(date);
  var map = {};
  parts.forEach(function(part) { if (part.type !== 'literal') map[part.type] = part.value; });
  return { year: Number(map.year), month: Number(map.month), day: Number(map.day), hour: Number(map.hour), minute: Number(map.minute) };
}

/**
 * @param {string} value
 * @returns {string}
 */
function normalizeTelegramSmartReportText(value) {
  if (!value) value = '';
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0111/g, 'd').replace(/\u0110/g, 'D').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * @param {string} value
 * @returns {string}
 */
function normalizeTelegramWildcardText(value) {
  if (!value) value = '';
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0111/g, 'd').replace(/\u0110/g, 'D').toLowerCase().replace(/[^a-z0-9?\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * @param {string} value
 * @returns {RegExp|null}
 */
function buildTelegramWildcardRegex(value) {
  if (!value) value = '';
  var normalized = normalizeTelegramWildcardText(value);
  if (!normalized || !normalized.includes('?')) return null;
  var escaped = normalized.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
  var pattern = escaped.replace(/\s+/g, '\\s+').replace(/(?:\\?\?)+/g, '[a-z0-9]{0,3}');
  if (!pattern) return null;
  return new RegExp('^' + pattern + '$', 'i');
}

/**
 * @param {string} value
 * @param {Date} fallbackNow
 * @returns {Date|null}
 */
function parseTelegramLooseDateTime(value, fallbackNow) {
  if (!value) value = '';
  if (!fallbackNow) fallbackNow = new Date();
  var raw = normalizeTelegramSmartReportText(value);
  if (!raw) return null;
  if (['bay gio', 'hien tai', 'luc nay', 'now'].includes(raw)) return fallbackNow;

  var relativeMatch = raw.match(/^(?:(\d{1,2})(?::(\d{1,2}))?|(\d{1,2})h(?:(\d{1,2}))?)?\s*(?:ngay\s*)?(hom nay|hom qua)$/i);
  if (relativeMatch) {
    var nowParts = getVietnamDateParts(fallbackNow);
    var hour = Number(relativeMatch[1] || relativeMatch[3] || 0);
    var minute = Number(relativeMatch[2] || relativeMatch[4] || 0);
    var dayOffset = String(relativeMatch[5] || '').trim() === 'hom qua' ? -1 : 0;
    var localDate = new Date(Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day + dayOffset, hour, minute, 0) - 7 * 60 * 60 * 1000);
    return Number.isNaN(localDate.getTime()) ? null : localDate;
  }

  var match = raw.match(/(?:(\d{1,2})(?::(\d{1,2}))?|(\d{1,2})h(?:(\d{1,2}))?)?\s*(?:ngay\s*)?(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?/i);
  if (!match) return null;

  var np = getVietnamDateParts(fallbackNow);
  var h = Number(match[1] || match[3] || 0);
  var m = Number(match[2] || match[4] || 0);
  var day = Number(match[5] || 0);
  var month = Number(match[6] || 0);
  var year = Number(match[7] || np.year);
  if (year > 0 && year < 100) year += 2000;
  if (!day || !month || !year) return null;
  return new Date(Date.UTC(year, month - 1, day, h, m, 0) - 7 * 60 * 60 * 1000);
}

/**
 * @param {string} fromYmd
 * @param {string} toYmd
 * @returns {number}
 */
function getInclusiveVietnamDateCount(fromYmd, toYmd) {
  var start = new Date(String(fromYmd || '').trim() + 'T00:00:00');
  var end = new Date(String(toYmd || '').trim() + 'T00:00:00');
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 1;
  return Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
}

/**
 * @param {number} value
 * @param {number} target
 * @returns {string}
 */
function formatAchievementPercent(value, target) {
  if (!value) value = 0;
  if (!target) target = 0;
  var safeTarget = Math.max(Number(target) || 0, 1);
  var percent = ((Number(value) || 0) / safeTarget) * 100;
  return percent.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + '%';
}

/**
 * @param {Object} report
 * @returns {string}
 */
function buildMorningRevenueMood(report) {
  if (!report) report = {};
  var target = Number(report.targetRevenueForRange || 0) || 0;
  var revenue = Number(report.revenue || 0) || 0;
  var percent = target > 0 ? (revenue / target) * 100 : 0;
  if (target <= 0) return 'H\u00f4m nay em ch\u01b0a d\u00e1m g\u00e1y v\u00ec Sprint 0 ch\u01b0a c\u1ea5u h\u00ecnh target doanh thu.';
  if (percent >= 120) return 'H\u00f4m nay xin ph\u00e9p g\u00e1y th\u1eadt to: qu\u00e1n \u0111ang v\u01b0\u1ee3t target r\u1ea5t \u0111\u1eb9p.';
  if (percent >= 100) return 'Tin vui \u0111\u1ea7u ng\u00e0y: \u0111\u00e3 ch\u1ea1m target doanh thu r\u1ed3i.';
  if (percent >= 80) return '\u0110ang b\u00e1m target kh\u00e1 s\u00e1t r\u1ed3i, ch\u1ec9 c\u1ea7n r\u01b0\u1edbn th\u00eam m\u1ed9t nh\u1ecbp n\u1eefa.';
  if (percent >= 60) return 'H\u00f4m nay h\u01a1i thi\u1ebfu l\u1eeda m\u1ed9t ch\u00fat, c\u1ea7n si\u1ebft l\u1ea1i n\u1ed9i dung v\u00e0 t\u1ed1c \u0111\u1ed9 ch\u1ed1t \u0111\u01a1n.';
  return 'H\u00f4m nay em t\u1ef1 nh\u1eadn l\u00e0 ch\u01b0a l\u00e0m t\u1ed1t. Doanh thu c\u00f2n d\u01b0\u1edbi 60% target.';
}

// --- Phase 10: New pure helpers ---

/**
 * @param {any} value
 * @returns {Date|null}
 */
function coerceHistoryDate(value) {
  if (value && typeof value.getTime === 'function') return value;
  if (value && value.toDate) return value.toDate();
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string' && value.trim()) return new Date(value);
  return null;
}

/**
 * @param {any} value
 * @returns {string}
 */
function formatTelegramDateTimeVi(value) {
  var date = coerceHistoryDate(value);
  if (!date || typeof date.getTime !== 'function' || Number.isNaN(date.getTime())) return 'Kh\u00f4ng r\u00f5';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(date);
}

/**
 * @param {string} payMethod
 * @returns {string}
 */
function getTelegramPayMethodLabel(payMethod) {
  var method = String(payMethod || '').trim().toLowerCase();
  if (['bank', 'transfer', 'qr', 'momo', 'zalopay'].includes(method)) return 'Chuy\u1ec3n kho\u1ea3n';
  if (['cash', 'tienmat', 'cashier'].includes(method)) return 'Ti\u1ec1n m\u1eb7t';
  return method || 'Kh\u00f4ng r\u00f5';
}

/**
 * @param {string} payMethod
 * @returns {boolean}
 */
function isTelegramBankPayMethod(payMethod) {
  return ['bank', 'transfer', 'qr', 'momo', 'zalopay'].includes(String(payMethod || '').trim().toLowerCase());
}

/**
 * @param {any} from
 * @param {any} toExclusive
 * @returns {string}
 */
function formatTelegramSmartRangeLabel(from, toExclusive) {
  return 't\u1eeb ' + formatTelegramDateTimeVi(from) + ' \u0111\u1ebfn ' + formatTelegramDateTimeVi(toExclusive);
}

/**
 * @param {Date} date
 * @returns {Date}
 */
function getVietnamStartOfDay(date) {
  var parts = getVietnamDateParts(date || new Date());
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0) - 7 * 60 * 60 * 1000);
}

/**
 * @param {Date} date
 * @param {number} days
 * @returns {Date}
 */
function addDays(date, days) {
  return new Date((date || new Date()).getTime() + Number(days || 0) * 24 * 60 * 60 * 1000);
}

/**
 * @param {string} normalized
 * @returns {string}
 */
function inferTelegramRelativeScope(normalized) {
  var text = String(normalized || '');
  if (/\bhom qua\b/.test(text)) return 'hom_qua';
  if (/\bhom nay\b/.test(text)) return 'hom_nay';
  if (/\btuan nay\b/.test(text)) return 'tuan_nay';
  if (/\bthang nay\b/.test(text)) return 'thang_nay';
  if (/\bnam nay\b/.test(text)) return 'nam_nay';
  return '';
}

/**
 * @param {string} scope
 * @param {Date} fallbackNow
 * @returns {{from: Date, toExclusive: Date, label: string}|null}
 */
function buildTelegramRelativeReportRange(scope, fallbackNow) {
  var now = fallbackNow || new Date();
  var todayStart = getVietnamStartOfDay(now);
  if (scope === 'hom_qua') return { from: addDays(todayStart, -1), toExclusive: todayStart, label: 'hôm qua' };
  if (scope === 'hom_nay') return { from: todayStart, toExclusive: addDays(todayStart, 1), label: 'hôm nay' };
  if (scope === 'tuan_nay') {
    var parts = getVietnamDateParts(now);
    var localNoon = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));
    var dayIndex = (localNoon.getUTCDay() + 6) % 7;
    return { from: addDays(todayStart, -dayIndex), toExclusive: addDays(todayStart, 1), label: 'tuần này' };
  }
  if (scope === 'thang_nay') {
    var monthParts = getVietnamDateParts(now);
    var fromMonth = new Date(Date.UTC(monthParts.year, monthParts.month - 1, 1, 0, 0, 0) - 7 * 60 * 60 * 1000);
    return { from: fromMonth, toExclusive: addDays(todayStart, 1), label: 'tháng này' };
  }
  if (scope === 'nam_nay') {
    var yearParts = getVietnamDateParts(now);
    var fromYear = new Date(Date.UTC(yearParts.year, 0, 1, 0, 0, 0) - 7 * 60 * 60 * 1000);
    return { from: fromYear, toExclusive: addDays(todayStart, 1), label: 'năm nay' };
  }
  return null;
}

/**
 * @param {string} normalized
 * @returns {string}
 */
function extractTelegramSmartReportItemName(normalized) {
  var item = String(normalized || '')
    .replace(/\?/g, ' ')
    .replace(/\b(hom qua|hom nay|tuan nay|thang nay|nam nay)\b/g, ' ')
    .replace(/\b(tu|den|bay gio|hien tai|luc nay|now)\b/g, ' ')
    .replace(/\b(doanh thu|loi nhuan|lai gop|lai|ban duoc bao nhieu|ban bao nhieu|ban duoc may|ban may|duoc bao nhieu|co bao nhieu don|so don|hoa don|don hang)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return item;
}

/**
 * @param {string} userText
 * @returns {Object|null}
 */
function parseTelegramSmartReportIntent(userText) {
  if (!userText) userText = '';
  var normalized = normalizeTelegramSmartReportText(userText);
  if (!normalized) return null;
  var asksQuantity = /\b(ban duoc bao nhieu|ban bao nhieu|ban duoc may|ban may|duoc bao nhieu)\b/.test(normalized);
  var metric = normalized.includes('doanh thu') ? 'revenue'
    : (normalized.includes('loi nhuan') || normalized.includes('lai gop') || normalized.includes('lai bao nhieu') || normalized.includes('lai ')) ? 'profit'
    : asksQuantity ? 'quantity'
    : (normalized.includes('co bao nhieu don') || normalized.includes('so don') || normalized.includes('hoa don')) ? 'summary'
    : '';
  if (!metric) return null;
  var rangeMatch = normalized.match(/\btu\s+(.+?)\s+\bden\s+(bay gio|hien tai|luc nay|now)\b/i);
  if (rangeMatch) {
    var beforeRange = normalized.slice(0, rangeMatch.index).trim();
    var itemName = extractTelegramSmartReportItemName(beforeRange);
    var from = parseTelegramLooseDateTime(rangeMatch[1], new Date());
    if (!from) return null;
    var toExclusive = new Date();
    var rangeLabel = formatTelegramSmartRangeLabel(from, toExclusive);
    return { metric: metric, itemName: itemName || '', rangeLabel: rangeLabel, from: from, toExclusive: toExclusive };
  }

  var scope = inferTelegramRelativeScope(normalized);
  if (!scope) return null;
  var relativeRange = buildTelegramRelativeReportRange(scope, new Date());
  if (!relativeRange) return null;
  var relativeItemName = extractTelegramSmartReportItemName(normalized);
  if (metric === 'quantity' && !relativeItemName) metric = 'summary';
  return {
    metric: metric,
    itemName: relativeItemName || '',
    rangeLabel: relativeRange.label,
    from: relativeRange.from,
    toExclusive: relativeRange.toExclusive,
  };
}

var DEFAULT_TELEGRAM_REPORT_SETTINGS = {
  enabled: true, sendHour: 7, sendMinute: 0, includeRevenue: true,
  includePaymentBreakdown: true, includeInvoiceCount: true, includeTopItem: true, includeRetailStock: true,
};

/**
 * @param {Date} [now]
 * @returns {{from: Date, toExclusive: Date, label: string}}
 */
function getVietnamBusinessReportRange(now) {
  if (!now) now = new Date();
  var parts = getVietnamDateParts(now);
  var todaySixAmUtc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, -1, 0, 0, 0));
  var latestWindowEnd = (parts.hour >= 6) ? todaySixAmUtc : new Date(todaySixAmUtc.getTime() - (24 * 60 * 60 * 1000));
  var from = new Date(latestWindowEnd.getTime() - (24 * 60 * 60 * 1000));
  var toExclusive = latestWindowEnd;
  var labelStart = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).format(from);
  var labelEnd = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(toExclusive.getTime() - 1));
  return { from: from, toExclusive: toExclusive, label: labelStart + ' -> ' + labelEnd };
}

/**
 * @param {Object} raw
 * @returns {Object}
 */
function getTelegramReportSettings(raw) {
  if (!raw) raw = {};
  var hour = Math.min(23, Math.max(0, parseInt(raw.telegramReportSendHour, 10) || DEFAULT_TELEGRAM_REPORT_SETTINGS.sendHour));
  var minute = Math.min(59, Math.max(0, parseInt(raw.telegramReportSendMinute, 10) || DEFAULT_TELEGRAM_REPORT_SETTINGS.sendMinute));
  return {
    enabled: raw.telegramReportEnabled !== false, sendHour: hour, sendMinute: minute,
    includeRevenue: raw.telegramReportIncludeRevenue !== false,
    includePaymentBreakdown: raw.telegramReportIncludePaymentBreakdown !== false,
    includeInvoiceCount: raw.telegramReportIncludeInvoiceCount !== false,
    includeTopItem: raw.telegramReportIncludeTopItem !== false,
    includeRetailStock: raw.telegramReportIncludeRetailStock !== false,
    lastSentRangeKey: String(raw.telegramReportLastSentRangeKey || '').trim(),
  };
}

/**
 * @param {Object} range
 * @returns {string}
 */
function getTelegramReportRangeKey(range) {
  return range.from.toISOString() + '__' + range.toExclusive.toISOString();
}

/**
 * @param {Object} settings
 * @param {Date} [now]
 * @param {Object} [range]
 * @returns {{shouldSend: boolean, reason: string, range: Object, rangeKey?: string}}
 */
function shouldSendTelegramReportNow(settings, now, range) {
  if (!now) now = new Date();
  if (!range) range = getVietnamBusinessReportRange(now);
  if (!settings || !settings.enabled) return { shouldSend: false, reason: 'disabled', range: range };
  var parts = getVietnamDateParts(now);
  var currentMinuteOfDay = (parts.hour * 60) + parts.minute;
  var targetMinuteOfDay = (Number(settings.sendHour || 0) * 60) + Number(settings.sendMinute || 0);
  if (currentMinuteOfDay < targetMinuteOfDay || currentMinuteOfDay >= (targetMinuteOfDay + 5)) {
    return { shouldSend: false, reason: 'outside-window', range: range };
  }
  var rangeKey = getTelegramReportRangeKey(range);
  if (String(settings.lastSentRangeKey || '') === rangeKey) {
    return { shouldSend: false, reason: 'already-sent', range: range, rangeKey: rangeKey };
  }
  return { shouldSend: true, reason: 'ready', range: range, rangeKey: rangeKey };
}

module.exports = {
  getVietnamDateParts: getVietnamDateParts,
  normalizeTelegramSmartReportText: normalizeTelegramSmartReportText,
  normalizeTelegramWildcardText: normalizeTelegramWildcardText,
  buildTelegramWildcardRegex: buildTelegramWildcardRegex,
  parseTelegramLooseDateTime: parseTelegramLooseDateTime,
  getInclusiveVietnamDateCount: getInclusiveVietnamDateCount,
  formatAchievementPercent: formatAchievementPercent,
  buildMorningRevenueMood: buildMorningRevenueMood,
  coerceHistoryDate: coerceHistoryDate,
  formatTelegramDateTimeVi: formatTelegramDateTimeVi,
  getTelegramPayMethodLabel: getTelegramPayMethodLabel,
  isTelegramBankPayMethod: isTelegramBankPayMethod,
  formatTelegramSmartRangeLabel: formatTelegramSmartRangeLabel,
  inferTelegramRelativeScope: inferTelegramRelativeScope,
  buildTelegramRelativeReportRange: buildTelegramRelativeReportRange,
  extractTelegramSmartReportItemName: extractTelegramSmartReportItemName,
  parseTelegramSmartReportIntent: parseTelegramSmartReportIntent,
  DEFAULT_TELEGRAM_REPORT_SETTINGS: DEFAULT_TELEGRAM_REPORT_SETTINGS,
  getVietnamBusinessReportRange: getVietnamBusinessReportRange,
  getTelegramReportSettings: getTelegramReportSettings,
  getTelegramReportRangeKey: getTelegramReportRangeKey,
  shouldSendTelegramReportNow: shouldSendTelegramReportNow,
};
