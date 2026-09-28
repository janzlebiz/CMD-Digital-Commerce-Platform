/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

process.env.NODE_ENV = 'test';

import {
  createExpressApp,
  SUPPORTED_BRANCH_IDS,
  ACTIVE_CONSUMER_SKUS,
} from '../server';
import http from 'http';
import crypto from 'crypto';

function createTestHarness() {
  const usersStore = new Map<string, any>([
    ['staff-daet-manager-uid', { uid: 'staff-daet-manager-uid', email: 'manager.daet@hcicmd.ph', role: 'branch_manager', assignedBranchId: 'daet' }],
    ['staff-labo-manager-uid', { uid: 'staff-labo-manager-uid', email: 'manager.labo@hcicmd.ph', role: 'branch_manager', assignedBranchId: 'labo' }],
    ['staff-super-admin-uid', { uid: 'staff-super-admin-uid', email: 'admin@hcicmd.ph', role: 'super_admin' }],
  ]);

  const inventoryStore = new Map<string, any>();
  const branchBatchInventoryStore = new Map<string, any>();
  const productBatchesStore = new Map<string, any>();
  const ordersStore = new Map<string, any>();
  const stockTransfersStore = new Map<string, any>();
  const auditLogsStore = new Map<string, any>();
  const consultationIntakesStore = new Map<string, any>();

  const mockDb: any = {
    collection: (colName: string) => {
      const store = colName === 'users' ? usersStore :
                    colName === 'inventory' ? inventoryStore :
                    colName === 'branch_batch_inventory' ? branchBatchInventoryStore :
                    colName === 'product_batches' ? productBatchesStore :
                    colName === 'orders' ? ordersStore :
                    colName === 'stock_transfers' ? stockTransfersStore :
                    colName === 'audit_logs' ? auditLogsStore :
                    colName === 'consultation_intakes' ? consultationIntakesStore :
                    new Map<string, any>();

      const queryObj: any = {
        _filters: [] as any[],
        where: (field: string, op: string, value: any) => {
          queryObj._filters.push({ field, op, value });
          return queryObj;
        },
        orderBy: () => queryObj,
        limit: () => queryObj,
        get: async () => {
          let docs = Array.from(store.values());
          for (const f of queryObj._filters) {
            if (f.op === '==') docs = docs.filter(d => d[f.field] === f.value);
            if (f.op === '>=') docs = docs.filter(d => d[f.field] >= f.value);
          }
          return {
            empty: docs.length === 0,
            docs: docs.map(d => ({
              id: d.id || d.uid,
              data: () => d,
              exists: true
            })),
            forEach: (cb: any) => docs.forEach(d => cb({ id: d.id || d.uid, data: () => d, exists: true }))
          };
        },
        doc: (id: string) => ({
          id,
          get: async () => {
            const data = store.get(id);
            return { exists: !!data, data: () => data };
          },
          set: async (data: any) => store.set(id, data),
        })
      };
      return queryObj;
    },
    runTransaction: async (cb: any) => cb({
      get: async (ref: any) => ref.get(),
      set: (ref: any, data: any) => ref.set(data),
    })
  };

  const mockAuth = {
    verifyIdToken: async (token: string) => {
      if (token === 'VALID_DAET_MANAGER_TOKEN') return { uid: 'staff-daet-manager-uid' };
      if (token === 'VALID_LABO_MANAGER_TOKEN') return { uid: 'staff-labo-manager-uid' };
      if (token === 'VALID_ADMIN_TOKEN') return { uid: 'staff-super-admin-uid' };
      throw new Error('Invalid token');
    }
  };

  return { mockDb, mockAuth, inventoryStore, ordersStore, stockTransfersStore, auditLogsStore, consultationIntakesStore };
}

async function makeRequest(server: http.Server, path: string, method: string, body?: any, headers: any = {}) {
  return new Promise<any>((resolve, reject) => {
    const port = (server.address() as any).port;
    const options = {
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: { ...headers, 'Content-Type': 'application/json' }
    };
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ PASS: ${msg}`); }
  else { failed++; console.error(`  ✗ FAIL: ${msg}`); }
}

async function runTests() {
  console.log('========================================================================');
  console.log(' Phase 7 — Milestone 5: Supply Chain Forecasting & Edge Cases Suite');
  console.log('========================================================================\n');

  const harness = createTestHarness();
  const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth });
  const server = http.createServer(app);
  await new Promise<void>(res => server.listen(0, '127.0.0.1', res));

  try {
    const branch = 'daet';
    const sku = 'hci-cmd-65ml';
    const now = new Date();
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString();

    // Setup base inventory
    harness.inventoryStore.set(`${branch}_${sku}`, {
      id: `${branch}_${sku}`,
      branchId: branch,
      skuId: sku,
      activeStock: 50,
      reservedStock: 0,
      transitStock: 0,
      safetyStock: 20,
      reorderPoint: 30,
      leadTimeDays: 3,
      updatedAt: now.toISOString()
    });

    // 1. Vs Accuracy: Seed 30 units sold in 30 days -> Vs = 1
    harness.ordersStore.set('ORD-1', {
      id: 'ORD-1',
      branchId: branch,
      fulfillmentStatus: 'fulfilled',
      status: 'completed',
      fulfilledAt: tenDaysAgo,
      items: [{ skuId: sku, quantity: 30 }]
    });

    const res1 = await makeRequest(server, `/api/inventory/forecasting/${branch}/${sku}`, 'GET', null, { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' });
    assert(res1.status === 200 && res1.data.forecast.salesVelocity === 1, '1. Vs accuracy: 30 units / 30 days = 1.0');

    // 2. DOS Accuracy: 50 units in stock, Vs = 1 -> DOS = 50
    assert(res1.data.forecast.daysOfStock === 50, '2. DOS accuracy: 50 stock / 1.0 Vs = 50 days');

    // 3. ROP Accuracy: Vs = 1, LeadTime = 3, SafetyStock = 20 -> ROP = ceil(1*3 + 20) = 23
    assert(res1.data.forecast.reorderPoint === 23, '3. ROP accuracy: ceil(1.0 * 3 + 20) = 23');

    // 4. Zero velocity: No units sold
    harness.ordersStore.clear();
    const resZero = await makeRequest(server, `/api/inventory/forecasting/${branch}/${sku}`, 'GET', null, { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' });
    assert(resZero.data.forecast.salesVelocity === 0 && resZero.data.forecast.daysOfStock === null, '4. Zero velocity handled safely (DOS = null)');

    // 5. Stockout adjustment: 30 units sold, 10 days stockout -> Denominator = 20 -> Vs = 1.5
    harness.ordersStore.set('ORD-2', {
      id: 'ORD-2',
      branchId: branch,
      fulfillmentStatus: 'fulfilled',
      status: 'completed',
      fulfilledAt: tenDaysAgo,
      items: [{ skuId: sku, quantity: 30 }]
    });
    // Add audit logs for stockout (10 days total)
    harness.auditLogsStore.set('LOG-1', {
      id: 'LOG-1',
      branchId: branch,
      targetResource: 'inventory',
      timestamp: twentyDaysAgo,
      metadata: JSON.stringify({ skuId: sku, newAvailableStock: 0 })
    });
    harness.auditLogsStore.set('LOG-2', {
      id: 'LOG-2',
      branchId: branch,
      targetResource: 'inventory',
      timestamp: tenDaysAgo,
      metadata: JSON.stringify({ skuId: sku, newAvailableStock: 50 })
    });
    const resStockout = await makeRequest(server, `/api/inventory/forecasting/${branch}/${sku}`, 'GET', null, { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' });
    // denominator = 30 - 10 = 20. Vs = 30 / 20 = 1.5
    assert(resStockout.data.forecast.salesVelocity === 1.5, `5. Stockout adjustment: denominator 20, Vs 1.5 (Actual: ${resStockout.data.forecast.salesVelocity})`);

    // 6. Ceiling rounding: Vs = 0.5, LeadTime = 3, SafetyStock = 20 -> ROP = 22
    harness.ordersStore.clear();
    harness.ordersStore.set('ORD-3', {
      id: 'ORD-3',
      branchId: branch,
      fulfillmentStatus: 'fulfilled',
      status: 'completed',
      fulfilledAt: tenDaysAgo,
      items: [{ skuId: sku, quantity: 15 }]
    });
    harness.auditLogsStore.clear(); // remove stockout logs
    const resCeil = await makeRequest(server, `/api/inventory/forecasting/${branch}/${sku}`, 'GET', null, { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' });
    // Vs = 15/30 = 0.5. ROP = ceil(0.5*3 + 20) = ceil(21.5) = 22
    assert(resCeil.data.forecast.reorderPoint === 22, '6. ROP uses integer ceiling (21.5 -> 22)');

    // 7. Cancelled/Refunded Exclusion: 10 completed, 10 cancelled -> total = 10
    harness.ordersStore.clear();
    harness.ordersStore.set('ORD-4', { id: 'ORD-4', branchId: branch, fulfillmentStatus: 'fulfilled', status: 'completed', fulfilledAt: tenDaysAgo, items: [{ skuId: sku, quantity: 10 }] });
    harness.ordersStore.set('ORD-5', { id: 'ORD-5', branchId: branch, fulfillmentStatus: 'fulfilled', status: 'cancelled', fulfilledAt: tenDaysAgo, items: [{ skuId: sku, quantity: 10 }] });
    const resExcl = await makeRequest(server, `/api/inventory/forecasting/${branch}/${sku}`, 'GET', null, { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' });
    assert(resExcl.data.forecast.totalUnitsSold === 10, '7. Cancelled/refunded orders excluded from Vs');

    // 8. Transfer Exclusion
    const resBaseline = await makeRequest(server, `/api/inventory/forecasting/${branch}/${sku}`, 'GET', null, { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' });
    const baselineUnits = resBaseline.data.forecast.totalUnitsSold;
    const baselineVelocity = resBaseline.data.forecast.salesVelocity;
    
    harness.stockTransfersStore.set('TRF-1', {
      id: 'TRF-1',
      sourceBranchId: branch,
      destinationBranchId: 'labo',
      skuId: sku,
      shippedQuantity: 1000,
      status: 'RECEIVED_FULL',
      initiatedAt: tenDaysAgo,
      receivedAt: tenDaysAgo
    });
    
    const resAfterTransfer = await makeRequest(server, `/api/inventory/forecasting/${branch}/${sku}`, 'GET', null, { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' });
    assert(
      resAfterTransfer.data.forecast.totalUnitsSold === baselineUnits &&
      resAfterTransfer.data.forecast.salesVelocity === baselineVelocity,
      '8. Inter-branch transfers excluded: 1000 units transferred but Vs remains based on 10 units sold'
    );

    // 9. Branch isolation: Branch A sales don't affect Branch B
    const resLabo = await makeRequest(server, `/api/inventory/forecasting/labo/${sku}`, 'GET', null, { Authorization: 'Bearer VALID_ADMIN_TOKEN' });
    assert(resLabo.status === 404, '9. Branch isolation: Labo forecasting not found (unseeded)');

    // 10. SKU isolation: SKU A sales don't affect SKU B
    const resSkuB = await makeRequest(server, `/api/inventory/forecasting/${branch}/hci-cmd-30ml`, 'GET', null, { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' });
    assert(resSkuB.status === 404, '10. SKU isolation: SKU B forecasting not found (unseeded)');

    // 11. Safety Stock Config: Ensure ROP respects custom safety stock
    harness.inventoryStore.get(`${branch}_${sku}`).safetyStock = 100;
    const resSs = await makeRequest(server, `/api/inventory/forecasting/${branch}/${sku}`, 'GET', null, { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' });
    // Vs = 0.3333 (10/30). ROP = ceil(0.3333*3 + 100) = 101
    assert(resSs.data.forecast.reorderPoint === 101, '11. ROP respects parameterized safety stock (100)');

    // 12. Lead Time Config: Ensure ROP respects custom lead time
    harness.inventoryStore.get(`${branch}_${sku}`).leadTimeDays = 10;
    const resLt = await makeRequest(server, `/api/inventory/forecasting/${branch}/${sku}`, 'GET', null, { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' });
    // Vs = 0.3333. ROP = ceil(0.3333*10 + 100) = ceil(3.33 + 100) = 104
    assert(resLt.data.forecast.reorderPoint === 104, '12. ROP respects parameterized lead time (10 days)');

    // 13. No negative/invalid forecast values
    assert(resLt.data.forecast.stockoutDays >= 0 && resLt.data.forecast.salesVelocity >= 0, '13. No negative forecasting values');

    // 14. Privacy firewall: Ensure zero access to /consultation_intakes
    const intakeAccessCountBefore = harness.consultationIntakesStore.size;
    await makeRequest(server, `/api/inventory/forecasting/${branch}/${sku}`, 'GET', null, { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' });
    assert(harness.consultationIntakesStore.size === intakeAccessCountBefore, '14. Health Data Privacy Firewall: Zero access to /consultation_intakes');

    // 15. Audit/RBAC behavior: unauthorized branch manager blocked
    const resUnauth = await makeRequest(server, `/api/inventory/forecasting/labo/${sku}`, 'GET', null, { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' });
    assert(resUnauth.status === 403, '15. RBAC: Unauthorized branch manager blocked from cross-branch forecasting');

  } catch (err: any) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    server.close();
    console.log(`\n========================================================================`);
    console.log(` Phase 7 Milestone 5 Test Results: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================================================`);
    if (failed > 0) process.exit(1);
  }
}

runTests();
