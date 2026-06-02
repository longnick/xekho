'use strict';
const vm = require('vm');

// Load the module
const ads = require('../functions/telegram/ads');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; console.log('  ✅ ' + msg); }
  else { failed++; console.log('  ❌ ' + msg); }
}

console.log('=== Phase 10.2: functions/telegram/ads.js verification ===\n');

// Check exports exist
const expectedExports = [
  'getVietnamDayRange', 'normalizeVi', 'uniqueTokens', 'parseTimeEntity',
  'buildDateRange', 'formatPercentVi', 'formatMultipleVi',
  'getVietnamDateYmd', 'formatVietnamDateDisplayFromYmd',
  'buildVietnamAbsoluteDayRangeFromYmd', 'buildVietnamAbsoluteRangeFromYmds',
  'parseExplicitDateInput', 'getVietnamYesterdayYmd', 'buildAdsDateRangeFromText',
  'buildAdsChannelMetrics', 'sumAdsChannels', 'formatIntVi',
  'buildAdsChannelLines', 'buildAdsInsightLines',
  'buildAdsRevenueDetailedMessage', 'buildAdsRevenueTelegramMessage',
  'buildAdsRevenueTelegramData',
];

console.log('Export checks:');
for (const name of expectedExports) {
  assert(typeof ads[name] === 'function', `export ${name} is function`);
}

// Test normalizeVi
console.log('\nnormalizeVi:');
assert(ads.normalizeVi('Xin chào') === 'xin chao', 'strips diacritics');
assert(ads.normalizeVi('  hello  world  ') === 'hello world', 'trims and normalizes spaces');
assert(ads.normalizeVi(null) === '', 'handles null');

// Test uniqueTokens
console.log('\nuniqueTokens:');
const tokens = ads.uniqueTokens(['a', 'b', 'a', '', 'c']);
assert(tokens.length === 3, 'deduplicates: ' + JSON.stringify(tokens));
assert(tokens[0] === 'a' && tokens[1] === 'b' && tokens[2] === 'c', 'order preserved');

// Test parseTimeEntity
console.log('\nparseTimeEntity:');
const today = ads.parseTimeEntity('hôm nay');
assert(today && today.key === 'today', 'parses hôm nay: ' + JSON.stringify(today));
const yesterday = ads.parseTimeEntity('hôm qua');
assert(yesterday && yesterday.key === 'yesterday', 'parses hôm qua');
assert(ads.parseTimeEntity('xyz') === null, 'returns null for unknown');

// Test buildDateRange
console.log('\nbuildDateRange:');
const todayRange = ads.buildDateRange('today');
assert(todayRange.from instanceof Date && todayRange.to instanceof Date, 'returns Date objects');
assert(todayRange.from < todayRange.to, 'from < to');

// Test formatPercentVi
console.log('\nformatPercentVi:');
assert(ads.formatPercentVi(12.5).includes('12'), 'formats 12.5');
assert(ads.formatPercentVi(0) === '0%', 'formats 0');
assert(ads.formatPercentVi(null) === '0%', 'handles null');

// Test formatMultipleVi
console.log('\nformatMultipleVi:');
assert(ads.formatMultipleVi(2.5).includes('2'), 'formats 2.5');
assert(ads.formatMultipleVi(0) === '0x', 'formats 0');

// Test formatIntVi
console.log('\nformatIntVi:');
assert(ads.formatIntVi(1234) === '1.234', 'formats 1234');
assert(ads.formatIntVi(0) === '0', 'formats 0');

// Test getVietnamDateYmd
console.log('\ngetVietnamDateYmd:');
const ymd = ads.getVietnamDateYmd(new Date(2026, 0, 15));
assert(/^\d{4}-\d{2}-\d{2}$/.test(ymd), 'returns YYYY-MM-DD: ' + ymd);

// Test formatVietnamDateDisplayFromYmd
console.log('\nformatVietnamDateDisplayFromYmd:');
assert(ads.formatVietnamDateDisplayFromYmd('2026-01-15') === '15/01/2026', 'formats date');
assert(ads.formatVietnamDateDisplayFromYmd('') === '', 'handles empty');

// Test buildVietnamAbsoluteDayRangeFromYmd
console.log('\nbuildVietnamAbsoluteDayRangeFromYmd:');
const dayRange = ads.buildVietnamAbsoluteDayRangeFromYmd('2026-01-15');
assert(dayRange.from instanceof Date, 'has from Date');
assert(dayRange.toExclusive instanceof Date, 'has toExclusive Date');
assert(dayRange.ymd === '2026-01-15', 'preserves ymd');

// Test buildVietnamAbsoluteRangeFromYmds
console.log('\nbuildVietnamAbsoluteRangeFromYmds:');
const range = ads.buildVietnamAbsoluteRangeFromYmds('2026-01-10', '2026-01-15');
assert(range.fromYmd === '2026-01-10', 'fromYmd correct');
assert(range.toYmd === '2026-01-15', 'toYmd correct');
assert(typeof range.label === 'string', 'has label');

// Test parseExplicitDateInput
console.log('\nparseExplicitDateInput:');
assert(ads.parseExplicitDateInput('2026-01-15') === '2026-01-15', 'parses YYYY-MM-DD');
assert(ads.parseExplicitDateInput('15/01/2026') === '2026-01-15', 'parses DD/MM/YYYY');
assert(ads.parseExplicitDateInput('') === null, 'returns null for empty');

// Test getVietnamYesterdayYmd
console.log('\ngetVietnamYesterdayYmd:');
const yesterdayYmd = ads.getVietnamYesterdayYmd();
assert(/^\d{4}-\d{2}-\d{2}$/.test(yesterdayYmd), 'returns valid date: ' + yesterdayYmd);

// Test buildAdsChannelMetrics
console.log('\nbuildAdsChannelMetrics:');
const metrics = ads.buildAdsChannelMetrics({ spend: 100, clicks: 50, impressions: 1000 });
assert(metrics.spend === 100, 'spend preserved');
assert(metrics.cpc === 2, 'cpc calculated: ' + metrics.cpc);
assert(metrics.ctr === 5, 'ctr calculated: ' + metrics.ctr);

// Test sumAdsChannels
console.log('\nsumAdsChannels:');
const sum = ads.sumAdsChannels([
  { spend: 100, clicks: 50, interactions: 50, impressions: 1000, reach: 800, purchases: 5, addToCart: 10 },
  { spend: 200, clicks: 80, interactions: 80, impressions: 2000, reach: 1500, purchases: 10, addToCart: 20 },
]);
assert(sum.spend === 300, 'sums spend: ' + sum.spend);
assert(sum.clicks === 130, 'sums clicks: ' + sum.clicks);

// Test buildAdsChannelLines
console.log('\nbuildAdsChannelLines:');
const configured = ads.buildAdsChannelLines({ configured: true, spend: 100, impressions: 1000, reach: 800, clicks: 50, cpm: 100, ctr: 5, cpc: 2, purchases: 5, addToCart: 10 });
assert(Array.isArray(configured), 'returns array');
assert(configured.length === 9, '9 lines for configured channel');
const unconfigured = ads.buildAdsChannelLines({});
assert(unconfigured.length === 1, '1 line for unconfigured');

// Test buildAdsInsightLines
console.log('\nbuildAdsInsightLines:');
const insights = ads.buildAdsInsightLines({ revenue: 1000, grossProfit: 500, profit: 200, totalAds: 100, total: { ctr: 2, impressions: 1000, clicks: 50 }, conversionRate: 5, aov: 200, cpa: 20, adsRevenueRatio: 10 });
assert(Array.isArray(insights), 'returns array');
assert(insights.length >= 3, 'at least 3 insight lines: ' + insights.length);

// Test buildAdsDateRangeFromText
console.log('\nbuildAdsDateRangeFromText:');
const textRange = ads.buildAdsDateRangeFromText('hôm qua');
assert(textRange.fromYmd && textRange.toYmd, 'has fromYmd/toYmd: ' + JSON.stringify({ from: textRange.fromYmd, to: textRange.toYmd }));

// Summary
console.log('\n' + '='.repeat(50));
console.log('Total: ' + (passed + failed) + ' | Passed: ' + passed + ' | Failed: ' + failed);
if (failed > 0) process.exit(1);
console.log('✅ Phase 10.2 ads verification PASSED');
