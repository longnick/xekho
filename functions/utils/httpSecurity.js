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

function normalizeBase64(value = '') {
  return String(value || '').trim().replace(/^data:[^;]+;base64,/i, '');
}

function decodeBase64(value = '') {
  const normalized = normalizeBase64(value);
  if (!normalized || normalized.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) return null;
  const buffer = Buffer.from(normalized, 'base64');
  return buffer.toString('base64').replace(/=+$/, '') === normalized.replace(/=+$/, '') ? buffer : null;
}

function validateBase64Media({ value, mimeType, allowedMimeTypes = [], maxBytes = 0 } = {}) {
  const normalizedMimeType = String(mimeType || '').trim().toLowerCase();
  if (!allowedMimeTypes.includes(normalizedMimeType)) return { ok: false, reason: 'unsupported_mime' };
  const normalized = normalizeBase64(value);
  if (!normalized || normalized.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    return { ok: false, reason: 'invalid_base64' };
  }
  const padding = normalized.endsWith('==') ? 2 : (normalized.endsWith('=') ? 1 : 0);
  const decodedUpperBound = Math.floor(normalized.length / 4) * 3 - padding
    + (normalized.length % 4 === 2 ? 1 : (normalized.length % 4 === 3 ? 2 : 0));
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0 || decodedUpperBound > maxBytes) {
    return { ok: false, reason: 'too_large', bytes: decodedUpperBound };
  }
  const buffer = decodeBase64(normalized);
  if (!buffer) return { ok: false, reason: 'invalid_base64' };
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

// --- R3 SSRF helpers: HTTPS-only trusted-image fetch with DNS / redirect / MIME / byte-cap guards ---

const TRUSTED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function validateTrustedHttpsUrl(value, { allowedHosts = [], allowedBuckets = [] } = {}) {
  let parsed;
  try {
    parsed = new URL(String(value || ''));
  } catch (_) {
    return { ok: false, reason: 'invalid_url' };
  }
  if (parsed.protocol !== 'https:') return { ok: false, reason: 'scheme_not_https' };
  // Reject userinfo (user:pass@host) — SSRF / credential-leak vector.
  if (parsed.username || parsed.password) return { ok: false, reason: 'userinfo_present' };
  // Only default port 443 (or empty) is allowed; explicit non-443 ports are rejected.
  if (parsed.port !== '' && parsed.port !== '443') return { ok: false, reason: 'non_default_port' };
  const hostname = parsed.hostname.toLowerCase();
  // Exact-host allowlist (no suffix match — prevents host.evil.com bypass).
  if (!allowedHosts.includes(hostname)) return { ok: false, reason: 'host_not_trusted' };
  // For Firebase Storage, enforce the exact allowed bucket in /v0/b/<bucket>/o/...
  if (hostname === 'firebasestorage.googleapis.com') {
    const m = parsed.pathname.match(/^\/v0\/b\/([^/]+)\//);
    const bucket = m ? decodeURIComponent(m[1]) : '';
    if (!allowedBuckets.includes(bucket)) return { ok: false, reason: 'bucket_not_trusted' };
  }
  return { ok: true, url: parsed.toString(), hostname, pathname: parsed.pathname };
}

function isPrivateIpAddress(ip) {
  if (typeof ip !== 'string') return false;
  const addr = ip.trim().toLowerCase();
  if (!addr) return false;

  // IPv4-mapped IPv6 (::ffff:a.b.c.d) — unwrap and recurse.
  const mapped = addr.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) return isPrivateIpAddress(mapped[1]);

  // IPv6 loopback / unspecified.
  if (addr === '::1' || addr === '::') return true;
  // IPv6 link-local fe80::/10 and unique-local fc00::/7 (covers fd00::/8).
  if (/^fe[89ab][0-9a-f]*:/.test(addr)) return true;
  if (/^f[cd][0-9a-f]*:/.test(addr)) return true;

  // IPv4 numeric.
  const parts = addr.split('.');
  if (parts.length === 4 && parts.every(p => /^\d{1,3}$/.test(p))) {
    const [a, b] = parts.map(Number);
    if (a === 10) return true;                                   // 10.0.0.0/8
    if (a === 127) return true;                                  // 127.0.0.0/8 (loopback)
    if (a === 0) return true;                                    // 0.0.0.0/8 (unspecified/network)
    if (a === 169 && b === 254) return true;                     // 169.254.0.0/16 (link-local)
    if (a === 172 && b >= 16 && b <= 31) return true;            // 172.16.0.0/12
    if (a === 192 && b === 168) return true;                     // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true;           // 100.64.0.0/10 (CGNAT)
  }
  return false;
}

async function readBodyWithLimit(response, maxBytes, controller) {
  const reader = response?.body?.getReader?.();
  if (!reader) return { ok: false, reason: 'unsupported_body_stream' };
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await Promise.race([
        reader.read(),
        new Promise((_, reject) => controller?.signal?.addEventListener?.('abort', () => reject(new Error('aborted')), { once: true })),
      ]);
      if (done) break;
      const chunk = Buffer.from(value || []);
      total += chunk.length;
      if (total > maxBytes) {
        try { await reader.cancel(); } catch (_) {}
        controller?.abort?.();
        return { ok: false, reason: 'too_large' };
      }
      chunks.push(chunk);
    }
  } catch (_) {
    try { await reader.cancel(); } catch (_) {}
    return { ok: false, reason: controller?.signal?.aborted ? 'timeout' : 'fetch_failed' };
  }
  return { ok: true, buffer: Buffer.concat(chunks, total) };
}

function nativeHttpsRequest(url, options = {}) {
  const https = require('https');
  const { Readable } = require('stream');
  return new Promise((resolve, reject) => {
    let res;
    const abort = () => {
      const error = new Error('aborted');
      res?.destroy();
      req.destroy(error);
    };
    const req = https.request(url, {
      method: 'GET',
      lookup: options.lookup,
      servername: options.servername,
    }, (response) => {
      res = response;
      resolve({
        ok: res.statusCode >= 200 && res.statusCode < 300,
        status: res.statusCode,
        headers: { get: name => res.headers[String(name).toLowerCase()] || null },
        body: Readable.toWeb(res),
      });
    });
    req.once('error', reject);
    options.signal?.addEventListener?.('abort', abort, { once: true });
    req.end();
  });
}

async function fetchTrustedImage(value, {
  allowedHosts = [],
  allowedBuckets = [],
  maxBytes = 2 * 1024 * 1024,
  timeoutMs = 5000,
  maxRedirects = 1,
  lookup,
  fetchImpl,
  requestImpl = nativeHttpsRequest,
} = {}) {
  let current = String(value || '');
  for (let redirects = 0; redirects <= maxRedirects; redirects++) {
    const v = validateTrustedHttpsUrl(current, { allowedHosts, allowedBuckets });
    if (!v.ok) return v;

    const lookupFn = lookup || (async (h) => {
      const dns = require('dns');
      return await dns.lookup(h, { all: true, verbatim: true });
    });
    let rows;
    try {
      rows = await lookupFn(v.hostname);
    } catch (_) {
      return { ok: false, reason: 'dns_failed' };
    }
    rows = Array.isArray(rows) ? rows : [rows];
    if (rows.some(r => isPrivateIpAddress(r?.address || r))) {
      return { ok: false, reason: 'private_address' };
    }

    const first = rows[0];
    const address = typeof first === 'string' ? first : first?.address;
    const family = typeof first === 'object' && first?.family ? first.family : undefined;
    if (!address) return { ok: false, reason: 'dns_failed' };
    const pinnedLookup = (_hostname, _options, callback) => callback(null, address, family);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let res;
    try {
      res = fetchImpl
        ? await fetchImpl(v.url, { redirect: 'manual', signal: ctrl.signal })
        : await requestImpl(v.url, {
          redirect: 'manual',
          signal: ctrl.signal,
          lookup: pinnedLookup,
          servername: v.hostname,
        });
    } catch (_) {
      return { ok: false, reason: ctrl.signal.aborted ? 'timeout' : 'fetch_failed' };
    }

    try {
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const loc = res.headers.get?.('location') || res.headers?.location;
        if (!loc || redirects >= maxRedirects) return { ok: false, reason: 'redirect_blocked' };
        try {
          current = new URL(loc, v.url).toString();
        } catch (_) {
          return { ok: false, reason: 'redirect_invalid' };
        }
        continue;
      }
      if (!res.ok) return { ok: false, reason: 'upstream_error' };

      const ct = String(res.headers.get?.('content-type') || '').toLowerCase();
      const mimeType = ct.split(';')[0].trim();
      if (!TRUSTED_IMAGE_MIME_TYPES.includes(mimeType)) {
        return { ok: false, reason: 'unsupported_mime' };
      }
      const declaredLen = Number(res.headers.get?.('content-length') || '');
      if (Number.isSafeInteger(declaredLen) && declaredLen > maxBytes) {
        ctrl.abort();
        return { ok: false, reason: 'too_large' };
      }

      const body = await readBodyWithLimit(res, maxBytes, ctrl);
      if (!body.ok) return body;

      return {
        ok: true,
        buffer: body.buffer,
        mimeType,
      };
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: false, reason: 'redirect_blocked' };
}

module.exports = {
  parseBearerToken,
  authorizeRequest,
  isContentLengthAllowed,
  validateBase64Media,
  createRateLimiter,
  validateTrustedHttpsUrl,
  isPrivateIpAddress,
  readBodyWithLimit,
  fetchTrustedImage,
};
