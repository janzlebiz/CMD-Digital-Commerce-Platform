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

            // Small asynchronous delay to simulate I/O concurrency and test version conflicts
            await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 8) + 2));

            // Document reference with collection and id
            if (refOrQuery._colName && (refOrQuery._docId || refOrQuery.id)) {
              const col = refOrQuery._colName;
              const docId = refOrQuery._docId || refOrQuery.id;
              const path = `${col}/${docId}`;
              const currentVer = docVersions.get(path) || 1;
              readVersions.set(path, currentVer);
              return await refOrQuery.get();
            }

            // General doc ref with id and get
            if (refOrQuery.id && typeof refOrQuery.get === 'function') {
              const col = refOrQuery._colName || 'default';
              const path = `${col}/${refOrQuery.id}`;
              const currentVer = docVersions.get(path) || 1;
              readVersions.set(path, currentVer);
              return await refOrQuery.get();
            }

            // Query
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

          // Before commit, detect version conflicts
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
            await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 15) + 5));
            continue;
          }

          // Validation succeeded: Commit staged writes & increment versions
          for (const write of stagedWrites) {
            const col = write.docRef._colName || 'default';
            const docId = write.docRef.id || write.docRef._docId;
            if (typeof write.docRef.set === 'function') {
              await write.docRef.set(write.data, write.options);
            } else {
              const store = mockDb._getStoreForCollection(col);
              if (write.options && write.options.merge) {
                store.set(docId, { ...(store.get(docId) || {}), ...write.data });
              } else {
                store.set(docId, { ...write.data });
              }
            }
            const path = `${col}/${docId}`;
            docVersions.set(path, (docVersions.get(path) || 1) + 1);
          }

          for (const del of stagedDeletes) {
            const col = del.docRef._colName || 'default';
            const docId = del.docRef.id || del.docRef._docId;
            if (typeof del.docRef.delete === 'function') {
              await del.docRef.delete();
            } else {
              const store = mockDb._getStoreForCollection(col);
              store.delete(docId);
            }
            const path = `${col}/${docId}`;
            docVersions.set(path, (docVersions.get(path) || 1) + 1);
          }

          return result;
        } catch (err: any) {
          if (err.message && err.message.includes('Transaction conflict') && attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 15) + 5));
            continue;
          }
          throw err;
        }
      }
      throw new Error('Transaction failed after maximum retries due to persistent OCC conflicts.');
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

    // ------------------------------------------------------------------------
    // Assertion 17: Prove zero mutation on unauthorized customer request
    // ------------------------------------------------------------------------
    const preOrderOrdersCount = harness.ordersStore.size;
    const preAuthStockist = harness.b2bStockistsStore.get('STK-DAET-AUTH');
    const preOutstanding = preAuthStockist?.outstandingBalance;
    const preAvailableCredit = preAuthStockist?.availableCredit;
    const preLedgerCount = harness.b2bLedgerStore.size;
    const preBatchA = harness.branchBatchInventoryStore.get('daet_batch-2026-09a');
    const preBatchAAvail = preBatchA?.availableQuantity;
    const preBatchAReserved = preBatchA?.reservedQuantity;
    const preBatchB = harness.branchBatchInventoryStore.get('daet_batch-2026-09b');
    const preBatchBAvail = preBatchB?.availableQuantity;
    const preBatchBReserved = preBatchB?.reservedQuantity;
    const preInv = harness.inventoryStore.get(`daet_${sku}`);
    const preInvActive = preInv?.activeStock;
    const preInvReserved = preInv?.reservedStock;

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

    const postAuthStockist = harness.b2bStockistsStore.get('STK-DAET-AUTH');
    const postBatchA = harness.branchBatchInventoryStore.get('daet_batch-2026-09a');
    const postBatchB = harness.branchBatchInventoryStore.get('daet_batch-2026-09b');
    const postInv = harness.inventoryStore.get(`daet_${sku}`);

    assert(
      unauthCustOrderRes.status === 403 &&
      unauthCustOrderRes.data.error.includes('Access Denied') &&
      harness.ordersStore.size === preOrderOrdersCount &&
      postAuthStockist?.outstandingBalance === preOutstanding &&
      postAuthStockist?.availableCredit === preAvailableCredit &&
      harness.b2bLedgerStore.size === preLedgerCount &&
      postBatchA?.availableQuantity === preBatchAAvail &&
      postBatchA?.reservedQuantity === preBatchAReserved &&
      postBatchB?.availableQuantity === preBatchBAvail &&
      postBatchB?.reservedQuantity === preBatchBReserved &&
      postInv?.activeStock === preInvActive &&
      postInv?.reservedStock === preInvReserved,
      '17. Unauthorized customer attempting B2B order receives 403 Forbidden with zero mutation'
    );

    // ------------------------------------------------------------------------
    // Assertion 18: Real transactional concurrency proof
    // ------------------------------------------------------------------------
    const preStockist18 = harness.b2bStockistsStore.get('STK-DAET-001');
    const pre18Deposit = preStockist18.depositBalance;
    const pre18Outstanding = preStockist18.outstandingBalance;
    const pre18LedgerCount = harness.b2bLedgerStore.size;

    const concurrentPromises = [
      makeRequest(server, '/api/b2b/stockists/STK-DAET-001/deposits', 'POST', { amount: 5000 }, { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }),
      makeRequest(server, '/api/b2b/stockists/STK-DAET-001/deposits', 'POST', { amount: 5000 }, { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }),
      makeRequest(server, '/api/b2b/stockists/STK-DAET-001/payments', 'POST', { amount: 5000 }, { Authorization: 'Bearer VALID_DAET_MANAGER_TOKEN' }),
    ];
    const concurrentResults = await Promise.all(concurrentPromises);
    const allConcurrentSuccess = concurrentResults.every((r) => r.status === 200);

    const finalStockist = harness.b2bStockistsStore.get('STK-DAET-001');
    const expectedFinalDeposit = pre18Deposit + 5000 + 5000;
    const expectedFinalOutstanding = pre18Outstanding - 5000;
    const expectedFinalCreditLimit = expectedFinalDeposit * (finalStockist.creditMultiplier || 2.0);
    const expectedAvailableCredit = expectedFinalCreditLimit - expectedFinalOutstanding;

    const post18LedgerCount = harness.b2bLedgerStore.size;
    const newLedgerEntriesCount = post18LedgerCount - pre18LedgerCount;

    const stockistLedgerEntries = Array.from(harness.b2bLedgerStore.values())
      .filter((e: any) => e.stockistId === 'STK-DAET-001');
    const newStockistLedgerEntries = stockistLedgerEntries.filter((e: any) => {
      return concurrentResults.some((r) => r.data?.ledgerEntry?.id === e.id);
    });

    let chainDeposit = pre18Deposit;
    let chainOutstanding = pre18Outstanding;
    const pool = [...newStockistLedgerEntries];
    let continuousSequenceValid = true;

    for (let step = 0; step < newStockistLedgerEntries.length; step++) {
      const matchIdx = pool.findIndex(
        (entry) => entry.previousDeposit === chainDeposit && entry.previousOutstanding === chainOutstanding
      );
      if (matchIdx === -1) {
        continuousSequenceValid = false;
        break;
      }
      const [matched] = pool.splice(matchIdx, 1);
      chainDeposit = matched.depositAfter;
      chainOutstanding = matched.outstandingAfter;
    }

    const noBalanceLostOrDuplicated =
      chainDeposit === expectedFinalDeposit &&
      chainOutstanding === expectedFinalOutstanding &&
      pool.length === 0;

    assert(
      allConcurrentSuccess &&
      finalStockist.depositBalance === expectedFinalDeposit &&
      finalStockist.outstandingBalance === expectedFinalOutstanding &&
      finalStockist.creditLimit === expectedFinalCreditLimit &&
      finalStockist.availableCredit === expectedAvailableCredit &&
      finalStockist.availableCredit === finalStockist.creditLimit - finalStockist.outstandingBalance &&
      newLedgerEntriesCount === 3 &&
      newStockistLedgerEntries.length === 3 &&
      continuousSequenceValid &&
      noBalanceLostOrDuplicated,
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
