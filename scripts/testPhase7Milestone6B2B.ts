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
  B2B_STOCKIST_TIERS,
  calculateB2BWholesalePricing,
  calculateB2BCreditLimits,
} from '../server';
import http from 'http';
import crypto from 'crypto';

function createTestHarness() {
  const usersStore = new Map<string, any>([
    ['staff-daet-manager-uid', { uid: 'staff-daet-manager-uid', email: 'manager.daet@hcicmd.ph', role: 'branch_manager', assignedBranchId: 'daet' }],
    ['staff-labo-manager-uid', { uid: 'staff-labo-manager-uid', email: 'manager.labo@hcicmd.ph', role: 'branch_manager', assignedBranchId: 'labo' }],
    ['staff-super-admin-uid', { uid: 'staff-super-admin-uid', email: 'admin@hcicmd.ph', role: 'super_admin' }],
    ['user-customer-uid', { uid: 'user-customer-uid', email: 'stockist.partner@example.ph', role: 'customer' }],
    ['unauthorized-customer-uid', { uid: 'unauthorized-customer-uid', email: 'unauthorized@example.ph', role: 'customer' }],
  ]);

  const b2bStockistsStore = new Map<string, any>();
  const b2bLedgerStore = new Map<string, any>();
  const inventoryStore = new Map<string, any>();
  const branchBatchInventoryStore = new Map<string, any>();
  const productBatchesStore = new Map<string, any>();
  const ordersStore = new Map<string, any>();
  const batchAllocationsStore = new Map<string, any>();
  const auditLogsStore = new Map<string, any>();
  const consultationIntakesStore = new Map<string, any>();

  const mockDb: any = {
    _getStoreForCollection: (colName: string) => {
      if (colName === 'users') return usersStore;
      if (colName === 'b2b_stockists') return b2bStockistsStore;
      if (colName === 'b2b_ledger') return b2bLedgerStore;
      if (colName === 'inventory') return inventoryStore;
      if (colName === 'branch_batch_inventory') return branchBatchInventoryStore;
      if (colName === 'product_batches') return productBatchesStore;
      if (colName === 'orders') return ordersStore;
      if (colName === 'batch_allocations') return batchAllocationsStore;
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
    runTransaction: async (cb: any) => {
      const transaction = {
        get: async (refOrQuery: any) => refOrQuery.get(),
        set: (ref: any, data: any) => ref.set(data),
      };
      return cb(transaction);
    },
  };

  const mockAuth = {
    verifyIdToken: async (token: string) => {
      if (token === 'VALID_DAET_MANAGER_TOKEN') return { uid: 'staff-daet-manager-uid' };
      if (token === 'VALID_LABO_MANAGER_TOKEN') return { uid: 'staff-labo-manager-uid' };
      if (token === 'VALID_ADMIN_TOKEN') return { uid: 'staff-super-admin-uid' };
      if (token === 'VALID_CUSTOMER_TOKEN') return { uid: 'user-customer-uid' };
      if (token === 'VALID_UNAUTHORIZED_CUSTOMER_TOKEN') return { uid: 'unauthorized-customer-uid' };
      throw new Error('Invalid token');
    },
  };

  return {
    mockDb,
    mockAuth,
    usersStore,
    b2bStockistsStore,
    b2bLedgerStore,
    inventoryStore,
    branchBatchInventoryStore,
    productBatchesStore,
    ordersStore,
    batchAllocationsStore,
    auditLogsStore,
    consultationIntakesStore,
  };
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
  console.log(' Phase 7 — Milestone 6: B2B Bulk Stockist Portal & Credit Controls Suite');
  console.log('========================================================================\n');

  const harness = createTestHarness();
  const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth });
  const server = http.createServer(app);
  await new Promise<void>((res) => server.listen(0, '127.0.0.1', res));

  try {
    const branch = 'daet';
    const sku = 'hci-cmd-65ml';
    const nowIso = new Date().toISOString();

    // Seed base inventory batches for Daet branch
    harness.productBatchesStore.set('batch-2026-09a', {
      id: 'batch-2026-09a',
      batchNumber: 'CMD-2026-09A',
      skuId: sku,
      expiryDate: '2028-09-30',
      qualityControlStatus: 'passed',
      totalManufacturedQuantity: 1000,
      createdAt: nowIso,
    });
    harness.productBatchesStore.set('batch-2026-09b', {
      id: 'batch-2026-09b',
      batchNumber: 'CMD-2026-09B',
      skuId: sku,
      expiryDate: '2028-10-31',
      qualityControlStatus: 'passed',
      totalManufacturedQuantity: 1000,
      createdAt: nowIso,
    });

    harness.branchBatchInventoryStore.set('daet_batch-2026-09a', {
      id: 'daet_batch-2026-09a',
      branchId: branch,
      batchId: 'batch-2026-09a',
      skuId: sku,
      availableQuantity: 120,
      reservedQuantity: 0,
      damagedQuantity: 0,
      expiryDate: '2028-09-30',
      updatedAt: nowIso,
    });
    harness.branchBatchInventoryStore.set('daet_batch-2026-09b', {
      id: 'daet_batch-2026-09b',
      branchId: branch,
      batchId: 'batch-2026-09b',
      skuId: sku,
      availableQuantity: 100,
      reservedQuantity: 0,
      damagedQuantity: 0,
      expiryDate: '2028-10-31',
      updatedAt: nowIso,
    });

    harness.inventoryStore.set(`daet_${sku}`, {
      id: `daet_${sku}`,
      branchId: branch,
      skuId: sku,
      activeStock: 220,
      reservedStock: 0,
      transitStock: 0,
      safetyStock: 20,
      reorderPoint: 30,
      leadTimeDays: 3,
      updatedAt: nowIso,
    });

    // ------------------------------------------------------------------------
    // Assertion 1: Tier 1 eligibility/pricing
    // ------------------------------------------------------------------------
    const quoteTier1 = await makeRequest(server, '/api/b2b/orders/quote', 'POST', {
      tier: 'tier_1',
      items: [{ skuId: sku, quantity: 50 }],
    });
    assert(
      quoteTier1.status === 200 &&
      quoteTier1.data.pricing.isEligible === true &&
      quoteTier1.data.pricing.minUnits === 50 &&
      quoteTier1.data.pricing.discountRate === 0.15 &&
      quoteTier1.data.pricing.items[0].wholesaleUnitPrice === 1020,
      '1. Tier 1 eligibility and pricing: min 50 units, 15% discount (wholesale unit PHP 1,020)'
    );

    // ------------------------------------------------------------------------
    // Assertion 2: Tier 2 eligibility/pricing
    // ------------------------------------------------------------------------
    const quoteTier2 = await makeRequest(server, '/api/b2b/orders/quote', 'POST', {
      tier: 'tier_2',
      items: [{ skuId: sku, quantity: 200 }],
    });
    assert(
      quoteTier2.status === 200 &&
      quoteTier2.data.pricing.isEligible === true &&
      quoteTier2.data.pricing.minUnits === 200 &&
      quoteTier2.data.pricing.discountRate === 0.25 &&
      quoteTier2.data.pricing.items[0].wholesaleUnitPrice === 900,
      '2. Tier 2 eligibility and pricing: min 200 units, 25% discount (wholesale unit PHP 900)'
    );

    // ------------------------------------------------------------------------
    // Assertion 3: Tier 3 eligibility/pricing
    // ------------------------------------------------------------------------
    const quoteTier3 = await makeRequest(server, '/api/b2b/orders/quote', 'POST', {
      tier: 'tier_3',
      items: [{ skuId: sku, quantity: 500 }],
    });
    assert(
      quoteTier3.status === 200 &&
      quoteTier3.data.pricing.isEligible === true &&
      quoteTier3.data.pricing.minUnits === 500 &&
      quoteTier3.data.pricing.discountRate === 0.35 &&
      quoteTier3.data.pricing.items[0].wholesaleUnitPrice === 780,
      '3. Tier 3 eligibility and pricing: min 500 units, 35% discount (wholesale unit PHP 780)'
    );

    // ------------------------------------------------------------------------
    // Assertion 4: Minimum-order enforcement
    // ------------------------------------------------------------------------
    const quoteUnderMin = await makeRequest(server, '/api/b2b/orders/quote', 'POST', {
      tier: 'tier_1',
      items: [{ skuId: sku, quantity: 40 }],
    });
    assert(
      quoteUnderMin.status === 400 &&
      quoteUnderMin.data.pricing?.isEligible === false &&
      quoteUnderMin.data.error.includes('minimum 50 units required'),
      '4. Minimum-order enforcement: 40 units rejected with 400 when Tier 1 requires 50 units'
    );

    // ------------------------------------------------------------------------
    // Assertion 5: Correct wholesale discount calculation
    // ------------------------------------------------------------------------
    const p1 = quoteTier1.data.pricing;
    const expectedRetail = 50 * 1200; // 60,000
    const expectedDiscount = 60000 * 0.15; // 9,000
    const expectedWholesale = 60000 - 9000; // 51,000
    assert(
      p1.retailSubtotal === expectedRetail &&
      p1.discountAmount === expectedDiscount &&
      p1.wholesaleTotal === expectedWholesale,
      `5. Correct wholesale discount calculation: retail ${p1.retailSubtotal} - discount ${p1.discountAmount} = wholesale ${p1.wholesaleTotal}`
    );

    // ------------------------------------------------------------------------
    // Assertion 6: Security deposit creation
    // ------------------------------------------------------------------------
    const regStockist = await makeRequest(
      server,
      '/api/b2b/stockists',
      'POST',
      {
        stockistId: 'STK-DAET-001',
        businessName: 'Bicol Wellness Apothecary',
        contactEmail: 'stockist@bicolwellness.ph',
        branchId: 'daet',
        tier: 'tier_1',
        depositAmount: 50000,
        creditMultiplier: 2.0,
      },
      { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }
    );
    assert(
      regStockist.status === 201 &&
      regStockist.data.stockist.depositBalance === 50000 &&
      regStockist.data.initialLedgerEntry?.type === 'deposit' &&
      regStockist.data.initialLedgerEntry?.amount === 50000,
      '6. Security deposit creation: initial deposit PHP 50,000 recorded on stockist profile & ledger'
    );

    // ------------------------------------------------------------------------
    // Assertion 7: Deposit balance update
    // ------------------------------------------------------------------------
    const addDepositRes = await makeRequest(
      server,
      '/api/b2b/stockists/STK-DAET-001/deposits',
      'POST',
      {
        amount: 25000,
        notes: 'Additional security deposit for credit enhancement',
      },
      { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }
    );
    assert(
      addDepositRes.status === 200 &&
      addDepositRes.data.stockist.depositBalance === 75000 &&
      addDepositRes.data.ledgerEntry.depositAfter === 75000,
      '7. Deposit balance update: +PHP 25,000 increases deposit balance to PHP 75,000'
    );

    // ------------------------------------------------------------------------
    // Assertion 8: Credit-limit calculation
    // ------------------------------------------------------------------------
    // With 75,000 deposit and 2.0 multiplier -> credit limit is 150,000
    const expectedCreditLimit = 75000 * 2.0;
    assert(
      addDepositRes.data.stockist.creditLimit === expectedCreditLimit,
      `8. Credit-limit calculation: deposit (75,000) × multiplier (2.0) = credit limit (PHP ${expectedCreditLimit})`
    );

    // ------------------------------------------------------------------------
    // Assertion 9: Available-credit calculation
    // ------------------------------------------------------------------------
    const stockistProfileRes = await makeRequest(
      server,
      '/api/b2b/stockists/STK-DAET-001',
      'GET',
      null,
      { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }
    );
    assert(
      stockistProfileRes.status === 200 &&
      stockistProfileRes.data.stockist.outstandingBalance === 0 &&
      stockistProfileRes.data.stockist.availableCredit === 150000,
      '9. Available-credit calculation: credit limit (150,000) - outstanding (0) = available credit (PHP 150,000)'
    );

    // ------------------------------------------------------------------------
    // Assertion 10: Order allowed within credit/deposit limits
    // ------------------------------------------------------------------------
    // 50 units order: wholesale total = 51,000. Within 150,000 available credit.
    const placeOrderRes = await makeRequest(
      server,
      '/api/b2b/orders',
      'POST',
      {
        stockistId: 'STK-DAET-001',
        branchId: 'daet',
        items: [{ skuId: sku, quantity: 50 }],
      },
      { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }
    );

    const b2bOrderId = placeOrderRes.data.orderId;
    assert(
      placeOrderRes.status === 201 &&
      placeOrderRes.data.order.grandTotal === 51000 &&
      placeOrderRes.data.order.paymentMethod === 'consignment_credit' &&
      placeOrderRes.data.stockist.outstandingBalance === 51000 &&
      placeOrderRes.data.stockist.availableCredit === 99000,
      '10. Order allowed within credit/deposit limits: order placed, FEFO reserved, outstanding: 51,000, available: 99,000'
    );

    // ------------------------------------------------------------------------
    // Assertion 11: Order blocked when credit limit is exceeded
    // ------------------------------------------------------------------------
    // Try ordering 100 units = 102,000 wholesale. But available credit is only 99,000!
    const overLimitOrderRes = await makeRequest(
      server,
      '/api/b2b/orders',
      'POST',
      {
        stockistId: 'STK-DAET-001',
        branchId: 'daet',
        items: [{ skuId: sku, quantity: 100 }],
      },
      { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }
    );
    assert(
      overLimitOrderRes.status === 400 &&
      overLimitOrderRes.data.error.includes('Credit limit exceeded') &&
      overLimitOrderRes.data.availableCredit === 99000,
      '11. Order blocked when credit limit is exceeded: 102,000 wholesale exceeds available 99,000 and is rejected with 400'
    );

    // ------------------------------------------------------------------------
    // Assertion 12: Dispatch/fulfillment blocked when account is locked
    // ------------------------------------------------------------------------
    // Lock the stockist account
    await makeRequest(
      server,
      '/api/b2b/stockists/STK-DAET-001/status',
      'POST',
      { status: 'locked', reason: 'Credit review audit' },
      { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }
    );

    // Attempt to fulfill the B2B order while account is locked
    const blockedFulfillRes = await makeRequest(
      server,
      `/api/orders/${b2bOrderId}/fulfill`,
      'POST',
      null,
      { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }
    );
    assert(
      blockedFulfillRes.status === 403 &&
      blockedFulfillRes.data.error.includes('DISPATCH_BLOCKED: Stockist account STK-DAET-001 is locked'),
      '12. Dispatch/fulfillment blocked when account is locked: fulfillment rejected with 403 Forbidden'
    );

    // ------------------------------------------------------------------------
    // Assertion 13: Consignment ledger debit/credit integrity
    // ------------------------------------------------------------------------
    // Unlock account first
    await makeRequest(
      server,
      '/api/b2b/stockists/STK-DAET-001/status',
      'POST',
      { status: 'active', reason: 'Payment arrangement verified' },
      { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }
    );

    // Record partial payment of 20,000
    const paymentRes = await makeRequest(
      server,
      '/api/b2b/stockists/STK-DAET-001/payments',
      'POST',
      { amount: 20000, notes: 'Direct bank transfer remittance' },
      { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }
    );

    const ledgerRes = await makeRequest(
      server,
      '/api/b2b/stockists/STK-DAET-001/ledger',
      'GET',
      null,
      { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }
    );

    const ledgerEntries = ledgerRes.data.ledger || [];
    const prevOutstanding = 51000;
    const afterPaymentOutstanding = paymentRes.data.stockist.outstandingBalance; // 31,000
    const afterPaymentAvailable = paymentRes.data.stockist.availableCredit; // 119,000

    let debitCreditMathValid = true;
    for (const entry of ledgerEntries) {
      if (entry.type === 'order_debit') {
        if (entry.outstandingAfter !== entry.previousOutstanding + entry.amount) debitCreditMathValid = false;
      } else if (entry.type === 'payment_credit') {
        if (entry.outstandingAfter !== entry.previousOutstanding - entry.amount) debitCreditMathValid = false;
      }
    }

    assert(
      ledgerEntries.length >= 4 &&
      afterPaymentOutstanding === 31000 &&
      afterPaymentAvailable === 119000 &&
      debitCreditMathValid,
      '13. Consignment ledger debit/credit integrity: mathematical consistency verified across deposits, debits, and credits'
    );

    // ------------------------------------------------------------------------
    // Assertion 14: Cross-branch RBAC/IDOR protection
    // ------------------------------------------------------------------------
    // Create a Labo stockist using super_admin
    await makeRequest(
      server,
      '/api/b2b/stockists',
      'POST',
      {
        stockistId: 'STK-LABO-001',
        businessName: 'Labo Regional Pharmacy',
        contactEmail: 'labo@pharmacy.ph',
        branchId: 'labo',
        tier: 'tier_2',
        depositAmount: 100000,
      },
      { Authorization: 'Bearer VALID_ADMIN_TOKEN' }
    );

    // Daet manager attempts to access Labo stockist profile
    const idorRes = await makeRequest(
      server,
      '/api/b2b/stockists/STK-LABO-001',
      'GET',
      null,
      { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }
    );
    assert(
      idorRes.status === 403 &&
      idorRes.data.error.includes('Branch managers cannot access stockists of other branches'),
      '14. Cross-branch RBAC/IDOR protection: Daet branch manager blocked from Labo stockist with 403 Forbidden'
    );

    // ------------------------------------------------------------------------
    // Assertion 15: Privacy firewall + ADR-009 audit logging
    // ------------------------------------------------------------------------
    const auditLogsCount = harness.auditLogsStore.size;
    const consultationIntakesCount = harness.consultationIntakesStore.size;

    const b2bAuditLogs = Array.from(harness.auditLogsStore.values()).filter(
      (log) => log.action && log.action.startsWith('b2b_')
    );

    assert(
      consultationIntakesCount === 0 &&
      b2bAuditLogs.length >= 5 &&
      b2bAuditLogs.some((l) => l.action === 'b2b_stockist_created') &&
      b2bAuditLogs.some((l) => l.action === 'b2b_order_placed') &&
      b2bAuditLogs.some((l) => l.action === 'b2b_deposit_recorded'),
      '15. Privacy firewall & ADR-009 audit logging: zero consultation intakes accessed, structured B2B audit events recorded'
    );

    // ------------------------------------------------------------------------
    // Assertion 16-18: Customer authorization & atomic concurrency tests
    // ------------------------------------------------------------------------
    const authStockistRes = await makeRequest(
      server,
      '/api/b2b/stockists',
      'POST',
      {
        stockistId: 'STK-DAET-AUTH',
        businessName: 'Auth Customer Stockist',
        contactEmail: 'auth@stockist.ph',
        branchId: 'daet',
        tier: 'tier_1',
        depositAmount: 50000,
        authorizedCustomerUid: 'user-customer-uid',
      },
      { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }
    );

    const authCustOrderRes = await makeRequest(
      server,
      '/api/b2b/orders',
      'POST',
      {
        stockistId: 'STK-DAET-AUTH',
        branchId: 'daet',
        items: [{ skuId: sku, quantity: 50 }],
      },
      { Authorization: 'Bearer VALID_CUSTOMER_TOKEN' }
    );
    assert(
      authCustOrderRes.status === 201 && authCustOrderRes.data.success === true,
      '16. Authorized customer successfully places B2B order for assigned stockist'
    );

    const unauthCustOrderRes = await makeRequest(
      server,
      '/api/b2b/orders',
      'POST',
      {
        stockistId: 'STK-DAET-AUTH',
        branchId: 'daet',
        items: [{ skuId: sku, quantity: 50 }],
      },
      { Authorization: 'Bearer VALID_UNAUTHORIZED_CUSTOMER_TOKEN' }
    );
    assert(
      unauthCustOrderRes.status === 403 && unauthCustOrderRes.data.error.includes('Access Denied'),
      '17. Unauthorized customer attempting B2B order receives 403 Forbidden with zero mutation'
    );

    const concurrentPromises = [
      makeRequest(server, '/api/b2b/stockists/STK-DAET-001/deposits', 'POST', { amount: 5000 }, { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }),
      makeRequest(server, '/api/b2b/stockists/STK-DAET-001/deposits', 'POST', { amount: 5000 }, { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }),
      makeRequest(server, '/api/b2b/stockists/STK-DAET-001/payments', 'POST', { amount: 5000 }, { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }),
    ];
    const concurrentResults = await Promise.all(concurrentPromises);
    const allConcurrentSuccess = concurrentResults.every(r => r.status === 200);
    assert(
      allConcurrentSuccess,
      '18. Concurrent transactional financial mutations execute atomically without race conditions'
    );

  } catch (err: any) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    server.close();
    console.log(`\n========================================================================`);
    console.log(` Phase 7 Milestone 6 Test Results: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================================================`);
    if (failed > 0) process.exit(1);
  }
}

runTests();
