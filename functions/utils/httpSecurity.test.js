const {
  parseBearerToken,
  authorizeRequest,
  isContentLengthAllowed,
  validateBase64Media,
  createRateLimiter,
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

  test('rate limits by authenticated UID rather than shared IP', () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60000, now: () => 1000 });
    expect(limiter.take('uid:staff-1')).toBe(true);
    expect(limiter.take('uid:staff-1')).toBe(true);
    expect(limiter.take('uid:staff-1')).toBe(false);
    expect(limiter.take('uid:staff-2')).toBe(true);
  });
});
