/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  createExpressApp,
  SimulatedPaymentAdapter,
  StandardDeliveryAdapter,
  PaymentAdapterRegistry,
  DeliveryAdapterRegistry,
} from '../server.ts';
import http from 'http';
import crypto from 'crypto';

console.log('========================================================================');
console.log('Running Priority B — Final Safety Remediation v2 Test Suite');
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

function createCommerceMockDb() {
  const store: Record<string, Map<string, any>> = {
    orders: new Map(),
    inventory: new Map(),
    product_batches: new Map(),
    branch_batch_inventory: new Map(),
    idempotency_keys: new Map(),
    refund_intents: new Map(),
    payment_compensations: new Map(),
    audit_logs: new Map(),
  };

  const daetBatch = {
    id: 'BAT-DAET-CMD65-01',
    batchId: 'BAT-DAET-CMD65-01',
    branchId: 'daet',
    skuId: 'hci-cmd-65ml',
    activeStock: 100,
    qualityControlStatus: 'passed',
    expiryDate: '2028-12-31',
    createdAt: new Date().toISOString(),
  };
  store.product_batches.set('BAT-DAET-CMD65-01', daetBatch);

  const daetBranchBatch = {
    id: 'daet_BAT-DAET-CMD65-01',
    branchId: 'daet',
    skuId: 'hci-cmd-65ml',
    batchId: 'BAT-DAET-CMD65-01',
    availableQuantity: 100,
    reservedQuantity: 0,
    expiryDate: '2028-12-31',
    createdAt: new Date().toISOString(),
  };
  store.branch_batch_inventory.set('daet_BAT-DAET-CMD65-01', daetBranchBatch);

  const daetAgg = {
    id: 'daet_hci-cmd-65ml',
    branchId: 'daet',
    skuId: 'hci-cmd-65ml',
    activeStock: 100,
    availableStock: 100,
    reservedStock: 0,
    branchBatches: [daetBranchBatch],
    updatedAt: new Date().toISOString(),
  };
  store.inventory.set('daet_hci-cmd-65ml', daetAgg);

  const docVersions = new Map<string, number>();

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
          };
          return docRef;
        },
        where: (field: string, op: string, val: any) => {
          return {
            where: (f2: string, op2: string, v2: any) => ({
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
            }),
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
          };
        },
      };
    },
    runTransaction: async (updateFunction: any) => {
      let retries = 5;
      while (retries > 0) {
        const readVersions = new Map<string, number>();
        const pendingWrites: Array<{ ref: any; data: any; merge?: boolean; isUpdate?: boolean }> = [];

        const transaction = {
          get: async (ref: any) => {
            const snap = await ref.get();
            const refId = ref.id;
            if (!docVersions.has(refId)) {
              docVersions.set(refId, 1);
            }
            readVersions.set(refId, docVersions.get(refId)!);
            return {
              ...snap,
              ref: snap.ref || ref,
            };
          },
          set: (ref: any, data: any, options?: any) => {
            pendingWrites.push({ ref, data, merge: !!(options && options.merge) });
          },
          update: (ref: any, data: any) => {
            pendingWrites.push({ ref, data, isUpdate: true });
          },
        };

        try {
          const result = await updateFunction(transaction);

          let hasConflict = false;
          for (const [refId, readVer] of readVersions.entries()) {
            const currentVer = docVersions.get(refId) || 1;
            if (currentVer !== readVer) {
              hasConflict = true;
              break;
            }
          }

          if (hasConflict) {
            retries--;
            if (retries === 0) {
              throw new Error('Transaction aborted due to too many contention conflicts.');
            }
            await new Promise((r) => setTimeout(r, Math.random() * 10 + 5));
            continue;
          }

          for (const write of pendingWrites) {
            const finalRef = write.ref && write.ref.ref ? write.ref.ref : write.ref;
            if (write.isUpdate) {
              await finalRef.update(write.data);
            } else {
              await finalRef.set(write.data, { merge: write.merge });
            }
            const refId = finalRef.id;
            docVersions.set(refId, (docVersions.get(refId) || 1) + 1);
          }

          return result;
        } catch (err: any) {
          if (err.message?.includes('contention conflicts')) {
            throw err;
          }
          throw err;
        }
      }
    },
  };

  return { mockDb, store };
}

async function runTests() {
  const { mockDb, store } = createCommerceMockDb();
  const app = createExpressApp({ db: mockDb });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;

  const customerToken = 'DEMO_TOKEN_customer';
  const customerBobToken = 'DEMO_TOKEN_customer_bob';
  const managerToken = 'DEMO_TOKEN_branch_manager';

  // Inject Spied Payment Adapter & Delivery Adapter
  const spyPaymentAdapter = new SimulatedPaymentAdapter('simulated_cod');
  PaymentAdapterRegistry.registerAdapter('cash_on_delivery', spyPaymentAdapter);
  PaymentAdapterRegistry.registerAdapter('simulated_cod', spyPaymentAdapter);
  PaymentAdapterRegistry.registerAdapter('credit_card', spyPaymentAdapter);
  PaymentAdapterRegistry.registerAdapter('simulated_card', spyPaymentAdapter);

  const spyDeliveryAdapter = new StandardDeliveryAdapter();
  DeliveryAdapterRegistry.registerAdapter('default', spyDeliveryAdapter);
  DeliveryAdapterRegistry.registerAdapter('door_to_door', spyDeliveryAdapter);
  DeliveryAdapterRegistry.registerAdapter('branch_pickup', spyDeliveryAdapter);

  try {
    // ------------------------------------------------------------------------
    // SECTION 1: Baseline Checkout & Idempotency
    // ------------------------------------------------------------------------
    const missingKeyRes = await fetch(`http://127.0.0.1:${port}/api/orders/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        branchId: 'daet',
        deliveryMethod: 'door_to_door',
        paymentMethod: 'cash_on_delivery',
        items: [{ skuId: 'hci-cmd-65ml', quantity: 2 }],
      }),
    });
    assert(missingKeyRes.status === 400, '1. Checkout request without idempotencyKey rejected with HTTP 400');

    const checkoutPayload = {
      idempotencyKey: 'key_test_checkout_001',
      branchId: 'daet',
      deliveryMethod: 'door_to_door',
      paymentMethod: 'cash_on_delivery',
      customer: {
        firstName: 'Alice',
        lastName: 'Santos',
        email: 'alice@example.com',
        shippingAddress: { barangay: 'Brgy. Gahonon', municipality: 'Daet', province: 'Camarines Norte' },
      },
      items: [{ skuId: 'hci-cmd-65ml', quantity: 2, clientPrice: 0 }],
    };

    const checkoutRes = await fetch(`http://127.0.0.1:${port}/api/orders/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
        'x-idempotency-key': 'key_test_checkout_001',
      },
      body: JSON.stringify(checkoutPayload),
    });

    const checkoutData: any = await checkoutRes.json();
    assert(checkoutRes.status === 200, '2. Authoritative server checkout POST /api/orders/checkout returns HTTP 200');
    assert(checkoutData.success === true && !!checkoutData.orderId, '3. Checkout returns valid deterministic order ID');

    const createdOrder = checkoutData.order;
    assert(createdOrder.userId === 'demo-customer-uid', '4. Order assigned to authenticated customer UID');
    assert(createdOrder.grandTotal === 2550, '5. Server authoritatively computes subtotal and shipping fee');

    // ------------------------------------------------------------------------
    // SECTION 2: Mandatory Spied Assertion 1, 2, 4, 5 — Concurrent Checkout Invocations & Deterministic Keys
    // ------------------------------------------------------------------------
    spyPaymentAdapter.createCount = 0;
    spyDeliveryAdapter.createCount = 0;
    const concurrentKey = 'key_spied_concurrent_777';
    const concurrentPayload = {
      ...checkoutPayload,
      idempotencyKey: concurrentKey,
      items: [{ skuId: 'hci-cmd-65ml', quantity: 1 }],
    };

    const [concRes1, concRes2] = await Promise.all([
      fetch(`http://127.0.0.1:${port}/api/orders/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
          'x-idempotency-key': concurrentKey,
        },
        body: JSON.stringify(concurrentPayload),
      }),
      fetch(`http://127.0.0.1:${port}/api/orders/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
          'x-idempotency-key': concurrentKey,
        },
        body: JSON.stringify(concurrentPayload),
      }),
    ]);

    const concData1: any = await concRes1.json();
    const concData2: any = await concRes2.json();

    assert(concRes1.status === 200 && concRes2.status === 200, '6. Concurrent duplicate requests both succeed with HTTP 200');
    assert(concData1.orderId === concData2.orderId, '7. Concurrent duplicate submissions produce exactly ONE order ID');

    // MANDATORY ASSERTION 1: Concurrent identical checkout requests invoke the payment adapter exactly once
    assert(spyPaymentAdapter.createCount === 1, '8. MANDATORY: Concurrent identical checkout requests invoke payment adapter exactly ONCE');

    // MANDATORY ASSERTION 4: Payment adapter receives deterministic idempotency key
    assert(
      spyPaymentAdapter.lastPaymentKey === `pay_chk_demo-customer-uid_${concData1.orderId}_${concurrentKey}`,
      '9. MANDATORY: Payment adapter receives deterministic idempotency key'
    );

    assert(spyDeliveryAdapter.createCount === 1, '9b. MANDATORY: Delivery adapter invoked exactly ONCE for concurrent checkout');
    assert(
      spyDeliveryAdapter.lastDeliveryKey === `del_chk_${concData1.orderId}`,
      '9c. MANDATORY: Delivery adapter receives del_chk_<orderId> idempotency key'
    );

    // ------------------------------------------------------------------------
    // SECTION 3: Mandatory Assertion 3 — Inventory Failure Pre-Condition
    // ------------------------------------------------------------------------
    spyPaymentAdapter.createCount = 0;
    const excessStockRes = await fetch(`http://127.0.0.1:${port}/api/orders/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
        'x-idempotency-key': 'key_excess_stock_fail',
      },
      body: JSON.stringify({
        ...checkoutPayload,
        idempotencyKey: 'key_excess_stock_fail',
        items: [{ skuId: 'hci-cmd-65ml', quantity: 9999 }],
      }),
    });

    assert(excessStockRes.status === 400, '10. Checkout requesting excess stock rejected with HTTP 400');
    // MANDATORY ASSERTION 3: Checkout inventory failure does not create external payment intent or fulfillment
    assert(spyPaymentAdapter.createCount === 0, '11. MANDATORY: Checkout inventory failure does NOT create external payment intent');

    // ------------------------------------------------------------------------
    // SECTION 4: Mandatory Assertion 6 — Production Server Auth Boundary
    // ------------------------------------------------------------------------
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const prodDemoAuthRes = await fetch(`http://127.0.0.1:${port}/api/orders/my-orders`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });

    assert(prodDemoAuthRes.status === 401, '12. MANDATORY: Production server boundary rejects DEMO_TOKEN_customer with HTTP 401');

    process.env.NODE_ENV = originalEnv;

    // ------------------------------------------------------------------------
    // SECTION 5: Mandatory Assertions 7, 8, 9 — Refund Provider Failure & Retry & Replay Safety
    // ------------------------------------------------------------------------
    // Create completed order for refund tests
    const orderRefundRes = await fetch(`http://127.0.0.1:${port}/api/orders/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
        'x-idempotency-key': 'key_ord_refund_test',
      },
      body: JSON.stringify({
        ...checkoutPayload,
        idempotencyKey: 'key_ord_refund_test',
      }),
    });
    const orderRefundData: any = await orderRefundRes.json();
    const rfndOrderId = orderRefundData.orderId;

    // Fulfill order
    await fetch(`http://127.0.0.1:${port}/api/orders/${rfndOrderId}/fulfill`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    store.orders.get(rfndOrderId).fulfillmentStatus = 'completed';

    // Mock Provider Failure
    const originalProcessRefund = spyPaymentAdapter.processRefund;
    spyPaymentAdapter.processRefund = async () => {
      throw new Error('Simulated Gateway Timeout');
    };

    const failedRefundRes = await fetch(`http://127.0.0.1:${port}/api/orders/${rfndOrderId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
        'x-idempotency-key': 'rfnd_key_provider_fail_101',
      },
      body: JSON.stringify({ amount: 1000, reason: 'Defective item' }),
    });

    assert(failedRefundRes.status === 500, '13. Refund request returns HTTP 500 when provider throws error');

    // MANDATORY ASSERTION 7: Refund provider failure does not leave order permanently marked refunded
    const failOrderDoc = store.orders.get(rfndOrderId);
    assert(
      failOrderDoc.paymentStatus !== 'refunded' && failOrderDoc.paymentStatus !== 'partially_refunded',
      '14. MANDATORY: Refund provider failure does NOT leave order permanently marked refunded'
    );

    // Restore Provider Success
    spyPaymentAdapter.processRefund = originalProcessRefund;

    // MANDATORY ASSERTION 8: Retrying same refund idempotency key after provider failure retries safely
    const retryRefundRes = await fetch(`http://127.0.0.1:${port}/api/orders/${rfndOrderId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
        'x-idempotency-key': 'rfnd_key_provider_fail_101',
      },
      body: JSON.stringify({ amount: 1000, reason: 'Defective item' }),
    });
    const retryRefundData: any = await retryRefundRes.json();
    assert(retryRefundRes.status === 200, '15. MANDATORY: Retrying same refund key after provider failure succeeds with HTTP 200');
    assert(retryRefundData.order.paymentStatus === 'partially_refunded', '16. Refund order status updated to partially_refunded after retry');

    // MANDATORY ASSERTION 9: Successful refund replay does not call provider twice
    spyPaymentAdapter.refundCount = 0;
    const replayRefundRes = await fetch(`http://127.0.0.1:${port}/api/orders/${rfndOrderId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
        'x-idempotency-key': 'rfnd_key_provider_fail_101',
      },
      body: JSON.stringify({ amount: 1000, reason: 'Defective item' }),
    });
    const replayRefundData: any = await replayRefundRes.json();
    assert(replayRefundRes.status === 200, '17. Refund replay returns HTTP 200 OK');
    assert(replayRefundData.idempotentReplay === true, '18. Replay indicates idempotentReplay === true');
    assert(spyPaymentAdapter.refundCount === 0, '19. MANDATORY: Successful refund replay does NOT call provider twice');

    // ------------------------------------------------------------------------
    // SECTION 6: Mandatory Assertion 10 — Concurrent Different Refund Keys
    // ------------------------------------------------------------------------
    // Remaining balance is 2550 - 1000 = 1550
    const [concRfnd1, concRfnd2] = await Promise.all([
      fetch(`http://127.0.0.1:${port}/api/orders/${rfndOrderId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${managerToken}`,
          'x-idempotency-key': 'rfnd_conc_key_A',
        },
        body: JSON.stringify({ amount: 1200, reason: 'Comp A' }),
      }),
      fetch(`http://127.0.0.1:${port}/api/orders/${rfndOrderId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${managerToken}`,
          'x-idempotency-key': 'rfnd_conc_key_B',
        },
        body: JSON.stringify({ amount: 1200, reason: 'Comp B' }),
      }),
    ]);

    const statuses = [concRfnd1.status, concRfnd2.status];
    assert(statuses.includes(200) && statuses.includes(400), '20. Concurrent different refunds: One succeeds (200), one rejected (400)');

    const endOrderDoc = store.orders.get(rfndOrderId);
    assert(endOrderDoc.refundedAmount <= 2550, '21. MANDATORY: Two concurrent different refund keys cannot refund more than remaining balance');

    // ------------------------------------------------------------------------
    // SECTION 6B: Partial Refund & Second Full Refund Rejection
    // ------------------------------------------------------------------------
    // Refund remaining balance on rfndOrderId (2550 - 1000 - 1200 = 350)
    const remainingRefundRes = await fetch(`http://127.0.0.1:${port}/api/orders/${rfndOrderId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
        'x-idempotency-key': 'rfnd_key_remaining_350',
      },
      body: JSON.stringify({ amount: 350, reason: 'Final remaining balance refund' }),
    });
    assert(remainingRefundRes.status === 200, '21a. Remaining balance refund succeeds with HTTP 200');

    // Attempt second refund when fully refunded
    const overRefundRes = await fetch(`http://127.0.0.1:${port}/api/orders/${rfndOrderId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
        'x-idempotency-key': 'rfnd_key_over_refund',
      },
      body: JSON.stringify({ amount: 100, reason: 'Extra refund on fully refunded order' }),
    });
    assert(overRefundRes.status === 400, '21b. Refund on fully refunded order is rejected with HTTP 400');

    // ------------------------------------------------------------------------
    // SECTION 7: Mandatory Assertions 11 & 12 — Cancellation & Return Refund Failure Recovery
    // ------------------------------------------------------------------------
    // Create new order for cancellation test
    const cancelOrderRes = await fetch(`http://127.0.0.1:${port}/api/orders/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
        'x-idempotency-key': 'key_cancel_fail_test',
      },
      body: JSON.stringify({
        ...checkoutPayload,
        idempotencyKey: 'key_cancel_fail_test',
      }),
    });
    const cancelOrderData: any = await cancelOrderRes.json();
    const cId = cancelOrderData.orderId;

    // Fail provider on cancellation refund
    spyPaymentAdapter.processRefund = async () => {
      throw new Error('Cancellation Refund Failure');
    };

    await fetch(`http://127.0.0.1:${port}/api/orders/${cId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ reason: 'Cancel with provider failure' }),
    });

    const cancelledDoc = store.orders.get(cId);
    assert(cancelledDoc.fulfillmentStatus === 'cancelled', '22. Order is marked cancelled even if refund provider failed');

    // Restore provider success and retry refund using cancel key
    spyPaymentAdapter.processRefund = originalProcessRefund;

    const retryCancelRefundRes = await fetch(`http://127.0.0.1:${port}/api/orders/${cId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
        'x-idempotency-key': `cancel:${cId}`,
      },
      body: JSON.stringify({ amount: cancelledDoc.grandTotal, reason: 'Retry cancellation refund' }),
    });

    assert(retryCancelRefundRes.status === 200, '23. MANDATORY: Cancellation refund failure remains recoverable via retry');

    // Return Approval Refund Failure Recovery Test
    const returnOrderRes = await fetch(`http://127.0.0.1:${port}/api/orders/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
        'x-idempotency-key': 'key_return_fail_test',
      },
      body: JSON.stringify({
        ...checkoutPayload,
        idempotencyKey: 'key_return_fail_test',
      }),
    });
    const returnOrderData: any = await returnOrderRes.json();
    const rId = returnOrderData.orderId;

    await fetch(`http://127.0.0.1:${port}/api/orders/${rId}/fulfill`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    store.orders.get(rId).fulfillmentStatus = 'completed';

    await fetch(`http://127.0.0.1:${port}/api/orders/${rId}/return-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ reason: 'Defective bottle' }),
    });

    // Fail provider on return approval refund
    spyPaymentAdapter.processRefund = async () => {
      throw new Error('Return Refund Failure');
    };

    await fetch(`http://127.0.0.1:${port}/api/orders/${rId}/return-process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({ decision: 'approve', restockInventory: true }),
    });

    const returnedDoc = store.orders.get(rId);
    assert(returnedDoc.fulfillmentStatus === 'returned', '24. Order is marked returned even if refund provider failed');

    // Restore provider success and retry refund using return key
    spyPaymentAdapter.processRefund = originalProcessRefund;

    const retryReturnRefundRes = await fetch(`http://127.0.0.1:${port}/api/orders/${rId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
        'x-idempotency-key': `return:${rId}`,
      },
      body: JSON.stringify({ amount: returnedDoc.grandTotal, reason: 'Retry return refund' }),
    });

    assert(retryReturnRefundRes.status === 200, '25. MANDATORY: Return-approval refund failure remains recoverable via retry');

    // ------------------------------------------------------------------------
    // SECTION 8: Partial Delivery Failure Compensating Action Test
    // ------------------------------------------------------------------------
    spyPaymentAdapter.refundCount = 0;
    spyDeliveryAdapter.createFulfillment = async () => {
      throw new Error('Simulated Delivery Provider Connection Failed');
    };

    const deliveryFailRes = await fetch(`http://127.0.0.1:${port}/api/orders/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
        'x-idempotency-key': 'key_del_fail_comp_test',
      },
      body: JSON.stringify({
        ...checkoutPayload,
        paymentMethod: 'credit_card',
        idempotencyKey: 'key_del_fail_comp_test',
      }),
    });

    assert(deliveryFailRes.status === 500, '26. Checkout returns 500 when delivery provider fails');
    assert(spyPaymentAdapter.refundCount === 1, '27. Compensating refund invoked when delivery provider fails after payment creation');

    // ------------------------------------------------------------------------
    // SECTION 9: Priority B — Failed Checkout Replay and Compensation Recovery Tests
    // ------------------------------------------------------------------------
    console.log('Running SECTION 9: Failed Checkout Replay & Compensation Recovery...');

    // Restore Standard Delivery Adapter behavior
    const normalDeliveryAdapter = new StandardDeliveryAdapter();
    spyDeliveryAdapter.createFulfillment = normalDeliveryAdapter.createFulfillment;

    const normalPaymentAdapterCreate = new SimulatedPaymentAdapter('simulated_cod').createPaymentIntent;

    // Test A: Failed checkout replay (Phase B transient failure)
    let throwTransient = true;
    spyPaymentAdapter.createPaymentIntent = async (orderId, amount, paymentMethod, metadata, idempotencyKey) => {
      if (throwTransient) {
        throwTransient = false;
        throw new Error('Transient Payment Gateway Timeout');
      }
      return normalPaymentAdapterCreate(orderId, amount, paymentMethod, metadata, idempotencyKey);
    };

    spyPaymentAdapter.createCount = 0;
    spyDeliveryAdapter.createCount = 0;

    const replayKey = 'key_transient_failure_999';
    const replayPayload = {
      ...checkoutPayload,
      paymentMethod: 'credit_card',
      idempotencyKey: replayKey,
    };

    // First attempt fails due to transient payment gateway timeout
    const firstAttemptRes = await fetch(`http://127.0.0.1:${port}/api/orders/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
        'x-idempotency-key': replayKey,
      },
      body: JSON.stringify(replayPayload),
    });

    assert(firstAttemptRes.status === 500, '28. First attempt with transient failure returns HTTP 500');

    // Retrieve order document state
    const failedOrderId = `HCI-ORD-${crypto.createHash('sha256').update(`demo-customer-uid_${replayKey}`).digest('hex').substring(0, 8).toUpperCase()}`;
    const orderAfterFail = store.orders.get(failedOrderId);
    assert(orderAfterFail !== undefined, '29. Order document exists for failed checkout attempt');
    assert(orderAfterFail.checkoutStatus === 'failed', '30. Order is marked failed initially');

    // Clear counters and retry same key
    spyPaymentAdapter.createCount = 0;
    spyDeliveryAdapter.createCount = 0;
    const initialReservedStock = store.branch_batch_inventory.get('daet_BAT-DAET-CMD65-01').reservedQuantity;

    const retryAttemptRes = await fetch(`http://127.0.0.1:${port}/api/orders/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
        'x-idempotency-key': replayKey,
      },
      body: JSON.stringify(replayPayload),
    });

    const retryData = await retryAttemptRes.json();
    assert(retryAttemptRes.status === 200, '31. Retry same key K succeeds with HTTP 200 after transient payment gateway timeout resolved');
    assert(retryData.orderId === failedOrderId, '32. Retried checkout uses the exact same order ID');

    const finalReservedStock = store.branch_batch_inventory.get('daet_BAT-DAET-CMD65-01').reservedQuantity;
    assert(finalReservedStock === initialReservedStock, '33. Retry does NOT run FEFO reservation again or double-reserve inventory');


    // Test B & C: Failed compensation recovery and Successful replay
    // Simulate: payment creation succeeds, delivery creation fails, payment compensation refund fails
    spyPaymentAdapter.createPaymentIntent = normalPaymentAdapterCreate;
    spyDeliveryAdapter.createFulfillment = async () => {
      throw new Error('Fulfillment API Server Offline');
    };
    spyPaymentAdapter.processRefund = async () => {
      throw new Error('Compensation Refund Gateway Blocked');
    };

    const compRecoveryKey = 'key_comp_recovery_888';
    const compPayload = {
      ...checkoutPayload,
      paymentMethod: 'credit_card',
      idempotencyKey: compRecoveryKey,
    };

    const compFirstAttemptRes = await fetch(`http://127.0.0.1:${port}/api/orders/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
        'x-idempotency-key': compRecoveryKey,
      },
      body: JSON.stringify(compPayload),
    });

    assert(compFirstAttemptRes.status === 500, '34. Compensation failure checkout returns HTTP 500');

    const compOrderId = `HCI-ORD-${crypto.createHash('sha256').update(`demo-customer-uid_${compRecoveryKey}`).digest('hex').substring(0, 8).toUpperCase()}`;
    const compDoc = store.payment_compensations.get(compOrderId);
    const compOrderDoc = store.orders.get(compOrderId);

    assert(compDoc !== undefined, '35. Payment compensation intent document is persisted in database');
    assert(compDoc.status === 'failed', '36. Payment compensation intent is marked failed');
    assert(compOrderDoc.compensationStatus === 'failed', '37. Order document correctly records failed compensation state');

    // Restore provider success and retry the same checkout key K
    spyDeliveryAdapter.createFulfillment = normalDeliveryAdapter.createFulfillment;
    spyPaymentAdapter.processRefund = originalProcessRefund;
    spyPaymentAdapter.refundCount = 0;

    const compRetryAttemptRes = await fetch(`http://127.0.0.1:${port}/api/orders/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
        'x-idempotency-key': compRecoveryKey,
      },
      body: JSON.stringify(compPayload),
    });

    const compRetryData = await compRetryAttemptRes.json();
    assert(compRetryAttemptRes.status === 200, '38. Retrying checkout with failed compensation succeeds with HTTP 200');
    assert(compRetryData.compensationReconciled === true, '39. Response confirms that compensation was successfully reconciled');

    const reconciledCompDoc = store.payment_compensations.get(compOrderId);
    assert(reconciledCompDoc.status === 'completed', '40. Persistent compensation intent document is now updated to completed');

    const reconciledOrderDoc = store.orders.get(compOrderId);
    assert(reconciledOrderDoc.compensationStatus === 'completed', '41. Order document status is updated to completed');
    assert(reconciledOrderDoc.paymentStatus === 'refunded', '42. Payment status has transitioned to refunded');

    // Test C: Successful compensation replay
    // Retry the same checkout key K again
    spyPaymentAdapter.createCount = 0;
    spyPaymentAdapter.refundCount = 0;

    const compReplayAttemptRes = await fetch(`http://127.0.0.1:${port}/api/orders/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
        'x-idempotency-key': compRecoveryKey,
      },
      body: JSON.stringify(compPayload),
    });

    const compReplayData = await compReplayAttemptRes.json();
    assert(compReplayAttemptRes.status === 200, '43. Successful compensation replay returns HTTP 200');
    assert(spyPaymentAdapter.createCount === 0, '44. Replay does NOT perform additional payment creation');
    assert(spyPaymentAdapter.refundCount === 0, '45. Replay does NOT perform additional compensation refund');
    assert(compReplayData.orderId === compOrderId, '46. Replay returns the same deterministic order ID');

  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  console.log('========================================================================');
  console.log(`Priority B Safety Remediation Results: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('========================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unhandled error in Priority B test runner:', err);
  process.exit(1);
});
