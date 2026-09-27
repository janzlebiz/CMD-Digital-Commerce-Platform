/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

process.env.NODE_ENV = 'test';

import {
  createExpressApp,
  SEED_WORKSHOPS,
  getHmacSecret,
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
  simulateConcurrencyDelayMs?: number;
} = {}) {
  const usersStore = new Map<string, any>(Object.entries(options.users || {}));
  const workshopsStore = new Map<string, any>(Object.entries(options.workshops || {}));
  const registrationsStore = new Map<string, any>(Object.entries(options.registrations || {}));
  const auditLogsStore = new Map<string, any>();
  const docVersions = new Map<string, number>();
  let occConflictCount = 0;

  const mockDb: any = {
    _getStoreForCollection: (colName: string) => {
      if (colName === 'users') return usersStore;
      if (colName === 'workshops') return workshopsStore;
      if (colName === 'workshop_registrations') return registrationsStore;
      if (colName === 'audit_logs') return auditLogsStore;
      return new Map<string, any>();
    },
    runTransaction: async (updateFunction: (transaction: any) => Promise<any>, maxAttempts = 5) => {
      let attempt = 0;
      while (attempt < maxAttempts) {
        attempt++;
        const readVersions = new Map<string, number>();
        const writtenDocs = new Map<string, any>();
        const deletedDocs = new Set<string>();

        const transaction = {
          get: async (refOrQuery: any) => {
            if (!refOrQuery) return null;

            if (options.simulateConcurrencyDelayMs && attempt === 1) {
              await new Promise((resolve) => setTimeout(resolve, options.simulateConcurrencyDelayMs));
            }

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
        let hasConflict = false;
        for (const [path, expectedVer] of readVersions.entries()) {
          const actualVer = docVersions.get(path) || 1;
          if (actualVer !== expectedVer) {
            hasConflict = true;
            break;
          }
        }

        if (hasConflict) {
          occConflictCount++;
          if (attempt >= maxAttempts) {
            throw new Error('FAILED_PRECONDITION: Transaction conflict detected after max retries.');
          }
          await new Promise((r) => setTimeout(r, 10 * attempt));
          continue;
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
      }
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
      if (token === 'STAFF_DAET_MANAGER_TOKEN') return { uid: 'staff-daet-manager-uid', email: 'daet_mgr@example.com' };
      if (token === 'STAFF_LABO_MANAGER_TOKEN') return { uid: 'staff-labo-manager-uid', email: 'labo_mgr@example.com' };
      if (token === 'STAFF_REGIONAL_DIRECTOR_TOKEN') return { uid: 'staff-regional-director-uid', email: 'rd@example.com' };
      if (token === 'STAFF_SUPER_ADMIN_TOKEN') return { uid: 'staff-super-admin-uid', email: 'super@example.com' };
      if (token === 'STAFF_MANAGER_TOKEN') return { uid: 'staff-daet-manager-uid', email: 'daet_mgr@example.com' };
      throw new Error('Invalid Mock Token');
    },
  };

  return {
    mockDb,
    mockAuth,
    usersStore,
    workshopsStore,
    registrationsStore,
    auditLogsStore,
    docVersions,
    getOccConflictCount: () => occConflictCount,
  };
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

  // --- SECTION 4: Genuine Concurrency & Waitlist Management ---
  {
    console.log('\n--- Running Section 4: Genuine Concurrency & Waitlist Management ---');
    
    // Create workshop with capacity of 1 and configure concurrency delay to exercise OCC
    const harness = createTestHarness({
      simulateConcurrencyDelayMs: 25,
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

      // Execute genuine concurrent registration requests using Promise.all
      const [resA, resB] = await Promise.all([
        makeRequest(
          server,
          '/api/workshops/register',
          'POST',
          payloadAlice,
          { Authorization: 'Bearer PATIENT_ALICE_TOKEN' }
        ),
        makeRequest(
          server,
          '/api/workshops/register',
          'POST',
          payloadBob,
          { Authorization: 'Bearer PATIENT_BOB_TOKEN' }
        ),
      ]);

      assert(resA.status === 201 && resB.status === 201, '4.1 Both concurrent registration requests complete with HTTP 201');

      const statuses = [resA.data.registration.status, resB.data.registration.status];
      const confirmedCount = statuses.filter(s => s === 'confirmed').length;
      const waitlistedCount = statuses.filter(s => s === 'waitlisted').length;

      assert(confirmedCount === 1, '4.2 Exactly 1 confirmed registration allocated between concurrent requests');
      assert(waitlistedCount === 1, '4.3 Exactly 1 waitlisted registration allocated once capacity is reached');

      const updatedWorkshop = harness.workshopsStore.get('wk-01-daet');
      assert(updatedWorkshop.seatsAllocated === 1, '4.4 Workshop seatsAllocated never exceeds capacity (1)');
      assert(updatedWorkshop.waitlistCount === 1, '4.5 Workshop waitlistCount is accurately incremented to 1');
      assert(harness.getOccConflictCount() >= 1, '4.6 Transaction/OCC conflict path exercised with overlapping transactions and retry');
    } finally {
      server.close();
    }
  }

  // --- SECTION 5: Staff Mobile Attendance Check-In & Branch Isolation ---
  {
    console.log('\n--- Running Section 5: Staff Attendance Check-In & Branch Isolation ---');

    const daetRegId = 'REG-CONFIRMED-DAET-01';
    const waitlistedRegId = 'REG-WAITLISTED-02';
    const capalongaRegId = 'REG-CONFIRMED-CAP-03';

    const harness = createTestHarness({
      users: {
        'patient-alice-uid': { role: 'customer', email: 'alice@example.com' },
        'patient-bob-uid': { role: 'customer', email: 'bob@example.com' },
        'staff-daet-manager-uid': { role: 'branch_manager', email: 'daet_mgr@example.com', assignedBranchId: 'daet' },
        'staff-labo-manager-uid': { role: 'branch_manager', email: 'labo_mgr@example.com', assignedBranchId: 'labo' },
        'staff-regional-director-uid': { role: 'regional_director', email: 'rd@example.com', assignedBranchId: 'central' },
        'staff-super-admin-uid': { role: 'super_admin', email: 'super@example.com', assignedBranchId: 'central' },
      },
      workshops: {
        'wk-01-daet': {
          id: 'wk-01-daet',
          title: 'Daet Trace Mineral Science',
          branchId: 'daet',
          capacity: 10,
          seatsAllocated: 2,
          waitlistCount: 1,
        },
        'wk-03-capalonga': {
          id: 'wk-03-capalonga',
          title: 'Capalonga Coastal Symposium',
          branchId: 'capalonga',
          capacity: 30,
          seatsAllocated: 1,
          waitlistCount: 0,
        },
      },
      registrations: {
        [daetRegId]: {
          id: daetRegId,
          userId: 'patient-alice-uid',
          workshopId: 'wk-01-daet',
          customerName: 'Alice Dela Cruz',
          customerEmail: 'alice@example.com',
          status: 'confirmed',
          signature: generateRegistrationSignature(daetRegId, 'patient-alice-uid', 'wk-01-daet', 'confirmed'),
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
        [capalongaRegId]: {
          id: capalongaRegId,
          userId: 'patient-alice-uid',
          workshopId: 'wk-03-capalonga',
          customerName: 'Alice Dela Cruz',
          customerEmail: 'alice@example.com',
          status: 'confirmed',
          signature: generateRegistrationSignature(capalongaRegId, 'patient-alice-uid', 'wk-03-capalonga', 'confirmed'),
        },
      },
    });

    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth });
    const server = http.createServer(app).listen(0);

    try {
      const signatureDaet = harness.registrationsStore.get(daetRegId).signature;

      // 5.1 Ordinary customer blocked from check-in action
      const customerScanRes = await makeRequest(
        server,
        '/api/workshops/check-in',
        'POST',
        { registrationId: daetRegId, signature: signatureDaet },
        { Authorization: 'Bearer PATIENT_ALICE_TOKEN' }
      );
      assert(customerScanRes.status === 403, '5.1 Ordinary customer blocked from administrative check-in (HTTP 403)');

      // 5.2 Branch Isolation: Labo branch manager attempting to check in Daet workshop attendee is BLOCKED with HTTP 403
      const crossBranchRes = await makeRequest(
        server,
        '/api/workshops/check-in',
        'POST',
        { registrationId: daetRegId, signature: signatureDaet },
        { Authorization: 'Bearer STAFF_LABO_MANAGER_TOKEN' }
      );
      assert(crossBranchRes.status === 403, '5.2 Cross-branch check-in by branch manager blocked with HTTP 403');
      assert(crossBranchRes.data.error.includes('not authorized to check in participants for workshop'), '5.3 Rejection error specifies branch manager unauthorized for cross-branch check-in');

      // 5.3 Authorized same-branch check-in: Daet branch manager checks in Daet workshop attendee
      const sameBranchRes = await makeRequest(
        server,
        '/api/workshops/check-in',
        'POST',
        { registrationId: daetRegId, signature: signatureDaet },
        { Authorization: 'Bearer STAFF_DAET_MANAGER_TOKEN' }
      );
      assert(sameBranchRes.status === 200, '5.4 Same-branch manager check-in succeeds with HTTP 200');
      assert(sameBranchRes.data.registration.status === 'attended', '5.5 Participant registration status updated to ATTENDED');

      const updatedSig = sameBranchRes.data.registration.signature;
      const reCalculatedSig = generateRegistrationSignature(daetRegId, 'patient-alice-uid', 'wk-01-daet', 'attended');
      assert(updatedSig === reCalculatedSig, '5.6 Attendee pass signature dynamically recalculated for ATTENDED state');

      // 5.4 Cross-branch capability: Regional Director can check in attendees across branches (Capalonga)
      const capalongaSig = harness.registrationsStore.get(capalongaRegId).signature;
      const rdCheckInRes = await makeRequest(
        server,
        '/api/workshops/check-in',
        'POST',
        { registrationId: capalongaRegId, signature: capalongaSig },
        { Authorization: 'Bearer STAFF_REGIONAL_DIRECTOR_TOKEN' }
      );
      assert(rdCheckInRes.status === 200, '5.7 Regional Director cross-branch check-in succeeds with HTTP 200');
      assert(rdCheckInRes.data.registration.status === 'attended', '5.8 Capalonga participant verified by Regional Director');

      // 5.5 Forged or tampered signatures are blocked
      const forgedScanRes = await makeRequest(
        server,
        '/api/workshops/check-in',
        'POST',
        { registrationId: daetRegId, signature: 'FORGED_HMAC_SIGNATURE_HEX_STRING_FORGED_HMAC_SIGNATURE_HEX_STR' },
        { Authorization: 'Bearer STAFF_DAET_MANAGER_TOKEN' }
      );
      assert(forgedScanRes.status === 400, '5.9 Forged or tampered attendance pass signatures are rejected with HTTP 400');
      assert(forgedScanRes.data.error.includes('Signature Verification Failed'), '5.10 Rejected check-in specifies cryptographic verification failure');

      // 5.6 Waitlisted participant check-in is refused
      const signatureB = harness.registrationsStore.get(waitlistedRegId).signature;
      const waitlistScanRes = await makeRequest(
        server,
        '/api/workshops/check-in',
        'POST',
        { registrationId: waitlistedRegId, signature: signatureB },
        { Authorization: 'Bearer STAFF_DAET_MANAGER_TOKEN' }
      );
      assert(waitlistScanRes.status === 400, '5.11 Waitlisted participant check-in is refused with HTTP 400');
      assert(waitlistScanRes.data.error.includes('Waitlisted participants are not confirmed'), '5.12 Waitlisted check-in refusal returns clear warning text');
    } finally {
      server.close();
    }
  }

  // --- SECTION 6: HMAC Secret Hardening & Fail-Closed Behavior ---
  {
    console.log('\n--- Running Section 6: HMAC Secret Hardening & Fail-Closed Behavior ---');

    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.HMAC_SECRET;

    try {
      // 6.1 Test environment returns test secret without failure
      process.env.NODE_ENV = 'test';
      delete process.env.HMAC_SECRET;
      const testSecret = getHmacSecret();
      assert(testSecret.includes('TEST_ENVIRONMENT'), '6.1 Test environment provides isolated test-only HMAC secret');

      // 6.2 Production environment FAILS CLOSED when HMAC_SECRET is missing
      process.env.NODE_ENV = 'production';
      delete process.env.HMAC_SECRET;
      let threwInProd = false;
      let errorMsg = '';
      try {
        getHmacSecret();
      } catch (err: any) {
        threwInProd = true;
        errorMsg = err.message;
      }
      assert(threwInProd === true, '6.2 Production fails closed when HMAC_SECRET is missing');
      assert(errorMsg.includes('FATAL SECURITY ERROR'), '6.3 Fatal security error thrown in production when HMAC_SECRET is absent');

      // 6.3 Production environment succeeds when configured with non-empty HMAC_SECRET
      process.env.NODE_ENV = 'production';
      process.env.HMAC_SECRET = 'PROD_SECURE_HMAC_KEY_EXPLICITLY_PROVIDED_2026';
      const prodSecret = getHmacSecret();
      assert(prodSecret === 'PROD_SECURE_HMAC_KEY_EXPLICITLY_PROVIDED_2026', '6.4 Production uses configured HMAC_SECRET accurately');

      const prodSignature = generateRegistrationSignature('REG-PROD-01', 'user-123', 'wk-01', 'confirmed');
      assert(typeof prodSignature === 'string' && prodSignature.length === 64, '6.5 Production generates valid SHA256 signature when secret is configured');
    } finally {
      // Restore original environment
      process.env.NODE_ENV = originalEnv;
      if (originalSecret !== undefined) {
        process.env.HMAC_SECRET = originalSecret;
      } else {
        delete process.env.HMAC_SECRET;
      }
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
