/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createExpressApp, generateUnsubscribeToken } from '../server.ts';
import http from 'http';

console.log('========================================================================');
console.log('Running Phase 9B-1: Security & Privacy Remediation Test Suite');
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

function createSecurityPrivacyMockDb() {
  const store: Record<string, Map<string, any>> = {
    users: new Map(),
    marketing_consents: new Map(),
    orders: new Map(),
    support_tickets: new Map(),
    consultation_appointments: new Map(),
    audit_logs: new Map(),
  };

  store.users.set('demo-customer-uid', {
    uid: 'demo-customer-uid',
    role: 'customer',
    email: 'alice@hcicmd.ph',
    firstName: 'Alice',
    lastName: 'Santos',
    mobileNumber: '+639171112222',
    unsubscribeToken: generateUnsubscribeToken('demo-customer-uid'),
  });

  store.marketing_consents.set('demo-customer-uid', {
    userId: 'demo-customer-uid',
    email: 'alice@hcicmd.ph',
    marketingEmailConsent: true,
    marketingSmsConsent: true,
    unsubscribeToken: generateUnsubscribeToken('demo-customer-uid'),
  });

  store.orders.set('ORD-ALICE-1', {
    id: 'ORD-ALICE-1',
    userId: 'demo-customer-uid',
    grandTotal: 1500,
    fulfillmentStatus: 'completed',
  });

  const mockDb: any = {
    collection: (colName: string) => {
      if (!store[colName]) store[colName] = new Map();
      const colMap = store[colName];

      return {
        get: async () => {
          const docs = Array.from(colMap.values()).map((data) => ({
            id: data.id || data.uid,
            data: () => data,
            exists: true,
            ref: { id: data.id || data.uid, set: (d: any, o?: any) => colMap.set(data.id || data.uid, o?.merge ? { ...data, ...d } : d) },
          }));
          return {
            empty: docs.length === 0,
            docs,
            forEach: (cb: any) => docs.forEach(cb),
          };
        },
        doc: (docId: string) => {
          const docRef = {
            id: docId,
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
              if (options && options.merge) {
                const existing = colMap.get(docId) || {};
                colMap.set(docId, { ...existing, ...data });
              } else {
                colMap.set(docId, data);
              }
            },
          };
          return docRef;
        },
        where: (field: string, op: string, val: any) => {
          return {
            get: async () => {
              const results: any[] = [];
              for (const item of colMap.values()) {
                if (item[field] === val) {
                  results.push({
                    id: item.id || item.uid,
                    data: () => item,
                    ref: mockDb.collection(colName).doc(item.id || item.uid),
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
  };

  return { mockDb, store };
}

async function runSecurityPrivacyTests() {
  const { mockDb, store } = createSecurityPrivacyMockDb();
  const app = createExpressApp({ db: mockDb });
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  const aliceToken = 'DEMO_TOKEN_customer'; // Maps to demo-alice-uid

  console.log('\n--- Test Group 1: Rate Limiting & Brute-Force Defense ---');
  // Unsubscribe has strict rate limit (15 req/min). Send 16 requests and verify HTTP 429.
  let hit429 = false;
  const unsubToken = generateUnsubscribeToken('demo-alice-uid');
  for (let i = 0; i < 20; i++) {
    const res = await fetch(`${baseUrl}/api/marketing/unsubscribe?token=${unsubToken}&channel=email`);
    if (res.status === 429) {
      hit429 = true;
      break;
    }
  }
  assert(hit429, '1.1 Rate limiter successfully triggers HTTP 429 on rapid request burst');

  console.log('\n--- Test Group 2: Privacy DSAR Data Export (GET /api/user/export-data) ---');
  const exportUnauthRes = await fetch(`${baseUrl}/api/user/export-data`);
  assert(exportUnauthRes.status === 401, '2.1 Unauthenticated data export rejected with HTTP 401');

  const exportAuthRes = await fetch(`${baseUrl}/api/user/export-data`, {
    headers: { Authorization: `Bearer ${aliceToken}` },
  });
  const exportData: any = await exportAuthRes.json();
  assert(exportAuthRes.status === 200, '2.2 Authenticated DSAR data export succeeds with HTTP 200');
  assert(exportData.success === true, '2.3 DSAR export success flag is true');
  assert(exportData.exportPackage.user.email === 'alice@hcicmd.ph', '2.4 DSAR export package contains user profile data');
  assert(Array.isArray(exportData.exportPackage.orders) && exportData.exportPackage.orders.length === 1, '2.5 DSAR export package contains user orders');

  console.log('\n--- Test Group 3: Account Deletion & PII Anonymization (DELETE /api/user/account) ---');
  const deleteUnauthRes = await fetch(`${baseUrl}/api/user/account`, { method: 'DELETE' });
  assert(deleteUnauthRes.status === 401, '3.1 Unauthenticated account deletion rejected with HTTP 401');

  const deleteAuthRes = await fetch(`${baseUrl}/api/user/account`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${aliceToken}` },
  });
  const deleteData: any = await deleteAuthRes.json();
  assert(deleteAuthRes.status === 200, '3.2 Authenticated account deletion succeeds with HTTP 200');
  assert(deleteData.success === true, '3.3 Account deletion success flag is true');

  // Verify user profile in store was anonymized
  const aliceProfile = store.users.get('demo-customer-uid');
  assert(aliceProfile.isAnonymized === true, '3.4 User profile marked as anonymized');
  assert(aliceProfile.email === 'deleted_demo-customer-uid@anonymized.invalid', '3.5 User email securely scrubbed / pseudonymized');
  assert(aliceProfile.firstName === '[DELETED]', '3.6 User first name purged');

  // Verify marketing consent revoked
  const aliceConsent = store.marketing_consents.get('demo-customer-uid');
  assert(aliceConsent.marketingEmailConsent === false && aliceConsent.marketingSmsConsent === false, '3.7 Marketing consents revoked upon account deletion');

  // Verify audit log recorded account deletion
  const auditDocs = Array.from(store.audit_logs.values());
  const deletionLog = auditDocs.find((a) => a.action === 'user_account_deleted_and_anonymized');
  assert(!!deletionLog, '3.8 Audit trail records account deletion and anonymization event');

  server.close();

  console.log('\n========================================================================');
  console.log(`Phase 9B-1 Test Results: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('========================================================================');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSecurityPrivacyTests().catch((err) => {
  console.error('Phase 9B-1 test execution failed:', err);
  process.exit(1);
});
