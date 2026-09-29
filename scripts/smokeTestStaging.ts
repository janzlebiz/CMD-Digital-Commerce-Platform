/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Staging Smoke Test Verification Suite (Gate 6)
 * Verifies critical production-ready flows using real HTTP fetch requests.
 */

import http from 'http';
import { createExpressApp } from '../server.ts';

console.log('========================================================================');
console.log('Running Gate 6: Staging Environment Smoke Test Suite');
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

// Helper to create a comprehensive mock database for testing
function createStagingMockDb() {
  const collections = new Map<string, Map<string, any>>();

  function getColMap(name: string) {
    if (!collections.has(name)) collections.set(name, new Map());
    return collections.get(name)!;
  }

  // Seed default metadata and data
  getColMap('_health').set('readyz', { status: 'ready', timestamp: new Date().toISOString() });
  
  // Seed admin user
  getColMap('users').set('demo-super-admin-uid', {
    uid: 'demo-super-admin-uid',
    email: 'admin@hcicmd.ph',
    role: 'super_admin',
    firstName: 'Super',
    lastName: 'Admin',
  });

  // Seed standard customer user
  getColMap('users').set('demo-customer-uid', {
    uid: 'demo-customer-uid',
    email: 'customer@gmail.com',
    role: 'customer',
    firstName: 'Jane',
    lastName: 'Doe',
    mobileNumber: '+639123456789',
    marketingEmailConsent: true,
    marketingSmsConsent: false,
  });

  // Seed branch inventory and batches
  getColMap('inventory').set('daet_hci-cmd-65ml', {
    id: 'daet_hci-cmd-65ml',
    branchId: 'daet',
    skuId: 'hci-cmd-65ml',
    activeStock: 50,
    allocatedStock: 0,
    quarantineStock: 0,
    damagedStock: 0,
  });

  getColMap('product_batches').set('batch-001', {
    id: 'batch-001',
    skuId: 'hci-cmd-65ml',
    supplierId: 'spl-001',
    quantity: 100,
    qualityControlStatus: 'passed',
    expiryDate: '2028-12-31',
  });

  getColMap('branch_batch_inventory').set('daet_batch-001', {
    id: 'daet_batch-001',
    batchId: 'batch-001',
    branchId: 'daet',
    skuId: 'hci-cmd-65ml',
    availableQuantity: 50,
    reservedQuantity: 0,
    quarantineQuantity: 0,
    damagedQuantity: 0,
    qualityControlStatus: 'passed',
    expiryDate: '2028-12-31',
  });

  const mockDb: any = {
    collection: (colName: string) => {
      const colMap = getColMap(colName);
      return {
        doc: (docId: string) => {
          const docRef = {
            id: docId,
            colName,
            get: async () => {
              const data = colMap.get(docId);
              return {
                id: docId,
                exists: !!data,
                data: () => data,
                ref: docRef,
              };
            },
            set: async (data: any, options?: any) => {
              if (options?.merge) {
                const existing = colMap.get(docId) || {};
                colMap.set(docId, { ...existing, ...data });
              } else {
                colMap.set(docId, data);
              }
            },
            update: async (data: any) => {
              const existing = colMap.get(docId) || {};
              colMap.set(docId, { ...existing, ...data });
            },
            delete: async () => {
              colMap.delete(docId);
            },
          };
          return docRef;
        },
        get: async () => {
          const docs = Array.from(colMap.entries()).map(([id, data]) => ({
            id,
            data: () => data,
            exists: true,
            ref: mockDb.collection(colName).doc(id),
          }));
          return {
            empty: docs.length === 0,
            docs,
            forEach: (cb: any) => docs.forEach(cb),
          };
        },
        where: (field1: string, op1: string, val1: any) => {
          return {
            get: async () => {
              const results: any[] = [];
              for (const [id, data] of colMap.entries()) {
                if (data[field1] === val1) {
                  results.push({
                    id,
                    exists: true,
                    data: () => data,
                    ref: mockDb.collection(colName).doc(id),
                  });
                }
              }
              return {
                empty: results.length === 0,
                docs: results,
                forEach: (cb: any) => results.forEach(cb),
              };
            },
          };
        },
      };
    },
    runTransaction: async (cb: any) => {
      const tx: any = {
        get: async (ref: any) => {
          const colMap = getColMap(ref.colName);
          const data = colMap.get(ref.id);
          return {
            id: ref.id,
            exists: !!data,
            data: () => data,
          };
        },
        set: async (ref: any, data: any, options?: any) => {
          const colMap = getColMap(ref.colName);
          if (options?.merge) {
            const existing = colMap.get(ref.id) || {};
            colMap.set(ref.id, { ...existing, ...data });
          } else {
            colMap.set(ref.id, data);
          }
        },
        update: async (ref: any, data: any) => {
          const colMap = getColMap(ref.colName);
          const existing = colMap.get(ref.id) || {};
          colMap.set(ref.id, { ...existing, ...data });
        },
      };
      return cb(tx);
    },
  };

  return mockDb;
}

async function runSmokeTests() {
  const stagingUrl = process.env.STAGING_URL || 'http://127.0.0.1:3099';
  let server: http.Server | null = null;

  // If no staging url was passed, start a local test server
  if (!process.env.STAGING_URL) {
    console.log(`\nStarting local test server on ${stagingUrl}...`);
    const mockDb = createStagingMockDb();
    const app = createExpressApp({ db: mockDb });
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server!.listen(3099, '127.0.0.1', () => {
        resolve();
      });
    });
    console.log('Local test server listening.');
  } else {
    console.log(`\nTesting against external staging environment: ${stagingUrl}`);
  }

  try {
    // --- Test Group 1: Health Probes ---
    console.log('\n--- Test Group 1: Health & Readiness Probes ---');
    
    // 1.1 Liveness probe
    const healthzRes = await fetch(`${stagingUrl}/healthz`);
    assert(healthzRes.status === 200, '1.1 GET /healthz returns HTTP 200');
    const healthzData: any = await healthzRes.json();
    assert(healthzData.status === 'ok' && healthzData.timestamp !== undefined, '1.2 /healthz contains expected structure');

    // 1.2 Readiness probe
    const readyzRes = await fetch(`${stagingUrl}/readyz`);
    assert(readyzRes.status === 200, '1.3 GET /readyz returns HTTP 200');
    const readyzData: any = await readyzRes.json();
    assert(readyzData.status === 'ready', '1.4 /readyz reports status: ready');

    // --- Test Group 2: Authentication & Security Boundaries ---
    console.log('\n--- Test Group 2: Authentication & Security Boundaries ---');

    // 2.1 Unauthorized endpoint protection
    const exportResUnauth = await fetch(`${stagingUrl}/api/user/export-data`);
    assert(exportResUnauth.status === 401, '2.1 GET /api/user/export-data without authorization fails with HTTP 401');

    // 2.2 Super Admin access
    const exportResAdmin = await fetch(`${stagingUrl}/api/user/export-data`, {
      headers: { 'Authorization': 'Bearer DEMO_TOKEN_SUPER_ADMIN' },
    });
    assert(exportResAdmin.status === 200, '2.2 GET /api/user/export-data with super admin token succeeds with HTTP 200');

    // --- Test Group 3: Core Business Flows ---
    console.log('\n--- Test Group 3: Core Business Flows ---');

    // 3.1 Product Listing / Catalog Access
    const productsRes = await fetch(`${stagingUrl}/api/workshops`, {
      headers: {
        'Authorization': 'Bearer DEMO_TOKEN_CUSTOMER',
      },
    });
    assert(productsRes.status === 200, '3.1 GET /api/workshops succeeds with HTTP 200');

    // 3.2 Support Ticket Creation
    const ticketPayload = {
      subject: 'Staging Smoke Test Ticket',
      description: 'Verifying support ticket flow from staging verification script',
      category: 'product_inquiry',
      branchId: 'daet',
    };
    const ticketRes = await fetch(`${stagingUrl}/api/support/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer DEMO_TOKEN_CUSTOMER',
      },
      body: JSON.stringify(ticketPayload),
    });
    assert(ticketRes.status === 201 || ticketRes.status === 200, '3.2 POST /api/support/tickets creates support ticket');

    // 3.3 SLA Breach Alert Scan Endpoint
    const slaRes = await fetch(`${stagingUrl}/api/support/check-sla-breaches`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer DEMO_TOKEN_SUPER_ADMIN',
      },
    });
    assert(slaRes.status === 200, '3.3 POST /api/support/check-sla-breaches returns HTTP 200');

    // --- Test Group 4: Compliance & Privacy Flows ---
    console.log('\n--- Test Group 4: Compliance & Privacy Flows ---');

    // 4.1 Account anonymization and deletion
    const deleteRes = await fetch(`${stagingUrl}/api/user/account`, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer DEMO_TOKEN_CUSTOMER',
      },
    });
    assert(deleteRes.status === 200, '4.1 DELETE /api/user/account executes PII anonymization and returns HTTP 200');

  } catch (err: any) {
    console.error('Smoke tests failed with unexpected error:', err.message);
    failedCount++;
  } finally {
    if (server) {
      console.log('\nStopping local test server...');
      await new Promise<void>((resolve) => {
        server!.close(() => {
          resolve();
        });
      });
      console.log('Local test server stopped.');
    }
  }

  console.log('========================================================================');
  console.log(`Staging Smoke Test Results: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('========================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runSmokeTests().catch((err) => {
  console.error('Unhandled smoke test runner exception:', err);
  process.exit(1);
});
