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

describe('attendance Rules — server-owned UID to staff mapping', () => {
  beforeAll(async () => {
    await setupRulesTestEnvironment();
  });

  beforeEach(async () => {
    await clearAndSeedBaseline();
  });

  afterAll(async () => {
    await cleanupRulesTestEnvironment();
  });

  test('staff cannot read or mutate another staff attendance or payroll', async () => {
    const staff = authedDb('attacker.test');

    await assertSucceeds(getDoc(doc(staff, 'Staff', 'attacker.test')));
    await assertFails(getDoc(doc(staff, 'Staff', 'victim.test')));
    await assertFails(getDoc(doc(staff, 'attendance_daily', 'victim.test_2026-07-10')));
    await assertFails(setDoc(doc(staff, 'attendance_shifts', 'victim-shift.test'), {
      staffId: 'victim.test', status: 'open', checkInAt: '2026-07-10T08:00:00.000Z',
    }));
    await assertFails(updateDoc(doc(staff, 'attendance_daily', 'victim.test_2026-07-10'), { totalWage: 999999 }));
  });

  test('staff cannot change even own wage or daily payroll fields', async () => {
    await assertFails(updateDoc(
      doc(authedDb('attacker.test'), 'attendance_daily', 'attacker.test_2026-07-10'),
      { totalWage: 1 },
    ));
  });

  test('staff can create own open shift and close only an own active shift', async () => {
    const staff = authedDb('attacker.test');

    await assertSucceeds(setDoc(doc(staff, 'attendance_shifts', 'attacker-new-shift.test'), {
      shiftId: 'attacker-new-shift.test',
      dailyId: 'attacker.test_2026-07-10',
      staffId: 'attacker.test',
      status: 'open',
      checkInAt: '2026-07-10T09:00:00.000Z',
      checkInAtMs: 1783654800000,
      checkOutAt: null,
      checkOutAtMs: null,
      durationMinutes: null,
    }));
    await assertSucceeds(updateDoc(doc(staff, 'attendance_shifts', 'attacker-shift.test'), {
      status: 'closed',
      checkOutAt: '2026-07-10T10:00:00.000Z',
      checkOutAtMs: 1783658400000,
      durationMinutes: 60,
    }));
  });

  test('staff cannot reopen or rewrite a closed shift', async () => {
    const staff = authedDb('attacker.test');
    const shift = doc(staff, 'attendance_shifts', 'attacker-shift.test');
    await assertSucceeds(updateDoc(shift, {
      status: 'closed', checkOutAt: '2026-07-10T10:00:00.000Z', checkOutAtMs: 1783658400000, durationMinutes: 60,
    }));
    await assertFails(updateDoc(shift, { checkInAt: '2026-07-10T07:00:00.000Z' }));
  });

  test('manager retains attendance adjustment access', async () => {
    await assertSucceeds(updateDoc(
      doc(authedDb('manager.test'), 'attendance_daily', 'victim.test_2026-07-10'),
      { totalWage: 250000, status: 'adjusted' },
    ));
  });
});
