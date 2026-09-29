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
  NotificationQueueItem,
  NotificationRecord,
} from '../server.ts';
import http from 'http';

console.log('========================================================================');
console.log('Running Priority C Milestone C1: Notification Infrastructure & Queue Suite');
console.log('========================================================================');

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${description}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${description}`);
    failedCount++;
  }
}

function createNotificationMockDb() {
  const store: Record<string, Map<string, any>> = {
    users: new Map(),
    notification_queue: new Map(),
    notifications: new Map(),
    audit_logs: new Map(),
  };

  // Seed sample users
  store.users.set('demo-customer-uid', {
    uid: 'demo-customer-uid',
    role: 'customer',
    email: 'customer@hcicmd.ph',
    firstName: 'Alice',
    lastName: 'Santos',
  });
  store.users.set('demo-manager-uid', {
    uid: 'demo-manager-uid',
    role: 'branch_manager',
    email: 'manager@hcicmd.ph',
    assignedBranchId: 'daet',
  });
  store.users.set('demo-bob-uid', {
    uid: 'demo-bob-uid',
    role: 'customer',
    email: 'bob@example.com',
  });

  const mockDb: any = {
    collection: (colName: string) => {
      if (!store[colName]) store[colName] = new Map();
      const colMap = store[colName];

      return {
        get: async () => {
          const docs = Array.from(colMap.values()).map((data) => ({
            id: data.id,
            data: () => data,
            exists: true,
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
                    id: item.id,
                    data: () => item,
                    ref: mockDb.collection(colName).doc(item.id),
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
  };

  return { mockDb, store };
}

async function runTests() {
  const { mockDb, store } = createNotificationMockDb();
  const app = createExpressApp({ db: mockDb });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;

  const customerToken = 'DEMO_TOKEN_customer';
  const customerBobToken = 'DEMO_TOKEN_customer_bob';
  const managerToken = 'DEMO_TOKEN_branch_manager';

  // Set up Simulated Notification Adapters
  const spyEmailAdapter = new SimulatedNotificationAdapter('email', 'spy_email_adapter');
  const spySmsAdapter = new SimulatedNotificationAdapter('sms', 'spy_sms_adapter');
  const spyInAppAdapter = new SimulatedNotificationAdapter('in_app', 'spy_inapp_adapter');

  NotificationAdapterRegistry.registerAdapter('email', spyEmailAdapter);
  NotificationAdapterRegistry.registerAdapter('sms', spySmsAdapter);
  NotificationAdapterRegistry.registerAdapter('in_app', spyInAppAdapter);

  try {
    // ------------------------------------------------------------------------
    // SECTION 1: Deterministic Idempotency Key Generation
    // ------------------------------------------------------------------------
    const key1 = generateNotificationIdempotencyKey('email', 'usr_101', 'order_confirmed', 'ord_901');
    const key2 = generateNotificationIdempotencyKey('email', 'usr_101', 'order_confirmed', 'ord_901');
    const keyDiff = generateNotificationIdempotencyKey('sms', 'usr_101', 'order_confirmed', 'ord_901');

    assert(key1 === 'notif_email_usr_101_order_confirmed_ord_901', '1. Deterministic key follows notif_<channel>_<recipient>_<event>_<ref> format');
    assert(key1 === key2, '2. Identical parameters produce identical deterministic idempotency key');
    assert(key1 !== keyDiff, '3. Different channel produces distinct idempotency key');

    // ------------------------------------------------------------------------
    // SECTION 2: Queue Creation & Multi-Channel Support
    // ------------------------------------------------------------------------
    const enqueueEmailRes = await fetch(`http://127.0.0.1:${port}/api/notifications/enqueue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        idempotencyKey: key1,
        recipientId: 'demo-customer-uid',
        recipientEmail: 'customer@hcicmd.ph',
        channel: 'email',
        templateId: 'order_receipt',
        title: 'Your HCI Order Confirmation',
        body: 'Thank you for your order. We are preparing your shipment.',
        metadata: { orderId: 'ord_901' },
      }),
    });

    const emailData: any = await enqueueEmailRes.json();
    assert(enqueueEmailRes.status === 201, '4. Enqueue email notification returns HTTP 201 Created');
    assert(emailData.success === true && emailData.queueItem.status === 'pending', '5. Enqueued item has status pending');
    assert(emailData.queueItem.channel === 'email', '6. Enqueued item correctly records email channel');

    // Enqueue SMS via manager for recipient
    const smsKey = generateNotificationIdempotencyKey('sms', 'demo-customer-uid', 'delivery_dispatched', 'ord_901');
    const enqueueSmsRes = await fetch(`http://127.0.0.1:${port}/api/notifications/enqueue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({
        idempotencyKey: smsKey,
        recipientId: 'demo-customer-uid',
        recipientPhone: '+639171234567',
        channel: 'sms',
        templateId: 'shipping_alert',
        title: 'Package In Transit',
        body: 'Your package is on its way via Local Express.',
      }),
    });
    const smsData: any = await enqueueSmsRes.json();
    assert(enqueueSmsRes.status === 201, '7. Staff enqueues SMS notification for customer with HTTP 201');
    assert(smsData.queueItem.channel === 'sms', '8. Enqueued item correctly records sms channel');

    // Enqueue In-App notification
    const inAppKey = generateNotificationIdempotencyKey('in_app', 'demo-customer-uid', 'appointment_reminder', 'apt_555');
    const enqueueInAppRes = await fetch(`http://127.0.0.1:${port}/api/notifications/enqueue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        idempotencyKey: inAppKey,
        recipientId: 'demo-customer-uid',
        channel: 'in_app',
        templateId: 'calendar_reminder',
        title: 'Upcoming Consultation',
        body: 'Your wellness consultation is scheduled in 24 hours.',
      }),
    });
    assert(enqueueInAppRes.status === 201, '9. Enqueue in-app notification succeeds with HTTP 201');

    // ------------------------------------------------------------------------
    // SECTION 3: Idempotency & Duplicate Enqueue Prevention
    // ------------------------------------------------------------------------
    const initialQueueCount = store.notification_queue.size;
    const duplicateEnqueueRes = await fetch(`http://127.0.0.1:${port}/api/notifications/enqueue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        idempotencyKey: key1, // Same key as earlier email
        recipientId: 'demo-customer-uid',
        recipientEmail: 'customer@hcicmd.ph',
        channel: 'email',
        title: 'Duplicate Title Attempt',
        body: 'Duplicate Body Attempt',
      }),
    });

    const dupData: any = await duplicateEnqueueRes.json();
    assert(duplicateEnqueueRes.status === 200, '10. Duplicate enqueue returns HTTP 200 (idempotent replay)');
    assert(dupData.idempotentReplay === true, '11. Response explicitly indicates idempotentReplay === true');
    assert(dupData.queueItem.id === emailData.queueItem.id, '12. Duplicate request returns identical queueItem ID');
    assert(store.notification_queue.size === initialQueueCount, '13. Duplicate submission does NOT create additional queue record');

    // ------------------------------------------------------------------------
    // SECTION 4: Successful Queue Processing & Dispatch
    // ------------------------------------------------------------------------
    spyEmailAdapter.sendCount = 0;
    spySmsAdapter.sendCount = 0;
    spyInAppAdapter.sendCount = 0;

    const processRes = await fetch(`http://127.0.0.1:${port}/api/notifications/process-queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({ maxBatchSize: 10 }),
    });

    const processData: any = await processRes.json();
    assert(processRes.status === 200, '14. Staff triggers queue processing with HTTP 200');
    assert(processData.processedCount === 3, '15. All 3 pending items are processed in the batch');
    assert(processData.dispatchedCount === 3, '16. All 3 items are successfully dispatched');
    assert(spyEmailAdapter.sendCount === 1, '17. Email adapter called exactly ONCE');
    assert(spySmsAdapter.sendCount === 1, '18. SMS adapter called exactly ONCE');
    assert(spyInAppAdapter.sendCount === 1, '19. In-App adapter called exactly ONCE');

    // Verify queue document state
    const processedEmailDoc = store.notification_queue.get(emailData.queueItem.id);
    assert(processedEmailDoc.status === 'dispatched', '20. Queue document updated to status: dispatched');
    assert(!!processedEmailDoc.dispatchedAt, '21. Queue document records dispatchedAt timestamp');
    assert(!!processedEmailDoc.providerResult, '22. Queue document persists providerResult');

    // Verify permanent notification history record created
    assert(store.notifications.size === 3, '23. Immutable notifications records created for all dispatched items');
    const customerNotifications = Array.from(store.notifications.values()).filter((n: any) => n.recipientId === 'demo-customer-uid');
    assert(customerNotifications.length === 3, '24. Recipient has 3 notification records in history');

    // ------------------------------------------------------------------------
    // SECTION 5: Duplicate Prevention on Subsequent Processing Runs
    // ------------------------------------------------------------------------
    spyEmailAdapter.sendCount = 0;
    spySmsAdapter.sendCount = 0;
    spyInAppAdapter.sendCount = 0;

    const secondProcessRes = await fetch(`http://127.0.0.1:${port}/api/notifications/process-queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({ maxBatchSize: 10 }),
    });

    const secondProcessData: any = await secondProcessRes.json();
    assert(secondProcessData.processedCount === 0, '25. Second queue process finds zero pending items');
    assert(spyEmailAdapter.sendCount === 0, '26. Duplicate processing makes ZERO new email adapter calls');
    assert(spySmsAdapter.sendCount === 0, '27. Duplicate processing makes ZERO new SMS adapter calls');

    // ------------------------------------------------------------------------
    // SECTION 6: Transient Failure & Exponential Retry Behavior
    // ------------------------------------------------------------------------
    const retryTestKey = generateNotificationIdempotencyKey('email', 'demo-customer-uid', 'transient_test', '101');
    const enqueueRetryRes = await fetch(`http://127.0.0.1:${port}/api/notifications/enqueue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        idempotencyKey: retryTestKey,
        recipientId: 'demo-customer-uid',
        recipientEmail: 'customer@hcicmd.ph',
        channel: 'email',
        title: 'Transient Failure Test',
        body: 'Testing retry backoff',
        maxRetries: 3,
        backoffMs: 500,
      }),
    });
    const retryQueueData: any = await enqueueRetryRes.json();
    const retryDocId = retryQueueData.queueItem.id;

    // Simulate 1 transient failure
    spyEmailAdapter.simulatedFailuresRemaining = 1;
    spyEmailAdapter.sendCount = 0;

    const retryProcess1 = await fetch(`http://127.0.0.1:${port}/api/notifications/process-queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({ forceImmediate: true }),
    });
    const retryData1: any = await retryProcess1.json();

    assert(retryData1.failedCount === 1, '28. Transient failure results in failedCount: 1');
    const docAfterFail1 = store.notification_queue.get(retryDocId);
    assert(docAfterFail1.status === 'failed', '29. Item marked status: failed after transient error');
    assert(docAfterFail1.retryCount === 1, '30. retryCount incremented to 1');
    assert(docAfterFail1.lastError.includes('Transient'), '31. lastError captures transient provider failure message');
    assert(!!docAfterFail1.nextAttemptAt, '32. nextAttemptAt computed with backoff timestamp');

    // Now provider is healthy (0 failures remaining), process again
    const retryProcess2 = await fetch(`http://127.0.0.1:${port}/api/notifications/process-queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({ forceImmediate: true }),
    });
    const retryData2: any = await retryProcess2.json();

    assert(retryData2.dispatchedCount === 1, '33. Recovered provider dispatches on subsequent retry');
    const docAfterSuccess = store.notification_queue.get(retryDocId);
    assert(docAfterSuccess.status === 'dispatched', '34. Item transitions from failed to dispatched');
    assert(docAfterSuccess.retryCount === 1, '35. Document preserves retry history count');

    // ------------------------------------------------------------------------
    // SECTION 7: Terminal Failure & Dead-Letter Queue (DLQ)
    // ------------------------------------------------------------------------
    const dlqKey = generateNotificationIdempotencyKey('sms', 'demo-customer-uid', 'terminal_fail', '999');
    const enqueueDlqRes = await fetch(`http://127.0.0.1:${port}/api/notifications/enqueue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        idempotencyKey: dlqKey,
        recipientId: 'demo-customer-uid',
        recipientPhone: '+639170000000',
        channel: 'sms',
        title: 'Terminal Failure Test',
        body: 'Testing DLQ exhaustion',
        maxRetries: 2, // Exceeds quickly
        backoffMs: 100,
      }),
    });
    const dlqQueueData: any = await enqueueDlqRes.json();
    const dlqDocId = dlqQueueData.queueItem.id;

    // Simulate permanent failure on SMS adapter
    spySmsAdapter.permanentFailure = true;

    // Attempt 1: Fails (retryCount 1 of 2)
    await fetch(`http://127.0.0.1:${port}/api/notifications/process-queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({ forceImmediate: true }),
    });
    assert(store.notification_queue.get(dlqDocId).status === 'failed', '36. Attempt 1 marks status: failed');

    // Attempt 2: Fails (retryCount 2 of 2 -> Dead Letter)
    const dlqProcess2 = await fetch(`http://127.0.0.1:${port}/api/notifications/process-queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({ forceImmediate: true }),
    });
    const dlqProcess2Data: any = await dlqProcess2.json();

    assert(dlqProcess2Data.deadLetterCount === 1, '37. Attempt 2 reports deadLetterCount: 1');
    const dlqDoc = store.notification_queue.get(dlqDocId);
    assert(dlqDoc.status === 'dead_letter', '38. Terminal failure sets status: dead_letter');
    assert(dlqDoc.retryCount === 2, '39. Terminal document records final retryCount');
    assert(dlqDoc.lastError.includes('Permanent'), '40. Terminal document preserves permanent error details');

    // Restore SMS adapter to normal
    spySmsAdapter.permanentFailure = false;

    // ------------------------------------------------------------------------
    // SECTION 8: Customer Feed & RBAC Security Checks
    // ------------------------------------------------------------------------
    // Customer fetching their own notification feed
    const myNotifsRes = await fetch(`http://127.0.0.1:${port}/api/notifications/my-notifications`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const myNotifsData: any = await myNotifsRes.json();
    assert(myNotifsRes.status === 200, '41. Customer can fetch their own notifications feed');
    assert(myNotifsData.notifications.length >= 3, '42. Feed contains dispatched notifications');

    // Customer attempting to view another user's queue item
    const foreignItemCheck = await fetch(`http://127.0.0.1:${port}/api/notifications/queue/${emailData.queueItem.id}`, {
      headers: { Authorization: `Bearer ${customerBobToken}` },
    });
    assert(foreignItemCheck.status === 403, '43. Customer blocked from viewing queue item of another recipient (HTTP 403)');

    // Customer attempting to run queue processing
    const unauthorizedProcess = await fetch(`http://127.0.0.1:${port}/api/notifications/process-queue`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(unauthorizedProcess.status === 403, '44. Customer blocked from processing notification queue (HTTP 403)');

    // Staff queue view with filters
    const staffQueueView = await fetch(`http://127.0.0.1:${port}/api/notifications/queue?status=dead_letter`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    const staffQueueData: any = await staffQueueView.json();
    assert(staffQueueView.status === 200, '45. Staff can query notification queue with status filter');
    assert(staffQueueData.items.some((i: any) => i.id === dlqDocId), '46. Staff query returns dead_letter queue item');

  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  console.log('========================================================================');
  console.log(`Priority C Milestone C1 Test Results: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('========================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unhandled error in Priority C C1 test runner:', err);
  process.exit(1);
});
