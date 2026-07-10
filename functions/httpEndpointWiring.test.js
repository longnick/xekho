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
