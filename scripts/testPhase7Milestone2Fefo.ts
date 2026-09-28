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
    ['staff-regional-director-uid', { uid: 'staff-regional-director-uid', email: 'director.bicol@hcicmd.ph', role: 'regional_director' }],
    ['staff-super-admin-uid', { uid: 'staff-super-admin-uid', email: 'admin@hcicmd.ph', role: 'super_admin' }],
    ['user-alice-customer', { uid: 'user-alice-customer', email: 'alice@example.ph', role: 'customer' }],
    ['practitioner-daet-01', { uid: 'practitioner-daet-01', email: 'elena.santos@hcicmd.ph', role: 'practitioner' }],
  ]);

  const inventoryStore = new Map<string, any>();
  const branchBatchInventoryStore = new Map<string, any>();
  const productBatchesStore = new Map<string, any>();
  const auditLogsStore = new Map<string, any>();
  const consultationIntakesStore = new Map<string, any>();

  const collectionAccessCounts = {
    consultation_intakes: 0,
  };

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
      if (colName === 'audit_logs') return auditLogsStore;
      if (colName === 'consultation_intakes') {
        collectionAccessCounts.consultation_intakes++;
        return consultationIntakesStore;
      }
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

  return { mockDb, mockAuth, auditLogsStore, collectionAccessCounts, branchBatchInventoryStore, productBatchesStore };
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

async function runMilestone2TestSuite() {
  console.log('========================================================================');
  console.log(' Phase 7 — Milestone 2: FEFO Expiry Routing & QC Filtering Suite        ');
  console.log('========================================================================\n');

  const harness = createTestHarness();
  const app = createExpressApp({ db: harness.mockDb, auth: harness.mockAuth });
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    // -------------------------------------------------------------------------
    // 20 Real Acceptance Assertions
    // -------------------------------------------------------------------------

    // 1. Earliest-expiring eligible batch selected first
    const res1 = await makeRequest(
      server,
      '/api/inventory/reservations',
      'POST',
      { branchId: 'daet', skuId: 'hci-cmd-65ml', requestedQuantity: 5 },
      { Authorization: 'Bearer VALID_STAFF_DAET_MANAGER_TOKEN' }
    );
    assert(
      res1.status === 201 && res1.data.allocations[0].batchId === 'batch-2026-09a',
      '1. Earliest-expiring eligible batch (batch-2026-09a) selected first'
    );

    // Fetch batch A available stock
    const batchesResA = await makeRequest(server, '/api/inventory/batches?branchId=daet', 'GET', undefined, {
      Authorization: 'Bearer VALID_STAFF_DAET_MANAGER_TOKEN',
    });
    const batchAInfo = batchesResA.data.batches.find((b: any) => b.batchId === 'batch-2026-09a');
    const availA = batchAInfo.availableQuantity;

    // 2. Later-expiring batch selected after earlier eligible stock is exhausted
    const res2 = await makeRequest(
      server,
      '/api/inventory/reservations',
      'POST',
      { branchId: 'daet', skuId: 'hci-cmd-65ml', requestedQuantity: availA + 10 },
      { Authorization: 'Bearer VALID_STAFF_DAET_MANAGER_TOKEN' }
    );
    assert(
      res2.status === 201 && res2.data.allocations[1]?.batchId === 'batch-2026-09b',
      '2. Later-expiring batch (batch-2026-09b) selected after earlier eligible stock exhausted'
    );

    // 3. Reservation spans multiple eligible batches when required
    assert(
      res2.status === 201 && res2.data.allocations.length >= 2,
      '3. Reservation spans multiple eligible batches when requested quantity exceeds first batch'
    );

    // Setup fixtures for filtering tests (pending, failed, expired, zero-stock, wrong SKU, wrong branch)
    const pbStore = harness.productBatchesStore;
    const bbStore = harness.branchBatchInventoryStore;

    pbStore.set('batch-pending-qc', {
      id: 'batch-pending-qc', batchNumber: 'PENDING-01', skuId: 'hci-cmd-65ml',
      manufactureDate: '2026-01-01', expiryDate: '2028-08-01', qualityControlStatus: 'pending', totalManufacturedQuantity: 100
    });
    bbStore.set('daet_batch-pending-qc', {
      id: 'daet_batch-pending-qc', branchId: 'daet', batchId: 'batch-pending-qc', skuId: 'hci-cmd-65ml',
      availableQuantity: 50, reservedQuantity: 0, damagedQuantity: 0, expiryDate: '2028-08-01', updatedAt: new Date().toISOString()
    });

    pbStore.set('batch-failed-qc', {
      id: 'batch-failed-qc', batchNumber: 'FAILED-01', skuId: 'hci-cmd-65ml',
      manufactureDate: '2026-01-01', expiryDate: '2028-08-01', qualityControlStatus: 'failed', totalManufacturedQuantity: 100
    });
    bbStore.set('daet_batch-failed-qc', {
      id: 'daet_batch-failed-qc', branchId: 'daet', batchId: 'batch-failed-qc', skuId: 'hci-cmd-65ml',
      availableQuantity: 50, reservedQuantity: 0, damagedQuantity: 0, expiryDate: '2028-08-01', updatedAt: new Date().toISOString()
    });

    pbStore.set('batch-expired', {
      id: 'batch-expired', batchNumber: 'EXPIRED-01', skuId: 'hci-cmd-65ml',
      manufactureDate: '2025-01-01', expiryDate: '2025-12-31', qualityControlStatus: 'passed', totalManufacturedQuantity: 100
    });
    bbStore.set('daet_batch-expired', {
      id: 'daet_batch-expired', branchId: 'daet', batchId: 'batch-expired', skuId: 'hci-cmd-65ml',
      availableQuantity: 50, reservedQuantity: 0, damagedQuantity: 0, expiryDate: '2025-12-31', updatedAt: new Date().toISOString()
    });

    pbStore.set('batch-zerostock', {
      id: 'batch-zerostock', batchNumber: 'ZERO-01', skuId: 'hci-cmd-65ml',
      manufactureDate: '2026-01-01', expiryDate: '2028-08-01', qualityControlStatus: 'passed', totalManufacturedQuantity: 100
    });
    bbStore.set('daet_batch-zerostock', {
      id: 'daet_batch-zerostock', branchId: 'daet', batchId: 'batch-zerostock', skuId: 'hci-cmd-65ml',
      availableQuantity: 0, reservedQuantity: 0, damagedQuantity: 0, expiryDate: '2028-08-01', updatedAt: new Date().toISOString()
    });

    // Recompute aggregate for Daet 65ml
    const invStore = harness.mockDb._getStoreForCollection('inventory');
    const freshAgg = computeAggregateInventoryFromBatches({
      branchBatches: Array.from(bbStore.values()),
      branchId: 'daet',
      skuId: 'hci-cmd-65ml',
    });
    invStore.set(freshAgg.id, freshAgg);

    // 4. Pending-QC batch is actually skipped
    const resPendingTest = await makeRequest(
      server, '/api/inventory/reservations', 'POST',
      { branchId: 'daet', skuId: 'hci-cmd-65ml', requestedQuantity: 1 },
      { Authorization: 'Bearer VALID_STAFF_DAET_MANAGER_TOKEN' }
    );
    const usedPending = resPendingTest.data.allocations?.some((a: any) => a.batchId === 'batch-pending-qc');
    assert(usedPending === false, '4. Pending-QC batch is actually skipped');

    // 5. Failed-QC batch is actually skipped
    const usedFailed = resPendingTest.data.allocations?.some((a: any) => a.batchId === 'batch-failed-qc');
    assert(usedFailed === false, '5. Failed-QC batch is actually skipped');

    // 6. Expired batch is actually skipped
    const usedExpired = resPendingTest.data.allocations?.some((a: any) => a.batchId === 'batch-expired');
    assert(usedExpired === false, '6. Expired batch is actually skipped');

    // 7. Zero-stock batch is actually skipped
    const usedZero = resPendingTest.data.allocations?.some((a: any) => a.batchId === 'batch-zerostock');
    assert(usedZero === false, '7. Zero-stock batch is actually skipped');

    // 8. Wrong-SKU batch is actually excluded
    const resWrongSku = await makeRequest(
      server, '/api/inventory/reservations', 'POST',
      { branchId: 'daet', skuId: 'hci-cmd-30ml', requestedQuantity: 1 },
      { Authorization: 'Bearer VALID_STAFF_DAET_MANAGER_TOKEN' }
    );
    const used65mlFor30ml = resWrongSku.data.allocations?.some((a: any) => a.batchId === 'batch-2026-09a');
    assert(resWrongSku.status === 201 && used65mlFor30ml === false, '8. Wrong-SKU batch is actually excluded');

    // 9. Wrong-branch inventory is actually excluded (Labo reservation leaves Daet branch batch untouched)
    const daetBatchRefBefore = bbStore.get('daet_batch-2026-09a');
    const daetAvailBefore = daetBatchRefBefore.availableQuantity;

    const resWrongBranch = await makeRequest(
      server, '/api/inventory/reservations', 'POST',
      { branchId: 'labo', skuId: 'hci-cmd-65ml', requestedQuantity: 5 },
      { Authorization: 'Bearer VALID_STAFF_LABO_MANAGER_TOKEN' }
    );
    const daetBatchRefAfter = bbStore.get('daet_batch-2026-09a');
    const daetAvailAfter = daetBatchRefAfter.availableQuantity;
    assert(
      resWrongBranch.status === 201 && daetAvailAfter === daetAvailBefore,
      '9. Wrong-branch inventory is actually excluded'
    );

    // Capture snapshots of every eligible Daet 65ml batch before insufficient reservation
    const daetBatchesBefore = Array.from(bbStore.values()).filter(
      (b: any) => b.branchId === 'daet' && b.skuId === 'hci-cmd-65ml'
    );
    const snapshotsBefore = daetBatchesBefore.map((b: any) => ({
      id: b.id,
      availableQuantity: b.availableQuantity,
      reservedQuantity: b.reservedQuantity,
    }));

    // 10. Insufficient eligible stock returns failure
    const resInsuff = await makeRequest(
      server, '/api/inventory/reservations', 'POST',
      { branchId: 'daet', skuId: 'hci-cmd-65ml', requestedQuantity: 999999 },
      { Authorization: 'Bearer VALID_STAFF_DAET_MANAGER_TOKEN' }
    );
    assert(resInsuff.status === 400, '10. Insufficient eligible stock returns failure (400 Bad Request)');

    // 11. Insufficient reservation leaves every affected batch unchanged and never creates negative stock
    let allUnchanged = true;
    let noNegative = true;
    for (const snap of snapshotsBefore) {
      const current = bbStore.get(snap.id);
      if (!current || current.availableQuantity !== snap.availableQuantity || current.reservedQuantity !== snap.reservedQuantity) {
        allUnchanged = false;
      }
      if (current && (current.availableQuantity < 0 || current.reservedQuantity < 0)) {
        noNegative = false;
      }
    }
    assert(
      snapshotsBefore.length > 0 && allUnchanged && noNegative,
      '11. Insufficient reservation leaves every affected batch unchanged and never creates negative stock'
    );

    // 12. Successful reservation correctly changes available and reserved quantities
    const b2026Before = bbStore.get('daet_batch-2026-09b');
    const availBeforeSucc = b2026Before.availableQuantity;
    const reservedBeforeSucc = b2026Before.reservedQuantity;

    const resSucc = await makeRequest(
      server, '/api/inventory/reservations', 'POST',
      { branchId: 'daet', skuId: 'hci-cmd-65ml', requestedQuantity: 5 },
      { Authorization: 'Bearer VALID_STAFF_DAET_MANAGER_TOKEN' }
    );
    const b2026After = bbStore.get('daet_batch-2026-09b');
    assert(
      resSucc.status === 201 &&
      b2026After.availableQuantity === availBeforeSucc - 5 &&
      b2026After.reservedQuantity === reservedBeforeSucc + 5,
      '12. Successful reservation correctly changes available and reserved quantities'
    );

    // 13. /inventory aggregate remains exactly consistent with batch-level stock
    const reconRes = await makeRequest(server, '/api/inventory/reconciliation?branchId=daet', 'GET', undefined, {
      Authorization: 'Bearer VALID_STAFF_DAET_MANAGER_TOKEN',
    });
    assert(
      reconRes.status === 200 && reconRes.data.reconciliation.allConsistent === true,
      '13. /inventory aggregate remains exactly consistent with batch-level stock'
    );

    // 14. Branch manager cross-branch reservation returns 403
    const resCross = await makeRequest(
      server, '/api/inventory/reservations', 'POST',
      { branchId: 'labo', skuId: 'hci-cmd-65ml', requestedQuantity: 5 },
      { Authorization: 'Bearer VALID_STAFF_DAET_MANAGER_TOKEN' }
    );
    assert(resCross.status === 403, '14. Branch manager cross-branch reservation returns 403 Forbidden');

    // 15. Customer/practitioner reservation attempt returns 403
    const resCust = await makeRequest(
      server, '/api/inventory/reservations', 'POST',
      { branchId: 'daet', skuId: 'hci-cmd-65ml', requestedQuantity: 5 },
      { Authorization: 'Bearer VALID_CUSTOMER_TOKEN' }
    );
    assert(resCust.status === 403, '15. Customer/practitioner reservation attempt returns 403 Forbidden');

    // 16. Reservation flow performs zero access to /consultation_intakes
    assert(
      harness.collectionAccessCounts.consultation_intakes === 0,
      '16. Reservation flow performs zero access to /consultation_intakes'
    );

    // 17. Successful reservation creates the expected ADR-009 audit event
    const auditRes1 = await makeRequest(server, '/api/admin/audit-logs', 'GET', undefined, {
      Authorization: 'Bearer VALID_STAFF_SUPER_ADMIN_TOKEN',
    });
    const foundSuccessAudit = auditRes1.data.logs?.some((l: any) => l.action === 'inventory_reservation_recorded' && l.success === true);
    assert(foundSuccessAudit === true, '17. Successful reservation creates expected ADR-009 audit event');

    // 18. Unauthorized reservation attempt creates the expected ADR-009 audit event
    const foundBlockAudit = auditRes1.data.logs?.some((l: any) => l.action === 'inventory_reservation_unauthorized_branch_blocked' && l.success === false);
    assert(foundBlockAudit === true, '18. Unauthorized reservation attempt creates expected ADR-009 audit event');

    // 19. Concurrent reservations cannot over-allocate available stock (Isolated scenario: total eligible stock = 15, Request A = 10, Request B = 10 via Promise.all)
    bbStore.delete('labo_batch-2026-30a');
    pbStore.set('batch-conc-iso', {
      id: 'batch-conc-iso', batchNumber: 'CONC-15', skuId: 'hci-cmd-30ml',
      manufactureDate: '2026-01-01', expiryDate: '2028-12-31', qualityControlStatus: 'passed', totalManufacturedQuantity: 15
    });
    bbStore.set('labo_batch-conc-iso', {
      id: 'labo_batch-conc-iso', branchId: 'labo', batchId: 'batch-conc-iso', skuId: 'hci-cmd-30ml',
      availableQuantity: 15, reservedQuantity: 0, damagedQuantity: 0, expiryDate: '2028-12-31', updatedAt: new Date().toISOString()
    });
    const concAgg = computeAggregateInventoryFromBatches({
      branchBatches: Array.from(bbStore.values()),
      branchId: 'labo',
      skuId: 'hci-cmd-30ml',
    });
    invStore.set(concAgg.id, concAgg);

    const [conc1, conc2] = await Promise.all([
      makeRequest(
        server, '/api/inventory/reservations', 'POST',
        { branchId: 'labo', skuId: 'hci-cmd-30ml', requestedQuantity: 10 },
        { Authorization: 'Bearer VALID_STAFF_LABO_MANAGER_TOKEN' }
      ),
      makeRequest(
        server, '/api/inventory/reservations', 'POST',
        { branchId: 'labo', skuId: 'hci-cmd-30ml', requestedQuantity: 10 },
        { Authorization: 'Bearer VALID_STAFF_LABO_MANAGER_TOKEN' }
      ),
    ]);

    const batchLaboConc = bbStore.get('labo_batch-conc-iso');
    const totalReservedConc = batchLaboConc ? batchLaboConc.reservedQuantity : 0;
    const availLaboConc = batchLaboConc ? batchLaboConc.availableQuantity : 0;

    assert(
      (conc1.status === 201 || conc2.status === 201) &&
      (conc1.status === 400 || conc2.status === 400) &&
      totalReservedConc <= 15 &&
      availLaboConc >= 0,
      '19. Concurrent reservations cannot over-allocate available stock'
    );

    // 20. Competing reservations preserve FEFO ordering and the inventory reconciliation invariant
    pbStore.set('batch-fefo-a', {
      id: 'batch-fefo-a', batchNumber: 'FEFO-A-15', skuId: 'hci-cmd-30ml',
      manufactureDate: '2026-01-01', expiryDate: '2028-10-01', qualityControlStatus: 'passed', totalManufacturedQuantity: 15
    });
    bbStore.set('labo_batch-fefo-a', {
      id: 'labo_batch-fefo-a', branchId: 'labo', batchId: 'batch-fefo-a', skuId: 'hci-cmd-30ml',
      availableQuantity: 15, reservedQuantity: 0, damagedQuantity: 0, expiryDate: '2028-10-01', updatedAt: new Date().toISOString()
    });

    pbStore.set('batch-fefo-b', {
      id: 'batch-fefo-b', batchNumber: 'FEFO-B-15', skuId: 'hci-cmd-30ml',
      manufactureDate: '2026-01-01', expiryDate: '2028-11-01', qualityControlStatus: 'passed', totalManufacturedQuantity: 15
    });
    bbStore.set('labo_batch-fefo-b', {
      id: 'labo_batch-fefo-b', branchId: 'labo', batchId: 'batch-fefo-b', skuId: 'hci-cmd-30ml',
      availableQuantity: 15, reservedQuantity: 0, damagedQuantity: 0, expiryDate: '2028-11-01', updatedAt: new Date().toISOString()
    });

    const fefoAgg = computeAggregateInventoryFromBatches({
      branchBatches: Array.from(bbStore.values()),
      branchId: 'labo',
      skuId: 'hci-cmd-30ml',
    });
    invStore.set(fefoAgg.id, fefoAgg);

    const [fefoRes1, fefoRes2] = await Promise.all([
      makeRequest(
        server, '/api/inventory/reservations', 'POST',
        { branchId: 'labo', skuId: 'hci-cmd-30ml', requestedQuantity: 15 },
        { Authorization: 'Bearer VALID_STAFF_LABO_MANAGER_TOKEN' }
      ),
      makeRequest(
        server, '/api/inventory/reservations', 'POST',
        { branchId: 'labo', skuId: 'hci-cmd-30ml', requestedQuantity: 10 },
        { Authorization: 'Bearer VALID_STAFF_LABO_MANAGER_TOKEN' }
      ),
    ]);

    let fefoOrderValid = true;
    const successfulFefoResponses = [fefoRes1, fefoRes2].filter(r => r.status === 201);
    for (const r of successfulFefoResponses) {
      const allocations = r.data.allocations || [];
      for (let i = 0; i < allocations.length - 1; i++) {
        if (allocations[i].expiryDate > allocations[i + 1].expiryDate) {
          fefoOrderValid = false;
        }
      }
      if (allocations.length > 1) {
        if (allocations[0].batchId !== 'batch-fefo-a' || allocations[1].batchId !== 'batch-fefo-b') {
          fefoOrderValid = false;
        }
      }
    }

    const finalReconLaboFefo = await makeRequest(server, '/api/inventory/reconciliation?branchId=labo', 'GET', undefined, {
      Authorization: 'Bearer VALID_STAFF_SUPER_ADMIN_TOKEN',
    });

    const reconciliationExact =
      finalReconLaboFefo.status === 200 &&
      finalReconLaboFefo.data.reconciliation.allConsistent === true &&
      finalReconLaboFefo.data.reconciliation.reconciliationResults.find((it: any) => it.skuId === 'hci-cmd-30ml')?.divergenceDelta === 0;

    assert(
      fefoOrderValid && successfulFefoResponses.length > 0 && reconciliationExact,
      '20. Competing reservations preserve FEFO ordering and the inventory reconciliation invariant'
    );

  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  console.log('\n========================================================================');
  console.log(` Phase 7 Milestone 2 Test Results: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runMilestone2TestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
