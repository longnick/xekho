const vm = require('vm');
const fs = require('fs');
const path = require('path');

const errors = [];
function assert(cond, msg) { if (!cond) errors.push(msg); }

const sandbox = {
  window: {}, globalThis: {}, console, Set, Array, String, Number, Math, Object, RegExp, Error,
  isNaN, parseFloat, parseInt, Date, JSON,
  fmt: function (v) { return String(v || 0); },
};
sandbox.global = sandbox;
vm.createContext(sandbox);

const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'report', 'ads.js'), 'utf-8');
vm.runInContext(src, sandbox);

const ads = sandbox.window.XekhoApp.report;
assert(ads, 'XekhoApp.report exists');
assert(typeof ads.buildAdsRevenueReportHtml === 'function', 'buildAdsRevenueReportHtml is function');

// Test with empty summary
const html1 = ads.buildAdsRevenueReportHtml({});
assert(typeof html1 === 'string', 'returns string');
assert(html1.includes('report-ads-kpis'), 'contains kpi container');
assert(html1.includes('Doanh thu POS'), 'contains POS revenue label');

// Test with data
const html2 = ads.buildAdsRevenueReportHtml({
  posRevenue: 5000000, orderCount: 42, cogsTotal: 2000000, grossProfit: 3000000,
  adsSpendTotal: 500000, roas: 6.0, fromDate: '2026-01-01', toDate: '2026-01-07',
  reportDays: 7, facebookAdsSpend: 300000, tiktokAdsSpend: 200000,
  netAfterAdsAndExpenses: 2500000, fixedCostConfigured: true, fixedCostDaily: 100000,
});
assert(html2.includes('6.00x'), 'contains ROAS');
assert(html2.includes('2026-01-01'), 'contains fromDate');
assert(html2.includes('Facebook Ads'), 'contains Facebook breakdown');
assert(html2.includes('report-ads-row-total'), 'contains total row');

console.log(`✅ verify-report-ads: ${errors.length === 0 ? 'ALL PASSED' : errors.join('; ')}`);
if (errors.length) process.exit(1);
