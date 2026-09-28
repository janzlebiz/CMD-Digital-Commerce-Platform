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
    ['staff-super-admin-uid', { uid: 'staff-super-admin-uid', email: 'admin@hcicmd.ph', role: 'super_admin' }],
    ['user-alice-customer', { uid: 'user-alice-customer', email: 'alice@example.ph', role: 'customer' }],
  ]);

  const inventoryStore = new Map<string, any>();
  const branchBatchInventoryStore = new Map<string, any>();
  const productBatchesStore = new Map<string, any>();
  const ordersStore = new Map<string, any>();
  const auditLogsStore = new Map<string, any>();

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

  return { mockDb, mockAuth, branchBatchInventoryStore, productBatchesStore, ordersStore };
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

async function runMilestone25TestSuite() {
  console.log('========================================================================');
  console.log(' Phase 7 — Milestone 2.5: Order Checkout / FEFO Reservation Integration ');
  console.log('========================================================================\n');

  const harness = createTestHarness();
  const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth });
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const pbStore = harness.productBatchesStore;
    const bbStore = harness.branchBatchInventoryStore;
    const ordersStore = harness.ordersStore;

    // 1. Checkout reserves FEFO stock (earliest expiring batch-2026-09a first)
    const checkout1 = await makeRequest(
      server,
      '/api/orders/checkout',
      'POST',
      {
        branchId: 'daet',
        items: [{ skuId: 'hci-cmd-65ml', quantity: 10 }],
        deliveryMethod: 'branch_pickup',
        paymentMethod: 'cash_on_delivery',
      },
      { Authorization: 'Bearer VALID_CUSTOMER_TOKEN' }
    );
    const batchA = bbStore.get('daet_batch-2026-09a');
    assert(
      checkout1.status === 200 &&
      checkout1.data.success === true &&
      checkout1.data.order.batchAllocations['hci-cmd-65ml'][0].batchId === 'batch-2026-09a' &&
      batchA.reservedQuantity === 20,
      '1. Checkout successfully reserves FEFO stock from earliest expiring batch'
    );

    // 2. Multi-batch checkout works when quantity exceeds first batch available quantity
    const availABefore = batchA.availableQuantity;
    const checkout2 = await makeRequest(
      server,
      '/api/orders/checkout',
      'POST',
      {
        branchId: 'daet',
        items: [{ skuId: 'hci-cmd-65ml', quantity: availABefore + 5 }],
        deliveryMethod: 'branch_pickup',
      },
      { Authorization: 'Bearer VALID_CUSTOMER_TOKEN' }
    );
    const allocations = checkout2.data.order.batchAllocations['hci-cmd-65ml'];
    assert(
      checkout2.status === 200 &&
      allocations.length >= 2 &&
      allocations[0].batchId === 'batch-2026-09a' &&
      allocations[1].batchId === 'batch-2026-09b',
      '2. Multi-batch checkout correctly spans multiple batches in FEFO order'
    );

    // 3. Expired, pending, and failed QC stock are skipped during checkout
    pbStore.set('batch-pending-chk', {
      id: 'batch-pending-chk', batchNumber: 'PEND-CHK', skuId: 'hci-cmd-65ml',
      manufactureDate: '2026-01-01', expiryDate: '2029-01-01', qualityControlStatus: 'pending', totalManufacturedQuantity: 100
    });
    bbStore.set('daet_batch-pending-chk', {
      id: 'daet_batch-pending-chk', branchId: 'daet', batchId: 'batch-pending-chk', skuId: 'hci-cmd-65ml',
      availableQuantity: 50, reservedQuantity: 0, damagedQuantity: 0, expiryDate: '2029-01-01', updatedAt: new Date().toISOString()
    });

    pbStore.set('batch-failed-chk', {
      id: 'batch-failed-chk', batchNumber: 'FAIL-CHK', skuId: 'hci-cmd-65ml',
      manufactureDate: '2026-01-01', expiryDate: '2029-01-01', qualityControlStatus: 'failed', totalManufacturedQuantity: 100
    });
    bbStore.set('daet_batch-failed-chk', {
      id: 'daet_batch-failed-chk', branchId: 'daet', batchId: 'batch-failed-chk', skuId: 'hci-cmd-65ml',
      availableQuantity: 50, reservedQuantity: 0, damagedQuantity: 0, expiryDate: '2029-01-01', updatedAt: new Date().toISOString()
    });

    pbStore.set('batch-expired-chk', {
      id: 'batch-expired-chk', batchNumber: 'EXP-CHK', skuId: 'hci-cmd-65ml',
      manufactureDate: '2024-01-01', expiryDate: '2024-12-31', qualityControlStatus: 'passed', totalManufacturedQuantity: 100
    });
    bbStore.set('daet_batch-expired-chk', {
      id: 'daet_batch-expired-chk', branchId: 'daet', batchId: 'batch-expired-chk', skuId: 'hci-cmd-65ml',
      availableQuantity: 50, reservedQuantity: 0, damagedQuantity: 0, expiryDate: '2024-12-31', updatedAt: new Date().toISOString()
    });

    const checkoutFilterTest = await makeRequest(
      server,
      '/api/orders/checkout',
      'POST',
      {
        branchId: 'daet',
        items: [{ skuId: 'hci-cmd-65ml', quantity: 2 }],
        deliveryMethod: 'branch_pickup',
      },
      { Authorization: 'Bearer VALID_CUSTOMER_TOKEN' }
    );
    const usedInvalidBatches = checkoutFilterTest.data.order?.batchAllocations['hci-cmd-65ml']?.some(
      (a: any) => a.batchId === 'batch-pending-chk' || a.batchId === 'batch-failed-chk' || a.batchId === 'batch-expired-chk'
    );
    assert(
      checkoutFilterTest.status === 200 && usedInvalidBatches === false,
      '3. Expired, pending, and failed QC batches are correctly skipped during checkout'
    );

    // 4. Insufficient stock creates no order and no stock mutation
    const orderCountBeforeInsuff = ordersStore.size;
    const targetBatchRef = bbStore.get('daet_batch-2026-09b');
    const availBeforeInsuff = targetBatchRef ? targetBatchRef.availableQuantity : 0;

    const checkoutInsuff = await makeRequest(
      server,
      '/api/orders/checkout',
      'POST',
      {
        branchId: 'daet',
        items: [{ skuId: 'hci-cmd-65ml', quantity: 999999 }],
        deliveryMethod: 'branch_pickup',
      },
      { Authorization: 'Bearer VALID_CUSTOMER_TOKEN' }
    );

    const orderCountAfterInsuff = ordersStore.size;
    const availAfterInsuff = targetBatchRef ? targetBatchRef.availableQuantity : 0;

    assert(
      checkoutInsuff.status === 400 &&
      orderCountAfterInsuff === orderCountBeforeInsuff &&
      availAfterInsuff === availBeforeInsuff,
      '4. Insufficient stock creates no order and causes zero stock mutation'
    );

    // 5. /inventory aggregate remains reconciled
    const reconRes = await makeRequest(
      server,
      '/api/inventory/reconciliation?branchId=daet',
      'GET',
      undefined,
      { Authorization: 'Bearer VALID_ADMIN_TOKEN' }
    );
    assert(
      reconRes.status === 200 && reconRes.data.reconciliation.allConsistent === true,
      '5. Inventory aggregate remains fully reconciled after checkouts'
    );

  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  console.log('\n========================================================================');
  console.log(` Phase 7 Milestone 2.5 Test Results: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runMilestone25TestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
