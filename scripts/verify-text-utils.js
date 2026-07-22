#!/usr/bin/env node
/**
 * Sprint 2.2 verification: functions/utils/text.js exports and delegation.
 */
'use strict';

const textUtils = require('../functions/utils/text');

const required = [
  'chunkArray', 'escapeTelegramHtml', 'escapeXml',
  'scoreTelegramTextQuality', 'fixTelegramMojibake',
  'normalizeTelegramText', 'normalizeTelegramTextPreserveLines',
  'formatCurrencyVi', 'formatQtyVi',
  'getTelegramProductDisplayName', 'shouldPreferTelegramCatalogName',
];

for (const name of required) {
  if (typeof textUtils[name] !== 'function') {
    console.error(`FAIL: ${name} is not a function`);
    process.exit(1);
  }
}

// Test chunkArray
const chunks = textUtils.chunkArray([1,2,3,4,5], 2);
if (chunks.length !== 3 || chunks[0].length !== 2 || chunks[2].length !== 1) {
  console.error('FAIL: chunkArray');
  process.exit(1);
}

// Test escapeTelegramHtml
if (textUtils.escapeTelegramHtml('<b>&</b>') !== '&lt;b&gt;&amp;&lt;/b&gt;') {
  console.error('FAIL: escapeTelegramHtml');
  process.exit(1);
}

// Test escapeXml
if (textUtils.escapeXml('"a\'b<c>&') !== '&quot;a&apos;b&lt;c&gt;&amp;') {
  console.error('FAIL: escapeXml');
  process.exit(1);
}

// Test formatCurrencyVi
if (!textUtils.formatCurrencyVi(1000).includes('đ')) {
  console.error('FAIL: formatCurrencyVi');
  process.exit(1);
}

// Test formatQtyVi
if (textUtils.formatQtyVi(5) !== '5') {
  console.error('FAIL: formatQtyVi(5)');
  process.exit(1);
}

// Test normalizeTelegramText
if (textUtils.normalizeTelegramText('  hello  \n  ') !== 'hello') {
  console.error('FAIL: normalizeTelegramText');
  process.exit(1);
}

// Test fixTelegramMojibake (identity for clean text)
if (textUtils.fixTelegramMojibake('pho bo') !== 'pho bo') {
  console.error('FAIL: fixTelegramMojibake');
  process.exit(1);
}

// Test getTelegramProductDisplayName
if (textUtils.getTelegramProductDisplayName({display_name: 'Phở bò'}) !== 'Phở bò') {
  console.error('FAIL: getTelegramProductDisplayName');
  process.exit(1);
}

// Test shouldPreferTelegramCatalogName
if (textUtils.shouldPreferTelegramCatalogName('', {display_name: 'Phở bò'}) !== true) {
  console.error('FAIL: shouldPreferTelegramCatalogName empty');
  process.exit(1);
}

console.log('✅ verify-text-utils Sprint 2.2 verification passed');
