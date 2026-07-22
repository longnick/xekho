const {
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');
const {
  deleteDoc,
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

describe('sensitive POS data Rules — manager boundary and immutable history', () => {
  beforeAll(async () => {
    await setupRulesTestEnvironment();
  });

  beforeEach(async () => {
    await clearAndSeedBaseline();
  });

  afterAll(async () => {
    await cleanupRulesTestEnvironment();
  });

  test('staff cannot alter configuration, menu, inventory, or finance records', async () => {
    const staff = authedDb('attacker.test');

    await assertFails(updateDoc(doc(staff, 'config', 'settings'), { shopName: 'Attacker shop' }));
    await assertFails(updateDoc(doc(staff, 'menu', 'tea.test'), { price: 1 }));
    await assertFails(setDoc(doc(staff, 'inventory', 'sugar.test'), { name: 'Sugar', qty: 999 }));
    await assertFails(setDoc(doc(staff, 'expenses', 'expense.test'), { amount: 1, category: 'fake' }));
    await assertFails(deleteDoc(doc(staff, 'history', 'history.test')));
  });

  test('manager can manage mapped configuration, catalog, stock, and finance input records', async () => {
    const manager = authedDb('manager.test');

    await assertSucceeds(updateDoc(doc(manager, 'config', 'settings'), { shopName: 'Managed test shop' }));
    await assertSucceeds(updateDoc(doc(manager, 'menu', 'tea.test'), { price: 25000 }));
    await assertSucceeds(setDoc(doc(manager, 'inventory', 'sugar.test'), { name: 'Sugar', qty: 20 }));
    await assertSucceeds(setDoc(doc(manager, 'expenses', 'expense.test'), { amount: 50000, category: 'supplies' }));
    await assertSucceeds(setDoc(doc(manager, 'purchases', 'purchase.test'), { total: 50000, supplier: 'Synthetic' }));
    await assertSucceeds(setDoc(doc(manager, 'suppliers', 'supplier.test'), { name: 'Synthetic supplier' }));
  });

  test('a completed history record is append-only for all browser clients', async () => {
    const manager = authedDb('manager.test');

    await assertFails(updateDoc(doc(manager, 'history', 'history.test'), { total: 1 }));
    await assertFails(deleteDoc(doc(manager, 'history', 'history.test')));
  });
});
