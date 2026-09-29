/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createExpressApp } from '../server.ts';
import http from 'http';

console.log('========================================================================');
console.log('Running Phase 9B-2: Performance, Load & Concurrency Validation Suite');
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

  const batchIdKey = 'BATCH-DAET-01';
  branchBatchInventoryStore.set(batchIdKey, {
    id: batchIdKey,
    branchId: 'daet',
    skuId: 'hci-cmd-65ml',
    batchId: 'BATCH-DAET-01',
    batchNumber: 'BATCH-DAET-01',
    availableQuantity: 100,
    reservedQuantity: 0,
    expirationDate: '2027-12-31T00:00:00.000Z',
    status: 'active',
  });

  productBatchesStore.set('BATCH-DAET-01', {
    batchId: 'BATCH-DAET-01',
    skuId: 'hci-cmd-65ml',
    branchId: 'daet',
    qualityControlStatus: 'passed',
    expiryDate: '2027-12-31T00:00:00.000Z',
  });

  const mockDb: any = {
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
              const docId = d.id || d.batchId || d.uid || 'doc-id';
              return {
                id: docId,
                data: () => ({ ...d }),
                exists: true,
                ref: queryObj.doc(docId),
              };
            }),
            forEach: (cb: (doc: any) => void) => {
              docs.forEach((d: any) => {
                const docId = d.id || d.batchId || d.uid || 'doc-id';
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
            },
            update: async (data: any) => {
              const existing = targetStore.get(docId) || {};
              targetStore.set(docId, { ...existing, ...data });
            },
          };
          return docRef;
        },
      };
      return queryObj;
    },
    runTransaction: async (updateFunction: any) => {
      const transaction = {
        get: async (refOrQuery: any) => {
          if (typeof refOrQuery.get === 'function') {
            return await refOrQuery.get();
          }
          throw new Error('Invalid transaction.get target');
        },
        set: async (docRef: any, data: any, options?: any) => {
          await docRef.set(data, options);
        },
        update: async (docRef: any, data: any) => {
          await docRef.update(data);
        },
      };
      return await updateFunction(transaction);
    },
  };

  return { mockDb };
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
  const { mockDb } = createPerformanceTestHarness();
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
  assert(kpiMetrics.p95 < 200, '1.2 Analytics KPI endpoint p95 latency is under 200ms');

  console.log('\n--- Test Group 2: Concurrent Inventory Reservation Contention (20 Parallel Threads) ---');
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
        if (res.status === 201 || res.status === 200) resSuccessCount++;
      }).catch(() => {})
    );
  }

  await Promise.all(resPromises);
  const resDurationTotal = Date.now() - resStartTime;
  const resMetrics = calculatePercentiles(resLatencies);
  const resThroughput = Number((20 / (resDurationTotal / 1000)).toFixed(2));

  console.log(`  [Metrics] Throughput: ${resThroughput} req/sec | Success: ${resSuccessCount}/20 | p50: ${resMetrics.p50}ms | p95: ${resMetrics.p95}ms`);
  assert(resSuccessCount === 20, '2.1 Concurrent inventory reservations successfully process');
  assert(resMetrics.p95 < 300, '2.2 Inventory reservation p95 latency is under 300ms');

  console.log('\n--- Test Group 3: Idempotent Checkout Contention & Rate Limiting ---');
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
  assert(has429, '3.1 Rate limiter successfully throttles excess checkout burst requests with HTTP 429');

  server.close();

  console.log('\n========================================================================');
  console.log(`Phase 9B-2 Performance Validation Results: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('========================================================================');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPerformanceTests().catch((err) => {
  console.error('Phase 9B-2 test execution failed:', err);
  process.exit(1);
});
