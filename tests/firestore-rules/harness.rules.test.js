const {
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');
const {
  getDoc,
} = require('firebase/firestore');
const {
  authedDb,
  cleanupRulesTestEnvironment,
  clearAndSeedBaseline,
  doc,
  setupRulesTestEnvironment,
  unauthedDb,
} = require('./helpers');

describe('Firestore Rules emulator harness controls', () => {
  beforeAll(async () => {
    await setupRulesTestEnvironment();
  });

  beforeEach(async () => {
    await clearAndSeedBaseline();
  });

  afterAll(async () => {
    await cleanupRulesTestEnvironment();
  });

  test('signed-in user can read the current menu path', async () => {
    await assertSucceeds(getDoc(doc(authedDb('attacker.test'), 'menu', 'tea.test')));
  });

  test('unauthenticated user cannot read signed-in-only config', async () => {
    await assertFails(getDoc(doc(unauthedDb(), 'config', 'settings')));
  });
});
