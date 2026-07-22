const fs = require('node:fs');
const path = require('node:path');
const {
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const {
  doc,
  setDoc,
  setLogLevel,
} = require('firebase/firestore');

const RULES_PATH = path.resolve(__dirname, '../../firestore.rules');
const PROJECT_ID = process.env.FIRESTORE_RULES_PROJECT_ID || 'xekho-rules-test';

let testEnv;

async function setupRulesTestEnvironment() {
  setLogLevel('silent');
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error(
      'FIRESTORE_EMULATOR_HOST is required. Run through `npx firebase-tools emulators:exec --only firestore ...`.'
    );
  }

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(RULES_PATH, 'utf8'),
    },
  });

  return testEnv;
}

async function clearAndSeedBaseline() {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, 'users', 'attacker.test'), {
        uid: 'attacker.test',
        email: 'attacker@example.test',
        displayName: 'Attacker',
        role: 'staff',
        staffId: 'attacker.test',
      }),
      setDoc(doc(db, 'users', 'victim.test'), {
        uid: 'victim.test',
        email: 'victim@example.test',
        displayName: 'Victim',
        role: 'staff',
        staffId: 'victim.test',
      }),
      setDoc(doc(db, 'users', 'manager.test'), {
        uid: 'manager.test',
        email: 'manager@example.test',
        displayName: 'Manager',
        role: 'manager',
      }),
      setDoc(doc(db, 'menu', 'tea.test'), {
        id: 'tea.test',
        name: 'Tea',
        price: 20000,
      }),
      setDoc(doc(db, 'history', 'history.test'), {
        total: 99000,
        status: 'completed',
        createdBy: 'victim.test',
      }),
      setDoc(doc(db, 'Staff', 'attacker.test'), {
        staff_id: 'attacker.test', full_name: 'Attacker', hourly_rate: 20000,
      }),
      setDoc(doc(db, 'Staff', 'victim.test'), {
        staff_id: 'victim.test', full_name: 'Victim', hourly_rate: 30000,
      }),
      setDoc(doc(db, 'attendance_daily', 'victim.test_2026-07-10'), {
        staffId: 'victim.test',
        staffName: 'Victim',
        dateKey: '2026-07-10',
        totalMinutes: 480,
        totalWage: 200000,
      }),
      setDoc(doc(db, 'attendance_daily', 'attacker.test_2026-07-10'), {
        staffId: 'attacker.test',
        staffName: 'Attacker',
        dateKey: '2026-07-10',
        totalMinutes: 0,
        totalWage: 0,
        status: 'open',
      }),
      setDoc(doc(db, 'attendance_shifts', 'attacker-shift.test'), {
        shiftId: 'attacker-shift.test',
        dailyId: 'attacker.test_2026-07-10',
        staffId: 'attacker.test',
        status: 'open',
        checkInAt: '2026-07-10T08:00:00.000Z',
        checkInAtMs: 1783651200000,
        checkOutAt: null,
        checkOutAtMs: null,
        durationMinutes: null,
      }),
      setDoc(doc(db, 'config', 'settings'), {
        shopName: 'Synthetic test shop',
      }),
    ]);
  });
}

function authedDb(uid) {
  return testEnv.authenticatedContext(uid).firestore();
}

function unauthedDb() {
  return testEnv.unauthenticatedContext().firestore();
}

function cleanupRulesTestEnvironment() {
  return testEnv?.cleanup();
}

module.exports = {
  authedDb,
  cleanupRulesTestEnvironment,
  clearAndSeedBaseline,
  doc,
  setupRulesTestEnvironment,
  unauthedDb,
};
