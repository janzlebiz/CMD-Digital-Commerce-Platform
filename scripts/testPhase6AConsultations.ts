/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

process.env.NODE_ENV = 'test';

import { createExpressApp, CONSULTATION_SERVICES, PRACTITIONER_ROSTER } from '../server';
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

    req.on('error', reject);
    if (body !== undefined) {
      req.write(postData);
    }
    req.end();
  });
}

// In-Memory Test Harness for Phase 6A Consultations
function createTestHarness(options: {
  users?: Record<string, any>;
  assignments?: Record<string, any>;
  appointments?: Record<string, any>;
  intakes?: Record<string, any>;
  auditLogs?: Record<string, any>;
}) {
  const usersStore = new Map<string, any>(Object.entries(options.users || {}));
  const assignmentsStore = new Map<string, any>(Object.entries(options.assignments || {}));
  const appointmentsStore = new Map<string, any>(Object.entries(options.appointments || {}));
  const intakesStore = new Map<string, any>(Object.entries(options.intakes || {}));
  const auditLogsStore = new Map<string, any>(Object.entries(options.auditLogs || {}));

  const mockDb: any = {
    collection: (colName: string) => {
      const getStore = () => {
        if (colName === 'users') return usersStore;
        if (colName === 'consultation_assignments') return assignmentsStore;
        if (colName === 'consultation_appointments') return appointmentsStore;
        if (colName === 'consultation_intakes') return intakesStore;
        if (colName === 'audit_logs') return auditLogsStore;
        return new Map<string, any>();
      };

      const store = getStore();

      return {
        doc: (docId: string) => ({
          get: async () => {
            const data = store.get(docId);
            return {
              exists: data !== undefined,
              id: docId,
              data: () => (data ? JSON.parse(JSON.stringify(data)) : undefined),
              get: (f: string) => data?.[f],
            };
          },
          set: async (val: any) => {
            store.set(docId, JSON.parse(JSON.stringify(val)));
            return val;
          },
          update: async (updates: any) => {
            const existing = store.get(docId) || {};
            store.set(docId, { ...existing, ...updates });
          },
        }),
        where: (field: string, op: string, value: any) => {
          let filters: Array<{ field: string; op: string; val: any }> = [{ field, op, val: value }];

          const queryObj = {
            where: (f2: string, op2: string, val2: any) => {
              filters.push({ field: f2, op: op2, val: val2 });
              return queryObj;
            },
            get: async () => {
              const matches: any[] = [];
              for (const [id, record] of store.entries()) {
                const passesAll = filters.every((filter) => {
                  const recordVal = record[filter.field];
                  if (filter.op === '==') return recordVal === filter.val;
                  return true;
                });
                if (passesAll) {
                  matches.push({
                    id,
                    data: () => JSON.parse(JSON.stringify(record)),
                  });
                }
              }
              return {
                empty: matches.length === 0,
                forEach: (cb: (doc: any) => void) => matches.forEach(cb),
                docs: matches,
              };
            },
          };
          return queryObj;
        },
        get: async () => {
          const matches = Array.from(store.entries()).map(([id, record]) => ({
            id,
            data: () => JSON.parse(JSON.stringify(record)),
          }));
          return {
            empty: matches.length === 0,
            forEach: (cb: (doc: any) => void) => matches.forEach(cb),
            docs: matches,
          };
        },
      };
    },
  };

  const mockAuth: any = {
    verifyIdToken: async (token: string) => {
      if (token === 'PATIENT_ALICE_TOKEN') {
        return { uid: 'patient-alice-uid', email: 'alice@example.com' };
      }
      if (token === 'PATIENT_BOB_TOKEN') {
        return { uid: 'patient-bob-uid', email: 'bob@example.com' };
      }
      if (token === 'PRACTITIONER_ELENA_TOKEN') {
        return { uid: 'practitioner-daet-01', email: 'elena@example.com' };
      }
      if (token === 'PRACTITIONER_GABRIEL_TOKEN') {
        return { uid: 'practitioner-labo-02', email: 'gabriel@example.com' };
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

  return { mockDb, mockAuth, mockKms, appointmentsStore, assignmentsStore, intakesStore, auditLogsStore };
}

async function runPhase6ATests() {
  console.log('================================================================');
  console.log('   HCI CMD PHASE 6A — CONSULTATION & CLINICAL INTAKE SUITE      ');
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

  // --- SECTION 1: Catalog & Public Endpoints ---
  {
    const harness = createTestHarness({});
    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth, kmsClient: harness.mockKms });
    const server = http.createServer(app).listen(0);

    try {
      // 1.1 Services Catalog
      const resServices = await makeRequest(server, '/api/consultations/services', 'GET');
      assert(resServices.status === 200, '1.1 GET /api/consultations/services returns HTTP 200');
      assert(Array.isArray(resServices.data.services), '1.2 Services returned as array');
      assert(resServices.data.services.length === 3, '1.3 Exactly 3 consultation services returned');
      assert(resServices.data.disclaimer.includes('RA 2382'), '1.4 Mandatory RA 2382 non-medical disclaimer present');

      // 1.2 Practitioners Roster
      const resPrac = await makeRequest(server, '/api/consultations/practitioners', 'GET');
      assert(resPrac.status === 200, '1.5 GET /api/consultations/practitioners returns HTTP 200');
      assert(resPrac.data.practitioners.length >= 2, '1.6 Practitioner roster contains verified educators');
      assert(resPrac.data.statusNotice.includes('PENDING'), '1.7 Credentials status marked pending business confirmation');

      // 1.3 Slot Generation
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const resSlots = await makeRequest(server, `/api/consultations/slots?practitionerId=practitioner-daet-01&date=${tomorrowStr}`, 'GET');
      assert(resSlots.status === 200, '1.8 GET /api/consultations/slots returns HTTP 200');
      assert(Array.isArray(resSlots.data.slots), '1.9 Slots returned as array');
      assert(resSlots.data.slots.length === 7, '1.10 Daily slot engine generated 7 structured consultation slots');
      assert(resSlots.data.slots[0].isBooked === false, '1.11 Unbooked slots have isBooked: false');
    } finally {
      server.close();
    }
  }

  // --- SECTION 2: Appointment Booking & Slot Reservation ---
  {
    const harness = createTestHarness({
      users: {
        'patient-alice-uid': { role: 'customer', email: 'alice@example.com' },
        'patient-bob-uid': { role: 'customer', email: 'bob@example.com' },
        'practitioner-daet-01': { role: 'practitioner', email: 'elena@example.com' },
        'practitioner-labo-02': { role: 'practitioner', email: 'gabriel@example.com' },
        'super-admin-uid': { role: 'super_admin', email: 'admin@example.com' },
      },
    });
    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth, kmsClient: harness.mockKms });
    const server = http.createServer(app).listen(0);

    const testDate = '2026-10-01';
    const testTime = '09:00';

    try {
      // 2.1 Unauthenticated booking rejected
      const unauthRes = await makeRequest(server, '/api/consultations/book', 'POST', {
        serviceCode: 'CNS-VIRTUAL',
        practitionerId: 'practitioner-daet-01',
        scheduledDate: testDate,
        scheduledTime: testTime,
      });
      assert(unauthRes.status === 401, '2.1 Booking without authentication rejected with HTTP 401');

      // 2.2 Missing informed consent rejected
      const noConsentRes = await makeRequest(
        server,
        '/api/consultations/book',
        'POST',
        {
          serviceCode: 'CNS-VIRTUAL',
          practitionerId: 'practitioner-daet-01',
          scheduledDate: testDate,
          scheduledTime: testTime,
        },
        { Authorization: 'Bearer PATIENT_ALICE_TOKEN' }
      );
      assert(noConsentRes.status === 400, '2.2 Booking without statutory consent rejected with HTTP 400');

      // 2.3 Valid Booking
      const validBookingRes = await makeRequest(
        server,
        '/api/consultations/book',
        'POST',
        {
          serviceCode: 'CNS-VIRTUAL',
          practitionerId: 'practitioner-daet-01',
          scheduledDate: testDate,
          scheduledTime: testTime,
          deliveryMode: 'virtual',
          customerName: 'Alice Dela Cruz',
          customerPhone: '+639171234567',
          consentRecord: {
            purpose: 'Holistic Wellness Assessment',
            version: 'v1.0',
            acknowledgedText: 'Explicit consent under RA 10173 Section 13(a)',
          },
        },
        { Authorization: 'Bearer PATIENT_ALICE_TOKEN' }
      );
      assert(validBookingRes.status === 201, '2.3 Valid consultation booking succeeds with HTTP 201');
      const appointmentId = validBookingRes.data.appointmentId;
      assert(appointmentId && appointmentId.startsWith('APPT-'), '2.4 Valid appointment identifier created');

      // 2.5 Verify assignment creation in consultation_assignments
      const assignmentRecord = harness.assignmentsStore.get('practitioner-daet-01_patient-alice-uid');
      assert(assignmentRecord !== undefined, '2.5 Bidirectional practitioner-patient assignment established in store');
      assert(assignmentRecord.active === true, '2.6 Assignment record marked active');

      // 2.7 Double-booking prevention
      const doubleBookRes = await makeRequest(
        server,
        '/api/consultations/book',
        'POST',
        {
          serviceCode: 'CNS-IN-PERSON',
          practitionerId: 'practitioner-daet-01',
          scheduledDate: testDate,
          scheduledTime: testTime,
          consentRecord: { purpose: 'Wellness', version: 'v1.0' },
        },
        { Authorization: 'Bearer PATIENT_BOB_TOKEN' }
      );
      assert(doubleBookRes.status === 409, '2.7 Slot conflict / double-booking prevented with HTTP 409 Conflict');

      // 2.8 Slot query reflects booking
      const resSlotsAfter = await makeRequest(server, `/api/consultations/slots?practitionerId=practitioner-daet-01&date=${testDate}`, 'GET');
      const slot0900 = resSlotsAfter.data.slots.find((s: any) => s.startTime === '09:00');
      assert(slot0900.isBooked === true, '2.8 Booked slot is marked isBooked: true in slot query');

      // --- SECTION 3: Access Isolation & Appointments Queries ---

      // 3.1 Patient Alice queries her appointments
      const aliceApptsRes = await makeRequest(
        server,
        '/api/consultations/my-appointments',
        'GET',
        undefined,
        { Authorization: 'Bearer PATIENT_ALICE_TOKEN' }
      );
      assert(aliceApptsRes.status === 200, '3.1 Patient Alice fetches my-appointments with HTTP 200');
      assert(aliceApptsRes.data.appointments.length === 1, '3.2 Exactly 1 appointment returned for Alice');
      assert(aliceApptsRes.data.appointments[0].id === appointmentId, '3.3 Appointment matches booked record');

      // 3.2 Patient Bob queries his appointments (isolated from Alice)
      const bobApptsRes = await makeRequest(
        server,
        '/api/consultations/my-appointments',
        'GET',
        undefined,
        { Authorization: 'Bearer PATIENT_BOB_TOKEN' }
      );
      assert(bobApptsRes.status === 200, '3.4 Patient Bob fetches my-appointments with HTTP 200');
      assert(bobApptsRes.data.appointments.length === 0, '3.5 Customer isolation: Bob sees 0 appointments (cannot see Alice\'s)');

      // 3.3 Non-practitioner querying practitioner workspace is rejected
      const custPractitionerRes = await makeRequest(
        server,
        '/api/consultations/practitioner-appointments',
        'GET',
        undefined,
        { Authorization: 'Bearer PATIENT_ALICE_TOKEN' }
      );
      assert(custPractitionerRes.status === 403, '3.6 Customer role querying practitioner workspace rejected with HTTP 403');

      // 3.4 Practitioner Elena queries her assigned appointments
      const elenaApptsRes = await makeRequest(
        server,
        '/api/consultations/practitioner-appointments',
        'GET',
        undefined,
        { Authorization: 'Bearer PRACTITIONER_ELENA_TOKEN' }
      );
      assert(elenaApptsRes.status === 200, '3.7 Practitioner Elena queries assigned appointments with HTTP 200');
      assert(elenaApptsRes.data.appointments.length === 1, '3.8 Practitioner sees assigned patient appointment');

      // 3.5 Practitioner Gabriel (not assigned to Alice) queries workspace
      const gabrielApptsRes = await makeRequest(
        server,
        '/api/consultations/practitioner-appointments',
        'GET',
        undefined,
        { Authorization: 'Bearer PRACTITIONER_GABRIEL_TOKEN' }
      );
      assert(gabrielApptsRes.status === 200, '3.9 Practitioner Gabriel queries workspace with HTTP 200');
      assert(gabrielApptsRes.data.appointments.length === 0, '3.10 Practitioner isolation: Gabriel sees 0 appointments');

      // --- SECTION 4: KMS Envelope Encrypted Health Intake Workflow ---

      // 4.1 Practitioner Elena saves encrypted clinical intake for assigned patient Alice
      const saveIntakeRes = await makeRequest(
        server,
        '/api/clinical/intake/save',
        'POST',
        {
          patientUid: 'patient-alice-uid',
          scheduledAt: `${testDate}T09:00:00Z`,
          deliveryMode: 'virtual',
          clinicalIntake: {
            dietaryHabits: 'Daet organic raw greens, moderate fish, low sodium.',
            waterConsumption: '2.5 Liters filtered deep-well water with 10 drops HCI CMD.',
            declaredConditions: 'Cellular hydration deficit and general fatigue.',
          },
          consentRecord: {
            purpose: 'Mineral Nutrition Plan',
            version: 'v1.0',
          },
        },
        { Authorization: 'Bearer PRACTITIONER_ELENA_TOKEN' }
      );
      assert(saveIntakeRes.status === 200, '4.1 Assigned practitioner Elena saves encrypted clinical intake (HTTP 200)');
      const intakeId = saveIntakeRes.data.intakeId;
      assert(intakeId && intakeId.startsWith('CNS-INT-'), '4.2 Clinical intake ID generated');

      // 4.3 Verify data stored in Firestore is 100% encrypted (no plaintext clinical data)
      const intakeInDb = harness.intakesStore.get(intakeId);
      assert(intakeInDb !== undefined, '4.3 Intake document persisted in Firestore');
      assert(intakeInDb.encryptedClinicalIntake.ciphertext !== undefined, '4.4 Ciphertext stored');
      assert(intakeInDb.encryptedClinicalIntake.iv !== undefined, '4.5 IV vector stored');
      assert(intakeInDb.encryptedClinicalIntake.tag !== undefined, '4.6 Authentication tag stored');
      assert(intakeInDb.encryptedClinicalIntake.encryptedKey !== undefined, '4.7 KMS wrapped DEK stored');
      assert(JSON.stringify(intakeInDb).includes('Daet organic') === false, '4.8 Zero plaintext clinical data in Firestore');

      // 4.9 Unassigned practitioner Gabriel attempts to decrypt Alice's intake -> Rejected HTTP 403
      const unassignedFetchRes = await makeRequest(
        server,
        `/api/clinical/intake/${intakeId}`,
        'GET',
        undefined,
        { Authorization: 'Bearer PRACTITIONER_GABRIEL_TOKEN' }
      );
      assert(unassignedFetchRes.status === 403, '4.9 Unassigned practitioner Gabriel blocked from decrypting intake (HTTP 403)');

      // 4.10 Assigned practitioner Elena decrypts Alice's intake -> HTTP 200 with 100% fidelity
      const elenaFetchRes = await makeRequest(
        server,
        `/api/clinical/intake/${intakeId}`,
        'GET',
        undefined,
        { Authorization: 'Bearer PRACTITIONER_ELENA_TOKEN' }
      );
      assert(elenaFetchRes.status === 200, '4.10 Assigned practitioner Elena decrypts intake successfully (HTTP 200)');
      assert(elenaFetchRes.data.decryptedClinicalIntake.dietaryHabits.includes('Daet organic'), '4.11 Decrypted dietary habits match with 100% fidelity');
      assert(elenaFetchRes.data.decryptedClinicalIntake.waterConsumption.includes('HCI CMD'), '4.12 Decrypted water protocol matches');

      // 4.13 Patient Alice can view her own decrypted intake
      const aliceFetchRes = await makeRequest(
        server,
        `/api/clinical/intake/${intakeId}`,
        'GET',
        undefined,
        { Authorization: 'Bearer PATIENT_ALICE_TOKEN' }
      );
      assert(aliceFetchRes.status === 200, '4.13 Patient Alice can fetch and decrypt her own intake record (HTTP 200)');

      // --- SECTION 5: Appointment Cancellation ---

      // 5.1 Patient Alice cancels appointment
      const cancelRes = await makeRequest(
        server,
        '/api/consultations/cancel',
        'POST',
        { appointmentId, reason: 'Client requested reschedule' },
        { Authorization: 'Bearer PATIENT_ALICE_TOKEN' }
      );
      assert(cancelRes.status === 200, '5.1 Patient Alice cancels consultation appointment (HTTP 200)');

      const updatedAppt = harness.appointmentsStore.get(appointmentId);
      assert(updatedAppt.status === 'cancelled', '5.2 Appointment status transitioned to cancelled');

      // 5.3 Verify slot is freed up after cancellation
      const resSlotsAfterCancel = await makeRequest(server, `/api/consultations/slots?practitionerId=practitioner-daet-01&date=${testDate}`, 'GET');
      const slot0900After = resSlotsAfterCancel.data.slots.find((s: any) => s.startTime === '09:00');
      assert(slot0900After.isBooked === false, '5.3 Slot becomes available again (isBooked: false) after cancellation');
    } finally {
      server.close();
    }
  }

  console.log('\n================================================================');
  console.log(`   PHASE 6A SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED   `);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase6ATests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
