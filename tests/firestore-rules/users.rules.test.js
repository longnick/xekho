const {
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');
const {
  getDoc,
  setDoc,
  updateDoc,
} = require('firebase/firestore');
const {
  authedDb,
  cleanupRulesTestEnvironment,
  clearAndSeedBaseline,
  doc,
  setupRulesTestEnvironment,
} = require('./helpers');

describe('users Rules — server-owned identity and self profile boundary', () => {
  beforeAll(async () => {
    await setupRulesTestEnvironment();
  });

  beforeEach(async () => {
    await clearAndSeedBaseline();
  });

  afterAll(async () => {
    await cleanupRulesTestEnvironment();
  });

  test('client cannot create a role-bearing user document for itself', async () => {
    await assertFails(setDoc(
      doc(authedDb('new-user.test'), 'users', 'new-user.test'),
      {
        uid: 'new-user.test',
        email: 'new-user@example.test',
        displayName: 'New user',
        role: 'staff',
      },
    ));
  });

  test('staff cannot elevate or alter server-owned identity fields on their own profile', async () => {
    const attacker = authedDb('attacker.test');

    await assertFails(updateDoc(
      doc(attacker, 'users', 'attacker.test'),
      { role: 'admin' },
    ));
    await assertFails(updateDoc(
      doc(attacker, 'users', 'attacker.test'),
      { staffId: 'victim.test' },
    ));
    await assertFails(updateDoc(
      doc(attacker, 'users', 'attacker.test'),
      { disabled: true },
    ));
  });

  test('staff can update only their self-service profile allowlist', async () => {
    await assertSucceeds(updateDoc(
      doc(authedDb('attacker.test'), 'users', 'attacker.test'),
      { displayName: 'Updated display name' },
    ));
  });

  test('staff cannot read or change another user profile', async () => {
    const attacker = authedDb('attacker.test');

    await assertFails(getDoc(doc(attacker, 'users', 'victim.test')));
    await assertFails(updateDoc(
      doc(attacker, 'users', 'victim.test'),
      { displayName: 'Changed by attacker' },
    ));
  });

  test('manager retains personnel-directory read access while clients cannot mutate role fields', async () => {
    const manager = authedDb('manager.test');

    await assertSucceeds(getDoc(doc(manager, 'users', 'victim.test')));
    await assertFails(updateDoc(
      doc(manager, 'users', 'victim.test'),
      { role: 'admin' },
    ));
  });
});
