/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const PROJECT_ID = 'ai-studio-cmddigitalcommer-8d70f45b-1636-42ba-9e2d-f063a7b0e086';

async function runRealEmulatorTests() {
  console.log('================================================================');
  console.log('  HCI CMD REAL FIRESTORE RULES EMULATOR VERIFICATION SUITE       ');
  console.log('================================================================\n');

  const rulesContent = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');

  // Initialize Rules Test Environment connecting to Firestore Emulator
  const host = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8085';
  const [hostIp, hostPortStr] = host.split(':');
  const port = parseInt(hostPortStr || '8085', 10);

  let testEnv: RulesTestEnvironment;
  try {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host: hostIp,
        port: port,
        rules: rulesContent,
      },
    });
  } catch (err: any) {
    console.error('Failed to initialize test environment with Firestore Emulator:', err);
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`\x1b[32m[PASS]\x1b[0m ${name}`);
      passed++;
    } catch (err: any) {
      console.log(`\x1b[31m[FAIL]\x1b[0m ${name}`);
      console.error(`   -> Error:`, err?.message || err);
      failed++;
    }
  }

  // --- SEED DATABASE VIA SYSTEM ADMIN CONTEXT ---
  await testEnv.withSecurityRulesDisabled(async (adminContext) => {
    const db = adminContext.firestore();

    // 1. Seed users
    await setDoc(doc(db, 'users', 'cust-101'), { role: 'customer', email: 'cust1@example.com' });
    await setDoc(doc(db, 'users', 'cust-102'), { role: 'customer', email: 'cust2@example.com' });
    await setDoc(doc(db, 'users', 'mgr-daet'), { role: 'branch_manager', assignedBranchId: 'daet', email: 'daet@example.com' });
    await setDoc(doc(db, 'users', 'mgr-labo'), { role: 'branch_manager', assignedBranchId: 'labo', email: 'labo@example.com' });
    await setDoc(doc(db, 'users', 'reg-dir'), { role: 'regional_director', email: 'director@example.com' });
    await setDoc(doc(db, 'users', 'super-admin'), { role: 'super_admin', email: 'admin@example.com' });

    // 2. Seed orders
    await setDoc(doc(db, 'orders', 'ord-daet-101'), {
      id: 'ord-daet-101',
      userId: 'cust-101',
      branchId: 'daet',
      pickupBranchId: 'daet',
      fulfillmentStatus: 'pending_processing',
      paymentStatus: 'pending_payment',
    });
    await setDoc(doc(db, 'orders', 'ord-labo-102'), {
      id: 'ord-labo-102',
      userId: 'cust-102',
      branchId: 'labo',
      pickupBranchId: 'labo',
      fulfillmentStatus: 'pending_processing',
      paymentStatus: 'pending_payment',
    });

    // 3. Seed inventory
    await setDoc(doc(db, 'branch_inventory', 'daet_hci-cmd-65ml'), {
      branchId: 'daet',
      skuId: 'hci-cmd-65ml',
      stockCount: 50,
    });

    // 4. Seed consultation intake
    await setDoc(doc(db, 'consultation_intakes', 'intake-cust-101'), {
      userId: 'cust-101',
      encryptedData: 'aes-ciphertext-mock',
    });

    // 5. Seed audit log
    await setDoc(doc(db, 'audit_logs', 'audit-seed-101'), {
      id: 'audit-seed-101',
      actorUid: 'super-admin',
      action: 'system_bootstrap',
      success: true,
    });
  });

  // --- SECTION 1: CUSTOMERS ACCESS VERIFICATION ---
  const custContext = testEnv.authenticatedContext('cust-101');
  const custDb = custContext.firestore();

  await test('1.1 Customer can read own order', async () => {
    await assertSucceeds(getDoc(doc(custDb, 'orders', 'ord-daet-101')));
  });

  await test('1.2 Customer can query only own orders', async () => {
    const q = query(collection(custDb, 'orders'), where('userId', '==', 'cust-101'));
    await assertSucceeds(getDocs(q));
  });

  await test("1.3 Customer cannot read another customer's order", async () => {
    await assertFails(getDoc(doc(custDb, 'orders', 'ord-labo-102')));
  });

  await test("1.4 Customer cannot query another customer's orders or all orders", async () => {
    const qOther = query(collection(custDb, 'orders'), where('userId', '==', 'cust-102'));
    await assertFails(getDocs(qOther));

    const qAll = collection(custDb, 'orders');
    await assertFails(getDocs(qAll));
  });

  await test('1.5 Customer cannot create, update, or delete orders directly', async () => {
    await assertFails(setDoc(doc(custDb, 'orders', 'ord-new'), { userId: 'cust-101', items: [] }));
    await assertFails(updateDoc(doc(custDb, 'orders', 'ord-daet-101'), { paymentStatus: 'paid' }));
    await assertFails(deleteDoc(doc(custDb, 'orders', 'ord-daet-101')));
  });

  await test('1.6 Customer can read own user profile', async () => {
    await assertSucceeds(getDoc(doc(custDb, 'users', 'cust-101')));
  });

  await test("1.7 Customer cannot read another customer's profile", async () => {
    await assertFails(getDoc(doc(custDb, 'users', 'cust-102')));
  });

  await test('1.8 Customer cannot escalate their role on user profile', async () => {
    await assertFails(updateDoc(doc(custDb, 'users', 'cust-101'), { role: 'super_admin' }));
  });

  await test('1.9 Customer cannot read or write audit logs (get, list, create, update, delete denied)', async () => {
    await assertFails(getDoc(doc(custDb, 'audit_logs', 'audit-seed-101')));
    await assertFails(getDocs(collection(custDb, 'audit_logs')));
    await assertFails(setDoc(doc(custDb, 'audit_logs', 'audit-forged-cust'), { action: 'hack', success: true }));
    await assertFails(updateDoc(doc(custDb, 'audit_logs', 'audit-seed-101'), { action: 'tampered' }));
    await assertFails(deleteDoc(doc(custDb, 'audit_logs', 'audit-seed-101')));
  });

  // --- SECTION 2: BRANCH MANAGER ACCESS VERIFICATION ---
  const mgrDaetContext = testEnv.authenticatedContext('mgr-daet');
  const mgrDaetDb = mgrDaetContext.firestore();

  await test('2.1 Branch manager can read an order in assigned branch', async () => {
    await assertSucceeds(getDoc(doc(mgrDaetDb, 'orders', 'ord-daet-101')));
  });

  await test('2.2 Branch manager cannot read an order in another branch', async () => {
    await assertFails(getDoc(doc(mgrDaetDb, 'orders', 'ord-labo-102')));
  });

  await test('2.3 Branch manager can query orders constrained to assigned branch', async () => {
    const qBranch = query(collection(mgrDaetDb, 'orders'), where('branchId', '==', 'daet'));
    await assertSucceeds(getDocs(qBranch));
  });

  await test('2.4 Branch manager cannot perform an unrestricted cross-branch order query', async () => {
    const qAll = collection(mgrDaetDb, 'orders');
    await assertFails(getDocs(qAll));

    const qOtherBranch = query(collection(mgrDaetDb, 'orders'), where('branchId', '==', 'labo'));
    await assertFails(getDocs(qOtherBranch));
  });

  await test('2.5 Branch manager cannot list all users', async () => {
    await assertFails(getDocs(collection(mgrDaetDb, 'users')));
  });

  await test('2.6 Branch manager can get individual user profile but cannot change user roles', async () => {
    await assertSucceeds(getDoc(doc(mgrDaetDb, 'users', 'cust-101')));
    await assertFails(updateDoc(doc(mgrDaetDb, 'users', 'cust-101'), { role: 'branch_manager' }));
    await assertFails(updateDoc(doc(mgrDaetDb, 'users', 'mgr-daet'), { role: 'super_admin' }));
  });

  await test('2.7 Branch manager cannot directly write orders or inventory', async () => {
    await assertFails(setDoc(doc(mgrDaetDb, 'orders', 'ord-new-mgr'), { branchId: 'daet' }));
    await assertFails(updateDoc(doc(mgrDaetDb, 'orders', 'ord-daet-101'), { fulfillmentStatus: 'ready_for_pickup' }));
    await assertFails(updateDoc(doc(mgrDaetDb, 'branch_inventory', 'daet_hci-cmd-65ml'), { stockCount: 999 }));
  });

  await test('2.8 Branch manager cannot read or write audit logs (get, list, create, update, delete denied)', async () => {
    await assertFails(getDoc(doc(mgrDaetDb, 'audit_logs', 'audit-seed-101')));
    await assertFails(getDocs(collection(mgrDaetDb, 'audit_logs')));
    await assertFails(setDoc(doc(mgrDaetDb, 'audit_logs', 'audit-forged-mgr'), { action: 'hack', success: true }));
    await assertFails(updateDoc(doc(mgrDaetDb, 'audit_logs', 'audit-seed-101'), { action: 'tampered' }));
    await assertFails(deleteDoc(doc(mgrDaetDb, 'audit_logs', 'audit-seed-101')));
  });

  // --- SECTION 3: REGIONAL DIRECTOR ACCESS VERIFICATION ---
  const regDirContext = testEnv.authenticatedContext('reg-dir');
  const regDirDb = regDirContext.firestore();

  await test('3.1 Regional director can access permitted regional orders (Daet & Labo)', async () => {
    await assertSucceeds(getDoc(doc(regDirDb, 'orders', 'ord-daet-101')));
    await assertSucceeds(getDoc(doc(regDirDb, 'orders', 'ord-labo-102')));
    await assertSucceeds(getDocs(collection(regDirDb, 'orders')));
  });

  await test('3.2 Regional director can list permitted users', async () => {
    await assertSucceeds(getDocs(collection(regDirDb, 'users')));
  });

  await test('3.3 Regional director cannot write protected collections directly', async () => {
    await assertFails(setDoc(doc(regDirDb, 'orders', 'ord-new-reg'), { branchId: 'daet' }));
    await assertFails(updateDoc(doc(regDirDb, 'branch_inventory', 'daet_hci-cmd-65ml'), { stockCount: 100 }));
    await assertFails(getDoc(doc(regDirDb, 'consultation_intakes', 'intake-cust-101')));
    await assertFails(setDoc(doc(regDirDb, 'consultation_intakes', 'intake-new'), { data: 'test' }));
  });

  await test('3.4 Regional director can read audit logs (get, list) but cannot write directly (create, update, delete denied)', async () => {
    await assertSucceeds(getDoc(doc(regDirDb, 'audit_logs', 'audit-seed-101')));
    await assertSucceeds(getDocs(collection(regDirDb, 'audit_logs')));
    await assertFails(setDoc(doc(regDirDb, 'audit_logs', 'audit-forged-reg'), { action: 'hack', success: true }));
    await assertFails(updateDoc(doc(regDirDb, 'audit_logs', 'audit-seed-101'), { action: 'tampered' }));
    await assertFails(deleteDoc(doc(regDirDb, 'audit_logs', 'audit-seed-101')));
  });

  // --- SECTION 4: SUPER ADMIN ACCESS VERIFICATION ---
  const superAdminContext = testEnv.authenticatedContext('super-admin');
  const superAdminDb = superAdminContext.firestore();

  await test('4.1 Super admin can access permitted global orders & list users', async () => {
    await assertSucceeds(getDoc(doc(superAdminDb, 'orders', 'ord-daet-101')));
    await assertSucceeds(getDoc(doc(superAdminDb, 'orders', 'ord-labo-102')));
    await assertSucceeds(getDocs(collection(superAdminDb, 'orders')));
    await assertSucceeds(getDocs(collection(superAdminDb, 'users')));
  });

  await test('4.2 Super admin still cannot directly write orders, inventory, or clinical intakes (Client lockdown)', async () => {
    await assertFails(setDoc(doc(superAdminDb, 'orders', 'ord-admin-write'), { branchId: 'daet' }));
    await assertFails(updateDoc(doc(superAdminDb, 'orders', 'ord-daet-101'), { fulfillmentStatus: 'completed' }));
    await assertFails(updateDoc(doc(superAdminDb, 'branch_inventory', 'daet_hci-cmd-65ml'), { stockCount: 500 }));
    await assertFails(getDoc(doc(superAdminDb, 'consultation_intakes', 'intake-cust-101')));
    await assertFails(setDoc(doc(superAdminDb, 'consultation_intakes', 'intake-admin'), { data: 'test' }));
  });

  await test('4.3 Super admin can read audit logs (get, list) but cannot write directly (create, update, delete denied)', async () => {
    await assertSucceeds(getDoc(doc(superAdminDb, 'audit_logs', 'audit-seed-101')));
    await assertSucceeds(getDocs(collection(superAdminDb, 'audit_logs')));
    await assertFails(setDoc(doc(superAdminDb, 'audit_logs', 'audit-forged-admin'), { action: 'hack', success: true }));
    await assertFails(updateDoc(doc(superAdminDb, 'audit_logs', 'audit-seed-101'), { action: 'tampered' }));
    await assertFails(deleteDoc(doc(superAdminDb, 'audit_logs', 'audit-seed-101')));
  });

  // --- SECTION 5: UNAUTHENTICATED GUEST LOCKDOWN ---
  const unauthContext = testEnv.unauthenticatedContext();
  const unauthDb = unauthContext.firestore();

  await test('5.1 Unauthenticated guest cannot read or write any protected collection', async () => {
    await assertFails(getDoc(doc(unauthDb, 'orders', 'ord-daet-101')));
    await assertFails(getDocs(collection(unauthDb, 'orders')));
    await assertFails(getDoc(doc(unauthDb, 'users', 'cust-101')));
    await assertFails(getDocs(collection(unauthDb, 'users')));
    await assertFails(getDoc(doc(unauthDb, 'branch_inventory', 'daet_hci-cmd-65ml')));
    await assertFails(getDoc(doc(unauthDb, 'consultation_intakes', 'intake-cust-101')));
  });

  await test('5.2 Unauthenticated guest cannot read or write audit logs (get, list, create, update, delete denied)', async () => {
    await assertFails(getDoc(doc(unauthDb, 'audit_logs', 'audit-seed-101')));
    await assertFails(getDocs(collection(unauthDb, 'audit_logs')));
    await assertFails(setDoc(doc(unauthDb, 'audit_logs', 'audit-forged-guest'), { action: 'hack', success: true }));
    await assertFails(updateDoc(doc(unauthDb, 'audit_logs', 'audit-seed-101'), { action: 'tampered' }));
    await assertFails(deleteDoc(doc(unauthDb, 'audit_logs', 'audit-seed-101')));
  });

  await testEnv.cleanup();

  console.log('\n================================================================');
  console.log(`  REAL EMULATOR TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED  `);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runRealEmulatorTests().catch((err) => {
  console.error('Real Firestore Rules Emulator test runner exception:', err);
  process.exit(1);
});
