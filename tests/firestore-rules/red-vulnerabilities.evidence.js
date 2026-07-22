const {
  assertFails,
} = require('@firebase/rules-unit-testing');
const {
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

/**
 * RED evidence only.
 *
 * This file intentionally expects the policy that Sprint 1 will enforce.
 * Against the current rules each assertion fails because the unauthorised
 * mutation is allowed. It is invoked explicitly, not by default Jest discovery,
 * so the repository remains testable until the remediation is implemented.
 */
describe('RED evidence — current Firestore authorization gaps', () => {
  beforeAll(async () => {
    await setupRulesTestEnvironment();
  });

  beforeEach(async () => {
    await clearAndSeedBaseline();
  });

  afterAll(async () => {
    await cleanupRulesTestEnvironment();
  });

  test('ordinary user cannot elevate their own role', async () => {
    await assertFails(setDoc(
      doc(authedDb('attacker.test'), 'users', 'attacker.test'),
      { role: 'admin' },
      { merge: true },
    ));
  });

  test('ordinary user cannot rewrite another user profile', async () => {
    await assertFails(updateDoc(
      doc(authedDb('attacker.test'), 'users', 'victim.test'),
      { displayName: 'Changed by attacker' },
    ));
  });

  test('ordinary user cannot manipulate completed financial history', async () => {
    await assertFails(updateDoc(
      doc(authedDb('attacker.test'), 'history', 'history.test'),
      { total: 1 },
    ));
  });

  test('ordinary user cannot change another staff payroll record', async () => {
    await assertFails(updateDoc(
      doc(authedDb('attacker.test'), 'attendance_daily', 'victim.test_2026-07-10'),
      { totalWage: 999999 },
    ));
  });
});
