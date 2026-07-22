const {
  makeCallableHandlers,
  toSafeCallableError,
  toSafeManagedUserError,
} = require('./callableHandlers');

const genericPermissionMessage = 'Bạn không có quyền thực hiện thao tác này.';
const HttpsError = class HttpsError extends Error {
  constructor(code, message) { super(message); this.code = code; }
};

function makeDeps() {
  const authorize = jest.fn().mockResolvedValue({ uid: 'server-actor', role: 'admin' });
  const createManagedUser = jest.fn().mockResolvedValue({ uid: 'new-user', role: 'staff' });
  const runAskPosChatbot = jest.fn().mockResolvedValue({ answer: 'ok' });
  const approveOnlineOrder = jest.fn().mockResolvedValue({ ok: true });
  const rejectOnlineOrder = jest.fn().mockResolvedValue({ ok: true });
  const handlers = makeCallableHandlers({
    authorize,
    createManagedUser,
    runAskPosChatbot,
    approveOnlineOrder,
    rejectOnlineOrder,
    HttpsError,
  });
  return { handlers, authorize, createManagedUser, runAskPosChatbot, approveOnlineOrder, rejectOnlineOrder };
}

function blockedAuthorize(code) {
  return jest.fn().mockRejectedValue(new HttpsError(code, genericPermissionMessage));
}

function throwingDataRequest(auth = { uid: 'caller' }) {
  return new Proxy({ auth }, {
    get(target, property, receiver) {
      if (property === 'data') throw new Error('payload accessed');
      return Reflect.get(target, property, receiver);
    },
  });
}

describe('R2 executable callable handlers', () => {
  test('safe wrappers preserve HttpsError but hide backend error details', () => {
    const denied = new HttpsError('permission-denied', genericPermissionMessage);
    expect(toSafeCallableError(denied, HttpsError, 'Lỗi công khai')).toBe(denied);
    expect(toSafeManagedUserError(denied, HttpsError)).toBe(denied);
    expect(toSafeCallableError(new Error('Firestore unavailable'), HttpsError, 'Lỗi công khai'))
      .toMatchObject({ code: 'internal', message: 'Lỗi công khai' });

    const spoofed = new Error('Firestore unavailable');
    spoofed.code = 'invalid-argument';
    expect(toSafeManagedUserError(spoofed, HttpsError)).toMatchObject({
      code: 'invalid-argument', message: 'Thông tin tài khoản nhân viên không hợp lệ.',
    });
    expect(toSafeManagedUserError(new Error('Firestore unavailable'), HttpsError)).toMatchObject({
      code: 'internal', message: 'Không thể quản lý tài khoản nhân viên.',
    });
  });

  test.each([
    ['manageUserAccount', 'createManagedUser'],
    ['askPosChatbot', 'runAskPosChatbot'],
    ['approveOnlineOrder', 'approveOnlineOrder'],
    ['rejectOnlineOrder', 'rejectOnlineOrder'],
  ])('%s blocks unauthenticated request before payload or business access', async (name, business) => {
    const deps = makeDeps();
    deps.authorize = blockedAuthorize('unauthenticated');
    deps.handlers = makeCallableHandlers({ ...deps, HttpsError });

    await expect(deps.handlers[name](throwingDataRequest())).rejects.toMatchObject({ code: 'unauthenticated' });
    expect(deps[business]).not.toHaveBeenCalled();
  });

  test.each([
    ['manageUserAccount', 'createManagedUser'],
    ['askPosChatbot', 'runAskPosChatbot'],
    ['approveOnlineOrder', 'approveOnlineOrder'],
    ['rejectOnlineOrder', 'rejectOnlineOrder'],
  ])('%s blocks unauthorized request before payload or business access', async (name, business) => {
    const deps = makeDeps();
    deps.authorize = blockedAuthorize('permission-denied');
    deps.handlers = makeCallableHandlers({ ...deps, HttpsError });

    await expect(deps.handlers[name](throwingDataRequest())).rejects.toMatchObject({
      code: 'permission-denied', message: genericPermissionMessage,
    });
    expect(deps[business]).not.toHaveBeenCalled();
  });

  test('manageUserAccount passes server-resolved actor, never token role, to service', async () => {
    const deps = makeDeps();
    const request = { auth: { uid: 'caller', token: { role: 'manager' } }, data: { role: 'staff' } };

    await expect(deps.handlers.manageUserAccount(request)).resolves.toEqual({ uid: 'new-user', role: 'staff' });
    expect(deps.createManagedUser).toHaveBeenCalledWith(request, expect.objectContaining({
      actor: { uid: 'server-actor', role: 'admin' },
    }));
  });

  test('askPosChatbot executes authorized payload', async () => {
    const deps = makeDeps();
    await expect(deps.handlers.askPosChatbot({ auth: { uid: 'caller' }, data: { userMessage: ' doanh thu ' } }))
      .resolves.toEqual({ answer: 'ok' });
    expect(deps.runAskPosChatbot).toHaveBeenCalledWith('doanh thu');
  });

  test.each([
    ['approveOnlineOrder', 'approveOnlineOrder'],
    ['rejectOnlineOrder', 'rejectOnlineOrder'],
  ])('%s rejects invalid order ID after authorization', async (name, business) => {
    const invalidIds = [undefined, {}, 'a/b', '.', '..', 'a\u0000b', 'x'.repeat(257)];
    for (const orderId of invalidIds) {
      const deps = makeDeps();
      await expect(deps.handlers[name]({ auth: { uid: 'caller' }, data: { orderId } }))
        .rejects.toMatchObject({ code: 'invalid-argument' });
      expect(deps.authorize).toHaveBeenCalled();
      expect(deps[business]).not.toHaveBeenCalled();
    }
  });

  test('approveOnlineOrder executes authorized ID with caller audit identity', async () => {
    const deps = makeDeps();
    await expect(deps.handlers.approveOnlineOrder({ auth: { uid: 'caller', token: { email: 'x@example.test' } }, data: { orderId: ' o-1 ' } }))
      .resolves.toEqual({ ok: true });
    expect(deps.approveOnlineOrder).toHaveBeenCalledWith('o-1', {
      source: 'pos', userId: 'caller', username: 'x@example.test',
    });
  });

  test('rejectOnlineOrder executes authorized ID with caller audit identity', async () => {
    const deps = makeDeps();
    await expect(deps.handlers.rejectOnlineOrder({ auth: { uid: 'caller', token: { name: 'User' } }, data: { orderId: 'o-2' } }))
      .resolves.toEqual({ ok: true });
    expect(deps.rejectOnlineOrder).toHaveBeenCalledWith('o-2', {
      source: 'pos', userId: 'caller', username: 'User',
    });
  });
});
