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
  body: any,
  headers: Record<string, string> = {}
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const address = server.address() as any;
    const port = address.port;
    const postData = JSON.stringify(body || {});

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          ...headers,
        },
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
    req.write(postData);
    req.end();
  });
}

// In-Memory Test Harness for Phase 5A Identity Verification
function createTestHarness(options: {
  users?: Record<string, any>;
  inventory?: Record<string, any>;
  assignments?: Record<string, any>;
  orders?: Record<string, any>;
  intakes?: Record<string, any>;
}) {
  const usersStore = new Map<string, any>(Object.entries(options.users || {}));
  const inventoryStore = new Map<string, any>(Object.entries(options.inventory || {}));
  const assignmentStore = new Map<string, any>(Object.entries(options.assignments || {}));
  const ordersStore = new Map<string, any>(Object.entries(options.orders || {}));
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
              else if (colName === 'consultation_assignments') data = assignmentStore.get(docId);
              else if (colName === 'orders') data = ordersStore.get(docId);
              else if (colName === 'consultation_intakes') data = intakesStore.get(docId);

              return {
                exists: data !== undefined,
                data: () => data,
                get: (field: string) => data?.[field],
              };
            },
            set: async (val: any) => {
              if (colName === 'orders') ordersStore.set(docId, val);
              if (colName === 'consultation_intakes') intakesStore.set(docId, val);
              if (colName === 'users') usersStore.set(docId, val);
              return val;
            },
          };
        },
      };
    },
    runTransaction: async (updateFunction: (tx: any) => Promise<any>) => {
      const stageUpdates = new Map<string, any>();
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
        const pathStr = 'daet_hci-cmd-65ml';
        const existing = inventoryStore.get(pathStr);
        if (existing) {
          inventoryStore.set(pathStr, { ...existing, ...updates });
        }
      }
      for (const [docRef, val] of stageSets.entries()) {
        ordersStore.set(val.id || 'order', val);
      }
      return result;
    },
  };

  const mockAuth: any = {
    verifyIdToken: async (token: string) => {
      if (token === 'CUSTOMER_ALICE_TOKEN') {
        return { uid: 'customer-alice-uid', email: 'alice@example.com' };
      }
      if (token === 'CUSTOMER_BOB_TOKEN') {
        return { uid: 'customer-bob-uid', email: 'bob@example.com' };
      }
      if (token === 'PRACTITIONER_DOC_TOKEN') {
        return { uid: 'practitioner-doc-uid', email: 'doc@example.com' };
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

  return { mockDb, mockAuth, mockKms, inventoryStore, ordersStore, intakesStore, usersStore };
}

async function runPhase5ATests() {
  console.log('================================================================');
  console.log('   HCI CMD PHASE 5A — IDENTITY & CUSTOMER ACCESS TEST SUITE    ');
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

  // --- TEST 1: Unauthenticated customer cannot access protected order creation ---
  {
    const harness = createTestHarness({});
    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth, kmsClient: harness.mockKms });
    const server = http.createServer(app).listen(0);

    try {
      const res = await makeRequest(server, '/api/create-order', 'POST', {
        items: [{ skuId: 'hci-cmd-65ml', quantity: 1 }],
        branchId: 'daet',
      });
      assert(
        res.status === 401,
        'Test 1: Unauthenticated customer cannot access protected endpoint (HTTP 401 returned)'
      );
    } finally {
      server.close();
    }
  }

  // --- TEST 2: Valid Firebase-authenticated customer can create order for their own identity ---
  {
    const harness = createTestHarness({
      users: {
        'customer-alice-uid': { role: 'customer', email: 'alice@example.com' },
      },
      inventory: {
        'daet_hci-cmd-65ml': { stockCount: 20 },
      },
    });
    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth, kmsClient: harness.mockKms });
    const server = http.createServer(app).listen(0);

    try {
      const res = await makeRequest(
        server,
        '/api/create-order',
        'POST',
        {
          items: [{ skuId: 'hci-cmd-65ml', quantity: 2 }],
          branchId: 'daet',
          customer: { firstName: 'Alice', lastName: 'Customer' },
        },
        { Authorization: 'Bearer CUSTOMER_ALICE_TOKEN' }
      );
      assert(res.status === 200 && res.data.success === true, 'Test 2: Valid Firebase customer can place order (HTTP 200)');
      
      const createdOrder = Array.from(harness.ordersStore.values())[0];
      assert(
        createdOrder && createdOrder.userId === 'customer-alice-uid',
        'Test 2.1: Order explicitly recorded under authenticated user UID from verified ID token'
      );
    } finally {
      server.close();
    }
  }

  // --- TEST 3: Fabricated userId or x-user-id in payload CANNOT override authenticated token identity ---
  {
    const harness = createTestHarness({
      users: {
        'customer-alice-uid': { role: 'customer', email: 'alice@example.com' },
      },
      inventory: {
        'daet_hci-cmd-65ml': { stockCount: 20 },
      },
    });
    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth, kmsClient: harness.mockKms });
    const server = http.createServer(app).listen(0);

    try {
      const res = await makeRequest(
        server,
        '/api/create-order',
        'POST',
        {
          items: [{ skuId: 'hci-cmd-65ml', quantity: 1 }],
          branchId: 'daet',
          userId: 'customer-bob-uid', // Attempt to spoof Bob's identity in body
        },
        {
          Authorization: 'Bearer CUSTOMER_ALICE_TOKEN',
          'x-user-id': 'customer-bob-uid', // Attempt to spoof Bob's identity in header
        }
      );
      assert(res.status === 200, 'Test 3: Order placement succeeds using verified ID token');
      
      const createdOrder = Array.from(harness.ordersStore.values())[0];
      assert(
        createdOrder && createdOrder.userId === 'customer-alice-uid' && createdOrder.userId !== 'customer-bob-uid',
        'Test 3.1: Fabricated userId/x-user-id completely ignored; server uses verified token UID'
      );
    } finally {
      server.close();
    }
  }

  // --- TEST 4: Missing or invalid token is rejected ---
  {
    const harness = createTestHarness({});
    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth, kmsClient: harness.mockKms });
    const server = http.createServer(app).listen(0);

    try {
      const res1 = await makeRequest(
        server,
        '/api/create-order',
        'POST',
        { items: [{ skuId: 'hci-cmd-65ml', quantity: 1 }], branchId: 'daet' },
        { Authorization: 'Bearer FABRICATED_EXPIRED_TOKEN' }
      );
      assert(res1.status === 401, 'Test 4.1: Invalid Bearer token rejected with HTTP 401');

      const res2 = await makeRequest(
        server,
        '/api/create-order',
        'POST',
        { items: [{ skuId: 'hci-cmd-65ml', quantity: 1 }], branchId: 'daet' },
        { Authorization: 'Bearer ' }
      );
      assert(res2.status === 401, 'Test 4.2: Empty Bearer token rejected with HTTP 401');
    } finally {
      server.close();
    }
  }

  // --- TEST 5: Customer order & clinical access boundary ---
  {
    const harness = createTestHarness({
      users: {
        'practitioner-doc-uid': { role: 'practitioner' },
        'customer-alice-uid': { role: 'customer' },
        'customer-bob-uid': { role: 'customer' },
      },
      assignments: {
        'practitioner-doc-uid_customer-alice-uid': { active: true },
        'practitioner-doc-uid_customer-bob-uid': { active: true },
      },
    });
    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth, kmsClient: harness.mockKms });
    const server = http.createServer(app).listen(0);

    try {
      // 1. Practitioner saves clinical intake for Alice
      const saveRes = await makeRequest(
        server,
        '/api/clinical-intake/save',
        'POST',
        {
          patientUid: 'customer-alice-uid',
          clinicalIntake: { dietaryHabits: 'Organic', waterConsumption: '3L', declaredConditions: 'None' },
        },
        { Authorization: 'Bearer PRACTITIONER_DOC_TOKEN' }
      );
      assert(saveRes.status === 200, 'Test 5.0: Clinical intake saved by practitioner');
      const aliceIntakeId = saveRes.data.intakeId;

      // 2. Customer Bob attempts to fetch Alice's intake -> Denied 403
      const resBob = await makeRequest(
        server,
        '/api/clinical-intake/fetch',
        'POST',
        { intakeId: aliceIntakeId },
        { Authorization: 'Bearer CUSTOMER_BOB_TOKEN' }
      );
      assert(
        resBob.status === 403,
        'Test 5.1: Customer cannot access another customer\'s clinical intake record (HTTP 403 Access Denied)'
      );

      // 3. Customer Alice fetches her own intake -> Allowed 200
      const resAlice = await makeRequest(
        server,
        '/api/clinical-intake/fetch',
        'POST',
        { intakeId: aliceIntakeId },
        { Authorization: 'Bearer CUSTOMER_ALICE_TOKEN' }
      );
      assert(
        resAlice.status === 200,
        'Test 5.2: Customer can access their own clinical intake record (HTTP 200 Success)'
      );
    } finally {
      server.close();
    }
  }

  console.log('\n================================================================');
  console.log(`   PHASE 5A TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED     `);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase5ATests().catch((err) => {
  console.error('Phase 5A test execution exception:', err);
  process.exit(1);
});
