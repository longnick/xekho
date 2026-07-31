const {
  authorizeCallable,
  resolveCallerRole,
  CALLABLE_ALLOWED_ROLES,
} = require('./utils/callableAuthorization');

function makeDb({ exists = false, role } = {}) {
  const get = jest.fn().mockResolvedValue({
    exists,
    data: () => ({ role }),
  });
  return {
    collection: jest.fn(() => ({ doc: jest.fn(() => ({ get })) })),
    get,
  };
}

function makeAuth(role = '') {
  return {
    getUser: jest.fn().mockResolvedValue({ customClaims: { role } }),
  };
}

const request = uid => ({ auth: uid ? { uid } : undefined });
const guard = (requestValue, db, auth, allowedRoles) => authorizeCallable(requestValue, {
  db,
  auth,
  allowedRoles,
  operation: 'test operation',
});

describe('callable authorization', () => {
  test('denies unauthenticated request before role lookup', async () => {
    const db = makeDb();
    const auth = makeAuth('admin');

    await expect(guard(request(), db, auth, CALLABLE_ALLOWED_ROLES.ORDER_APPROVE))
      .rejects.toMatchObject({ code: 'unauthenticated' });
    expect(db.get).not.toHaveBeenCalled();
    expect(auth.getUser).not.toHaveBeenCalled();
  });

  test('denies unauthorized documented role', async () => {
    await expect(guard(request('staff-uid'), makeDb({ exists: true, role: 'staff' }), makeAuth('admin'), CALLABLE_ALLOWED_ROLES.ORDER_APPROVE))
      .rejects.toMatchObject({ code: 'permission-denied' });
  });

  test('allows documented authorized role', async () => {
    await expect(guard(request('manager-uid'), makeDb({ exists: true, role: 'manager' }), makeAuth('staff'), CALLABLE_ALLOWED_ROLES.ORDER_APPROVE))
      .resolves.toEqual({ uid: 'manager-uid', role: 'manager' });
  });

  test('uses custom claim only when user document is absent', async () => {
    await expect(resolveCallerRole(makeDb({ exists: false }), makeAuth('admin'), 'claim-uid'))
      .resolves.toBe('admin');
  });

  test('fails closed when users document lookup rejects and never reads Auth claims', async () => {
    const db = makeDb();
    const auth = makeAuth('admin');
    db.get.mockRejectedValueOnce(new Error('Firestore unavailable'));

    await expect(guard(request('lookup-uid'), db, auth, CALLABLE_ALLOWED_ROLES.ORDER_APPROVE))
      .rejects.toThrow('Firestore unavailable');
    expect(auth.getUser).not.toHaveBeenCalled();
  });

  test.each(['manager', 'admin'])('allows missing document verified %s claim fallback', async (role) => {
    await expect(guard(request('claim-uid'), makeDb({ exists: false }), makeAuth(role), CALLABLE_ALLOWED_ROLES.ORDER_APPROVE))
      .resolves.toEqual({ uid: 'claim-uid', role });
  });

  test.each(['staff', 'unknown', ''])('denies missing document verified %s claim fallback', async (role) => {
    await expect(guard(request('claim-uid'), makeDb({ exists: false }), makeAuth(role), CALLABLE_ALLOWED_ROLES.ORDER_APPROVE))
      .rejects.toMatchObject({ code: 'permission-denied', message: 'Bạn không có quyền thực hiện thao tác này.' });
  });

  test.each([['', 'blank'], ['unknown', 'invalid']])('denies %s existing document role without claim fallback', async (role) => {
    const auth = makeAuth('admin');
    await expect(guard(request('doc-uid'), makeDb({ exists: true, role }), auth, CALLABLE_ALLOWED_ROLES.ORDER_APPROVE))
      .rejects.toMatchObject({ code: 'permission-denied' });
    expect(auth.getUser).not.toHaveBeenCalled();
  });

  test('keeps reviewed role matrix', () => {
    expect(CALLABLE_ALLOWED_ROLES).toEqual({
      ORDER_APPROVE: ['manager', 'admin', 'owner', 'superadmin'],
      ORDER_REJECT: ['manager', 'admin', 'owner', 'superadmin'],
      ORDER_COMPLETE: ['manager', 'admin', 'owner', 'superadmin'],
      USER_MANAGE: ['manager', 'admin', 'owner', 'superadmin'],
      POS_CHATBOT: ['staff', 'manager', 'admin', 'owner', 'superadmin'],
    });
  });
});
