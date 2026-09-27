/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

process.env.NODE_ENV = 'test';

import {
  createExpressApp,
  CRM_COHORTS,
  aggregateCustomerCrmProfiles,
} from '../server';
import crypto from 'crypto';
import http from 'http';

// Helper to execute test HTTP requests
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

// In-Memory Mock Store with collection tracking to verify zero clinical intake access
function createTestHarness(options: {
  users?: Record<string, any>;
  orders?: Record<string, any>;
  workshopRegistrations?: Record<string, any>;
  consultationIntakes?: Record<string, any>;
} = {}) {
  const usersStore = new Map<string, any>(Object.entries(options.users || {}));
  const ordersStore = new Map<string, any>(Object.entries(options.orders || {}));
  const workshopRegsStore = new Map<string, any>(Object.entries(options.workshopRegistrations || {}));
  const consultationIntakesStore = new Map<string, any>(Object.entries(options.consultationIntakes || {}));
  const auditLogsStore = new Map<string, any>();

  // Track collection access counts to enforce Health Data Privacy Firewall
  const collectionAccessCounts = {
    users: 0,
    orders: 0,
    workshop_registrations: 0,
    consultation_intakes: 0,
    audit_logs: 0,
  };

  const mockDb: any = {
    _getStoreForCollection: (colName: string) => {
      if (colName === 'users') return usersStore;
      if (colName === 'orders') return ordersStore;
      if (colName === 'workshop_registrations') return workshopRegsStore;
      if (colName === 'consultation_intakes') return consultationIntakesStore;
      if (colName === 'audit_logs') return auditLogsStore;
      return new Map<string, any>();
    },
    collection: (colName: string) => {
      if ((collectionAccessCounts as any)[colName] !== undefined) {
        (collectionAccessCounts as any)[colName]++;
      }
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
        }),
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
            docs: documents,
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
      if (token === 'PRACTITIONER_ELENA_TOKEN') return { uid: 'practitioner-elena-uid', email: 'elena@example.com' };
      if (token === 'STAFF_DAET_MANAGER_TOKEN') return { uid: 'staff-daet-manager-uid', email: 'daet_mgr@example.com' };
      if (token === 'STAFF_LABO_MANAGER_TOKEN') return { uid: 'staff-labo-manager-uid', email: 'labo_mgr@example.com' };
      if (token === 'STAFF_REGIONAL_DIRECTOR_TOKEN') return { uid: 'staff-regional-director-uid', email: 'rd@example.com' };
      if (token === 'STAFF_SUPER_ADMIN_TOKEN') return { uid: 'staff-super-admin-uid', email: 'super@example.com' };
      throw new Error('Invalid Mock Token');
    },
  };

  return {
    mockDb,
    mockAuth,
    usersStore,
    ordersStore,
    workshopRegsStore,
    consultationIntakesStore,
    auditLogsStore,
    collectionAccessCounts,
  };
}

async function runPhase6CMilestone2Tests() {
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

  console.log('================================================================');
  console.log('   HCI CMD PHASE 6C — MILESTONE 2: CRM & ACCOUNT SEGMENTATION   ');
  console.log('================================================================');

  // --- SECTION 1: Authentication & Authorization Controls ---
  {
    console.log('\n--- Running Section 1: Authentication & Authorization Controls ---');

    const harness = createTestHarness({
      users: {
        'patient-alice-uid': { role: 'customer', email: 'alice@example.com' },
        'practitioner-elena-uid': { role: 'practitioner', email: 'elena@example.com' },
        'staff-daet-manager-uid': { role: 'branch_manager', email: 'daet_mgr@example.com', assignedBranchId: 'daet' },
      },
    });

    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth });
    const server = http.createServer(app).listen(0);

    try {
      // 1.1 Unauthenticated requests are rejected
      const unauthRes = await makeRequest(server, '/api/crm/cohorts', 'GET');
      assert(unauthRes.status === 401, '1.1 Unauthenticated CRM cohorts request rejected with HTTP 401');

      // 1.2 Customer role rejected with HTTP 403
      const customerRes = await makeRequest(
        server,
        '/api/crm/cohorts',
        'GET',
        undefined,
        { Authorization: 'Bearer PATIENT_ALICE_TOKEN' }
      );
      assert(customerRes.status === 403, '1.2 Customer role blocked from CRM endpoints with HTTP 403');
      assert(customerRes.data.error.includes('Staff CRM operations require'), '1.3 Error clearly states staff requirement');

      // 1.3 Practitioner role rejected with HTTP 403
      const practitionerRes = await makeRequest(
        server,
        '/api/crm/cohorts',
        'GET',
        undefined,
        { Authorization: 'Bearer PRACTITIONER_ELENA_TOKEN' }
      );
      assert(practitionerRes.status === 403, '1.4 Practitioner role blocked from CRM endpoints with HTTP 403');

      // 1.4 Authorized Branch Manager succeeds with HTTP 200
      const managerRes = await makeRequest(
        server,
        '/api/crm/cohorts',
        'GET',
        undefined,
        { Authorization: 'Bearer STAFF_DAET_MANAGER_TOKEN' }
      );
      assert(managerRes.status === 200, '1.5 Authorized Branch Manager accesses CRM cohorts with HTTP 200');
    } finally {
      server.close();
    }
  }

  // --- SECTION 2: The 5 Approved Cohort Aggregations ---
  {
    console.log('\n--- Running Section 2: The 5 Approved Cohort Aggregations ---');

    const now = Date.now();
    const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString();
    const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();

    const harness = createTestHarness({
      users: {
        'user-wholesale-1': { uid: 'user-wholesale-1', role: 'customer', email: 'stockist@example.com', firstName: 'Marcos', lastName: 'Vinzons' },
        'user-repeat-2': { uid: 'user-repeat-2', role: 'customer', email: 'repeat@example.com', firstName: 'Maria', lastName: 'Santos' },
        'user-seminar-3': { uid: 'user-seminar-3', role: 'customer', email: 'seminar@example.com', firstName: 'Jose', lastName: 'Reyes' },
        'user-replenish-4': { uid: 'user-replenish-4', role: 'customer', email: 'replenish@example.com', firstName: 'Clara', lastName: 'Dela Rosa' },
        'user-lapsed-5': { uid: 'user-lapsed-5', role: 'customer', email: 'lapsed@example.com', firstName: 'Emilio', lastName: 'Aguinaldo' },
        'user-fresh-6': { uid: 'user-fresh-6', role: 'customer', email: 'fresh@example.com', firstName: 'Ana', lastName: 'Rizal' },
        'staff-regional-director-uid': { role: 'regional_director', email: 'rd@example.com' },
      },
      orders: {
        // Wholesale Customer 1: Spend >= 5000 (total ₱7,200) across 2 orders
        'ORD-W1': { id: 'ORD-W1', userId: 'user-wholesale-1', branchId: 'daet', grandTotal: 4800, createdAt: tenDaysAgo, items: [{ quantity: 4 }] },
        'ORD-W2': { id: 'ORD-W2', userId: 'user-wholesale-1', branchId: 'daet', grandTotal: 2400, createdAt: threeDaysAgo, items: [{ quantity: 2 }] },

        // Repeat Retail Customer 2: 2 orders totaling ₱2,400 (< 5000), last order 10 days ago
        'ORD-R1': { id: 'ORD-R1', userId: 'user-repeat-2', branchId: 'daet', grandTotal: 1200, createdAt: thirtyDaysAgo, items: [{ quantity: 1 }] },
        'ORD-R2': { id: 'ORD-R2', userId: 'user-repeat-2', branchId: 'daet', grandTotal: 1200, createdAt: tenDaysAgo, items: [{ quantity: 1 }] },

        // Seminar Customer 3: 1 order placed 10 days ago, but also attended workshop
        'ORD-S1': { id: 'ORD-S1', userId: 'user-seminar-3', branchId: 'daet', grandTotal: 1200, createdAt: tenDaysAgo, items: [{ quantity: 1 }] },

        // Replenishment Due Customer 4: 1 order placed 30 days ago (21 <= 30 <= 45)
        'ORD-REP1': { id: 'ORD-REP1', userId: 'user-replenish-4', branchId: 'daet', grandTotal: 650, createdAt: thirtyDaysAgo, items: [{ quantity: 1 }] },

        // Lapsed Customer 5: 1 order placed 60 days ago (> 45 days)
        'ORD-LAP1': { id: 'ORD-LAP1', userId: 'user-lapsed-5', branchId: 'daet', grandTotal: 1200, createdAt: sixtyDaysAgo, items: [{ quantity: 1 }] },

        // Fresh Customer 6: 1 order placed 3 days ago (not replenishment due, not lapsed)
        'ORD-F1': { id: 'ORD-F1', userId: 'user-fresh-6', branchId: 'daet', grandTotal: 650, createdAt: threeDaysAgo, items: [{ quantity: 1 }] },
      },
      workshopRegistrations: {
        // Customer 3 attended workshop
        'REG-01': { id: 'REG-01', userId: 'user-seminar-3', workshopId: 'wk-01-daet', status: 'attended' },
        // Customer 6 only registered (waitlisted), did not attend
        'REG-02': { id: 'REG-02', userId: 'user-fresh-6', workshopId: 'wk-01-daet', status: 'waitlisted' },
      },
    });

    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth });
    const server = http.createServer(app).listen(0);

    try {
      // 2.1 Query all cohorts overview
      const overviewRes = await makeRequest(
        server,
        '/api/crm/cohorts',
        'GET',
        undefined,
        { Authorization: 'Bearer STAFF_REGIONAL_DIRECTOR_TOKEN' }
      );
      assert(overviewRes.status === 200, '2.1 Regional Director queries CRM cohorts overview with HTTP 200');
      assert(Array.isArray(overviewRes.data.cohorts), '2.2 Response contains cohorts array');
      assert(overviewRes.data.cohorts.length === 5, '2.3 Exactly 5 approved cohorts returned');

      const cohortsMap = new Map<string, any>(overviewRes.data.cohorts.map((c: any) => [c.key, c]));

      // Verify all 5 approved cohort keys exist
      assert(cohortsMap.has('wholesale_stockist'), '2.4 Cohort "wholesale_stockist" present');
      assert(cohortsMap.has('repeat_retail'), '2.5 Cohort "repeat_retail" present');
      assert(cohortsMap.has('wellness_seminar_attendees'), '2.6 Cohort "wellness_seminar_attendees" present');
      assert(cohortsMap.has('replenishment_due'), '2.7 Cohort "replenishment_due" present');
      assert(cohortsMap.has('lapsed_accounts'), '2.8 Cohort "lapsed_accounts" present');

      // Check counts:
      // Wholesale: User 1 (spend 7200 >= 5000, 6 units)
      const wholesaleCohort = cohortsMap.get('wholesale_stockist');
      assert(wholesaleCohort.memberCount === 1, '2.9 Wholesale/Stockist member count is exactly 1');

      // Repeat Retail: User 1 (2 orders) and User 2 (2 orders) -> 2 members
      const repeatCohort = cohortsMap.get('repeat_retail');
      assert(repeatCohort.memberCount === 2, '2.10 Repeat Retail member count is exactly 2 (users with >= 2 orders)');

      // Wellness Seminar Attendees: User 3 (1 attended registration)
      const seminarCohort = cohortsMap.get('wellness_seminar_attendees');
      assert(seminarCohort.memberCount === 1, '2.11 Wellness Seminar Attendees member count is exactly 1');

      // Replenishment Due: User 4 (order 30 days ago, 21-45 days window)
      const replenishCohort = cohortsMap.get('replenishment_due');
      assert(replenishCohort.memberCount === 1, '2.12 Replenishment Due member count is exactly 1');

      // Lapsed Accounts: User 5 (order 60 days ago, > 45 days)
      const lapsedCohort = cohortsMap.get('lapsed_accounts');
      assert(lapsedCohort.memberCount === 1, '2.13 Lapsed Accounts member count is exactly 1');

      // 2.2 Query specific cohort detail
      const detailRes = await makeRequest(
        server,
        '/api/crm/cohorts/wholesale_stockist',
        'GET',
        undefined,
        { Authorization: 'Bearer STAFF_REGIONAL_DIRECTOR_TOKEN' }
      );
      assert(detailRes.status === 200, '2.14 Query specific cohort detail returns HTTP 200');
      assert(detailRes.data.cohortKey === 'wholesale_stockist', '2.15 Returns matching cohortKey');
      assert(detailRes.data.members.length === 1, '2.16 Wholesale members array has length 1');
      assert(detailRes.data.members[0].userId === 'user-wholesale-1', '2.17 Wholesale member is user-wholesale-1');
      assert(detailRes.data.members[0].totalSpent === 7200, '2.18 Cumulative spend accurately calculated as ₱7,200');
      assert(detailRes.data.members[0].totalOrders === 2, '2.19 Total orders accurately counted as 2');

      // 2.3 Invalid cohort key returns HTTP 400
      const invalidCohortRes = await makeRequest(
        server,
        '/api/crm/cohorts/non_existent_cohort',
        'GET',
        undefined,
        { Authorization: 'Bearer STAFF_REGIONAL_DIRECTOR_TOKEN' }
      );
      assert(invalidCohortRes.status === 400, '2.20 Requesting non-existent cohort key returns HTTP 400');
    } finally {
      server.close();
    }
  }

  // --- SECTION 3: Branch Isolation & Cross-Branch Jurisdictions ---
  {
    console.log('\n--- Running Section 3: Branch Isolation & Cross-Branch Jurisdictions ---');

    const now = Date.now();
    const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();

    const harness = createTestHarness({
      users: {
        'user-daet-1': { uid: 'user-daet-1', role: 'customer', email: 'daet_cust@example.com', assignedBranchId: 'daet' },
        'user-labo-2': { uid: 'user-labo-2', role: 'customer', email: 'labo_cust@example.com', assignedBranchId: 'labo' },
        'staff-daet-manager-uid': { role: 'branch_manager', email: 'daet_mgr@example.com', assignedBranchId: 'daet' },
        'staff-labo-manager-uid': { role: 'branch_manager', email: 'labo_mgr@example.com', assignedBranchId: 'labo' },
        'staff-regional-director-uid': { role: 'regional_director', email: 'rd@example.com' },
        'staff-super-admin-uid': { role: 'super_admin', email: 'super@example.com' },
      },
      orders: {
        // Daet customer order (Wholesale ₱6,000 in Daet)
        'ORD-D1': { id: 'ORD-D1', userId: 'user-daet-1', branchId: 'daet', grandTotal: 6000, createdAt: tenDaysAgo, items: [{ quantity: 5 }] },
        // Labo customer order (Wholesale ₱6,000 in Labo)
        'ORD-L1': { id: 'ORD-L1', userId: 'user-labo-2', branchId: 'labo', grandTotal: 6000, createdAt: tenDaysAgo, items: [{ quantity: 5 }] },
      },
      workshopRegistrations: {
        // Unknown / ambiguous workshop registration with missing branch (must be excluded fail-closed)
        'REG-UNKNOWN': { id: 'REG-UNKNOWN', userId: 'user-unknown-attendee', workshopId: 'wk-unknown-ambiguous', status: 'attended' },
        // Conflicting branch metadata registration: workshopId maps to Daet, but branchId says 'labo' (must be excluded fail-closed)
        'REG-CONFLICT': { id: 'REG-CONFLICT', userId: 'user-conflicting-attendee', workshopId: 'wk-01-daet', branchId: 'labo', status: 'attended' },
        // Mismatched workshop registration in Labo
        'REG-LABO': { id: 'REG-LABO', userId: 'user-labo-attendee', workshopId: 'wk-02-labo', branchId: 'labo', status: 'attended' },
        // Valid Daet workshop registration
        'REG-DAET': { id: 'REG-DAET', userId: 'user-daet-1', workshopId: 'wk-01-daet', branchId: 'daet', status: 'attended' },
      },
    });

    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth });
    const server = http.createServer(app).listen(0);

    try {
      // 3.1 Daet Branch Manager queries wholesale cohort: sees ONLY Daet customer
      const daetManagerRes = await makeRequest(
        server,
        '/api/crm/cohorts/wholesale_stockist',
        'GET',
        undefined,
        { Authorization: 'Bearer STAFF_DAET_MANAGER_TOKEN' }
      );
      assert(daetManagerRes.status === 200, '3.1 Daet manager queries wholesale cohort with HTTP 200');
      assert(daetManagerRes.data.members.length === 1, '3.2 Daet manager sees exactly 1 member (unknown/conflicting/mismatched workshop branches excluded fail-closed)');
      assert(daetManagerRes.data.members[0].userId === 'user-daet-1', '3.3 Daet manager only sees Daet customer and not unknown/conflicting/mismatched branch attendees');
      assert(daetManagerRes.data.branchScope === 'daet', '3.4 Response reflects Daet branch scope');

      // 3.2 Labo Branch Manager queries wholesale cohort: sees ONLY Labo customer
      const laboManagerRes = await makeRequest(
        server,
        '/api/crm/cohorts/wholesale_stockist',
        'GET',
        undefined,
        { Authorization: 'Bearer STAFF_LABO_MANAGER_TOKEN' }
      );
      assert(laboManagerRes.status === 200, '3.5 Labo manager queries wholesale cohort with HTTP 200');
      assert(laboManagerRes.data.members.length === 1, '3.6 Labo manager sees exactly 1 member (unknown/conflicting/mismatched workshop branches excluded fail-closed)');
      assert(laboManagerRes.data.members[0].userId === 'user-labo-2', '3.7 Labo manager only sees Labo customer and not unknown/conflicting/mismatched branch attendees');
      assert(laboManagerRes.data.branchScope === 'labo', '3.8 Response reflects Labo branch scope');

      // 3.3 Regional Director queries wholesale cohort: sees BOTH branches
      const rdRes = await makeRequest(
        server,
        '/api/crm/cohorts/wholesale_stockist',
        'GET',
        undefined,
        { Authorization: 'Bearer STAFF_REGIONAL_DIRECTOR_TOKEN' }
      );
      assert(rdRes.status === 200, '3.9 Regional Director queries wholesale cohort with HTTP 200');
      assert(rdRes.data.members.length === 2, '3.10 Regional Director has cross-branch visibility (sees 2 members across Daet and Labo)');

      // 3.4 Super Admin queries wholesale cohort: sees BOTH branches
      const superRes = await makeRequest(
        server,
        '/api/crm/cohorts/wholesale_stockist',
        'GET',
        undefined,
        { Authorization: 'Bearer STAFF_SUPER_ADMIN_TOKEN' }
      );
      assert(superRes.status === 200, '3.11 Super Admin has cross-branch visibility with HTTP 200');
      assert(superRes.data.members.length === 2, '3.12 Super Admin sees 2 members across branches');
    } finally {
      server.close();
    }
  }

  // --- SECTION 4: Health Data Privacy Firewall Isolation ---
  {
    console.log('\n--- Running Section 4: Health Data Privacy Firewall Isolation ---');

    const clinicalIntakeId = 'INTAKE-ALICE-SPI-999';

    const harness = createTestHarness({
      users: {
        'patient-alice-uid': { role: 'customer', email: 'alice@example.com' },
        'staff-daet-manager-uid': { role: 'branch_manager', email: 'daet_mgr@example.com', assignedBranchId: 'daet' },
        'staff-regional-director-uid': { role: 'regional_director', email: 'rd@example.com' },
      },
      orders: {
        'ORD-ALICE-1': {
          id: 'ORD-ALICE-1',
          userId: 'patient-alice-uid',
          branchId: 'daet',
          grandTotal: 6000,
          createdAt: new Date().toISOString(),
          items: [{ quantity: 5 }],
        },
      },
      // Sensitive clinical consultation intake containing AES-256-GCM ciphertext and SPI notes
      consultationIntakes: {
        [clinicalIntakeId]: {
          id: clinicalIntakeId,
          userId: 'patient-alice-uid',
          ciphertext: 'ENCRYPTED_AES256GCM_DIETARY_SPI_DATA',
          iv: 'HEX_IV_VECTOR',
          tag: 'HEX_AUTH_TAG',
          encryptedKey: 'WRAPPED_KMS_DEK',
          dietaryHabits: 'Daet raw leafy green protocol',
          waterConsumption: '3 Liters daily with mineral drops',
          declaredConditions: 'Cellular hydration deficit',
        },
      },
    });

    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth });
    const server = http.createServer(app).listen(0);

    try {
      // 4.1 CRM Cohorts query must never touch consultation_intakes
      const initialIntakesAccessCount = harness.collectionAccessCounts.consultation_intakes;

      const crmRes = await makeRequest(
        server,
        '/api/crm/cohorts/wholesale_stockist',
        'GET',
        undefined,
        { Authorization: 'Bearer STAFF_DAET_MANAGER_TOKEN' }
      );
      assert(crmRes.status === 200, '4.1 CRM query executed with HTTP 200');

      const afterIntakesAccessCount = harness.collectionAccessCounts.consultation_intakes;
      assert(
        afterIntakesAccessCount === initialIntakesAccessCount && initialIntakesAccessCount === 0,
        '4.2 Health Data Privacy Firewall: CRM queries made ZERO calls to consultation_intakes collection'
      );

      // 4.2 Verify returned CRM member data contains zero clinical fields
      const aliceMember = crmRes.data.members.find((m: any) => m.userId === 'patient-alice-uid');
      assert(aliceMember !== undefined, '4.3 Alice found in wholesale cohort member list');
      assert(aliceMember.ciphertext === undefined, '4.4 Zero ciphertext in CRM member record');
      assert(aliceMember.iv === undefined, '4.5 Zero IV vector in CRM member record');
      assert(aliceMember.tag === undefined, '4.6 Zero authentication tag in CRM member record');
      assert(aliceMember.encryptedKey === undefined, '4.7 Zero wrapped KMS key material in CRM member record');
      assert(aliceMember.dietaryHabits === undefined, '4.8 Zero dietaryHabits in CRM member record');
      assert(aliceMember.waterConsumption === undefined, '4.9 Zero waterConsumption in CRM member record');
      assert(aliceMember.declaredConditions === undefined, '4.10 Zero declaredConditions in CRM member record');

      // 4.3 Verify non-practitioners attempting to access clinical intake endpoint remain blocked
      const clinicalFetchRes = await makeRequest(
        server,
        `/api/clinical/intake/${clinicalIntakeId}`,
        'GET',
        undefined,
        { Authorization: 'Bearer STAFF_DAET_MANAGER_TOKEN' }
      );
      assert(clinicalFetchRes.status === 403, '4.11 Branch manager strictly blocked from reading clinical intake (HTTP 403)');
      assert(clinicalFetchRes.data.error.includes('Clinical Access Denied'), '4.12 Clinical Access Denied error verified');

      const rdClinicalRes = await makeRequest(
        server,
        `/api/clinical/intake/${clinicalIntakeId}`,
        'GET',
        undefined,
        { Authorization: 'Bearer STAFF_REGIONAL_DIRECTOR_TOKEN' }
      );
      assert(rdClinicalRes.status === 403, '4.13 Regional Director strictly blocked from reading clinical intake (HTTP 403)');
    } finally {
      server.close();
    }
  }

  // --- SECTION 5: ADR-009 Network-Only & Audit Trail Verification ---
  {
    console.log('\n--- Running Section 5: ADR-009 Network-Only & Audit Trail Verification ---');

    const harness = createTestHarness({
      users: {
        'staff-daet-manager-uid': { role: 'branch_manager', email: 'daet_mgr@example.com', assignedBranchId: 'daet' },
      },
      orders: {
        'ORD-1': { id: 'ORD-1', userId: 'u1', branchId: 'daet', grandTotal: 1200, createdAt: new Date().toISOString() },
      },
    });

    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth });
    const server = http.createServer(app).listen(0);

    try {
      // 5.1 Query CRM cohorts generates audit event
      const res = await makeRequest(
        server,
        '/api/crm/cohorts',
        'GET',
        undefined,
        { Authorization: 'Bearer STAFF_DAET_MANAGER_TOKEN' }
      );
      assert(res.status === 200, '5.1 CRM cohorts query succeeds with HTTP 200');

      const auditLogs = Array.from(harness.auditLogsStore.values());
      const crmLog = auditLogs.find((l: any) => l.action === 'crm_cohorts_queried');

      assert(crmLog !== undefined, '5.2 Audit log recorded for crm_cohorts_queried');
      assert(crmLog.actorUid === 'staff-daet-manager-uid', '5.3 Audit log records staff actor UID');
      assert(crmLog.actorRole === 'branch_manager', '5.4 Audit log records staff actor role');
      assert(crmLog.branchId === 'daet', '5.5 Audit log records Daet branch ID');
      assert(crmLog.targetResource === 'crm_analytics', '5.6 Audit log target resource is crm_analytics');

      // 5.2 Query specific cohort generates audit event
      await makeRequest(
        server,
        '/api/crm/cohorts/repeat_retail',
        'GET',
        undefined,
        { Authorization: 'Bearer STAFF_DAET_MANAGER_TOKEN' }
      );

      const detailLogs = Array.from(harness.auditLogsStore.values());
      const crmDetailLog = detailLogs.find((l: any) => l.action === 'crm_cohort_detail_queried');
      assert(crmDetailLog !== undefined, '5.7 Audit log recorded for crm_cohort_detail_queried');
      assert(crmDetailLog.targetId === 'repeat_retail', '5.8 Audit log targetId is repeat_retail');
    } finally {
      server.close();
    }
  }

  console.log('\n================================================================');
  console.log(`   PHASE 6C MILESTONE 2 COMPLETE: ${passed} PASSED, ${failed} FAILED   `);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase6CMilestone2Tests().catch((err) => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
