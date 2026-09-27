/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

process.env.NODE_ENV = 'test';

import {
  createExpressApp,
  SEED_WORKSHOPS,
  generateRegistrationSignature,
  verifyRegistrationSignature,
} from '../server';
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

    const reqHeaders: Record<string, string> = { ...headers };
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

    req.on('error', (err) => reject(err));
    if (body !== undefined) {
      req.write(postData);
    }
    req.end();
  });
}

// In-Memory Mock Store & OCC Transaction Simulation for workshops
function createTestHarness(options: {
  users?: Record<string, any>;
  workshops?: Record<string, any>;
  registrations?: Record<string, any>;
} = {}) {
  const usersStore = new Map<string, any>(Object.entries(options.users || {}));
  const workshopsStore = new Map<string, any>(Object.entries(options.workshops || {}));
  const registrationsStore = new Map<string, any>(Object.entries(options.registrations || {}));
  const auditLogsStore = new Map<string, any>();
  const docVersions = new Map<string, number>();

  const mockDb: any = {
    _getStoreForCollection: (colName: string) => {
      if (colName === 'users') return usersStore;
      if (colName === 'workshops') return workshopsStore;
      if (colName === 'workshop_registrations') return registrationsStore;
      if (colName === 'audit_logs') return auditLogsStore;
      return new Map<string, any>();
    },
    runTransaction: async (updateFunction: (transaction: any) => Promise<any>) => {
      const readVersions = new Map<string, number>();
      const writtenDocs = new Map<string, any>();
      const deletedDocs = new Set<string>();

      const transaction = {
        get: async (refOrQuery: any) => {
          if (!refOrQuery) return null;

          if (typeof refOrQuery.get === 'function' && refOrQuery._docId) {
            const path = `${refOrQuery._colName}/${refOrQuery._docId}`;
            const currentVer = docVersions.get(path) || 1;
            readVersions.set(path, currentVer);
            return await refOrQuery.get();
          }

          if (typeof refOrQuery.get === 'function') {
            const colName = refOrQuery._colName;
            const store = mockDb._getStoreForCollection(colName);
            for (const docId of store.keys()) {
              const path = `${colName}/${docId}`;
              const currentVer = docVersions.get(path) || 1;
              readVersions.set(path, currentVer);
            }
            return await refOrQuery.get();
          }
          return null;
        },
        set: (docRef: any, data: any) => {
          writtenDocs.set(`${docRef._colName}/${docRef._docId}`, data);
        },
        update: (docRef: any, data: any) => {
          const path = `${docRef._colName}/${docRef._docId}`;
          const existing = docRef._getStore().get(docRef._docId) || {};
          writtenDocs.set(path, { ...existing, ...data });
        },
        delete: (docRef: any) => {
          deletedDocs.add(`${docRef._colName}/${docRef._docId}`);
        }
      };

      // Execute updateFunction inside simulated OCC transaction
      const result = await updateFunction(transaction);

      // Verify versions to check for concurrent write conflicts
      for (const [path, expectedVer] of readVersions.entries()) {
        const actualVer = docVersions.get(path) || 1;
        if (actualVer !== expectedVer) {
          throw new Error('FAILED_PRECONDITION: Transaction conflict detected.');
        }
      }

      // Apply changes atomically
      for (const [path, data] of writtenDocs.entries()) {
        const [colName, docId] = path.split('/');
        mockDb.collection(colName).doc(docId).set(data);
        docVersions.set(path, (docVersions.get(path) || 1) + 1);
      }
      for (const path of deletedDocs) {
        const [colName, docId] = path.split('/');
        const store = mockDb._getStoreForCollection(colName);
        store.delete(docId);
        docVersions.set(path, (docVersions.get(path) || 1) + 1);
      }

      return result;
    },
    collection: (colName: string) => {
      const store = mockDb._getStoreForCollection(colName);

      return {
        _colName: colName,
        _getStore: () => store,
        doc: (docId: string) => ({
          _colName: colName,
          _docId: docId,
          _getStore: () => store,
          get: async () => {
            const data = store.get(docId);
            return {
              exists: store.has(docId),
              id: docId,
              data: () => (data ? JSON.parse(JSON.stringify(data)) : null),
            };
          },
          set: async (data: any) => {
            store.set(docId, JSON.parse(JSON.stringify(data)));
          },
          update: async (updates: any) => {
            const existing = store.get(docId) || {};
            store.set(docId, { ...existing, ...updates });
          },
          delete: async () => {
            store.delete(docId);
          }
        }),
        where: (field: string, op: string, value: any) => {
          let filters: Array<{ field: string; op: string; val: any }> = [{ field, op, val: value }];

          const queryObj = {
            _colName: colName,
            _getStore: () => store,
            where: (f2: string, op2: string, val2: any) => {
              filters.push({ field: f2, op: op2, val: val2 });
              return queryObj;
            },
            get: async () => {
              const matches = Array.from(store.entries()).map((entry: any) => {
                const [id, record] = entry;
                return {
                  id,
                  data: () => JSON.parse(JSON.stringify(record)),
                };
              });

              const filtered = matches.filter((doc) => {
                const data = doc.data();
                return filters.every((filter) => {
                  if (filter.op === '==') {
                    return data[filter.field] === filter.val;
                  }
                  return true;
                });
              });

              return {
                empty: filtered.length === 0,
                forEach: (cb: (doc: any) => void) => filtered.forEach(cb),
              };
            },
          };
          return queryObj;
        },
        get: async () => {
          const documents = Array.from(store.entries()).map((entry: any) => {
            const [id, record] = entry;
            return {
              id,
              data: () => JSON.parse(JSON.stringify(record)),
            };
          });
          return {
            empty: documents.length === 0,
            forEach: (cb: (doc: any) => void) => documents.forEach(cb),
          };
        },
      };
    },
  };

  const mockAuth: any = {
    verifyIdToken: async (token: string) => {
      if (token === 'PATIENT_ALICE_TOKEN') return { uid: 'patient-alice-uid', email: 'alice@example.com' };
      if (token === 'PATIENT_BOB_TOKEN') return { uid: 'patient-bob-uid', email: 'bob@example.com' };
      if (token === 'STAFF_MANAGER_TOKEN') return { uid: 'staff-manager-uid', email: 'manager@example.com' };
      throw new Error('Invalid Mock Token');
    },
  };

  return { mockDb, mockAuth, usersStore, workshopsStore, registrationsStore, auditLogsStore, docVersions };
}

async function runPhase6BTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`\x1b[32m[PASS]\x1b[0m ${message}`);
      passed++;
    } else {
      console.error(`\x1b[31m[FAIL]\x1b[0m ${message}`);
      failed++;
    }
  }

  // --- SECTION 1: Workshops Retrieval & Seeding ---
  {
    console.log('\n--- Running Section 1: Workshops Retrieval & Seeding ---');
    const harness = createTestHarness({
      users: {
        'patient-alice-uid': { role: 'customer', email: 'alice@example.com' },
      },
    });

    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth });
    const server = http.createServer(app).listen(0);

    try {
      // 1.1 Unauthenticated requests are rejected
      const unauthRes = await makeRequest(server, '/api/workshops', 'GET');
      assert(unauthRes.status === 401, '1.1 Unauthenticated workshops query rejected with HTTP 401');

      // 1.2 Workshops query triggers auto-seeding
      const queryRes = await makeRequest(
        server,
        '/api/workshops',
        'GET',
        undefined,
        { Authorization: 'Bearer PATIENT_ALICE_TOKEN' }
      );
      assert(queryRes.status === 200, '1.2 Authenticated workshops query succeeds with HTTP 200');
      assert(Array.isArray(queryRes.data.workshops), '1.3 Response contains workshops array');
      assert(queryRes.data.workshops.length === SEED_WORKSHOPS.length, '1.4 Workshops collections successfully auto-seeded on first query');
      
      const seededDaet = queryRes.data.workshops.find((w: any) => w.id === 'wk-01-daet');
      assert(seededDaet && seededDaet.capacity === 3, '1.5 Seeded workshop properties (id, capacity) persist accurately');
    } finally {
      server.close();
    }
  }

  // --- SECTION 2: Dynamic HMAC Pass & Signature Verification ---
  {
    console.log('\n--- Running Section 2: Dynamic HMAC Pass & Signature Verification ---');
    const regId = 'REG-PASS-7890';
    const userId = 'patient-alice-uid';
    const workshopId = 'wk-01-daet';
    const status = 'confirmed';

    const signature = generateRegistrationSignature(regId, userId, workshopId, status);
    assert(typeof signature === 'string' && signature.length === 64, '2.1 generateRegistrationSignature returns a valid 64-character SHA256 hex string');

    const isValid = verifyRegistrationSignature(regId, userId, workshopId, status, signature);
    assert(isValid === true, '2.2 verifyRegistrationSignature validates authentic registration signatures successfully');

    const tamperedStatusValid = verifyRegistrationSignature(regId, userId, workshopId, 'waitlisted', signature);
    assert(tamperedStatusValid === false, '2.3 verifyRegistrationSignature correctly rejects forged/altered registration states');
  }

  // --- SECTION 3: Transaction-Safe Seat Allocation & Duplicate Checks ---
  {
    console.log('\n--- Running Section 3: Seat Allocation & Duplicate Prevention ---');
    const harness = createTestHarness({
      users: {
        'patient-alice-uid': { role: 'customer', email: 'alice@example.com' },
      },
      workshops: {
        'wk-01-daet': {
          id: 'wk-01-daet',
          title: 'Daet Trace Mineral Science',
          capacity: 3,
          seatsAllocated: 0,
          waitlistCount: 0,
          branchId: 'daet',
        },
      },
    });

    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth });
    const server = http.createServer(app).listen(0);

    try {
      const regPayload = {
        workshopId: 'wk-01-daet',
        customerName: 'Alice Dela Cruz',
        customerEmail: 'alice@example.com',
        customerPhone: '+639171112233',
      };

      // 3.1 Initial registration succeeds
      const initialRes = await makeRequest(
        server,
        '/api/workshops/register',
        'POST',
        regPayload,
        { Authorization: 'Bearer PATIENT_ALICE_TOKEN' }
      );
      assert(initialRes.status === 201, '3.1 Initial workshop registration succeeds with HTTP 201');
      assert(initialRes.data.registration.status === 'confirmed', '3.2 Seat successfully allocated as CONFIRMED');
      assert(initialRes.data.workshop.seatsAllocated === 1, '3.3 Workshop seatsAllocated incremented to 1');

      // 3.2 Duplicate registration is blocked
      const duplicateRes = await makeRequest(
        server,
        '/api/workshops/register',
        'POST',
        regPayload,
        { Authorization: 'Bearer PATIENT_ALICE_TOKEN' }
      );
      assert(duplicateRes.status === 400, '3.4 Duplicate registrations are blocked with HTTP 400');
      assert(duplicateRes.data.error.includes('already registered'), '3.5 Rejection returns clear, verbose duplicate warning');
    } finally {
      server.close();
    }
  }

  // --- SECTION 4: Concurrency and Waitlist Management ---
  {
    console.log('\n--- Running Section 4: Concurrency & Waitlist Management ---');
    
    // Create workshop with low capacity of 1
    const harness = createTestHarness({
      users: {
        'patient-alice-uid': { role: 'customer', email: 'alice@example.com' },
        'patient-bob-uid': { role: 'customer', email: 'bob@example.com' },
      },
      workshops: {
        'wk-01-daet': {
          id: 'wk-01-daet',
          title: 'Daet Trace Mineral Science',
          capacity: 1,
          seatsAllocated: 0,
          waitlistCount: 0,
          branchId: 'daet',
        },
      },
    });

    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth });
    const server = http.createServer(app).listen(0);

    try {
      const payloadAlice = {
        workshopId: 'wk-01-daet',
        customerName: 'Alice Dela Cruz',
        customerEmail: 'alice@example.com',
        customerPhone: '+639171112233',
      };

      const payloadBob = {
        workshopId: 'wk-01-daet',
        customerName: 'Bob Dela Cruz',
        customerEmail: 'bob@example.com',
        customerPhone: '+639171112244',
      };

      // Alice registers first
      const resA = await makeRequest(
        server,
        '/api/workshops/register',
        'POST',
        payloadAlice,
        { Authorization: 'Bearer PATIENT_ALICE_TOKEN' }
      );

      // Bob registers second (triggers waitlist transition)
      const resB = await makeRequest(
        server,
        '/api/workshops/register',
        'POST',
        payloadBob,
        { Authorization: 'Bearer PATIENT_BOB_TOKEN' }
      );

      assert(resA.status === 201 && resA.data.registration.status === 'confirmed', '4.1 First registration is allocated a confirmed seat');
      assert(resB.status === 201 && resB.data.registration.status === 'waitlisted', '4.2 Second registration on filled capacity is automatically waitlisted');
      assert(resB.data.workshop.seatsAllocated === 1, '4.3 Workshop allocated seats cap at the maximum capacity (1)');
      assert(resB.data.workshop.waitlistCount === 1, '4.4 Workshop waitlist counter correctly registers 1 waitlisted participant');
    } finally {
      server.close();
    }
  }

  // --- SECTION 5: Staff Mobile Attendance Check-In Verification ---
  {
    console.log('\n--- Running Section 5: Staff Attendance Check-In API ---');

    const confirmedRegId = 'REG-CONFIRMED-01';
    const waitlistedRegId = 'REG-WAITLISTED-02';

    const harness = createTestHarness({
      users: {
        'patient-alice-uid': { role: 'customer', email: 'alice@example.com' },
        'staff-manager-uid': { role: 'branch_manager', email: 'manager@example.com', assignedBranchId: 'daet' },
      },
      registrations: {
        [confirmedRegId]: {
          id: confirmedRegId,
          userId: 'patient-alice-uid',
          workshopId: 'wk-01-daet',
          customerName: 'Alice Dela Cruz',
          customerEmail: 'alice@example.com',
          status: 'confirmed',
          signature: generateRegistrationSignature(confirmedRegId, 'patient-alice-uid', 'wk-01-daet', 'confirmed'),
        },
        [waitlistedRegId]: {
          id: waitlistedRegId,
          userId: 'patient-bob-uid',
          workshopId: 'wk-01-daet',
          customerName: 'Bob Dela Cruz',
          customerEmail: 'bob@example.com',
          status: 'waitlisted',
          signature: generateRegistrationSignature(waitlistedRegId, 'patient-bob-uid', 'wk-01-daet', 'waitlisted'),
        },
      },
    });

    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth });
    const server = http.createServer(app).listen(0);

    try {
      const signatureA = harness.registrationsStore.get(confirmedRegId).signature;

      // 5.1 Ordinary customer blocked from check-in action
      const customerScanRes = await makeRequest(
        server,
        '/api/workshops/check-in',
        'POST',
        { registrationId: confirmedRegId, signature: signatureA },
        { Authorization: 'Bearer PATIENT_ALICE_TOKEN' }
      );
      assert(customerScanRes.status === 403, '5.1 Ordinary customer blocked from administrative check-in (HTTP 403)');

      // 5.2 Forged signatures are blocked
      const forgedScanRes = await makeRequest(
        server,
        '/api/workshops/check-in',
        'POST',
        { registrationId: confirmedRegId, signature: 'FORGED_HMAC_SIGNATURE_HEX_STRING_FORGED_HMAC_SIGNATURE_HEX_STR' },
        { Authorization: 'Bearer STAFF_MANAGER_TOKEN' }
      );
      assert(forgedScanRes.status === 400, '5.2 Forged or tampered attendance pass signatures are rejected with HTTP 400');
      assert(forgedScanRes.data.error.includes('Signature Verification Failed'), '5.3 Rejected check-in specifies cryptographic verification failure');

      // 5.3 Valid signatures successfully complete check-in
      const staffScanRes = await makeRequest(
        server,
        '/api/workshops/check-in',
        'POST',
        { registrationId: confirmedRegId, signature: signatureA },
        { Authorization: 'Bearer STAFF_MANAGER_TOKEN' }
      );
      assert(staffScanRes.status === 200, '5.4 Staff check-in on confirmed registration succeeds with HTTP 200');
      assert(staffScanRes.data.registration.status === 'attended', '5.5 Participant registration status correctly updated to ATTENDED');

      const updatedSig = staffScanRes.data.registration.signature;
      const reCalculatedSig = generateRegistrationSignature(confirmedRegId, 'patient-alice-uid', 'wk-01-daet', 'attended');
      assert(updatedSig === reCalculatedSig, '5.6 Attendee pass signature is dynamically recalculated to reflect the ATTENDED state');

      // 5.4 Waitlisted participant check-in is refused
      const signatureB = harness.registrationsStore.get(waitlistedRegId).signature;
      const waitlistScanRes = await makeRequest(
        server,
        '/api/workshops/check-in',
        'POST',
        { registrationId: waitlistedRegId, signature: signatureB },
        { Authorization: 'Bearer STAFF_MANAGER_TOKEN' }
      );
      assert(waitlistScanRes.status === 400, '5.7 Waitlisted participant check-in is refused with HTTP 400');
      assert(waitlistScanRes.data.error.includes('Waitlisted participants are not confirmed'), '5.8 Waitlisted check-in refusal returns clear warning text');
    } finally {
      server.close();
    }
  }

  console.log('\n================================================================');
  console.log(`   PHASE 6B SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED   `);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Execute workshops test runner
runPhase6BTests().catch((err) => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
