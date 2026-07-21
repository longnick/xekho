const {
  parseBearerToken,
  authorizeRequest,
  isContentLengthAllowed,
  validateBase64Media,
  createRateLimiter,
  validateTrustedHttpsUrl,
  isPrivateIpAddress,
  readBodyWithLimit,
  fetchTrustedImage,
} = require('./httpSecurity');

describe('http security helpers', () => {
  test('parses only a non-empty Bearer authorization token', () => {
    expect(parseBearerToken({ headers: {} })).toBe('');
    expect(parseBearerToken({ headers: { authorization: 'Basic abc' } })).toBe('');
    expect(parseBearerToken({ headers: { authorization: 'Bearer token-123' } })).toBe('token-123');
  });

  test('authorizes only a verified identity with an allowed role', async () => {
    const verifyIdToken = jest.fn().mockResolvedValue({ uid: 'staff-1', email: 'staff@example.test' });
    const getRole = jest.fn().mockResolvedValue('staff');

    await expect(authorizeRequest(
      { headers: { authorization: 'Bearer valid-token' } },
      { verifyIdToken, getRole, allowedRoles: ['staff', 'manager'] }
    )).resolves.toMatchObject({ ok: true, actor: { uid: 'staff-1', role: 'staff' } });

    await expect(authorizeRequest(
      { headers: { authorization: 'Bearer valid-token' } },
      { verifyIdToken, getRole, allowedRoles: ['admin'] }
    )).resolves.toMatchObject({ ok: false, status: 403 });
  });

  test('rejects missing or invalid tokens without role lookup', async () => {
    const verifyIdToken = jest.fn().mockRejectedValue(new Error('invalid token'));
    const getRole = jest.fn();

    await expect(authorizeRequest(
      { headers: {} },
      { verifyIdToken, getRole, allowedRoles: ['staff'] }
    )).resolves.toMatchObject({ ok: false, status: 401 });
    await expect(authorizeRequest(
      { headers: { authorization: 'Bearer invalid' } },
      { verifyIdToken, getRole, allowedRoles: ['staff'] }
    )).resolves.toMatchObject({ ok: false, status: 401 });
    expect(getRole).not.toHaveBeenCalled();
  });

  test('rejects oversized declared requests before downstream work', () => {
    expect(isContentLengthAllowed({ headers: { 'content-length': '1048576' } }, 1048576)).toBe(true);
    expect(isContentLengthAllowed({ headers: { 'content-length': '1048577' } }, 1048576)).toBe(false);
  });

  test('validates MIME and decoded base64 media size', () => {
    expect(validateBase64Media({
      value: Buffer.from('ok').toString('base64'),
      mimeType: 'image/jpeg',
      allowedMimeTypes: ['image/jpeg'],
      maxBytes: 2,
    })).toMatchObject({ ok: true, bytes: 2 });
    expect(validateBase64Media({
      value: Buffer.alloc(3, 1).toString('base64'),
      mimeType: 'image/jpeg',
      allowedMimeTypes: ['image/jpeg'],
      maxBytes: 2,
    })).toMatchObject({ ok: false, reason: 'too_large' });
    expect(validateBase64Media({
      value: '%%%%',
      mimeType: 'image/jpeg',
      allowedMimeTypes: ['image/jpeg'],
      maxBytes: 100,
    })).toMatchObject({ ok: false, reason: 'invalid_base64' });
    expect(validateBase64Media({
      value: Buffer.from('ok').toString('base64'),
      mimeType: 'text/plain',
      allowedMimeTypes: ['image/jpeg'],
      maxBytes: 100,
    })).toMatchObject({ ok: false, reason: 'unsupported_mime' });
  });

  test('preflights huge valid base64 above cap before Buffer.from decode', () => {
    const encoded = 'A'.repeat(4 * 1024 * 1024);
    const originalFrom = Buffer.from;
    const fromSpy = jest.spyOn(Buffer, 'from').mockImplementation((...args) => {
      if (args[0] === encoded) throw new Error('base64 decode must not run');
      return originalFrom(...args);
    });
    try {
      expect(validateBase64Media({
        value: encoded,
        mimeType: 'image/png',
        allowedMimeTypes: ['image/png'],
        maxBytes: 1024,
      })).toMatchObject({ ok: false, reason: 'too_large' });
      expect(fromSpy).not.toHaveBeenCalledWith(encoded, 'base64');
    } finally {
      fromSpy.mockRestore();
    }
  });

  test('keeps padded decoded-size boundaries correct', () => {
    for (const [value, maxBytes] of [['YQ==', 1], ['YWI=', 2], ['YWJj', 3]]) {
      expect(validateBase64Media({
        value,
        mimeType: 'image/png',
        allowedMimeTypes: ['image/png'],
        maxBytes,
      })).toMatchObject({ ok: true, bytes: maxBytes });
    }
  });

  test('rate limits by authenticated UID rather than shared IP', () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60000, now: () => 1000 });
    expect(limiter.take('uid:staff-1')).toBe(true);
    expect(limiter.take('uid:staff-1')).toBe(true);
    expect(limiter.take('uid:staff-1')).toBe(false);
    expect(limiter.take('uid:staff-2')).toBe(true);
  });
});

const STORAGE_HOSTS = ['firebasestorage.googleapis.com'];
const STORAGE_BUCKETS = ['xekho-release-canonical.appspot.com'];

describe('SSRF URL validation (validateTrustedHttpsUrl)', () => {
  const opts = { allowedHosts: STORAGE_HOSTS, allowedBuckets: STORAGE_BUCKETS };

  test('rejects non-HTTPS schemes, userinfo, and non-443 ports', () => {
    expect(validateTrustedHttpsUrl('http://firebasestorage.googleapis.com/', opts).ok).toBe(false);
    expect(validateTrustedHttpsUrl('ftp://firebasestorage.googleapis.com/', opts).ok).toBe(false);
    expect(validateTrustedHttpsUrl('https://user:pass@firebasestorage.googleapis.com/', opts).ok).toBe(false);
    expect(validateTrustedHttpsUrl('https://firebasestorage.googleapis.com:8080/v0/b/xekho-release-canonical.appspot.com/o/x', opts).ok).toBe(false);
    // Explicit 443 is allowed (and revalidated against the bucket allowlist).
    expect(validateTrustedHttpsUrl('https://firebasestorage.googleapis.com:443/v0/b/xekho-release-canonical.appspot.com/o/x', opts).ok).toBe(true);
  });

  test('rejects hosts outside the trusted allowlist', () => {
    expect(validateTrustedHttpsUrl('https://evil.example.com/o/foo', opts).ok).toBe(false);
    expect(validateTrustedHttpsUrl('https://firebasestorage.googleapis.com.evil.com/o/foo', opts).ok).toBe(false);
  });

  test('accepts only the exact trusted Firebase Storage hosts and the allowed bucket', () => {
    const ok = validateTrustedHttpsUrl(
      'https://firebasestorage.googleapis.com/v0/b/xekho-release-canonical.appspot.com/o/menu-images%2F1.png?alt=media',
      opts
    );
    expect(ok.ok).toBe(true);
    expect(ok.hostname).toBe('firebasestorage.googleapis.com');
  });

  test('rejects Firebase Storage URLs pointing at a different bucket', () => {
    expect(validateTrustedHttpsUrl(
      'https://firebasestorage.googleapis.com/v0/b/evil-bucket.appspot.com/o/foo',
      opts
    ).ok).toBe(false);
  });
});

describe('private IP detection (isPrivateIpAddress)', () => {
  test('rejects IPv4 loopback, private, and link-local ranges', () => {
    expect(isPrivateIpAddress('127.0.0.1')).toBe(true);
    expect(isPrivateIpAddress('10.0.0.1')).toBe(true);
    expect(isPrivateIpAddress('172.16.0.1')).toBe(true);
    expect(isPrivateIpAddress('192.168.1.1')).toBe(true);
    expect(isPrivateIpAddress('169.254.169.254')).toBe(true);
  });

  test('rejects IPv6 loopback, link-local, and unique-local addresses', () => {
    expect(isPrivateIpAddress('::1')).toBe(true);
    expect(isPrivateIpAddress('fe80::1')).toBe(true);
    expect(isPrivateIpAddress('fc00::1')).toBe(true);
    expect(isPrivateIpAddress('fd00::1')).toBe(true);
  });

  test('rejects IPv4-mapped IPv6 private addresses', () => {
    expect(isPrivateIpAddress('::ffff:127.0.0.1')).toBe(true);
    expect(isPrivateIpAddress('::ffff:10.0.0.1')).toBe(true);
    expect(isPrivateIpAddress('::ffff:169.254.169.254')).toBe(true);
  });

  test('allows public addresses', () => {
    expect(isPrivateIpAddress('8.8.8.8')).toBe(false);
    expect(isPrivateIpAddress('203.0.113.5')).toBe(false);
    expect(isPrivateIpAddress('2606:4700:4700::1111')).toBe(false);
  });
});

describe('fetchTrustedImage SSRF protection', () => {
  const baseOpts = {
    allowedHosts: STORAGE_HOSTS,
    allowedBuckets: STORAGE_BUCKETS,
    maxBytes: 64,
    timeoutMs: 1000,
    maxRedirects: 1,
  };

  function makeResponse({ status = 200, headers = {}, bodyChunks = [], contentType = 'image/png' }) {
    const chunks = bodyChunks.map(c => typeof c === 'string' ? new TextEncoder().encode(c) : c);
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: {
        get: name => {
          const key = Object.keys(headers).find(k => k.toLowerCase() === name.toLowerCase());
          return key ? headers[key] : (name.toLowerCase() === 'content-type' ? contentType : null);
        },
      },
      body: {
        getReader: () => {
          let i = 0;
          return {
            read: async () => i < chunks.length ? { done: false, value: chunks[i++] } : { done: true, value: undefined },
            cancel: async () => {},
          };
        },
      },
    };
  }

  test('rejects when DNS resolves to a private/loopback address', async () => {
    const lookup = async () => [{ address: '127.0.0.1' }];
    const fetchImpl = jest.fn();
    const result = await fetchTrustedImage(
      'https://firebasestorage.googleapis.com/v0/b/xekho-release-canonical.appspot.com/o/x.png',
      { ...baseOpts, lookup, requestImpl: fetchImpl }
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('private_address');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test('pins native HTTPS lookup to validated address and keeps TLS servername hostname', async () => {
    const lookup = jest.fn(async () => [{ address: '8.8.8.8', family: 4 }]);
    const requestImpl = jest.fn(async (_url, options) => {
      expect(options.servername).toBe('firebasestorage.googleapis.com');
      await new Promise((resolve, reject) => options.lookup('firebasestorage.googleapis.com', { all: true }, (error, address, family) => {
        if (error) return reject(error);
        expect(address).toBe('8.8.8.8');
        expect(family).toBe(4);
        resolve();
      }));
      return makeResponse({ bodyChunks: [new Uint8Array(1)] });
    });
    const result = await fetchTrustedImage(
      'https://firebasestorage.googleapis.com/v0/b/xekho-release-canonical.appspot.com/o/x.png',
      { ...baseOpts, lookup, requestImpl }
    );
    expect(result).toMatchObject({ ok: true, mimeType: 'image/png' });
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(requestImpl).toHaveBeenCalledTimes(1);
  });

  test('pins every redirect hop after separately validating each DNS answer', async () => {
    const lookup = jest.fn()
      .mockResolvedValueOnce([{ address: '8.8.8.8', family: 4 }])
      .mockResolvedValueOnce([{ address: '1.1.1.1', family: 4 }]);
    const pinned = [];
    const requestImpl = jest.fn(async (_url, options) => {
      await new Promise((resolve, reject) => options.lookup(options.servername, {}, (error, address, family) => {
        if (error) return reject(error);
        pinned.push({ hostname: options.servername, address, family });
        resolve();
      }));
      return pinned.length === 1
        ? makeResponse({ status: 302, headers: { location: 'https://firebasestorage.googleapis.com/v0/b/xekho-release-canonical.appspot.com/o/y.png' } })
        : makeResponse({ bodyChunks: [new Uint8Array(1)] });
    });
    const result = await fetchTrustedImage(
      'https://firebasestorage.googleapis.com/v0/b/xekho-release-canonical.appspot.com/o/x.png',
      { ...baseOpts, lookup, requestImpl }
    );
    expect(result.ok).toBe(true);
    expect(lookup).toHaveBeenCalledTimes(2);
    expect(pinned).toEqual([
      { hostname: 'firebasestorage.googleapis.com', address: '8.8.8.8', family: 4 },
      { hostname: 'firebasestorage.googleapis.com', address: '1.1.1.1', family: 4 },
    ]);
  });

  test('follows one bounded redirect then revalidates the new host', async () => {
    let calls = 0;
    const fetchImpl = jest.fn(async () => {
      calls += 1;
      if (calls === 1) {
        return makeResponse({ status: 302, headers: { location: 'https://firebasestorage.googleapis.com/v0/b/xekho-release-canonical.appspot.com/o/y.png' } });
      }
      return makeResponse({ status: 200, headers: { 'content-type': 'image/png', 'content-length': '8' }, bodyChunks: [new Uint8Array(8)] });
    });
    const lookup = async () => [{ address: '8.8.8.8' }];
    const result = await fetchTrustedImage(
      'https://firebasestorage.googleapis.com/v0/b/xekho-release-canonical.appspot.com/o/x.png',
      { ...baseOpts, lookup, requestImpl: fetchImpl }
    );
    expect(result.ok).toBe(true);
    expect(calls).toBe(2);
  });

  test('stops after maxRedirects and returns redirect_blocked', async () => {
    const fetchImpl = jest.fn(async () => makeResponse({ status: 302, headers: { location: 'https://firebasestorage.googleapis.com/v0/b/xekho-release-canonical.appspot.com/o/loop.png' } }));
    const lookup = async () => [{ address: '8.8.8.8' }];
    const result = await fetchTrustedImage(
      'https://firebasestorage.googleapis.com/v0/b/xekho-release-canonical.appspot.com/o/x.png',
      { ...baseOpts, lookup, requestImpl: fetchImpl }
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('redirect_blocked');
  });

  test('rejects non-image MIME content-type', async () => {
    const fetchImpl = jest.fn(async () => makeResponse({ status: 200, headers: { 'content-type': 'text/html', 'content-length': '4' }, bodyChunks: ['<p>pwn</p>'] }));
    const lookup = async () => [{ address: '8.8.8.8' }];
    const result = await fetchTrustedImage(
      'https://firebasestorage.googleapis.com/v0/b/xekho-release-canonical.appspot.com/o/x.png',
      { ...baseOpts, lookup, requestImpl: fetchImpl }
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('unsupported_mime');
  });

  test('requires exact image MIME type while accepting normal parameters', async () => {
    const lookup = async () => [{ address: '8.8.8.8' }];
    const url = 'https://firebasestorage.googleapis.com/v0/b/xekho-release-canonical.appspot.com/o/x.png';
    for (const contentType of ['image/png-evil', 'image/jpegx', 'image/webp/evil']) {
      const result = await fetchTrustedImage(url, {
        ...baseOpts,
        lookup,
        fetchImpl: jest.fn(async () => makeResponse({ contentType, bodyChunks: [new Uint8Array(1)] })),
      });
      expect(result).toMatchObject({ ok: false, reason: 'unsupported_mime' });
    }
    const result = await fetchTrustedImage(url, {
      ...baseOpts,
      lookup,
      fetchImpl: jest.fn(async () => makeResponse({ contentType: ' Image/PNG ; charset=binary ', bodyChunks: [new Uint8Array(1)] })),
    });
    expect(result).toMatchObject({ ok: true, mimeType: 'image/png' });
  });

  test('rejects declared content-length over the cap before streaming', async () => {
    const fetchImpl = jest.fn(async () => makeResponse({ status: 200, headers: { 'content-type': 'image/png', 'content-length': '9999' }, bodyChunks: [new Uint8Array(9999)] }));
    const lookup = async () => [{ address: '8.8.8.8' }];
    const result = await fetchTrustedImage(
      'https://firebasestorage.googleapis.com/v0/b/xekho-release-canonical.appspot.com/o/x.png',
      { ...baseOpts, lookup, requestImpl: fetchImpl }
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('too_large');
  });

  test('aborts incremental streaming when actual bytes exceed the cap', async () => {
    const cancelMock = jest.fn(async () => {});
    const fetchImpl = jest.fn(async () => makeResponse({
      status: 200,
      headers: { 'content-type': 'image/png' },
      bodyChunks: [new Uint8Array(32), new Uint8Array(64)],
    }));
    fetchImpl.mockReturnValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'image/png' },
      body: { getReader: () => {
        let i = 0;
        const chunks = [new Uint8Array(32), new Uint8Array(64)];
        return {
          read: async () => i < chunks.length ? { done: false, value: chunks[i++] } : { done: true, value: undefined },
          cancel: cancelMock,
        };
      } },
    });
    const lookup = async () => [{ address: '8.8.8.8' }];
    const result = await fetchTrustedImage(
      'https://firebasestorage.googleapis.com/v0/b/xekho-release-canonical.appspot.com/o/x.png',
      { ...baseOpts, lookup, requestImpl: fetchImpl }
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('too_large');
    expect(cancelMock).toHaveBeenCalled();
  });
});

describe('readBodyWithLimit incremental byte cap', () => {
  test('returns buffered body when within cap', async () => {
    const chunks = [new Uint8Array(2), new Uint8Array(2)];
    const response = {
      body: { getReader: () => {
        let i = 0;
        return {
          read: async () => i < chunks.length ? { done: false, value: chunks[i++] } : { done: true, value: undefined },
          cancel: async () => {},
        };
      } },
    };
    const result = await readBodyWithLimit(response, 8, { abort: () => {} });
    expect(result.ok).toBe(true);
    expect(result.buffer.length).toBe(4);
  });

  test('cancels reader and aborts when cap exceeded mid-stream', async () => {
    const cancelMock = jest.fn(async () => {});
    const abortMock = jest.fn();
    const chunks = [new Uint8Array(10), new Uint8Array(10)];
    const response = {
      body: { getReader: () => {
        let i = 0;
        return {
          read: async () => i < chunks.length ? { done: false, value: chunks[i++] } : { done: true, value: undefined },
          cancel: cancelMock,
        };
      } },
    };
    const result = await readBodyWithLimit(response, 8, { abort: abortMock });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('too_large');
    expect(cancelMock).toHaveBeenCalled();
    expect(abortMock).toHaveBeenCalled();
  });

  test('fails closed without calling unbounded arrayBuffer when bounded reader is unavailable', async () => {
    const arrayBuffer = jest.fn(async () => new ArrayBuffer(1024 * 1024));
    await expect(readBodyWithLimit({ arrayBuffer }, 8)).resolves.toMatchObject({
      ok: false,
      reason: 'unsupported_body_stream',
    });
    expect(arrayBuffer).not.toHaveBeenCalled();
  });
});

describe('fetchTrustedImage timeout covers body streaming', () => {
  test('times out hanging body read and cancels body reader', async () => {
    const cancelMock = jest.fn(async () => {});
    const requestImpl = jest.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: name => name === 'content-type' ? 'image/png' : null },
      body: { getReader: () => ({ read: () => new Promise(() => {}), cancel: cancelMock }) },
    }));
    const result = await Promise.race([
      fetchTrustedImage(
        'https://firebasestorage.googleapis.com/v0/b/xekho-release-canonical.appspot.com/o/x.png',
        {
          allowedHosts: STORAGE_HOSTS,
          allowedBuckets: STORAGE_BUCKETS,
          lookup: async () => [{ address: '8.8.8.8' }],
          requestImpl,
          timeoutMs: 20,
        }
      ),
      new Promise(resolve => setTimeout(() => resolve({ reason: 'test_deadline' }), 200)),
    ]);
    expect(result).toMatchObject({ ok: false, reason: 'timeout' });
    expect(cancelMock).toHaveBeenCalled();
  });
});
