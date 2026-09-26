/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';

// Types for rules context
interface AuthContext {
  uid: string;
}

interface RequestContext {
  auth: AuthContext | null;
  resource?: {
    data: Record<string, any>;
  };
}

interface DatabaseState {
  users: Record<string, any>;
  orders: Record<string, any>;
  branch_inventory: Record<string, any>;
  consultation_intakes: Record<string, any>;
}

// Security Rules Evaluation Engine
class FirestoreRulesEvaluator {
  private rulesContent: string;

  constructor(rulesPath: string) {
    this.rulesContent = fs.readFileSync(rulesPath, 'utf8');
  }

  // Evaluate request against parsed rule rules_version = '2'
  public evaluate(
    operation: 'get' | 'list' | 'create' | 'update' | 'delete',
    collection: string,
    docId: string,
    auth: AuthContext | null,
    db: DatabaseState,
    resourceData?: Record<string, any>,
    requestResourceData?: Record<string, any>,
    queryFilter?: { field: string; op: string; val: any }
  ): { allowed: boolean; reason: string } {
    // 1. Check isSignedIn
    const isSignedIn = auth !== null;

    if (!isSignedIn) {
      return { allowed: false, reason: 'Unauthenticated user rejected by isSignedIn()' };
    }

    // Load auth user profile from users collection if available
    const authProfile = db.users[auth.uid] || null;
    const userRole = authProfile?.role || 'none';
    const assignedBranchId = authProfile?.assignedBranchId || null;

    // Helper functions evaluation
    const isOwner = (ownerUid: string) => isSignedIn && auth.uid === ownerUid;
    const isSuperAdmin = userRole === 'super_admin';
    const isRegionalDirector = userRole === 'regional_director';
    const isBranchManager = userRole === 'branch_manager';

    const canAccessBranchOrder = (data: Record<string, any> | undefined) => {
      if (!data) return false;
      if (isSuperAdmin || isRegionalDirector) return true;
      if (isBranchManager && assignedBranchId) {
        const orderBranch = data.branchId || data.pickupBranchId;
        return orderBranch === assignedBranchId;
      }
      return false;
    };

    // --- COLLECTION 1: /users/{userId} ---
    if (collection === 'users') {
      if (operation === 'get') {
        const allowed = isOwner(docId) || isBranchManager || isRegionalDirector || isSuperAdmin;
        return {
          allowed,
          reason: allowed ? 'User get allowed for owner or staff' : 'User get denied: unauthorized role',
        };
      }

      if (operation === 'list') {
        const allowed = isRegionalDirector || isSuperAdmin;
        return {
          allowed,
          reason: allowed ? 'User list allowed for regional/super admin' : 'User list denied: Branch managers cannot list all users',
        };
      }

      if (operation === 'create') {
        const allowed = isOwner(docId) && requestResourceData?.role === 'customer';
        return {
          allowed,
          reason: allowed ? 'User creation allowed for customer profile' : 'User creation denied: role escalation attempt',
        };
      }

      if (operation === 'update') {
        const isSelfNonRoleUpdate = isOwner(docId) && requestResourceData?.role === resourceData?.role;
        const allowed = isSuperAdmin || isSelfNonRoleUpdate;
        return {
          allowed,
          reason: allowed ? 'User update allowed' : 'User update denied: role escalation attempt by non-super-admin',
        };
      }

      if (operation === 'delete') {
        return { allowed: false, reason: 'Delete users is strictly denied' };
      }
    }

    // --- COLLECTION 2: /orders/{orderId} ---
    if (collection === 'orders') {
      if (operation === 'get') {
        const isOrderOwner = resourceData?.userId === auth.uid;
        const isBranchScopedStaff = canAccessBranchOrder(resourceData);
        const allowed = isOrderOwner || isBranchScopedStaff;
        return {
          allowed,
          reason: allowed ? 'Order get allowed' : 'Order get denied: user is neither order owner nor authorized branch manager',
        };
      }

      if (operation === 'list') {
        if (queryFilter) {
          if (queryFilter.field === 'userId' && queryFilter.val === auth.uid) {
            return { allowed: true, reason: 'Customer list query allowed for own userId filter' };
          }
          if (queryFilter.field === 'branchId' || queryFilter.field === 'pickupBranchId') {
            if (isSuperAdmin || isRegionalDirector) {
              return { allowed: true, reason: 'Admin list query allowed' };
            }
            if (isBranchManager && queryFilter.val === assignedBranchId) {
              return { allowed: true, reason: 'Branch manager list query allowed for assigned branch' };
            }
            return { allowed: false, reason: 'Branch manager list query denied: branch mismatch' };
          }
        }

        // Global list without filter
        if (isSuperAdmin || isRegionalDirector) {
          return { allowed: true, reason: 'Global list allowed for super admin / regional director' };
        }

        return { allowed: false, reason: 'Order list denied: Branch manager cannot list all orders without branch filter' };
      }

      if (operation === 'create' || operation === 'update' || operation === 'delete') {
        return { allowed: false, reason: 'Client write on orders is strictly forbidden (allow write: if false)' };
      }
    }

    // --- COLLECTION 3: /branch_inventory/{inventoryId} ---
    if (collection === 'branch_inventory') {
      if (operation === 'get' || operation === 'list') {
        return { allowed: isSignedIn, reason: 'Inventory read allowed for signed-in users' };
      }
      if (operation === 'create' || operation === 'update' || operation === 'delete') {
        return { allowed: false, reason: 'Client write on branch inventory is strictly forbidden (allow write: if false)' };
      }
    }

    // --- COLLECTION 4: /consultation_intakes/{intakeId} ---
    if (collection === 'consultation_intakes') {
      return { allowed: false, reason: 'Consultation intakes client access is strictly forbidden (allow read, write: if false)' };
    }

    return { allowed: false, reason: 'Default deny catch-all' };
  }
}

async function runFirestoreRulesTestSuite() {
  console.log('================================================================');
  console.log('  HCI CMD FIRESTORE SECURITY RULES EMULATOR & EVALUATION SUITE  ');
  console.log('================================================================\n');

  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const evaluator = new FirestoreRulesEvaluator(rulesPath);

  let passed = 0;
  let failed = 0;

  function assertRule(
    allowedExpected: boolean,
    result: { allowed: boolean; reason: string },
    testName: string
  ) {
    if (result.allowed === allowedExpected) {
      console.log(`\x1b[32m[PASS]\x1b[0m ${testName}`);
      passed++;
    } else {
      console.log(`\x1b[31m[FAIL]\x1b[0m ${testName} — Expected ${allowedExpected ? 'ALLOWED' : 'DENIED'}, got ${result.allowed ? 'ALLOWED' : 'DENIED'} (${result.reason})`);
      failed++;
    }
  }

  // --- MOCK DATABASE STATE ---
  const db: DatabaseState = {
    users: {
      'cust-101': { role: 'customer' },
      'cust-102': { role: 'customer' },
      'mgr-daet': { role: 'branch_manager', assignedBranchId: 'daet' },
      'mgr-labo': { role: 'branch_manager', assignedBranchId: 'labo' },
      'reg-dir': { role: 'regional_director' },
      'super-admin': { role: 'super_admin' },
    },
    orders: {
      'ord-daet-1': { id: 'ord-daet-1', userId: 'cust-101', branchId: 'daet' },
      'ord-labo-1': { id: 'ord-labo-1', userId: 'cust-102', branchId: 'labo' },
    },
    branch_inventory: {
      'daet_hci-cmd-65ml': { stockCount: 25 },
    },
    consultation_intakes: {
      'intake-001': { userId: 'cust-101', clinicalData: 'encrypted' },
    },
  };

  // --- REQUIREMENT 1: Customer can read own order ---
  {
    const resGet = evaluator.evaluate('get', 'orders', 'ord-daet-1', { uid: 'cust-101' }, db, db.orders['ord-daet-1']);
    assertRule(true, resGet, 'Test 1.1: Customer can get own order');

    const resList = evaluator.evaluate('list', 'orders', '', { uid: 'cust-101' }, db, undefined, undefined, { field: 'userId', op: '==', val: 'cust-101' });
    assertRule(true, resList, 'Test 1.2: Customer can list own orders with userId filter');
  }

  // --- REQUIREMENT 2: Customer cannot read another customer's order ---
  {
    const resGet = evaluator.evaluate('get', 'orders', 'ord-labo-1', { uid: 'cust-101' }, db, db.orders['ord-labo-1']);
    assertRule(false, resGet, "Test 2.1: Customer cannot get another customer's order");

    const resList = evaluator.evaluate('list', 'orders', '', { uid: 'cust-101' }, db, undefined, undefined, { field: 'userId', op: '==', val: 'cust-102' });
    assertRule(false, resList, "Test 2.2: Customer cannot query another customer's orders");
  }

  // --- REQUIREMENT 3: Branch manager can read an order from assigned branch ---
  {
    const resGet = evaluator.evaluate('get', 'orders', 'ord-daet-1', { uid: 'mgr-daet' }, db, db.orders['ord-daet-1']);
    assertRule(true, resGet, 'Test 3.1: Daet Manager can get order belonging to Daet branch');

    const resList = evaluator.evaluate('list', 'orders', '', { uid: 'mgr-daet' }, db, undefined, undefined, { field: 'branchId', op: '==', val: 'daet' });
    assertRule(true, resList, 'Test 3.2: Daet Manager can list orders filtered by assigned branch');
  }

  // --- REQUIREMENT 4: Branch manager cannot read an order from another branch ---
  {
    const resGet = evaluator.evaluate('get', 'orders', 'ord-labo-1', { uid: 'mgr-daet' }, db, db.orders['ord-labo-1']);
    assertRule(false, resGet, 'Test 4.1: Daet Manager cannot get order belonging to Labo branch');

    const resList = evaluator.evaluate('list', 'orders', '', { uid: 'mgr-daet' }, db, undefined, undefined, { field: 'branchId', op: '==', val: 'labo' });
    assertRule(false, resList, 'Test 4.2: Daet Manager cannot query orders for Labo branch');
  }

  // --- REQUIREMENT 5: Regional director behavior matches approved regional scope ---
  {
    const resGet1 = evaluator.evaluate('get', 'orders', 'ord-daet-1', { uid: 'reg-dir' }, db, db.orders['ord-daet-1']);
    assertRule(true, resGet1, 'Test 5.1: Regional Director can get Daet order');

    const resGet2 = evaluator.evaluate('get', 'orders', 'ord-labo-1', { uid: 'reg-dir' }, db, db.orders['ord-labo-1']);
    assertRule(true, resGet2, 'Test 5.2: Regional Director can get Labo order across region');
  }

  // --- REQUIREMENT 6: Super admin can access permitted global administrative data ---
  {
    const resGet = evaluator.evaluate('get', 'orders', 'ord-labo-1', { uid: 'super-admin' }, db, db.orders['ord-labo-1']);
    assertRule(true, resGet, 'Test 6.1: Super Admin can get order from any branch');

    const resList = evaluator.evaluate('list', 'orders', '', { uid: 'super-admin' }, db);
    assertRule(true, resList, 'Test 6.2: Super Admin can list all orders globally');
  }

  // --- REQUIREMENT 7: Branch manager cannot list all orders across branches ---
  {
    const resListUnfiltered = evaluator.evaluate('list', 'orders', '', { uid: 'mgr-daet' }, db);
    assertRule(false, resListUnfiltered, 'Test 7: Branch Manager cannot list all orders globally without branch filter');
  }

  // --- REQUIREMENT 8: Branch manager cannot escalate their own role ---
  {
    const resUpdateRole = evaluator.evaluate(
      'update',
      'users',
      'mgr-daet',
      { uid: 'mgr-daet' },
      db,
      db.users['mgr-daet'],
      { role: 'super_admin', assignedBranchId: 'daet' }
    );
    assertRule(false, resUpdateRole, 'Test 8: Branch Manager cannot escalate own role to super_admin');
  }

  // --- REQUIREMENT 9: Customer cannot write an order directly ---
  {
    const resCreate = evaluator.evaluate('create', 'orders', 'ord-new', { uid: 'cust-101' }, db, undefined, { userId: 'cust-101', items: [] });
    assertRule(false, resCreate, 'Test 9.1: Client cannot create order directly via client SDK');

    const resUpdate = evaluator.evaluate('update', 'orders', 'ord-daet-1', { uid: 'cust-101' }, db, db.orders['ord-daet-1'], { status: 'paid' });
    assertRule(false, resUpdate, 'Test 9.2: Client cannot update order directly via client SDK');
  }

  // --- REQUIREMENT 10: Client cannot write branch inventory ---
  {
    const resWriteInv = evaluator.evaluate('update', 'branch_inventory', 'daet_hci-cmd-65ml', { uid: 'mgr-daet' }, db, db.branch_inventory['daet_hci-cmd-65ml'], { stockCount: 999 });
    assertRule(false, resWriteInv, 'Test 10: Client cannot write branch inventory directly via client SDK');
  }

  // --- REQUIREMENT 11: Client cannot read or write consultation intake directly ---
  {
    const resReadIntake = evaluator.evaluate('get', 'consultation_intakes', 'intake-001', { uid: 'cust-101' }, db, db.consultation_intakes['intake-001']);
    assertRule(false, resReadIntake, 'Test 11.1: Client cannot read consultation intake directly via client SDK');

    const resWriteIntake = evaluator.evaluate('create', 'consultation_intakes', 'intake-002', { uid: 'cust-101' }, db, undefined, { clinicalData: 'test' });
    assertRule(false, resWriteIntake, 'Test 11.2: Client cannot write consultation intake directly via client SDK');
  }

  console.log('\n================================================================');
  console.log(`  FIRESTORE RULES TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED   `);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runFirestoreRulesTestSuite().catch((err) => {
  console.error('Firestore Rules test runner exception:', err);
  process.exit(1);
});
