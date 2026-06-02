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
];

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
const missing = expectedFunctions.filter(fn => typeof exported[fn] !== 'function');

if (missing.length) {
  console.error('FAIL: Missing exports:', missing);
  process.exit(1);
}

if (exportedKeys.length !== expectedFunctions.length) {
  console.error('FAIL: Expected ' + expectedFunctions.length + ' exports, got ' + exportedKeys.length + ':', exportedKeys);
  process.exit(1);
}

// Verify getVietnamDateParts returns correct shape
const parts = exported.getVietnamDateParts(new Date('2025-01-15T10:30:00Z'));
if (!parts || typeof parts.year !== 'number' || typeof parts.month !== 'number') {
  console.error('FAIL: getVietnamDateParts wrong shape:', parts);
  process.exit(1);
}

// Verify normalizeTelegramSmartReportText strips diacritics
const norm = exported.normalizeTelegramSmartReportText('Doanh thu hôm nay');
if (norm !== 'doanh thu hom nay') {
  console.error('FAIL: normalizeTelegramSmartReportText wrong:', norm);
  process.exit(1);
}

// Verify normalizeTelegramWildcardText
const wild = exported.normalizeTelegramWildcardText('Phở bò?');
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
if (!(now instanceof Date)) {
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

console.log('\u2705 verify-telegram-reports Sprint 2.5 verification passed');
console.log('   ' + expectedFunctions.length + ' functions exported: ' + exportedKeys.join(', '));
