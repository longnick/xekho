/**
 * Verification script for functions/utils/general.js extraction.
 *
 * Tests that the 6 extracted utility functions in general.js
 * produce correct results.
 */
'use strict';

const assert = require('assert');

// --- Load modules ---
const generalUtils = require('../functions/utils/general');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

console.log('Verifying functions/utils/general.js extraction...\n');

// --- 1. json ---
test('json sends status + JSON body', () => {
  let statusCode = null;
  let contentType = null;
  let body = null;
  const fakeRes = {
    status(code) { statusCode = code; return this; },
    set(k, v) { contentType = v; return this; },
    send(b) { body = b; },
  };
  generalUtils.json(fakeRes, 200, { ok: true });
  assert.strictEqual(statusCode, 200);
  assert.strictEqual(contentType, 'application/json; charset=utf-8');
  assert.strictEqual(body, '{"ok":true}');
});

// --- 2. wrapSvgText ---
test('wrapSvgText splits long text into max 3 lines', () => {
  const result = generalUtils.wrapSvgText('A B C D E F G H I J K L M N O P Q R S T U V W X Y Z', 10);
  assert.ok(Array.isArray(result));
  assert.ok(result.length <= 3);
  assert.ok(result[0].length > 0);
});

test('wrapSvgText returns [""] for empty input', () => {
  assert.deepStrictEqual(generalUtils.wrapSvgText('', 36), ['']);
  assert.deepStrictEqual(generalUtils.wrapSvgText(null, 36), ['']);
});

test('wrapSvgText keeps short text as single line', () => {
  assert.deepStrictEqual(generalUtils.wrapSvgText('Hello world', 36), ['Hello world']);
});

// --- 3. stripDataUrlBase64 ---
test('stripDataUrlBase64 removes data URL prefix', () => {
  assert.strictEqual(
    generalUtils.stripDataUrlBase64('data:image/png;base64,abc123'),
    'abc123',
  );
});

test('stripDataUrlBase64 returns plain text unchanged', () => {
  assert.strictEqual(generalUtils.stripDataUrlBase64('abc123'), 'abc123');
});

test('stripDataUrlBase64 handles empty/null', () => {
  assert.strictEqual(generalUtils.stripDataUrlBase64(''), '');
  assert.strictEqual(generalUtils.stripDataUrlBase64(null), '');
});

// --- 4. extractFirstJson ---
test('extractFirstJson parses embedded JSON', () => {
  const result = generalUtils.extractFirstJson('Here is data {"a":1,"b":"hi"} done');
  assert.deepStrictEqual(result, { a: 1, b: 'hi' });
});

test('extractFirstJson returns null for no JSON', () => {
  assert.strictEqual(generalUtils.extractFirstJson('no json here'), null);
});

test('extractFirstJson handles nested objects', () => {
  const result = generalUtils.extractFirstJson('text {"a":{"b":2}} end');
  assert.deepStrictEqual(result, { a: { b: 2 } });
});

test('extractFirstJson returns null for empty input', () => {
  assert.strictEqual(generalUtils.extractFirstJson(''), null);
  assert.strictEqual(generalUtils.extractFirstJson(null), null);
});

// --- 5. mapToolActionType ---
test('mapToolActionType maps goi_mon_ban → goi_mon', () => {
  assert.strictEqual(generalUtils.mapToolActionType('goi_mon_ban'), 'goi_mon');
});

test('mapToolActionType maps nhap_hang_thu_cong → nhap_hang', () => {
  assert.strictEqual(generalUtils.mapToolActionType('nhap_hang_thu_cong'), 'nhap_hang');
});

test('mapToolActionType passes through unknown types', () => {
  assert.strictEqual(generalUtils.mapToolActionType('checkout'), 'checkout');
});

test('mapToolActionType returns "unknown" for empty input', () => {
  assert.strictEqual(generalUtils.mapToolActionType(''), 'unknown');
  assert.strictEqual(generalUtils.mapToolActionType(null), 'unknown');
});

// --- 6. buildAiRouterPendingResponse ---
test('buildAiRouterPendingResponse returns pending_confirmation shape', () => {
  const result = generalUtils.buildAiRouterPendingResponse(
    { actionType: 'checkout', payload: { total: 100 }, preview: 'Thanh toán 100đ' },
    '',
  );
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.status, 'pending_confirmation');
  assert.strictEqual(result.action_type, 'checkout');
  assert.strictEqual(result.tool, 'checkout');
  assert.strictEqual(result.preview, 'Thanh toán 100đ');
  assert.deepStrictEqual(result.payload, { total: 100 });
});

test('buildAiRouterPendingResponse maps goi_mon_ban action_type', () => {
  const result = generalUtils.buildAiRouterPendingResponse(
    { actionType: 'goi_mon_ban', payload: { ban: '3', items: [{ ten_mon: 'Phở', qty: 1 }] } },
    'gọi món bàn 3',
  );
  assert.strictEqual(result.action_type, 'goi_mon');
  assert.ok(result.preview.includes('bàn 3'));
});

test('buildAiRouterPendingResponse uses tool field when actionType missing', () => {
  const result = generalUtils.buildAiRouterPendingResponse(
    { tool: 'nhap_hang_thu_cong', payload: {} },
    '',
  );
  assert.strictEqual(result.action_type, 'nhap_hang');
  assert.strictEqual(result.tool, 'nhap_hang_thu_cong');
});

test('buildAiRouterPendingResponse defaults for empty input', () => {
  const result = generalUtils.buildAiRouterPendingResponse({}, '');
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.status, 'pending_confirmation');
  assert.strictEqual(result.action_type, 'unknown');
  assert.strictEqual(result.tool, '');
});

// --- Summary ---
console.log(`\n${passed} passed, ${failed} failed out of ${passed + failed} tests.`);
if (failed > 0) {
  process.exit(1);
}
