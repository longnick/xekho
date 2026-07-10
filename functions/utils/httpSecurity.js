function parseBearerToken(req = {}) {
  const authorization = String(req.headers?.authorization || req.get?.('authorization') || '').trim();
  return authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || '';
}

async function authorizeRequest(req, { verifyIdToken, getRole, allowedRoles = [] } = {}) {
  const token = parseBearerToken(req);
  if (!token || typeof verifyIdToken !== 'function' || typeof getRole !== 'function') {
    return { ok: false, status: 401, reason: 'unauthenticated' };
  }

  let decoded;
  try {
    decoded = await verifyIdToken(token);
  } catch (_) {
    return { ok: false, status: 401, reason: 'unauthenticated' };
  }

  const uid = String(decoded?.uid || '').trim();
  if (!uid) return { ok: false, status: 401, reason: 'unauthenticated' };

  const role = String(await getRole(decoded) || '').trim().toLowerCase();
  if (!allowedRoles.includes(role)) {
    return { ok: false, status: 403, reason: 'forbidden' };
  }

  return {
    ok: true,
    actor: {
      uid,
      role,
      email: String(decoded?.email || '').trim().toLowerCase(),
    },
  };
}

function isContentLengthAllowed(req = {}, maxBytes) {
  const rawLength = String(req.headers?.['content-length'] || req.get?.('content-length') || '').trim();
  if (!rawLength) return true;
  const declaredLength = Number(rawLength);
  return Number.isSafeInteger(declaredLength) && declaredLength >= 0 && declaredLength <= maxBytes;
}

function decodeBase64(value = '') {
  const normalized = String(value || '').trim().replace(/^data:[^;]+;base64,/i, '');
  if (!normalized || normalized.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) return null;
  const buffer = Buffer.from(normalized, 'base64');
  return buffer.toString('base64').replace(/=+$/, '') === normalized.replace(/=+$/, '') ? buffer : null;
}

function validateBase64Media({ value, mimeType, allowedMimeTypes = [], maxBytes = 0 } = {}) {
  const normalizedMimeType = String(mimeType || '').trim().toLowerCase();
  if (!allowedMimeTypes.includes(normalizedMimeType)) return { ok: false, reason: 'unsupported_mime' };
  const buffer = decodeBase64(value);
  if (!buffer) return { ok: false, reason: 'invalid_base64' };
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0 || buffer.length > maxBytes) {
    return { ok: false, reason: 'too_large', bytes: buffer.length };
  }
  return { ok: true, bytes: buffer.length, buffer };
}

function createRateLimiter({ limit, windowMs, now = Date.now } = {}) {
  const hits = new Map();
  return {
    take(key) {
      const nowMs = now();
      const normalizedKey = String(key || '').trim();
      if (!normalizedKey || !Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(windowMs) || windowMs < 1) return false;
      const entry = hits.get(normalizedKey);
      const active = entry && nowMs - entry.startedAt < windowMs ? entry : { startedAt: nowMs, count: 0 };
      if (active.count >= limit) return false;
      active.count += 1;
      hits.set(normalizedKey, active);
      return true;
    },
  };
}

module.exports = {
  parseBearerToken,
  authorizeRequest,
  isContentLengthAllowed,
  validateBase64Media,
  createRateLimiter,
};
