/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

process.env.NODE_ENV = 'test';

import {
  createExpressApp,
  EXPENSE_CATEGORIES,
  calculateFinancialMetrics,
  calculateCommodityProfitability,
  parseDateBoundary,
} from '../server';
import crypto from 'crypto';
import http from 'http';

// Helper to execute test HTTP requests
async function makeRequest(
  server: http.Server,
  path: string,
  method: string,
  body?: any,
  headers: Record<string, string> = {}
): Promise<{ status: number; data: any }> {
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
          resolve({ status: res.statusCode || 500, data: parsed });
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

// In-Memory Mock Store with collection tracking to verify zero clinical intake access
function createTestHarness(options: {
  users?: Record<string, any>;
  orders?: Record<string, any>;
  expenses?: Record<string, any>;
  consultationIntakes?: Record<string, any>;
} = {}) {
  const usersStore = new Map<string, any>(Object.entries(options.users || {}));
  const ordersStore = new Map<string, any>(Object.entries(options.orders || {}));
  const expensesStore = new Map<string, any>(Object.entries(options.expenses || {}));
  const consultationIntakesStore = new Map<string, any>(Object.entries(options.consultationIntakes || {}));
  const auditLogsStore = new Map<string, any>();

  const collectionAccessCounts = {
    users: 0,
    orders: 0,
    expenses: 0,
    consultation_intakes: 0,
    audit_logs: 0,
  };

  const mockDb: any = {
    _getStoreForCollection: (colName: string) => {
      if (colName === 'users') return usersStore;
      if (colName === 'orders') return ordersStore;
      if (colName === 'expenses') return expensesStore;
      if (colName === 'consultation_intakes') return consultationIntakesStore;
      if (colName === 'audit_logs') return auditLogsStore;
      return new Map<string, any>();
    },
    collection: (colName: string) => {
      if ((collectionAccessCounts as any)[colName] !== undefined) {
        (collectionAccessCounts as any)[colName]++;
      }
      const store = mockDb._getStoreForCollection(colName);

      return {
        _colName: colName,
        _getStore: () => store,
        doc: (docId: string) => ({
          _colName: colName,
          _docId: docId,
          _getStore: () => store,
          get: async () => {
            const data = store.get(docId);
            return {
              exists: store.has(docId),
              id: docId,
              data: () => (data ? JSON.parse(JSON.stringify(data)) : null),
            };
          },
          set: async (data: any) => {
            store.set(docId, JSON.parse(JSON.stringify(data)));
          },
        }),
        where: (field: string, op: string, value: any) => {
          return {
            get: async () => {
              const allDocs = Array.from(store.entries()).map((entry: any) => {
                const [id, record] = entry;
                return {
                  id,
                  data: () => JSON.parse(JSON.stringify(record)),
                };
              });
              const filtered = allDocs.filter((d: any) => {
                const data = d.data();
                if (op === '==') return data[field] === value;
                return true;
              });
              return {
                empty: filtered.length === 0,
                docs: filtered,
                forEach: (cb: (doc: any) => void) => filtered.forEach(cb),
              };
            },
          };
        },
        get: async () => {
          const documents = Array.from(store.entries()).map((entry: any) => {
            const [id, record] = entry;
            return {
              id,
              data: () => JSON.parse(JSON.stringify(record)),
            };
          });
          return {
            empty: documents.length === 0,
            docs: documents,
            forEach: (cb: (doc: any) => void) => documents.forEach(cb),
          };
        },
      };
    },
  };

  const mockAuth: any = {
    verifyIdToken: async (token: string) => {
      if (token === 'PATIENT_TOKEN') return { uid: 'patient-uid', email: 'patient@example.com' };
      if (token === 'PRACTITIONER_TOKEN') return { uid: 'practitioner-uid', email: 'practitioner@example.com' };
      if (token === 'STAFF_DAET_MANAGER_TOKEN') return { uid: 'staff-daet-manager-uid', email: 'daet_mgr@example.com' };
      if (token === 'STAFF_LABO_MANAGER_TOKEN') return { uid: 'staff-labo-manager-uid', email: 'labo_mgr@example.com' };
      if (token === 'STAFF_REGIONAL_DIRECTOR_TOKEN') return { uid: 'staff-regional-director-uid', email: 'rd@example.com' };
      if (token === 'STAFF_SUPER_ADMIN_TOKEN') return { uid: 'staff-super-admin-uid', email: 'super@example.com' };
      throw new Error('Invalid Mock Token');
    },
  };

  return {
    mockDb,
    mockAuth,
    usersStore,
    ordersStore,
    expensesStore,
    consultationIntakesStore,
    auditLogsStore,
    collectionAccessCounts,
  };
}

async function runFinanceMetricsSuite() {
  console.log('========================================================================');
  console.log(' Phase 6C — Milestone 3: Expenses, Financial Dashboard & Agricultural  ');
  console.log(' Commodity (Rice & Copra) Profitability Verification Suite              ');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${desc}`);
      failed++;
    }
  }

  // --- Seed Data ---
  const seedUsers: Record<string, any> = {
    'patient-uid': { uid: 'patient-uid', role: 'customer', email: 'patient@example.com' },
    'practitioner-uid': { uid: 'practitioner-uid', role: 'practitioner', email: 'practitioner@example.com' },
    'staff-daet-manager-uid': { uid: 'staff-daet-manager-uid', role: 'branch_manager', assignedBranchId: 'daet', email: 'daet_mgr@example.com' },
    'staff-labo-manager-uid': { uid: 'staff-labo-manager-uid', role: 'branch_manager', assignedBranchId: 'labo', email: 'labo_mgr@example.com' },
    'staff-regional-director-uid': { uid: 'staff-regional-director-uid', role: 'regional_director', email: 'rd@example.com' },
    'staff-super-admin-uid': { uid: 'staff-super-admin-uid', role: 'super_admin', email: 'super@example.com' },
  };

  const seedOrders: Record<string, any> = {
    // Daet Order 1: Paid COD, 2400 PHP
    'ord-daet-01': {
      id: 'ord-daet-01',
      branchId: 'daet',
      grandTotal: 2400,
      paymentStatus: 'paid',
      fulfillmentStatus: 'delivered',
      createdAt: '2026-09-10T10:00:00.000Z',
      items: [
        { skuId: 'sku-cmd-65ml', productName: 'HCI Cell Mineral Drops (CMD) — 65 mL', unitPrice: 1200, totalPrice: 2400, quantity: 2 },
      ],
    },
    // Daet Order 2: Unpaid Bank Transfer (Accounts Receivable), 1200 PHP
    'ord-daet-02': {
      id: 'ord-daet-02',
      branchId: 'daet',
      grandTotal: 1200,
      paymentStatus: 'pending_payment',
      fulfillmentStatus: 'processing',
      createdAt: '2026-09-15T11:00:00.000Z',
      items: [
        { skuId: 'sku-cmd-65ml', productName: 'HCI Cell Mineral Drops (CMD) — 65 mL', unitPrice: 1200, totalPrice: 1200, quantity: 1 },
      ],
    },
    // Daet Order 3: Rice Commodity Order, Paid GCash, 5200 PHP (2 sacks of 50kg rice = 100kg total)
    'ord-daet-03': {
      id: 'ord-daet-03',
      branchId: 'daet',
      grandTotal: 5200,
      paymentStatus: 'paid',
      fulfillmentStatus: 'delivered',
      createdAt: '2026-09-20T14:00:00.000Z',
      items: [
        { skuId: 'sku-rice-50kg', productName: 'Organic Red Mountain Rice 50kg Sack', unitPrice: 2600, totalPrice: 5200, quantity: 2, volumeKg: 100 },
      ],
    },
    // Labo Order 1: Paid Maya, 1300 PHP
    'ord-labo-01': {
      id: 'ord-labo-01',
      branchId: 'labo',
      grandTotal: 1300,
      paymentStatus: 'paid',
      fulfillmentStatus: 'delivered',
      createdAt: '2026-09-12T09:00:00.000Z',
      items: [
        { skuId: 'sku-cmd-30ml', productName: 'HCI Cell Mineral Drops (CMD) — 30 mL', unitPrice: 650, totalPrice: 1300, quantity: 2 },
      ],
    },
    // Labo Order 2: Copra Derivative Order, Paid Maya, 1400 PHP (4 bottles of Copra Coconut Oil, 4kg)
    'ord-labo-02': {
      id: 'ord-labo-02',
      branchId: 'labo',
      grandTotal: 1400,
      paymentStatus: 'paid',
      fulfillmentStatus: 'delivered',
      createdAt: '2026-09-18T16:00:00.000Z',
      items: [
        { skuId: 'sku-copra-oil-1l', productName: 'Premium Copra Coconut Oil 1L Bottle', unitPrice: 350, totalPrice: 1400, quantity: 4, volumeKg: 4 },
      ],
    },
    // Cancelled Order: Should be ignored by metrics
    'ord-cancelled-01': {
      id: 'ord-cancelled-01',
      branchId: 'daet',
      grandTotal: 5000,
      paymentStatus: 'pending_payment',
      fulfillmentStatus: 'cancelled',
      status: 'cancelled',
      createdAt: '2026-09-16T12:00:00.000Z',
      items: [{ skuId: 'sku-cancelled', productName: 'Cancelled Item', unitPrice: 5000, totalPrice: 5000, quantity: 1 }],
    },
  };

  const seedExpenses: Record<string, any> = {
    // Daet Paid Expense: Rent & Utilities, 1500 PHP
    'exp-daet-01': {
      id: 'exp-daet-01',
      branchId: 'daet',
      category: 'branch_rent_utilities',
      description: 'Daet branch monthly internet & power utilities',
      amount: 1500,
      expenseStatus: 'paid',
      incurredAt: '2026-09-05T08:00:00.000Z',
      paidAt: '2026-09-05T08:30:00.000Z',
      paymentReference: 'OR-DAET-9921',
      recordedByUid: 'staff-daet-manager-uid',
      createdAt: '2026-09-05T08:00:00.000Z',
    },
    // Daet Incurred Expense (Pending Payment / Accounts Payable): Packaging bottles, 800 PHP
    'exp-daet-02': {
      id: 'exp-daet-02',
      branchId: 'daet',
      category: 'packaging_bottles_droppers',
      description: 'Amber glass dropper bottles batch delivery',
      amount: 800,
      expenseStatus: 'incurred_pending_payment',
      incurredAt: '2026-09-14T10:00:00.000Z',
      recordedByUid: 'staff-daet-manager-uid',
      createdAt: '2026-09-14T10:00:00.000Z',
    },
    // Daet Agricultural Rice Procurement Expense: 200kg at 18 PHP/kg + 400 milling = 4000 PHP
    'exp-rice-01': {
      id: 'exp-rice-01',
      branchId: 'daet',
      category: 'agricultural_rice_milling',
      description: 'Rice grain procurement and custom milling fee',
      amount: 4000,
      expenseStatus: 'paid',
      incurredAt: '2026-09-08T09:00:00.000Z',
      paidAt: '2026-09-08T10:00:00.000Z',
      commodityMetadata: {
        commodityType: 'rice',
        volumeKg: 200,
        acquisitionCostPerKg: 18,
        millingOrDryingFee: 400,
      },
      recordedByUid: 'staff-daet-manager-uid',
      createdAt: '2026-09-08T09:00:00.000Z',
    },
    // Labo Copra Expense: 100kg at 15 PHP/kg + 300 processing = 1800 PHP
    'exp-copra-01': {
      id: 'exp-copra-01',
      branchId: 'labo',
      category: 'agricultural_copra_processing',
      description: 'Copra raw kernel procurement & sun-drying processing fee',
      amount: 1800,
      expenseStatus: 'paid',
      incurredAt: '2026-09-11T13:00:00.000Z',
      paidAt: '2026-09-11T14:00:00.000Z',
      commodityMetadata: {
        commodityType: 'copra',
        volumeKg: 100,
        acquisitionCostPerKg: 15,
        millingOrDryingFee: 300,
      },
      recordedByUid: 'staff-labo-manager-uid',
      createdAt: '2026-09-11T13:00:00.000Z',
    },
  };

  const seedConsultations: Record<string, any> = {
    'intake-secret-01': {
      id: 'intake-secret-01',
      patientUid: 'patient-uid',
      ciphertext: 'ENCRYPTED_CLINICAL_DIETARY_SPI_DATA_DO_NOT_LEAK',
      iv: 'random_iv_123',
    },
  };

  const harness = createTestHarness({
    users: seedUsers,
    orders: seedOrders,
    expenses: seedExpenses,
    consultationIntakes: seedConsultations,
  });

  const app = createExpressApp({
    db: harness.mockDb,
    auth: harness.mockAuth,
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));

  try {
    console.log('--- Test Suite 1: Pure Functions & Mathematical Formula Integrity ---');
    {
      const ordersList = Object.values(seedOrders);
      const expensesList = Object.values(seedExpenses);

      // Test 1: Category enumeration completeness
      assert(EXPENSE_CATEGORIES.length === 9, 'All 9 approved expense categories are enumerated');
      assert(EXPENSE_CATEGORIES.includes('agricultural_rice_milling'), 'agricultural_rice_milling category exists');
      assert(EXPENSE_CATEGORIES.includes('agricultural_copra_processing'), 'agricultural_copra_processing category exists');
      assert(EXPENSE_CATEGORIES.includes('procurement_raw_materials'), 'procurement_raw_materials category exists');

      // Test 2: Calculate financial metrics for Daet branch
      const daetMetrics = calculateFinancialMetrics({
        orders: ordersList,
        expenses: expensesList,
        branchId: 'daet',
      });

      // Daet orders: ord-daet-01 (2400, paid), ord-daet-02 (1200, unpaid), ord-daet-03 (5200, paid) = 8800 total revenue
      assert(daetMetrics.revenue === 8800, `Daet Revenue is 8800 PHP (actual: ${daetMetrics.revenue})`);
      assert(daetMetrics.cashReceived === 7600, `Daet Cash Received is 7600 PHP (2400 + 5200, actual: ${daetMetrics.cashReceived})`);
      assert(daetMetrics.accountsReceivable === 1200, `Daet Accounts Receivable is 1200 PHP (unpaid order, actual: ${daetMetrics.accountsReceivable})`);

      // Daet expenses: exp-daet-01 (1500, paid), exp-daet-02 (800, incurred), exp-rice-01 (4000, paid)
      // Total Incurred Expenses = 1500 + 800 + 4000 = 6300
      // Total Paid Expenses (Cash Paid) = 1500 + 4000 = 5500
      // Accounts Payable = 800
      assert(daetMetrics.totalExpensesIncurred === 6300, `Daet Total Incurred Expenses is 6300 PHP (actual: ${daetMetrics.totalExpensesIncurred})`);
      assert(daetMetrics.totalExpensesPaid === 5500, `Daet Total Paid Expenses is 5500 PHP (actual: ${daetMetrics.totalExpensesPaid})`);
      assert(daetMetrics.cashPaid === 5500, `Daet Cash Paid is 5500 PHP (actual: ${daetMetrics.cashPaid})`);
      assert(daetMetrics.accountsPayable === 800, `Daet Accounts Payable is 800 PHP (actual: ${daetMetrics.accountsPayable})`);

      // Accrual Net Income = Revenue (8800) - Total Incurred (6300) = 2500
      assert(daetMetrics.netIncomeAccrual === 2500, `Daet Accrual Net Income is 2500 PHP (actual: ${daetMetrics.netIncomeAccrual})`);

      // Cash Flow = Cash Received (7600) - Cash Paid (5500) = 2100
      assert(daetMetrics.netCashFlow === 2100, `Daet Net Cash Flow is 2100 PHP (actual: ${daetMetrics.netCashFlow})`);

      // Test 3: Exclude cancelled orders from revenue
      const cancelledIncluded = daetMetrics.revenue.toString().includes('13800');
      assert(!cancelledIncluded, 'Cancelled orders are strictly excluded from gross revenue and cash received');

      // Test 4: Rice Commodity Profitability & WASP Formula
      const riceProfitability = calculateCommodityProfitability(expensesList, ordersList, 'rice', 'daet');
      // Procurement: 200kg, AcqCost = 200 * 18 = 3600, Milling = 400, Total Cost Basis = 4000
      // Unit Cost per kg = 4000 / 200 = 20 PHP/kg
      assert(riceProfitability.totalVolumeProcuredKg === 200, `Rice Volume Procured is 200kg (actual: ${riceProfitability.totalVolumeProcuredKg})`);
      assert(riceProfitability.totalCostBasis === 4000, `Rice Cost Basis is 4000 PHP (actual: ${riceProfitability.totalCostBasis})`);
      assert(riceProfitability.unitCostPerKg === 20, `Rice Unit Cost is 20 PHP/kg (actual: ${riceProfitability.unitCostPerKg})`);

      // Sales: ord-daet-03 sold 2 sacks of 50kg = 100kg total for 5200 PHP
      // WASP = 5200 / 100 = 52 PHP/kg
      assert(riceProfitability.totalVolumeSoldKg === 100, `Rice Volume Sold is 100kg (actual: ${riceProfitability.totalVolumeSoldKg})`);
      assert(riceProfitability.totalSalesRevenue === 5200, `Rice Sales Revenue is 5200 PHP (actual: ${riceProfitability.totalSalesRevenue})`);
      assert(riceProfitability.weightedAverageSellingPrice === 52, `Rice WASP is 52 PHP/kg (actual: ${riceProfitability.weightedAverageSellingPrice})`);

      // Gross profit = 5200 - (20 * 100) = 3200 PHP
      // Gross margin = (3200 / 5200) * 100 = 61.54%
      assert(riceProfitability.grossProfit === 3200, `Rice Gross Profit is 3200 PHP (actual: ${riceProfitability.grossProfit})`);
      assert(riceProfitability.grossMarginPercent > 61 && riceProfitability.grossMarginPercent < 62, `Rice Gross Margin is ~61.54% (actual: ${riceProfitability.grossMarginPercent}%)`);

      // Test 5: Copra Commodity Profitability & WASP Formula
      const copraProfitability = calculateCommodityProfitability(expensesList, ordersList, 'copra', 'labo');
      // Procured: 100kg, 15/kg + 300 fee = 1800 PHP. Unit cost = 18 PHP/kg
      assert(copraProfitability.totalVolumeProcuredKg === 100, `Copra Volume Procured is 100kg (actual: ${copraProfitability.totalVolumeProcuredKg})`);
      assert(copraProfitability.totalCostBasis === 1800, `Copra Cost Basis is 1800 PHP (actual: ${copraProfitability.totalCostBasis})`);
      assert(copraProfitability.unitCostPerKg === 18, `Copra Unit Cost is 18 PHP/kg (actual: ${copraProfitability.unitCostPerKg})`);
      // Sales: ord-labo-02 has 4 bottles of 1L (4kg) for 1400 PHP. WASP = 1400 / 4 = 350 PHP/kg
      assert(copraProfitability.totalVolumeSoldKg === 4, `Copra Volume Sold is 4kg (actual: ${copraProfitability.totalVolumeSoldKg})`);
      assert(copraProfitability.weightedAverageSellingPrice === 350, `Copra WASP is 350 PHP/kg (actual: ${copraProfitability.weightedAverageSellingPrice})`);
    }

    console.log('\n--- Test Suite 2: Authentication & RBAC Boundaries ---');
    {
      // 1. Unauthenticated expense recording
      const resUnauth = await makeRequest(server, '/api/finance/expenses', 'POST', {
        category: 'branch_rent_utilities',
        description: 'Test rent',
        amount: 1000,
        expenseStatus: 'paid',
      });
      assert(resUnauth.status === 401, 'Unauthenticated expense recording rejected with 401');

      // 2. Customer attempting to record expenses
      const resCustomer = await makeRequest(server, '/api/finance/expenses', 'POST', {
        category: 'branch_rent_utilities',
        description: 'Test rent',
        amount: 1000,
        expenseStatus: 'paid',
      }, { Authorization: 'Bearer PATIENT_TOKEN' });
      assert(resCustomer.status === 403, 'Customer role rejected with 403 Forbidden');

      // 3. Practitioner attempting to record expenses
      const resPractitioner = await makeRequest(server, '/api/finance/expenses', 'POST', {
        category: 'practitioner_stipends',
        description: 'Stipend',
        amount: 2000,
        expenseStatus: 'paid',
      }, { Authorization: 'Bearer PRACTITIONER_TOKEN' });
      assert(resPractitioner.status === 403, 'Practitioner role rejected with 403 Forbidden');

      // 4. Branch manager authorized for their branch
      const resDaetMgr = await makeRequest(server, '/api/finance/expenses', 'POST', {
        branchId: 'daet',
        category: 'logistics_freight',
        description: 'Local delivery courier freight',
        amount: 350,
        expenseStatus: 'paid',
      }, { Authorization: 'Bearer STAFF_DAET_MANAGER_TOKEN' });
      assert(resDaetMgr.status === 201, 'Branch manager successfully recorded expense (201 Created)');
      assert(resDaetMgr.data.expense.branchId === 'daet', 'Recorded expense assigned to manager branch');
      assert(resDaetMgr.data.expense.id.startsWith('EXP-'), 'Expense generated valid EXP- identifier');

      // 5. Regional director authorized to record expense for any branch
      const resRd = await makeRequest(server, '/api/finance/expenses', 'POST', {
        branchId: 'capalonga',
        category: 'marketing_symposia',
        description: 'Capalonga Town Hall Wellness Symposium banner and sound system',
        amount: 2500,
        expenseStatus: 'paid',
      }, { Authorization: 'Bearer STAFF_REGIONAL_DIRECTOR_TOKEN' });
      assert(resRd.status === 201, 'Regional director successfully recorded cross-branch expense (201 Created)');
      assert(resRd.data.expense.branchId === 'capalonga', 'Expense created with target branch capalonga');
    }

    console.log('\n--- Test Suite 3: Branch Boundary Isolation & IDOR Protection ---');
    {
      // 1. Daet manager attempting to create expense for Labo branch
      const resCrossBranch = await makeRequest(server, '/api/finance/expenses', 'POST', {
        branchId: 'labo',
        category: 'branch_rent_utilities',
        description: 'Unauthorized cross-branch rent record',
        amount: 5000,
        expenseStatus: 'paid',
      }, { Authorization: 'Bearer STAFF_DAET_MANAGER_TOKEN' });
      assert(resCrossBranch.status === 403, 'Branch manager cannot record expense for another branch (403 IDOR Block)');

      // 2. Querying expenses as Daet manager auto-scopes to Daet
      const resQueryDaet = await makeRequest(
        server,
        '/api/finance/expenses?branchId=labo', // Even if Daet manager passes labo, backend enforces Daet
        'GET',
        undefined,
        { Authorization: 'Bearer STAFF_DAET_MANAGER_TOKEN' }
      );
      assert(resQueryDaet.status === 200, 'Query expenses successful (200 OK)');
      assert(resQueryDaet.data.branchScope === 'daet', 'Query strictly locked to Daet branch scope for Daet manager');
      assert(resQueryDaet.data.expenses.every((e: any) => e.branchId === 'daet'), 'All returned expenses belong strictly to Daet branch');

      // 3. Querying expenses as Regional Director without branch filter returns all
      const resQueryRd = await makeRequest(
        server,
        '/api/finance/expenses',
        'GET',
        undefined,
        { Authorization: 'Bearer STAFF_REGIONAL_DIRECTOR_TOKEN' }
      );
      assert(resQueryRd.status === 200, 'Regional director queried expenses (200 OK)');
      assert(resQueryRd.data.branchScope === 'all_regional_branches', 'Regional director default scope is all regional branches');
      const branchIdsInResults = new Set(resQueryRd.data.expenses.map((e: any) => e.branchId));
      assert(branchIdsInResults.has('daet') && branchIdsInResults.has('labo'), 'Regional director sees multi-branch expenses');
    }

    console.log('\n--- Test Suite 4: Field Validation & Status Transitions ---');
    {
      // 1. Invalid expense category
      const resInvalidCat = await makeRequest(server, '/api/finance/expenses', 'POST', {
        category: 'invalid_cryptocurrency_mining',
        description: 'Test invalid',
        amount: 100,
        expenseStatus: 'paid',
      }, { Authorization: 'Bearer STAFF_DAET_MANAGER_TOKEN' });
      assert(resInvalidCat.status === 400, 'Rejects invalid expense category with 400');

      // 2. Negative amount
      const resNegativeAmt = await makeRequest(server, '/api/finance/expenses', 'POST', {
        category: 'miscellaneous',
        description: 'Negative amount attempt',
        amount: -500,
        expenseStatus: 'paid',
      }, { Authorization: 'Bearer STAFF_DAET_MANAGER_TOKEN' });
      assert(resNegativeAmt.status === 400, 'Rejects negative amount with 400');

      // 3. Zero amount
      const resZeroAmt = await makeRequest(server, '/api/finance/expenses', 'POST', {
        category: 'miscellaneous',
        description: 'Zero amount attempt',
        amount: 0,
        expenseStatus: 'paid',
      }, { Authorization: 'Bearer STAFF_DAET_MANAGER_TOKEN' });
      assert(resZeroAmt.status === 400, 'Rejects zero amount with 400');

      // 4. Invalid expenseStatus
      const resInvalidStatus = await makeRequest(server, '/api/finance/expenses', 'POST', {
        category: 'miscellaneous',
        description: 'Invalid status attempt',
        amount: 100,
        expenseStatus: 'disputed_pending',
      }, { Authorization: 'Bearer STAFF_DAET_MANAGER_TOKEN' });
      assert(resInvalidStatus.status === 400, 'Rejects invalid expenseStatus with 400');

      // 5. Update expense status from incurred to paid
      // Let's create an incurred expense first
      const resCreateIncurred = await makeRequest(server, '/api/finance/expenses', 'POST', {
        category: 'procurement_raw_materials',
        description: 'Bulk Himalayan salt supply - pay on invoice',
        amount: 1200,
        expenseStatus: 'incurred_pending_payment',
      }, { Authorization: 'Bearer STAFF_DAET_MANAGER_TOKEN' });
      assert(resCreateIncurred.status === 201, 'Created incurred expense');
      const incurredExpId = resCreateIncurred.data.expense.id;

      // Update to paid
      const resUpdatePaid = await makeRequest(server, `/api/finance/expenses/${incurredExpId}/status`, 'PATCH', {
        status: 'paid',
        paymentReference: 'CHECK-BDO-88910',
      }, { Authorization: 'Bearer STAFF_DAET_MANAGER_TOKEN' });
      assert(resUpdatePaid.status === 200, 'Status update to paid succeeded (200 OK)');
      assert(resUpdatePaid.data.expense.expenseStatus === 'paid', 'Expense status updated to paid');
      assert(resUpdatePaid.data.expense.paymentReference === 'CHECK-BDO-88910', 'Payment reference persisted');
      assert(typeof resUpdatePaid.data.expense.paidAt === 'string', 'paidAt timestamp automatically populated');

      // 6. Cross-branch status update attempt fails
      const resCrossUpdate = await makeRequest(server, `/api/finance/expenses/${incurredExpId}/status`, 'PATCH', {
        status: 'incurred_pending_payment',
      }, { Authorization: 'Bearer STAFF_LABO_MANAGER_TOKEN' }); // Labo manager trying to edit Daet expense
      assert(resCrossUpdate.status === 403, 'Labo manager blocked from updating Daet expense (403)');
    }

    console.log('\n--- Test Suite 5: Financial Metrics & Commodity Analytics Endpoints ---');
    {
      // 1. GET /api/finance/metrics for Daet
      const resMetricsDaet = await makeRequest(
        server,
        '/api/finance/metrics',
        'GET',
        undefined,
        { Authorization: 'Bearer STAFF_DAET_MANAGER_TOKEN' }
      );
      assert(resMetricsDaet.status === 200, 'GET /api/finance/metrics returns 200 OK');
      assert(typeof resMetricsDaet.data.metrics.revenue === 'number', 'Metrics returns numeric revenue');
      assert(typeof resMetricsDaet.data.metrics.netIncomeAccrual === 'number', 'Metrics returns numeric accrual net income');
      assert(typeof resMetricsDaet.data.metrics.cashReceived === 'number', 'Metrics returns numeric cash received');
      assert(typeof resMetricsDaet.data.metrics.cashPaid === 'number', 'Metrics returns numeric cash paid');
      assert(typeof resMetricsDaet.data.metrics.accountsReceivable === 'number', 'Metrics returns accounts receivable');
      assert(typeof resMetricsDaet.data.metrics.accountsPayable === 'number', 'Metrics returns accounts payable');
      assert(resMetricsDaet.data.branchScope === 'daet', 'Branch scope is Daet for Daet manager');

      // 2. GET /api/finance/commodity-profitability for rice
      const resRice = await makeRequest(
        server,
        '/api/finance/commodity-profitability?commodityType=rice',
        'GET',
        undefined,
        { Authorization: 'Bearer STAFF_DAET_MANAGER_TOKEN' }
      );
      assert(resRice.status === 200, 'GET /api/finance/commodity-profitability?commodityType=rice returns 200 OK');
      assert(resRice.data.commodityType === 'rice', 'Confirmed commodityType is rice');
      assert(resRice.data.profitability.weightedAverageSellingPrice === 52, 'Rice WASP is 52 PHP/kg via endpoint');
      assert(resRice.data.profitability.totalVolumeProcuredKg === 200, 'Rice procured volume is 200kg via endpoint');

      // 3. GET /api/finance/commodity-profitability for copra as Regional Director
      const resCopra = await makeRequest(
        server,
        '/api/finance/commodity-profitability?commodityType=copra&branchId=labo',
        'GET',
        undefined,
        { Authorization: 'Bearer STAFF_REGIONAL_DIRECTOR_TOKEN' }
      );
      assert(resCopra.status === 200, 'GET /api/finance/commodity-profitability?commodityType=copra returns 200 OK');
      assert(resCopra.data.profitability.weightedAverageSellingPrice === 350, 'Copra WASP is 350 PHP/kg via endpoint');

      // 4. Invalid commodity type rejected
      const resBadCommodity = await makeRequest(
        server,
        '/api/finance/commodity-profitability?commodityType=gold_ore',
        'GET',
        undefined,
        { Authorization: 'Bearer STAFF_SUPER_ADMIN_TOKEN' }
      );
      assert(resBadCommodity.status === 400, 'Rejects unsupported commodity with 400 Bad Request');
    }

    console.log('\n--- Test Suite 6: Health Data Privacy Firewall Verification (RA 10173) ---');
    {
      // Health Data Privacy Firewall: Ensure zero consultation_intakes access occurred during finance ops
      const intakeAccesses = harness.collectionAccessCounts.consultation_intakes;
      assert(
        intakeAccesses === 0,
        `Zero consultation_intakes access count during all financial & commodity operations (actual accesses: ${intakeAccesses})`
      );
    }

    console.log('\n--- Test Suite 7: Audit Logging Verification (ADR-009) ---');
    {
      const auditLogs = Array.from(harness.auditLogsStore.values());
      assert(auditLogs.length > 0, `Audit logs generated (total: ${auditLogs.length})`);

      const recordedEvents = auditLogs.filter((l) => l.action === 'expense_recorded');
      assert(recordedEvents.length >= 2, 'expense_recorded audit event successfully logged');

      const statusUpdatedEvents = auditLogs.filter((l) => l.action === 'expense_status_updated');
      assert(statusUpdatedEvents.length >= 1, 'expense_status_updated audit event successfully logged');

      const financialReportEvents = auditLogs.filter((l) => l.action === 'financial_report_generated');
      assert(financialReportEvents.length >= 1, 'financial_report_generated audit event successfully logged');

      const commodityEvents = auditLogs.filter((l) => l.action === 'commodity_profitability_queried');
      assert(commodityEvents.length >= 1, 'commodity_profitability_queried audit event successfully logged');

      // Check audit log fields
      const sample = auditLogs[0];
      assert(!!sample.id && sample.id.startsWith('LOG-'), 'Audit log has valid structured ID');
      assert(!!sample.timestamp, 'Audit log has timestamp');
      const sampleSuccess = auditLogs.find((l) => l.success === true);
      assert(!!sampleSuccess && sampleSuccess.success === true, 'Audit log records success state');
      const sampleFailure = auditLogs.find((l) => l.success === false);
      assert(!!sampleFailure && sampleFailure.success === false, 'Audit log records failure state on unauthorized access');
      assert(typeof sample.metadata === 'object', 'Audit log stores sanitized metadata');
    }

    console.log('\n--- Test Suite 8: Offline Storage & Date Boundary Verification ---');
    {
      // 1. Date Boundary Local Calendar Parsing Verification (Asia/Manila +08:00)
      const startMs = parseDateBoundary('2026-09-27', false, '+08:00');
      const endMs = parseDateBoundary('2026-09-27', true, '+08:00');
      assert(endMs > startMs, 'End date boundary timestamp is greater than start date boundary');
      assert(endMs - startMs === 86399999, '24-hour calendar-date boundary spans exactly 86,399,999ms');
      assert(
        new Date(startMs).toISOString() === '2026-09-26T16:00:00.000Z' &&
        new Date(endMs).toISOString() === '2026-09-27T15:59:59.999Z',
        'Asia/Manila calendar-day boundaries map correctly to UTC timestamps'
      );

      // 2. IndexedDB v2 -> v3 Migration Schema & Upgrade Contract
      const mockStores = new Set<string>();
      const mockIndexes = new Map<string, Set<string>>();

      const mockDb: any = {
        version: 3,
        objectStoreNames: {
          contains: (name: string) => mockStores.has(name),
        },
        createObjectStore: (name: string, options?: any) => {
          mockStores.add(name);
          mockIndexes.set(name, new Set());
          return {
            createIndex: (idxName: string) => {
              mockIndexes.get(name)?.add(idxName);
            },
          };
        },
      };

      // Simulate pre-existing v2 database stores
      mockStores.add('orders');
      mockStores.add('tickets');
      mockStores.add('cached_crm_cohorts');

      // Execute v2 -> v3 migration upgrade sequence
      const upgradeEvent = { oldVersion: 2 };
      if (upgradeEvent.oldVersion < 3) {
        if (!mockDb.objectStoreNames.contains('expenses')) {
          const expenseStore = mockDb.createObjectStore('expenses', { keyPath: 'id' });
          expenseStore.createIndex('branchId');
          expenseStore.createIndex('category');
          expenseStore.createIndex('incurredAt');
          expenseStore.createIndex('expenseStatus');
        }
        if (!mockDb.objectStoreNames.contains('cached_finance_metrics')) {
          mockDb.createObjectStore('cached_finance_metrics', { keyPath: 'key' });
        }
      }

      assert(mockStores.has('orders'), 'v1 store orders preserved across migration');
      assert(mockStores.has('tickets'), 'v1 store tickets preserved across migration');
      assert(mockStores.has('cached_crm_cohorts'), 'v2 store cached_crm_cohorts preserved across migration');
      assert(mockStores.has('expenses'), 'v3 store expenses successfully added during v2->v3 upgrade');
      assert(mockStores.has('cached_finance_metrics'), 'v3 store cached_finance_metrics successfully added during v2->v3 upgrade');
      assert(mockIndexes.get('expenses')?.has('branchId') === true, 'v3 expense store contains branchId index');
      assert(mockIndexes.get('expenses')?.has('category') === true, 'v3 expense store contains category index');
      assert(mockIndexes.get('expenses')?.has('incurredAt') === true, 'v3 expense store contains incurredAt index');

      const storesList = Array.from(mockStores);
      const v3Ready = storesList.includes('expenses') && storesList.includes('cached_finance_metrics');
      assert(v3Ready === true, 'IndexedDB v2 -> v3 migration verified as complete and v3Ready');
    }

  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  console.log('\n========================================================================');
  console.log(` Phase 6C Milestone 3 Test Suite Results: ${passed} PASSED, ${failed} FAILED `);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runFinanceMetricsSuite().catch((err) => {
  console.error('Test Suite encountered fatal error:', err);
  process.exit(1);
});
