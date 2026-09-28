/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

process.env.NODE_ENV = 'test';

import {
  createExpressApp,
  ACTIVE_CONSUMER_SKUS,
  VALID_INVENTORY_ADJUSTMENT_TYPES,
  SUPPORTED_BRANCH_IDS,
  computeAggregateInventoryFromBatches,
  verifyInventoryReconciliation,
  BranchBatchInventoryRecord,
  InventoryItemRecord,
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

// In-Memory Mock Store with collection tracking to verify zero clinical intake access
function createTestHarness(options: {
  users?: Record<string, any>;
  inventory?: Record<string, any>;
  branchBatchInventory?: Record<string, any>;
  productBatches?: Record<string, any>;
  inventoryAdjustments?: Record<string, any>;
  consultationIntakes?: Record<string, any>;
} = {}) {
  const usersStore = new Map<string, any>(Object.entries(options.users || {}));
  const inventoryStore = new Map<string, any>(Object.entries(options.inventory || {}));
  const branchBatchInventoryStore = new Map<string, any>(Object.entries(options.branchBatchInventory || {}));
  const productBatchesStore = new Map<string, any>(Object.entries(options.productBatches || {}));
  const inventoryAdjustmentsStore = new Map<string, any>(Object.entries(options.inventoryAdjustments || {}));
  const consultationIntakesStore = new Map<string, any>(Object.entries(options.consultationIntakes || {}));
  const auditLogsStore = new Map<string, any>();

  const collectionAccessCounts = {
    users: 0,
    inventory: 0,
    branch_batch_inventory: 0,
    product_batches: 0,
    inventory_adjustments: 0,
    consultation_intakes: 0,
    audit_logs: 0,
  };

  const mockDb: any = {
    runTransaction: async (updateFunction: any) => {
      const transaction = {
        get: async (refOrQuery: any) => {
          if (typeof refOrQuery.get === 'function') {
            return await refOrQuery.get();
          }
          throw new Error('Invalid transaction.get target');
        },
        set: async (docRef: any, data: any, options?: any) => {
          return await docRef.set(data, options);
        },
      };
      return await updateFunction(transaction);
    },
    _getStoreForCollection: (colName: string) => {
      if (colName === 'users') return usersStore;
      if (colName === 'inventory') return inventoryStore;
      if (colName === 'branch_batch_inventory') return branchBatchInventoryStore;
      if (colName === 'product_batches') return productBatchesStore;
      if (colName === 'inventory_adjustments') return inventoryAdjustmentsStore;
      if (colName === 'consultation_intakes') return consultationIntakesStore;
      if (colName === 'audit_logs') return auditLogsStore;
      return new Map<string, any>();
    },
    collection: (colName: string) => {
      if ((collectionAccessCounts as any)[colName] !== undefined) {
        (collectionAccessCounts as any)[colName]++;
      }
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
            docs: docs.map((d: any) => ({
              id: d.id || d.uid || 'doc-id',
              data: () => ({ ...d }),
              exists: true,
            })),
            forEach: (cb: (doc: any) => void) => {
              docs.forEach((d: any) => {
                cb({
                  id: d.id || d.uid || 'doc-id',
                  data: () => ({ ...d }),
                  exists: true,
                });
              });
            },
          };
        },
        doc: (docId: string) => {
          return {
            get: async () => {
              const data = targetStore.get(docId);
              return {
                exists: !!data,
                id: docId,
                data: () => (data ? { ...data } : undefined),
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
      if (token === 'VALID_STAFF_DAET_MANAGER_TOKEN') {
        return { uid: 'staff-daet-manager-uid', email: 'manager.daet@hcicmd.ph' };
      }
      if (token === 'VALID_STAFF_LABO_MANAGER_TOKEN') {
        return { uid: 'staff-labo-manager-uid', email: 'manager.labo@hcicmd.ph' };
      }
      if (token === 'VALID_STAFF_REGIONAL_DIRECTOR_TOKEN') {
        return { uid: 'staff-regional-director-uid', email: 'director.bicol@hcicmd.ph' };
      }
      if (token === 'VALID_STAFF_SUPER_ADMIN_TOKEN') {
        return { uid: 'staff-super-admin-uid', email: 'admin@hcicmd.ph' };
      }
      if (token === 'VALID_CUSTOMER_TOKEN') {
        return { uid: 'user-alice-customer', email: 'alice@example.ph' };
      }
      if (token === 'VALID_PRACTITIONER_TOKEN') {
        return { uid: 'practitioner-daet-01', email: 'elena.santos@hcicmd.ph' };
      }
      throw new Error('Invalid or expired Firebase ID token');
    },
  };

  return { mockDb, mockAuth, collectionAccessCounts, auditLogsStore, inventoryStore, branchBatchInventoryStore };
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

async function runTestSuite() {
  console.log('========================================================================');
  console.log(' Phase 7 — Milestone 1: Multi-Branch Inventory & Stock Reconciliation  ');
  console.log(' Authoritative Batch Invariant & Consistency Verification Suite        ');
  console.log('========================================================================\n');

  // -------------------------------------------------------------------------
  // Test Suite 1: Pure Functions & Mathematical Formula Integrity
  // -------------------------------------------------------------------------
  console.log('--- Test Suite 1: Pure Functions & Mathematical Consistency Invariant ---');

  assert(ACTIVE_CONSUMER_SKUS.includes('hci-cmd-65ml'), 'Active SKU hci-cmd-65ml exists in catalog');
  assert(ACTIVE_CONSUMER_SKUS.includes('hci-cmd-30ml'), 'Active SKU hci-cmd-30ml exists in catalog');
  assert(VALID_INVENTORY_ADJUSTMENT_TYPES.length === 5, 'All 5 approved adjustment types enumerated');

  const sampleBatches: BranchBatchInventoryRecord[] = [
    {
      id: 'daet_b1',
      branchId: 'daet',
      batchId: 'b1',
      skuId: 'hci-cmd-65ml',
      availableQuantity: 100,
      reservedQuantity: 10,
      damagedQuantity: 2,
      expiryDate: '2028-09-30',
      updatedAt: '2026-09-27T00:00:00.000Z',
    },
    {
      id: 'daet_b2',
      branchId: 'daet',
      batchId: 'b2',
      skuId: 'hci-cmd-65ml',
      availableQuantity: 50,
      reservedQuantity: 5,
      damagedQuantity: 0,
      expiryDate: '2028-10-31',
      updatedAt: '2026-09-27T00:00:00.000Z',
    },
  ];

  const calculatedAgg = computeAggregateInventoryFromBatches({
    branchBatches: sampleBatches,
    branchId: 'daet',
    skuId: 'hci-cmd-65ml',
    transitStock: 0,
    safetyStock: 20,
    reorderPoint: 30,
  });

  assert(calculatedAgg.activeStock === 150, 'Aggregate active stock is exact sum of available quantities (100 + 50 = 150)');
  assert(calculatedAgg.reservedStock === 15, 'Aggregate reserved stock is exact sum of reserved quantities (10 + 5 = 15)');
  assert(calculatedAgg.id === 'daet_hci-cmd-65ml', 'Aggregate inventory document ID is formatted as branchId_skuId');

  const testReconciliation = verifyInventoryReconciliation({
    branchBatches: sampleBatches,
    aggregateInventory: [calculatedAgg],
    branchId: 'daet',
    skuId: 'hci-cmd-65ml',
  });

  assert(testReconciliation.allConsistent === true, 'verifyInventoryReconciliation confirms perfect consistency');
  assert(testReconciliation.reconciliationResults[0].divergenceDelta === 0, 'Divergence delta is 0 for synchronized state');

  // Test intentional discrepancy detection
  const divergentAgg: InventoryItemRecord = {
    ...calculatedAgg,
    activeStock: 140, // Discrepant by 10
  };

  const divergentReconciliation = verifyInventoryReconciliation({
    branchBatches: sampleBatches,
    aggregateInventory: [divergentAgg],
    branchId: 'daet',
    skuId: 'hci-cmd-65ml',
  });

  assert(divergentReconciliation.allConsistent === false, 'verifyInventoryReconciliation correctly flags divergent stock state');
  assert(divergentReconciliation.reconciliationResults[0].divergenceDelta === 10, 'Calculates exact divergence delta of 10 units');

  // -------------------------------------------------------------------------
  // Test Suite 2: Authentication & RBAC Boundaries
  // -------------------------------------------------------------------------
  console.log('\n--- Test Suite 2: Authentication & RBAC Boundaries ---');

  const initialUsers = {
    'staff-daet-manager-uid': {
      uid: 'staff-daet-manager-uid',
      email: 'manager.daet@hcicmd.ph',
      role: 'branch_manager',
      assignedBranchId: 'daet',
    },
    'staff-labo-manager-uid': {
      uid: 'staff-labo-manager-uid',
      email: 'manager.labo@hcicmd.ph',
      role: 'branch_manager',
      assignedBranchId: 'labo',
    },
    'staff-regional-director-uid': {
      uid: 'staff-regional-director-uid',
      email: 'director.bicol@hcicmd.ph',
      role: 'regional_director',
    },
    'staff-super-admin-uid': {
      uid: 'staff-super-admin-uid',
      email: 'admin@hcicmd.ph',
      role: 'super_admin',
    },
    'user-alice-customer': {
      uid: 'user-alice-customer',
      email: 'alice@example.ph',
      role: 'customer',
    },
    'practitioner-daet-01': {
      uid: 'practitioner-daet-01',
      email: 'elena.santos@hcicmd.ph',
      role: 'practitioner',
      assignedBranchId: 'daet',
    },
  };

  const { mockDb, mockAuth, collectionAccessCounts, auditLogsStore } = createTestHarness({
    users: initialUsers,
  });

  const app = createExpressApp({ db: mockDb, auth: mockAuth });
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));

  try {
    // 2.1 Unauthenticated request
    const unauthRes = await makeRequest(server, '/api/inventory', 'GET');
    assert(unauthRes.status === 401, 'Unauthenticated inventory query rejected with 401');

    // 2.2 Customer role
    const customerRes = await makeRequest(server, '/api/inventory', 'GET', undefined, {
      Authorization: 'Bearer VALID_CUSTOMER_TOKEN',
    });
    assert(customerRes.status === 403, 'Customer role rejected with 403 Forbidden');

    // 2.3 Practitioner role
    const practitionerRes = await makeRequest(server, '/api/inventory', 'GET', undefined, {
      Authorization: 'Bearer VALID_PRACTITIONER_TOKEN',
    });
    assert(practitionerRes.status === 403, 'Practitioner role rejected with 403 Forbidden');

    // 2.4 Branch Manager role
    const managerRes = await makeRequest(server, '/api/inventory', 'GET', undefined, {
      Authorization: 'Bearer VALID_STAFF_DAET_MANAGER_TOKEN',
    });
    assert(managerRes.status === 200, 'Branch Manager queries inventory with 200 OK');
    assert(managerRes.data.branchScope === 'daet', 'Branch Manager scope is locked to Daet');

    // 2.5 Regional Director role
    const directorRes = await makeRequest(server, '/api/inventory', 'GET', undefined, {
      Authorization: 'Bearer VALID_STAFF_REGIONAL_DIRECTOR_TOKEN',
    });
    assert(directorRes.status === 200, 'Regional Director queries inventory with 200 OK');
    assert(directorRes.data.branchScope === 'all_regional_branches', 'Regional Director scope defaults to all regional branches');

    // 2.6 Super Admin role
    const adminRes = await makeRequest(server, '/api/inventory', 'GET', undefined, {
      Authorization: 'Bearer VALID_STAFF_SUPER_ADMIN_TOKEN',
    });
    assert(adminRes.status === 200, 'Super Admin queries inventory with 200 OK');

    // -------------------------------------------------------------------------
    // Test Suite 3: Cross-Branch IDOR Protection & Boundary Isolation
    // -------------------------------------------------------------------------
    console.log('\n--- Test Suite 3: Cross-Branch IDOR Protection & Boundary Isolation ---');

    // 3.1 Daet Manager querying Labo inventory directly -> 403 Block
    const idorInvRes = await makeRequest(server, '/api/inventory?branchId=labo', 'GET', undefined, {
      Authorization: 'Bearer VALID_STAFF_DAET_MANAGER_TOKEN',
    });
    assert(idorInvRes.status === 403, 'Daet Manager blocked from querying Labo inventory with 403 Forbidden (IDOR block)');

    // 3.2 Daet Manager querying Labo batches -> 403 Block
    const idorBatchesRes = await makeRequest(server, '/api/inventory/batches?branchId=labo', 'GET', undefined, {
      Authorization: 'Bearer VALID_STAFF_DAET_MANAGER_TOKEN',
    });
    assert(idorBatchesRes.status === 403, 'Daet Manager blocked from querying Labo batch inventory with 403 Forbidden');

    // 3.3 Daet Manager attempting adjustment on Labo -> 403 Block
    const idorAdjRes = await makeRequest(
      server,
      '/api/inventory/adjustments',
      'POST',
      {
        branchId: 'labo',
        skuId: 'hci-cmd-65ml',
        batchId: 'batch-2026-09a',
        adjustmentType: 'count_reconciliation',
        quantityDelta: 10,
        reason: 'Unauthorized attempt to modify Labo stock',
      },
      {
        Authorization: 'Bearer VALID_STAFF_DAET_MANAGER_TOKEN',
      }
    );
    assert(idorAdjRes.status === 403, 'Daet Manager blocked from adjusting Labo inventory with 403 Forbidden');

    // 3.4 Daet Manager querying Labo adjustment audit trail -> 403 Block
    const idorAuditRes = await makeRequest(server, '/api/inventory/adjustments?branchId=labo', 'GET', undefined, {
      Authorization: 'Bearer VALID_STAFF_DAET_MANAGER_TOKEN',
    });
    assert(idorAuditRes.status === 403, 'Daet Manager blocked from viewing Labo adjustment history with 403 Forbidden');

    // 3.5 Regional Director querying specific branch -> Allowed 200
    const directorBranchRes = await makeRequest(server, '/api/inventory?branchId=labo', 'GET', undefined, {
      Authorization: 'Bearer VALID_STAFF_REGIONAL_DIRECTOR_TOKEN',
    });
    assert(directorBranchRes.status === 200, 'Regional Director successfully scopes to Labo branch with 200 OK');
    assert(directorBranchRes.data.branchScope === 'labo', 'Response scope reflects targeted Labo branch');

    // -------------------------------------------------------------------------
    // Test Suite 4: Audited Stock Adjustments & Validation Integrity
    // -------------------------------------------------------------------------
    console.log('\n--- Test Suite 4: Audited Stock Adjustments & Validation Integrity ---');

    // 4.1 Invalid branchId
    const invalidBranchRes = await makeRequest(
      server,
      '/api/inventory/adjustments',
      'POST',
      {
        branchId: 'invalid_branch_xyz',
        skuId: 'hci-cmd-65ml',
        batchId: 'batch-2026-09a',
        adjustmentType: 'count_reconciliation',
        quantityDelta: 5,
        reason: 'Testing branch validation',
      },
      { Authorization: 'Bearer VALID_STAFF_SUPER_ADMIN_TOKEN' }
    );
    assert(invalidBranchRes.status === 400, 'Rejects invalid branchId with 400 Bad Request');

    // 4.2 Invalid skuId
    const invalidSkuRes = await makeRequest(
      server,
      '/api/inventory/adjustments',
      'POST',
      {
        branchId: 'daet',
        skuId: 'unsupported-sku-999',
        batchId: 'batch-2026-09a',
        adjustmentType: 'count_reconciliation',
        quantityDelta: 5,
        reason: 'Testing SKU validation',
      },
      { Authorization: 'Bearer VALID_STAFF_DAET_MANAGER_TOKEN' }
    );
    assert(invalidSkuRes.status === 400, 'Rejects invalid skuId with 400 Bad Request');

    // 4.3 Invalid adjustmentType
    const invalidTypeRes = await makeRequest(
      server,
      '/api/inventory/adjustments',
      'POST',
      {
        branchId: 'daet',
        skuId: 'hci-cmd-65ml',
        batchId: 'batch-2026-09a',
        adjustmentType: 'invalid_type',
        quantityDelta: 5,
        reason: 'Testing type validation',
      },
      { Authorization: 'Bearer VALID_STAFF_DAET_MANAGER_TOKEN' }
    );
    assert(invalidTypeRes.status === 400, 'Rejects invalid adjustmentType with 400 Bad Request');

    // 4.4 Zero or non-integer quantityDelta
    const zeroDeltaRes = await makeRequest(
      server,
      '/api/inventory/adjustments',
      'POST',
      {
        branchId: 'daet',
        skuId: 'hci-cmd-65ml',
        batchId: 'batch-2026-09a',
        adjustmentType: 'count_reconciliation',
        quantityDelta: 0,
        reason: 'Testing zero delta validation',
      },
      { Authorization: 'Bearer VALID_STAFF_DAET_MANAGER_TOKEN' }
    );
    assert(zeroDeltaRes.status === 400, 'Rejects zero quantityDelta with 400 Bad Request');

    // 4.5 Short reason (<5 chars)
    const shortReasonRes = await makeRequest(
      server,
      '/api/inventory/adjustments',
      'POST',
      {
        branchId: 'daet',
        skuId: 'hci-cmd-65ml',
        batchId: 'batch-2026-09a',
        adjustmentType: 'count_reconciliation',
        quantityDelta: 5,
        reason: 'bad',
      },
      { Authorization: 'Bearer VALID_STAFF_DAET_MANAGER_TOKEN' }
    );
    assert(shortReasonRes.status === 400, 'Rejects short reason string with 400 Bad Request');

    // 4.6 Valid count reconciliation (+15 units)
    const validCountRes = await makeRequest(
      server,
      '/api/inventory/adjustments',
      'POST',
      {
        branchId: 'daet',
        skuId: 'hci-cmd-65ml',
        batchId: 'batch-2026-09a',
        adjustmentType: 'count_reconciliation',
        quantityDelta: 15,
        reason: 'Physical cycle count found 15 additional units on shelf.',
      },
      { Authorization: 'Bearer VALID_STAFF_DAET_MANAGER_TOKEN' }
    );
    assert(validCountRes.status === 201, 'Valid count reconciliation recorded with 201 Created');
    assert(validCountRes.data.adjustment.id.startsWith('ADJ-'), 'Adjustment generates valid structured ADJ- ID');
    assert(validCountRes.data.updatedBatch.availableQuantity === 135, 'Batch available quantity increased from 120 to 135');
    assert(validCountRes.data.updatedAggregate.activeStock === 215, 'Aggregate active stock increased from 200 (120+80) to 215 (135+80)');

    // 4.7 Valid damage write-off (5 units damaged)
    const validDamageRes = await makeRequest(
      server,
      '/api/inventory/adjustments',
      'POST',
      {
        branchId: 'daet',
        skuId: 'hci-cmd-65ml',
        batchId: 'batch-2026-09a',
        adjustmentType: 'damage_writeoff',
        quantityDelta: 5,
        reason: 'Five dropper bottles broken during stock transfer staging.',
      },
      { Authorization: 'Bearer VALID_STAFF_DAET_MANAGER_TOKEN' }
    );
    assert(validDamageRes.status === 201, 'Valid damage write-off recorded with 201 Created');
    assert(validDamageRes.data.updatedBatch.availableQuantity === 130, 'Batch available quantity decremented to 130');
    assert(validDamageRes.data.updatedBatch.damagedQuantity === 5, 'Batch damaged quantity incremented to 5');
    assert(validDamageRes.data.updatedAggregate.activeStock === 210, 'Aggregate active stock decremented to 210');

    // 4.8 Valid sample withdrawal for laboratory analysis
    const validSampleRes = await makeRequest(
      server,
      '/api/inventory/adjustments',
      'POST',
      {
        branchId: 'daet',
        skuId: 'hci-cmd-65ml',
        batchId: 'batch-2026-09a',
        adjustmentType: 'sample_withdrawal',
        quantityDelta: 2,
        reason: 'Laboratory retention sample sent for mineral concentration assay.',
      },
      { Authorization: 'Bearer VALID_STAFF_DAET_MANAGER_TOKEN' }
    );
    assert(validSampleRes.status === 201, 'Valid sample withdrawal recorded with 201 Created');
    assert(validSampleRes.data.updatedBatch.availableQuantity === 128, 'Batch available quantity decremented to 128');

    // 4.9 Valid shrinkage loss
    const validShrinkageRes = await makeRequest(
      server,
      '/api/inventory/adjustments',
      'POST',
      {
        branchId: 'daet',
        skuId: 'hci-cmd-65ml',
        batchId: 'batch-2026-09a',
        adjustmentType: 'shrinkage_loss',
        quantityDelta: 1,
        reason: 'Unaccounted shrinkage identified in weekly audit.',
      },
      { Authorization: 'Bearer VALID_STAFF_DAET_MANAGER_TOKEN' }
    );
    assert(validShrinkageRes.status === 201, 'Valid shrinkage loss recorded with 201 Created');
    assert(validShrinkageRes.data.updatedBatch.availableQuantity === 127, 'Batch available quantity decremented to 127');

    // 4.10 Valid QC quarantine
    const validQcRes = await makeRequest(
      server,
      '/api/inventory/adjustments',
      'POST',
      {
        branchId: 'daet',
        skuId: 'hci-cmd-65ml',
        batchId: 'batch-2026-09a',
        adjustmentType: 'qc_quarantine',
        quantityDelta: 3,
        reason: 'Cap seal inspection required; quarantined 3 bottles.',
      },
      { Authorization: 'Bearer VALID_STAFF_DAET_MANAGER_TOKEN' }
    );
    assert(validQcRes.status === 201, 'Valid QC quarantine recorded with 201 Created');
    assert(validQcRes.data.updatedBatch.availableQuantity === 124, 'Batch available quantity decremented to 124');
    assert(validQcRes.data.updatedBatch.damagedQuantity === 8, 'Damaged/quarantined quantity increased to 8 (5+3)');

    // 4.11 Rejects adjustment attempting to drive stock below zero
    const negativeStockRes = await makeRequest(
      server,
      '/api/inventory/adjustments',
      'POST',
      {
        branchId: 'daet',
        skuId: 'hci-cmd-65ml',
        batchId: 'batch-2026-09a',
        adjustmentType: 'sample_withdrawal',
        quantityDelta: 500, // Available is only 124
        reason: 'Attempting to withdraw more than available physical stock',
      },
      { Authorization: 'Bearer VALID_STAFF_DAET_MANAGER_TOKEN' }
    );
    assert(negativeStockRes.status === 400, 'Rejects adjustment exceeding available stock with 400 Bad Request');

    // -------------------------------------------------------------------------
    // Test Suite 5: Live Mathematical Consistency & Invariant Reconciliation Endpoint
    // -------------------------------------------------------------------------
    console.log('\n--- Test Suite 5: Live Invariant Reconciliation Endpoint ---');

    const reconRes = await makeRequest(server, '/api/inventory/reconciliation', 'GET', undefined, {
      Authorization: 'Bearer VALID_STAFF_REGIONAL_DIRECTOR_TOKEN',
    });
    assert(reconRes.status === 200, 'Reconciliation endpoint returns 200 OK');
    assert(reconRes.data.reconciliation.allConsistent === true, 'All branch/SKU inventory items pass mathematical consistency invariant');
    assert(reconRes.data.reconciliation.reconciliationResults.length > 0, 'Reconciliation checked active branch/SKU records');

    const daet65Recon = reconRes.data.reconciliation.reconciliationResults.find(
      (r: any) => r.branchId === 'daet' && r.skuId === 'hci-cmd-65ml'
    );
    assert(daet65Recon !== undefined, 'Daet hci-cmd-65ml record found in reconciliation report');
    assert(daet65Recon.isConsistent === true, 'Daet hci-cmd-65ml confirmed fully consistent');
    assert(daet65Recon.divergenceDelta === 0, 'Daet hci-cmd-65ml divergence delta is exactly 0');
    assert(daet65Recon.aggregateActiveStock === 204, 'Aggregate active stock matches batch available sum (124 + 80 = 204)');
    assert(daet65Recon.batchAvailableSum === 204, 'Batch available sum is 204');
    assert(daet65Recon.aggregateReservedStock === 10, 'Aggregate reserved stock is 10');
    assert(daet65Recon.batchReservedSum === 10, 'Batch reserved sum is 10');

    // -------------------------------------------------------------------------
    // Test Suite 6: Health Data Privacy Firewall Verification (RA 10173)
    // -------------------------------------------------------------------------
    console.log('\n--- Test Suite 6: Health Data Privacy Firewall Verification (RA 10173) ---');

    assert(
      collectionAccessCounts.consultation_intakes === 0,
      'Health Data Privacy Firewall: ZERO calls made to consultation_intakes collection during all inventory operations (count: 0)'
    );

    // -------------------------------------------------------------------------
    // Test Suite 7: Audit Logging Verification (ADR-009)
    // -------------------------------------------------------------------------
    console.log('\n--- Test Suite 7: Audit Logging Verification (ADR-009) ---');

    const auditDocs = Array.from(auditLogsStore.values());
    assert(auditDocs.length > 0, `Structured audit logs recorded (total events: ${auditDocs.length})`);

    const adjLogs = auditDocs.filter((l: any) => l.action === 'inventory_adjustment_recorded');
    assert(adjLogs.length === 5, 'Audit log recorded for all 5 successful adjustments');
    assert(adjLogs[0].targetResource === 'inventory', 'Audit log target resource is inventory');
    assert(adjLogs[0].actorRole === 'branch_manager', 'Audit log captures actor role');
    assert(adjLogs[0].branchId === 'daet', 'Audit log captures branch scope');
    assert(adjLogs[0].success === true, 'Audit log records success state');

    const idorDenialLogs = auditDocs.filter(
      (l: any) => l.action === 'unauthorized_cross_branch_inventory_access_blocked' ||
                  l.action === 'unauthorized_cross_branch_inventory_adjustment_blocked' ||
                  l.action === 'unauthorized_cross_branch_batch_inventory_access_blocked'
    );
    assert(idorDenialLogs.length >= 3, 'Security denial audit events logged on unauthorized cross-branch IDOR attempts');
    assert(idorDenialLogs[0].success === false, 'Security denial audit event marks success as false');

    // -------------------------------------------------------------------------
    // Test Suite 8: Legacy Scaffold Migration & Backward Compatibility
    // -------------------------------------------------------------------------
    console.log('\n--- Test Suite 8: Legacy Scaffold Migration & Backward Compatibility ---');

    const legacyRes = await makeRequest(server, '/api/branch-inventory/daet', 'GET', undefined, {
      Authorization: 'Bearer VALID_STAFF_DAET_MANAGER_TOKEN',
    });
    assert(legacyRes.status === 200, 'Legacy /api/branch-inventory/:branchId returns 200 OK');
    assert(legacyRes.data.isDeprecatedScaffold === true, 'Response marks scaffold as deprecated');
    assert(legacyRes.data.recommendedEndpoint === '/api/inventory', 'Response points callers to /api/inventory');
    assert(legacyRes.data.stockCount === 354, 'Legacy stockCount accurately sums active stock across SKUs (204 + 150 = 354)');
    assert(legacyRes.headers['x-deprecated'] !== undefined, 'Response includes X-Deprecated header');

    // -------------------------------------------------------------------------
    // Test Suite 9: Adjustments Audit History Endpoint
    // -------------------------------------------------------------------------
    console.log('\n--- Test Suite 9: Adjustments Audit History Endpoint ---');

    const historyRes = await makeRequest(server, '/api/inventory/adjustments', 'GET', undefined, {
      Authorization: 'Bearer VALID_STAFF_DAET_MANAGER_TOKEN',
    });
    assert(historyRes.status === 200, 'GET /api/inventory/adjustments returns 200 OK');
    assert(historyRes.data.adjustments.length === 5, 'Returns all 5 recorded adjustment records for Daet branch');
    assert(historyRes.data.adjustments[0].branchId === 'daet', 'All returned adjustments match Daet branch scope');

    // -------------------------------------------------------------------------
    // Test Suite 10: Legacy Adapter Security & Transactional Integrity Regression
    // -------------------------------------------------------------------------
    console.log('\n--- Test Suite 10: Legacy Adapter Security & Transactional Integrity ---');

    // 10.1 Customer blocked from legacy adapter (403)
    const legacyCustomerRes = await makeRequest(server, '/api/branch-inventory/daet', 'GET', undefined, {
      Authorization: 'Bearer VALID_CUSTOMER_TOKEN',
    });
    assert(legacyCustomerRes.status === 403, 'Customer blocked from legacy adapter with 403 Forbidden');

    // 10.2 Practitioner blocked from legacy adapter (403)
    const legacyPractitionerRes = await makeRequest(server, '/api/branch-inventory/daet', 'GET', undefined, {
      Authorization: 'Bearer VALID_PRACTITIONER_TOKEN',
    });
    assert(legacyPractitionerRes.status === 403, 'Practitioner blocked from legacy adapter with 403 Forbidden');

    // 10.3 Daet Manager blocked from Labo legacy adapter (403)
    const legacyCrossBranchRes = await makeRequest(server, '/api/branch-inventory/labo', 'GET', undefined, {
      Authorization: 'Bearer VALID_STAFF_DAET_MANAGER_TOKEN',
    });
    assert(legacyCrossBranchRes.status === 403, 'Daet Manager blocked from Labo legacy adapter with 403 Forbidden');

    // 10.4 Authorized Regional Director accessing legacy adapter (200)
    const legacyDirectorRes = await makeRequest(server, '/api/branch-inventory/labo', 'GET', undefined, {
      Authorization: 'Bearer VALID_STAFF_REGIONAL_DIRECTOR_TOKEN',
    });
    assert(legacyDirectorRes.status === 200, 'Regional Director successfully accesses legacy adapter with 200 OK');

    // 10.5 Transactional adjustment atomic check & no lost update
    const txnTestRes = await makeRequest(
      server,
      '/api/inventory/adjustments',
      'POST',
      {
        branchId: 'daet',
        skuId: 'hci-cmd-65ml',
        batchId: 'batch-2026-09b',
        adjustmentType: 'count_reconciliation',
        quantityDelta: 20,
        reason: 'Transactional concurrency safety check verification.',
      },
      { Authorization: 'Bearer VALID_STAFF_DAET_MANAGER_TOKEN' }
    );
    assert(txnTestRes.status === 201, 'Transactional adjustment executed successfully with 201 Created');
    assert(txnTestRes.data.updatedBatch.availableQuantity === 100, 'Batch available quantity correctly updated inside transaction (80 + 20 = 100)');

  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  console.log('\n========================================================================');
  console.log(` Phase 7 Milestone 1 Test Results: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
