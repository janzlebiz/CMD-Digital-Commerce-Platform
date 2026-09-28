/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

process.env.NODE_ENV = 'test';

import {
  createExpressApp,
  SUPPORTED_BRANCH_IDS,
  PRODUCTS_CATALOG,
} from '../server';
import http from 'http';
import crypto from 'crypto';

function createTestHarness() {
  const usersStore = new Map<string, any>([
    ['staff-daet-manager-uid', { uid: 'staff-daet-manager-uid', email: 'manager.daet@hcicmd.ph', role: 'branch_manager', assignedBranchId: 'daet' }],
    ['staff-labo-manager-uid', { uid: 'staff-labo-manager-uid', email: 'manager.labo@hcicmd.ph', role: 'branch_manager', assignedBranchId: 'labo' }],
    ['staff-regional-director-uid', { uid: 'staff-regional-director-uid', email: 'rd@hcicmd.ph', role: 'regional_director' }],
    ['staff-super-admin-uid', { uid: 'staff-super-admin-uid', email: 'admin@hcicmd.ph', role: 'super_admin' }],
    ['customer-alice-uid', { uid: 'customer-alice-uid', email: 'alice@example.ph', role: 'customer' }],
    ['customer-bob-uid', { uid: 'customer-bob-uid', email: 'bob@example.ph', role: 'customer' }],
    ['practitioner-daet-01', { uid: 'practitioner-daet-01', email: 'elena.santos@hcicmd.ph', role: 'practitioner' }],
    ['practitioner-unassigned-uid', { uid: 'practitioner-unassigned-uid', email: 'unassigned@hcicmd.ph', role: 'practitioner' }],
  ]);

  const ordersStore = new Map<string, any>();
  const inventoryStore = new Map<string, any>();
  const productBatchesStore = new Map<string, any>();
  const branchBatchInventoryStore = new Map<string, any>();
  const inventoryAdjustmentsStore = new Map<string, any>();
  const stockTransfersStore = new Map<string, any>();
  const b2bStockistsStore = new Map<string, any>();
  const b2bLedgerStore = new Map<string, any>();
  const supportTicketsStore = new Map<string, any>();
  const expensesStore = new Map<string, any>();
  const workshopsStore = new Map<string, any>();
  const workshopRegistrationsStore = new Map<string, any>();
  const consultationIntakesStore = new Map<string, any>();
  const consultationAppointmentsStore = new Map<string, any>();
  const consultationAssignmentsStore = new Map<string, any>();
  const bookedSlotsStore = new Map<string, any>();
  const auditLogsStore = new Map<string, any>();
  const docVersions = new Map<string, number>();

  const mockDb: any = {
    _getStoreForCollection: (colName: string) => {
      if (colName === 'users') return usersStore;
      if (colName === 'orders') return ordersStore;
      if (colName === 'inventory') return inventoryStore;
      if (colName === 'product_batches') return productBatchesStore;
      if (colName === 'branch_batch_inventory') return branchBatchInventoryStore;
      if (colName === 'inventory_adjustments') return inventoryAdjustmentsStore;
      if (colName === 'stock_transfers') return stockTransfersStore;
      if (colName === 'b2b_stockists') return b2bStockistsStore;
      if (colName === 'b2b_ledger') return b2bLedgerStore;
      if (colName === 'support_tickets') return supportTicketsStore;
      if (colName === 'expenses') return expensesStore;
      if (colName === 'workshops') return workshopsStore;
      if (colName === 'workshop_registrations') return workshopRegistrationsStore;
      if (colName === 'consultation_intakes') return consultationIntakesStore;
      if (colName === 'consultation_appointments') return consultationAppointmentsStore;
      if (colName === 'consultation_assignments') return consultationAssignmentsStore;
      if (colName === 'booked_slots') return bookedSlotsStore;
      if (colName === 'audit_logs') return auditLogsStore;
      return new Map<string, any>();
    },
    collection: (colName: string) => {
      const targetStore = mockDb._getStoreForCollection(colName);

      const queryObj: any = {
        _filters: [] as Array<{ field: string; op: string; value: any }>,
        where: (field: string, op: string, value: any) => {
          queryObj._filters.push({ field, op, value });
          return queryObj;
        },
        orderBy: () => queryObj,
        limit: () => queryObj,
        get: async () => {
          let docs = Array.from(targetStore.values());
          for (const f of queryObj._filters) {
            if (f.op === '==') {
              docs = docs.filter((d: any) => d[f.field] === f.value);
            }
            if (f.op === '>=') {
              docs = docs.filter((d: any) => d[f.field] >= f.value);
            }
          }
          return {
            empty: docs.length === 0,
            size: docs.length,
            docs: docs.map((d: any) => {
              const docId = d.id || d.uid || 'doc-id';
              return {
                id: docId,
                data: () => ({ ...d }),
                exists: true,
                ref: queryObj.doc(docId),
              };
            }),
            forEach: (cb: (doc: any) => void) => {
              docs.forEach((d: any) => {
                const docId = d.id || d.uid || 'doc-id';
                cb({
                  id: docId,
                  data: () => ({ ...d }),
                  exists: true,
                  ref: queryObj.doc(docId),
                });
              });
            },
          };
        },
        doc: (docId: string) => {
          const docRef: any = {
            _colName: colName,
            _docId: docId,
            id: docId,
            get: async () => {
              const data = targetStore.get(docId);
              return {
                exists: !!data,
                id: docId,
                data: () => (data ? { ...data } : undefined),
                ref: docRef,
              };
            },
            set: async (data: any, setOptions?: any) => {
              if (setOptions && setOptions.merge) {
                const existing = targetStore.get(docId) || {};
                targetStore.set(docId, { ...existing, ...data });
              } else {
                targetStore.set(docId, { ...data });
              }
              const path = `${colName}/${docId}`;
              docVersions.set(path, (docVersions.get(path) || 1) + 1);
              return { writeTime: new Date() };
            },
            update: async (data: any) => {
              const existing = targetStore.get(docId);
              if (!existing) throw new Error(`Document ${docId} does not exist`);
              targetStore.set(docId, { ...existing, ...data });
              const path = `${colName}/${docId}`;
              docVersions.set(path, (docVersions.get(path) || 1) + 1);
              return { writeTime: new Date() };
            },
            delete: async () => {
              targetStore.delete(docId);
              const path = `${colName}/${docId}`;
              docVersions.set(path, (docVersions.get(path) || 1) + 1);
              return { writeTime: new Date() };
            },
          };
          return docRef;
        },
      };

      return queryObj;
    },
    runTransaction: async (updateFunction: (transaction: any) => Promise<any>, maxAttempts = 15) => {
      let attempt = 0;
      while (attempt < maxAttempts) {
        attempt++;
        const readVersions = new Map<string, number>();
        const stagedWrites = [] as Array<{ docRef: any; data: any; options?: any }>;
        const stagedDeletes = [] as Array<{ docRef: any }>;

        const transaction = {
          get: async (refOrQuery: any) => {
            if (!refOrQuery) return null;
            if (refOrQuery._colName && (refOrQuery._docId || refOrQuery.id)) {
              const col = refOrQuery._colName;
              const docId = refOrQuery._docId || refOrQuery.id;
              const path = `${col}/${docId}`;
              const currentVer = docVersions.get(path) || 1;
              readVersions.set(path, currentVer);
              const store = mockDb._getStoreForCollection(col);
              const data = store.get(docId);
              return {
                exists: !!data,
                id: docId,
                data: () => (data ? { ...data } : undefined),
                ref: refOrQuery,
              };
            }
            if (typeof refOrQuery.get === 'function') {
              return refOrQuery.get();
            }
            return null;
          },
          set: (docRef: any, data: any, options?: any) => {
            stagedWrites.push({ docRef, data, options });
          },
          update: (docRef: any, data: any) => {
            stagedWrites.push({ docRef, data, options: { merge: true } });
          },
          delete: (docRef: any) => {
            stagedDeletes.push({ docRef });
          },
        };

        try {
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
              throw new Error('Transaction conflict: maximum retry attempts exceeded.');
            }
            await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 10) + 2));
            continue;
          }

          for (const write of stagedWrites) {
            const col = write.docRef._colName || 'default';
            const docId = write.docRef.id || write.docRef._docId;
            const store = mockDb._getStoreForCollection(col);
            if (write.options && write.options.merge) {
              store.set(docId, { ...(store.get(docId) || {}), ...write.data });
            } else {
              store.set(docId, { ...write.data });
            }
            const path = `${col}/${docId}`;
            docVersions.set(path, (docVersions.get(path) || 1) + 1);
          }

          for (const del of stagedDeletes) {
            const col = del.docRef._colName || 'default';
            const docId = del.docRef.id || del.docRef._docId;
            const store = mockDb._getStoreForCollection(col);
            store.delete(docId);
            const path = `${col}/${docId}`;
            docVersions.set(path, (docVersions.get(path) || 1) + 1);
          }

          return result;
        } catch (err: any) {
          if (err.message && err.message.includes('Transaction conflict') && attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 10) + 2));
            continue;
          }
          throw err;
        }
      }
      throw new Error('Transaction failed after maximum retries due to persistent OCC conflicts.');
    },
  };

  const mockAuth: any = {
    verifyIdToken: async (token: string) => {
      if (token === 'DAET_MANAGER_TOKEN') {
        return { uid: 'staff-daet-manager-uid', email: 'manager.daet@hcicmd.ph' };
      }
      if (token === 'LABO_MANAGER_TOKEN') {
        return { uid: 'staff-labo-manager-uid', email: 'manager.labo@hcicmd.ph' };
      }
      if (token === 'REGIONAL_DIRECTOR_TOKEN') {
        return { uid: 'staff-regional-director-uid', email: 'rd@hcicmd.ph' };
      }
      if (token === 'SUPER_ADMIN_TOKEN') {
        return { uid: 'staff-super-admin-uid', email: 'admin@hcicmd.ph' };
      }
      if (token === 'CUSTOMER_ALICE_TOKEN') {
        return { uid: 'customer-alice-uid', email: 'alice@example.ph' };
      }
      if (token === 'CUSTOMER_BOB_TOKEN') {
        return { uid: 'customer-bob-uid', email: 'bob@example.ph' };
      }
      if (token === 'PRACTITIONER_ASSIGNED_TOKEN') {
        return { uid: 'practitioner-daet-01', email: 'elena.santos@hcicmd.ph' };
      }
      if (token === 'PRACTITIONER_UNASSIGNED_TOKEN') {
        return { uid: 'practitioner-unassigned-uid', email: 'unassigned@hcicmd.ph' };
      }
      throw new Error('Firebase ID token is invalid or expired.');
    },
  };

  const mockKmsMasterSecret = crypto.createHash('sha256').update('kms-master-test-key-security-m7').digest();
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

  return {
    usersStore,
    ordersStore,
    inventoryStore,
    productBatchesStore,
    branchBatchInventoryStore,
    inventoryAdjustmentsStore,
    stockTransfersStore,
    b2bStockistsStore,
    b2bLedgerStore,
    supportTicketsStore,
    expensesStore,
    workshopsStore,
    workshopRegistrationsStore,
    consultationIntakesStore,
    consultationAppointmentsStore,
    consultationAssignmentsStore,
    bookedSlotsStore,
    auditLogsStore,
    mockDb,
    mockAuth,
    mockKms,
  };
}

function makeRequest(
  server: http.Server,
  path: string,
  method: string = 'GET',
  body: any = null,
  headers: Record<string, string> = {}
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const addr = server.address() as any;
    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: addr.port,
      path,
      method,
      headers: { ...headers, 'Content-Type': 'application/json' },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 500, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode || 500, data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ PASS: ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${msg}`);
  }
}

async function runTests() {
  console.log('========================================================================');
  console.log(' Phase 7 — Milestone 7: Security, IDOR Protection & Health Data Privacy');
  console.log('========================================================================\n');

  const harness = createTestHarness();
  const app = createExpressApp({
    db: harness.mockDb,
    auth: harness.mockAuth,
    kmsClient: harness.mockKms,
  });
  const server = http.createServer(app);
  await new Promise<void>((res) => server.listen(0, '127.0.0.1', res));

  try {
    const nowIso = new Date().toISOString();

    // -----------------------------------------------------------------------------------------
    // SECTION 1: Authentication & Server-Authoritative Operational Write Defense
    // -----------------------------------------------------------------------------------------

    // Assertion 1: Missing, malformed, or invalid authentication tokens rejected with 401 & zero mutation
    const initialTicketCount = harness.supportTicketsStore.size;
    const initialExpenseCount = harness.expensesStore.size;

    const noAuthRes = await makeRequest(server, '/api/support/tickets', 'POST', {
      category: 'product_inquiry',
      branchId: 'daet',
      description: 'Unauthenticated ticket submission attempt',
    });
    const emptyBearerRes = await makeRequest(server, '/api/finance/expenses', 'POST', {
      branchId: 'daet',
      category: 'utilities',
      description: 'Unauthenticated expense entry',
      amount: 1500,
      expenseStatus: 'paid',
    }, { Authorization: 'Bearer ' });
    const invalidTokenRes = await makeRequest(server, '/api/inventory', 'GET', null, {
      Authorization: 'Bearer FORGED_EXPIRED_TOKEN_ABC123',
    });

    assert(
      noAuthRes.status === 401 &&
      emptyBearerRes.status === 401 &&
      invalidTokenRes.status === 401 &&
      harness.supportTicketsStore.size === initialTicketCount &&
      harness.expensesStore.size === initialExpenseCount,
      '1. Authentication enforcement: Missing, empty, or invalid Bearer tokens rejected with HTTP 401 and zero mutation'
    );

    // Assertion 2: Role escalation prevention — Unprivileged customer blocked from staff operations with 403 & zero mutation
    const custExpenseRes = await makeRequest(server, '/api/finance/expenses', 'POST', {
      branchId: 'daet',
      category: 'equipment',
      description: 'Customer attempted expense recording',
      amount: 5000,
      expenseStatus: 'paid',
    }, { Authorization: 'Bearer CUSTOMER_ALICE_TOKEN' });

    const custStockistRes = await makeRequest(server, '/api/b2b/stockists', 'POST', {
      stockistId: 'STK-FORGED-001',
      businessName: 'Forged Stockist',
      branchId: 'daet',
      tier: 'tier_1',
    }, { Authorization: 'Bearer CUSTOMER_ALICE_TOKEN' });

    const custAdjRes = await makeRequest(server, '/api/inventory/adjustments', 'POST', {
      branchId: 'daet',
      skuId: 'hci-cmd-65ml',
      adjustmentType: 'physical_count_discrepancy',
      quantityChange: 10,
      reason: 'Customer unauthorized adjustment',
    }, { Authorization: 'Bearer CUSTOMER_ALICE_TOKEN' });

    assert(
      custExpenseRes.status === 403 &&
      custStockistRes.status === 403 &&
      custAdjRes.status === 403 &&
      harness.expensesStore.size === 0 &&
      !harness.b2bStockistsStore.has('STK-FORGED-001') &&
      harness.inventoryAdjustmentsStore.size === 0,
      '2. Role escalation prevention: Customer blocked from recording expenses, registering stockists, and inventory adjustments with 403 & zero mutation'
    );

    // Assertion 3: Server-authoritative writes — Real programmatic verification of firestore.rules
    const fs = await import('fs');
    const path = await import('path');
    const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');

    const operationalCollectionsLocked = [
      'orders',
      'inventory',
      'branch_batch_inventory',
      'product_batches',
      'inventory_adjustments',
      'consultation_intakes',
      'b2b_stockists',
      'b2b_ledger',
      'expenses',
    ];

    let allRulesValid = true;
    for (const col of operationalCollectionsLocked) {
      const targetStr = `match /${col}/`;
      const idx = rulesContent.indexOf(targetStr);
      if (idx === -1) {
        allRulesValid = false;
        break;
      }
      const nextMatchIdx = rulesContent.indexOf('match /', idx + targetStr.length);
      const blockContent = nextMatchIdx !== -1 
        ? rulesContent.slice(idx, nextMatchIdx) 
        : rulesContent.slice(idx);

      const hasDenyWrite = blockContent.includes('allow write: if false') || blockContent.includes('allow read, write: if false');
      if (!hasDenyWrite) {
        allRulesValid = false;
        break;
      }
    }

    assert(
      allRulesValid === true,
      '3. Server-authoritative write defense: Firestore security rules configure allow write: if false across all 9 operational collections (ADR-009)'
    );

    // -----------------------------------------------------------------------------------------
    // SECTION 2: Cross-Customer IDOR Protection
    // -----------------------------------------------------------------------------------------

    // Seed Alice's customer support ticket
    harness.supportTicketsStore.set('TCK-ALICE-001', {
      id: 'TCK-ALICE-001',
      ticketNumber: 'TKT-2026-0001',
      userId: 'customer-alice-uid',
      userEmail: 'alice@example.ph',
      branchId: 'daet',
      category: 'product_inquiry',
      subject: 'Dosage clarification for CMD drops',
      description: 'Private inquiry regarding CMD 65ml dosage with morning hydration',
      status: 'open',
      priority: 'medium',
      slaDueAt: new Date(Date.now() + 86400000).toISOString(),
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // Assertion 4: Cross-customer support ticket read IDOR blocked & zero sensitive data exposed
    const bobTicketReadRes = await makeRequest(
      server,
      '/api/support/tickets/TCK-ALICE-001',
      'GET',
      null,
      { Authorization: 'Bearer CUSTOMER_BOB_TOKEN' }
    );

    assert(
      bobTicketReadRes.status === 403 &&
      !bobTicketReadRes.data.ticket &&
      (!bobTicketReadRes.data.error || bobTicketReadRes.data.error.includes('Customer cannot view another user')),
      '4. Cross-customer IDOR: Bob is blocked from reading Alice’s support ticket with 403 Forbidden and zero field exposure'
    );

    // Assertion 5: Cross-customer support ticket mutation IDOR blocked & zero state change
    const aliceTicketBefore = { ...harness.supportTicketsStore.get('TCK-ALICE-001') };
    const bobTicketPatchRes = await makeRequest(
      server,
      '/api/support/tickets/TCK-ALICE-001',
      'PATCH',
      {
        status: 'resolved',
        resolutionSummary: 'Unauthorized malicious resolution by Customer Bob',
        internalNotes: 'Tampered note',
      },
      { Authorization: 'Bearer CUSTOMER_BOB_TOKEN' }
    );
    const aliceTicketAfter = harness.supportTicketsStore.get('TCK-ALICE-001');

    assert(
      bobTicketPatchRes.status === 403 &&
      aliceTicketAfter.status === aliceTicketBefore.status &&
      aliceTicketAfter.status === 'open' &&
      aliceTicketAfter.updatedAt === aliceTicketBefore.updatedAt &&
      !aliceTicketAfter.resolutionSummary,
      '5. Cross-customer IDOR mutation defense: Customer Bob cannot update or resolve Alice’s support ticket with 403 and zero mutation'
    );

    // Seed Alice's workshop registration
    harness.workshopsStore.set('wk-01-daet', {
      id: 'wk-01-daet',
      title: 'Daet Trace Mineral Science',
      branchId: 'daet',
      capacity: 30,
      seatsAllocated: 1,
      createdAt: nowIso,
    });
    harness.workshopRegistrationsStore.set('REG-ALICE-001', {
      id: 'REG-ALICE-001',
      workshopId: 'wk-01-daet',
      userId: 'customer-alice-uid',
      status: 'confirmed',
      fullName: 'Alice Customer',
      email: 'alice@example.ph',
      signature: 'VALID_HMAC_SIG_ALICE',
      createdAt: nowIso,
    });

    // Assertion 6: Cross-customer workshop pass read IDOR blocked & zero pass exposure
    const bobPassReadRes = await makeRequest(
      server,
      '/api/workshops/registration/REG-ALICE-001/pass',
      'GET',
      null,
      { Authorization: 'Bearer CUSTOMER_BOB_TOKEN' }
    );

    assert(
      bobPassReadRes.status === 403 &&
      !bobPassReadRes.data.registration,
      '6. Cross-customer IDOR: Bob is blocked from viewing Alice’s workshop pass with 403 Forbidden and zero pass disclosure'
    );

    // Seed Alice's consultation appointment
    harness.consultationAppointmentsStore.set('APT-ALICE-001', {
      id: 'APT-ALICE-001',
      userId: 'customer-alice-uid',
      practitionerId: 'practitioner-daet-01',
      serviceCode: 'CNS-VIRTUAL',
      branchId: 'daet',
      scheduledDate: '2026-10-25',
      scheduledTime: '14:00',
      status: 'confirmed',
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    harness.bookedSlotsStore.set('practitioner-daet-01_2026-10-25_14:00', {
      slotId: 'practitioner-daet-01_2026-10-25_14:00',
      appointmentId: 'APT-ALICE-001',
      lockedAt: nowIso,
    });

    // Assertion 7: Cross-customer consultation cancellation IDOR blocked & zero mutation
    const bobCancelRes = await makeRequest(
      server,
      '/api/consultations/cancel',
      'POST',
      {
        appointmentId: 'APT-ALICE-001',
        reason: 'Malicious cancellation by Customer Bob',
      },
      { Authorization: 'Bearer CUSTOMER_BOB_TOKEN' }
    );
    const apptAfter = harness.consultationAppointmentsStore.get('APT-ALICE-001');
    const slotStillLocked = harness.bookedSlotsStore.has('practitioner-daet-01_2026-10-25_14:00');

    assert(
      bobCancelRes.status === 403 &&
      apptAfter.status === 'confirmed' &&
      slotStillLocked === true &&
      !apptAfter.cancellationReason,
      '7. Cross-customer IDOR: Bob cannot cancel Alice’s consultation appointment; slot lock retained and zero state mutation'
    );

    // -----------------------------------------------------------------------------------------
    // SECTION 3: Cross-Stockist & B2B IDOR Protection
    // -----------------------------------------------------------------------------------------

    // Seed Daet B2B Stockist authorized specifically for Alice
    harness.b2bStockistsStore.set('STK-DAET-001', {
      id: 'STK-DAET-001',
      businessName: 'Alice Daet Wellness Distribution',
      branchId: 'daet',
      tier: 'tier_1',
      status: 'active',
      depositBalance: 50000,
      creditLimit: 100000,
      outstandingBalance: 20000,
      availableCredit: 80000,
      creditMultiplier: 2.0,
      authorizedCustomerUid: 'customer-alice-uid',
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    harness.b2bLedgerStore.set('LEDGER-001', {
      id: 'LEDGER-001',
      stockistId: 'STK-DAET-001',
      branchId: 'daet',
      type: 'deposit',
      amount: 50000,
      depositAfter: 50000,
      outstandingAfter: 0,
      timestamp: nowIso,
      performedBy: 'staff-daet-manager-uid',
    });

    // Seed inventory batch for Daet branch
    harness.productBatchesStore.set('batch-daet-01', {
      id: 'batch-daet-01',
      skuId: 'hci-cmd-65ml',
      batchNumber: 'CMD-2026-DAET01',
      expiryDate: '2028-12-31',
      manufactureDate: '2026-01-01',
      status: 'released',
    });
    harness.branchBatchInventoryStore.set('daet_batch-daet-01', {
      id: 'daet_batch-daet-01',
      branchId: 'daet',
      batchId: 'batch-daet-01',
      skuId: 'hci-cmd-65ml',
      availableQuantity: 500,
      reservedQuantity: 0,
      allocatedQuantity: 0,
      status: 'released',
    });
    harness.inventoryStore.set('daet_hci-cmd-65ml', {
      id: 'daet_hci-cmd-65ml',
      branchId: 'daet',
      skuId: 'hci-cmd-65ml',
      availableQuantity: 500,
      reservedQuantity: 0,
    });

    // Assertion 8: Unauthorized customer blocked from viewing another stockist’s profile & ledger
    const bobStockistReadRes = await makeRequest(
      server,
      '/api/b2b/stockists/STK-DAET-001',
      'GET',
      null,
      { Authorization: 'Bearer CUSTOMER_BOB_TOKEN' }
    );
    const bobLedgerReadRes = await makeRequest(
      server,
      '/api/b2b/stockists/STK-DAET-001/ledger',
      'GET',
      null,
      { Authorization: 'Bearer CUSTOMER_BOB_TOKEN' }
    );

    assert(
      bobStockistReadRes.status === 403 &&
      bobLedgerReadRes.status === 403 &&
      !bobStockistReadRes.data.stockist &&
      !bobLedgerReadRes.data.ledger,
      '8. Cross-stockist IDOR: Unauthorized Customer Bob cannot read Alice’s B2B profile or financial ledger (HTTP 403 & zero exposure)'
    );

    // Assertion 9: Unauthorized customer blocked from ordering against another stockist & zero balance/inventory mutation
    const stockistBefore = { ...harness.b2bStockistsStore.get('STK-DAET-001') };
    const batchBefore = { ...harness.branchBatchInventoryStore.get('daet_batch-daet-01') };
    const ordersCountBefore = harness.ordersStore.size;
    const ledgerCountBefore = harness.b2bLedgerStore.size;

    const bobOrderRes = await makeRequest(
      server,
      '/api/b2b/orders',
      'POST',
      {
        stockistId: 'STK-DAET-001',
        branchId: 'daet',
        items: [{ skuId: 'hci-cmd-65ml', quantity: 50 }],
        paymentMethod: 'credit',
      },
      { Authorization: 'Bearer CUSTOMER_BOB_TOKEN' }
    );

    const stockistAfter = harness.b2bStockistsStore.get('STK-DAET-001');
    const batchAfter = harness.branchBatchInventoryStore.get('daet_batch-daet-01');

    assert(
      bobOrderRes.status === 403 &&
      harness.ordersStore.size === ordersCountBefore &&
      harness.b2bLedgerStore.size === ledgerCountBefore &&
      stockistAfter.outstandingBalance === stockistBefore.outstandingBalance &&
      stockistAfter.availableCredit === stockistBefore.availableCredit &&
      batchAfter.availableQuantity === batchBefore.availableQuantity &&
      batchAfter.reservedQuantity === batchBefore.reservedQuantity,
      '9. Cross-stockist order IDOR: Customer Bob cannot place B2B wholesale order against Alice’s stockist; zero financial or inventory mutation'
    );

    // Assertion 10: Practitioner role strictly blocked from B2B stockist operations
    const pracStockistRes = await makeRequest(
      server,
      '/api/b2b/stockists/STK-DAET-001',
      'GET',
      null,
      { Authorization: 'Bearer PRACTITIONER_ASSIGNED_TOKEN' }
    );
    const pracLedgerRes = await makeRequest(
      server,
      '/api/b2b/stockists/STK-DAET-001/ledger',
      'GET',
      null,
      { Authorization: 'Bearer PRACTITIONER_ASSIGNED_TOKEN' }
    );

    assert(
      pracStockistRes.status === 403 &&
      pracLedgerRes.status === 403,
      '10. Domain isolation: Practitioner blocked from commercial B2B stockist records and consignment ledgers (HTTP 403)'
    );

    // -----------------------------------------------------------------------------------------
    // SECTION 4: Cross-Branch IDOR & Parameter Tampering Protection
    // -----------------------------------------------------------------------------------------

    // Assertion 11: Cross-branch inventory query blocked for Branch Manager
    const daetManagerCrossInvRes = await makeRequest(
      server,
      '/api/inventory?branchId=labo',
      'GET',
      null,
      { Authorization: 'Bearer DAET_MANAGER_TOKEN' }
    );

    assert(
      daetManagerCrossInvRes.status === 403 &&
      !daetManagerCrossInvRes.data.inventory,
      '11. Cross-branch isolation: Daet Branch Manager is blocked from querying Labo branch inventory with HTTP 403'
    );

    // Seed Labo Stockist
    harness.b2bStockistsStore.set('STK-LABO-001', {
      id: 'STK-LABO-001',
      businessName: 'Labo Minerals Partner',
      branchId: 'labo',
      tier: 'tier_1',
      status: 'active',
      depositBalance: 40000,
      creditLimit: 80000,
      outstandingBalance: 10000,
      availableCredit: 70000,
      creditMultiplier: 2.0,
      authorizedCustomerUid: 'customer-bob-uid',
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // Assertion 12: Cross-branch stockist profile & ledger view blocked for Branch Manager
    const daetManagerLaboStockistRes = await makeRequest(
      server,
      '/api/b2b/stockists/STK-LABO-001',
      'GET',
      null,
      { Authorization: 'Bearer DAET_MANAGER_TOKEN' }
    );
    const daetManagerLaboLedgerRes = await makeRequest(
      server,
      '/api/b2b/stockists/STK-LABO-001/ledger',
      'GET',
      null,
      { Authorization: 'Bearer DAET_MANAGER_TOKEN' }
    );

    assert(
      daetManagerLaboStockistRes.status === 403 &&
      daetManagerLaboLedgerRes.status === 403,
      '12. Cross-branch B2B isolation: Daet Branch Manager is blocked from viewing Labo stockist profile and ledger with HTTP 403'
    );

    // Seed Labo Support Ticket
    harness.supportTicketsStore.set('TCK-LABO-001', {
      id: 'TCK-LABO-001',
      ticketNumber: 'TKT-2026-0002',
      userId: 'customer-bob-uid',
      userEmail: 'bob@example.ph',
      branchId: 'labo',
      category: 'delivery_delay',
      subject: 'Labo order delayed',
      status: 'open',
      priority: 'high',
      slaDueAt: new Date(Date.now() + 86400000).toISOString(),
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // Assertion 13: Cross-branch support ticket view & mutation blocked for Branch Manager & zero mutation
    const daetMgrTicketReadRes = await makeRequest(
      server,
      '/api/support/tickets/TCK-LABO-001',
      'GET',
      null,
      { Authorization: 'Bearer DAET_MANAGER_TOKEN' }
    );
    const laboTicketBefore = { ...harness.supportTicketsStore.get('TCK-LABO-001') };
    const daetMgrTicketPatchRes = await makeRequest(
      server,
      '/api/support/tickets/TCK-LABO-001',
      'PATCH',
      {
        status: 'resolved',
        resolutionSummary: 'Cross branch unauthorized update by Daet manager',
      },
      { Authorization: 'Bearer DAET_MANAGER_TOKEN' }
    );
    const laboTicketAfter = harness.supportTicketsStore.get('TCK-LABO-001');

    assert(
      daetMgrTicketReadRes.status === 403 &&
      daetMgrTicketPatchRes.status === 403 &&
      laboTicketAfter.status === 'open' &&
      laboTicketAfter.updatedAt === laboTicketBefore.updatedAt &&
      !laboTicketAfter.resolutionSummary,
      '13. Cross-branch support ticket isolation: Daet Manager cannot view or resolve Labo support ticket; zero ticket mutation'
    );

    // Assertion 14: Parameter tampering defeated — Server forces branch scope from authenticated user profile
    const daetMgrTamperedExpenseRes = await makeRequest(
      server,
      '/api/finance/expenses',
      'POST',
      {
        branchId: 'labo', // Tampered branch in body
        category: 'rent',
        description: 'Daet manager trying to book rent against Labo branch',
        amount: 12000,
        expenseStatus: 'paid',
      },
      { Authorization: 'Bearer DAET_MANAGER_TOKEN' }
    );

    // Also query expenses with tampered query parameter
    const daetMgrTamperedQueryRes = await makeRequest(
      server,
      '/api/finance/expenses?branchId=labo',
      'GET',
      null,
      { Authorization: 'Bearer DAET_MANAGER_TOKEN' }
    );

    assert(
      daetMgrTamperedExpenseRes.status === 403 &&
      daetMgrTamperedQueryRes.status === 200 &&
      daetMgrTamperedQueryRes.data.branchScope === 'daet',
      '14. Parameter tampering guard: Body/query branchId overrides rejected; manager assignedBranchId strictly enforced server-side'
    );

    // -----------------------------------------------------------------------------------------
    // SECTION 5: Health Data Privacy Firewall
    // -----------------------------------------------------------------------------------------

    // Seed Alice's highly sensitive clinical intake record directly in consultation_intakes
    const sensitiveClinicalIntake = {
      primaryComplaint: 'Severe chronic fatigue, electrolyte depletion, hypertension stage 1',
      medications: ['Amlodipine 5mg', 'Hydrochlorothiazide'],
      hydrationRoutine: '1.2 liters tap water daily',
      recommendedIonicDilution: '30 drops CMD daily divided into mineral water',
      sensitiveHealthNotes: 'Patient experiencing cardiac palpitations prior to CMD protocol calibration',
    };

    // Encrypt clinical intake using test KMS and AES-256-GCM
    const dek = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);
    let encryptedCiphertext = cipher.update(JSON.stringify(sensitiveClinicalIntake), 'utf8', 'base64');
    encryptedCiphertext += cipher.final('base64');
    const tag = cipher.getAuthTag();

    const [wrapRes] = await harness.mockKms.encrypt({ name: 'projects/test/key', plaintext: dek });
    const encryptedKeyBase64 = Buffer.from(wrapRes.ciphertext).toString('base64');

    harness.consultationIntakesStore.set('CNS-INT-ALICE-01', {
      id: 'CNS-INT-ALICE-01',
      userId: 'customer-alice-uid',
      practitionerId: 'practitioner-daet-01',
      scheduledAt: nowIso,
      deliveryMode: 'virtual',
      consentRecord: { purpose: 'Nutritional Wellness', version: 'v1.0' },
      encryptedClinicalIntake: {
        ciphertext: encryptedCiphertext,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        encryptedKey: encryptedKeyBase64,
        kmsKeyId: 'projects/test/key',
      },
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // Seed assignment between practitioner-daet-01 and customer-alice-uid
    harness.consultationAssignmentsStore.set('practitioner-daet-01_customer-alice-uid', {
      practitionerId: 'practitioner-daet-01',
      patientId: 'customer-alice-uid',
      active: true,
      assignedAt: nowIso,
    });

    // Assertion 15: Privacy firewall — CRM cohorts query strictly isolated from consultation intakes
    // Seed an order for Alice so she is tracked in CRM
    harness.ordersStore.set('ORD-ALICE-CRM-01', {
      id: 'ORD-ALICE-CRM-01',
      userId: 'customer-alice-uid',
      customerName: 'Alice Customer',
      customerEmail: 'alice@example.ph',
      branchId: 'daet',
      totalAmount: 2400,
      createdAt: nowIso,
      fulfillmentStatus: 'fulfilled',
      items: [{ skuId: 'hci-cmd-65ml', quantity: 2, price: 1200 }],
    });

    const crmOverviewRes = await makeRequest(
      server,
      '/api/crm/cohorts',
      'GET',
      null,
      { Authorization: 'Bearer REGIONAL_DIRECTOR_TOKEN' }
    );
    const crmCohortDetailRes = await makeRequest(
      server,
      '/api/crm/cohorts/repeat_retail',
      'GET',
      null,
      { Authorization: 'Bearer REGIONAL_DIRECTOR_TOKEN' }
    );

    const crmPayloadString = JSON.stringify({ overview: crmOverviewRes.data, detail: crmCohortDetailRes.data });
    const crmContainsClinicalLeak =
      crmPayloadString.includes('hypertension') ||
      crmPayloadString.includes('Amlodipine') ||
      crmPayloadString.includes('palpitations') ||
      crmPayloadString.includes('CNS-INT-ALICE-01');

    assert(
      crmOverviewRes.status === 200 &&
      crmCohortDetailRes.status === 200 &&
      crmContainsClinicalLeak === false,
      '15. Health Data Privacy Firewall: CRM cohorts analytics query authoritative commercial data only with zero consultation_intakes access'
    );

    // Assertion 16: Privacy firewall — Finance analytics strictly isolated from consultation intakes
    const financeMetricsRes = await makeRequest(
      server,
      '/api/finance/metrics',
      'GET',
      null,
      { Authorization: 'Bearer REGIONAL_DIRECTOR_TOKEN' }
    );
    const financeProfitabilityRes = await makeRequest(
      server,
      '/api/finance/commodity-profitability?commodityType=rice',
      'GET',
      null,
      { Authorization: 'Bearer REGIONAL_DIRECTOR_TOKEN' }
    );

    const financePayloadString = JSON.stringify({ metrics: financeMetricsRes.data, profit: financeProfitabilityRes.data });
    const financeContainsClinicalLeak =
      financePayloadString.includes('hypertension') ||
      financePayloadString.includes('Amlodipine') ||
      financePayloadString.includes('palpitations') ||
      financePayloadString.includes('CNS-INT-ALICE-01');

    assert(
      financeMetricsRes.status === 200 &&
      financeProfitabilityRes.status === 200 &&
      financeContainsClinicalLeak === false,
      '16. Health Data Privacy Firewall: Finance metrics calculate strictly from commercial orders and expenses with zero health data touch'
    );

    // Assertion 17: Privacy firewall — Support and inventory paths strictly isolated from consultation intakes
    const supportListRes = await makeRequest(
      server,
      '/api/support/tickets',
      'GET',
      null,
      { Authorization: 'Bearer REGIONAL_DIRECTOR_TOKEN' }
    );
    const inventoryListRes = await makeRequest(
      server,
      '/api/inventory',
      'GET',
      null,
      { Authorization: 'Bearer REGIONAL_DIRECTOR_TOKEN' }
    );

    const supportInvString = JSON.stringify({ support: supportListRes.data, inventory: inventoryListRes.data });
    const supportInvContainsClinicalLeak =
      supportInvString.includes('hypertension') ||
      supportInvString.includes('Amlodipine') ||
      supportInvString.includes('palpitations') ||
      supportInvString.includes('CNS-INT-ALICE-01');

    assert(
      supportListRes.status === 200 &&
      inventoryListRes.status === 200 &&
      supportInvContainsClinicalLeak === false,
      '17. Health Data Privacy Firewall: Support tickets and inventory endpoints return zero cross-domain health joins'
    );

    // Assertion 18: Clinical intake access blocked for administrative roles and unassigned practitioners
    const daetMgrIntakeRes = await makeRequest(
      server,
      '/api/clinical/intake/CNS-INT-ALICE-01',
      'GET',
      null,
      { Authorization: 'Bearer DAET_MANAGER_TOKEN' }
    );
    const rdIntakeRes = await makeRequest(
      server,
      '/api/clinical/intake/CNS-INT-ALICE-01',
      'GET',
      null,
      { Authorization: 'Bearer REGIONAL_DIRECTOR_TOKEN' }
    );
    const adminIntakeRes = await makeRequest(
      server,
      '/api/clinical/intake/CNS-INT-ALICE-01',
      'GET',
      null,
      { Authorization: 'Bearer SUPER_ADMIN_TOKEN' }
    );
    const unassignedPracIntakeRes = await makeRequest(
      server,
      '/api/clinical/intake/CNS-INT-ALICE-01',
      'GET',
      null,
      { Authorization: 'Bearer PRACTITIONER_UNASSIGNED_TOKEN' }
    );
    const bobIntakeRes = await makeRequest(
      server,
      '/api/clinical/intake/CNS-INT-ALICE-01',
      'GET',
      null,
      { Authorization: 'Bearer CUSTOMER_BOB_TOKEN' }
    );

    assert(
      daetMgrIntakeRes.status === 403 &&
      rdIntakeRes.status === 403 &&
      adminIntakeRes.status === 403 &&
      unassignedPracIntakeRes.status === 403 &&
      bobIntakeRes.status === 403,
      '18. Clinical Access Firewall: Administrative roles, unassigned practitioners, and other customers strictly denied access to clinical intakes (HTTP 403)'
    );

    // Assertion 19: Audit log sanitization proves zero health field leakage in audit trails
    // Alice saves an intake using authorized endpoint
    const saveIntakeRes = await makeRequest(
      server,
      '/api/clinical/intake/save',
      'POST',
      {
        clinicalIntake: {
          condition: 'Dehydration',
          dietaryHabits: 'Low potassium intake',
          waterIntakeLiters: 1.5,
          symptoms: 'Mild muscle cramping',
        },
      },
      { Authorization: 'Bearer CUSTOMER_ALICE_TOKEN' }
    );

    // Inspect the generated audit log
    const auditLogs = Array.from(harness.auditLogsStore.values());
    const intakeAuditEvent = auditLogs.find((l) => l.action === 'clinical_intake_created');

    let auditLogIsClean = false;
    if (intakeAuditEvent && intakeAuditEvent.metadata) {
      const metaKeys = Object.keys(intakeAuditEvent.metadata).map((k) => k.toLowerCase());
      const hasClinicalKey = metaKeys.some((k) =>
        k.includes('condition') ||
        k.includes('dietary') ||
        k.includes('water') ||
        k.includes('symptom') ||
        k.includes('clinical') ||
        k.includes('intake')
      );
      auditLogIsClean = !hasClinicalKey;
    }

    assert(
      saveIntakeRes.status === 200 &&
      !!intakeAuditEvent &&
      auditLogIsClean === true,
      '19. Statutory Audit Privacy: Audit log sanitizer strips clinical/health metadata, ensuring zero PII/PHI leakage in logs'
    );

    // -----------------------------------------------------------------------------------------
    // SECTION 6: Authorized Request Regressions
    // -----------------------------------------------------------------------------------------

    // Assertion 20: Legitimate authorized requests succeed without false positives
    // 20a. Alice reads her own clinical intake
    const aliceSelfIntakeRes = await makeRequest(
      server,
      '/api/clinical/intake/CNS-INT-ALICE-01',
      'GET',
      null,
      { Authorization: 'Bearer CUSTOMER_ALICE_TOKEN' }
    );

    // 20b. Assigned practitioner reads Alice's clinical intake
    const assignedPracIntakeRes = await makeRequest(
      server,
      '/api/clinical/intake/CNS-INT-ALICE-01',
      'GET',
      null,
      { Authorization: 'Bearer PRACTITIONER_ASSIGNED_TOKEN' }
    );

    // 20c. Alice reads her own workshop pass
    const alicePassRes = await makeRequest(
      server,
      '/api/workshops/registration/REG-ALICE-001/pass',
      'GET',
      null,
      { Authorization: 'Bearer CUSTOMER_ALICE_TOKEN' }
    );

    // 20d. Daet Branch Manager reads Daet inventory
    const daetMgrOwnInvRes = await makeRequest(
      server,
      '/api/inventory?branchId=daet',
      'GET',
      null,
      { Authorization: 'Bearer DAET_MANAGER_TOKEN' }
    );

    // 20e. Alice reads her own authorized stockist profile
    const aliceOwnStockistRes = await makeRequest(
      server,
      '/api/b2b/stockists/STK-DAET-001',
      'GET',
      null,
      { Authorization: 'Bearer CUSTOMER_ALICE_TOKEN' }
    );

    assert(
      aliceSelfIntakeRes.status === 200 &&
      aliceSelfIntakeRes.data.decryptedClinicalIntake?.primaryComplaint === sensitiveClinicalIntake.primaryComplaint &&
      assignedPracIntakeRes.status === 200 &&
      assignedPracIntakeRes.data.decryptedClinicalIntake?.medications?.[0] === 'Amlodipine 5mg' &&
      alicePassRes.status === 200 &&
      alicePassRes.data.registration?.id === 'REG-ALICE-001' &&
      daetMgrOwnInvRes.status === 200 &&
      daetMgrOwnInvRes.data.branchScope === 'daet' &&
      aliceOwnStockistRes.status === 200 &&
      aliceOwnStockistRes.data.stockist?.authorizedCustomerUid === 'customer-alice-uid',
      '20. Authorized regression: Patient self-access, assigned practitioner, customer workshop pass, manager inventory, and stockist access succeed with 200 OK'
    );

    console.log('\n========================================================================');
    console.log(` Phase 7 Milestone 7 Test Results: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

runTests().catch((err) => {
  console.error('Fatal error during Milestone 7 test run:', err);
  process.exit(1);
});
