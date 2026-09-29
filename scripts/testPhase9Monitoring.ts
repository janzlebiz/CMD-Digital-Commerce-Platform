/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import {
  dispatchAlert,
  getAlertHistory,
  clearAlertHistory,
  sanitizeAlertDetails,
} from '../src/services/alertService.ts';
import {
  createExpressApp,
  PaymentAdapterRegistry,
  NotificationAdapterRegistry,
  enqueueNotification,
  processNotificationQueue,
} from '../server.ts';

console.log('========================================================================');
console.log('Running Phase 9B-4 / Gate 5: Monitoring, Alerting & Operational Test Suite');
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

function createMonitoringMockDb() {
  const collections = new Map<string, Map<string, any>>();

  function getColMap(name: string) {
    if (!collections.has(name)) collections.set(name, new Map());
    return collections.get(name)!;
  }

  getColMap('_health').set('readyz', { status: 'ready', timestamp: new Date().toISOString() });
  getColMap('users').set('demo-super-admin-uid', { uid: 'demo-super-admin-uid', email: 'admin@hcicmd.ph', role: 'super_admin' });

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
          const filterDocs = () => {
            const results: any[] = [];
            for (const [id, data] of colMap.entries()) {
              if (data[field1] === val1) {
                results.push({
                  id,
                  data: () => data,
                  exists: true,
                  ref: mockDb.collection(colName).doc(id),
                });
              }
            }
            return results;
          };
          const docs = filterDocs();
          const queryResult = {
            empty: docs.length === 0,
            docs,
            forEach: (cb: any) => docs.forEach(cb),
            get: async () => ({
              empty: docs.length === 0,
              docs,
              forEach: (cb: any) => docs.forEach(cb),
            }),
            where: (field2: string, op2: string, val2: any) => {
              const subDocs = docs.filter((d) => d.data()[field2] === val2);
              return {
                empty: subDocs.length === 0,
                docs: subDocs,
                forEach: (cb: any) => subDocs.forEach(cb),
                get: async () => ({
                  empty: subDocs.length === 0,
                  docs: subDocs,
                  forEach: (cb: any) => subDocs.forEach(cb),
                }),
              };
            },
          };
          return queryResult;
        },
      };
    },
    runTransaction: async (updateFunction: (transaction: any) => Promise<any>) => {
      const transaction = {
        get: async (ref: any) => {
          return await ref.get();
        },
        set: (ref: any, data: any, options?: any) => {
          const docId = ref.id;
          const colName = ref.colName || 'default';
          const colMap = getColMap(colName);
          if (options?.merge) {
            const existing = colMap.get(docId) || {};
            colMap.set(docId, { ...existing, ...data });
          } else {
            colMap.set(docId, data);
          }
        },
        update: (ref: any, data: any) => {
          const docId = ref.id;
          const colName = ref.colName || 'default';
          const colMap = getColMap(colName);
          const existing = colMap.get(docId) || {};
          colMap.set(docId, { ...existing, ...data });
        },
      };
      return await updateFunction(transaction);
    },
  };

  return mockDb;
}

function createMockRes() {
  const headers: Record<string, string> = {};
  return {
    statusCode: 200,
    body: null as any,
    headersSent: false,
    headers,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      this.headersSent = true;
      return this;
    },
    setHeader(key: string, val: string) {
      headers[key.toLowerCase()] = val;
    },
    getHeader(key: string) {
      return headers[key.toLowerCase()];
    },
    on() {},
  };
}

async function runMonitoringTests() {
  clearAlertHistory();

  const mockDb = createMonitoringMockDb();

  // --- Test Group 1: Health & Readiness Probe Endpoints ---
  console.log('\n--- Test Group 1: Health & Readiness Probe Endpoints ---');

  // Test real /healthz endpoint via express app instance
  const app = createExpressApp({ db: mockDb });

  const mockRes1 = createMockRes();
  app._router.handle({ method: 'GET', url: '/healthz', path: '/healthz', headers: {} }, mockRes1, () => {});

  assert(mockRes1.statusCode === 200 && mockRes1.body?.status === 'ok' && mockRes1.body?.timestamp !== undefined, '1.1 Real /healthz endpoint returns HTTP 200 with status ok and timestamp');

  // Test real /readyz endpoint
  const mockRes2 = createMockRes();
  await app._router.handle({ method: 'GET', url: '/readyz', path: '/readyz', headers: {} }, mockRes2, () => {});

  assert(mockRes2.statusCode === 200 && mockRes2.body?.status === 'ready', '1.2 Real /readyz endpoint executes database and readiness check');

  // Test real /readyz in maintenance mode
  const origMaint = process.env.MAINTENANCE_MODE;
  process.env.MAINTENANCE_MODE = 'true';

  const mockRes3 = createMockRes();
  await app._router.handle({ method: 'GET', url: '/readyz', path: '/readyz', headers: {} }, mockRes3, () => {});
  process.env.MAINTENANCE_MODE = origMaint;

  assert(mockRes3.statusCode === 503 && mockRes3.body?.status === 'maintenance_mode', '1.3 Real /readyz probe returns HTTP 503 maintenance mode status during active maintenance');

  // --- Test Group 2: Production Config Enforcement & Application Alert Wiring ---
  console.log('\n--- Test Group 2: Production Config Enforcement & Application Alert Wiring ---');

  // 2.1 Test missing production webhook config fails closed
  const origNodeEnv = process.env.NODE_ENV;
  const origUrl = process.env.ALERT_WEBHOOK_URL;
  const origSecret = process.env.ALERT_WEBHOOK_SECRET;

  process.env.NODE_ENV = 'production';
  delete process.env.ALERT_WEBHOOK_URL;
  delete process.env.ALERT_WEBHOOK_SECRET;

  let prodConfigFailedClosed = false;
  try {
    await dispatchAlert({
      category: 'critical_server_error',
      message: 'Test production missing config dispatch',
    });
  } catch (err: any) {
    if (err.message.includes('ALERT_WEBHOOK_CONFIG_REQUIRED')) {
      prodConfigFailedClosed = true;
    }
  } finally {
    process.env.NODE_ENV = origNodeEnv;
    if (origUrl) process.env.ALERT_WEBHOOK_URL = origUrl;
    if (origSecret) process.env.ALERT_WEBHOOK_SECRET = origSecret;
  }

  assert(prodConfigFailedClosed === true, '2.1 Alert dispatcher fails closed in production when ALERT_WEBHOOK_URL or ALERT_WEBHOOK_SECRET is missing');

  // Mock webhook URL for remaining tests
  process.env.ALERT_WEBHOOK_URL = 'http://localhost/mock-alert-webhook';
  process.env.ALERT_WEBHOOK_SECRET = 'TEST_ALERT_SECRET_123';

  // 2.2 Application Payment Provider Failure Alert Wiring Test
  clearAlertHistory();

  // Register a failing payment adapter in PaymentAdapterRegistry
  PaymentAdapterRegistry.registerAdapter('alert_test_failing_card', {
    providerType: 'simulated_card',
    async createPaymentIntent() {
      throw new Error('PAYMENT_GATEWAY_TIMEOUT: HTTP 504 Gateway Timeout from payment provider');
    },
    async confirmPayment() {
      throw new Error('Confirm payment unsupported');
    },
    async processRefund() {
      throw new Error('Refund failed');
    },
  });

  await mockDb.collection('inventory').doc('daet_hci-cmd-65ml').set({
    id: 'daet_hci-cmd-65ml',
    branchId: 'daet',
    skuId: 'hci-cmd-65ml',
    activeStock: 100,
    allocatedStock: 0,
    quarantineStock: 0,
    damagedStock: 0,
  });

  await mockDb.collection('branch_batch_inventory').doc('daet_batch-001').set({
    id: 'daet_batch-001',
    batchId: 'batch-001',
    branchId: 'daet',
    skuId: 'hci-cmd-65ml',
    availableQuantity: 100,
    reservedQuantity: 0,
    quarantineQuantity: 0,
    damagedQuantity: 0,
    qualityControlStatus: 'passed',
    expiryDate: '2028-12-31',
  });

  await mockDb.collection('product_batches').doc('batch-001').set({
    id: 'batch-001',
    batchId: 'batch-001',
    skuId: 'hci-cmd-65ml',
    qualityControlStatus: 'passed',
    expiryDate: '2028-12-31',
  });

  const checkoutReq = {
    method: 'POST',
    url: '/api/orders/checkout',
    path: '/api/orders/checkout',
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    headers: {
      authorization: 'Bearer DEMO_TOKEN_SUPER_ADMIN',
      'x-idempotency-key': `idemp-chk-alert-${Date.now()}`,
    },
    body: {
      branchId: 'daet',
      deliveryMethod: 'door_to_door',
      paymentMethod: 'alert_test_failing_card',
      items: [{ skuId: 'hci-cmd-65ml', quantity: 1 }],
      customer: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        mobileNumber: '+639170000000',
        shippingAddress: {
          addressLine1: '123 Test St',
          city: 'Manila',
          province: 'Metro Manila',
          postalCode: '1000',
        },
      },
    },
  };
  const checkoutRes = createMockRes();
  app._router.handle(checkoutReq, checkoutRes, () => {});

  for (let i = 0; i < 50 && !checkoutRes.headersSent; i++) {
    await new Promise((r) => setTimeout(r, 20));
  }

  const historyAfterCheckout = getAlertHistory();
  const paymentFailureAlert = historyAfterCheckout.find((a) => a.alert.category === 'payment_provider_failure');

  assert(
    checkoutRes.statusCode === 500 &&
    paymentFailureAlert !== undefined &&
    paymentFailureAlert.alert.severity === 'SEV-1' &&
    paymentFailureAlert.alert.message.includes('Checkout provider failed'),
    '2.2 Payment provider failure in checkout route dispatches SEV-1 payment_provider_failure alert on actual application path'
  );

  // 2.3 Application Notification Dead-Letter Alert Wiring Test
  clearAlertHistory();

  NotificationAdapterRegistry.registerAdapter('email', {
    channel: 'email',
    providerType: 'test-email',
    async send() {
      throw new Error('SMTP_PERMANENT_FAILURE: Delivery permanently rejected by remote MTA');
    },
  });

  const enqueueRes = await enqueueNotification(mockDb, {
    recipientId: 'usr-alert-test',
    recipientEmail: 'deadletter@example.com',
    channel: 'email',
    templateId: 'test_template',
    title: 'Test Notif',
    body: 'Test Body',
    maxRetries: 1,
    idempotencyKey: `idemp-notif-deadletter-${Date.now()}`,
  });

  assert(enqueueRes.success === true, '2.3 Enqueue notification succeeded for dead-letter test');

  await processNotificationQueue(mockDb, { forceImmediate: true });

  const historyAfterQueue = getAlertHistory();
  const deadLetterAlert = historyAfterQueue.find((a) => a.alert.category === 'notification_dead_letter');

  assert(
    deadLetterAlert !== undefined &&
    deadLetterAlert.alert.severity === 'SEV-2' &&
    deadLetterAlert.alert.details?.lastError?.includes('SMTP_PERMANENT_FAILURE'),
    '2.4 Notification transitioning to dead_letter queue in processNotificationQueue dispatches SEV-2 notification_dead_letter alert'
  );

  // 2.5 Critical server error alert dispatch test
  const alert1 = await dispatchAlert({
    category: 'critical_server_error',
    message: 'Unhandled 500 internal server error in checkout transaction',
    details: { path: '/api/orders/checkout', statusCode: 500 },
  });

  assert(alert1.alert.severity === 'SEV-1' && alert1.alert.category === 'critical_server_error', '2.5 Critical server error generates SEV-1 alert');

  // 2.6 SLA breach alert dispatch test
  const alert4 = await dispatchAlert({
    category: 'sla_breach',
    message: 'Support ticket TKT-8001 breached statutory 7-day resolution SLA under RA 11967',
    details: { ticketId: 'TKT-8001', category: 'damaged_product', slaDueAt: '2026-09-20T00:00:00Z' },
  });

  assert(alert4.alert.severity === 'SEV-3' && alert4.alert.category === 'sla_breach', '2.6 Statutory dispute resolution SLA breach routes to SEV-3 alert');

  // 2.7 Backup process failure alert dispatch test
  const alert5 = await dispatchAlert({
    category: 'backup_failure',
    message: 'Automated backup export failed: GCS bucket upload error',
    details: { backupFilename: 'backup-2026-09-29.json', error: 'Bucket not found' },
  });

  assert(alert5.alert.severity === 'SEV-1' && alert5.alert.category === 'backup_failure', '2.7 Automated backup process failure routes to SEV-1 alert');

  // --- Test Group 3: Webhook Delivery, Timeout Handling & Secret Redaction ---
  console.log('\n--- Test Group 3: Webhook Delivery, Error Handling & Secret Protection ---');

  // Test secret redaction
  const uncleanedDetails = {
    token: 'super_secret_jwt_token_12345',
    authorization: 'Bearer secret_access_key',
    password: 'my_admin_password',
    safeField: 'harmless_data_value',
    nested: {
      secret: 'nested_secret_value',
      normalField: 100,
    },
  };

  const sanitized = sanitizeAlertDetails(uncleanedDetails);
  const secretsRedacted = sanitized.token === '[REDACTED]' &&
    sanitized.authorization === '[REDACTED]' &&
    sanitized.password === '[REDACTED]' &&
    sanitized.safeField === 'harmless_data_value' &&
    sanitized.nested.secret === '[REDACTED]' &&
    sanitized.nested.normalField === 100;

  assert(secretsRedacted === true, '3.1 Alert payload sanitizer redacts secrets, tokens, passwords, and sensitive keys');

  // Test webhook error handling
  const mockErrorFetch = async () => {
    return {
      ok: false,
      status: 500,
      statusText: 'Internal Webhook Server Error',
    };
  };

  const errorAlert = await dispatchAlert({
    category: 'critical_server_error',
    message: 'Test server error dispatch',
    fetchHandler: mockErrorFetch,
  });

  assert(errorAlert.delivered === false && errorAlert.error?.includes('HTTP_500'), '3.2 Webhook server error handled gracefully without throwing or crashing server');

  // Test webhook timeout handling
  const mockTimeoutFetch = async () => {
    throw new Error('WEBHOOK_TIMEOUT: Alert delivery timed out after 5000ms');
  };

  const timeoutAlert = await dispatchAlert({
    category: 'backup_failure',
    message: 'Test backup timeout dispatch',
    fetchHandler: mockTimeoutFetch,
  });

  assert(timeoutAlert.delivered === false && timeoutAlert.error?.includes('WEBHOOK_TIMEOUT'), '3.3 Webhook network timeout handled cleanly with fail-closed error recording');

  // --- Test Group 4: Operational Runbook Existence & Completeness ---
  console.log('\n--- Test Group 4: Operational Runbook Verification ---');

  const runbookPath = path.resolve(process.cwd(), 'docs/RUNBOOK_OPERATIONS.md');
  const runbookExists = fs.existsSync(runbookPath);
  assert(runbookExists === true, '4.1 Operational Runbook file docs/RUNBOOK_OPERATIONS.md exists');

  if (runbookExists) {
    const content = fs.readFileSync(runbookPath, 'utf8');
    const containsSections = content.includes('Health & Readiness Monitoring Probes') &&
      content.includes('Incident Severity Levels') &&
      content.includes('SEV-1') &&
      content.includes('Payment & Provider Failure SOP') &&
      content.includes('Backup Failure SOP') &&
      content.includes('Notification Dead-Letter Failure SOP') &&
      content.includes('Statutory SLA Breach Response SOP') &&
      content.includes('Emergency Maintenance Mode SOP') &&
      content.includes('Escalation Matrix') &&
      content.includes('Recovery Verification SOP');

    assert(containsSections === true, '4.2 Operational Runbook contains required health checks, SEV levels, SOPs, maintenance mode, and escalation matrix');
  } else {
    assert(false, '4.2 Operational Runbook content check skipped because file missing');
  }

  console.log('\n========================================================================');
  console.log(`Phase 9B-4 Monitoring & Alerting Test Results: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('========================================================================');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runMonitoringTests().catch((err) => {
  console.error('Phase 9B-4 test execution failed:', err);
  process.exit(1);
});
