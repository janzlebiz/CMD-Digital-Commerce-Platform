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
  enqueueOrderCheckoutCompletedNotification,
  enqueueOrderDispatchedNotification,
  enqueueOrderDeliveredNotification,
  enqueueOrderCancelledNotification,
  enqueueOrderRefundedNotification,
  enqueueConsultationBookingConfirmedNotification,
  enqueueConsultationCancelledNotification,
  enqueueConsultationReminder,
  enqueueWorkshopRegistrationConfirmedNotification,
  enqueueWorkshopReminders,
  enqueueWorkshopWaitlistPromotedNotification,
  promoteNextWaitlistedParticipant,
  enqueueTicketAcknowledgedNotification,
  enqueueTicketSlaBreachAlert,
  enqueueTicketResolvedNotification,
  checkAndEnqueueLowStockAlert,
  generateRegistrationSignature,
} from '../server.ts';
import http from 'http';

console.log('========================================================================');
console.log('Running Priority C Milestone C2: Transactional Lifecycle Automation Suite');
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

function createC2MockDb() {
  const store: Record<string, Map<string, any>> = {
    users: new Map(),
    notification_queue: new Map(),
    notifications: new Map(),
    audit_logs: new Map(),
    orders: new Map(),
    idempotency_keys: new Map(),
    consultation_appointments: new Map(),
    booked_slots: new Map(),
    consultation_assignments: new Map(),
    workshops: new Map(),
    workshop_registrations: new Map(),
    support_tickets: new Map(),
    inventory: new Map(),
    branch_batch_inventory: new Map(),
    batch_allocations: new Map(),
  };

  // Seed sample users
  store.users.set('demo-customer-uid', {
    uid: 'demo-customer-uid',
    role: 'customer',
    email: 'alice.customer@hcicmd.ph',
    firstName: 'Alice',
    lastName: 'Santos',
    mobileNumber: '+639171112222',
  });
  store.users.set('demo-bob-uid', {
    uid: 'demo-bob-uid',
    role: 'customer',
    email: 'bob@example.com',
    firstName: 'Bob',
    lastName: 'Reyes',
    mobileNumber: '+639173334444',
  });
  store.users.set('demo-manager-uid', {
    uid: 'demo-manager-uid',
    role: 'branch_manager',
    email: 'manager.daet@hcicmd.ph',
    assignedBranchId: 'daet',
    firstName: 'Carlos',
    lastName: 'Manager',
  });
  store.users.set('demo-admin-uid', {
    uid: 'demo-admin-uid',
    role: 'super_admin',
    email: 'admin@hcicmd.ph',
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
                    id: item.id || item.batchId,
                    data: () => item,
                    ref: mockDb.collection(colName).doc(item.id || item.batchId),
                  });
                }
              }
              return {
                empty: results.length === 0,
                forEach: (cb: any) => results.forEach(cb),
                docs: results,
              };
            },
            where: (f2: string, op2: string, v2: any) => {
              return {
                get: async () => {
                  const results: any[] = [];
                  for (const item of colMap.values()) {
                    if (item[field] === val && item[f2] === v2) {
                      results.push({
                        id: item.id || item.batchId,
                        data: () => item,
                        ref: mockDb.collection(colName).doc(item.id || item.batchId),
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
  const { mockDb, store } = createC2MockDb();
  const app = createExpressApp({ db: mockDb });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;

  const customerToken = 'DEMO_TOKEN_customer';
  const customerBobToken = 'DEMO_TOKEN_customer_bob';
  const managerToken = 'DEMO_TOKEN_branch_manager';
  const adminToken = 'DEMO_TOKEN_super_admin';

  // Spy adapters
  const spyEmailAdapter = new SimulatedNotificationAdapter('email', 'spy_email');
  const spySmsAdapter = new SimulatedNotificationAdapter('sms', 'spy_sms');
  const spyInAppAdapter = new SimulatedNotificationAdapter('in_app', 'spy_inapp');

  NotificationAdapterRegistry.registerAdapter('email', spyEmailAdapter);
  NotificationAdapterRegistry.registerAdapter('sms', spySmsAdapter);
  NotificationAdapterRegistry.registerAdapter('in_app', spyInAppAdapter);

  try {
    // ========================================================================
    // DOMAIN 1: ORDERS LIFECYCLE NOTIFICATIONS
    // ========================================================================
    console.log('\n--- DOMAIN 1: Orders Lifecycle Automation ---');

    // 1.1 Checkout Completed Trigger
    const testOrder = {
      id: 'ORD-TEST-1001',
      userId: 'demo-customer-uid',
      customer: {
        firstName: 'Alice',
        lastName: 'Santos',
        email: 'alice.customer@hcicmd.ph',
        mobileNumber: '+639171112222',
      },
      branchId: 'daet',
      grandTotal: 1950,
      fulfillmentStatus: 'pending_processing',
    };
    store.orders.set(testOrder.id, testOrder);

    const orderRes1 = await enqueueOrderCheckoutCompletedNotification(mockDb, testOrder);
    assert(orderRes1 !== null && orderRes1.success === true, '1.1 Order checkout completion triggers enqueueNotification');
    assert(orderRes1?.idempotentReplay === false, '1.2 First checkout notification is not a replay');
    assert(orderRes1?.queueItem.channel === 'email', '1.3 Checkout confirmation uses email channel');
    assert(orderRes1?.queueItem.recipientId === 'demo-customer-uid', '1.4 Recipient targeting targets customer UID');
    assert(orderRes1?.queueItem.recipientEmail === 'alice.customer@hcicmd.ph', '1.5 Recipient targeting records customer email');
    assert(orderRes1?.queueItem.idempotencyKey.includes('order_checkout_completed_ORD-TEST-1001'), '1.6 Deterministic key incorporates order_checkout_completed and orderId');

    // Duplicate prevention for checkout completed
    const orderRes1Replay = await enqueueOrderCheckoutCompletedNotification(mockDb, testOrder);
    assert(orderRes1Replay?.idempotentReplay === true, '1.7 Replaying same order checkout is prevented as idempotent replay');
    assert(orderRes1Replay?.queueItem.id === orderRes1?.queueItem.id, '1.8 Duplicate submission returns identical queue item ID');

    // 1.2 Fulfillment / Dispatch Trigger
    const orderRes2 = await enqueueOrderDispatchedNotification(mockDb, {
      ...testOrder,
      fulfillmentStatus: 'fulfilled',
    });
    assert(orderRes2 !== null && orderRes2.success === true, '1.9 Order fulfillment/dispatch triggers dispatch notification');
    assert(orderRes2?.queueItem.templateId === 'order_dispatched', '1.10 Queue item has order_dispatched template');
    assert(orderRes2?.queueItem.idempotencyKey.includes('order_dispatched_ORD-TEST-1001'), '1.11 Deterministic key contains order_dispatched and orderId');

    // 1.3 Delivery Completed Trigger via POST /api/orders/:orderId/deliver
    const deliverRes = await fetch(`http://127.0.0.1:${port}/api/orders/${testOrder.id}/deliver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
    });
    const deliverData: any = await deliverRes.json();
    assert(deliverRes.status === 200, '1.12 POST /api/orders/:orderId/deliver marks order delivered with HTTP 200');
    assert(deliverData.order.fulfillmentStatus === 'completed', '1.13 Order fulfillmentStatus transitions to completed');
    
    // Check that delivery notification was enqueued
    const expectedDelivKey = generateNotificationIdempotencyKey('email', 'demo-customer-uid', 'order_delivered', testOrder.id);
    const delivQueueDoc = Array.from(store.notification_queue.values()).find((q: any) => q.idempotencyKey === expectedDelivKey);
    assert(delivQueueDoc !== undefined, '1.14 Order delivery automatically enqueued delivery notification in queue');
    assert(delivQueueDoc.channel === 'email', '1.15 Delivery notification channel is email');

    // 1.4 Cancellation & Refund Triggers
    const cancelOrder = {
      id: 'ORD-TEST-1002',
      userId: 'demo-customer-uid',
      customer: { email: 'alice.customer@hcicmd.ph' },
      branchId: 'daet',
      grandTotal: 950,
      fulfillmentStatus: 'cancelled',
      cancellationReason: 'Duplicate customer mistake',
    };
    const cancelRes = await enqueueOrderCancelledNotification(mockDb, cancelOrder, 'Duplicate customer mistake');
    assert(cancelRes !== null && cancelRes.success === true, '1.16 Order cancellation enqueues cancellation notification');
    assert(cancelRes?.queueItem.templateId === 'order_cancelled', '1.17 Cancellation template is order_cancelled');

    const refundRes = await enqueueOrderRefundedNotification(mockDb, cancelOrder, 950, 'Full order cancellation', 'ref_key_1002');
    assert(refundRes !== null && refundRes.success === true, '1.18 Order refund enqueues refund notification');
    assert(refundRes?.queueItem.templateId === 'order_refunded', '1.19 Refund template is order_refunded');
    assert(refundRes?.queueItem.metadata?.amount === 950, '1.20 Refund notification preserves amount metadata');

    // ========================================================================
    // DOMAIN 2: CONSULTATIONS LIFECYCLE NOTIFICATIONS
    // ========================================================================
    console.log('\n--- DOMAIN 2: Consultations Lifecycle Automation ---');

    // 2.1 Booking Confirmation
    const appointmentRecord = {
      id: 'APPT-998877',
      userId: 'demo-customer-uid',
      customerName: 'Alice Santos',
      customerEmail: 'alice.customer@hcicmd.ph',
      customerPhone: '+639171112222',
      practitionerId: 'dr-marquez',
      practitionerName: 'Dr. Elena Marquez, ND',
      serviceCode: 'initial-cellular-protocol',
      serviceTitle: 'Initial Cellular Health Protocol',
      deliveryMode: 'virtual',
      branchId: 'daet',
      scheduledDate: '2026-10-15',
      scheduledTime: '10:00 AM',
      status: 'scheduled',
    };
    store.consultation_appointments.set(appointmentRecord.id, appointmentRecord);

    const apptRes1 = await enqueueConsultationBookingConfirmedNotification(mockDb, appointmentRecord);
    assert(apptRes1 !== null && apptRes1.success === true, '2.1 Consultation booking enqueues booking confirmation');
    assert(apptRes1?.queueItem.templateId === 'consultation_booking_confirmed', '2.2 Consultation template is consultation_booking_confirmed');
    assert(apptRes1?.queueItem.recipientId === 'demo-customer-uid', '2.3 Targets customer recipientId');

    // Duplicate prevention for booking
    const apptRes1Replay = await enqueueConsultationBookingConfirmedNotification(mockDb, appointmentRecord);
    assert(apptRes1Replay?.idempotentReplay === true, '2.4 Duplicate consultation booking notification is idempotent replay');

    // 2.2 Consultation Cancellation
    const apptCancelRes = await enqueueConsultationCancelledNotification(mockDb, appointmentRecord, 'Patient rescheduling');
    assert(apptCancelRes !== null && apptCancelRes.success === true, '2.5 Consultation cancellation enqueues cancellation notification');
    assert(apptCancelRes?.queueItem.templateId === 'consultation_cancelled', '2.6 Template is consultation_cancelled');

    // 2.3 24-Hour Reminder via API endpoint
    const reminder24Res = await fetch(`http://127.0.0.1:${port}/api/consultations/${appointmentRecord.id}/reminder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({ reminderType: '24h' }),
    });
    const reminder24Data: any = await reminder24Res.json();
    assert(reminder24Res.status === 201, '2.7 POST /api/consultations/:id/reminder (24h) returns HTTP 201');
    assert(reminder24Data.queueItem.channel === 'email', '2.8 24h reminder uses email channel');
    assert(reminder24Data.queueItem.templateId === 'consultation_reminder_24h', '2.9 Template is consultation_reminder_24h');

    // 2.4 2-Hour Reminder via API endpoint
    const reminder2Res = await fetch(`http://127.0.0.1:${port}/api/consultations/${appointmentRecord.id}/reminder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({ reminderType: '2h' }),
    });
    const reminder2Data: any = await reminder2Res.json();
    assert(reminder2Res.status === 201, '2.10 POST /api/consultations/:id/reminder (2h) returns HTTP 201');
    assert(reminder2Data.queueItem.channel === 'sms', '2.11 2h reminder uses sms channel for immediate delivery');
    assert(reminder2Data.queueItem.recipientPhone === '+639171112222', '2.12 Recipient phone targeted accurately');

    // Duplicate prevention for 2h reminder
    const reminder2Replay = await fetch(`http://127.0.0.1:${port}/api/consultations/${appointmentRecord.id}/reminder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({ reminderType: '2h' }),
    });
    const reminder2ReplayData: any = await reminder2Replay.json();
    assert(reminder2Replay.status === 200, '2.13 Replay of 2h reminder returns HTTP 200 idempotent response');
    assert(reminder2ReplayData.idempotentReplay === true, '2.14 Response confirms idempotentReplay === true');

    // ========================================================================
    // DOMAIN 3: WORKSHOPS LIFECYCLE NOTIFICATIONS
    // ========================================================================
    console.log('\n--- DOMAIN 3: Workshops Lifecycle Automation ---');

    const testWorkshop = {
      id: 'ws-cellular-daet',
      title: 'Cellular Hydration & Trace Mineral Symposium',
      date: '2026-10-20',
      time: '2:00 PM',
      capacity: 2,
      seatsAllocated: 0,
      waitlistCount: 0,
      branchId: 'daet',
    };
    store.workshops.set(testWorkshop.id, testWorkshop);

    // 3.1 Workshop Registration Confirmation
    const regAlice = {
      id: 'REG-WS-001',
      userId: 'demo-customer-uid',
      workshopId: testWorkshop.id,
      customerName: 'Alice Santos',
      customerEmail: 'alice.customer@hcicmd.ph',
      customerPhone: '+639171112222',
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };
    store.workshop_registrations.set(regAlice.id, regAlice);

    const wsRegRes = await enqueueWorkshopRegistrationConfirmedNotification(mockDb, regAlice, testWorkshop);
    assert(wsRegRes !== null && wsRegRes.success === true, '3.1 Workshop registration enqueues confirmation notification');
    assert(wsRegRes?.queueItem.templateId === 'workshop_registration_confirmed', '3.2 Template is workshop_registration_confirmed');

    // 3.2 Workshop Reminders for all confirmed attendees
    const wsRemindersRes = await fetch(`http://127.0.0.1:${port}/api/workshops/${testWorkshop.id}/reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
    });
    const wsRemindersData: any = await wsRemindersRes.json();
    assert(wsRemindersRes.status === 200, '3.3 POST /api/workshops/:id/reminders broadcasts reminders with HTTP 200');
    assert(wsRemindersData.enqueuedCount >= 1, '3.4 Enqueued reminder for confirmed attendee');

    // Duplicate prevention for workshop reminders
    const wsRemindersReplay = await fetch(`http://127.0.0.1:${port}/api/workshops/${testWorkshop.id}/reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
    });
    const wsRemindersReplayData: any = await wsRemindersReplay.json();
    assert(wsRemindersReplayData.enqueuedCount === 0, '3.5 Replay of workshop reminder creates 0 new queue items');

    // 3.3 Waitlist Promotion Trigger
    const regBobWaitlisted = {
      id: 'REG-WS-002',
      userId: 'demo-bob-uid',
      workshopId: testWorkshop.id,
      customerName: 'Bob Reyes',
      customerEmail: 'bob@example.com',
      customerPhone: '+639173334444',
      status: 'waitlisted',
      createdAt: new Date(Date.now() - 5000).toISOString(),
    };
    store.workshop_registrations.set(regBobWaitlisted.id, regBobWaitlisted);
    testWorkshop.waitlistCount = 1;

    const promoteRes = await fetch(`http://127.0.0.1:${port}/api/workshops/${testWorkshop.id}/promote-waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
    });
    const promoteData: any = await promoteRes.json();
    assert(promoteRes.status === 200, '3.6 POST /api/workshops/:id/promote-waitlist succeeds with HTTP 200');
    assert(promoteData.promoted === true, '3.7 Waitlist promotion returns promoted === true');
    assert(promoteData.registration.status === 'confirmed', '3.8 Promoted participant status updated to confirmed');
    assert(promoteData.registration.signature !== undefined, '3.9 Promoted pass has cryptographic signature updated');

    // Verify waitlist promotion notification enqueued
    const expectedPromoteKey = generateNotificationIdempotencyKey('email', 'demo-bob-uid', 'workshop_waitlist_promoted', regBobWaitlisted.id);
    const promoteQueueDoc = Array.from(store.notification_queue.values()).find((q: any) => q.idempotencyKey === expectedPromoteKey);
    assert(promoteQueueDoc !== undefined, '3.10 Waitlist promotion notification is enqueued in notification_queue');
    assert(promoteQueueDoc.recipientEmail === 'bob@example.com', '3.11 Recipient targeting targets promoted user Bob');

    // ========================================================================
    // DOMAIN 4: SUPPORT TICKETS LIFECYCLE NOTIFICATIONS
    // ========================================================================
    console.log('\n--- DOMAIN 4: Support Tickets Lifecycle Automation ---');

    // 4.1 Ticket Acknowledgement via POST /api/support/tickets
    const ticketCreateRes = await fetch(`http://127.0.0.1:${port}/api/support/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        branchId: 'daet',
        category: 'delivery_delay',
        subject: 'Parcel delay inquiry for Daet branch',
        description: 'My order has not arrived yet. Please verify shipping status.',
      }),
    });
    const ticketCreateData: any = await ticketCreateRes.json();
    assert(ticketCreateRes.status === 201, '4.1 Support ticket creation succeeds with HTTP 201');
    const createdTicketId = ticketCreateData.ticket.id;

    // Verify ticket acknowledgement enqueued
    const expectedAckKey = generateNotificationIdempotencyKey('email', 'demo-customer-uid', 'ticket_acknowledged', createdTicketId);
    const ackQueueDoc = Array.from(store.notification_queue.values()).find((q: any) => q.idempotencyKey === expectedAckKey);
    assert(ackQueueDoc !== undefined, '4.2 Support ticket acknowledgement is automatically enqueued');
    assert(ackQueueDoc.templateId === 'ticket_acknowledged', '4.3 Template is ticket_acknowledged');
    assert(ackQueueDoc.recipientId === 'demo-customer-uid', '4.4 Recipient targeting targets ticket creator');

    // 4.2 SLA Breach Staff Alert via POST /api/support/tickets/:ticketId/escalate
    const escalateRes = await fetch(`http://127.0.0.1:${port}/api/support/tickets/${createdTicketId}/escalate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ reason: 'SLA threshold exceeded; urgent inquiry.' }),
    });
    assert(escalateRes.status === 200, '4.5 Customer ticket escalation succeeds with HTTP 200');

    // Verify SLA breach staff alert enqueued to branch manager
    const expectedSlaKey = generateNotificationIdempotencyKey('email', 'demo-manager-uid', 'ticket_sla_breach_alert', createdTicketId);
    const slaQueueDoc = Array.from(store.notification_queue.values()).find((q: any) => q.idempotencyKey === expectedSlaKey);
    assert(slaQueueDoc !== undefined, '4.6 SLA breach staff alert is enqueued for branch manager');
    assert(slaQueueDoc.recipientId === 'demo-manager-uid', '4.7 Recipient targeting correctly targets assigned branch manager');
    assert(slaQueueDoc.templateId === 'ticket_sla_breach_staff_alert', '4.8 Template is ticket_sla_breach_staff_alert');

    // 4.3 Ticket Resolution Notification via PATCH /api/support/tickets/:ticketId
    const resolveRes = await fetch(`http://127.0.0.1:${port}/api/support/tickets/${createdTicketId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({
        status: 'resolved',
        resolutionSummary: 'Courier contacted and package successfully delivered to customer doorstep.',
      }),
    });
    assert(resolveRes.status === 200, '4.9 Staff ticket resolution succeeds with HTTP 200');

    // Verify resolution notification enqueued to customer
    const expectedResolveKey = generateNotificationIdempotencyKey('email', 'demo-customer-uid', 'ticket_resolved', createdTicketId);
    const resolveQueueDoc = Array.from(store.notification_queue.values()).find((q: any) => q.idempotencyKey === expectedResolveKey);
    assert(resolveQueueDoc !== undefined, '4.10 Ticket resolution notification enqueued for customer');
    assert(resolveQueueDoc.templateId === 'ticket_resolved', '4.11 Template is ticket_resolved');
    assert(resolveQueueDoc.metadata?.resolutionSummary.includes('doorstep'), '4.12 Notification metadata preserves resolution summary');

    // ========================================================================
    // DOMAIN 5: INVENTORY LOW-STOCK ROP AUTOMATION
    // ========================================================================
    console.log('\n--- DOMAIN 5: Inventory Low-Stock ROP Alerts ---');

    // 5.1 SKU where stock is well above ROP -> NO alert
    const skuAboveRop = {
      id: 'daet_hci-cmd-65ml-high',
      branchId: 'daet',
      skuId: 'hci-cmd-65ml-high',
      activeStock: 150,
      safetyStock: 20,
      leadTimeDays: 3,
      reorderPoint: 30,
    };
    store.inventory.set(skuAboveRop.id, skuAboveRop);

    const ropCheckHigh = await checkAndEnqueueLowStockAlert(mockDb, 'daet', 'hci-cmd-65ml-high');
    assert(ropCheckHigh.alertTriggered === false, '5.1 Stock above ROP threshold does NOT trigger notification alert');

    // 5.2 SKU where stock has dropped to or below ROP -> Triggers Alert to Branch Manager
    const skuLowStock = {
      id: 'daet_hci-cmd-65ml',
      branchId: 'daet',
      skuId: 'hci-cmd-65ml',
      activeStock: 25, // <= effective ROP (30)
      safetyStock: 20,
      leadTimeDays: 3,
      reorderPoint: 30,
    };
    store.inventory.set(skuLowStock.id, skuLowStock);

    const ropCheckLow = await checkAndEnqueueLowStockAlert(mockDb, 'daet', 'hci-cmd-65ml');
    assert(ropCheckLow.alertTriggered === true, '5.2 Stock at or below calculated ROP threshold triggers alert');
    assert(ropCheckLow.queueResult !== undefined, '5.3 Queue result returned on triggered alert');
    assert(ropCheckLow.queueResult?.queueItem.channel === 'email', '5.4 Low-stock ROP alert uses email channel');
    assert(ropCheckLow.queueResult?.queueItem.recipientId === 'demo-manager-uid', '5.5 Recipient targeting accurately targets branch manager');
    assert(ropCheckLow.queueResult?.queueItem.templateId === 'inventory_low_stock_rop_alert', '5.6 Template is inventory_low_stock_rop_alert');

    // 5.3 Duplicate prevention for ROP alert
    const ropCheckLowDuplicate = await checkAndEnqueueLowStockAlert(mockDb, 'daet', 'hci-cmd-65ml');
    assert(ropCheckLowDuplicate.alertTriggered === true, '5.7 Second ROP evaluation detects low stock condition');
    assert(ropCheckLowDuplicate.queueResult?.idempotentReplay === true, '5.8 Duplicate ROP evaluation is an idempotent replay');

    // 5.4 Evaluate via API endpoint POST /api/inventory/check-rop-alerts
    const ropApiRes = await fetch(`http://127.0.0.1:${port}/api/inventory/check-rop-alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({ branchId: 'daet', skuId: 'hci-cmd-65ml' }),
    });
    const ropApiData: any = await ropApiRes.json();
    assert(ropApiRes.status === 200, '5.9 POST /api/inventory/check-rop-alerts succeeds with HTTP 200');
    assert(ropApiData.alertTriggered === true, '5.10 API confirms low stock alert triggered');

    // ========================================================================
    // SECTION 6: QUEUE PROCESSING & FAILURE HANDLING VERIFICATION
    // ========================================================================
    console.log('\n--- SECTION 6: Queue Processing & Failure Resilience ---');

    // Count pending items across all 5 domains
    const initialPendingCount = Array.from(store.notification_queue.values()).filter((q: any) => q.status === 'pending').length;
    assert(initialPendingCount >= 10, '6.1 Verified multiple pending lifecycle notifications across all 5 domains');

    // Process all pending lifecycle notifications
    const processRes = await processNotificationQueue(mockDb, { maxBatchSize: 50, forceImmediate: true });
    assert(processRes.processedCount >= 10, '6.2 Queue worker processes all lifecycle items in batch');
    assert(processRes.dispatchedCount >= 10, '6.3 All lifecycle items successfully dispatched to simulated adapters');
    assert(spyEmailAdapter.sendCount >= 8, '6.4 Email adapter invoked for lifecycle emails');
    assert(spySmsAdapter.sendCount >= 1, '6.5 SMS adapter invoked for urgent 2h reminder');

    // Verify immutable notification records created in notifications collection
    const createdNotifCount = store.notifications.size;
    assert(createdNotifCount >= 10, '6.6 Dispatched lifecycle events create immutable audit records in notifications collection');

    // Failure Handling & Exponential Backoff Resilience
    const failingKey = generateNotificationIdempotencyKey('email', 'demo-customer-uid', 'simulated_failure', 'fail_01');
    await enqueueNotification(mockDb, {
      idempotencyKey: failingKey,
      recipientId: 'demo-customer-uid',
      recipientEmail: 'alice@example.com',
      channel: 'email',
      title: 'Transient Failure Test',
      body: 'Will test retry resilience.',
      maxRetries: 3,
      backoffMs: 500,
    });

    // Make adapter throw error on first attempt
    spyEmailAdapter.simulatedFailuresRemaining = 1;
    const failProcessRes = await processNotificationQueue(mockDb, { maxBatchSize: 10, forceImmediate: true });
    assert(failProcessRes.failedCount >= 1, '6.7 Transient error correctly increments failedCount');

    const failingItemSnap = await mockDb.collection('notification_queue').doc(Array.from(store.notification_queue.values()).find((q: any) => q.idempotencyKey === failingKey).id).get();
    const failingItem = failingItemSnap.data();
    assert(failingItem.status === 'failed', '6.8 Item transitions to failed status on transient failure');
    assert(failingItem.retryCount === 1, '6.9 Retry count incremented to 1');
    assert(failingItem.lastError.includes('Simulated Transient Provider Failure'), '6.10 Error details recorded in queue item');

    // Restore adapter and process retry
    spyEmailAdapter.simulatedFailuresRemaining = 0;
    const recoverProcessRes = await processNotificationQueue(mockDb, { maxBatchSize: 10, forceImmediate: true });
    assert(recoverProcessRes.dispatchedCount >= 1, '6.11 Recovered adapter dispatches item on subsequent queue run');

    const recoveredItemSnap = await mockDb.collection('notification_queue').doc(failingItem.id).get();
    assert(recoveredItemSnap.data().status === 'dispatched', '6.12 Item transitions from failed to dispatched upon recovery');

    // Terminal dead-letter failure
    const deadLetterKey = generateNotificationIdempotencyKey('email', 'demo-customer-uid', 'terminal_failure', 'dl_01');
    await enqueueNotification(mockDb, {
      idempotencyKey: deadLetterKey,
      recipientId: 'demo-customer-uid',
      channel: 'email',
      title: 'Terminal Failure Test',
      body: 'Testing max retries dead letter.',
      maxRetries: 1, // Only 1 attempt allowed
    });

    spyEmailAdapter.permanentFailure = true;
    const dlProcessRes = await processNotificationQueue(mockDb, { maxBatchSize: 10, forceImmediate: true });
    assert(dlProcessRes.deadLetterCount === 1, '6.13 Exhausted retries report deadLetterCount === 1');

    const dlItemSnap = await mockDb.collection('notification_queue').doc(Array.from(store.notification_queue.values()).find((q: any) => q.idempotencyKey === deadLetterKey).id).get();
    assert(dlItemSnap.data().status === 'dead_letter', '6.14 Terminal failure permanently transitions status to dead_letter');
    assert(dlItemSnap.data().lastError.includes('Simulated Permanent Provider Failure'), '6.15 Terminal failure retains diagnostic reason');
    spyEmailAdapter.permanentFailure = false;

  } finally {
    server.close();
  }

  console.log('========================================================================');
  console.log(`Priority C Milestone C2 Test Results: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('========================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error running Priority C Milestone C2 tests:', err);
  process.exit(1);
});
