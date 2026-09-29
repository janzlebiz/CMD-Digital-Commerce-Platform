/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  createExpressApp,
  NotificationAdapterRegistry,
  SimulatedNotificationAdapter,
  enqueueNotification,
  processNotificationQueue,
  generateNotificationIdempotencyKey,
  updateUserMarketingConsent,
  getUserMarketingConsent,
  generateUnsubscribeToken,
  createMarketingCampaign,
  dispatchMarketingCampaign,
  MarketingCampaign,
} from '../server.ts';
import http from 'http';

console.log('========================================================================');
console.log('Running Priority C Milestone C3: Privacy Consent & Marketing Automation Suite');
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

function createC3MockDb() {
  const store: Record<string, Map<string, any>> = {
    users: new Map(),
    marketing_consents: new Map(),
    marketing_campaigns: new Map(),
    notification_queue: new Map(),
    notifications: new Map(),
    audit_logs: new Map(),
    orders: new Map(),
    workshop_registrations: new Map(),
    workshops: new Map(),
  };

  // Seed sample users with various consent and cohort states
  // 1. Alice (Consent: Email = YES, SMS = NO, Cohort: Repeat Retail + Replenishment Due)
  store.users.set('demo-alice-uid', {
    uid: 'demo-alice-uid',
    role: 'customer',
    email: 'alice@hcicmd.ph',
    firstName: 'Alice',
    lastName: 'Santos',
    mobileNumber: '+639171112222',
    assignedBranchId: 'daet',
    marketingEmailConsent: true,
    marketingSmsConsent: false,
    consentUpdatedAt: '2026-09-01T00:00:00Z',
    consentSource: 'profile',
    unsubscribeToken: generateUnsubscribeToken('demo-alice-uid'),
  });

  // 2. Bob (Consent: Email = NO, SMS = YES, Cohort: Wholesale Stockist)
  store.users.set('demo-bob-uid', {
    uid: 'demo-bob-uid',
    role: 'customer',
    email: 'bob@example.com',
    firstName: 'Bob',
    lastName: 'Reyes',
    mobileNumber: '+639173334444',
    assignedBranchId: 'daet',
    marketingEmailConsent: false,
    marketingSmsConsent: true,
    consentUpdatedAt: '2026-09-01T00:00:00Z',
    consentSource: 'checkout',
    unsubscribeToken: generateUnsubscribeToken('demo-bob-uid'),
  });

  // 3. Charlie (Consent: NONE / Opted Out, Cohort: Replenishment Due)
  store.users.set('demo-charlie-uid', {
    uid: 'demo-charlie-uid',
    role: 'customer',
    email: 'charlie@example.com',
    firstName: 'Charlie',
    lastName: 'Dela Cruz',
    mobileNumber: '+639175556666',
    assignedBranchId: 'daet',
    marketingEmailConsent: false,
    marketingSmsConsent: false,
    consentUpdatedAt: '2026-09-01T00:00:00Z',
    consentSource: 'default_opt_out',
    unsubscribeToken: generateUnsubscribeToken('demo-charlie-uid'),
  });

  // 4. Diana (Naga Branch, Consent: Email = YES, SMS = YES, Cohort: Wholesale Stockist)
  store.users.set('demo-diana-uid', {
    uid: 'demo-diana-uid',
    role: 'customer',
    email: 'diana@naga.ph',
    firstName: 'Diana',
    lastName: 'Lim',
    mobileNumber: '+639177778888',
    assignedBranchId: 'naga',
    marketingEmailConsent: true,
    marketingSmsConsent: true,
    consentUpdatedAt: '2026-09-01T00:00:00Z',
    consentSource: 'privacy_center',
    unsubscribeToken: generateUnsubscribeToken('demo-diana-uid'),
  });

  // Staff users
  store.users.set('demo-manager-daet-uid', {
    uid: 'demo-manager-daet-uid',
    role: 'branch_manager',
    assignedBranchId: 'daet',
    email: 'manager.daet@hcicmd.ph',
  });
  store.users.set('demo-manager-naga-uid', {
    uid: 'demo-manager-naga-uid',
    role: 'branch_manager',
    assignedBranchId: 'naga',
    email: 'manager.naga@hcicmd.ph',
  });
  store.users.set('demo-admin-uid', {
    uid: 'demo-admin-uid',
    role: 'super_admin',
    email: 'admin@hcicmd.ph',
  });

  // Seed orders for cohort calculation
  const nowMs = Date.now();
  const days30Ago = new Date(nowMs - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Alice: 2 retail orders placed 30 days ago (Repeat Retail + Replenishment Due)
  store.orders.set('ORD-ALICE-1', {
    id: 'ORD-ALICE-1',
    userId: 'demo-alice-uid',
    branchId: 'daet',
    grandTotal: 1200,
    fulfillmentStatus: 'completed',
    createdAt: days30Ago,
  });
  store.orders.set('ORD-ALICE-2', {
    id: 'ORD-ALICE-2',
    userId: 'demo-alice-uid',
    branchId: 'daet',
    grandTotal: 1200,
    fulfillmentStatus: 'completed',
    createdAt: days30Ago,
  });

  // Bob: Wholesale order > 5000 (Wholesale Stockist)
  store.orders.set('ORD-BOB-1', {
    id: 'ORD-BOB-1',
    userId: 'demo-bob-uid',
    branchId: 'daet',
    grandTotal: 8500,
    fulfillmentStatus: 'completed',
    createdAt: days30Ago,
  });

  // Charlie: 1 order placed 30 days ago (Replenishment Due)
  store.orders.set('ORD-CHARLIE-1', {
    id: 'ORD-CHARLIE-1',
    userId: 'demo-charlie-uid',
    branchId: 'daet',
    grandTotal: 1200,
    fulfillmentStatus: 'completed',
    createdAt: days30Ago,
  });

  // Diana: Wholesale order > 5000 at Naga branch (Wholesale Stockist, Naga)
  store.orders.set('ORD-DIANA-1', {
    id: 'ORD-DIANA-1',
    userId: 'demo-diana-uid',
    branchId: 'naga',
    grandTotal: 15000,
    fulfillmentStatus: 'completed',
    createdAt: days30Ago,
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
                forEach: (cb: any) => results.forEach(cb),
                docs: results,
              };
            },
          };
        },
      };
    },
    runTransaction: async (updateFunction: (transaction: any) => Promise<any>) => {
      const transaction = {
        get: async (docRef: any) => docRef.get(),
        set: (docRef: any, data: any, options?: any) => docRef.set(data, options),
        update: (docRef: any, data: any) => docRef.update(data),
        delete: (docRef: any) => docRef.delete(),
      };
      return updateFunction(transaction);
    },
  };

  return { mockDb, store };
}

async function runTests() {
  const { mockDb, store } = createC3MockDb();
  const app = createExpressApp({ db: mockDb });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;

  const customerAliceToken = 'DEMO_TOKEN_alice';
  const customerBobToken = 'DEMO_TOKEN_bob';
  const managerDaetToken = 'DEMO_TOKEN_branch_manager_daet';
  const managerNagaToken = 'DEMO_TOKEN_branch_manager_naga';
  const adminToken = 'DEMO_TOKEN_super_admin';

  const spyEmail = new SimulatedNotificationAdapter('email', 'spy_email_c3');
  const spySms = new SimulatedNotificationAdapter('sms', 'spy_sms_c3');
  NotificationAdapterRegistry.registerAdapter('email', spyEmail);
  NotificationAdapterRegistry.registerAdapter('sms', spySms);

  try {
    // ========================================================================
    // SECTION 1: MARKETING CONSENT (OPT-IN, UPDATE, UNPACK, UNREGISTERED)
    // ========================================================================
    console.log('\n--- SECTION 1: Marketing Consent Lifecycle & Separation ---');

    // 1.1 Self-service consent retrieval
    const getConsentRes = await fetch(`http://127.0.0.1:${port}/api/user/consent`, {
      headers: { Authorization: `Bearer ${customerAliceToken}` },
    });
    const getConsentData: any = await getConsentRes.json();
    assert(getConsentRes.status === 200, '1.1 GET /api/user/consent returns HTTP 200 for authenticated customer');
    assert(getConsentData.consent.marketingEmailConsent === true, '1.2 Alice has active email consent');
    assert(getConsentData.consent.marketingSmsConsent === false, '1.3 Alice has no SMS consent (granular separation)');

    // 1.2 Self-service consent update (Opt-in to SMS)
    const updateConsentRes = await fetch(`http://127.0.0.1:${port}/api/user/consent`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerAliceToken}`,
      },
      body: JSON.stringify({ smsConsent: true, source: 'privacy_center' }),
    });
    const updateConsentData: any = await updateConsentRes.json();
    assert(updateConsentRes.status === 200, '1.4 PATCH /api/user/consent updates consent preferences');
    assert(updateConsentData.consent.marketingSmsConsent === true, '1.5 SMS consent successfully updated to true');
    assert(updateConsentData.consent.marketingEmailConsent === true, '1.6 Email consent preserved during partial SMS update');
    assert(updateConsentData.consent.consentSource === 'privacy_center', '1.7 Consent source correctly recorded');

    // 1.3 Public Unsubscribe via Token (One-Click Link)
    const aliceToken = updateConsentData.consent.unsubscribeToken;
    const unsubRes = await fetch(`http://127.0.0.1:${port}/api/marketing/unsubscribe?token=${aliceToken}`, {
      method: 'GET',
    });
    const unsubData: any = await unsubRes.json();
    assert(unsubRes.status === 200, '1.8 Public 1-click GET /api/marketing/unsubscribe succeeds with HTTP 200');
    assert(unsubData.consent.marketingEmailConsent === false, '1.9 Unsubscribed user has email consent revoked');
    assert(unsubData.consent.marketingSmsConsent === false, '1.10 Unsubscribed user has SMS consent revoked');
    assert(unsubData.consent.consentSource === 'unsubscribe_link', '1.11 Consent source recorded as unsubscribe_link');

    // 1.4 Public Unsubscribe via Email Body
    const unsubEmailRes = await fetch(`http://127.0.0.1:${port}/api/marketing/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bob@example.com', channel: 'sms' }),
    });
    const unsubEmailData: any = await unsubEmailRes.json();
    assert(unsubEmailRes.status === 200, '1.12 POST /api/marketing/unsubscribe with email body succeeds with HTTP 200');
    assert(unsubEmailData.consent.marketingSmsConsent === false, '1.13 Bob SMS consent revoked via email lookup');

    // Re-opt Alice in for downstream campaign testing
    await updateUserMarketingConsent(mockDb, {
      userId: 'demo-alice-uid',
      email: 'alice@hcicmd.ph',
      emailConsent: true,
      smsConsent: false,
      source: 'profile',
    });

    // ========================================================================
    // SECTION 2: CAMPAIGN CRUD & AUTHORIZATION CONTROLS
    // ========================================================================
    console.log('\n--- SECTION 2: Campaign Management & Staff RBAC ---');

    // 2.1 Customer cannot create campaign (403 Forbidden)
    const customerCreateRes = await fetch(`http://127.0.0.1:${port}/api/marketing/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerAliceToken}`,
      },
      body: JSON.stringify({
        title: 'Customer Unauthorized Campaign',
        subject: 'Discount Promo',
        body: 'Unauthorized content',
        channel: 'email',
      }),
    });
    assert(customerCreateRes.status === 403, '2.1 Non-staff user attempting campaign creation returns HTTP 403 Forbidden');

    // 2.2 Branch Manager creates Daet-scoped campaign
    const createCampRes = await fetch(`http://127.0.0.1:${port}/api/marketing/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerDaetToken}`,
      },
      body: JSON.stringify({
        title: 'Daet Mineral Replenishment Reminder Promo',
        description: 'Targeted replenishment incentive for Daet regular buyers',
        channel: 'email',
        subject: 'Time to replenish your HCI CMD trace minerals!',
        body: 'Enjoy a 10% loyalty discount on your next cellular replenishment order.',
        targetCohort: 'replenishment_due',
        branchId: 'daet',
      }),
    });
    const createCampData: any = await createCampRes.json();
    assert(createCampRes.status === 201, '2.2 Branch Manager creates campaign with HTTP 201 Created');
    assert(createCampData.campaign.status === 'draft', '2.3 Initial campaign status is draft');
    const daetCampaignId = createCampData.campaign.id;

    // 2.3 Super Admin creates Global SMS Campaign
    const createSmsCampRes = await fetch(`http://127.0.0.1:${port}/api/marketing/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Wholesale B2B SMS Broadcast',
        channel: 'sms',
        subject: 'HCI CMD B2B Update',
        body: 'Commercial stockists: new batch inventory available for Daet and Naga.',
        targetCohort: 'wholesale_stockist',
        branchId: 'all',
      }),
    });
    const createSmsData: any = await createSmsCampRes.json();
    assert(createSmsCampRes.status === 201, '2.4 Super Admin creates multi-branch wholesale SMS campaign');
    const smsCampaignId = createSmsData.campaign.id;

    // 2.4 Branch Manager cannot dispatch or modify another branch's campaign (IDOR protection)
    const nagaManagerDispatchDaetRes = await fetch(`http://127.0.0.1:${port}/api/marketing/campaigns/${daetCampaignId}/dispatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerNagaToken}`,
      },
    });
    assert(nagaManagerDispatchDaetRes.status === 403, '2.5 Naga manager cannot dispatch Daet branch campaign (HTTP 403 Forbidden)');

    // 2.5 List campaigns - Naga manager does not see Daet-scoped campaign
    const listNagaRes = await fetch(`http://127.0.0.1:${port}/api/marketing/campaigns`, {
      headers: { Authorization: `Bearer ${managerNagaToken}` },
    });
    const listNagaData: any = await listNagaRes.json();
    const containsDaet = listNagaData.campaigns.some((c: any) => c.id === daetCampaignId);
    assert(!containsDaet, '2.6 Naga manager campaign list excludes Daet branch campaigns');

    // ========================================================================
    // SECTION 3: MANDATORY CONSENT ENFORCEMENT & COHORT TARGETING
    // ========================================================================
    console.log('\n--- SECTION 3: Mandatory Consent Enforcement in Dispatch ---');

    // Scenario A: Email Campaign targeting 'replenishment_due' cohort in Daet
    // Candidate 1: Alice (In cohort 'replenishment_due', Consent Email = YES) -> MUST BE ENQUEUED
    // Candidate 2: Charlie (In cohort 'replenishment_due', Consent Email = NO) -> MUST BE EXCLUDED
    const dispatchDaetRes = await fetch(`http://127.0.0.1:${port}/api/marketing/campaigns/${daetCampaignId}/dispatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerDaetToken}`,
      },
    });
    const dispatchDaetData: any = await dispatchDaetRes.json();
    assert(dispatchDaetRes.status === 200, '3.1 Campaign dispatch succeeds with HTTP 200');
    assert(dispatchDaetData.totalTargeted === 3, '3.2 Targeted total 3 users in replenishment_due cohort in Daet (Alice, Bob, Charlie)');
    assert(dispatchDaetData.totalEligible === 1, '3.3 Eligible exactly 1 user with active email consent (Alice)');
    assert(dispatchDaetData.totalExcludedConsent === 2, '3.4 Automatically excluded 2 users without active email consent (Bob, Charlie)');
    assert(dispatchDaetData.enqueuedCount === 1, '3.5 Exactly 1 message enqueued into notification queue');

    // Verify queue item attributes
    const aliceQueueItem = dispatchDaetData.enqueuedItems[0]?.queueItem;
    assert(aliceQueueItem !== undefined, '3.6 Enqueued item returned in response');
    assert(aliceQueueItem.recipientId === 'demo-alice-uid', '3.7 Queue item targeted to Alice');
    assert(aliceQueueItem.channel === 'email', '3.8 Channel is email');
    assert(aliceQueueItem.metadata?.campaignId === daetCampaignId, '3.9 Preserves campaignId metadata');
    assert(aliceQueueItem.metadata?.cohort === 'replenishment_due', '3.10 Preserves cohort metadata');
    assert(aliceQueueItem.metadata?.unsubscribeToken !== undefined, '3.11 Enqueued item contains unsubscribeToken for 1-click unsubscribe');

    // Scenario B: SMS Campaign targeting 'wholesale_stockist' cohort across 'all' branches
    // Re-opt in Diana (SMS = YES) and Bob (SMS = YES)
    await updateUserMarketingConsent(mockDb, { userId: 'demo-bob-uid', email: 'bob@example.com', smsConsent: true, source: 'test' });
    await updateUserMarketingConsent(mockDb, { userId: 'demo-diana-uid', email: 'diana@naga.ph', smsConsent: true, source: 'test' });

    const dispatchSmsRes = await fetch(`http://127.0.0.1:${port}/api/marketing/campaigns/${smsCampaignId}/dispatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    });
    const dispatchSmsData: any = await dispatchSmsRes.json();
    assert(dispatchSmsRes.status === 200, '3.12 Wholesale SMS campaign dispatch succeeds with HTTP 200');
    assert(dispatchSmsData.totalTargeted === 2, '3.13 Targeted 2 wholesale stockists (Bob + Diana)');
    assert(dispatchSmsData.totalEligible === 2, '3.14 Both wholesale users with active SMS consent eligible');
    assert(dispatchSmsData.totalExcludedConsent === 0, '3.15 Zero excluded when all targeted have SMS consent');
    assert(dispatchSmsData.enqueuedCount === 2, '3.16 2 SMS messages enqueued into notification queue');

    // ========================================================================
    // SECTION 4: IDEMPOTENCY, DUPLICATE PREVENTION & QUEUE DISPATCH
    // ========================================================================
    console.log('\n--- SECTION 4: Idempotency & Queue Worker Processing ---');

    // 4.1 Duplicate campaign dispatch prevention
    const replayDispatchRes = await fetch(`http://127.0.0.1:${port}/api/marketing/campaigns/${daetCampaignId}/dispatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerDaetToken}`,
      },
    });
    const replayDispatchData: any = await replayDispatchRes.json();
    assert(replayDispatchRes.status === 200, '4.1 Replaying completed campaign dispatch succeeds idempotently');
    assert(replayDispatchData.enqueuedItems[0]?.idempotentReplay === true, '4.2 Replay detected as idempotent replay');

    // 4.2 Process Notification Queue for Campaign Messages
    const queueProcessRes = await processNotificationQueue(mockDb, { maxBatchSize: 50, forceImmediate: true });
    assert(queueProcessRes.processedCount >= 3, '4.3 Queue worker processes all enqueued campaign messages');
    assert(queueProcessRes.dispatchedCount >= 3, '4.4 All campaign messages successfully dispatched to adapters');
    assert(spyEmail.sendCount >= 1, '4.5 Email adapter dispatched campaign email');
    assert(spySms.sendCount >= 2, '4.6 SMS adapter dispatched wholesale SMS broadcasts');

    // 4.3 Verify Audit Logs
    const auditLogs = Array.from(store.audit_logs.values());
    const consentAudit = auditLogs.find((a: any) => a.action === 'marketing_consent_updated');
    const unsubAudit = auditLogs.find((a: any) => a.action === 'marketing_unsubscribed');
    const dispatchAudit = auditLogs.find((a: any) => a.action === 'marketing_campaign_dispatched');

    assert(consentAudit !== undefined, '4.7 Audit log records marketing_consent_updated');
    assert(unsubAudit !== undefined, '4.8 Audit log records marketing_unsubscribed');
    assert(dispatchAudit !== undefined, '4.9 Audit log records marketing_campaign_dispatched');

  } finally {
    server.close();
  }

  console.log('========================================================================');
  console.log(`Priority C Milestone C3 Test Results: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('========================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error running Priority C Milestone C3 tests:', err);
  process.exit(1);
});
