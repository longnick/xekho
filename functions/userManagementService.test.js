const { createManagedUser } = require('./userManagementService');

function makeDeps() {
  const createdUser = { uid: 'managed-user.test' };
  const auth = {
    createUser: jest.fn().mockResolvedValue(createdUser),
    setCustomUserClaims: jest.fn().mockResolvedValue(undefined),
    deleteUser: jest.fn().mockResolvedValue(undefined),
  };
  const set = jest.fn().mockResolvedValue(undefined);
  const db = {
    collection: jest.fn(() => ({ doc: jest.fn(() => ({ set })) })),
  };
  return { auth, db, set, now: '2026-07-10T04:05:00.000Z' };
}

const staffInput = {
  email: 'staff@example.test',
  password: 'correct-horse-battery-staple',
  displayName: 'Nhân viên Test',
  role: 'staff',
};

describe('managed user server service', () => {
  test('rejects unauthenticated input before Auth or Firestore calls', async () => {
    const deps = makeDeps();

    await expect(createManagedUser({ auth: null, data: staffInput }, deps))
      .rejects.toMatchObject({ code: 'unauthenticated' });
    expect(deps.auth.createUser).not.toHaveBeenCalled();
    expect(deps.set).not.toHaveBeenCalled();
  });

  test('uses resolved actor, not request token role, before Auth or Firestore calls', async () => {
    const deps = makeDeps();

    await expect(createManagedUser({
      auth: { uid: 'manager.test', token: { role: 'admin' } },
      data: { ...staffInput, role: 'admin' },
    }, { ...deps, actor: { uid: 'manager.test', role: 'manager' } }))
      .rejects.toMatchObject({ code: 'permission-denied' });
    expect(deps.auth.createUser).not.toHaveBeenCalled();
    expect(deps.set).not.toHaveBeenCalled();
  });

  test('manager can create staff account with server-issued role and audit fields', async () => {
    const deps = makeDeps();

    await expect(createManagedUser({
      auth: { uid: 'manager.test', token: { role: 'admin' } },
      data: staffInput,
    }, { ...deps, actor: { uid: 'manager.test', role: 'manager' } }))
      .resolves.toEqual({ uid: 'managed-user.test', role: 'staff' });

    expect(deps.auth.createUser).toHaveBeenCalledWith({
      email: 'staff@example.test',
      password: 'correct-horse-battery-staple',
      displayName: 'Nhân viên Test',
      emailVerified: false,
    });
    expect(deps.auth.setCustomUserClaims).toHaveBeenCalledWith('managed-user.test', { role: 'staff' });
    expect(deps.db.collection).toHaveBeenCalledWith('users');
    expect(deps.set).toHaveBeenCalledWith({
      uid: 'managed-user.test',
      email: 'staff@example.test',
      displayName: 'Nhân viên Test',
      username: 'staff',
      role: 'staff',
      createdBy: 'manager.test',
      createdAt: '2026-07-10T04:05:00.000Z',
      updatedAt: '2026-07-10T04:05:00.000Z',
    });
  });

  test('rolls back the newly created Auth account when server profile write fails', async () => {
    const deps = makeDeps();
    deps.set.mockRejectedValueOnce(new Error('Firestore unavailable'));

    await expect(createManagedUser({
      auth: { uid: 'admin.test', token: { role: 'admin' } },
      data: staffInput,
    }, { ...deps, actor: { uid: 'admin.test', role: 'admin' } })).rejects.toThrow('Firestore unavailable');
    expect(deps.auth.deleteUser).toHaveBeenCalledWith('managed-user.test');
  });

  test('rejects a missing resolved actor before Auth or Firestore calls', async () => {
    const deps = makeDeps();

    await expect(createManagedUser({ auth: { uid: 'admin.test' }, data: staffInput }, deps))
      .rejects.toMatchObject({ code: 'unauthenticated' });
    expect(deps.auth.createUser).not.toHaveBeenCalled();
    expect(deps.set).not.toHaveBeenCalled();
  });
});
