'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const indexSource = fs.readFileSync(path.join(root, 'functions', 'index.js'), 'utf8');
const toolsSource = fs.readFileSync(path.join(root, 'functions', 'firestoreMegaTools.js'), 'utf8');
const geminiToolsSource = fs.readFileSync(path.join(root, 'functions', 'geminiTools.js'), 'utf8');
const reports = require(path.join(root, 'functions', 'telegram', 'reports.js'));

const intent = reports.parseTelegramSmartReportIntent('doanh thu tháng này?');
assert(intent, 'doanh thu tháng này must parse as a smart report');
assert.strictEqual(intent.metric, 'revenue', 'month revenue question must be revenue metric');
assert.strictEqual(intent.itemName, '', 'month revenue question must not be treated as item-specific');
assert.strictEqual(intent.rangeLabel, 'tháng này', 'month revenue question must use tháng này range label');

assert(indexSource.includes('process.env.BIGQUERY_PROJECT_ID'), 'BigQuery project runtime env fallback is missing');
assert(indexSource.includes('process.env.BIGQUERY_DATASET_ID'), 'BigQuery dataset runtime env fallback is missing');
assert(indexSource.includes('process.env.BIGQUERY_SALES_TABLE'), 'BigQuery sales table runtime env fallback is missing');
assert(indexSource.includes('function getBigQueryRuntimeConfig'), 'BigQuery runtime config resolver is missing');
assert(!indexSource.includes('preferBigQuery: true'), 'direct Telegram smart reports must not prefer BigQuery over Firestore/POS');
assert(indexSource.includes('fallbackBigQuery: true'), 'smart report path must keep controlled BigQuery fallback');
assert(toolsSource.includes('allowEmptyFirestoreBigQueryFallback === true'), 'empty Firestore reports must not be blindly overridden by BigQuery zeros');
assert(indexSource.includes('bigQueryConfig: getBigQueryRuntimeConfig()'), 'Gemini tool loop must pass BigQuery config');

assert(toolsSource.includes("const { GoogleAuth } = require('google-auth-library');"), 'BigQuery REST auth must use google-auth-library');
assert(toolsSource.includes('https://www.googleapis.com/auth/bigquery.readonly'), 'BigQuery scope must be read-only');
assert(toolsSource.includes('async function executeBigQueryReportQuery'), 'BigQuery report executor is missing');
assert(toolsSource.includes('useLegacySql: false'), 'BigQuery queries must use Standard SQL');
assert(toolsSource.includes("if (name === 'truy_van_bigquery_pos')"), 'Gemini tool dispatcher must support BigQuery tool');
assert(toolsSource.includes('executeBigQueryReportQuery,'), 'BigQuery executor must be exported');
assert(!/INSERT\s+INTO|UPDATE\s+`|DELETE\s+FROM|MERGE\s+`/i.test(toolsSource), 'BigQuery code must remain read-only');

assert(geminiToolsSource.includes("name: 'truy_van_bigquery_pos'"), 'Gemini BigQuery tool declaration is missing');
assert(geminiToolsSource.includes('Chỉ đọc dữ liệu'), 'Gemini BigQuery tool must be documented as read-only');

console.log('OK telegram BigQuery reporting verified');
