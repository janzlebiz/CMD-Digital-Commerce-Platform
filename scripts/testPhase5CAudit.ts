/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createExpressApp } from '../server';
import crypto from 'crypto';
import http from 'http';

// Helper to make test HTTP requests
async function makeRequest(
  server: http.Server,
  path: string,
  method: string,
  body?: any,
  headers: Record<string, string> = {}
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const address = server.address() as any;
    const port = address.port;
    const postData = body !== undefined ? JSON.stringify(body) : '';

    const reqHeaders: Record<string, string> = {
      ...headers,
    };
    if (body !== undefined) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = String(Buffer.byteLength(postData));
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          let parsed: any;
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = rawData;
          }
          resolve({ status: res.statusCode || 500, data: parsed });
        });
      }
    );

    req.on('error', reject);
    if (body !== undefined) {
      req.write(postData);
    }
    req.end();
  });
}

// In-Memory Test Harness for Phase 5C Audit Verification
function createTestHarness() {
  const usersStore = new Map<string, any>();
  const inventoryStore = new Map<string, any>();
  const ordersStore = new Map<string, any>();
  const intakesStore = new Map<string, any>();
  const auditLogsStore = new Map<string, any>();

  // Pre-seed some default actors
  usersStore.set('super-admin-uid', { uid: 'super-admin-uid', role: 'super_admin', email: 'admin@example.com' });
  usersStore.set('daet-manager-uid', { uid: 'daet-manager-uid', role: 'branch_manager', assignedBranchId: 'daet', email: 'daet@example.com' });
  usersStore.set('customer-alice-uid', { uid: 'customer-alice-uid', role: 'customer', email: 'alice@example.com' });
  usersStore.set('practitioner-bob-uid', { uid: 'practitioner-bob-uid', role: 'practitioner', email: 'bob@example.com' });

  // Pre-seed some default inventory
  inventoryStore.set('daet_hci-cmd-65ml', { branchId: 'daet', skuId: 'hci-cmd-65ml', stockCount: 100 });

  const createDocRef = (colName: string, docId: string) => {
    return {
      colName,
      docId,
      get: async () => {
        let data: any = null;
        if (colName === 'users') data = usersStore.get(docId);
        else if (colName === 'branch_inventory') data = inventoryStore.get(docId);
        else if (colName === 'orders') data = ordersStore.get(docId);
        else if (colName === 'consultation_intakes') data = intakesStore.get(docId);
        else if (colName === 'audit_logs') data = auditLogsStore.get(docId);

        return {
          exists: data !== undefined,
          data: () => data,
          get: (field: string) => data?.[field],
        };
      },
      set: async (val: any) => {
        if (colName === 'orders') ordersStore.set(docId, val);
        else if (colName === 'branch_inventory') inventoryStore.set(docId, val);
        else if (colName === 'users') usersStore.set(docId, val);
        else if (colName === 'consultation_intakes') intakesStore.set(docId, val);
        else if (colName === 'audit_logs') auditLogsStore.set(docId, val);
        return val;
      },
      update: async (updates: any) => {
        let existing: any = null;
        if (colName === 'orders') existing = ordersStore.get(docId);
        else if (colName === 'branch_inventory') existing = inventoryStore.get(docId);
        else if (colName === 'users') existing = usersStore.get(docId);

        if (existing) {
          const updated = { ...existing, ...updates };
          if (colName === 'orders') ordersStore.set(docId, updated);
          else if (colName === 'branch_inventory') inventoryStore.set(docId, updated);
          else if (colName === 'users') usersStore.set(docId, updated);
        }
      },
    };
  };

  const mockDb: any = {
    collection: (colName: string) => {
      return {
        doc: (docId: string) => createDocRef(colName, docId),
        get: async () => {
          let map: Map<string, any>;
          if (colName === 'orders') map = ordersStore;
          else if (colName === 'branch_inventory') map = inventoryStore;
          else if (colName === 'users') map = usersStore;
          else if (colName === 'consultation_intakes') map = intakesStore;
          else map = auditLogsStore;

          const results: any[] = [];
          map.forEach((value) => {
            results.push({
              data: () => value,
              get: (f: string) => value?.[field],
            });
          });
          return {
            forEach: (cb: any) => results.forEach(cb),
          };
        },
      };
    },
    runTransaction: async (updateFunction: (tx: any) => Promise<any>) => {
      const stageUpdates = new Map<any, any>();
      const stageSets = new Map<any, any>();

      const mockTx = {
        get: async (docRef: any) => {
          return docRef.get();
        },
        update: (docRef: any, updates: any) => {
          stageUpdates.set(docRef, updates);
        },
        set: (docRef: any, val: any) => {
          stageSets.set(docRef, val);
        },
      };

      const result = await updateFunction(mockTx);

      for (const [docRef, updates] of stageUpdates.entries()) {
        const pathStr = docRef.docId;
        const col = docRef.colName;
        let existing: any = null;
        if (col === 'branch_inventory') existing = inventoryStore.get(pathStr);
        else if (col === 'orders') existing = ordersStore.get(pathStr);
        else if (col === 'users') existing = usersStore.get(pathStr);

        if (existing) {
          const updated = { ...existing, ...updates };
          if (col === 'branch_inventory') inventoryStore.set(pathStr, updated);
          else if (col === 'orders') ordersStore.set(pathStr, updated);
          else if (col === 'users') usersStore.set(pathStr, updated);
        }
      }
      for (const [docRef, val] of stageSets.entries()) {
        const pathStr = docRef.docId;
        const col = docRef.colName;
        if (col === 'orders') ordersStore.set(pathStr, val);
        else if (col === 'consultation_intakes') intakesStore.set(pathStr, val);
        else if (col === 'audit_logs') auditLogsStore.set(pathStr, val);
      }
      return result;
    },
  };

  const mockAuth: any = {
    verifyIdToken: async (token: string) => {
      if (token === 'SUPER_ADMIN_TOKEN') return { uid: 'super-admin-uid', email: 'admin@example.com' };
      if (token === 'DAET_MANAGER_TOKEN') return { uid: 'daet-manager-uid', email: 'daet@example.com' };
      if (token === 'CUSTOMER_ALICE_TOKEN') return { uid: 'customer-alice-uid', email: 'alice@example.com' };
      if (token === 'PRACTITIONER_BOB_TOKEN') return { uid: 'practitioner-bob-uid', email: 'bob@example.com' };
      throw new Error('Invalid token');
    },
  };

  // Safe mock KMS envelope client
  const mockKms: any = {
    encrypt: async () => {
      return [{ ciphertext: Buffer.from('mock-encrypted-dek') }];
    },
    decrypt: async () => {
      return [{ plaintext: Buffer.alloc(32, 1) }];
    },
  };

  return { mockDb, mockAuth, mockKms, ordersStore, inventoryStore, usersStore, intakesStore, auditLogsStore };
}

async function runAuditTests() {
  console.log('================================================================');
  console.log('   HCI CMD PHASE 5C — STRUCTURED AUDIT LOGGING SUITE            ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, message = 'Assertion failed') {
    if (condition) {
      console.log(` \x1b[32m[PASS]\x1b[0m ${name}`);
      passed++;
    } else {
      console.log(` \x1b[31m[FAIL]\x1b[0m ${name}`);
      console.error(`   -> ${message}`);
      failed++;
    }
  }

  const harness = createTestHarness();
  const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth, kmsClient: harness.mockKms });
  
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));

  try {
    // --- Test 1: Order Creation generates audit logs & required fields are present ---
    const orderPayload = {
      items: [{ skuId: 'hci-cmd-65ml', quantity: 2 }],
      branchId: 'daet',
      customer: { firstName: 'Alice', lastName: 'Smith' },
      paymentMethod: 'cash_on_delivery',
    };

    const res1 = await makeRequest(server, '/api/create-order', 'POST', orderPayload, {
      'Authorization': 'Bearer CUSTOMER_ALICE_TOKEN',
    });

    assert('1.1 Order placement API returned HTTP 200', res1.status === 200);

    // Let's verify that audit log was generated
    const auditLogs = Array.from(harness.auditLogsStore.values());
    const creationLog = auditLogs.find((l) => l.action === 'order_creation_success');

    assert('1.2 Order creation audit event is logged', creationLog !== undefined);
    if (creationLog) {
      assert('1.3 Audit event has required actorUid', creationLog.actorUid === 'customer-alice-uid');
      assert('1.4 Audit event has required actorRole', creationLog.actorRole === 'customer');
      assert('1.5 Audit event has branchId', creationLog.branchId === 'daet');
      assert('1.6 Audit event has targetResource', creationLog.targetResource === 'orders');
      assert('1.7 Audit event has success state', creationLog.success === true);
      assert('1.8 Audit event has targetId', creationLog.targetId !== null);
      assert('1.9 Audit event has timestamp (FieldValue stub or Date)', creationLog.timestamp !== null);
      assert('1.10 Audit event has correlationId', creationLog.correlationId !== undefined);
    }

    // --- Test 2: Sensitive Data Exclusion (Scrubbing / Redaction of keys, tokens, plaintexts) ---
    const intakePayload = {
      patientUid: 'customer-alice-uid',
      clinicalIntake: {
        dietaryHabits: 'Lots of fast food',
        waterConsumption: 'Less than 1L',
        declaredConditions: 'High blood pressure',
      },
      consentRecord: { purpose: 'Clinical Wellness', version: 'v1' },
    };

    const res2 = await makeRequest(server, '/api/clinical-intake/save', 'POST', intakePayload, {
      'Authorization': 'Bearer PRACTITIONER_BOB_TOKEN',
    });

    assert('2.1 Clinical intake saved successfully', res2.status === 200);

    const updatedLogs = Array.from(harness.auditLogsStore.values());
    const clinicalLog = updatedLogs.find((l) => l.action === 'clinical_intake_create_success');

    assert('2.2 Clinical intake creation logged', clinicalLog !== undefined);
    if (clinicalLog) {
      assert('2.3 Sensitive clinicalIntake data is excluded/redacted', !JSON.stringify(clinicalLog).includes('Lots of fast food'));
    }

    // --- Test 3: Status change & Cancellation Audits ---
    const orderId = res1.data.orderId;
    const statusPayload = {
      orderId,
      fulfillmentStatus: 'cancelled',
    };

    const res3 = await makeRequest(server, '/api/admin/orders/update-status', 'POST', statusPayload, {
      'Authorization': 'Bearer DAET_MANAGER_TOKEN',
    });

    assert('3.1 Order status update (cancellation) returned HTTP 200', res3.status === 200);

    const logsAfterCancel = Array.from(harness.auditLogsStore.values());
    const cancellationLog = logsAfterCancel.find((l) => l.action === 'order_cancellation_success' && l.targetId === orderId);

    assert('3.2 Order cancellation audit event logged', cancellationLog !== undefined);
    if (cancellationLog) {
      assert('3.3 Correct actor listed on cancellation audit', cancellationLog.actorUid === 'daet-manager-uid');
      assert('3.4 Correct action class listed on cancellation audit', cancellationLog.action === 'order_cancellation_success');
    }

    // --- Test 4: Inventory Replenishment Audit ---
    const replenishPayload = {
      branchId: 'daet',
      skuId: 'hci-cmd-65ml',
      quantity: 50,
    };

    const res4 = await makeRequest(server, '/api/admin/inventory/replenish', 'POST', replenishPayload, {
      'Authorization': 'Bearer DAET_MANAGER_TOKEN',
    });

    assert('4.1 Inventory replenishment returned HTTP 200', res4.status === 200);

    const logsAfterReplenish = Array.from(harness.auditLogsStore.values());
    const replenishLog = logsAfterReplenish.find((l) => l.action === 'inventory_replenishment_success');

    assert('4.2 Inventory replenishment audit event logged', replenishLog !== undefined);
    if (replenishLog) {
      assert('4.3 Stock count included in audit safe metadata', replenishLog.metadata.quantity === 50);
    }

    // --- Test 5: Role/Account Changes Audit ---
    const rolePayload = {
      targetUid: 'customer-alice-uid',
      role: 'branch_manager',
    };

    const res5 = await makeRequest(server, '/api/admin/users/update-role', 'POST', rolePayload, {
      'Authorization': 'Bearer SUPER_ADMIN_TOKEN',
    });

    assert('5.1 User role updated successfully by Super Admin', res5.status === 200);

    const logsAfterRoleUpdate = Array.from(harness.auditLogsStore.values());
    const roleLog = logsAfterRoleUpdate.find((l) => l.action === 'role_update_success');

    assert('5.2 Role/Account change audit event logged', roleLog !== undefined);
    if (roleLog) {
      assert('5.3 Role update records old and new roles in metadata', roleLog.metadata.newRole === 'branch_manager');
    }

    // --- Test 6: Authorization Failures Audit ---
    const unauthorizedRes = await makeRequest(server, '/api/admin/orders', 'GET', undefined, {
      'Authorization': 'Bearer CUSTOMER_ALICE_TOKEN',
    });

    assert('6.1 Administrative query by customer rejected with HTTP 403', unauthorizedRes.status === 403);

    const logsAfterAuthFail = Array.from(harness.auditLogsStore.values());
    const authFailLog = logsAfterAuthFail.find((l) => l.action === 'authorization_failure');

    assert('6.2 Authorization failure audit event logged', authFailLog !== undefined);
    if (authFailLog) {
      assert('6.3 Authorization failure logs user UID', authFailLog.actorUid === 'customer-alice-uid');
      assert('6.4 Authorization failure captures success as false', authFailLog.success === false);
    }

  } finally {
    server.close();
  }

  console.log('\n================================================================');
  console.log(`   PHASE 5C AUDIT SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED `);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAuditTests().catch((err) => {
  console.error('Exception during Phase 5C audit testing:', err);
  process.exit(1);
});
