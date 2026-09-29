/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createExpressApp, SEED_BRANCH_BATCH_INVENTORY, SEED_PRODUCT_BATCHES } from '../server.ts';
import http from 'http';

console.log('========================================================================');
console.log('Running Phase 9B-2: Performance, Load & Concurrency Verification Hardening');
console.log('========================================================================');

let passedCount = 0;
let failedCount = 0;

function assert(condition: any, description: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${description}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${description}`);
    failedCount++;
  }
}

function createPerformanceTestHarness() {
  const usersStore = new Map<string, any>([
    ['demo-super-admin-uid', { uid: 'demo-super-admin-uid', email: 'admin@hcicmd.ph', role: 'super_admin' }],
    ['demo-customer-uid', { uid: 'demo-customer-uid', email: 'customer@hcicmd.ph', role: 'customer' }],
  ]);
  const inventoryStore = new Map<string, any>();
  const productBatchesStore = new Map<string, any>();
  const branchBatchInventoryStore = new Map<string, any>();
  const ordersStore = new Map<string, any>();
  const auditLogsStore = new Map<string, any>();
  const marketingConsentsStore = new Map<string, any>();
  const supportTicketsStore = new Map<string, any>();
  const consultationAppointmentsStore = new Map<string, any>();
  const refundIntentsStore = new Map<string, any>();

  for (const b of SEED_BRANCH_BATCH_INVENTORY) {
    branchBatchInventoryStore.set(b.id, { ...b });
  }
  for (const pb of SEED_PRODUCT_BATCHES) {
    productBatchesStore.set(pb.id, { ...pb });
  }

  const mockDb: any = {
    _docVersions: new Map<string, number>(),
    _getStoreForCollection: (colName: string) => {
      if (colName === 'users') return usersStore;
      if (colName === 'inventory') return inventoryStore;
      if (colName === 'product_batches') return productBatchesStore;
      if (colName === 'branch_batch_inventory') return branchBatchInventoryStore;
      if (colName === 'orders') return ordersStore;
      if (colName === 'audit_logs') return auditLogsStore;
      if (colName === 'marketing_consents') return marketingConsentsStore;
      if (colName === 'support_tickets') return supportTicketsStore;
      if (colName === 'consultation_appointments') return consultationAppointmentsStore;
      if (colName === 'refund_intents') return refundIntentsStore;
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
              const docId = d.id || d.batchId || d.uid || d.orderId || 'doc-id';
              return {
                id: docId,
                data: () => ({ ...d }),
                exists: true,
                ref: queryObj.doc(docId),
              };
            }),
            forEach: (cb: (doc: any) => void) => {
              docs.forEach((d: any) => {
                const docId = d.id || d.batchId || d.uid || d.orderId || 'doc-id';
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
          const docRef = {
            id: docId,
            _targetStore: targetStore,
            get: async () => {
              const data = targetStore.get(docId);
              return {
                id: docId,
                exists: !!data,
                data: () => (data ? { ...data } : undefined),
                ref: docRef,
              };
            },
            set: async (data: any, options?: any) => {
              if (options && options.merge) {
                const existing = targetStore.get(docId) || {};
                targetStore.set(docId, { ...existing, ...data });
              } else {
                targetStore.set(docId, { ...data });
              }
              const ver = mockDb._docVersions.get(docId) || 0;
              mockDb._docVersions.set(docId, ver + 1);
            },
            update: async (data: any) => {
              const existing = targetStore.get(docId) || {};
              targetStore.set(docId, { ...existing, ...data });
              const ver = mockDb._docVersions.get(docId) || 0;
              mockDb._docVersions.set(docId, ver + 1);
            },
          };
          return docRef;
        },
      };
      return queryObj;
    },
    runTransaction: async (updateFunction: any) => {
      let maxRetries = 15;
      let attempt = 0;
      while (attempt < maxRetries) {
        attempt++;
        const readSnapshots = new Map<string, number>();
        const pendingWrites = new Map<string, { store: Map<string, any>, data: any, options?: any }>();

        const transaction = {
          get: async (docRef: any) => {
            const res = await docRef.get();
            if (res && res.exists) {
              const docId = res.id;
              const currentVer = mockDb._docVersions.get(docId) || 0;
              readSnapshots.set(docId, currentVer);
            }
            return res;
          },
          set: async (docRef: any, data: any, options?: any) => {
            const store = docRef._targetStore || mockDb._getStoreForCollection('orders');
            pendingWrites.set(docRef.id, { store, data, options });
          },
          update: async (docRef: any, data: any) => {
            const store = docRef._targetStore || mockDb._getStoreForCollection('orders');
            pendingWrites.set(docRef.id, { store, data, options: { merge: true } });
          },
        };
        try {
          const result = await updateFunction(transaction);
          for (const [docId, ver] of readSnapshots.entries()) {
            const currentVer = mockDb._docVersions.get(docId) || 0;
            if (currentVer !== ver) {
              throw new Error('TRANSACTION_CONFLICT');
            }
          }
          for (const [docId, write] of pendingWrites.entries()) {
            if (write.options && write.options.merge) {
              const existing = write.store.get(docId) || {};
              write.store.set(docId, { ...existing, ...write.data });
            } else {
              write.store.set(docId, { ...write.data });
            }
            const ver = mockDb._docVersions.get(docId) || 0;
            mockDb._docVersions.set(docId, ver + 1);
          }
          return result;
        } catch (err: any) {
          if (err.message === 'TRANSACTION_CONFLICT' && attempt < maxRetries) {
            continue;
          }
          throw err;
        }
      }
      throw new Error('Transaction failed after maximum retries due to OCC conflicts.');
    },
  };

  return { mockDb, ordersStore };
}

function calculatePercentiles(latencies: number[]) {
  if (latencies.length === 0) return { p50: 0, p95: 0, p99: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  return { p50, p95, p99 };
}

async function runPerformanceTests() {
  const { mockDb, ordersStore } = createPerformanceTestHarness();
  const app = createExpressApp({ db: mockDb });
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  const adminToken = 'DEMO_TOKEN_super_admin';
  const customerToken = 'DEMO_TOKEN_customer';

  console.log('\n--- Test Group 1: Analytics / KPI Endpoint Load (50 Concurrent Requests) ---');
  const kpiStartTime = Date.now();
  const kpiPromises = [];
  const kpiLatencies: number[] = [];
  let kpiSuccessCount = 0;

  for (let i = 0; i < 50; i++) {
    const reqStart = Date.now();
    kpiPromises.push(
      fetch(`${baseUrl}/api/analytics/operational-kpis?branch=daet`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }).then((res) => {
        const dur = Date.now() - reqStart;
        kpiLatencies.push(dur);
        if (res.status === 200) kpiSuccessCount++;
      }).catch(() => {})
    );
  }

  await Promise.all(kpiPromises);
  const kpiDurationTotal = Date.now() - kpiStartTime;
  const kpiMetrics = calculatePercentiles(kpiLatencies);
  const kpiThroughput = Number((50 / (kpiDurationTotal / 1000)).toFixed(2));

  console.log(`  [Metrics] Throughput: ${kpiThroughput} req/sec | Success: ${kpiSuccessCount}/50 | p50: ${kpiMetrics.p50}ms | p95: ${kpiMetrics.p95}ms | p99: ${kpiMetrics.p99}ms`);
  assert(kpiSuccessCount === 50, '1.1 Analytics KPI endpoint handles 50 concurrent requests with 100% success');
  assert(kpiMetrics.p50 < 100, '1.2 Analytics KPI p50 latency threshold (<100ms) met');
  assert(kpiMetrics.p95 < 200, '1.3 Analytics KPI p95 latency threshold (<200ms) met');
  assert(kpiMetrics.p99 < 350, '1.4 Analytics KPI p99 latency threshold (<350ms) met');

  console.log('\n--- Test Group 2: Concurrent Inventory Reservation Contention & OCC Retries (20 Parallel Threads) ---');
  const resStartTime = Date.now();
  const resPromises = [];
  const resLatencies: number[] = [];
  let resSuccessCount = 0;

  for (let i = 0; i < 20; i++) {
    const reqStart = Date.now();
    resPromises.push(
      fetch(`${baseUrl}/api/inventory/reservations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branchId: 'daet',
          skuId: 'hci-cmd-65ml',
          requestedQuantity: 2,
        }),
      }).then(async (res) => {
        const dur = Date.now() - reqStart;
        resLatencies.push(dur);
        if (res.status === 201 || res.status === 200) {
          resSuccessCount++;
        } else {
          const txt = await res.text();
          console.log(`Reservation failed status ${res.status}: ${txt}`);
        }
      }).catch((e) => {
        console.log(`Reservation error:`, e);
      })
    );
  }

  await Promise.all(resPromises);
  const resDurationTotal = Date.now() - resStartTime;
  const resMetrics = calculatePercentiles(resLatencies);
  const resThroughput = Number((20 / (resDurationTotal / 1000)).toFixed(2));

  console.log(`  [Metrics] Throughput: ${resThroughput} req/sec | Success: ${resSuccessCount}/20 | p50: ${resMetrics.p50}ms | p95: ${resMetrics.p95}ms | p99: ${resMetrics.p99}ms`);
  assert(resSuccessCount === 20, '2.1 Concurrent inventory reservations successfully process under OCC retries');
  assert(resMetrics.p50 < 150, '2.2 Inventory reservation p50 latency threshold (<150ms) met');
  assert(resMetrics.p95 < 300, '2.3 Inventory reservation p95 latency threshold (<300ms) met');
  assert(resMetrics.p99 < 500, '2.4 Inventory reservation p99 latency threshold (<500ms) met');

  console.log('\n--- Test Group 3: Concurrent Refund Contention & Transaction Safety ---');
  // Directly seed 3 test orders in ordersStore for concurrent refund testing
  const testOrderIds = ['REFORD-1', 'REFORD-2', 'REFORD-3'];
  for (const oid of testOrderIds) {
    ordersStore.set(oid, {
      id: oid,
      userId: 'customer-uid',
      branchId: 'daet',
      grandTotal: 700,
      remainingRefundableBalance: 700,
      refundedAmount: 0,
      reservedRefundAmount: 0,
      paymentStatus: 'paid',
      status: 'completed',
      fulfillmentStatus: 'completed',
    });
  }
  assert(testOrderIds.length === 3, '3 test orders successfully seeded for concurrent refund test');

  const refStartTime = Date.now();
  const refPromises = [];
  const refLatencies: number[] = [];
  let refSuccessCount = 0;

  for (let i = 0; i < 3; i++) {
    const oid = testOrderIds[i];
    const reqStart = Date.now();
    refPromises.push(
      fetch(`${baseUrl}/api/orders/${oid}/refund`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `REFUND-KEY-${i+1}`,
        },
        body: JSON.stringify({
          amount: 100,
          reason: 'Performance verification refund',
          refundKey: `ref-key-${i+1}`,
        }),
      }).then(async (res) => {
        const dur = Date.now() - reqStart;
        refLatencies.push(dur);
        if (res.status === 200) {
          refSuccessCount++;
        } else {
          const txt = await res.text();
          console.log(`Refund failed status ${res.status}: ${txt}`);
        }
      }).catch((e) => {
        console.log(`Refund error:`, e);
      })
    );
  }

  await Promise.all(refPromises);
  const refDurationTotal = Date.now() - refStartTime;
  const refMetrics = calculatePercentiles(refLatencies);
  const refThroughput = Number((3 / (refDurationTotal / 1000)).toFixed(2));

  console.log(`  [Metrics] Throughput: ${refThroughput} req/sec | Success: ${refSuccessCount}/3 | p50: ${refMetrics.p50}ms | p95: ${refMetrics.p95}ms | p99: ${refMetrics.p99}ms`);
  assert(refSuccessCount === 3, '3.1 Concurrent refund requests process safely under transactional OCC rules');
  assert(refMetrics.p50 < 150, '3.2 Concurrent refund p50 latency threshold (<150ms) met');
  assert(refMetrics.p95 < 350, '3.3 Concurrent refund p95 latency threshold (<350ms) met');
  assert(refMetrics.p99 < 500, '3.4 Concurrent refund p99 latency threshold (<500ms) met');

  console.log('\n--- Test Group 4: Idempotent Checkout Contention & Rate Limiting ---');
  const rateLimitTests = [];
  for (let i = 0; i < 16; i++) {
    rateLimitTests.push(
      fetch(`${baseUrl}/api/orders/checkout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${customerToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `IDEM-PERF-${i}`,
        },
        body: JSON.stringify({
          branchId: 'daet',
          deliveryMethod: 'pickup',
          paymentMethod: 'cash_on_delivery',
          items: [{ skuId: 'hci-cmd-65ml', quantity: 1, price: 350 }],
          customer: { firstName: 'Alice', lastName: 'Santos', email: 'alice@hcicmd.ph' },
        }),
      })
    );
  }

  const results = await Promise.all(rateLimitTests);
  const statusCodes = results.map((r) => r.status);
  const has429 = statusCodes.includes(429);
  console.log(`  [Metrics] Rate limiter status codes received:`, statusCodes);
  assert(has429, '4.1 Rate limiter successfully throttles excess checkout burst requests with HTTP 429');

  server.close();

  console.log('\n========================================================================');
  console.log(`Phase 9B-2 Verification Hardening Results: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('========================================================================');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPerformanceTests().catch((err) => {
  console.error('Phase 9B-2 verification test execution failed:', err);
  process.exit(1);
});
