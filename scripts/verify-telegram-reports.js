'use strict';

const vm = require('vm');
const fs = require('fs');
const path = require('path');

const reportsPath = path.resolve(__dirname, '..', 'functions', 'telegram', 'reports.js');
const reportsSrc = fs.readFileSync(reportsPath, 'utf-8');

const expectedFunctions = [
  'getVietnamDateParts',
  'normalizeTelegramSmartReportText',
  'normalizeTelegramWildcardText',
  'buildTelegramWildcardRegex',
  'parseTelegramLooseDateTime',
  'getInclusiveVietnamDateCount',
  'formatAchievementPercent',
  'buildMorningRevenueMood',
  'coerceHistoryDate',
  'formatTelegramDateTimeVi',
  'getTelegramPayMethodLabel',
  'isTelegramBankPayMethod',
  'formatTelegramSmartRangeLabel',
  'parseTelegramSmartReportIntent',
  'getVietnamBusinessReportRange',
  'getTelegramReportSettings',
  'getTelegramReportRangeKey',
  'shouldSendTelegramReportNow',
];

const expectedConstants = ['DEFAULT_TELEGRAM_REPORT_SETTINGS'];

const sandbox = {
  module: { exports: {} },
  exports: {},
  require: () => { throw new Error('No requires expected'); },
};
vm.createContext(sandbox);
const script = new vm.Script(reportsSrc, { filename: 'reports.js' });
script.runInContext(sandbox);

const exported = sandbox.module.exports;
const exportedKeys = Object.keys(exported);
const allExpected = [...expectedFunctions, ...expectedConstants];
const missing = allExpected.filter(k => exported[k] === undefined);

if (missing.length) {
  console.error('FAIL: Missing exports:', missing);
  process.exit(1);
}

const missingFns = expectedFunctions.filter(fn => typeof exported[fn] !== 'function');
if (missingFns.length) {
  console.error('FAIL: Not functions:', missingFns);
  process.exit(1);
}

// Verify getVietnamDateParts returns correct shape
const parts = exported.getVietnamDateParts(new Date('2025-01-15T10:30:00Z'));
if (!parts || typeof parts.year !== 'number' || typeof parts.month !== 'number') {
  console.error('FAIL: getVietnamDateParts wrong shape:', parts);
  process.exit(1);
}

// Verify normalizeTelegramSmartReportText strips diacritics
const norm = exported.normalizeTelegramSmartReportText('Doanh thu h\u00f4m nay');
if (norm !== 'doanh thu hom nay') {
  console.error('FAIL: normalizeTelegramSmartReportText wrong:', norm);
  process.exit(1);
}

// Verify normalizeTelegramWildcardText
const wild = exported.normalizeTelegramWildcardText('Ph\u1edf b\u00f2?');
if (!wild.includes('pho bo')) {
  console.error('FAIL: normalizeTelegramWildcardText wrong:', wild);
  process.exit(1);
}

// Verify buildTelegramWildcardRegex
const regex = exported.buildTelegramWildcardRegex('ph? bo');
if (!regex || regex.constructor.name !== 'RegExp') {
  console.error('FAIL: buildTelegramWildcardRegex should return RegExp');
  process.exit(1);
}
const noRegex = exported.buildTelegramWildcardRegex('pho bo');
if (noRegex !== null) {
  console.error('FAIL: buildTelegramWildcardRegex without ? should return null');
  process.exit(1);
}

// Verify parseTelegramLooseDateTime
const now = exported.parseTelegramLooseDateTime('bay gio', new Date('2025-01-15T10:30:00Z'));
if (!now || typeof now.getTime !== 'function') {
  console.error('FAIL: parseTelegramLooseDateTime "bay gio" should return Date');
  process.exit(1);
}
const empty = exported.parseTelegramLooseDateTime('', new Date());
if (empty !== null) {
  console.error('FAIL: parseTelegramLooseDateTime empty should return null');
  process.exit(1);
}

// Verify getInclusiveVietnamDateCount
if (exported.getInclusiveVietnamDateCount('2025-01-01', '2025-01-01') !== 1) {
  console.error('FAIL: Same day should return 1');
  process.exit(1);
}
if (exported.getInclusiveVietnamDateCount('2025-01-01', '2025-01-03') !== 3) {
  console.error('FAIL: 3-day range should return 3');
  process.exit(1);
}

// Verify formatAchievementPercent
const pct = exported.formatAchievementPercent(75, 100);
if (!pct.includes('75') || !pct.includes('%')) {
  console.error('FAIL: formatAchievementPercent wrong:', pct);
  process.exit(1);
}

// Verify buildMorningRevenueMood
const mood = exported.buildMorningRevenueMood({ targetRevenueForRange: 1000000, revenue: 1200000 });
if (!mood.includes('v\u01b0\u1ee3t target')) {
  console.error('FAIL: buildMorningRevenueMood over target wrong:', mood);
  process.exit(1);
}
const moodLow = exported.buildMorningRevenueMood({ targetRevenueForRange: 1000000, revenue: 500000 });
if (!moodLow.includes('ch\u01b0a l\u00e0m t\u1ed1t')) {
  console.error('FAIL: buildMorningRevenueMood low wrong:', moodLow);
  process.exit(1);
}

// Phase 10: New function tests

// coerceHistoryDate
const d1 = exported.coerceHistoryDate(new Date('2025-06-01'));
if (!d1 || typeof d1.getTime !== 'function') { console.error('FAIL: coerceHistoryDate Date passthrough'); process.exit(1); }
const d2 = exported.coerceHistoryDate('2025-06-01T10:00:00Z');
if (!d2 || typeof d2.getTime !== 'function') { console.error('FAIL: coerceHistoryDate string'); process.exit(1); }
const d3 = exported.coerceHistoryDate(1717238400000);
if (!d3 || typeof d3.getTime !== 'function') { console.error('FAIL: coerceHistoryDate number'); process.exit(1); }
const d4 = exported.coerceHistoryDate(null);
if (d4 !== null) { console.error('FAIL: coerceHistoryDate null should be null'); process.exit(1); }

// formatTelegramDateTimeVi
const fmtDate = exported.formatTelegramDateTimeVi('2025-06-01T10:30:00Z');
if (typeof fmtDate !== 'string' || fmtDate.length < 5) { console.error('FAIL: formatTelegramDateTimeVi:', fmtDate); process.exit(1); }

// getTelegramPayMethodLabel
if (exported.getTelegramPayMethodLabel('bank') !== 'Chuy\u1ec3n kho\u1ea3n') { console.error('FAIL: getTelegramPayMethodLabel bank'); process.exit(1); }
if (exported.getTelegramPayMethodLabel('cash') !== 'Ti\u1ec1n m\u1eb7t') { console.error('FAIL: getTelegramPayMethodLabel cash'); process.exit(1); }
if (exported.getTelegramPayMethodLabel('') !== 'Kh\u00f4ng r\u00f5') { console.error('FAIL: getTelegramPayMethodLabel empty'); process.exit(1); }

// isTelegramBankPayMethod
if (!exported.isTelegramBankPayMethod('bank')) { console.error('FAIL: isTelegramBankPayMethod bank'); process.exit(1); }
if (exported.isTelegramBankPayMethod('cash')) { console.error('FAIL: isTelegramBankPayMethod cash should be false'); process.exit(1); }

// formatTelegramSmartRangeLabel
const rangeLabel = exported.formatTelegramSmartRangeLabel(new Date('2025-06-01T00:00:00Z'), new Date('2025-06-02T00:00:00Z'));
if (!rangeLabel.includes('t\u1eeb') || !rangeLabel.includes('\u0111\u1ebfn')) { console.error('FAIL: formatTelegramSmartRangeLabel:', rangeLabel); process.exit(1); }

// parseTelegramSmartReportIntent
const intent = exported.parseTelegramSmartReportIntent('doanh thu tu 8h ngay 15/6 den bay gio');
if (!intent || intent.metric !== 'revenue') { console.error('FAIL: parseTelegramSmartReportIntent revenue:', intent); process.exit(1); }
const intentNull = exported.parseTelegramSmartReportIntent('hello world');
if (intentNull !== null) { console.error('FAIL: parseTelegramSmartReportIntent non-matching should be null'); process.exit(1); }

// DEFAULT_TELEGRAM_REPORT_SETTINGS
const defaults = exported.DEFAULT_TELEGRAM_REPORT_SETTINGS;
if (!defaults || defaults.sendHour !== 7 || defaults.enabled !== true) { console.error('FAIL: DEFAULT_TELEGRAM_REPORT_SETTINGS:', defaults); process.exit(1); }

// getVietnamBusinessReportRange
const reportRange = exported.getVietnamBusinessReportRange(new Date('2025-06-01T10:00:00Z'));
if (!reportRange || !reportRange.from || !reportRange.toExclusive || !reportRange.label) { console.error('FAIL: getVietnamBusinessReportRange shape:', reportRange); process.exit(1); }

// getTelegramReportSettings
const settings = exported.getTelegramReportSettings({ telegramReportEnabled: true, telegramReportSendHour: 8 });
if (!settings || settings.sendHour !== 8 || settings.enabled !== true) { console.error('FAIL: getTelegramReportSettings:', settings); process.exit(1); }

// getTelegramReportRangeKey
const rangeKey = exported.getTelegramReportRangeKey({ from: new Date('2025-06-01'), toExclusive: new Date('2025-06-02') });
if (typeof rangeKey !== 'string' || !rangeKey.includes('__')) { console.error('FAIL: getTelegramReportRangeKey:', rangeKey); process.exit(1); }

// shouldSendTelegramReportNow
const result = exported.shouldSendTelegramReportNow({ enabled: false });
if (!result || result.shouldSend !== false || result.reason !== 'disabled') { console.error('FAIL: shouldSendTelegramReportNow disabled:', result); process.exit(1); }

console.log('\u2705 verify-telegram-reports Phase 10 verification passed');
console.log('   ' + exportedKeys.length + ' exports: ' + exportedKeys.join(', '));
