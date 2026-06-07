const fs = require('fs');
const path = require('path');
const { GoogleAuth } = require('google-auth-library');
const { v1, helpers } = require('@google-cloud/aiplatform');

const CLOUD_PLATFORM_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const DEFAULT_TEXT_MODELS = [
  'gemini-3.5-flash',
  'gemini-2.0-flash-001',
  'gemini-2.0-flash',
];
const DEFAULT_IMAGE_MODELS = [
  'imagen-3.0-generate-001',
  'imagen-4.0-fast-generate-001',
];

const cachedAuthByKey = new Map();
const cachedPredictionClientByKey = new Map();

function shouldRetryModelError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return (
    message.includes('was not found') ||
    message.includes('does not have access') ||
    message.includes('not supported') ||
    message.includes('not available') ||
    message.includes('permission denied') ||
    message.includes('forbidden') ||
    message.includes('unauthenticated') ||
    message.includes('401') ||
    message.includes('403') ||
    message.includes('404')
  );
}

function shouldRetryAuthCandidateError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return (
    message.includes('application default credentials') ||
    message.includes('could not load the default credentials') ||
    message.includes('could not automatically determine credentials') ||
    message.includes('missing credentials') ||
    message.includes('unauthenticated') ||
    message.includes('permission denied') ||
    message.includes('forbidden') ||
    message.includes('does not have access') ||
    message.includes('not found') ||
    message.includes('401') ||
    message.includes('403') ||
    message.includes('404')
  );
}

function parseServiceAccountJson(raw = '') {
  const text = String(raw || '').trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`VERTEX_SERVICE_ACCOUNT_JSON không hợp lệ: ${error.message || error}`);
  }
}

function loadLocalServiceAccount() {
  const candidates = [
    path.join(__dirname, 'serviceAccountKey.json'),
    path.join(__dirname, '..', 'serviceAccountKey.json'),
  ];
  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf8');
    return parseServiceAccountJson(content);
  }
  return null;
}

function getVertexCredentials(secretJson = '') {
  return parseServiceAccountJson(secretJson) || loadLocalServiceAccount();
}

function normalizeAuthStrategy(authStrategy = '') {
  const normalized = String(authStrategy || '').trim().toLowerCase();
  if (['adc_only', 'secret_only', 'secret_first'].includes(normalized)) return normalized;
  return 'adc_first';
}

function buildAuthCandidates({ secretJson = '', authStrategy = 'adc_first' } = {}) {
  const normalizedStrategy = normalizeAuthStrategy(authStrategy);
  const explicitCredentials = getVertexCredentials(secretJson);
  const adcCandidate = [{ source: 'adc', credentials: null }];
  const secretCandidate = explicitCredentials ? [{ source: 'secret', credentials: explicitCredentials }] : [];

  if (normalizedStrategy === 'adc_only') return adcCandidate;
  if (normalizedStrategy === 'secret_only') return secretCandidate;
  if (normalizedStrategy === 'secret_first') return [...secretCandidate, ...adcCandidate];
  return [...adcCandidate, ...secretCandidate];
}

function buildAuthCacheKey(candidate = {}) {
  if (candidate.source === 'secret' && candidate.credentials) {
    return `secret:${candidate.credentials.client_email || ''}:${candidate.credentials.project_id || ''}`;
  }
  return 'adc:default';
}

function getGoogleAuth(candidate = {}) {
  const cacheKey = buildAuthCacheKey(candidate);
  if (cachedAuthByKey.has(cacheKey)) {
    return cachedAuthByKey.get(cacheKey);
  }

  const auth = new GoogleAuth({
    ...(candidate.credentials ? { credentials: candidate.credentials } : {}),
    scopes: [CLOUD_PLATFORM_SCOPE],
  });
  cachedAuthByKey.set(cacheKey, auth);
  return auth;
}

async function resolveAuthCandidate(candidate = {}, projectId = '') {
  const auth = getGoogleAuth(candidate);
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = typeof tokenResponse === 'string' ? tokenResponse : tokenResponse?.token;
  if (!token) {
    throw new Error(
      candidate.source === 'adc'
        ? 'Không lấy được access token từ Application Default Credentials.'
        : 'Không lấy được access token từ Vertex service account.'
    );
  }

  let authProjectId = '';
  try {
    authProjectId = String(await auth.getProjectId() || '').trim();
  } catch (_) {
    authProjectId = '';
  }

  const effectiveProjectId = String(projectId || authProjectId || candidate.credentials?.project_id || '').trim();
  if (!effectiveProjectId) {
    throw new Error('Thiếu Vertex project id.');
  }

  return {
    source: candidate.source || 'adc',
    auth,
    token,
    credentials: candidate.credentials || null,
    projectId: effectiveProjectId,
  };
}

async function getVertexAuthContexts({ secretJson = '', projectId = '', authStrategy = 'adc_first' } = {}) {
  const candidates = buildAuthCandidates({ secretJson, authStrategy });
  if (!candidates.length) {
    throw new Error('Thiếu Vertex service account. Hãy cấu hình VERTEX_SERVICE_ACCOUNT_JSON hoặc ADC.');
  }

  const contexts = [];
  const errors = [];
  for (const candidate of candidates) {
    try {
      contexts.push(await resolveAuthCandidate(candidate, projectId));
    } catch (error) {
      errors.push(`${candidate.source}: ${error?.message || String(error)}`);
    }
  }

  if (contexts.length) return contexts;
  throw new Error(`Không khởi tạo được Vertex auth. ${errors.join(' | ')}`);
}

function getPredictionApiEndpoint(location = 'us-central1') {
  const normalized = String(location || '').trim().toLowerCase();
  if (!normalized || normalized === 'global') {
    return 'aiplatform.googleapis.com';
  }
  return `${normalized}-aiplatform.googleapis.com`;
}

function getPredictionClientForContext(authContext = {}, location = 'us-central1') {
  const cacheKey = `${authContext.source}:${authContext.credentials?.client_email || 'adc'}:${authContext.projectId}:${location}`;
  if (cachedPredictionClientByKey.has(cacheKey)) {
    return cachedPredictionClientByKey.get(cacheKey);
  }

  const client = new v1.PredictionServiceClient({
    apiEndpoint: getPredictionApiEndpoint(location),
    ...(authContext.credentials ? { credentials: authContext.credentials } : {}),
    projectId: authContext.projectId,
  });
  cachedPredictionClientByKey.set(cacheKey, client);
  return client;
}

function normalizeModelNames(models = [], fallback = []) {
  return [...models, ...fallback]
    .map((item) => String(item || '').trim())
    .filter((item, index, arr) => item && arr.indexOf(item) === index);
}

function buildVertexHost(location = '') {
  const normalized = String(location || '').trim().toLowerCase();
  if (!normalized || normalized === 'global') {
    return 'https://aiplatform.googleapis.com';
  }
  return `https://${normalized}-aiplatform.googleapis.com`;
}

function buildEndpoint({ projectId, location, modelName }) {
  return `${buildVertexHost(location)}/v1/projects/${encodeURIComponent(projectId)}/locations/${encodeURIComponent(location)}/publishers/google/models/${encodeURIComponent(modelName)}:generateContent`;
}

function collectTextFromPayload(payload = {}) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((part) => String(part?.text || '').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

function collectFunctionCalls(payload = {}) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((part) => part?.functionCall || null)
    .filter(Boolean)
    .map((call) => ({
      name: String(call.name || '').trim(),
      args: call.args || {},
    }))
    .filter((call) => call.name);
}

function collectInlineImage(payload = {}) {
  const prediction = Array.isArray(payload?.predictions) ? payload.predictions[0] : null;
  if (prediction?.structValue?.fields) {
    const decoded = helpers.fromValue(prediction);
    if (decoded?.bytesBase64Encoded) {
      return {
        base64Data: String(decoded.bytesBase64Encoded || '').trim(),
        mimeType: String(decoded.mimeType || 'image/png').trim(),
      };
    }
  }
  if (prediction?.bytesBase64Encoded) {
    return {
      base64Data: String(prediction.bytesBase64Encoded || '').trim(),
      mimeType: String(prediction.mimeType || 'image/png').trim(),
    };
  }
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((part) => part?.inlineData?.data);
  if (!imagePart?.inlineData?.data) return null;
  return {
    base64Data: String(imagePart.inlineData.data || '').trim(),
    mimeType: String(imagePart.inlineData.mimeType || 'image/png').trim(),
  };
}

async function callVertexGenerateContent({
  secretJson = '',
  projectId = '',
  location = 'global',
  authStrategy = 'adc_first',
  modelNames = [],
  fallbackModelNames = [],
  contents = [],
  systemInstruction = '',
  tools = [],
  generationConfig = {},
}) {
  const authContexts = await getVertexAuthContexts({ secretJson, projectId, authStrategy });
  const candidates = normalizeModelNames(modelNames, fallbackModelNames);
  let lastError = null;

  for (const authContext of authContexts) {
    for (const modelName of candidates) {
      try {
        const response = await fetch(buildEndpoint({
          projectId: authContext.projectId,
          location,
          modelName,
        }), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authContext.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents,
            ...(systemInstruction
              ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
              : {}),
            ...(Array.isArray(tools) && tools.length ? { tools } : {}),
            ...(Object.keys(generationConfig || {}).length ? { generationConfig } : {}),
          }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message = String(payload?.error?.message || `Vertex request failed (${response.status})`);
          throw new Error(message);
        }

        return {
          payload,
          modelName,
          authSource: authContext.source,
          projectId: authContext.projectId,
        };
      } catch (error) {
        lastError = error;
        if (!shouldRetryModelError(error)) throw error;
      }
    }
    if (lastError && !shouldRetryAuthCandidateError(lastError)) break;
  }

  throw lastError || new Error('Vertex AI không phản hồi.');
}

async function generateVertexText(options = {}) {
  return callVertexGenerateContent({
    ...options,
    fallbackModelNames: DEFAULT_TEXT_MODELS,
  });
}

async function generateVertexImage(options = {}) {
  const {
    secretJson = '',
    projectId = '',
    location = 'us-central1',
    authStrategy = 'adc_first',
    modelNames = [],
    prompt = '',
    aspectRatio = '1:1',
    sampleCount = 1,
  } = options;

  const authContexts = await getVertexAuthContexts({ secretJson, projectId, authStrategy });
  const candidates = normalizeModelNames(modelNames, DEFAULT_IMAGE_MODELS);
  let lastError = null;
  for (const authContext of authContexts) {
    const client = getPredictionClientForContext(authContext, location);
    for (const modelName of candidates) {
      try {
        const endpoint = `projects/${authContext.projectId}/locations/${location}/publishers/google/models/${modelName}`;
        const [payload] = await client.predict({
          endpoint,
          instances: [helpers.toValue({ prompt: String(prompt || '').trim() })],
          parameters: helpers.toValue({
            sampleCount,
            aspectRatio,
          }),
        });
        return {
          payload,
          modelName,
          authSource: authContext.source,
          projectId: authContext.projectId,
        };
      } catch (error) {
        lastError = error;
        if (!shouldRetryModelError(error)) throw error;
      }
    }
    if (lastError && !shouldRetryAuthCandidateError(lastError)) break;
  }
  throw lastError || new Error('Vertex image generation failed.');
}

async function probeVertexText(options = {}) {
  const {
    text = 'Ping from Vertex probe',
    generationConfig = {},
    ...rest
  } = options;
  return generateVertexText({
    ...rest,
    contents: [{
      role: 'user',
      parts: [{ text: String(text || '').trim() || 'Ping from Vertex probe' }],
    }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 64,
      ...generationConfig,
    },
  });
}

module.exports = {
  getVertexCredentials,
  getVertexAuthContexts,
  generateVertexText,
  generateVertexImage,
  probeVertexText,
  collectTextFromPayload,
  collectFunctionCalls,
  collectInlineImage,
};
