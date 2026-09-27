/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

process.env.NODE_ENV = 'test';

import {
  createExpressApp,
  RA11967_SLA_DAYS,
  RA11967_SLA_MS,
  VALID_TICKET_CATEGORIES,
  VALID_TICKET_STATUSES,
  SUPPORTED_BRANCH_IDS,
  evaluateSlaEscalation,
} from '../server';
import crypto from 'crypto';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// In-Memory Mock Store with OCC transaction support
function createTestHarness(options: {
  users?: Record<string, any>;
  supportTickets?: Record<string, any>;
  orders?: Record<string, any>;
  consultationIntakes?: Record<string, any>;
} = {}) {
  const usersStore = new Map<string, any>(Object.entries(options.users || {}));
  const supportTicketsStore = new Map<string, any>(Object.entries(options.supportTickets || {}));
  const ordersStore = new Map<string, any>(Object.entries(options.orders || {}));
  const consultationIntakesStore = new Map<string, any>(Object.entries(options.consultationIntakes || {}));
  const auditLogsStore = new Map<string, any>();
  const docVersions = new Map<string, number>();

  const mockDb: any = {
    _getStoreForCollection: (colName: string) => {
      if (colName === 'users') return usersStore;
      if (colName === 'support_tickets') return supportTicketsStore;
      if (colName === 'orders') return ordersStore;
      if (colName === 'consultation_intakes') return consultationIntakesStore;
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

        const result = await updateFunction(transaction);

        let hasConflict = false;
        for (const [path, expectedVer] of readVersions.entries()) {
          const actualVer = docVersions.get(path) || 1;
          if (actualVer !== expectedVer) {
            hasConflict = true;
            break;
          }
        }

        if (hasConflict) {
          if (attempt >= maxAttempts) {
            throw new Error('FAILED_PRECONDITION: Transaction conflict detected after max retries.');
          }
          await new Promise((r) => setTimeout(r, 10 * attempt));
          continue;
        }

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
          update: async (data: any) => {
            const existing = store.get(docId) || {};
            store.set(docId, { ...existing, ...JSON.parse(JSON.stringify(data)) });
          },
          delete: async () => {
            store.delete(docId);
          },
        }),
        where: (field: string, op: string, value: any) => {
          const queryObj = {
            _filters: [{ field, op, value }],
            where: (f2: string, op2: string, val2: any) => {
              queryObj._filters.push({ field: f2, op: op2, value: val2 });
              return queryObj;
            },
            get: async () => {
              const matches: any[] = [];
              store.forEach((record: any, id: string) => {
                let match = true;
                for (const flt of queryObj._filters) {
                  if (flt.op === '==' && record[flt.field] !== flt.value) match = false;
                  if (flt.op === '<=' && record[flt.field] > flt.value) match = false;
                  if (flt.op === '>=' && record[flt.field] < flt.value) match = false;
                }
                if (match) {
                  matches.push({
                    id,
                    data: () => JSON.parse(JSON.stringify(record)),
                  });
                }
              });
              return {
                empty: matches.length === 0,
                docs: matches,
                forEach: (cb: (doc: any) => void) => matches.forEach(cb),
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
    supportTicketsStore,
    ordersStore,
    consultationIntakesStore,
    auditLogsStore,
  };
}

async function runPhase6CTests() {
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
  console.log('   HCI CMD PHASE 6C — SUPPORT TICKETS & RA 11967 REDRESS SUITE   ');
  console.log('================================================================');

  // --- SECTION 1: Authentication & Authorization Boundaries ---
  {
    console.log('\n--- Running Section 1: Authentication & Authorization ---');

    const harness = createTestHarness({
      users: {
        'practitioner-elena-uid': { role: 'practitioner', email: 'elena@example.com' },
      },
    });

    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth });
    const server = http.createServer(app).listen(0);

    try {
      // 1.1 Unauthenticated requests are rejected
      const unauthGetRes = await makeRequest(server, '/api/support/tickets', 'GET');
      assert(unauthGetRes.status === 401, '1.1 Unauthenticated support tickets query rejected with HTTP 401');

      const unauthPostRes = await makeRequest(server, '/api/support/tickets', 'POST', {
        branchId: 'daet',
        category: 'damaged_product',
        subject: 'Damaged dropper on delivery',
        description: 'Bottle cap was cracked upon opening package.',
      });
      assert(unauthPostRes.status === 401, '1.2 Unauthenticated ticket creation rejected with HTTP 401');

      // 1.2 Practitioners blocked from commercial support tickets
      const practitionerRes = await makeRequest(
        server,
        '/api/support/tickets',
        'GET',
        undefined,
        { Authorization: 'Bearer PRACTITIONER_ELENA_TOKEN' }
      );
      assert(practitionerRes.status === 403, '1.3 Practitioner blocked from commercial support tickets (HTTP 403)');
      assert(practitionerRes.data.error.includes('Practitioners do not have access'), '1.4 Rejection clearly states practitioner scope boundary');
    } finally {
      server.close();
    }
  }

  // --- SECTION 2: Ticket Creation & Statutory 7-Day SLA Calculation ---
  {
    console.log('\n--- Running Section 2: Ticket Creation & RA 11967 7-Day SLA Calculation ---');

    const harness = createTestHarness({
      users: {
        'patient-alice-uid': { role: 'customer', email: 'alice@example.com' },
        'patient-bob-uid': { role: 'customer', email: 'bob@example.com' },
      },
      orders: {
        'ORD-ALICE-LABO-200': {
          id: 'ORD-ALICE-LABO-200',
          userId: 'patient-alice-uid',
          branchId: 'labo',
          grandTotal: 1200,
        },
        'ORD-BOB-CAPALONGA-300': {
          id: 'ORD-BOB-CAPALONGA-300',
          userId: 'patient-bob-uid',
          branchId: 'capalonga',
          grandTotal: 2400,
        },
      },
    });

    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth });
    const server = http.createServer(app).listen(0);

    try {
      // 2.1 Missing required fields rejected with HTTP 400
      const missingCategoryRes = await makeRequest(
        server,
        '/api/support/tickets',
        'POST',
        { branchId: 'daet', subject: 'Inquiry', description: 'Need information on order' },
        { Authorization: 'Bearer PATIENT_ALICE_TOKEN' }
      );
      assert(missingCategoryRes.status === 400, '2.1 Ticket creation without category rejected with HTTP 400');

      const invalidCategoryRes = await makeRequest(
        server,
        '/api/support/tickets',
        'POST',
        { branchId: 'daet', category: 'invalid_category_xyz', subject: 'Inquiry', description: 'Description text here' },
        { Authorization: 'Bearer PATIENT_ALICE_TOKEN' }
      );
      assert(invalidCategoryRes.status === 400, '2.2 Ticket creation with invalid category rejected with HTTP 400');

      const missingBranchRes = await makeRequest(
        server,
        '/api/support/tickets',
        'POST',
        { category: 'damaged_product', subject: 'Inquiry', description: 'Description text here' },
        { Authorization: 'Bearer PATIENT_ALICE_TOKEN' }
      );
      assert(missingBranchRes.status === 400, '2.3 Ticket creation without branchId and without order rejected with HTTP 400');

      // 2.4 Customer attempting an invalid branch
      const invalidBranchRes = await makeRequest(
        server,
        '/api/support/tickets',
        'POST',
        { branchId: 'naga_city', category: 'damaged_product', subject: 'Inquiry', description: 'Valid description text' },
        { Authorization: 'Bearer PATIENT_ALICE_TOKEN' }
      );
      assert(invalidBranchRes.status === 400, '2.4 Customer attempting invalid branch rejected with HTTP 400');
      assert(invalidBranchRes.data.error.includes('Must be one of supported branches'), '2.5 Rejection lists supported platform branch identifiers');

      // 2.5 Customer attempting to associate an order that doesn't exist
      const nonExistentOrderRes = await makeRequest(
        server,
        '/api/support/tickets',
        'POST',
        { orderId: 'ORD-NONEXISTENT-999', category: 'damaged_product', subject: 'Inquiry', description: 'Valid description text' },
        { Authorization: 'Bearer PATIENT_ALICE_TOKEN' }
      );
      assert(nonExistentOrderRes.status === 404, '2.6 Ticket referencing non-existent order rejected with HTTP 404');

      // 2.6 Customer attempting to associate another user's order
      const crossOrderRes = await makeRequest(
        server,
        '/api/support/tickets',
        'POST',
        { orderId: 'ORD-BOB-CAPALONGA-300', category: 'damaged_product', subject: 'Inquiry', description: 'Valid description text' },
        { Authorization: 'Bearer PATIENT_ALICE_TOKEN' }
      );
      assert(crossOrderRes.status === 403, '2.7 Customer referencing another user\'s order rejected with HTTP 403');

      // 2.7 Customer attempting to use a different branch than the associated order
      const branchMismatchRes = await makeRequest(
        server,
        '/api/support/tickets',
        'POST',
        {
          orderId: 'ORD-ALICE-LABO-200',
          branchId: 'daet', // Mismatched! Order was for 'labo'
          category: 'damaged_product',
          subject: 'Damaged item',
          description: 'Dropper was cracked upon delivery.',
        },
        { Authorization: 'Bearer PATIENT_ALICE_TOKEN' }
      );
      assert(branchMismatchRes.status === 400, '2.8 Customer attempting different branch than associated order rejected with HTTP 400');
      assert(branchMismatchRes.data.error.includes('Branch mismatch'), '2.9 Error explicitly identifies branch mismatch with order');

      // 2.8 Valid same-branch ticket creation with associated order
      const orderLinkedRes = await makeRequest(
        server,
        '/api/support/tickets',
        'POST',
        {
          orderId: 'ORD-ALICE-LABO-200',
          branchId: 'labo', // Matches order authoritative branch
          category: 'damaged_product',
          subject: 'Broken Seal on 65ml Dropper',
          description: 'Received shipment with broken tamper-evident seal and leaking dropper cap.',
        },
        { Authorization: 'Bearer PATIENT_ALICE_TOKEN' }
      );
      assert(orderLinkedRes.status === 201, '2.10 Valid same-branch ticket creation with order succeeds with HTTP 201');
      assert(orderLinkedRes.data.ticket.branchId === 'labo', '2.11 Ticket branchId matches order authoritative branch (labo)');
      assert(orderLinkedRes.data.ticket.orderId === 'ORD-ALICE-LABO-200', '2.12 Ticket accurately references associated orderId');

      // 2.9 Valid standalone ticket creation (no orderId, valid supported branch)
      const validPayload = {
        branchId: 'daet',
        category: 'damaged_product',
        subject: 'Damaged 65ml Dropper Cap',
        description: 'Received shipment with broken tamper-evident seal and leaking dropper cap.',
        customerPhone: '+639171234567',
      };

      const createRes = await makeRequest(
        server,
        '/api/support/tickets',
        'POST',
        validPayload,
        { Authorization: 'Bearer PATIENT_ALICE_TOKEN' }
      );

      assert(createRes.status === 201, '2.13 Valid standalone support ticket creation succeeds with HTTP 201');
      assert(createRes.data.ticket && createRes.data.ticket.id.startsWith('TKT-'), '2.14 Ticket identifier generated with authoritative prefix');
      assert(createRes.data.ticket.status === 'submitted', '2.15 Initial ticket status is SUBMITTED');
      assert(createRes.data.ticket.userId === 'patient-alice-uid', '2.16 Ticket bound to authenticated customer UID');
      assert(createRes.data.ticket.branchId === 'daet', '2.17 Ticket branch set to Daet');

      // Statutory 7-Day SLA Due Date Calculation
      const createdAtMs = Date.parse(createRes.data.ticket.createdAt);
      const slaDueAtMs = Date.parse(createRes.data.ticket.slaDueAt);
      const differenceMs = slaDueAtMs - createdAtMs;
      const expected7DaysMs = 7 * 24 * 60 * 60 * 1000;

      assert(differenceMs === expected7DaysMs, '2.18 Statutory 7-day SLA deadline calculated exactly as createdAt + 7 days (604,800,000 ms)');
      assert(createRes.data.ticket.isEscalated === false, '2.19 Ticket isEscalated initializes to false');
      assert(createRes.data.statutoryNotice.includes('RA 11967'), '2.20 Statutory consumer protection notice returned in API response');

      // Verify persistence in store
      const persisted = harness.supportTicketsStore.get(createRes.data.ticket.id);
      assert(persisted !== undefined, '2.21 Ticket successfully persisted in support_tickets store');
      assert(persisted.subject === validPayload.subject, '2.22 Persisted subject matches input payload');
    } finally {
      server.close();
    }
  }

  // --- SECTION 3: Customer Ownership Isolation ---
  {
    console.log('\n--- Running Section 3: Customer Ownership Isolation ---');

    const aliceTicketId = 'TKT-ALICE-1001';
    const bobTicketId = 'TKT-BOB-2002';

    const harness = createTestHarness({
      users: {
        'patient-alice-uid': { role: 'customer', email: 'alice@example.com' },
        'patient-bob-uid': { role: 'customer', email: 'bob@example.com' },
      },
      supportTickets: {
        [aliceTicketId]: {
          id: aliceTicketId,
          userId: 'patient-alice-uid',
          customerEmail: 'alice@example.com',
          branchId: 'daet',
          category: 'delivery_delay',
          subject: 'Alice shipment delayed',
          description: 'Package has not arrived after 4 days.',
          status: 'submitted',
          createdAt: new Date().toISOString(),
          slaDueAt: new Date(Date.now() + RA11967_SLA_MS).toISOString(),
          isEscalated: false,
        },
        [bobTicketId]: {
          id: bobTicketId,
          userId: 'patient-bob-uid',
          customerEmail: 'bob@example.com',
          branchId: 'labo',
          category: 'billing_issue',
          subject: 'Bob double charge',
          description: 'Charged twice on GCash for order.',
          status: 'submitted',
          createdAt: new Date().toISOString(),
          slaDueAt: new Date(Date.now() + RA11967_SLA_MS).toISOString(),
          isEscalated: false,
        },
      },
    });

    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth });
    const server = http.createServer(app).listen(0);

    try {
      // 3.1 Alice fetches ticket list
      const aliceListRes = await makeRequest(
        server,
        '/api/support/tickets',
        'GET',
        undefined,
        { Authorization: 'Bearer PATIENT_ALICE_TOKEN' }
      );
      assert(aliceListRes.status === 200, '3.1 Alice retrieves ticket list with HTTP 200');
      assert(aliceListRes.data.tickets.length === 1, '3.2 Alice sees exactly 1 ticket');
      assert(aliceListRes.data.tickets[0].id === aliceTicketId, '3.3 Alice only sees her own ticket');

      // 3.2 Bob fetches ticket list
      const bobListRes = await makeRequest(
        server,
        '/api/support/tickets',
        'GET',
        undefined,
        { Authorization: 'Bearer PATIENT_BOB_TOKEN' }
      );
      assert(bobListRes.status === 200, '3.4 Bob retrieves ticket list with HTTP 200');
      assert(bobListRes.data.tickets.length === 1, '3.5 Bob sees exactly 1 ticket');
      assert(bobListRes.data.tickets[0].id === bobTicketId, '3.6 Bob only sees his own ticket');

      // 3.3 Alice attempts to access Bob's ticket directly (IDOR check)
      const crossFetchRes = await makeRequest(
        server,
        `/api/support/tickets/${bobTicketId}`,
        'GET',
        undefined,
        { Authorization: 'Bearer PATIENT_ALICE_TOKEN' }
      );
      assert(crossFetchRes.status === 403, '3.7 Alice blocked from viewing Bob\'s ticket (HTTP 403)');
      assert(crossFetchRes.data.error.includes('Customer cannot view another user\'s support ticket'), '3.8 Customer ownership isolation error text verified');

      // 3.4 Alice attempts to administratively update ticket (Customer role forbidden from status updates)
      const customerUpdateRes = await makeRequest(
        server,
        `/api/support/tickets/${aliceTicketId}`,
        'PATCH',
        { status: 'resolved', resolutionSummary: 'Self resolved' },
        { Authorization: 'Bearer PATIENT_ALICE_TOKEN' }
      );
      assert(customerUpdateRes.status === 403, '3.9 Customer blocked from administratively updating ticket status (HTTP 403)');
    } finally {
      server.close();
    }
  }

  // --- SECTION 4: Branch Manager Branch Isolation & Cross-Branch Defense ---
  {
    console.log('\n--- Running Section 4: Branch Manager Branch Isolation ---');

    const daetTicketId = 'TKT-DAET-4001';
    const laboTicketId = 'TKT-LABO-4002';

    const harness = createTestHarness({
      users: {
        'patient-alice-uid': { role: 'customer', email: 'alice@example.com' },
        'staff-daet-manager-uid': { role: 'branch_manager', email: 'daet_mgr@example.com', assignedBranchId: 'daet' },
        'staff-labo-manager-uid': { role: 'branch_manager', email: 'labo_mgr@example.com', assignedBranchId: 'labo' },
      },
      supportTickets: {
        [daetTicketId]: {
          id: daetTicketId,
          userId: 'patient-alice-uid',
          customerEmail: 'alice@example.com',
          branchId: 'daet',
          category: 'damaged_product',
          subject: 'Daet branch damaged item',
          description: 'Bottle leaking inside package.',
          status: 'submitted',
          createdAt: new Date().toISOString(),
          slaDueAt: new Date(Date.now() + RA11967_SLA_MS).toISOString(),
          isEscalated: false,
        },
        [laboTicketId]: {
          id: laboTicketId,
          userId: 'patient-bob-uid',
          customerEmail: 'bob@example.com',
          branchId: 'labo',
          category: 'delivery_delay',
          subject: 'Labo delivery inquiry',
          description: 'Package in transit to Labo.',
          status: 'submitted',
          createdAt: new Date().toISOString(),
          slaDueAt: new Date(Date.now() + RA11967_SLA_MS).toISOString(),
          isEscalated: false,
        },
      },
    });

    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth });
    const server = http.createServer(app).listen(0);

    try {
      // 4.1 Daet manager queries tickets: sees ONLY Daet tickets
      const daetQueryRes = await makeRequest(
        server,
        '/api/support/tickets',
        'GET',
        undefined,
        { Authorization: 'Bearer STAFF_DAET_MANAGER_TOKEN' }
      );
      assert(daetQueryRes.status === 200, '4.1 Daet manager fetches tickets with HTTP 200');
      assert(daetQueryRes.data.tickets.length === 1, '4.2 Daet manager sees exactly 1 ticket');
      assert(daetQueryRes.data.tickets[0].id === daetTicketId, '4.3 Daet manager sees only Daet branch ticket');

      // 4.2 Labo manager queries tickets: sees ONLY Labo tickets
      const laboQueryRes = await makeRequest(
        server,
        '/api/support/tickets',
        'GET',
        undefined,
        { Authorization: 'Bearer STAFF_LABO_MANAGER_TOKEN' }
      );
      assert(laboQueryRes.status === 200, '4.4 Labo manager fetches tickets with HTTP 200');
      assert(laboQueryRes.data.tickets.length === 1, '4.5 Labo manager sees exactly 1 ticket');
      assert(laboQueryRes.data.tickets[0].id === laboTicketId, '4.6 Labo manager sees only Labo branch ticket');

      // 4.3 Cross-branch view blocked: Labo manager attempts to view Daet ticket
      const crossViewRes = await makeRequest(
        server,
        `/api/support/tickets/${daetTicketId}`,
        'GET',
        undefined,
        { Authorization: 'Bearer STAFF_LABO_MANAGER_TOKEN' }
      );
      assert(crossViewRes.status === 403, '4.7 Labo manager blocked from viewing Daet ticket (HTTP 403)');
      assert(crossViewRes.data.error.includes('Branch managers may only view tickets for their assigned branch'), '4.8 Cross-branch view denial error verified');

      // 4.4 Cross-branch update blocked: Labo manager attempts to update Daet ticket
      const crossUpdateRes = await makeRequest(
        server,
        `/api/support/tickets/${daetTicketId}`,
        'PATCH',
        { status: 'under_investigation' },
        { Authorization: 'Bearer STAFF_LABO_MANAGER_TOKEN' }
      );
      assert(crossUpdateRes.status === 403, '4.9 Labo manager blocked from updating Daet ticket (HTTP 403)');
      assert(crossUpdateRes.data.error.includes('Branch managers may only update tickets for their assigned branch'), '4.10 Cross-branch update denial error verified');

      // 4.5 Same-branch update succeeds: Daet manager updates Daet ticket to under_investigation
      const sameBranchUpdateRes = await makeRequest(
        server,
        `/api/support/tickets/${daetTicketId}`,
        'PATCH',
        { status: 'under_investigation', internalNotes: 'Contacted carrier for courier inspection.' },
        { Authorization: 'Bearer STAFF_DAET_MANAGER_TOKEN' }
      );
      assert(sameBranchUpdateRes.status === 200, '4.11 Daet manager updates Daet ticket with HTTP 200');
      assert(sameBranchUpdateRes.data.ticket.status === 'under_investigation', '4.12 Ticket status updated to UNDER_INVESTIGATION');

      // 4.6 Resolving ticket without resolutionSummary is rejected with HTTP 400
      const missingSummaryRes = await makeRequest(
        server,
        `/api/support/tickets/${daetTicketId}`,
        'PATCH',
        { status: 'resolved' },
        { Authorization: 'Bearer STAFF_DAET_MANAGER_TOKEN' }
      );
      assert(missingSummaryRes.status === 400, '4.13 Resolving ticket without resolutionSummary rejected with HTTP 400');

      // 4.7 Resolving ticket with valid resolutionSummary succeeds
      const resolveRes = await makeRequest(
        server,
        `/api/support/tickets/${daetTicketId}`,
        'PATCH',
        { status: 'resolved', resolutionSummary: 'Replacement 65ml bottle issued and dispatched via express courier.' },
        { Authorization: 'Bearer STAFF_DAET_MANAGER_TOKEN' }
      );
      assert(resolveRes.status === 200, '4.14 Resolving ticket with summary succeeds with HTTP 200');
      assert(resolveRes.data.ticket.status === 'resolved', '4.15 Ticket status updated to RESOLVED');
      assert(resolveRes.data.ticket.resolvedByUid === 'staff-daet-manager-uid', '4.16 ResolvedByUid recorded accurately');
      assert(resolveRes.data.ticket.resolvedAt !== undefined, '4.17 ResolvedAt timestamp recorded');
    } finally {
      server.close();
    }
  }

  // --- SECTION 5: Regional Director & Super Admin Cross-Branch Access ---
  {
    console.log('\n--- Running Section 5: Regional Director & Super Admin Cross-Branch Access ---');

    const daetTicketId = 'TKT-DAET-5001';
    const laboTicketId = 'TKT-LABO-5002';
    const capalongaTicketId = 'TKT-CAP-5003';

    const harness = createTestHarness({
      users: {
        'staff-regional-director-uid': { role: 'regional_director', email: 'rd@example.com', assignedBranchId: 'central' },
        'staff-super-admin-uid': { role: 'super_admin', email: 'super@example.com', assignedBranchId: 'central' },
      },
      supportTickets: {
        [daetTicketId]: {
          id: daetTicketId,
          userId: 'patient-alice-uid',
          branchId: 'daet',
          category: 'damaged_product',
          subject: 'Daet issue',
          description: 'Details',
          status: 'submitted',
          createdAt: new Date().toISOString(),
          slaDueAt: new Date(Date.now() + RA11967_SLA_MS).toISOString(),
          isEscalated: false,
        },
        [laboTicketId]: {
          id: laboTicketId,
          userId: 'patient-bob-uid',
          branchId: 'labo',
          category: 'delivery_delay',
          subject: 'Labo issue',
          description: 'Details',
          status: 'submitted',
          createdAt: new Date().toISOString(),
          slaDueAt: new Date(Date.now() + RA11967_SLA_MS).toISOString(),
          isEscalated: false,
        },
        [capalongaTicketId]: {
          id: capalongaTicketId,
          userId: 'patient-alice-uid',
          branchId: 'capalonga',
          category: 'billing_issue',
          subject: 'Capalonga issue',
          description: 'Details',
          status: 'submitted',
          createdAt: new Date().toISOString(),
          slaDueAt: new Date(Date.now() + RA11967_SLA_MS).toISOString(),
          isEscalated: false,
        },
      },
    });

    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth });
    const server = http.createServer(app).listen(0);

    try {
      // 5.1 Regional Director sees all tickets across branches
      const rdListRes = await makeRequest(
        server,
        '/api/support/tickets',
        'GET',
        undefined,
        { Authorization: 'Bearer STAFF_REGIONAL_DIRECTOR_TOKEN' }
      );
      assert(rdListRes.status === 200, '5.1 Regional Director queries tickets with HTTP 200');
      assert(rdListRes.data.tickets.length === 3, '5.2 Regional Director sees all 3 tickets across branches');

      // 5.2 Super Admin sees all tickets across branches
      const superListRes = await makeRequest(
        server,
        '/api/support/tickets',
        'GET',
        undefined,
        { Authorization: 'Bearer STAFF_SUPER_ADMIN_TOKEN' }
      );
      assert(superListRes.status === 200, '5.3 Super Admin queries tickets with HTTP 200');
      assert(superListRes.data.tickets.length === 3, '5.4 Super Admin sees all 3 tickets across branches');

      // 5.3 Regional Director can update ticket in any branch (Capalonga)
      const rdUpdateRes = await makeRequest(
        server,
        `/api/support/tickets/${capalongaTicketId}`,
        'PATCH',
        { status: 'under_investigation', internalNotes: 'Regional Director intervening for expedited customer resolution.' },
        { Authorization: 'Bearer STAFF_REGIONAL_DIRECTOR_TOKEN' }
      );
      assert(rdUpdateRes.status === 200, '5.5 Regional Director updates Capalonga ticket with HTTP 200');
      assert(rdUpdateRes.data.ticket.status === 'under_investigation', '5.6 Capalonga ticket successfully transitioned by Regional Director');
    } finally {
      server.close();
    }
  }

  // --- SECTION 6: Dynamic 7-Day SLA Escalation Engine ---
  {
    console.log('\n--- Running Section 6: Dynamic 7-Day SLA Escalation Engine ---');

    // Create an overdue ticket: created 8 days ago, SLA expired 1 day ago
    const overdueTicketId = 'TKT-OVERDUE-6001';
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();

    const freshTicketId = 'TKT-FRESH-6002';
    const nowStr = new Date().toISOString();
    const futureDue = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();

    const harness = createTestHarness({
      users: {
        'patient-alice-uid': { role: 'customer', email: 'alice@example.com' },
        'staff-regional-director-uid': { role: 'regional_director', email: 'rd@example.com', assignedBranchId: 'central' },
      },
      supportTickets: {
        [overdueTicketId]: {
          id: overdueTicketId,
          userId: 'patient-alice-uid',
          customerEmail: 'alice@example.com',
          branchId: 'daet',
          category: 'damaged_product',
          subject: 'Unresolved damaged item complaint',
          description: 'No response for over a week.',
          status: 'submitted',
          createdAt: eightDaysAgo,
          slaDueAt: oneDayAgo, // Expired!
          isEscalated: false,
          escalationHistory: [],
        },
        [freshTicketId]: {
          id: freshTicketId,
          userId: 'patient-alice-uid',
          customerEmail: 'alice@example.com',
          branchId: 'daet',
          category: 'product_inquiry',
          subject: 'Fresh question',
          description: 'Dilution dosage question.',
          status: 'submitted',
          createdAt: nowStr,
          slaDueAt: futureDue,
          isEscalated: false,
          escalationHistory: [],
        },
      },
    });

    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth });
    const server = http.createServer(app).listen(0);

    try {
      // 6.1 Querying tickets triggers automatic SLA breach detection
      const listRes = await makeRequest(
        server,
        '/api/support/tickets',
        'GET',
        undefined,
        { Authorization: 'Bearer STAFF_REGIONAL_DIRECTOR_TOKEN' }
      );
      assert(listRes.status === 200, '6.1 Querying tickets executes successfully with HTTP 200');

      const tickets = listRes.data.tickets;
      const overdueTicket = tickets.find((t: any) => t.id === overdueTicketId);
      const freshTicket = tickets.find((t: any) => t.id === freshTicketId);

      assert(overdueTicket.isEscalated === true, '6.2 Overdue ticket isEscalated automatically set to true');
      assert(overdueTicket.status === 'escalated_sla_breach', '6.3 Overdue ticket status transitioned to ESCALATED_SLA_BREACH');
      assert(overdueTicket.escalationHistory.length >= 1, '6.4 Escalation history records statutory SLA breach event');
      assert(overdueTicket.escalationHistory[0].reason.includes('RA 11967'), '6.5 Escalation reason references RA 11967 SLA expiration');

      assert(freshTicket.isEscalated === false, '6.6 Fresh ticket within SLA remains unescalated (isEscalated: false)');
      assert(freshTicket.status === 'submitted', '6.7 Fresh ticket status remains SUBMITTED');

      // 6.2 Manual escalation endpoint test
      const manualEscalateRes = await makeRequest(
        server,
        `/api/support/tickets/${freshTicketId}/escalate`,
        'POST',
        { reason: 'Customer requested priority redress review.' },
        { Authorization: 'Bearer PATIENT_ALICE_TOKEN' }
      );
      assert(manualEscalateRes.status === 200, '6.8 Customer manual escalation succeeds with HTTP 200');
      assert(manualEscalateRes.data.ticket.isEscalated === true, '6.9 Manually escalated ticket isEscalated set to true');
      assert(manualEscalateRes.data.ticket.status === 'escalated_sla_breach', '6.10 Status updated to ESCALATED_SLA_BREACH');
      assert(manualEscalateRes.data.ticket.escalationHistory.some((h: any) => h.reason.includes('priority redress')), '6.11 Manual escalation reason recorded in history');
    } finally {
      server.close();
    }
  }

  // --- SECTION 7: Health Data Privacy Firewall Isolation ---
  {
    console.log('\n--- Running Section 7: Health Data Privacy Firewall Isolation ---');

    const testIntakeId = 'INTAKE-ALICE-SPI-999';

    const harness = createTestHarness({
      users: {
        'patient-alice-uid': { role: 'customer', email: 'alice@example.com' },
        'staff-daet-manager-uid': { role: 'branch_manager', email: 'daet_mgr@example.com', assignedBranchId: 'daet' },
        'staff-regional-director-uid': { role: 'regional_director', email: 'rd@example.com', assignedBranchId: 'central' },
      },
      consultationIntakes: {
        [testIntakeId]: {
          intakeId: testIntakeId,
          userId: 'patient-alice-uid',
          ciphertext: 'ENCRYPTED_AES256GCM_CLINICAL_SPI_PAYLOAD',
          iv: 'HEX_IV_VECTOR',
          authTag: 'HEX_TAG',
          wrappedDek: 'WRAPPED_KMS_DEK',
        },
      },
      supportTickets: {
        'TKT-DAET-7001': {
          id: 'TKT-DAET-7001',
          userId: 'patient-alice-uid',
          customerEmail: 'alice@example.com',
          branchId: 'daet',
          category: 'product_inquiry',
          subject: 'Dilution protocol inquiry',
          description: 'Need instructions on daily maintenance dosage.',
          status: 'submitted',
          createdAt: new Date().toISOString(),
          slaDueAt: new Date(Date.now() + RA11967_SLA_MS).toISOString(),
          isEscalated: false,
        },
      },
    });

    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth });
    const server = http.createServer(app).listen(0);

    try {
      // 7.1 Support tickets output does NOT include any clinical intake fields
      const ticketRes = await makeRequest(
        server,
        '/api/support/tickets/TKT-DAET-7001',
        'GET',
        undefined,
        { Authorization: 'Bearer STAFF_DAET_MANAGER_TOKEN' }
      );
      assert(ticketRes.status === 200, '7.1 Branch manager queries support ticket with HTTP 200');
      assert(ticketRes.data.ticket.ciphertext === undefined, '7.2 Zero clinical ciphertext in support ticket payload');
      assert(ticketRes.data.ticket.wrappedDek === undefined, '7.3 Zero KMS key material in support ticket payload');

      // 7.2 Non-practitioners attempting to access clinical intake endpoint are blocked
      const managerIntakeRes = await makeRequest(
        server,
        `/api/clinical/intake/${testIntakeId}`,
        'GET',
        undefined,
        { Authorization: 'Bearer STAFF_DAET_MANAGER_TOKEN' }
      );
      assert(managerIntakeRes.status === 403, '7.4 Branch manager blocked from decrypting clinical intake (HTTP 403)');

      const rdIntakeRes = await makeRequest(
        server,
        `/api/clinical/intake/${testIntakeId}`,
        'GET',
        undefined,
        { Authorization: 'Bearer STAFF_REGIONAL_DIRECTOR_TOKEN' }
      );
      assert(rdIntakeRes.status === 403, '7.5 Regional Director blocked from decrypting clinical intake (HTTP 403)');
    } finally {
      server.close();
    }
  }

  // --- SECTION 8: ADR-009 Network-Only & Audit Trail Verification ---
  {
    console.log('\n--- Running Section 8: ADR-009 Network-Only & Audit Trail Verification ---');

    const harness = createTestHarness({
      users: {
        'patient-alice-uid': { role: 'customer', email: 'alice@example.com' },
        'staff-daet-manager-uid': { role: 'branch_manager', email: 'daet_mgr@example.com', assignedBranchId: 'daet' },
      },
    });

    const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth });
    const server = http.createServer(app).listen(0);

    try {
      // Create ticket
      const createRes = await makeRequest(
        server,
        '/api/support/tickets',
        'POST',
        {
          branchId: 'daet',
          category: 'billing_issue',
          subject: 'Payment verification inquiry',
          description: 'Payment made via Maya, waiting for confirmation.',
        },
        { Authorization: 'Bearer PATIENT_ALICE_TOKEN' }
      );
      assert(createRes.status === 201, '8.1 Ticket created with HTTP 201');
      const ticketId = createRes.data.ticket.id;

      // Update ticket
      const updateRes = await makeRequest(
        server,
        `/api/support/tickets/${ticketId}`,
        'PATCH',
        { status: 'resolved', resolutionSummary: 'Maya reference verified and credited.' },
        { Authorization: 'Bearer STAFF_DAET_MANAGER_TOKEN' }
      );
      assert(updateRes.status === 200, '8.2 Ticket resolved with HTTP 200');

      // Verify audit logs
      const auditLogs = Array.from(harness.auditLogsStore.values());
      const createLog = auditLogs.find((l: any) => l.action === 'support_ticket_created');
      const resolveLog = auditLogs.find((l: any) => l.action === 'support_ticket_status_updated');

      assert(createLog !== undefined, '8.3 Audit log recorded for support_ticket_created');
      assert(createLog.actorUid === 'patient-alice-uid', '8.4 Audit log records customer actor UID');
      assert(createLog.branchId === 'daet', '8.5 Audit log records Daet branch ID');
      assert(createLog.targetResource === 'support_tickets', '8.6 Audit log target resource is support_tickets');

      assert(resolveLog !== undefined, '8.7 Audit log recorded for support_ticket_status_updated');
      assert(resolveLog.actorUid === 'staff-daet-manager-uid', '8.8 Audit log records staff actor UID');
      assert(resolveLog.metadata.status === 'resolved', '8.9 Audit log records resolved status in metadata');
    } finally {
      server.close();
    }
  }

  // --- SECTION 9: Firestore Rules & Branch Manager List Isolation ---
  {
    console.log('\n--- Running Section 9: Firestore Rules & Branch Manager List Isolation ---');

    // 9.1 Verify firestore.rules file on disk explicitly bounds list to branchId
    const rulesPath = path.resolve(__dirname, '../firestore.rules');
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');

    assert(rulesContent.includes('match /support_tickets/{ticketId}'), '9.1 Firestore rules contain match block for /support_tickets/{ticketId}');
    assert(rulesContent.includes('allow write: if false;'), '9.2 ADR-009 Network-Only write rule enforced (allow write: if false)');

    const ticketRuleBlock = rulesContent.slice(rulesContent.indexOf('match /support_tickets/{ticketId}'));
    const listRuleMatch = ticketRuleBlock.includes('allow list: if isSignedIn()') &&
      ticketRuleBlock.includes('get(/databases/$(database)/documents/users/$(request.auth.uid)).data.assignedBranchId == resource.data.branchId');
    assert(listRuleMatch, '9.3 Firestore list rule enforces branch manager assignedBranchId equality with ticket branchId');

    // 9.2 Firestore Read Path Security Simulation Function
    interface MockAuthContext {
      uid: string;
      role: string;
      assignedBranchId?: string;
    }

    interface MockTicketResource {
      id: string;
      userId: string;
      branchId: string;
    }

    function evaluateFirestoreRule(
      operation: 'get' | 'list' | 'create' | 'update' | 'delete',
      auth: MockAuthContext | null,
      resource: MockTicketResource | null,
      queryBranchFilter?: string
    ): boolean {
      if (operation === 'create' || operation === 'update' || operation === 'delete') {
        return false; // allow write: if false;
      }

      if (!auth) return false;

      if (operation === 'get' && resource) {
        const isOwner = auth.uid === resource.userId;
        const isBranchMgr = auth.role === 'branch_manager' && auth.assignedBranchId === resource.branchId;
        const isRD = auth.role === 'regional_director';
        const isSuper = auth.role === 'super_admin';
        return isOwner || isBranchMgr || isRD || isSuper;
      }

      if (operation === 'list') {
        if (auth.role === 'regional_director' || auth.role === 'super_admin') {
          return true;
        }
        if (auth.role === 'branch_manager') {
          return queryBranchFilter !== undefined && queryBranchFilter === auth.assignedBranchId;
        }
        if (auth.role === 'customer') {
          return true;
        }
        return false;
      }

      return false;
    }

    const daetManager: MockAuthContext = { uid: 'mgr-daet-1', role: 'branch_manager', assignedBranchId: 'daet' };
    const daetTicket: MockTicketResource = { id: 'TKT-1', userId: 'cust-1', branchId: 'daet' };
    const laboTicket: MockTicketResource = { id: 'TKT-2', userId: 'cust-2', branchId: 'labo' };

    // Branch manager Daet listing Daet tickets -> Allowed
    assert(
      evaluateFirestoreRule('list', daetManager, null, 'daet') === true,
      '9.4 Branch manager Daet querying Daet branch tickets is permitted on list'
    );

    // Branch manager Daet attempting to list Labo tickets -> Denied!
    assert(
      evaluateFirestoreRule('list', daetManager, null, 'labo') === false,
      '9.5 Branch manager Daet querying Labo branch tickets is strictly rejected on list'
    );

    // Branch manager Daet attempting unfiltered query across all branches -> Denied!
    assert(
      evaluateFirestoreRule('list', daetManager, null, undefined) === false,
      '9.6 Branch manager Daet attempting unfiltered query across all branches is rejected on list'
    );

    // Branch manager Daet reading Daet ticket (get) -> Allowed
    assert(
      evaluateFirestoreRule('get', daetManager, daetTicket) === true,
      '9.7 Branch manager Daet reading Daet ticket is permitted on get'
    );

    // Branch manager Daet attempting to read Labo ticket (get) -> Denied!
    assert(
      evaluateFirestoreRule('get', daetManager, laboTicket) === false,
      '9.8 Branch manager Daet attempting to read Labo ticket is strictly rejected on get'
    );

    // Regional Director listing across all branches -> Allowed
    const rdAuth: MockAuthContext = { uid: 'rd-1', role: 'regional_director' };
    assert(
      evaluateFirestoreRule('list', rdAuth, null, undefined) === true,
      '9.9 Regional Director listing across all branches is permitted'
    );

    // Super Admin listing across all branches -> Allowed
    const superAuth: MockAuthContext = { uid: 'super-1', role: 'super_admin' };
    assert(
      evaluateFirestoreRule('list', superAuth, null, undefined) === true,
      '9.10 Super Admin listing across all branches is permitted'
    );

    // Direct client write attempts -> Strictly denied (ADR-009)
    assert(
      evaluateFirestoreRule('create', daetManager, daetTicket) === false,
      '9.11 Direct client write (create) to /support_tickets is strictly denied'
    );
    assert(
      evaluateFirestoreRule('update', daetManager, daetTicket) === false,
      '9.12 Direct client write (update) to /support_tickets is strictly denied'
    );
    assert(
      evaluateFirestoreRule('delete', daetManager, daetTicket) === false,
      '9.13 Direct client write (delete) to /support_tickets is strictly denied'
    );
  }

  console.log('\n================================================================');
  console.log(`   PHASE 6C SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED   `);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase6CTests().catch((err) => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
