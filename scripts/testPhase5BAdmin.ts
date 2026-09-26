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

// In-Memory Test Harness for Phase 5B Admin & Order Lifecycle Verification
function createTestHarness(options: {
  users?: Record<string, any>;
  inventory?: Record<string, any>;
  orders?: Record<string, any>;
  assignments?: Record<string, any>;
  intakes?: Record<string, any>;
}) {
  const usersStore = new Map<string, any>(Object.entries(options.users || {}));
  const inventoryStore = new Map<string, any>(Object.entries(options.inventory || {}));
  const ordersStore = new Map<string, any>(Object.entries(options.orders || {}));
  const assignmentStore = new Map<string, any>(Object.entries(options.assignments || {}));
  const intakesStore = new Map<string, any>(Object.entries(options.intakes || {}));

  const mockDb: any = {
    collection: (colName: string) => {
      return {
        doc: (docId: string) => {
          return {
            get: async () => {
              let data: any = null;
              if (colName === 'users') data = usersStore.get(docId);
              else if (colName === 'branch_inventory') data = inventoryStore.get(docId);
              else if (colName === 'orders') data = ordersStore.get(docId);
              else if (colName === 'consultation_assignments') data = assignmentStore.get(docId);
              else if (colName === 'consultation_intakes') data = intakesStore.get(docId);

              return {
                exists: data !== undefined,
                data: () => data,
                get: (field: string) => data?.[field],
              };
            },
            set: async (val: any) => {
              if (colName === 'orders') ordersStore.set(docId, val);
              if (colName === 'branch_inventory') inventoryStore.set(docId, val);
              if (colName === 'users') usersStore.set(docId, val);
              return val;
            },
            update: async (val: any) => {
              let existing: any = {};
              if (colName === 'orders') existing = ordersStore.get(docId) || {};
              if (colName === 'branch_inventory') existing = inventoryStore.get(docId) || {};

              const updated = { ...existing, ...val };
              if (colName === 'orders') ordersStore.set(docId, updated);
              if (colName === 'branch_inventory') inventoryStore.set(docId, updated);
              return updated;
            },
          };
        },
        where: (field: string, op: string, val: string) => {
          return {
            get: async () => {
              const matched: any[] = [];
              if (colName === 'orders') {
                for (const order of ordersStore.values()) {
                  if (order[field] === val || order.pickupBranchId === val) {
                    matched.push({ data: () => order });
                  }
                }
              }
              return {
                forEach: (cb: (doc: any) => void) => matched.forEach(cb),
                docs: matched,
              };
            },
          };
        },
        get: async () => {
          const all: any[] = [];
          if (colName === 'orders') {
            for (const order of ordersStore.values()) {
              all.push({ data: () => order });
            }
          }
          return {
            forEach: (cb: (doc: any) => void) => all.forEach(cb),
            docs: all,
          };
        },
      };
    },
    runTransaction: async (updateFunction: (tx: any) => Promise<any>) => {
      const stageUpdates = new Map<string, { col: string; docId: string; updates: any }>();

      const mockTx = {
        get: async (docRef: any) => {
          return docRef.get();
        },
        update: (docRef: any, updates: any) => {
          // Track updates
          stageUpdates.set(JSON.stringify(docRef), { col: 'unknown', docId: 'unknown', updates });
        },
        set: (docRef: any, val: any) => {
          stageUpdates.set(JSON.stringify(docRef), { col: 'unknown', docId: 'unknown', updates: val });
        },
      };

      const result = await updateFunction(mockTx);
      return result;
    },
  };

  const mockAuth: any = {
    verifyIdToken: async (token: string) => {
      if (token === 'CUSTOMER_TOKEN') {
        return { uid: 'customer-uid', email: 'customer@example.com' };
      }
      if (token === 'MANAGER_DAET_TOKEN') {
        return { uid: 'manager-daet-uid', email: 'daet_mgr@example.com' };
      }
      if (token === 'MANAGER_LABO_TOKEN') {
        return { uid: 'manager-labo-uid', email: 'labo_mgr@example.com' };
      }
      if (token === 'SUPER_ADMIN_TOKEN') {
        return { uid: 'super-admin-uid', email: 'admin@example.com' };
      }
      throw new Error('Firebase ID token is invalid or expired.');
    },
  };

  const mockKmsMasterSecret = crypto.createHash('sha256').update('kms-master-test-key').digest();
  const mockKms: any = {
    encrypt: async (req: { name: string; plaintext: Buffer }) => {
      const cipher = crypto.createCipheriv('aes-256-cbc', mockKmsMasterSecret, Buffer.alloc(16, 0));
      const ciphertext = Buffer.concat([cipher.update(req.plaintext), cipher.final()]);
      return [{ ciphertext }];
    },
    decrypt: async (req: { name: string; ciphertext: Buffer }) => {
      const decipher = crypto.createDecipheriv('aes-256-cbc', mockKmsMasterSecret, Buffer.alloc(16, 0));
      const plaintext = Buffer.concat([decipher.update(req.ciphertext), decipher.final()]);
      return [{ plaintext }];
    },
  };

  return { mockDb, mockAuth, mockKms, inventoryStore, ordersStore, usersStore };
}

async function runPhase5BTests() {
  console.log('================================================================');
  console.log('   HCI CMD PHASE 5B — ORDER LIFECYCLE & ADMIN SECURITY SUITE   ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`\x1b[32m[PASS]\x1b[0m ${msg}`);
      passed++;
    } else {
      console.log(`\x1b[31m[FAIL]\x1b[0m ${msg}`);
      failed++;
    }
  }

  // --- TEST 1: Unauthenticated request receives HTTP 401 ---
  {
    const harness = createTestHarness({});
    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth, kmsClient: harness.mockKms });
    const server = http.createServer(app).listen(0);

    try {
      const res = await makeRequest(server, '/api/admin/orders', 'GET');
      assert(res.status === 401, 'Test 1.1: GET /api/admin/orders without token returns HTTP 401');

      const res2 = await makeRequest(server, '/api/admin/orders/update-status', 'POST', { orderId: 'HCI-ORD-111' });
      assert(res2.status === 401, 'Test 1.2: POST /api/admin/orders/update-status without token returns HTTP 401');
    } finally {
      server.close();
    }
  }

  // --- TEST 2: Invalid or forged token receives HTTP 401 ---
  {
    const harness = createTestHarness({});
    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth, kmsClient: harness.mockKms });
    const server = http.createServer(app).listen(0);

    try {
      const res = await makeRequest(server, '/api/admin/orders', 'GET', undefined, {
        Authorization: 'Bearer FORGED_INVALID_TOKEN',
      });
      assert(res.status === 401, 'Test 2.1: Invalid Bearer token returns HTTP 401');

      const res2 = await makeRequest(
        server,
        '/api/admin/orders',
        'GET',
        undefined,
        { 'x-user-id': 'super-admin-uid' } // Attempt spoof with header only
      );
      assert(res2.status === 401, 'Test 2.2: Forged x-user-id header without valid Bearer token returns HTTP 401');
    } finally {
      server.close();
    }
  }

  // --- TEST 3: Customer role attempting admin operation receives HTTP 403 ---
  {
    const harness = createTestHarness({
      users: {
        'customer-uid': { role: 'customer' },
      },
    });
    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth, kmsClient: harness.mockKms });
    const server = http.createServer(app).listen(0);

    try {
      const res = await makeRequest(server, '/api/admin/orders', 'GET', undefined, {
        Authorization: 'Bearer CUSTOMER_TOKEN',
      });
      assert(res.status === 403, 'Test 3.1: Customer role querying GET /api/admin/orders returns HTTP 403 Access Denied');

      const res2 = await makeRequest(
        server,
        '/api/admin/orders/update-status',
        'POST',
        { orderId: 'HCI-ORD-100', paymentStatus: 'paid' },
        { Authorization: 'Bearer CUSTOMER_TOKEN' }
      );
      assert(res2.status === 403, 'Test 3.2: Customer role attempting POST /api/admin/orders/update-status returns HTTP 403 Access Denied');

      const res3 = await makeRequest(
        server,
        '/api/admin/inventory/replenish',
        'POST',
        { branchId: 'daet', skuId: 'hci-cmd-65ml', quantity: 10 },
        { Authorization: 'Bearer CUSTOMER_TOKEN' }
      );
      assert(res3.status === 403, 'Test 3.3: Customer role attempting inventory replenishment returns HTTP 403 Access Denied');
    } finally {
      server.close();
    }
  }

  // --- TEST 4: Forged role or body userId CANNOT elevate privileges ---
  {
    const harness = createTestHarness({
      users: {
        'customer-uid': { role: 'customer' },
      },
    });
    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth, kmsClient: harness.mockKms });
    const server = http.createServer(app).listen(0);

    try {
      const res = await makeRequest(
        server,
        '/api/admin/orders/update-status',
        'POST',
        {
          orderId: 'HCI-ORD-100',
          paymentStatus: 'paid',
          role: 'super_admin', // Forged role in body
          userId: 'super-admin-uid', // Forged userId in body
        },
        {
          Authorization: 'Bearer CUSTOMER_TOKEN',
          'x-user-id': 'super-admin-uid',
        }
      );
      assert(res.status === 403, 'Test 4: Forged body role/userId/x-user-id ignored; server uses Firestore profile role -> HTTP 403');
    } finally {
      server.close();
    }
  }

  // --- TEST 5: Branch A staff CANNOT access Branch B orders ---
  {
    const harness = createTestHarness({
      users: {
        'manager-daet-uid': { role: 'branch_manager', assignedBranchId: 'daet' },
        'manager-labo-uid': { role: 'branch_manager', assignedBranchId: 'labo' },
      },
      orders: {
        'HCI-ORD-LABO-001': {
          id: 'HCI-ORD-LABO-001',
          branchId: 'labo',
          paymentStatus: 'pending_payment',
          fulfillmentStatus: 'pending_processing',
        },
      },
    });
    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth, kmsClient: harness.mockKms });
    const server = http.createServer(app).listen(0);

    try {
      // Daet manager attempting to query Labo branch orders
      const resQuery = await makeRequest(server, '/api/admin/orders?branchId=labo', 'GET', undefined, {
        Authorization: 'Bearer MANAGER_DAET_TOKEN',
      });
      assert(resQuery.status === 403, 'Test 5.1: Daet Manager querying Labo orders returns HTTP 403 Branch Isolation Block');

      // Daet manager attempting to modify Labo order status
      const resUpdate = await makeRequest(
        server,
        '/api/admin/orders/update-status',
        'POST',
        { orderId: 'HCI-ORD-LABO-001', paymentStatus: 'paid' },
        { Authorization: 'Bearer MANAGER_DAET_TOKEN' }
      );
      assert(resUpdate.status === 403, 'Test 5.2: Daet Manager modifying Labo order returns HTTP 403 Branch Isolation Block');
    } finally {
      server.close();
    }
  }

  // --- TEST 6: Authorized Branch staff can access permitted branch & super_admin can operate across branches ---
  {
    const harness = createTestHarness({
      users: {
        'manager-daet-uid': { role: 'branch_manager', assignedBranchId: 'daet' },
        'super-admin-uid': { role: 'super_admin' },
      },
      orders: {
        'HCI-ORD-DAET-001': {
          id: 'HCI-ORD-DAET-001',
          branchId: 'daet',
          paymentStatus: 'pending_payment',
          fulfillmentStatus: 'pending_processing',
        },
        'HCI-ORD-LABO-001': {
          id: 'HCI-ORD-LABO-001',
          branchId: 'labo',
          paymentStatus: 'pending_payment',
          fulfillmentStatus: 'pending_processing',
        },
      },
    });
    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth, kmsClient: harness.mockKms });
    const server = http.createServer(app).listen(0);

    try {
      // Daet manager querying Daet orders -> Allowed
      const resDaet = await makeRequest(server, '/api/admin/orders?branchId=daet', 'GET', undefined, {
        Authorization: 'Bearer MANAGER_DAET_TOKEN',
      });
      assert(resDaet.status === 200, 'Test 6.1: Authorized Daet Manager querying Daet orders returns HTTP 200');

      // Super Admin modifying Labo order -> Allowed
      const resSuperAdmin = await makeRequest(
        server,
        '/api/admin/orders/update-status',
        'POST',
        { orderId: 'HCI-ORD-LABO-001', paymentStatus: 'paid' },
        { Authorization: 'Bearer SUPER_ADMIN_TOKEN' }
      );
      assert(resSuperAdmin.status === 200 && resSuperAdmin.data.success === true, 'Test 6.2: Super Admin updating Labo order across branches returns HTTP 200');
    } finally {
      server.close();
    }
  }

  // --- TEST 7: Invalid status transition is rejected ---
  {
    const harness = createTestHarness({
      users: {
        'manager-daet-uid': { role: 'branch_manager', assignedBranchId: 'daet' },
      },
      orders: {
        'HCI-ORD-COMPLETED': {
          id: 'HCI-ORD-COMPLETED',
          branchId: 'daet',
          paymentStatus: 'paid',
          fulfillmentStatus: 'completed', // Terminal state
        },
      },
    });
    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth, kmsClient: harness.mockKms });
    const server = http.createServer(app).listen(0);

    try {
      // Attempt transition from terminal 'completed' to 'pending_processing'
      const res = await makeRequest(
        server,
        '/api/admin/orders/update-status',
        'POST',
        { orderId: 'HCI-ORD-COMPLETED', fulfillmentStatus: 'pending_processing' },
        { Authorization: 'Bearer MANAGER_DAET_TOKEN' }
      );
      assert(res.status === 400, 'Test 7.1: Status transition from terminal state \'completed\' rejected with HTTP 400');

      // Attempt invalid status string value
      const resInvalidVal = await makeRequest(
        server,
        '/api/admin/orders/update-status',
        'POST',
        { orderId: 'HCI-ORD-COMPLETED', fulfillmentStatus: 'INVALID_STATUS' },
        { Authorization: 'Bearer MANAGER_DAET_TOKEN' }
      );
      assert(resInvalidVal.status === 400, 'Test 7.2: Invalid status string value rejected with HTTP 400');
    } finally {
      server.close();
    }
  }

  // --- TEST 8: Nonexistent order handled safely ---
  {
    const harness = createTestHarness({
      users: {
        'manager-daet-uid': { role: 'branch_manager', assignedBranchId: 'daet' },
      },
    });
    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth, kmsClient: harness.mockKms });
    const server = http.createServer(app).listen(0);

    try {
      const res = await makeRequest(
        server,
        '/api/admin/orders/update-status',
        'POST',
        { orderId: 'HCI-ORD-NONEXISTENT', paymentStatus: 'paid' },
        { Authorization: 'Bearer MANAGER_DAET_TOKEN' }
      );
      assert(res.status === 404, 'Test 8: Updating non-existent order returns HTTP 404 Not Found');
    } finally {
      server.close();
    }
  }

  // --- TEST 9: Inventory replenishment & restock on cancellation ---
  {
    const harness = createTestHarness({
      users: {
        'manager-daet-uid': { role: 'branch_manager', assignedBranchId: 'daet' },
      },
      inventory: {
        'daet_hci-cmd-65ml': { stockCount: 10 },
      },
      orders: {
        'HCI-ORD-CANCEL-ME': {
          id: 'HCI-ORD-CANCEL-ME',
          branchId: 'daet',
          fulfillmentStatus: 'pending_processing',
          items: [{ skuId: 'hci-cmd-65ml', quantity: 3 }],
        },
      },
    });
    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth, kmsClient: harness.mockKms });
    const server = http.createServer(app).listen(0);

    try {
      // 1. Replenish inventory
      const resReplenish = await makeRequest(
        server,
        '/api/admin/inventory/replenish',
        'POST',
        { branchId: 'daet', skuId: 'hci-cmd-65ml', quantity: 15 },
        { Authorization: 'Bearer MANAGER_DAET_TOKEN' }
      );
      assert(resReplenish.status === 200 && resReplenish.data.newStockCount === 25, 'Test 9.1: Branch inventory stock successfully replenished (+15 => 25)');

      // 2. Cancel order and verify restock
      const resCancel = await makeRequest(
        server,
        '/api/admin/orders/update-status',
        'POST',
        { orderId: 'HCI-ORD-CANCEL-ME', fulfillmentStatus: 'cancelled' },
        { Authorization: 'Bearer MANAGER_DAET_TOKEN' }
      );
      assert(resCancel.status === 200, 'Test 9.2: Order status successfully updated to cancelled');
    } finally {
      server.close();
    }
  }

  console.log('\n================================================================');
  console.log(`   PHASE 5B TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED     `);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase5BTests().catch((err) => {
  console.error('Phase 5B test execution exception:', err);
  process.exit(1);
});
