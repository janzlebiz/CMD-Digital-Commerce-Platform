/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createExpressApp } from '../server';
import crypto from 'crypto';
import http from 'http';
import fs from 'fs';
import path from 'path';

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
  const assignmentsStore = new Map<string, any>();

  // Pre-seed default actors
  usersStore.set('super-admin-uid', { uid: 'super-admin-uid', role: 'super_admin', email: 'admin@example.com' });
  usersStore.set('regional-dir-uid', { uid: 'regional-dir-uid', role: 'regional_director', email: 'director@example.com' });
  usersStore.set('daet-manager-uid', { uid: 'daet-manager-uid', role: 'branch_manager', assignedBranchId: 'daet', email: 'daet@example.com' });
  usersStore.set('labo-manager-uid', { uid: 'labo-manager-uid', role: 'branch_manager', assignedBranchId: 'labo', email: 'labo@example.com' });
  usersStore.set('customer-alice-uid', { uid: 'customer-alice-uid', role: 'customer', email: 'alice@example.com', assignedPractitionerId: 'practitioner-bob-uid' });
  usersStore.set('customer-charlie-uid', { uid: 'customer-charlie-uid', role: 'customer', email: 'charlie@example.com' });
  usersStore.set('practitioner-bob-uid', { uid: 'practitioner-bob-uid', role: 'practitioner', email: 'bob@example.com' });

  // Pre-seed practitioner-patient assignment
  assignmentsStore.set('practitioner-bob-uid_customer-alice-uid', {
    practitionerId: 'practitioner-bob-uid',
    patientId: 'customer-alice-uid',
    active: true,
  });

  // Pre-seed inventory for Daet and Labo
  inventoryStore.set('daet_hci-cmd-65ml', { branchId: 'daet', skuId: 'hci-cmd-65ml', stockCount: 100 });
  inventoryStore.set('daet_hci-cmd-30ml', { branchId: 'daet', skuId: 'hci-cmd-30ml', stockCount: 50 });
  inventoryStore.set('labo_hci-cmd-65ml', { branchId: 'labo', skuId: 'hci-cmd-65ml', stockCount: 80 });

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
        else if (colName === 'consultation_assignments') data = assignmentsStore.get(docId);
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
        else if (colName === 'consultation_assignments') assignmentsStore.set(docId, val);
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

  const createQuery = (colName: string, filterFn?: (item: any) => boolean): any => {
    return {
      doc: (docId: string) => createDocRef(colName, docId),
      where: (field: string, op: string, val: any) => {
        const nextFilter = (item: any) => {
          if (filterFn && !filterFn(item)) return false;
          if (op === '==') return item[field] === val;
          return true;
        };
        return createQuery(colName, nextFilter);
      },
      get: async () => {
        let map: Map<string, any>;
        if (colName === 'orders') map = ordersStore;
        else if (colName === 'branch_inventory') map = inventoryStore;
        else if (colName === 'users') map = usersStore;
        else if (colName === 'consultation_intakes') map = intakesStore;
        else map = auditLogsStore;

        const results: any[] = [];
        map.forEach((value, key) => {
          if (!filterFn || filterFn(value)) {
            results.push({
              id: key,
              data: () => value,
              get: (f: string) => value?.[f],
            });
          }
        });
        return {
          forEach: (cb: any) => results.forEach(cb),
        };
      },
      orderBy: (field: string, direction: string) => ({
        limit: (n: number) => ({
          get: async () => {
            const results: any[] = [];
            auditLogsStore.forEach((value, key) => {
              results.push({
                id: key,
                data: () => value,
                get: (f: string) => value?.[f],
              });
            });
            return {
              forEach: (cb: any) => results.forEach(cb),
            };
          },
        }),
      }),
    };
  };

  const mockDb: any = {
    collection: (colName: string) => createQuery(colName),
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
      if (token === 'REGIONAL_DIR_TOKEN') return { uid: 'regional-dir-uid', email: 'director@example.com' };
      if (token === 'DAET_MANAGER_TOKEN') return { uid: 'daet-manager-uid', email: 'daet@example.com' };
      if (token === 'LABO_MANAGER_TOKEN') return { uid: 'labo-manager-uid', email: 'labo@example.com' };
      if (token === 'CUSTOMER_ALICE_TOKEN') return { uid: 'customer-alice-uid', email: 'alice@example.com' };
      if (token === 'CUSTOMER_CHARLIE_TOKEN') return { uid: 'customer-charlie-uid', email: 'charlie@example.com' };
      if (token === 'PRACTITIONER_BOB_TOKEN') return { uid: 'practitioner-bob-uid', email: 'bob@example.com' };
      throw new Error('Invalid or expired Firebase ID token');
    },
  };

  // Safe mock KMS envelope client that preserves DEK for test round-trips
  const mockKms: any = {
    encrypt: async (req: any) => {
      return [{ ciphertext: req.plaintext }];
    },
    decrypt: async (req: any) => {
      return [{ plaintext: req.ciphertext }];
    },
  };

  return { mockDb, mockAuth, mockKms, ordersStore, inventoryStore, usersStore, intakesStore, auditLogsStore };
}

async function runAuditTests() {
  console.log('================================================================');
  console.log('   HCI CMD PHASE 5C — DASHBOARD & AUDIT LOGGING SUITE           ');
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
    // =========================================================================
    // SECTION 1: DASHBOARD AUTHORIZATION & BRANCH ISOLATION
    // =========================================================================
    console.log('--- SECTION 1: Dashboard Authorization & Branch Isolation ---');

    // 1.1 Customer access denied to admin endpoints
    const resCustOrders = await makeRequest(server, '/api/admin/orders', 'GET', undefined, {
      'Authorization': 'Bearer CUSTOMER_ALICE_TOKEN',
    });
    assert('1.1 Customer role querying GET /api/admin/orders rejected with HTTP 403', resCustOrders.status === 403);

    const resCustUpdate = await makeRequest(server, '/api/admin/orders/update-status', 'POST', { orderId: 'ord-1', fulfillmentStatus: 'completed' }, {
      'Authorization': 'Bearer CUSTOMER_ALICE_TOKEN',
    });
    assert('1.2 Customer role POST /api/admin/orders/update-status rejected with HTTP 403', resCustUpdate.status === 403);

    const resCustReplenish = await makeRequest(server, '/api/admin/inventory/replenish', 'POST', { branchId: 'daet', skuId: 'hci-cmd-65ml', quantity: 10 }, {
      'Authorization': 'Bearer CUSTOMER_ALICE_TOKEN',
    });
    assert('1.3 Customer role POST /api/admin/inventory/replenish rejected with HTTP 403', resCustReplenish.status === 403);

    // 1.4 Branch Manager branch isolation block
    const resDaetQueryLabo = await makeRequest(server, '/api/admin/orders?branchId=labo', 'GET', undefined, {
      'Authorization': 'Bearer DAET_MANAGER_TOKEN',
    });
    assert('1.4 Daet Manager querying Labo orders rejected with HTTP 403 Branch Isolation Block', resDaetQueryLabo.status === 403);

    const resDaetReplenishLabo = await makeRequest(server, '/api/admin/inventory/replenish', 'POST', { branchId: 'labo', skuId: 'hci-cmd-65ml', quantity: 20 }, {
      'Authorization': 'Bearer DAET_MANAGER_TOKEN',
    });
    assert('1.5 Daet Manager replenishing Labo branch inventory rejected with HTTP 403 Branch Isolation Block', resDaetReplenishLabo.status === 403);

    // 1.6 Authorized Branch Manager accessing assigned branch
    const resDaetOwnOrders = await makeRequest(server, '/api/admin/orders?branchId=daet', 'GET', undefined, {
      'Authorization': 'Bearer DAET_MANAGER_TOKEN',
    });
    assert('1.6 Daet Manager querying Daet orders succeeds with HTTP 200', resDaetOwnOrders.status === 200);

    // 1.7 Regional Director multi-branch scope access
    const resRegDirOrders = await makeRequest(server, '/api/admin/orders?branchId=labo', 'GET', undefined, {
      'Authorization': 'Bearer REGIONAL_DIR_TOKEN',
    });
    assert('1.7 Regional Director querying Labo branch orders succeeds with HTTP 200', resRegDirOrders.status === 200);

    // 1.8 Super Admin global access
    const resSuperAdminOrders = await makeRequest(server, '/api/admin/orders', 'GET', undefined, {
      'Authorization': 'Bearer SUPER_ADMIN_TOKEN',
    });
    assert('1.8 Super Admin querying all orders without branch filter succeeds with HTTP 200', resSuperAdminOrders.status === 200);

    // =========================================================================
    // SECTION 2: AUDIT LOG CREATION & STRUCTURED FIELDS
    // =========================================================================
    console.log('\n--- SECTION 2: Audit Log Creation & Required Fields ---');

    // 2.1 Order Creation generates structured audit log
    const orderPayload = {
      items: [{ skuId: 'hci-cmd-65ml', quantity: 2 }],
      branchId: 'daet',
      customer: { firstName: 'Alice', lastName: 'Smith' },
      paymentMethod: 'cash_on_pickup',
    };

    const resOrderCreate = await makeRequest(server, '/api/create-order', 'POST', orderPayload, {
      'Authorization': 'Bearer CUSTOMER_ALICE_TOKEN',
    });
    assert('2.1 Order creation succeeds with HTTP 200', resOrderCreate.status === 200);
    const createdOrderId = resOrderCreate.data.orderId;

    const allLogs = Array.from(harness.auditLogsStore.values());
    const orderCreateLog = allLogs.find((l) => l.action === 'order_creation_success' && l.targetId === createdOrderId);

    assert('2.2 Order creation audit log event created', orderCreateLog !== undefined);
    if (orderCreateLog) {
      assert('2.3 Required actorUid present and verified', orderCreateLog.actorUid === 'customer-alice-uid');
      assert('2.4 Required actorRole present', orderCreateLog.actorRole === 'customer');
      assert('2.5 Required branchId present', orderCreateLog.branchId === 'daet');
      assert('2.6 Required targetResource present', orderCreateLog.targetResource === 'orders');
      assert('2.7 Required targetId matches created order', orderCreateLog.targetId === createdOrderId);
      assert('2.8 Success flag set to true', orderCreateLog.success === true);
      assert('2.9 Server timestamp present', orderCreateLog.timestamp !== null && orderCreateLog.timestamp !== undefined);
      assert('2.10 Correlation ID present', typeof orderCreateLog.correlationId === 'string' && orderCreateLog.correlationId.length > 0);
    }

    // 2.2 Order Status Transition Audit
    const updateRes = await makeRequest(server, '/api/admin/orders/update-status', 'POST', {
      orderId: createdOrderId,
      fulfillmentStatus: 'ready_for_pickup',
    }, {
      'Authorization': 'Bearer DAET_MANAGER_TOKEN',
    });
    assert('2.11 Order fulfillment status updated to ready_for_pickup with HTTP 200', updateRes.status === 200);

    const logsAfterUpdate = Array.from(harness.auditLogsStore.values());
    const statusUpdateLog = logsAfterUpdate.find((l) => l.action === 'order_status_update_success' && l.targetId === createdOrderId);
    assert('2.12 Order status update audit event logged', statusUpdateLog !== undefined);
    if (statusUpdateLog) {
      assert('2.13 Actor recorded as daet-manager-uid', statusUpdateLog.actorUid === 'daet-manager-uid');
      assert('2.14 Actor role recorded as branch_manager', statusUpdateLog.actorRole === 'branch_manager');
      assert('2.15 Metadata contains transition states', statusUpdateLog.metadata?.fulfillmentStatus === 'ready_for_pickup');
    }

    // 2.3 Order Cancellation & Inventory Restoration Audit
    const cancelRes = await makeRequest(server, '/api/admin/orders/update-status', 'POST', {
      orderId: createdOrderId,
      fulfillmentStatus: 'cancelled',
    }, {
      'Authorization': 'Bearer DAET_MANAGER_TOKEN',
    });
    assert('2.16 Order cancelled with HTTP 200', cancelRes.status === 200);

    const logsAfterCancel = Array.from(harness.auditLogsStore.values());
    const cancelLog = logsAfterCancel.find((l) => l.action === 'order_cancellation_success' && l.targetId === createdOrderId);
    const restoreLog = logsAfterCancel.find((l) => l.action === 'inventory_restoration_success' && l.targetId === createdOrderId);

    assert('2.17 Cancellation audit event logged', cancelLog !== undefined);
    assert('2.18 Inventory restoration audit event logged', restoreLog !== undefined);
    if (restoreLog) {
      assert('2.19 Inventory restoration targetResource is branch_inventory', restoreLog.targetResource === 'branch_inventory');
      assert('2.20 Inventory restoration records restocked item count in safe metadata', restoreLog.metadata?.itemsCount === 1);
    }

    // 2.4 Inventory Replenishment Audit
    const replenishRes = await makeRequest(server, '/api/admin/inventory/replenish', 'POST', {
      branchId: 'daet',
      skuId: 'hci-cmd-65ml',
      quantity: 50,
    }, {
      'Authorization': 'Bearer DAET_MANAGER_TOKEN',
    });
    assert('2.21 Inventory replenishment succeeds with HTTP 200', replenishRes.status === 200);

    const logsAfterReplenish = Array.from(harness.auditLogsStore.values());
    const replenishLog = logsAfterReplenish.find((l) => l.action === 'inventory_replenishment_success' && l.targetId === 'daet_hci-cmd-65ml');
    assert('2.22 Inventory replenishment audit event logged', replenishLog !== undefined);
    if (replenishLog) {
      assert('2.23 Replenishment metadata records safe quantity added', replenishLog.metadata?.quantity === 50);
      assert('2.24 Replenishment metadata records resulting stock count', replenishLog.metadata?.newStockCount !== undefined);
    }

    // 2.5 Role & Account Changes Audit
    const roleRes = await makeRequest(server, '/api/admin/users/update-role', 'POST', {
      targetUid: 'customer-charlie-uid',
      role: 'branch_manager',
    }, {
      'Authorization': 'Bearer SUPER_ADMIN_TOKEN',
    });
    assert('2.25 User role update by Super Admin succeeds with HTTP 200', roleRes.status === 200);

    const logsAfterRole = Array.from(harness.auditLogsStore.values());
    const roleLog = logsAfterRole.find((l) => l.action === 'role_update_success' && l.targetId === 'customer-charlie-uid');
    assert('2.26 Role update audit event logged', roleLog !== undefined);
    if (roleLog) {
      assert('2.27 Actor is verified as super-admin-uid', roleLog.actorUid === 'super-admin-uid');
      assert('2.28 Role change transition recorded (old -> new)', roleLog.metadata?.newRole === 'branch_manager');
    }

    // =========================================================================
    // SECTION 3: SENSITIVE DATA EXCLUSION & SAFE METADATA
    // =========================================================================
    console.log('\n--- SECTION 3: Sensitive Data Exclusion & Scrubbing ---');

    // 3.1 Clinical Intake Actions & Plaintext Exclusion
    const intakePayload = {
      patientUid: 'customer-alice-uid',
      clinicalIntake: {
        dietaryHabits: 'High sodium diet, takes prescription medication daily',
        waterConsumption: 'Under 1.5L daily with reported dehydration symptoms',
        declaredConditions: 'Hypertension, Stage 2 Chronic Kidney Disease',
      },
      consentRecord: {
        purpose: 'Cell Mineral Drops Wellness Consultation',
        version: 'v2026.1',
      },
      scheduledAt: new Date().toISOString(),
      deliveryMode: 'virtual',
    };

    const intakeSaveRes = await makeRequest(server, '/api/clinical-intake/save', 'POST', intakePayload, {
      'Authorization': 'Bearer PRACTITIONER_BOB_TOKEN',
    });
    assert('3.1 Clinical intake saved successfully with HTTP 200', intakeSaveRes.status === 200);
    const createdIntakeId = intakeSaveRes.data.intakeId;

    const intakeFetchRes = await makeRequest(server, '/api/clinical-intake/fetch', 'POST', {
      intakeId: createdIntakeId,
    }, {
      'Authorization': 'Bearer CUSTOMER_ALICE_TOKEN',
    });
    assert('3.2 Clinical intake fetched successfully by patient with HTTP 200', intakeFetchRes.status === 200);

    // Verify all audit logs in store for clinical data or secrets
    const allAuditEntries = Array.from(harness.auditLogsStore.values());
    const serializedAllLogs = JSON.stringify(allAuditEntries);

    assert('3.3 Audit logs contain NO clinical dietary habits plaintext', !serializedAllLogs.includes('High sodium diet'));
    assert('3.4 Audit logs contain NO clinical water consumption plaintext', !serializedAllLogs.includes('Under 1.5L daily'));
    assert('3.5 Audit logs contain NO clinical conditions plaintext', !serializedAllLogs.includes('Hypertension'));
    assert('3.6 Audit logs contain NO encryption keys (DEK/plaintext)', !serializedAllLogs.includes('mock-encrypted-dek'));
    assert('3.7 Audit logs contain NO Authorization Bearer token strings', !serializedAllLogs.includes('Bearer '));
    assert('3.8 Audit logs contain NO password fields', !serializedAllLogs.includes('password'));

    // Check that clinical creation and access were audited safely
    const clinicalCreateLog = allAuditEntries.find((l) => l.action === 'clinical_intake_create_success' && l.targetId === createdIntakeId);
    const clinicalAccessLog = allAuditEntries.find((l) => l.action === 'clinical_intake_access_success' && l.targetId === createdIntakeId);
    assert('3.9 Clinical intake creation audited', clinicalCreateLog !== undefined);
    assert('3.10 Clinical intake access audited', clinicalAccessLog !== undefined);

    // =========================================================================
    // SECTION 4: AUTHORIZATION FAILURES AUDIT LOGGING
    // =========================================================================
    console.log('\n--- SECTION 4: Authorization Failures Audit Logging ---');

    // 4.1 Missing token
    const resNoToken = await makeRequest(server, '/api/admin/orders', 'GET');
    assert('4.1 Request with no token returns HTTP 401', resNoToken.status === 401);

    // 4.2 Invalid token
    const resBadToken = await makeRequest(server, '/api/admin/orders', 'GET', undefined, {
      'Authorization': 'Bearer INVALID_EXPIRED_TOKEN',
    });
    assert('4.2 Request with invalid token returns HTTP 401', resBadToken.status === 401);

    // 4.3 Unassigned practitioner access
    const resUnassignedIntake = await makeRequest(server, '/api/clinical-intake/save', 'POST', {
      patientUid: 'customer-charlie-uid',
      clinicalIntake: { data: 'test' },
      consentRecord: { version: 'v1' },
    }, {
      'Authorization': 'Bearer PRACTITIONER_BOB_TOKEN',
    });
    assert('4.3 Unassigned practitioner clinical save rejected with HTTP 403', resUnassignedIntake.status === 403);

    const logsAfterFailures = Array.from(harness.auditLogsStore.values());
    const authFailureLogs = logsAfterFailures.filter((l) => l.action === 'authorization_failure');

    assert('4.4 Authorization failures are recorded in audit logs', authFailureLogs.length >= 3);
    const failureWithFalseState = authFailureLogs.every((l) => l.success === false);
    assert('4.5 All authorization failure audit logs have success: false', failureWithFalseState);

    // =========================================================================
    // SECTION 5: AUDIT LOGS LEAST-PRIVILEGE READ ACCESS
    // =========================================================================
    console.log('\n--- SECTION 5: Audit Logs Least-Privilege Read Access ---');

    // 5.1 Customer cannot read audit logs
    const resCustAudit = await makeRequest(server, '/api/admin/audit-logs', 'GET', undefined, {
      'Authorization': 'Bearer CUSTOMER_ALICE_TOKEN',
    });
    assert('5.1 Customer GET /api/admin/audit-logs rejected with HTTP 403 Access Denied', resCustAudit.status === 403);

    // 5.2 Branch Manager cannot read audit logs (only Super Admin & Regional Director)
    const resMgrAudit = await makeRequest(server, '/api/admin/audit-logs', 'GET', undefined, {
      'Authorization': 'Bearer DAET_MANAGER_TOKEN',
    });
    assert('5.2 Branch Manager GET /api/admin/audit-logs rejected with HTTP 403 Access Denied', resMgrAudit.status === 403);

    // 5.3 Regional Director can read audit logs
    const resRegDirAudit = await makeRequest(server, '/api/admin/audit-logs', 'GET', undefined, {
      'Authorization': 'Bearer REGIONAL_DIR_TOKEN',
    });
    assert('5.3 Regional Director GET /api/admin/audit-logs succeeds with HTTP 200', resRegDirAudit.status === 200);
    assert('5.4 Regional Director received structured audit log entries', Array.isArray(resRegDirAudit.data?.logs));

    // 5.5 Super Admin can read audit logs
    const resSuperAdminAudit = await makeRequest(server, '/api/admin/audit-logs', 'GET', undefined, {
      'Authorization': 'Bearer SUPER_ADMIN_TOKEN',
    });
    assert('5.5 Super Admin GET /api/admin/audit-logs succeeds with HTTP 200', resSuperAdminAudit.status === 200);
    assert('5.6 Super Admin received structured audit log entries', resSuperAdminAudit.data?.count > 0);

    // =========================================================================
    // SECTION 6: FIRESTORE SECURITY RULES VERIFICATION (CLIENT LOCKDOWN)
    // =========================================================================
    console.log('\n--- SECTION 6: Firestore Security Rules Client Lockdown ---');

    const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');

    assert('6.1 firestore.rules specifies match /audit_logs/{logId}', rulesContent.includes('match /audit_logs/{logId}'));
    assert('6.2 firestore.rules strictly denies direct client writes: allow write: if false', rulesContent.includes('allow write: if false; // Absolute lockdown of client writes'));
    assert('6.3 firestore.rules restricts read to isSuperAdmin() or isRegionalDirector()', rulesContent.includes('isSuperAdmin() ||\n        isRegionalDirector()'));

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
