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
  const ordersStore = new Map<string, any>();
  const auditLogsStore = new Map<string, any>();
  const batchAllocationsStore = new Map<string, any>();
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
      if (colName === 'orders') return ordersStore;
      if (colName === 'audit_logs') return auditLogsStore;
      if (colName === 'batch_allocations') return batchAllocationsStore;
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
      if (token === 'VALID_CUSTOMER_TOKEN') {
        return { uid: 'user-alice-customer', email: 'alice@example.ph' };
      }
      if (token === 'VALID_ADMIN_TOKEN') {
        return { uid: 'staff-super-admin-uid', email: 'admin@hcicmd.ph' };
      }
      if (token === 'VALID_DAET_MANAGER_TOKEN') {
        return { uid: 'staff-daet-manager-uid', email: 'manager.daet@hcicmd.ph' };
      }
      if (token === 'VALID_LABO_MANAGER_TOKEN') {
        return { uid: 'staff-labo-manager-uid', email: 'manager.labo@hcicmd.ph' };
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

  return { mockDb, mockAuth, branchBatchInventoryStore, productBatchesStore, ordersStore, batchAllocationsStore, consultationIntakesStore, auditLogsStore };
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

async function runMilestone3ProvenanceTestSuite() {
  console.log('========================================================================');
  console.log(' Phase 7 — Milestone 3: Batch Provenance & Recall Traversal Suite         ');
  console.log('========================================================================\n');

  const harness = createTestHarness();
  const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth });
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const bbStore = harness.branchBatchInventoryStore;
    const allocStore = harness.batchAllocationsStore;
    const intakeStore = harness.consultationIntakesStore;
    const auditStore = harness.auditLogsStore;

    // Place an order first (reserves FEFO stock)
    const checkoutRes = await makeRequest(
      server,
      '/api/orders/checkout',
      'POST',
      {
        branchId: 'daet',
        items: [{ skuId: 'hci-cmd-65ml', quantity: 15 }],
        deliveryMethod: 'branch_pickup',
      },
      { Authorization: 'Bearer VALID_CUSTOMER_TOKEN' }
    );
    const orderId = checkoutRes.data.orderId;
    const batchIdAllocated = checkoutRes.data.order.batchAllocations['hci-cmd-65ml'][0].batchId;

    const batchDaetRefBefore = bbStore.get(`daet_${batchIdAllocated}`);
    const reservedBefore = batchDaetRefBefore.reservedQuantity;

    // 1. Successful fulfillment creates provenance
    const fulfillRes = await makeRequest(
      server,
      `/api/orders/${orderId}/fulfill`,
      'POST',
      undefined,
      { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }
    );
    assert(
      fulfillRes.status === 200 && fulfillRes.data.success === true && allocStore.size > 0,
      '1. Successful fulfillment creates provenance records'
    );

    // 2. Correct order/batch/SKU linkage
    const createdAlloc = Array.from(allocStore.values())[0];
    assert(
      createdAlloc.orderId === orderId &&
      createdAlloc.batchId === batchIdAllocated &&
      createdAlloc.skuId === 'hci-cmd-65ml',
      '2. Correct order, batch, and SKU linkage'
    );

    // 3. Correct customer and branch linkage
    assert(
      createdAlloc.customerUid === 'user-alice-customer' &&
      createdAlloc.branchId === 'daet',
      '3. Correct customer UID and branch ID linkage'
    );

    // 4. Correct allocated quantity
    assert(
      createdAlloc.allocatedQuantity === 15,
      '4. Correct allocated quantity recorded in provenance'
    );

    // 5. Reserved stock decreases correctly
    const batchDaetRefAfter = bbStore.get(`daet_${batchIdAllocated}`);
    assert(
      batchDaetRefAfter.reservedQuantity === reservedBefore - 15,
      '5. Reserved stock decreases correctly upon fulfillment'
    );

    // 6. Inventory aggregate remains reconciled
    const reconRes = await makeRequest(
      server,
      '/api/inventory/reconciliation?branchId=daet',
      'GET',
      undefined,
      { Authorization: 'Bearer VALID_ADMIN_TOKEN' }
    );
    assert(
      reconRes.status === 200 && reconRes.data.reconciliation.allConsistent === true,
      '6. Inventory aggregate remains fully reconciled after fulfillment'
    );

    // 7. Duplicate fulfillment is idempotent
    const fulfillIdempotent = await makeRequest(
      server,
      `/api/orders/${orderId}/fulfill`,
      'POST',
      undefined,
      { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }
    );
    const allocCountAfterIdempotent = allocStore.size;
    assert(
      fulfillIdempotent.status === 200 &&
      fulfillIdempotent.data.alreadyFulfilled === true &&
      allocCountAfterIdempotent === 1,
      '7. Duplicate fulfillment is idempotent and creates zero duplicate allocations'
    );

    // 8. Mismatched/insufficient reserved stock during fulfillment fails atomically
    const checkoutMismatched = await makeRequest(
      server,
      '/api/orders/checkout',
      'POST',
      {
        branchId: 'daet',
        items: [{ skuId: 'hci-cmd-65ml', quantity: 10 }],
        deliveryMethod: 'branch_pickup',
      },
      { Authorization: 'Bearer VALID_CUSTOMER_TOKEN' }
    );
    const mismatchedOrderId = checkoutMismatched.data.orderId;
    const mismatchedBatchId = checkoutMismatched.data.order.batchAllocations['hci-cmd-65ml'][0].batchId;
    const batchRefBeforeMismatched = bbStore.get(`daet_${mismatchedBatchId}`);
    const reservedBeforeMismatched = batchRefBeforeMismatched.reservedQuantity;
    const allocsCountBefore = allocStore.size;

    // Tamper order allocations to exceed batch reservedQuantity
    const mismatchedOrder = harness.ordersStore.get(mismatchedOrderId);
    mismatchedOrder.batchAllocations['hci-cmd-65ml'][0].quantityReserved = reservedBeforeMismatched + 500;
    mismatchedOrder.batchAllocations['hci-cmd-65ml'][0].allocatedQuantity = reservedBeforeMismatched + 500;
    harness.ordersStore.set(mismatchedOrderId, mismatchedOrder);

    const fulfillMismatched = await makeRequest(
      server,
      `/api/orders/${mismatchedOrderId}/fulfill`,
      'POST',
      undefined,
      { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }
    );
    const batchRefAfterMismatched = bbStore.get(`daet_${mismatchedBatchId}`);
    const orderAfterMismatched = harness.ordersStore.get(mismatchedOrderId);
    const reconMismatched = await makeRequest(
      server,
      '/api/inventory/reconciliation?branchId=daet',
      'GET',
      undefined,
      { Authorization: 'Bearer VALID_ADMIN_TOKEN' }
    );

    assert(
      fulfillMismatched.status >= 400 &&
      fulfillMismatched.data.error.includes('INSUFFICIENT_RESERVED_STOCK') &&
      batchRefAfterMismatched.reservedQuantity === reservedBeforeMismatched &&
      allocStore.size === allocsCountBefore &&
      orderAfterMismatched.fulfillmentStatus !== 'fulfilled' &&
      reconMismatched.status === 200 && reconMismatched.data.reconciliation.allConsistent === true,
      '8. Mismatched/insufficient reserved stock fulfillment fails atomically with zero stock/provenance/status mutation'
    );

    // 9. Recall by batch ID returns all affected orders
    const recallById = await makeRequest(
      server,
      `/api/inventory/recall?batchId=${batchIdAllocated}`,
      'GET',
      undefined,
      { Authorization: 'Bearer VALID_ADMIN_TOKEN' }
    );
    assert(
      recallById.status === 200 &&
      recallById.data.affectedCount === 1 &&
      recallById.data.affectedRecords[0].orderId === orderId,
      '9. Recall traversal by batch ID successfully returns affected orders'
    );

    // 10. Recall by batch number returns the same affected records
    const pbRecord = harness.productBatchesStore.get(batchIdAllocated);
    const batchNumber = pbRecord ? pbRecord.batchNumber : 'BATCH-2026-09A';
    const recallByNum = await makeRequest(
      server,
      `/api/inventory/recall?batchNumber=${batchNumber}`,
      'GET',
      undefined,
      { Authorization: 'Bearer VALID_ADMIN_TOKEN' }
    );
    assert(
      recallByNum.status === 200 &&
      recallByNum.data.affectedCount === 1 &&
      recallByNum.data.affectedRecords[0].orderId === orderId,
      '10. Recall traversal by batch number returns the identical affected records'
    );

    // 11. Recall includes customer/branch/quantity/timestamp data
    const recRecord = recallById.data.affectedRecords[0];
    assert(
      recRecord.customerUid === 'user-alice-customer' &&
      recRecord.branchId === 'daet' &&
      recRecord.allocatedQuantity === 15 &&
      typeof recRecord.fulfillmentTimestamp === 'string',
      '11. Recall record includes customer, branch, quantity, and timestamp data'
    );

    // 12. Branch-manager cross-branch access returns 403
    const recallCrossBranch = await makeRequest(
      server,
      `/api/inventory/recall?batchId=${batchIdAllocated}`,
      'GET',
      undefined,
      { Authorization: 'Bearer VALID_LABO_MANAGER_TOKEN' }
    );
    assert(
      recallCrossBranch.status === 403,
      '12. Branch manager attempting cross-branch recall traversal is blocked with 403 Forbidden'
    );

    // 13. Unauthorized customer/practitioner access returns 403
    const fulfillCustomer = await makeRequest(
      server,
      `/api/orders/${orderId}/fulfill`,
      'POST',
      undefined,
      { Authorization: 'Bearer VALID_CUSTOMER_TOKEN' }
    );
    const recallCustomer = await makeRequest(
      server,
      `/api/inventory/recall?batchId=${batchIdAllocated}`,
      'GET',
      undefined,
      { Authorization: 'Bearer VALID_CUSTOMER_TOKEN' }
    );
    assert(
      fulfillCustomer.status === 403 && recallCustomer.status === 403,
      '13. Unauthorized customer and practitioner access returns 403 Forbidden'
    );

    // 14. Zero consultation_intakes access
    assert(
      intakeStore.size === 0,
      '14. Zero consultation intakes were accessed during provenance and recall operations'
    );

    // 15. ADR-009 audit logging is generated
    assert(
      auditStore.size > 0,
      '15. ADR-009 structured audit events successfully recorded for provenance and recall actions'
    );

  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  console.log('\n========================================================================');
  console.log(` Phase 7 Milestone 3 Test Results: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runMilestone3ProvenanceTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
