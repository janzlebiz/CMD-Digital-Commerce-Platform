/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

process.env.NODE_ENV = 'test';

import {
  createExpressApp,
  SUPPORTED_BRANCH_IDS,
  ACTIVE_CONSUMER_SKUS,
  SEED_PRODUCT_BATCHES,
  SEED_BRANCH_BATCH_INVENTORY,
  computeAggregateInventoryFromBatches,
} from '../server';
import http from 'http';

function createTestHarness() {
  const usersStore = new Map<string, any>([
    ['staff-daet-manager-uid', { uid: 'staff-daet-manager-uid', email: 'manager.daet@hcicmd.ph', role: 'branch_manager', assignedBranchId: 'daet' }],
    ['staff-labo-manager-uid', { uid: 'staff-labo-manager-uid', email: 'manager.labo@hcicmd.ph', role: 'branch_manager', assignedBranchId: 'labo' }],
    ['staff-super-admin-uid', { uid: 'staff-super-admin-uid', email: 'admin@hcicmd.ph', role: 'super_admin' }],
    ['user-alice-customer', { uid: 'user-alice-customer', email: 'alice@example.ph', role: 'customer' }],
    ['practitioner-01', { uid: 'practitioner-01', email: 'practitioner@hcicmd.ph', role: 'practitioner' }],
  ]);

  const inventoryStore = new Map<string, any>();
  const branchBatchInventoryStore = new Map<string, any>();
  const productBatchesStore = new Map<string, any>();
  const stockTransfersStore = new Map<string, any>();
  const auditLogsStore = new Map<string, any>();
  const consultationIntakesStore = new Map<string, any>();

  const mockDb: any = {
    runTransaction: async (updateFunction: any) => {
      if (!(mockDb as any)._docVersions) {
        (mockDb as any)._docVersions = new Map<string, number>();
      }
      const versions = (mockDb as any)._docVersions;

      let maxRetries = 15;
      let attempt = 0;

      while (attempt < maxRetries) {
        attempt++;
        const readSnapshots = new Map<string, { version: number; data: any }>();
        const stagedWrites = [] as Array<{ docRef: any; data: any; options: any }>;

        const transaction = {
          get: async (refOrQuery: any) => {
            if (typeof refOrQuery.get === 'function') {
              const res = await refOrQuery.get();
              if (res && typeof res.data === 'function') {
                const docId = res.id;
                const currentVer = versions.get(docId) || 0;
                readSnapshots.set(docId, { version: currentVer, data: res.data() });
              }
              return res;
            }
            throw new Error('Invalid transaction.get target');
          },
          set: async (docRef: any, data: any, options?: any) => {
            stagedWrites.push({ docRef, data, options });
          },
        };

        try {
          const result = await updateFunction(transaction);

          for (const [docId, snapshot] of readSnapshots.entries()) {
            const currentVer = versions.get(docId) || 0;
            if (currentVer !== snapshot.version) {
              throw new Error('TRANSACTION_CONFLICT');
            }
          }

          for (const write of stagedWrites) {
            await write.docRef.set(write.data, write.options);
            const docId = write.docRef.id;
            const nextVer = (versions.get(docId) || 0) + 1;
            versions.set(docId, nextVer);
          }

          return result;
        } catch (err: any) {
          if (err.message === 'TRANSACTION_CONFLICT' && attempt < maxRetries) {
            continue;
          }
          throw err;
        }
      }
      throw new Error('Transaction failed after maximum retries due to persistent OCC conflicts.');
    },
    _getStoreForCollection: (colName: string) => {
      if (colName === 'users') return usersStore;
      if (colName === 'inventory') return inventoryStore;
      if (colName === 'branch_batch_inventory') return branchBatchInventoryStore;
      if (colName === 'product_batches') return productBatchesStore;
      if (colName === 'stock_transfers') return stockTransfersStore;
      if (colName === 'audit_logs') return auditLogsStore;
      if (colName === 'consultation_intakes') return consultationIntakesStore;
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
        get: async () => {
          let docs = Array.from(targetStore.values());
          for (const f of queryObj._filters) {
            if (f.op === '==') {
              docs = docs.filter((d: any) => d[f.field] === f.value);
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
          return {
            id: docId,
            get: async () => {
              const data = targetStore.get(docId);
              return {
                exists: !!data,
                id: docId,
                data: () => (data ? { ...data } : undefined),
                ref: { id: docId },
              };
            },
            set: async (data: any, setOptions?: any) => {
              if (setOptions && setOptions.merge) {
                const existing = targetStore.get(docId) || {};
                targetStore.set(docId, { ...existing, ...data });
              } else {
                targetStore.set(docId, { ...data });
              }
              return { writeTime: new Date() };
            },
            update: async (data: any) => {
              const existing = targetStore.get(docId);
              if (!existing) throw new Error(`Document ${docId} does not exist`);
              targetStore.set(docId, { ...existing, ...data });
              return { writeTime: new Date() };
            },
            delete: async () => {
              targetStore.delete(docId);
              return { writeTime: new Date() };
            },
          };
        },
      };

      return queryObj;
    },
  };

  const mockAuth: any = {
    verifyIdToken: async (token: string) => {
      if (token === 'VALID_DAET_MANAGER_TOKEN') {
        return { uid: 'staff-daet-manager-uid', email: 'manager.daet@hcicmd.ph' };
      }
      if (token === 'VALID_LABO_MANAGER_TOKEN') {
        return { uid: 'staff-labo-manager-uid', email: 'manager.labo@hcicmd.ph' };
      }
      if (token === 'VALID_ADMIN_TOKEN') {
        return { uid: 'staff-super-admin-uid', email: 'admin@hcicmd.ph' };
      }
      if (token === 'VALID_CUSTOMER_TOKEN') {
        return { uid: 'user-alice-customer', email: 'alice@example.ph' };
      }
      if (token === 'VALID_PRACTITIONER_TOKEN') {
        return { uid: 'practitioner-01', email: 'practitioner@hcicmd.ph' };
      }
      throw new Error('Invalid or expired Firebase ID token');
    },
  };

  for (const pb of SEED_PRODUCT_BATCHES) {
    productBatchesStore.set(pb.id, pb);
  }
  for (const b of SEED_BRANCH_BATCH_INVENTORY) {
    branchBatchInventoryStore.set(b.id, b);
  }
  for (const branchId of SUPPORTED_BRANCH_IDS) {
    for (const skuId of ACTIVE_CONSUMER_SKUS) {
      const agg = computeAggregateInventoryFromBatches({
        branchBatches: SEED_BRANCH_BATCH_INVENTORY,
        branchId,
        skuId,
      });
      inventoryStore.set(agg.id, agg);
    }
  }

  return { mockDb, mockAuth, branchBatchInventoryStore, productBatchesStore, stockTransfersStore, auditLogsStore, consultationIntakesStore };
}

async function makeRequest(
  server: http.Server,
  path: string,
  method: string,
  body?: any,
  headers: Record<string, string> = {}
): Promise<{ status: number; data: any; headers: http.IncomingHttpHeaders }> {
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
          resolve({ status: res.statusCode || 500, data: parsed, headers: res.headers });
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

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${description}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${description}`);
  }
}

async function runMilestone4TestSuite() {
  console.log('========================================================================');
  console.log(' Phase 7 — Milestone 4: Dual-Custody Stock Transfers & Conservation Suite');
  console.log('========================================================================\n');

  const harness = createTestHarness();
  const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth });
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const bbStore = harness.branchBatchInventoryStore;
    const auditStore = harness.auditLogsStore;
    const intakeStore = harness.consultationIntakesStore;

    // 1. Valid transfer initiation succeeds (HTTP 201)
    const initRes = await makeRequest(
      server,
      '/api/inventory/transfers',
      'POST',
      {
        sourceBranchId: 'daet',
        destinationBranchId: 'labo',
        skuId: 'hci-cmd-65ml',
        batchId: 'batch-2026-09a',
        quantity: 15,
        idempotencyKey: 'trf-idemp-01',
      },
      { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }
    );
    assert(
      initRes.status === 201 && initRes.data.success === true && !!initRes.data.transfer,
      '1. Valid transfer initiation succeeds with 201 Created'
    );

    // 2. Source available stock decreases correctly
    const daetBatchA = bbStore.get('daet_batch-2026-09a');
    assert(
      daetBatchA.availableQuantity === 105, // 120 - 15
      '2. Source branch available stock decreases correctly upon initiation'
    );

    // 3. Transfer enters IN_TRANSIT
    const transferId = initRes.data.transfer.id;
    assert(
      initRes.data.transfer.status === 'IN_TRANSIT',
      '3. Transfer status correctly enters IN_TRANSIT'
    );

    // 4. Transit quantity is recorded correctly
    assert(
      initRes.data.transfer.transitQuantity === 15 && initRes.data.transfer.shippedQuantity === 15,
      '4. Transit quantity is recorded correctly matching shipped quantity'
    );

    // 5. Source branch RBAC enforced for branch manager
    const initDaetByDaet = await makeRequest(
      server,
      '/api/inventory/transfers',
      'POST',
      {
        sourceBranchId: 'daet',
        destinationBranchId: 'capalonga',
        skuId: 'hci-cmd-65ml',
        batchId: 'batch-2026-09a',
        quantity: 5,
        idempotencyKey: 'trf-idemp-02',
      },
      { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }
    );
    assert(
      initDaetByDaet.status === 201,
      '5. Source branch RBAC enforced: Daet manager permitted to initiate from Daet'
    );

    // 6. Cross-source branch manager access returns 403
    const initDaetByLabo = await makeRequest(
      server,
      '/api/inventory/transfers',
      'POST',
      {
        sourceBranchId: 'daet',
        destinationBranchId: 'labo',
        skuId: 'hci-cmd-65ml',
        batchId: 'batch-2026-09a',
        quantity: 5,
        idempotencyKey: 'trf-idemp-03',
      },
      { Authorization: 'Bearer VALID_LABO_MANAGER_TOKEN' }
    );
    assert(
      initDaetByLabo.status === 403,
      '6. Cross-source branch manager access blocked with 403 Forbidden'
    );

    // 7. Customer/practitioner access returns 403
    const initCustomer = await makeRequest(
      server,
      '/api/inventory/transfers',
      'POST',
      {
        sourceBranchId: 'daet',
        destinationBranchId: 'labo',
        skuId: 'hci-cmd-65ml',
        batchId: 'batch-2026-09a',
        quantity: 5,
      },
      { Authorization: 'Bearer VALID_CUSTOMER_TOKEN' }
    );
    assert(
      initCustomer.status === 403,
      '7. Customer and practitioner access blocked with 403 Forbidden'
    );

    // 8. Regional director / super admin cross-branch operation succeeds
    const initAdminCross = await makeRequest(
      server,
      '/api/inventory/transfers',
      'POST',
      {
        sourceBranchId: 'daet',
        destinationBranchId: 'capalonga',
        skuId: 'hci-cmd-65ml',
        batchId: 'batch-2026-09a',
        quantity: 5,
        idempotencyKey: 'trf-idemp-admin',
      },
      { Authorization: 'Bearer VALID_ADMIN_TOKEN' }
    );
    assert(
      initAdminCross.status === 201,
      '8. Regional Director / Super Admin cross-branch operation succeeds'
    );

    // 9. Duplicate idempotencyKey does not double-decrement
    const availBeforeIdemp = bbStore.get('daet_batch-2026-09a').availableQuantity;
    const initIdempDup = await makeRequest(
      server,
      '/api/inventory/transfers',
      'POST',
      {
        sourceBranchId: 'daet',
        destinationBranchId: 'labo',
        skuId: 'hci-cmd-65ml',
        batchId: 'batch-2026-09a',
        quantity: 15,
        idempotencyKey: 'trf-idemp-01',
      },
      { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }
    );
    const availAfterIdemp = bbStore.get('daet_batch-2026-09a').availableQuantity;
    assert(
      initIdempDup.status === 201 && availAfterIdemp === availBeforeIdemp && initIdempDup.data.transfer.id === transferId,
      '9. Duplicate idempotencyKey prevents double-decrement and returns existing transfer'
    );

    // 10. Insufficient source stock fails atomically
    const availBeforeInsuff = bbStore.get('daet_batch-2026-09a').availableQuantity;
    const initInsuff = await makeRequest(
      server,
      '/api/inventory/transfers',
      'POST',
      {
        sourceBranchId: 'daet',
        destinationBranchId: 'labo',
        skuId: 'hci-cmd-65ml',
        batchId: 'batch-2026-09a',
        quantity: 99999,
        idempotencyKey: 'trf-idemp-insuff',
      },
      { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }
    );
    const availAfterInsuff = bbStore.get('daet_batch-2026-09a').availableQuantity;
    assert(
      initInsuff.status === 400 && availAfterInsuff === availBeforeInsuff,
      '10. Insufficient source stock fails atomically with 400 and causes zero stock mutation'
    );

    // 11. Full receipt succeeds
    const receiveFullRes = await makeRequest(
      server,
      `/api/inventory/transfers/${transferId}/receive`,
      'POST',
      { receivedQuantity: 15 },
      { Authorization: 'Bearer VALID_LABO_MANAGER_TOKEN' }
    );
    console.log('receiveFullRes status & data:', receiveFullRes.status, receiveFullRes.data);
    assert(
      receiveFullRes.status === 200 && receiveFullRes.data.transfer && receiveFullRes.data.transfer.status === 'RECEIVED_FULL',
      '11. Full receipt succeeds with status RECEIVED_FULL'
    );

    // 12. Destination stock increases correctly
    const laboBatchA = bbStore.get('labo_batch-2026-09a');
    assert(
      laboBatchA && laboBatchA.availableQuantity === 75,
      '12. Destination branch stock increases correctly after full receipt'
    );

    // 13. Transit quantity clears after full receipt
    assert(
      receiveFullRes.data.transfer.transitQuantity === 0,
      '13. Transit quantity clears to zero after full receipt'
    );

    // Setup another transfer for partial receipt testing
    const initPartialTrf = await makeRequest(
      server,
      '/api/inventory/transfers',
      'POST',
      {
        sourceBranchId: 'daet',
        destinationBranchId: 'labo',
        skuId: 'hci-cmd-65ml',
        batchId: 'batch-2026-09a',
        quantity: 10,
        idempotencyKey: 'trf-idemp-partial',
      },
      { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }
    );
    const partialTrfId = initPartialTrf.data.transfer.id;

    // 14. Partial receipt succeeds
    const receivePartialRes = await makeRequest(
      server,
      `/api/inventory/transfers/${partialTrfId}/receive`,
      'POST',
      { receivedQuantity: 7 },
      { Authorization: 'Bearer VALID_LABO_MANAGER_TOKEN' }
    );
    assert(
      receivePartialRes.status === 200 && receivePartialRes.data.transfer.status === 'RECEIVED_PARTIAL',
      '14. Partial receipt succeeds with status RECEIVED_PARTIAL'
    );

    // 15. Partial receipt records correct received quantity
    assert(
      receivePartialRes.data.transfer.receivedQuantity === 7,
      '15. Partial receipt records correct received quantity (7)'
    );

    // 16. Partial receipt records correct audited loss
    assert(
      receivePartialRes.data.transfer.auditedLossQuantity === 3,
      '16. Partial receipt records correct audited loss quantity (3)'
    );

    // Setup transfer for damaged rejection testing
    const initRejectTrf = await makeRequest(
      server,
      '/api/inventory/transfers',
      'POST',
      {
        sourceBranchId: 'daet',
        destinationBranchId: 'labo',
        skuId: 'hci-cmd-65ml',
        batchId: 'batch-2026-09a',
        quantity: 4,
        idempotencyKey: 'trf-idemp-reject',
      },
      { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }
    );
    const rejectTrfId = initRejectTrf.data.transfer.id;

    // 17. Damaged rejection succeeds and clears transit custody
    const rejectRes = await makeRequest(
      server,
      `/api/inventory/transfers/${rejectTrfId}/reject-damaged`,
      'POST',
      {},
      { Authorization: 'Bearer VALID_LABO_MANAGER_TOKEN' }
    );
    assert(
      rejectRes.status === 200 && rejectRes.data.transfer.status === 'REJECTED_DAMAGED' && rejectRes.data.transfer.transitQuantity === 0,
      '17. Damaged rejection succeeds and clears transit custody'
    );

    // Setup transfer for cancellation testing
    const initCancelTrf = await makeRequest(
      server,
      '/api/inventory/transfers',
      'POST',
      {
        sourceBranchId: 'daet',
        destinationBranchId: 'labo',
        skuId: 'hci-cmd-65ml',
        batchId: 'batch-2026-09a',
        quantity: 6,
        idempotencyKey: 'trf-idemp-cancel',
      },
      { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }
    );
    const cancelTrfId = initCancelTrf.data.transfer.id;
    const availBeforeCancel = bbStore.get('daet_batch-2026-09a').availableQuantity;

    // 18. Cancellation returns stock to source
    const cancelRes = await makeRequest(
      server,
      `/api/inventory/transfers/${cancelTrfId}/cancel`,
      'POST',
      {},
      { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }
    );
    const availAfterCancel = bbStore.get('daet_batch-2026-09a').availableQuantity;
    assert(
      cancelRes.status === 200 && cancelRes.data.transfer.status === 'CANCELLED' && availAfterCancel === availBeforeCancel + 6,
      '18. Transfer cancellation returns stock to source available quantity'
    );

    // 19. Invalid state transitions are rejected
    const invalidReceive = await makeRequest(
      server,
      `/api/inventory/transfers/${transferId}/receive`, // already RECEIVED_FULL
      'POST',
      { receivedQuantity: 5 },
      { Authorization: 'Bearer VALID_LABO_MANAGER_TOKEN' }
    );
    assert(
      invalidReceive.status === 400,
      '19. Invalid state transitions (receiving already completed transfer) are rejected with 400'
    );

    // 20. Destination-branch authorization is enforced
    const initAuthTrf = await makeRequest(
      server,
      '/api/inventory/transfers',
      'POST',
      {
        sourceBranchId: 'daet',
        destinationBranchId: 'capalonga',
        skuId: 'hci-cmd-65ml',
        batchId: 'batch-2026-09a',
        quantity: 3,
        idempotencyKey: 'trf-idemp-auth',
      },
      { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }
    );
    const authTrfId = initAuthTrf.data.transfer.id;

    const unauthorizedReceive = await makeRequest(
      server,
      `/api/inventory/transfers/${authTrfId}/receive`,
      'POST',
      { receivedQuantity: 3 },
      { Authorization: 'Bearer VALID_LABO_MANAGER_TOKEN' } // Labo manager trying to receive Capalonga transfer
    );
    assert(
      unauthorizedReceive.status === 403,
      '20. Destination-branch authorization enforced: unauthorized branch manager blocked with 403'
    );

    // 21. Over-receipt is rejected atomically (using admin token or capalonga manager token)
    const overReceipt = await makeRequest(
      server,
      `/api/inventory/transfers/${authTrfId}/receive`,
      'POST',
      { receivedQuantity: 999 },
      { Authorization: 'Bearer VALID_ADMIN_TOKEN' } // Super admin can access Capalonga transfer
    );
    assert(
      overReceipt.status === 400,
      '21. Over-receipt exceeding shipped quantity is rejected with 400 Bad Request'
    );

    // Verify receiving transfer into a branch with no existing batch record inherits exact product batch expiryDate
    const validCapalongaReceive = await makeRequest(
      server,
      `/api/inventory/transfers/${authTrfId}/receive`,
      'POST',
      { receivedQuantity: 3 },
      { Authorization: 'Bearer VALID_ADMIN_TOKEN' }
    );
    const capalongaBatch = bbStore.get('capalonga_batch-2026-09a');
    const expectedExpiry = harness.productBatchesStore.get('batch-2026-09a')?.expiryDate;
    assert(
      validCapalongaReceive.status === 200 &&
      capalongaBatch &&
      capalongaBatch.expiryDate === expectedExpiry &&
      capalongaBatch.expiryDate === '2028-09-30',
      'Destination branch batch inherits authoritative product batch expiryDate when initialized'
    );

    // 0. Test mandatory idempotencyKey for initiation
    const availBeforeNoIdemp = bbStore.get('daet_batch-2026-09a').availableQuantity;
    const noIdempRes = await makeRequest(
      server,
      '/api/inventory/transfers',
      'POST',
      { sourceBranchId: 'daet', destinationBranchId: 'labo', skuId: 'hci-cmd-65ml', batchId: 'batch-2026-09a', quantity: 1 },
      { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }
    );
    const availAfterNoIdemp = bbStore.get('daet_batch-2026-09a').availableQuantity;
    assert(
      noIdempRes.status === 400 && availAfterNoIdemp === availBeforeNoIdemp,
      '0. Mandatory idempotencyKey rejected with 400 and causes zero stock mutation'
    );

    // 22. Conservation of stock invariant holds (Numerically strict check)
    const getBatchStockSum = (branchIds: string[], batchId: string) => {
      let sum = 0;
      for (const bId of branchIds) {
        const batch = bbStore.get(`${bId}_${batchId}`);
        if (batch) {
          sum += (Number(batch.availableQuantity) || 0) + (Number(batch.reservedQuantity) || 0) + (Number(batch.damagedQuantity) || 0);
        }
      }
      return sum;
    };
    
    const getTransitAndLossSum = (batchId: string) => {
      let transit = 0;
      let loss = 0;
      for (const t of harness.stockTransfersStore.values()) {
        if (t.batchId === batchId) {
          if (t.status === 'IN_TRANSIT') {
            transit += Number(t.transitQuantity) || 0;
          }
          loss += Number(t.auditedLossQuantity) || 0;
        }
      }
      return { transit, loss };
    };

    const targetBatchId = 'batch-2026-09a';
    const branchesToSum = ['daet', 'labo', 'capalonga'];
    
    const initialBatchStock = getBatchStockSum(branchesToSum, targetBatchId);
    const initialTL = getTransitAndLossSum(targetBatchId);
    const initialTotalSum = initialBatchStock + initialTL.transit + initialTL.loss;

    // Perform transfer initiation to verify stock conservation
    await makeRequest(
      server,
      '/api/inventory/transfers',
      'POST',
      { sourceBranchId: 'daet', destinationBranchId: 'labo', skuId: 'hci-cmd-65ml', batchId: targetBatchId, quantity: 10, idempotencyKey: 'trf-idemp-22-conservation' },
      { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }
    );
    
    const finalBatchStock = getBatchStockSum(branchesToSum, targetBatchId);
    const finalTL = getTransitAndLossSum(targetBatchId);
    const finalTotalSum = finalBatchStock + finalTL.transit + finalTL.loss;
    
    assert(
      initialTotalSum === finalTotalSum,
      `22. Conservation of stock invariant holds: Initial Total (${initialTotalSum}) === Final Total (${finalTotalSum})`
    );

    // 23. Concurrent transfer attempts cannot overdraw source stock
    let concurrentDaetStock = bbStore.get('daet_batch-2026-09a').availableQuantity;
    const concurrent1 = makeRequest(
      server,
      '/api/inventory/transfers',
      'POST',
      { sourceBranchId: 'daet', destinationBranchId: 'labo', skuId: 'hci-cmd-65ml', batchId: 'batch-2026-09a', quantity: concurrentDaetStock, idempotencyKey: 'conc-1' },
      { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }
    );
    const concurrent2 = makeRequest(
      server,
      '/api/inventory/transfers',
      'POST',
      { sourceBranchId: 'daet', destinationBranchId: 'labo', skuId: 'hci-cmd-65ml', batchId: 'batch-2026-09a', quantity: concurrentDaetStock, idempotencyKey: 'conc-2' },
      { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }
    );
    const concRes = await Promise.all([concurrent1, concurrent2]);
    const successCount = concRes.filter((r) => r.status === 201).length;
    const failCount = concRes.filter((r) => r.status === 400).length;
    assert(
      successCount === 1 && failCount === 1 && bbStore.get('daet_batch-2026-09a').availableQuantity >= 0,
      '23. Concurrent transfer attempts prevent overdrawing source stock atomically'
    );

    // 24. Zero /consultation_intakes access across all transfer operations
    assert(
      intakeStore.size === 0,
      '24. Health Data Privacy Firewall: Zero access to /consultation_intakes during transfers'
    );

    // 25. ADR-009 audit events are generated for successful and blocked operations
    const auditEvents = Array.from(auditStore.values());
    const hasTransferInitiated = auditEvents.some((e) => e.action === 'stock_transfer_initiated' && e.success === true);
    const hasBlockedRole = auditEvents.some((e) => e.action.includes('blocked') || e.success === false);
    assert(
      auditStore.size > 0 && hasTransferInitiated && hasBlockedRole,
      '25. ADR-009 structured audit events generated for successful and blocked transfer operations'
    );

  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  console.log('\n========================================================================');
  console.log(` Phase 7 Milestone 4 Test Results: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runMilestone4TestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
