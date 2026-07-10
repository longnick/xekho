const {
  assertCanManageRole,
  buildManagedUserDocument,
  normalizeManagedUserInput,
} = require('./userManagement');

describe('user management authorization contract', () => {
  test('only an admin or owner custom claim can assign manager/admin roles', () => {
    expect(() => assertCanManageRole({ uid: 'manager.test', role: 'manager' }, 'manager')).toThrow('permission-denied');
    expect(() => assertCanManageRole({ uid: 'staff.test', role: 'staff' }, 'staff')).toThrow('permission-denied');
    expect(() => assertCanManageRole({}, 'staff')).toThrow('unauthenticated');
    expect(() => assertCanManageRole({ uid: 'admin.test', role: 'admin' }, 'manager')).not.toThrow();
    expect(() => assertCanManageRole({ uid: 'owner.test', role: 'owner' }, 'admin')).not.toThrow();
  });

  test('manager custom claim can provision only staff or kitchen accounts', () => {
    expect(() => assertCanManageRole({ uid: 'manager.test', role: 'manager' }, 'staff')).not.toThrow();
    expect(() => assertCanManageRole({ uid: 'manager.test', role: 'manager' }, 'kitchen')).not.toThrow();
    expect(() => assertCanManageRole({ uid: 'manager.test', role: 'manager' }, 'manager')).toThrow('permission-denied');
    expect(() => assertCanManageRole({ uid: 'manager.test', role: 'manager' }, 'admin')).toThrow('permission-denied');
  });

  test('normalizes an authorized server-side staff mapping and strips unrelated fields', () => {
    const input = normalizeManagedUserInput({
      email: ' STAFF@EXAMPLE.TEST ',
      password: 'correct-horse-battery-staple',
      displayName: ' Nhân viên Test ',
      role: 'staff',
      staffId: ' staff-001 ',
      disabled: false,
    });

    expect(input).toEqual({
      email: 'staff@example.test',
      password: 'correct-horse-battery-staple',
      displayName: 'Nhân viên Test',
      role: 'staff',
      staffId: 'staff-001',
    });

    expect(buildManagedUserDocument({
      uid: 'managed-user.test',
      input,
      actorUid: 'admin.test',
      now: '2026-07-10T04:00:00.000Z',
    })).toEqual({
      uid: 'managed-user.test',
      email: 'staff@example.test',
      displayName: 'Nhân viên Test',
      username: 'staff',
      role: 'staff',
      staffId: 'staff-001',
      createdBy: 'admin.test',
      createdAt: '2026-07-10T04:00:00.000Z',
      updatedAt: '2026-07-10T04:00:00.000Z',
    });
  });

  test('rejects invalid role, email, or short password before any Auth write', () => {
    expect(() => normalizeManagedUserInput({
      email: 'not-an-email', password: 'correct-horse-battery-staple', displayName: 'Test', role: 'staff',
    })).toThrow('invalid-argument');
    expect(() => normalizeManagedUserInput({
      email: 'staff@example.test', password: 'short', displayName: 'Test', role: 'staff',
    })).toThrow('invalid-argument');
    expect(() => normalizeManagedUserInput({
      email: 'staff@example.test', password: 'correct-horse-battery-staple', displayName: 'Test', role: 'superadmin',
    })).toThrow('invalid-argument');
  });
});
