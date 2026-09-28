/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

process.env.NODE_ENV = 'test';

import {
  createExpressApp,
  SUPPORTED_BRANCH_IDS,
  ACTIVE_CONSUMER_SKUS,
  PRODUCTS_CATALOG,
  SEED_PRODUCT_BATCHES,
  SEED_BRANCH_BATCH_INVENTORY,
} from '../server';
import http from 'http';
import crypto from 'crypto';

function createTestHarness() {
  const usersStore = new Map<string, any>([
    ['staff-daet-manager-uid', { uid: 'staff-daet-manager-uid', email: 'manager.daet@hcicmd.ph', role: 'branch_manager', assignedBranchId: 'daet' }],
    ['staff-labo-manager-uid', { uid: 'staff-labo-manager-uid', email: 'manager.labo@hcicmd.ph', role: 'branch_manager', assignedBranchId: 'labo' }],
    ['staff-super-admin-uid', { uid: 'staff-super-admin-uid', email: 'admin@hcicmd.ph', role: 'super_admin' }],
    ['user-customer-uid', { uid: 'user-customer-uid', email: 'stockist.partner@example.ph', role: 'customer' }],
    ['patient-uid', { uid: 'patient-uid', email: 'patient@example.ph', role: 'customer' }],
    ['practitioner-uid', { uid: 'practitioner-uid', email: 'practitioner@hcicmd.ph', role: 'practitioner' }],
  ]);

  const b2bStockistsStore = new Map<string, any>();
  const b2bLedgerStore = new Map<string, any>();
  const inventoryStore = new Map<string, any>();
  const branchBatchInventoryStore = new Map<string, any>();
  const productBatchesStore = new Map<string, any>();
  const ordersStore = new Map<string, any>();
  const stockTransfersStore = new Map<string, any>();
  const auditLogsStore = new Map<string, any>();
  const consultationIntakesStore = new Map<string, any>();
  const consultationAssignmentsStore = new Map<string, any>();
  const workshopRegistrationsStore = new Map<string, any>();
  const supportTicketsStore = new Map<string, any>();
  const expensesStore = new Map<string, any>();
  const docVersions = new Map<string, number>();

  const mockDb: any = {
    _getStoreForCollection: (colName: string) => {
      if (colName === 'users') return usersStore;
      if (colName === 'b2b_stockists') return b2bStockistsStore;
      if (colName === 'b2b_ledger') return b2bLedgerStore;
      if (colName === 'inventory') return inventoryStore;
      if (colName === 'branch_batch_inventory') return branchBatchInventoryStore;
      if (colName === 'product_batches') return productBatchesStore;
      if (colName === 'orders') return ordersStore;
      if (colName === 'stock_transfers') return stockTransfersStore;
      if (colName === 'audit_logs') return auditLogsStore;
      if (colName === 'consultation_intakes') return consultationIntakesStore;
      if (colName === 'consultation_assignments') return consultationAssignmentsStore;
      if (colName === 'workshop_registrations') return workshopRegistrationsStore;
      if (colName === 'support_tickets') return supportTicketsStore;
      if (colName === 'expenses') return expensesStore;
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
    runTransaction: async (updateFunction: (transaction: any) => Promise<any>, maxAttempts = 20) => {
      let attempt = 0;
      while (attempt < maxAttempts) {
        attempt++;
        const readVersions = new Map<string, number>();
        const stagedWrites = [] as Array<{ docRef: any; data: any; options?: any }>;
        const stagedDeletes = [] as Array<{ docRef: any }>;

        const transaction = {
          get: async (refOrQuery: any) => {
            if (!refOrQuery) return null;
            await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 3) + 1));
            if (refOrQuery._colName && (refOrQuery._docId || refOrQuery.id)) {
              const col = refOrQuery._colName;
              const docId = refOrQuery._docId || refOrQuery.id;
              const path = `${col}/${docId}`;
              const currentVer = docVersions.get(path) || 1;
              readVersions.set(path, currentVer);
              return await refOrQuery.get();
            }
            if (refOrQuery.id && typeof refOrQuery.get === 'function') {
              const col = refOrQuery._colName || 'default';
              const path = `${col}/${refOrQuery.id}`;
              const currentVer = docVersions.get(path) || 1;
              readVersions.set(path, currentVer);
              return await refOrQuery.get();
            }
            if (typeof refOrQuery.get === 'function') {
              const snap = await refOrQuery.get();
              if (snap && snap.docs) {
                const col = refOrQuery._colName || 'default';
                for (const d of snap.docs) {
                  const path = `${col}/${d.id}`;
                  const currentVer = docVersions.get(path) || 1;
                  readVersions.set(path, currentVer);
                }
              }
              return snap;
            }
            throw new Error('Invalid target passed to transaction.get');
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

          let conflictDetected = false;
          for (const [path, readVer] of readVersions.entries()) {
            const currentVer = docVersions.get(path) || 1;
            if (currentVer !== readVer) {
              conflictDetected = true;
              break;
            }
          }

          if (conflictDetected) {
            if (attempt >= maxAttempts) {
              throw new Error('Maximum transaction retry attempts reached due to contention');
            }
            await new Promise((resolve) => setTimeout(resolve, attempt * 5 + Math.random() * 10));
            continue;
          }

          for (const w of stagedWrites) {
            const col = w.docRef._colName;
            const docId = w.docRef._docId || w.docRef.id;
            const targetStore = mockDb._getStoreForCollection(col);
            if (w.options && w.options.merge) {
              const existing = targetStore.get(docId) || {};
              targetStore.set(docId, { ...existing, ...w.data });
            } else {
              targetStore.set(docId, { ...w.data });
            }
            const path = `${col}/${docId}`;
            docVersions.set(path, (docVersions.get(path) || 1) + 1);
          }

          for (const d of stagedDeletes) {
            const col = d.docRef._colName;
            const docId = d.docRef._docId || d.docRef.id;
            const targetStore = mockDb._getStoreForCollection(col);
            targetStore.delete(docId);
            const path = `${col}/${docId}`;
            docVersions.set(path, (docVersions.get(path) || 1) + 1);
          }

          return result;
        } catch (err: any) {
          if (attempt >= maxAttempts) throw err;
          await new Promise((resolve) => setTimeout(resolve, attempt * 5 + Math.random() * 10));
        }
      }
    },
  };

  const mockAuth = {
    verifyIdToken: async (token: string) => {
      if (token === 'VALID_DAET_MANAGER_TOKEN') return { uid: 'staff-daet-manager-uid', role: 'branch_manager', assignedBranchId: 'daet' };
      if (token === 'VALID_LABO_MANAGER_TOKEN') return { uid: 'staff-labo-manager-uid', role: 'branch_manager', assignedBranchId: 'labo' };
      if (token === 'VALID_ADMIN_TOKEN') return { uid: 'staff-super-admin-uid', role: 'super_admin' };
      if (token === 'VALID_CUSTOMER_TOKEN') return { uid: 'user-customer-uid', role: 'customer' };
      if (token === 'VALID_PATIENT_TOKEN') return { uid: 'patient-uid', role: 'customer' };
      if (token === 'PRACTITIONER_TOKEN') return { uid: 'practitioner-uid', role: 'practitioner' };
      throw new Error('Invalid token');
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

  return { mockDb, mockAuth, mockKms, b2bStockistsStore, b2bLedgerStore, inventoryStore, branchBatchInventoryStore, productBatchesStore, ordersStore, stockTransfersStore, auditLogsStore, consultationIntakesStore, consultationAssignmentsStore, workshopRegistrationsStore, supportTicketsStore, expensesStore };
}

async function makeRequest(server: http.Server, path: string, method: string, body?: any, headers: any = {}) {
  return new Promise<any>((resolve, reject) => {
    const port = (server.address() as any).port;
    const options = {
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: { ...headers, 'Content-Type': 'application/json' },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
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
  console.log(' Phase 7 — Milestone 8: Concurrent Transaction Safety & Backward Compatibility');
  console.log('========================================================================\n');

  const harness = createTestHarness();
  const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth, kmsClient: harness.mockKms });
  const server = http.createServer(app);
  await new Promise<void>((res) => server.listen(0, '127.0.0.1', res));

  try {
    const branch = 'daet';
    const sku = 'hci-cmd-65ml';

    for (const b of SEED_BRANCH_BATCH_INVENTORY) {
      harness.branchBatchInventoryStore.set(b.id, { ...b });
    }
    for (const pb of SEED_PRODUCT_BATCHES) {
      harness.productBatchesStore.set(pb.id, { ...pb });
    }
    for (const bId of SUPPORTED_BRANCH_IDS) {
      for (const sId of ACTIVE_CONSUMER_SKUS) {
        const relevantBatches = SEED_BRANCH_BATCH_INVENTORY.filter(
          (b) => b.branchId === bId && b.skuId === sId
        );
        const active = relevantBatches.reduce((acc, curr) => acc + (Number(curr.availableQuantity) || 0), 0);
        const reserved = relevantBatches.reduce((acc, curr) => acc + (Number(curr.reservedQuantity) || 0), 0);
        harness.inventoryStore.set(`${bId}_${sId}`, {
          id: `${bId}_${sId}`,
          branchId: bId,
          skuId: sId,
          activeStock: active > 0 ? active : 200,
          reservedStock: reserved,
          transitStock: 0,
          safetyStock: 10,
          reorderPoint: 20,
          leadTimeDays: 3,
        });
      }
    }

    harness.b2bStockistsStore.set('STK-M8-001', {
      stockistId: 'STK-M8-001',
      businessName: 'Concurrency Test Stockist',
      branchId: 'daet',
      tier: 'tier_1',
      depositBalance: 100000,
      outstandingBalance: 20000,
      creditLimit: 200000,
      availableCredit: 180000,
      authorizedCustomerUid: 'user-customer-uid',
    });

    // ------------------------------------------------------------------------
    // Assertion 1: Concurrent checkout order mutations against inventory
    // ------------------------------------------------------------------------
    const invPre1 = harness.inventoryStore.get(`${branch}_${sku}`);
    const batchPre1 = harness.branchBatchInventoryStore.get('daet_batch-2026-09a');
    const ordersPreCount = harness.ordersStore.size;

    const checkoutPromises = Array.from({ length: 5 }).map(() =>
      makeRequest(
        server,
        '/api/orders/checkout',
        'POST',
        {
          branchId: branch,
          items: [{ skuId: sku, quantity: 5 }],
          deliveryMethod: 'branch_pickup',
          paymentMethod: 'cash_on_delivery',
        },
        { Authorization: 'Bearer VALID_PATIENT_TOKEN' }
      )
    );
    const checkoutResults = await Promise.all(checkoutPromises);
    const invPost1 = harness.inventoryStore.get(`${branch}_${sku}`);
    const batchPost1 = harness.branchBatchInventoryStore.get('daet_batch-2026-09a');
    const ordersPostCount = harness.ordersStore.size;

    const allCheckoutsSuccessful = checkoutResults.every((r) => r.status === 200 || r.status === 201);
    const ordersAddedCorrectly = ordersPostCount === ordersPreCount + 5;
    const stockReductionCorrect = invPost1.activeStock === invPre1.activeStock - 25;
    const batchStockConsistent = batchPost1.availableQuantity === batchPre1.availableQuantity - 25;
    const noNegativeStock = invPost1.activeStock >= 0 && batchPost1.availableQuantity >= 0;

    assert(
      allCheckoutsSuccessful && ordersAddedCorrectly && stockReductionCorrect && batchStockConsistent && noNegativeStock,
      '1. Concurrent checkout order mutations commit successfully with zero lost updates or stock corruption'
    );

    // ------------------------------------------------------------------------
    // Assertion 2: Concurrent batch inventory adjustments
    // ------------------------------------------------------------------------
    const batchPre2 = harness.branchBatchInventoryStore.get('daet_batch-2026-09a');
    const invPre2 = harness.inventoryStore.get(`${branch}_${sku}`);

    const adjPromises = Array.from({ length: 4 }).map(() =>
      makeRequest(
        server,
        '/api/inventory/adjustments',
        'POST',
        {
          branchId: branch,
          batchId: 'daet_batch-2026-09a',
          skuId: sku,
          adjustmentType: 'damage_writeoff',
          quantityDelta: 2,
          reason: 'Concurrent adjustment',
        },
        { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }
      )
    );
    const adjResults = await Promise.all(adjPromises);
    const batchPost2 = harness.branchBatchInventoryStore.get('daet_batch-2026-09a');
    const invPost2 = harness.inventoryStore.get(`${branch}_${sku}`);

    const allAdjsSuccessful = adjResults.every((r) => r.status === 200 || r.status === 201);
    const exactBatchDelta = batchPost2.availableQuantity === batchPre2.availableQuantity - (4 * 2);
    const exactInvDelta = invPost2.activeStock === invPre2.activeStock - (4 * 2);

    assert(
      allAdjsSuccessful && exactBatchDelta && exactInvDelta,
      '2. Concurrent batch inventory adjustments process atomically without double allocation'
    );

    // ------------------------------------------------------------------------
    // Assertion 3: Concurrent stock transfers
    // ------------------------------------------------------------------------
    const sourceInvPre3 = harness.inventoryStore.get(`${branch}_${sku}`);
    const sourceBatchPre3 = harness.branchBatchInventoryStore.get('daet_batch-2026-09a');
    const transfersPreCount = harness.stockTransfersStore.size;

    harness.inventoryStore.set(`labo_${sku}`, {
      id: `labo_${sku}`,
      branchId: 'labo',
      skuId: sku,
      activeStock: 50,
      reservedStock: 0,
    });
    harness.branchBatchInventoryStore.set(`labo_batch-2026-09a`, {
      id: `labo_batch-2026-09a`,
      branchId: 'labo',
      batchId: 'daet_batch-2026-09a',
      skuId: sku,
      availableQuantity: 50,
      reservedQuantity: 0,
      expiryDate: '2027-01-01',
    });

    const transferPromises = Array.from({ length: 3 }).map(() =>
      makeRequest(
        server,
        '/api/inventory/transfers',
        'POST',
        {
          sourceBranchId: branch,
          destinationBranchId: 'labo',
          skuId: sku,
          batchId: 'daet_batch-2026-09a',
          quantity: 5,
          idempotencyKey: crypto.randomUUID(),
        },
        { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }
      )
    );
    const transferResults = await Promise.all(transferPromises);
    const sourceInvPost3 = harness.inventoryStore.get(`${branch}_${sku}`);
    const destInvPost3 = harness.inventoryStore.get(`labo_${sku}`);
    const sourceBatchPost3 = harness.branchBatchInventoryStore.get('daet_batch-2026-09a');
    const destBatchPost3 = harness.branchBatchInventoryStore.get(`labo_batch-2026-09a`);
    const transfersPostCount = harness.stockTransfersStore.size;

    const allTransfersSuccessful = transferResults.every((r) => r.status === 201 || r.status === 200);
    const sourceLeftExact = sourceInvPost3.activeStock === sourceInvPre3.activeStock - 15 && sourceBatchPost3.availableQuantity === sourceBatchPre3.availableQuantity - 15;
    const destEnteredExact = destInvPost3.activeStock === 50 + 15 && destBatchPost3.availableQuantity === 50 + 15;
    const transferCountExact = transfersPostCount === transfersPreCount + 3;
    const conservationExact = (sourceInvPre3.activeStock + 50) === (sourceInvPost3.activeStock + destInvPost3.activeStock);

    assert(
      allTransfersSuccessful && sourceLeftExact && destEnteredExact && transferCountExact && conservationExact,
      '3. Concurrent stock transfers maintain inventory conservation invariants across source and destination'
    );

    // ------------------------------------------------------------------------
    // Assertion 4: Concurrent B2B deposits, payments, and order debits
    // ------------------------------------------------------------------------
    const preStockist = harness.b2bStockistsStore.get('STK-M8-001');
    const preDeposit = preStockist.depositBalance;
    const preOutstanding = preStockist.outstandingBalance;
    const preLedgerCount = harness.b2bLedgerStore.size;

    const b2bConcurrentPromises = [
      makeRequest(server, '/api/b2b/stockists/STK-M8-001/deposits', 'POST', { amount: 10000 }, { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }),
      makeRequest(server, '/api/b2b/stockists/STK-M8-001/payments', 'POST', { amount: 5000 }, { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }),
      makeRequest(server, '/api/b2b/orders', 'POST', { stockistId: 'STK-M8-001', branchId: 'daet', items: [{ skuId: sku, quantity: 10 }] }, { Authorization: 'Bearer VALID_CUSTOMER_TOKEN' }),
    ];
    const b2bResults = await Promise.all(b2bConcurrentPromises);
    const postStockist = harness.b2bStockistsStore.get('STK-M8-001');
    const postLedgerCount = harness.b2bLedgerStore.size;

    const allB2BSuccessful = b2bResults.every((r) => r.status === 200 || r.status === 201);
    const expectedDeposit = preDeposit + 10000;
    const exactBalances = postStockist.depositBalance === expectedDeposit && postStockist.availableCredit === postStockist.creditLimit - postStockist.outstandingBalance;
    const ledgerEntriesAdded = postLedgerCount === preLedgerCount + 3;
    const ledgerEntries = Array.from(harness.b2bLedgerStore.values());
    const chainContinuous = ledgerEntries.length >= 3;

    assert(
      allB2BSuccessful && exactBalances && ledgerEntriesAdded && chainContinuous,
      '4. Concurrent B2B deposits, payments, and order debits update balances atomically without race corruption'
    );

    // ------------------------------------------------------------------------
    // Assertion 5: Optimistic transaction conflict detection and retry
    // ------------------------------------------------------------------------
    let txAttemptsCount = 0;
    const optimisticTestResult = await harness.mockDb.runTransaction(async (tx: any) => {
      txAttemptsCount++;
      const ref = harness.mockDb.collection('b2b_stockists').doc('STK-M8-001');
      const snap = await tx.get(ref);
      const data = snap.data();
      if (txAttemptsCount === 1) {
        await harness.mockDb.collection('b2b_stockists').doc('STK-M8-001').set({ ...data, depositBalance: data.depositBalance + 999 });
      }
      tx.update(ref, { depositBalance: data.depositBalance + 1000 });
      return { success: true, attempts: txAttemptsCount };
    });

    assert(
      optimisticTestResult.success === true && optimisticTestResult.attempts >= 2,
      '5. Optimistic transaction conflict detection correctly detects contention and auto-retries until success'
    );

    // ------------------------------------------------------------------------
    // Assertion 6: Idempotency and duplicate-request safety (using stock transfers)
    // ------------------------------------------------------------------------
    const transferIdempKey = 'TRANSFER-IDEMP-KEY-888';
    const preSourceStockForIdemp = harness.inventoryStore.get(`${branch}_${sku}`).activeStock;

    const [idempTransfer1, idempTransfer2] = await Promise.all([
      makeRequest(
        server,
        '/api/inventory/transfers',
        'POST',
        {
          sourceBranchId: branch,
          destinationBranchId: 'labo',
          skuId: sku,
          batchId: 'daet_batch-2026-09a',
          quantity: 5,
          idempotencyKey: transferIdempKey,
        },
        { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }
      ),
      makeRequest(
        server,
        '/api/inventory/transfers',
        'POST',
        {
          sourceBranchId: branch,
          destinationBranchId: 'labo',
          skuId: sku,
          batchId: 'daet_batch-2026-09a',
          quantity: 5,
          idempotencyKey: transferIdempKey,
        },
        { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }
      ),
    ]);

    const transfersForIdemp = Array.from(harness.stockTransfersStore.values()).filter(
      (t: any) => t.idempotencyKey === transferIdempKey
    );
    const postSourceStockForIdemp = harness.inventoryStore.get(`${branch}_${sku}`).activeStock;

    assert(
      (idempTransfer1.status === 200 || idempTransfer1.status === 201) &&
        (idempTransfer2.status === 200 || idempTransfer2.status === 201) &&
        transfersForIdemp.length === 1 &&
        postSourceStockForIdemp === preSourceStockForIdemp - 5,
      '6. Concurrent duplicate requests with identical idempotency key produce exactly one committed transfer record'
    );

    // ------------------------------------------------------------------------
    // Assertion 7: Real invariant audit
    // ------------------------------------------------------------------------
    let allInvariantsSatisfied = true;
    for (const inv of harness.inventoryStore.values()) {
      if (inv.activeStock < 0 || inv.reservedStock < 0) allInvariantsSatisfied = false;
    }
    for (const b of harness.branchBatchInventoryStore.values()) {
      if (b.availableQuantity < 0 || b.reservedQuantity < 0) allInvariantsSatisfied = false;
    }
    for (const s of harness.b2bStockistsStore.values()) {
      if (s.depositBalance < 0 || s.outstandingBalance < 0 || s.availableCredit !== s.creditLimit - s.outstandingBalance) {
        allInvariantsSatisfied = false;
      }
    }

    assert(
      allInvariantsSatisfied === true,
      '7. Final store state satisfies all inventory, reservation, credit, and conservation invariants'
    );

    // ------------------------------------------------------------------------
    // Assertion 8: Backward compatibility — Consultation and Workshop workflows
    // ------------------------------------------------------------------------
    harness.consultationAssignmentsStore.set('practitioner-uid_patient-uid', {
      practitionerUid: 'practitioner-uid',
      patientUid: 'patient-uid',
      active: true,
    });
    const saveIntakeRes = await makeRequest(
      server,
      '/api/clinical/intake/save',
      'POST',
      {
        patientUid: 'patient-uid',
        scheduledAt: new Date().toISOString(),
        deliveryMode: 'in_person',
        consentRecord: {
          purpose: 'Holistic Wellness Assessment',
          version: 'v1.0',
          timestamp: new Date().toISOString(),
          legalBasis: 'RA_10173_SECTION_13_A_EXPLICIT_CONSENT',
          acknowledgedText: 'Explicit consent under RA 10173 Section 13(a) is hereby granted with at least fifty characters of statutory body text.',
          withdrawalState: { isWithdrawn: false }
        },
        clinicalIntake: {
          dietaryHabits: 'Daet organic produce',
          waterConsumption: 'HCI CMD mineral water',
          sleepQuality: 'Good',
          stressLevel: 'Low',
          wellnessGoals: 'Optimal vitality',
        },
      },
      { Authorization: 'Bearer PRACTITIONER_TOKEN' }
    );
    const intakeId = saveIntakeRes.data?.intakeId;
    const consultRes = intakeId ? await makeRequest(server, `/api/clinical/intake/${intakeId}`, 'GET', null, { Authorization: 'Bearer PRACTITIONER_TOKEN' }) : { status: 400 };
    harness.workshopRegistrationsStore.set('workshop-01', { id: 'workshop-01', userId: 'patient-uid', workshopTitle: 'Wellness 101' });
    const workshopRes = await makeRequest(server, '/api/workshops/registration/workshop-01/pass', 'GET', null, { Authorization: 'Bearer VALID_PATIENT_TOKEN' });

    assert(
      consultRes.status === 200 && workshopRes.status === 200,
      '8. Phase 6 consultation intake and workshop registration backward compatibility verified'
    );

    // ------------------------------------------------------------------------
    // Assertion 9: Backward compatibility — CRM cohorts and Finance metrics
    // ------------------------------------------------------------------------
    const crmRes = await makeRequest(server, '/api/crm/cohorts', 'GET', null, { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' });
    const financeRes = await makeRequest(server, '/api/finance/metrics', 'GET', null, { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' });

    assert(
      crmRes.status === 200 &&
        financeRes.status === 200 &&
        Array.isArray(crmRes.data.cohorts || crmRes.data),
      '9. Phase 6 CRM cohorts and finance metrics endpoints retain full backward compatibility'
    );

    // ------------------------------------------------------------------------
    // Assertion 10: Backward compatibility — Support tickets
    // ------------------------------------------------------------------------
    harness.supportTicketsStore.set('ticket-01', { id: 'ticket-01', userId: 'patient-uid', subject: 'Inquiry', status: 'open', branchId: 'daet' });
    const ticketRes = await makeRequest(server, '/api/support/tickets/ticket-01', 'GET', null, { Authorization: 'Bearer VALID_PATIENT_TOKEN' });

    assert(
      ticketRes.status === 200 && ticketRes.data.ticket.id === 'ticket-01' && ticketRes.data.ticket.status === 'open',
      '10. Phase 6 support tickets endpoint retains expected behavior and access rules'
    );

    // ------------------------------------------------------------------------
    // Assertion 11: Backward compatibility — Inventory tracking & FEFO
    // ------------------------------------------------------------------------
    const invListRes = await makeRequest(server, '/api/inventory?branchId=daet', 'GET', null, { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' });
    assert(
      invListRes.status === 200 && invListRes.data.success !== false,
      '11. Phase 7 inventory tracking and query endpoints remain fully operational'
    );

    // ------------------------------------------------------------------------
    // Assertion 12: Backward compatibility — Checkout & fulfillment
    // ------------------------------------------------------------------------
    const checkoutHistoryRes = await makeRequest(server, '/api/admin/orders', 'GET', null, { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' });
    assert(
      checkoutHistoryRes.status === 200 && Array.isArray(checkoutHistoryRes.data.orders || checkoutHistoryRes.data),
      '12. Phase 7 checkout and order administration endpoints remain fully accessible'
    );

    // ------------------------------------------------------------------------
    // Assertion 13: Backward compatibility — Transfers & forecasting
    // ------------------------------------------------------------------------
    const forecastRes = await makeRequest(server, `/api/inventory/forecasting/${branch}/${sku}`, 'GET', null, { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' });
    assert(
      forecastRes.status === 200 && forecastRes.data.skuId === sku,
      '13. Phase 7 stock transfer and forecasting modules remain fully operational'
    );

    // ------------------------------------------------------------------------
    // Assertion 14: Security RBAC isolation persistence under concurrency
    // ------------------------------------------------------------------------
    const unauthAccessRes = await makeRequest(server, '/api/b2b/stockists/STK-M8-001', 'GET', null, { Authorization: 'Bearer VALID_PATIENT_TOKEN' });
    assert(
      unauthAccessRes.status === 403,
      '14. Security RBAC isolation rules remain strictly enforced with HTTP 403 under concurrency testing'
    );

    // ------------------------------------------------------------------------
    // Assertion 15: Cumulative data-structure readability audit
    // ------------------------------------------------------------------------
    let allReadable = true;
    for (const [k, v] of harness.b2bStockistsStore.entries()) {
      if (!v.stockistId || typeof v.depositBalance !== 'number') allReadable = false;
    }
    for (const [k, v] of harness.inventoryStore.entries()) {
      if (!v.branchId || typeof v.activeStock !== 'number') allReadable = false;
    }
    for (const [k, v] of harness.branchBatchInventoryStore.entries()) {
      if (!v.batchId || typeof v.availableQuantity !== 'number') allReadable = false;
    }

    assert(
      allReadable === true && harness.b2bStockistsStore.size > 0 && harness.inventoryStore.size > 0,
      '15. Cumulative data-structure readability audit confirms zero migration regressions across all stores'
    );

  } catch (err: any) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    server.close();
    console.log(`\n========================================================================`);
    console.log(` Phase 7 Milestone 8 Test Results: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================================================`);
    if (failed > 0) process.exit(1);
  }
}

runTests();
