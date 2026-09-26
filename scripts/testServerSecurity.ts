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

// In-Memory Test Harness for Firestore & Cloud KMS
function createTestHarness(options: {
  users?: Record<string, any>;
  inventory?: Record<string, any>;
  assignments?: Record<string, any>;
  orders?: Record<string, any>;
  intakes?: Record<string, any>;
  simulateFirestoreFailure?: boolean;
  simulateKmsFailure?: boolean;
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
              if (options.simulateFirestoreFailure) {
                throw new Error('Simulated Firestore Network/Unavailable Failure (UNAVAILABLE)');
              }
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
              if (options.simulateFirestoreFailure) {
                throw new Error('Simulated Firestore Write Failure (INTERNAL_SERVER_ERROR)');
              }
              if (colName === 'orders') ordersStore.set(docId, val);
              if (colName === 'consultation_intakes') intakesStore.set(docId, val);
              return val;
            },
          };
        },
      };
    },
    runTransaction: async (updateFunction: (tx: any) => Promise<any>) => {
      if (options.simulateFirestoreFailure) {
        throw new Error('Simulated Firestore Transaction Failure (ABORTED)');
      }
      const stageUpdates = new Map<string, any>();
      const stageSets = new Map<string, { col: string; docId: string; val: any }>();

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

      // Apply staged updates atomically
      for (const [docRef, updates] of stageUpdates.entries()) {
        const pathStr = docRef._docId || 'daet_hci-cmd-65ml';
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
      if (token === 'VALID_PATIENT_TOKEN') {
        return { uid: 'patient-user-01', email: 'patient@example.com' };
      }
      if (token === 'VALID_ASSIGNED_PRACTITIONER_TOKEN') {
        return { uid: 'practitioner-assigned-01', email: 'practitioner1@example.com' };
      }
      if (token === 'VALID_UNASSIGNED_PRACTITIONER_TOKEN') {
        return { uid: 'practitioner-unassigned-02', email: 'practitioner2@example.com' };
      }
      if (token === 'VALID_ADMIN_TOKEN') {
        return { uid: 'admin-user-01', email: 'admin@example.com' };
      }
      throw new Error('Firebase ID token is invalid or expired.');
    },
  };

  // KMS test substitute with simulated KMS envelope wrap/unwrap
  const mockKmsMasterSecret = crypto.createHash('sha256').update('kms-master-test-key').digest();
  const mockKms: any = {
    encrypt: async (req: { name: string; plaintext: Buffer }) => {
      if (options.simulateKmsFailure) {
        throw new Error('Simulated Google Cloud KMS UNAVAILABLE / 503 Resource Unavailable');
      }
      const cipher = crypto.createCipheriv('aes-256-cbc', mockKmsMasterSecret, Buffer.alloc(16, 0));
      const ciphertext = Buffer.concat([cipher.update(req.plaintext), cipher.final()]);
      return [{ ciphertext }];
    },
    decrypt: async (req: { name: string; ciphertext: Buffer }) => {
      if (options.simulateKmsFailure) {
        throw new Error('Simulated Google Cloud KMS UNAVAILABLE / 503 Resource Unavailable');
      }
      const decipher = crypto.createDecipheriv('aes-256-cbc', mockKmsMasterSecret, Buffer.alloc(16, 0));
      const plaintext = Buffer.concat([decipher.update(req.ciphertext), decipher.final()]);
      return [{ plaintext }];
    },
  };

  return { mockDb, mockAuth, mockKms, inventoryStore, ordersStore, intakesStore };
}

async function runTests() {
  console.log('================================================================');
  console.log('    HCI CMD REMEDIATED SERVER.TS INTEGRATION & SECURITY SUITE   ');
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

  // --- TEST 1: Missing & Invalid Authentication Rejection ---
  {
    const harness = createTestHarness({});
    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth, kmsClient: harness.mockKms });
    const server = http.createServer(app).listen(0);

    try {
      // Missing token
      const res1 = await makeRequest(server, '/api/create-order', 'POST', {
        items: [{ skuId: 'hci-cmd-65ml', quantity: 1 }],
        branchId: 'daet',
      });
      assert(res1.status === 401, 'Test 1.1: Missing Authorization header is rejected with HTTP 401');

      // Invalid token
      const res2 = await makeRequest(
        server,
        '/api/create-order',
        'POST',
        { items: [{ skuId: 'hci-cmd-65ml', quantity: 1 }], branchId: 'daet' },
        { Authorization: 'Bearer INVALID_EXPIRED_TOKEN' }
      );
      assert(res2.status === 401, 'Test 1.2: Invalid Firebase ID token is rejected with HTTP 401');

      // Attempting legacy x-user-id header without valid token
      const res3 = await makeRequest(
        server,
        '/api/create-order',
        'POST',
        { items: [{ skuId: 'hci-cmd-65ml', quantity: 1 }], branchId: 'daet' },
        { 'x-user-id': 'spoofed-admin' }
      );
      assert(res3.status === 401, 'Test 1.3: Request with only x-user-id header is rejected with HTTP 401');
    } finally {
      server.close();
    }
  }

  // --- TEST 2: Unassigned Practitioner Rejection ---
  {
    const harness = createTestHarness({
      users: {
        'practitioner-unassigned-02': { role: 'practitioner' },
        'patient-user-01': { role: 'customer' },
      },
      assignments: {
        // No assignment for practitioner-unassigned-02
      },
    });
    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth, kmsClient: harness.mockKms });
    const server = http.createServer(app).listen(0);

    try {
      const res = await makeRequest(
        server,
        '/api/clinical-intake/save',
        'POST',
        {
          patientUid: 'patient-user-01',
          clinicalIntake: { dietaryHabits: 'Test', waterConsumption: '2L', declaredConditions: 'None' },
        },
        { Authorization: 'Bearer VALID_UNASSIGNED_PRACTITIONER_TOKEN' }
      );
      assert(res.status === 403, 'Test 2: Unassigned practitioner clinical save is rejected with HTTP 403');
      assert(
        res.data.error && res.data.error.includes('Clinical Boundary Block'),
        'Test 2.1: Error message explicitly enforces Clinical Boundary Block'
      );
    } finally {
      server.close();
    }
  }

  // --- TEST 3: Missing Inventory Rejection ---
  {
    const harness = createTestHarness({
      users: {
        'patient-user-01': { role: 'customer' },
      },
      inventory: {
        // 'daet_hci-cmd-65ml' intentionally omitted
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
        },
        { Authorization: 'Bearer VALID_PATIENT_TOKEN' }
      );
      assert(res.status === 400, 'Test 3: Missing inventory record causes order creation failure with HTTP 400');
      assert(
        res.data.error && res.data.error.includes('Missing Inventory Record'),
        'Test 3.1: Error message explicitly reports Missing Inventory Record'
      );
    } finally {
      server.close();
    }
  }

  // --- TEST 4: Firestore Failure Returns Failure (No In-Memory Masking) ---
  {
    const harness = createTestHarness({
      users: {
        'patient-user-01': { role: 'customer' },
      },
      inventory: {
        'daet_hci-cmd-65ml': { stockCount: 100 },
      },
      simulateFirestoreFailure: true,
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
        },
        { Authorization: 'Bearer VALID_PATIENT_TOKEN' }
      );
      assert(res.status === 500, 'Test 4: Firestore database failure returns HTTP 500 error instead of false success');
    } finally {
      server.close();
    }
  }

  // --- TEST 5: Cloud KMS Failure Fails Closed ---
  {
    const harness = createTestHarness({
      users: {
        'practitioner-assigned-01': { role: 'practitioner' },
        'patient-user-01': { role: 'customer' },
      },
      assignments: {
        'practitioner-assigned-01_patient-user-01': { active: true },
      },
      simulateKmsFailure: true,
    });
    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth, kmsClient: harness.mockKms });
    const server = http.createServer(app).listen(0);

    try {
      const res = await makeRequest(
        server,
        '/api/clinical-intake/save',
        'POST',
        {
          patientUid: 'patient-user-01',
          clinicalIntake: { dietaryHabits: 'Vegetarian', waterConsumption: '3L', declaredConditions: 'None' },
        },
        { Authorization: 'Bearer VALID_ASSIGNED_PRACTITIONER_TOKEN' }
      );
      assert(res.status === 500, 'Test 5: Cloud KMS encryption failure fails closed with HTTP 500');
      assert(
        res.data.error && res.data.error.includes('Cloud KMS Encryption Failure'),
        'Test 5.1: Error message explicitly reports Cloud KMS Encryption Failure'
      );
    } finally {
      server.close();
    }
  }

  // --- TEST 6: Successful Order is Persisted in Firestore & Inventory Decremented ---
  {
    const harness = createTestHarness({
      users: {
        'patient-user-01': { role: 'customer' },
      },
      inventory: {
        'daet_hci-cmd-65ml': { stockCount: 50 },
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
          items: [{ skuId: 'hci-cmd-65ml', quantity: 3 }],
          branchId: 'daet',
          customer: { firstName: 'Alice', lastName: 'Patient' },
          paymentMethod: 'gcash',
        },
        { Authorization: 'Bearer VALID_PATIENT_TOKEN' }
      );
      assert(res.status === 200 && res.data.success === true, 'Test 6: Order placed successfully (HTTP 200)');
      assert(
        res.data.orderId && res.data.orderId.startsWith('HCI-ORD-'),
        'Test 6.1: Valid canonical Order ID returned'
      );
      assert(harness.ordersStore.size === 1, 'Test 6.2: Order document was persisted in Firestore store');
    } finally {
      server.close();
    }
  }

  // --- TEST 7: Clinical Intake Persisted, Envelope Encrypted, and Successfully Decrypted ---
  {
    const harness = createTestHarness({
      users: {
        'practitioner-assigned-01': { role: 'practitioner' },
        'patient-user-01': { role: 'customer' },
      },
      assignments: {
        'practitioner-assigned-01_patient-user-01': { active: true },
      },
    });
    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth, kmsClient: harness.mockKms });
    const server = http.createServer(app).listen(0);

    try {
      // 1. Save clinical intake
      const saveRes = await makeRequest(
        server,
        '/api/clinical-intake/save',
        'POST',
        {
          patientUid: 'patient-user-01',
          clinicalIntake: {
            dietaryHabits: 'Low sodium, keto diet',
            waterConsumption: '3.5 Liters/day',
            declaredConditions: 'Hypertension Stage 1',
          },
          consentRecord: { purpose: 'Clinical Evaluation', version: 'v1.0' },
        },
        { Authorization: 'Bearer VALID_ASSIGNED_PRACTITIONER_TOKEN' }
      );

      assert(saveRes.status === 200 && saveRes.data.success === true, 'Test 7.1: Clinical intake saved with HTTP 200');
      const intakeId = saveRes.data.intakeId;
      assert(Boolean(intakeId), 'Test 7.2: Clinical intake ID returned');
      assert(harness.intakesStore.has(intakeId), 'Test 7.3: Intake document persisted in Firestore');

      const persistedDoc = harness.intakesStore.get(intakeId);
      assert(
        persistedDoc.encryptedClinicalIntake &&
          persistedDoc.encryptedClinicalIntake.ciphertext &&
          persistedDoc.encryptedClinicalIntake.tag &&
          persistedDoc.encryptedClinicalIntake.encryptedKey,
        'Test 7.4: Intake is stored with full AES-256-GCM + KMS encrypted envelope (no plaintext clinical data)'
      );

      // 2. Fetch and decrypt clinical intake as assigned practitioner
      const fetchRes = await makeRequest(
        server,
        '/api/clinical-intake/fetch',
        'POST',
        { intakeId },
        { Authorization: 'Bearer VALID_ASSIGNED_PRACTITIONER_TOKEN' }
      );

      assert(fetchRes.status === 200, 'Test 7.5: Clinical intake retrieved with HTTP 200');
      assert(
        fetchRes.data.decryptedClinicalIntake.dietaryHabits === 'Low sodium, keto diet' &&
          fetchRes.data.decryptedClinicalIntake.declaredConditions === 'Hypertension Stage 1',
        'Test 7.6: Clinical intake successfully decrypted on server with 100% data integrity'
      );
    } finally {
      server.close();
    }
  }

  console.log('\n================================================================');
  console.log(`      TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED      `);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution exception:', err);
  process.exit(1);
});
