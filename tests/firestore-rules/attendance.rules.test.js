const {
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');
const {
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} = require('firebase/firestore');
const {
  authedDb,
  cleanupRulesTestEnvironment,
  clearAndSeedBaseline,
  doc,
  setupRulesTestEnvironment,
} = require('./helpers');

const STAFF_ID = 'attacker.test';
const DATE_KEY = '2026-07-13';
const DAILY_ID = `${STAFF_ID}_${DATE_KEY}`;
const SHIFT_ID = `${DAILY_ID}_1783914000000`;
const SECOND_SHIFT_ID = `${DAILY_ID}_1783921200000`;

function ownDaily(overrides = {}) {
  return {
    dailyId: DAILY_ID, staffId: STAFF_ID, staffName: 'Attacker', dateKey: DATE_KEY,
    firstCheckInAt: '2026-07-13T09:00:00.000Z', firstCheckInAtMs: 1783914000000,
    lastCheckOutAt: null, lastCheckOutAtMs: null, status: 'open', source: 'web',
    locationDistanceMeters: 3, lastLocationAt: '2026-07-13T09:00:00.000Z', updatedAt: serverTimestamp(),
    ...overrides,
  };
}

function ownShift(overrides = {}) {
  return {
    shiftId: SHIFT_ID, dailyId: DAILY_ID, staffId: STAFF_ID, staffName: 'Attacker', dateKey: DATE_KEY,
    checkInAt: '2026-07-13T09:00:00.000Z', checkInAtMs: 1783914000000,
    checkOutAt: null, checkOutAtMs: null, durationMinutes: null, status: 'open', source: 'web',
    location: { distanceMeters: 3 }, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    ...overrides,
  };
}

describe('attendance Rules — strict mapped-staff operational contract', () => {
  beforeAll(async () => { await setupRulesTestEnvironment(); });
  beforeEach(async () => { await clearAndSeedBaseline(); });
  afterAll(async () => { await cleanupRulesTestEnvironment(); });

  test('staff cannot read or mutate another staff attendance or payroll', async () => {
    const staff = authedDb(STAFF_ID);
    await assertSucceeds(getDoc(doc(staff, 'Staff', STAFF_ID)));
    await assertFails(getDoc(doc(staff, 'Staff', 'victim.test')));
    await assertFails(getDoc(doc(staff, 'attendance_daily', 'victim.test_2026-07-10')));
    await assertFails(setDoc(doc(staff, 'attendance_shifts', 'victim-shift.test'), ownShift({
      shiftId: 'victim-shift.test', dailyId: 'victim.test_2026-07-13', staffId: 'victim.test',
    })));
    await assertFails(updateDoc(doc(staff, 'attendance_daily', 'victim.test_2026-07-10'), { totalWage: 999999 }));
  });

  test('staff accepts exact atomic daily and shift check-in batch', async () => {
    const staff = authedDb(STAFF_ID);
    const batch = writeBatch(staff);
    batch.set(doc(staff, 'attendance_daily', DAILY_ID), ownDaily());
    batch.set(doc(staff, 'attendance_shifts', SHIFT_ID), ownShift());
    await assertSucceeds(batch.commit());
  });

  test.each([
    ['missing required field', () => { const x = ownDaily(); delete x.updatedAt; return x; }],
    ['unknown field', () => ownDaily({ payrollApproved: true })],
    ['mismatched daily doc ID', () => ownDaily()],
    ['mismatched daily ID', () => ownDaily({ dailyId: 'other.test_2026-07-13' })],
    ['mismatched daily staff ID', () => ownDaily({ staffId: 'victim.test', dailyId: 'victim.test_2026-07-13' })],
    ['wrong daily timestamp type', () => ownDaily({ firstCheckInAtMs: '1783914000000' })],
    ['wrong daily source', () => ownDaily({ source: 'telegram' })],
    ['wrong daily status', () => ownDaily({ status: 'closed' })],
    ['daily payroll field', () => ownDaily({ totalWage: 1 })],
  ])('staff rejects daily create: %s', async (name, make) => {
    const staff = authedDb(STAFF_ID);
    const docId = name === 'mismatched daily doc ID' ? `wrong_${DATE_KEY}` : DAILY_ID;
    await assertFails(setDoc(doc(staff, 'attendance_daily', docId), make()));
  });

  test.each([
    ['missing required field', () => { const x = ownShift(); delete x.createdAt; return x; }],
    ['unknown field', () => ownShift({ adminNote: 'no' })],
    ['mismatched shift doc ID', () => ownShift()],
    ['mismatched shift ID', () => ownShift({ shiftId: 'other-shift' })],
    ['same-owned arbitrary shift ID', () => ownShift({ shiftId: `arbitrary_${STAFF_ID}`, checkInAtMs: 1783914000000 })],
    ['mismatched daily ID', () => ownShift({ dailyId: 'other.test_2026-07-13' })],
    ['mismatched staff ID', () => ownShift({ staffId: 'victim.test', dailyId: 'victim.test_2026-07-13' })],
    ['wrong shift timestamp type', () => ownShift({ checkInAtMs: '1783914000000' })],
    ['wrong shift source', () => ownShift({ source: 'telegram' })],
    ['wrong shift status', () => ownShift({ status: 'closed' })],
    ['shift payroll field', () => ownShift({ totalWage: 1 })],
  ])('staff rejects shift create: %s', async (name, make) => {
    const staff = authedDb(STAFF_ID);
    const docId = name === 'mismatched shift doc ID' ? `wrong_${SHIFT_ID}` : SHIFT_ID;
    await assertFails(setDoc(doc(staff, 'attendance_shifts', docId), make()));
  });

  test('staff can close only own operational daily and shift fields', async () => {
    const staff = authedDb(STAFF_ID);
    await assertSucceeds(setDoc(doc(staff, 'attendance_daily', DAILY_ID), ownDaily()));
    await assertSucceeds(setDoc(doc(staff, 'attendance_shifts', SHIFT_ID), ownShift()));
    await assertSucceeds(updateDoc(doc(staff, 'attendance_shifts', SHIFT_ID), {
      status: 'closed', checkOutAt: '2026-07-13T10:00:00.000Z', checkOutAtMs: 1783917600000,
      durationMinutes: 60, checkoutLocation: { distanceMeters: 3 }, updatedAt: serverTimestamp(),
    }));
    await assertSucceeds(updateDoc(doc(staff, 'attendance_daily', DAILY_ID), {
      status: 'closed', lastCheckOutAt: '2026-07-13T10:00:00.000Z', lastCheckOutAtMs: 1783917600000,
      checkoutLocation: { distanceMeters: 3 }, locationDistanceMeters: 3,
      lastLocationAt: '2026-07-13T10:00:00.000Z', updatedAt: serverTimestamp(),
    }));
  });

  test('staff can reopen a closed daily row only through second same-day web check-in batch', async () => {
    const staff = authedDb(STAFF_ID);
    const first = writeBatch(staff);
    first.set(doc(staff, 'attendance_daily', DAILY_ID), ownDaily());
    first.set(doc(staff, 'attendance_shifts', SHIFT_ID), ownShift());
    await assertSucceeds(first.commit());
    await assertSucceeds(updateDoc(doc(staff, 'attendance_shifts', SHIFT_ID), {
      status: 'closed', checkOutAt: '2026-07-13T10:00:00.000Z', checkOutAtMs: 1783917600000,
      durationMinutes: 60, checkoutLocation: { distanceMeters: 3 }, updatedAt: serverTimestamp(),
    }));
    await assertSucceeds(updateDoc(doc(staff, 'attendance_daily', DAILY_ID), {
      status: 'closed', lastCheckOutAt: '2026-07-13T10:00:00.000Z', lastCheckOutAtMs: 1783917600000,
      checkoutLocation: { distanceMeters: 3 }, locationDistanceMeters: 3,
      lastLocationAt: '2026-07-13T10:00:00.000Z', updatedAt: serverTimestamp(),
    }));

    const second = writeBatch(staff);
    second.set(doc(staff, 'attendance_daily', DAILY_ID), ownDaily({
      source: 'web', locationDistanceMeters: 4, lastLocationAt: '2026-07-13T11:00:00.000Z',
    }), { merge: true });
    second.set(doc(staff, 'attendance_shifts', SECOND_SHIFT_ID), ownShift({
      shiftId: SECOND_SHIFT_ID, checkInAt: '2026-07-13T11:00:00.000Z', checkInAtMs: 1783921200000,
    }));
    await assertSucceeds(second.commit());
  });

  test('staff cannot reopen a closed daily row with changed identity, payroll, or first check-in', async () => {
    const staff = authedDb(STAFF_ID);
    const daily = doc(staff, 'attendance_daily', DAILY_ID);
    await assertSucceeds(setDoc(daily, ownDaily()));
    await assertSucceeds(updateDoc(daily, {
      status: 'closed', lastCheckOutAt: '2026-07-13T10:00:00.000Z', lastCheckOutAtMs: 1783917600000,
      checkoutLocation: { distanceMeters: 3 }, locationDistanceMeters: 3,
      lastLocationAt: '2026-07-13T10:00:00.000Z', updatedAt: serverTimestamp(),
    }));
    for (const change of [
      { status: 'open', staffId: 'victim.test', updatedAt: serverTimestamp() },
      { status: 'open', firstCheckInAt: '2026-07-13T11:00:00.000Z', updatedAt: serverTimestamp() },
      { status: 'open', firstCheckInAtMs: 1783921200000, updatedAt: serverTimestamp() },
      { status: 'open', totalWage: 1, updatedAt: serverTimestamp() },
      { status: 'open', expenseId: 'expense.test', updatedAt: serverTimestamp() },
    ]) await assertFails(updateDoc(daily, change));
  });

  test('staff cannot change identity or write payroll/admin fields', async () => {
    const staff = authedDb(STAFF_ID);
    const daily = doc(staff, 'attendance_daily', 'attacker.test_2026-07-10');
    for (const change of [
      { totalWage: 1 }, { hourlyRate: 1 }, { totalMinutes: 1 }, { payableMinutes: 1 },
      { expenseId: 'expense.test' }, { adjustedBy: STAFF_ID }, { staffId: 'victim.test' },
    ]) await assertFails(updateDoc(daily, change));
  });

  test('manager retains attendance and payroll adjustment access', async () => {
    await assertSucceeds(updateDoc(
      doc(authedDb('manager.test'), 'attendance_daily', 'victim.test_2026-07-10'),
      { totalWage: 250000, status: 'adjusted' },
    ));
  });
});
