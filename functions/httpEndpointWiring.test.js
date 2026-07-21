const fs = require('fs');
const path = require('path');

const repo = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(repo, relativePath), 'utf8');
const between = (source, start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));

describe('Sprint 2 HTTP endpoint security wiring', () => {
  test('retires the public createAdminUser credential provisioning path', () => {
    const source = read('functions/createAdminUser.js');
    expect(source).toContain("require('./utils/legacyAdminEndpoint')");
    expect(source).toContain('buildRetiredAdminEndpointResponse(req.method)');
    expect(source).not.toContain("require('firebase-admin/auth')");
    expect(source).not.toContain('.createUser(');
    expect(source).not.toContain('.setCustomUserClaims(');
  });

  test('authenticates and limits apiVoice before NLP, catalog, or order work', () => {
    const source = read('functions/index.js');
    const handler = between(source, 'exports.apiVoice = onRequest', 'exports.syncPublicMenuOnCatalogCreate');
    expect(handler).toContain('authorizePosHttpRequest(req, VOICE_ALLOWED_ROLES)');
    expect(handler).toContain('isContentLengthAllowed(req, HTTP_JSON_MAX_BYTES)');
    expect(handler).toContain('voiceRateLimiter.take(`uid:${authResult.actor.uid}`)');
    expect(handler.indexOf('authorizePosHttpRequest')).toBeLessThan(handler.indexOf('ensureNlp'));
    expect(handler.indexOf('isContentLengthAllowed')).toBeLessThan(handler.indexOf('ensureNlp'));
    expect(handler.indexOf('voiceRateLimiter.take')).toBeLessThan(handler.indexOf('ensureNlp'));
    expect(handler).not.toContain("logger.info('Voice command received', { text })");
  });

  test('authenticates and validates aiRouter before calling Vertex', () => {
    const source = read('functions/index.js');
    const handler = between(source, 'exports.aiRouter = onRequest', 'exports.adminGenerateMenuImage = onRequest');
    expect(handler).toContain('authorizePosHttpRequest(req, AI_ALLOWED_ROLES)');
    expect(handler).toContain('isContentLengthAllowed(req, HTTP_JSON_MAX_BYTES)');
    expect(handler).toContain('aiRateLimiter.take(`uid:${authResult.actor.uid}`)');
    expect(handler).toContain('validateBase64Media');
    expect(handler.indexOf('authorizePosHttpRequest')).toBeLessThan(handler.indexOf('askGeminiForPosApp'));
    expect(handler.indexOf('validateBase64Media')).toBeLessThan(handler.indexOf('askGeminiForPosApp'));
  });

  test('requires a manager/admin actor and validates OCR payload before Vertex OCR', () => {
    const source = read('functions/index.js');
    const handler = between(source, 'exports.purchaseOcr = onRequest', 'exports.aiStatus = onRequest');
    expect(handler).toContain('authorizePosHttpRequest(req, OCR_ALLOWED_ROLES)');
    expect(handler).toContain('isContentLengthAllowed(req, OCR_REQUEST_MAX_BYTES)');
    expect(handler).toContain('validateBase64Media');
    expect(handler.indexOf('authorizePosHttpRequest')).toBeLessThan(handler.indexOf('runVertexPurchaseOcr'));
    expect(handler.indexOf('validateBase64Media')).toBeLessThan(handler.indexOf('runVertexPurchaseOcr'));
  });

  test('does not expose aiStatus project IDs or raw errors and requires an authenticated actor', () => {
    const source = read('functions/index.js');
    const handler = between(source, 'exports.aiStatus = onRequest', 'exports.aiRouter = onRequest');
    expect(handler).toContain('authorizePosHttpRequest(req, AI_ALLOWED_ROLES)');
    expect(handler).not.toContain('projectId:');
    expect(handler).not.toContain('error: error?.message');
  });

  test('uses a verified Firebase token for maintenance/admin endpoints without OAuth email fallback', () => {
    const source = read('functions/index.js');
    const helper = between(source, 'async function verifyAdminRequest(req)', 'exports.adminProbeVertex = onRequest');
    expect(helper).toContain('authorizePosHttpRequest(req, ADMIN_ALLOWED_ROLES)');
    expect(helper).not.toContain('googleapis.com/oauth2/v3/userinfo');
    expect(helper).not.toContain('OWNER_EMAIL');
  });

  test('retained browser callers obtain and send a Firebase ID token', () => {
    const aiCore = read('ai-core.js');
    const aiUi = read('ai-ui.js');
    const app = read('app.js');
    expect(aiCore).toContain('window.DB?.currentUser?.getIdToken()');
    expect(aiCore).toContain('Authorization: `Bearer ${token}`');
    expect(aiUi).toContain('window.DB?.currentUser?.getIdToken()');
    expect(aiUi).toContain('Authorization: `Bearer ${token}`');
    expect(app).toContain('window.DB?.currentUser?.getIdToken()');
    expect(app).toContain('Authorization: `Bearer ${token}`');
  });
});

describe('R3 residual HTTP security containment', () => {
  const findExport = (source, name) => {
    const start = source.indexOf(`exports.${name} = onRequest`);
    if (start < 0) return '';
    const next = source.indexOf('exports.', start + 1);
    return next < 0 ? source.slice(start) : source.slice(start, next);
  };
  const clientResponses = handler => (handler.match(/return json\(res, [^,]+, \{[\s\S]*?\}\);/g) || []).join('\n');

  test('purchaseOcr never returns raw error.message in error responses', () => {
    const source = read('functions/index.js');
    const handler = between(source, 'exports.purchaseOcr = onRequest', 'exports.aiStatus = onRequest');
    expect(clientResponses(handler)).not.toMatch(/error:\s*error\?\.message/);
  });

  test('aiRouter preserves the client contract with a stable error code and HTTP 200', () => {
    const source = read('functions/index.js');
    const handler = between(source, 'exports.aiRouter = onRequest', 'exports.adminGenerateMenuImage = onRequest');
    // Client contract: error responses stay HTTP 200 with status:'error', ok:false, stable code — no raw exception leak.
    expect(handler).toMatch(/return json\(res, 200, \{[^}]*status:\s*'error'/);
    expect(handler).not.toContain("error: String(error?.message || error || 'AI router failed')");
    expect(handler).not.toMatch(/error:\s*String\(error\?\.message/);
    expect(clientResponses(handler)).not.toMatch(/error:\s*error\?\.message/);
  });

  test('admin/test HTTP success responses do not return the caller actor', () => {
    const source = read('functions/index.js');
    const handlers = [
      ['testAdsReportTelegram', 'exports.adsRevenueReportApi = onRequest'],
      ['adsRevenueReportApi', 'exports.testPaymentBillTelegram = onRequest'],
      ['testPaymentBillTelegram', 'exports.testCompletedOrderTelegram = onRequest'],
      ['testCompletedOrderTelegram', 'exports.telegramWebhook = onRequest'],
      ['adminProbeVertex', 'function getStorageDownloadUrl'],
      ['adminUploadMenuImage', 'function stripDataUrlBase64'],
      ['adminGenerateMenuImage', 'exports.adminGenerateMenuDescription = onRequest'],
      ['cleanupDuplicateHistory', 'exports.apiVoice = onRequest'],
    ];
    for (const [start, end] of handlers) {
      const handler = between(source, `exports.${start} = onRequest`, end);
      // A 200 success block must not echo the caller actor object.
      // toMatch needs a string receiver; keep the handler name in failure context via a
      // custom assertion that throws with the handler name if the regex matches the body.
      const assertNoActorIn200 = (block, blockLabel) => {
        if (/json\(res, 200, \{[^}]*\bactor\b/.test(block)) {
          throw new Error(`${start}: 200 success block ${blockLabel} leaks caller actor`);
        }
        if (/^\s*actor,?\s*$/m.test(block)) {
          throw new Error(`${start}: 200 success block ${blockLabel} has standalone actor field`);
        }
        if (/\bactor,\s*\n/.test(block)) {
          throw new Error(`${start}: 200 success block ${blockLabel} has trailing-comma actor`);
        }
      };
      const successBodies = handler.match(/return json\(res, 200, \{[\s\S]*?\}\);/g) || [];
      for (const body of successBodies) {
        assertNoActorIn200(body, 'body');
      }
    }
  });

  test('adminProbeVertex does not leak projectId, authSource, or auth contexts in success responses', () => {
    const source = read('functions/index.js');
    const handler = between(source, 'exports.adminProbeVertex = onRequest', 'function getStorageDownloadUrl');
    const successBody = handler.match(/return json\(res, 200, \{[\s\S]*?\}\);/);
    expect(successBody).not.toBeNull();
    expect(successBody[0]).not.toContain('projectId');
    expect(successBody[0]).not.toContain('authSource');
    expect(successBody[0]).not.toContain('availableAuthSources');
    expect(successBody[0]).not.toContain('authContexts');
  });

  test('adminProbeVertex does not return raw errors in failure responses', () => {
    const source = read('functions/index.js');
    const handler = between(source, 'exports.adminProbeVertex = onRequest', 'function getStorageDownloadUrl');
    expect(clientResponses(handler)).not.toMatch(/error:\s*(?:err|error)\?\.message/);
  });

  test('adminUploadMenuImage validates body and media size then reuses helper decoded buffer', () => {
    const source = read('functions/index.js');
    const handler = between(source, 'exports.adminUploadMenuImage = onRequest', 'function stripDataUrlBase64');
    // Body-size cap (method -> body-size -> auth -> work) before any base64 decode.
    expect(handler).toContain('isContentLengthAllowed(req, HTTP_JSON_MAX_BYTES)');
    expect(handler).toContain('validateBase64Media(');
    expect(handler).toContain('const buffer = imageCheck.buffer;');
    expect(handler).not.toContain('Buffer.from(base64Payload');
    expect(handler.indexOf('isContentLengthAllowed')).toBeLessThan(handler.indexOf('verifyAdminRequest'));
    expect(handler.indexOf('verifyAdminRequest')).toBeLessThan(handler.indexOf('validateBase64Media'));
  });

  test('adminUploadMenuImage returns generic errors and never echoes actor or raw exceptions', () => {
    const source = read('functions/index.js');
    const handler = between(source, 'exports.adminUploadMenuImage = onRequest', 'function stripDataUrlBase64');
    expect(clientResponses(handler)).not.toMatch(/error:\s*(?:err|error)\?\.message/);
    expect(handler).not.toMatch(/json\(res, 200, \{[^}]*\bactor\b/);
  });

  test('adminGenerateMenuDescription never directly fetches a user or persisted imageUrl', () => {
    const source = read('functions/index.js');
    const handler = between(source, 'exports.adminGenerateMenuDescription = onRequest', 'exports.scheduledTelegramReport = onSchedule');
    expect(handler).not.toContain('fetch(imageUrl)');
    expect(handler).not.toContain('await fetch(imageUrl)');
    expect(handler).not.toMatch(/\bfetch\(\s*imageUrl\s*\)/);
  });

  test('adminGenerateMenuDescription uses an SSRF-safe HTTPS fetch helper with trusted-bucket, DNS, redirect, content-type, and byte-cap controls', () => {
    const source = read('functions/index.js');
    const handler = between(source, 'exports.adminGenerateMenuDescription = onRequest', 'exports.scheduledTelegramReport = onSchedule');
    expect(handler).toContain('fetchTrustedImage(');
    expect(handler).toContain('validateTrustedHttpsUrl(');
    const helperSource = read('functions/utils/httpSecurity.js');
    expect(helperSource).toContain('validateTrustedHttpsUrl');
    expect(helperSource).toContain('isPrivateIpAddress');
    expect(helperSource).toContain("redirect: 'manual'");
    expect(helperSource).toContain('readBodyWithLimit');
    expect(helperSource).toContain('allowedBuckets');
  });

  test('adminGenerateMenuDescription success does not leak actor or raw errors', () => {
    const source = read('functions/index.js');
    const handler = between(source, 'exports.adminGenerateMenuDescription = onRequest', 'exports.scheduledTelegramReport = onSchedule');
    expect(handler).not.toMatch(/json\(res, 200, \{[^}]*\bactor\b/);
    expect(clientResponses(handler)).not.toMatch(/error:\s*error\?\.message/);
  });
});
