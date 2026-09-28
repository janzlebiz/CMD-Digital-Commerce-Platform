/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createExpressApp } from '../server.ts';
import http from 'http';

console.log('========================================================================');
console.log('Running Priority B — Authoritative Commerce & Order Lifecycle Suite');
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

// In-memory mock Firestore DB for testing commerce endpoints in isolation
function createCommerceMockDb() {
  const store: Record<string, Map<string, any>> = {
    orders: new Map(),
    inventory: new Map(),
    product_batches: new Map(),
    branch_batch_inventory: new Map(),
    idempotency_keys: new Map(),
    audit_logs: new Map(),
  };

  // Seed product batches, branch_batch_inventory, and aggregate inventory
  const daetBatch = {
    id: 'BAT-DAET-CMD65-01',
    batchId: 'BAT-DAET-CMD65-01',
    branchId: 'daet',
    skuId: 'hci-cmd-65ml',
    activeStock: 100,
    qualityControlStatus: 'passed',
    expiryDate: '2028-12-31',
    createdAt: new Date().toISOString()
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
    createdAt: new Date().toISOString()
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
    updatedAt: new Date().toISOString()
  };
  store.inventory.set('daet_hci-cmd-65ml', daetAgg);

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
            set: async (data: any) => {
              colMap.set(docId, data);
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
                      ref: mockDb.collection(colName).doc(item.id || item.batchId)
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
                    ref: mockDb.collection(colName).doc(item.id || item.batchId)
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
      const transaction = {
        get: async (ref: any) => {
          const snap = await ref.get();
          return {
            ...snap,
            ref: snap.ref || ref,
          };
        },
        set: (ref: any, data: any) => {
          if (ref && ref.ref && typeof ref.ref.set === 'function') {
            return ref.ref.set(data);
          }
          if (ref && typeof ref.set === 'function') {
            return ref.set(data);
          }
        },
        update: (ref: any, data: any) => {
          if (ref && ref.ref && typeof ref.ref.update === 'function') {
            return ref.ref.update(data);
          }
          if (ref && typeof ref.update === 'function') {
            return ref.update(data);
          }
        },
      };
      return await updateFunction(transaction);
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

  try {
    // 1. Missing idempotencyKey is rejected with HTTP 400 Bad Request
    const missingKeyRes = await fetch(`http://127.0.0.1:${port}/api/orders/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        branchId: 'daet',
        deliveryMethod: 'door_to_door',
        paymentMethod: 'cash_on_delivery',
        items: [{ skuId: 'hci-cmd-65ml', quantity: 2 }]
      })
    });
    assert(missingKeyRes.status === 400, '1. Checkout request without idempotencyKey rejected with HTTP 400 Bad Request');

    // 2. Customer Checkout with valid idempotencyKey uses /api/orders/checkout server endpoint
    const checkoutPayload = {
      idempotencyKey: 'key_test_checkout_001',
      branchId: 'daet',
      deliveryMethod: 'door_to_door',
      paymentMethod: 'cash_on_delivery',
      customer: {
        firstName: 'Alice',
        lastName: 'Santos',
        email: 'alice@example.com',
        mobileNumber: '+639171112222',
        shippingAddress: { barangay: 'Brgy. Gahonon', municipality: 'Daet', province: 'Camarines Norte' }
      },
      items: [
        { skuId: 'hci-cmd-65ml', quantity: 2, clientPrice: 0 } // Manipulated client price
      ]
    };

    const checkoutRes = await fetch(`http://127.0.0.1:${port}/api/orders/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
        'x-idempotency-key': 'key_test_checkout_001'
      },
      body: JSON.stringify(checkoutPayload)
    });

    const checkoutData: any = await checkoutRes.json();
    assert(checkoutRes.status === 200, '2. Authoritative server checkout POST /api/orders/checkout returns HTTP 200 OK');
    assert(checkoutData.success === true && !!checkoutData.orderId, '3. Checkout response returns valid server order ID');

    const createdOrder = checkoutData.order;
    assert(createdOrder.userId === 'demo-customer-uid', '4. Order correctly assigned to authenticated customer UID');

    // 3. Server remains authoritative for price & totals
    assert(createdOrder.subtotal === 2400, '5. Server authoritatively computes subtotal from PRODUCTS_CATALOG (PHP 2,400) ignoring manipulated client price');
    assert(createdOrder.shippingFee === 150, '6. Delivery abstraction calculates door-to-door shipping fee (PHP 150)');
    assert(createdOrder.grandTotal === 2550, '7. Server authoritatively calculates grand total (PHP 2,550)');

    // 4. Payment & Delivery Abstractions
    assert(!!createdOrder.paymentIntent, '8. Order includes server-generated PaymentIntent structure');
    assert(createdOrder.paymentIntent.status === 'pending_payment', '9. COD PaymentIntent has pending_payment status');
    assert(createdOrder.paymentIntent.amount === 2550, '10. PaymentIntent amount matches grand total');
    assert(!!createdOrder.fulfillment, '11. Order includes server-generated DeliveryFulfillment structure');
    assert(createdOrder.fulfillment.deliveryMethod === 'door_to_door', '12. Fulfillment records correct delivery method');
    assert(createdOrder.fulfillment.trackingNumber.startsWith('TRK-'), '13. Fulfillment generates valid tracking reference');

    // 5. Idempotent Retry Verification (Identical retry returns same order)
    const retryCheckoutRes = await fetch(`http://127.0.0.1:${port}/api/orders/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
        'x-idempotency-key': 'key_test_checkout_001'
      },
      body: JSON.stringify(checkoutPayload)
    });
    const retryData: any = await retryCheckoutRes.json();
    assert(retryCheckoutRes.status === 200, '14. Idempotent retry returns HTTP 200 OK');
    assert(retryData.orderId === checkoutData.orderId, '15. Idempotent retry returns identical server order ID');
    assert(retryData.idempotentReplay === true, '16. Server indicates idempotent replay response');

    // 6. Concurrent Duplicate Checkout Protection
    const concurrentKey = 'key_test_checkout_concurrent_999';
    const concurrentPayload = {
      ...checkoutPayload,
      idempotencyKey: concurrentKey,
      items: [{ skuId: 'hci-cmd-65ml', quantity: 3 }]
    };

    const availBeforeConcurrent = store.branch_batch_inventory.get('daet_BAT-DAET-CMD65-01').availableQuantity;

    const [concRes1, concRes2] = await Promise.all([
      fetch(`http://127.0.0.1:${port}/api/orders/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
          'x-idempotency-key': concurrentKey
        },
        body: JSON.stringify(concurrentPayload)
      }),
      fetch(`http://127.0.0.1:${port}/api/orders/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
          'x-idempotency-key': concurrentKey
        },
        body: JSON.stringify(concurrentPayload)
      })
    ]);

    const concData1: any = await concRes1.json();
    const concData2: any = await concRes2.json();

    assert(concRes1.status === 200 && concRes2.status === 200, '17. Concurrent duplicate requests both succeed with HTTP 200 OK');
    assert(concData1.orderId === concData2.orderId, '18. Concurrent duplicate submissions produce exactly ONE order ID');

    // Zero duplicate order creation
    const matchingKeyOrders = Array.from(store.orders.values()).filter((o) => o.idempotencyKey === concurrentKey);
    assert(matchingKeyOrders.length === 1, '19. Exactly ONE order document exists in database for concurrent key (zero duplicate order creation)');

    // Zero duplicate inventory reservation
    const availAfterConcurrent = store.branch_batch_inventory.get('daet_BAT-DAET-CMD65-01').availableQuantity;
    assert(availBeforeConcurrent - availAfterConcurrent === 3, '20. Inventory reserved exactly ONCE (3 units) across concurrent duplicate checkouts (zero duplicate reservation)');

    // 7. Digital Wallet Checkout
    const walletCheckoutRes = await fetch(`http://127.0.0.1:${port}/api/orders/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
        'x-idempotency-key': 'key_test_wallet_101'
      },
      body: JSON.stringify({
        ...checkoutPayload,
        idempotencyKey: 'key_test_wallet_101',
        paymentMethod: 'gcash',
        deliveryMethod: 'branch_pickup'
      })
    });
    const walletData: any = await walletCheckoutRes.json();
    assert(walletCheckoutRes.status === 200, '21. GCash checkout creates order via payment abstraction');
    assert(walletData.order.paymentIntent.status === 'paid', '22. Simulated GCash payment adapter sets intent status to paid');
    assert(walletData.order.shippingFee === 0, '23. Branch pickup delivery quote returns PHP 0 shipping fee');

    const orderId = createdOrder.id;

    // 8. IDOR Protection on Order Retrieval
    const unauthorizedGetRes = await fetch(`http://127.0.0.1:${port}/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${customerBobToken}` }
    });
    assert(unauthorizedGetRes.status === 403, '24. Unauthorized customer Bob blocked from reading Alice\'s order (HTTP 403)');

    const authorizedGetRes = await fetch(`http://127.0.0.1:${port}/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert(authorizedGetRes.status === 200, '25. Customer Alice can retrieve her own order (HTTP 200)');

    // 9. Invalid Order Cancellation by Unauthorized Customer Bob
    const unauthorizedCancelRes = await fetch(`http://127.0.0.1:${port}/api/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerBobToken}`
      },
      body: JSON.stringify({ reason: 'Malicious cancellation' })
    });
    assert(unauthorizedCancelRes.status === 403, '26. Unauthorized customer Bob blocked from cancelling Alice\'s order (HTTP 403)');

    // 10. Invalid Return Request on Uncompleted Order
    const invalidReturnRes = await fetch(`http://127.0.0.1:${port}/api/orders/${orderId}/return-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({ reason: 'Damaged item' })
    });
    const invalidReturnData: any = await invalidReturnRes.json();
    assert(invalidReturnRes.status === 400, '27. Return request rejected on uncompleted pending order with HTTP 400');
    assert(invalidReturnData.error.includes('INVALID_ORDER_STATE_TRANSITION'), '28. Return error explicitly cites INVALID_ORDER_STATE_TRANSITION');

    // 11. Cancellation Inventory Restoration Invariant Verification
    const branchBatchBeforeCancel = { ...store.branch_batch_inventory.get('daet_BAT-DAET-CMD65-01') };

    const validCancelRes = await fetch(`http://127.0.0.1:${port}/api/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({ reason: 'Changed my mind' })
    });
    const cancelData: any = await validCancelRes.json();
    assert(validCancelRes.status === 200, '29. Authorized customer Alice cancels pending order (HTTP 200)');
    assert(cancelData.order.fulfillmentStatus === 'cancelled', '30. Order fulfillment status transitions to cancelled');
    assert(cancelData.order.paymentStatus === 'refunded', '31. Payment status transitions to refunded');

    const branchBatchAfterCancel = store.branch_batch_inventory.get('daet_BAT-DAET-CMD65-01');
    const aggAfterCancel = store.inventory.get('daet_hci-cmd-65ml');

    assert(branchBatchAfterCancel.availableQuantity === branchBatchBeforeCancel.availableQuantity + 2, '32. Cancellation restores exact available quantity (+2 units) on branch_batch_inventory');
    assert(branchBatchAfterCancel.reservedQuantity === branchBatchBeforeCancel.reservedQuantity - 2, '33. Cancellation releases exact reserved quantity (-2 units) on branch_batch_inventory');
    assert(aggAfterCancel.activeStock === branchBatchAfterCancel.availableQuantity && aggAfterCancel.reservedStock === branchBatchAfterCancel.reservedQuantity, '34. Aggregate activeStock and reservedStock match branch_batch_inventory sums after cancellation');

    // 12. Repeated Cancellation Protection (Cannot restore inventory twice)
    const doubleCancelRes = await fetch(`http://127.0.0.1:${port}/api/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({ reason: 'Cancel again' })
    });
    assert(doubleCancelRes.status === 400, '35. Cancelling an already cancelled order rejected with HTTP 400 INVALID_ORDER_STATE_TRANSITION');

    const branchBatchAfterDoubleCancel = store.branch_batch_inventory.get('daet_BAT-DAET-CMD65-01');
    assert(branchBatchAfterDoubleCancel.availableQuantity === branchBatchAfterCancel.availableQuantity, '36. Repeated cancellation does NOT restore inventory twice (availableQuantity unchanged)');
    assert(branchBatchAfterDoubleCancel.reservedQuantity === branchBatchAfterCancel.reservedQuantity, '37. Repeated cancellation does NOT alter reserved quantity');

    // 13. Complete Return Lifecycle & Inventory Restoration Verification
    const order2Res = await fetch(`http://127.0.0.1:${port}/api/orders/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
        'x-idempotency-key': 'key_test_order2_202'
      },
      body: JSON.stringify({
        ...checkoutPayload,
        idempotencyKey: 'key_test_order2_202'
      })
    });
    const order2Data: any = await order2Res.json();
    const order2Id = order2Data.orderId;

    // Fulfill order2 via staff endpoint
    const fulfillRes = await fetch(`http://127.0.0.1:${port}/api/orders/${order2Id}/fulfill`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    assert(fulfillRes.status === 200, '38. Branch manager fulfills order2 (HTTP 200)');

    // Set order status to completed for return testing
    store.orders.get(order2Id).fulfillmentStatus = 'completed';

    // Customer submits return request
    const returnReqRes = await fetch(`http://127.0.0.1:${port}/api/orders/${order2Id}/return-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({ reason: 'Bottle seal broken during transport' })
    });
    const returnReqData: any = await returnReqRes.json();
    assert(returnReqRes.status === 200, '39. Customer submits return request for completed order (HTTP 200)');
    assert(returnReqData.order.fulfillmentStatus === 'return_requested', '40. Order status transitions to return_requested');

    // Unauthorized customer Bob attempts to process return
    const unauthReturnProcess = await fetch(`http://127.0.0.1:${port}/api/orders/${order2Id}/return-process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerBobToken}`
      },
      body: JSON.stringify({ decision: 'approve' })
    });
    assert(unauthReturnProcess.status === 403, '41. Customer Bob blocked from processing return approval (HTTP 403)');

    // Approved Return Inventory Restoration
    const branchBatchBeforeReturn = { ...store.branch_batch_inventory.get('daet_BAT-DAET-CMD65-01') };

    const approveReturnRes = await fetch(`http://127.0.0.1:${port}/api/orders/${order2Id}/return-process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`
      },
      body: JSON.stringify({ decision: 'approve', restockInventory: true, notes: 'Inspected and restocked' })
    });
    const approveReturnData: any = await approveReturnRes.json();
    assert(approveReturnRes.status === 200, '42. Branch manager approves return request (HTTP 200)');
    assert(approveReturnData.order.fulfillmentStatus === 'returned', '43. Order status transitions to returned');
    assert(approveReturnData.order.paymentStatus === 'refunded', '44. Payment status transitions to refunded upon return approval');

    const branchBatchAfterReturn = store.branch_batch_inventory.get('daet_BAT-DAET-CMD65-01');
    const aggAfterReturn = store.inventory.get('daet_hci-cmd-65ml');

    assert(branchBatchAfterReturn.availableQuantity === branchBatchBeforeReturn.availableQuantity + 2, '45. Approved return restores exact stock (+2 units) to branch_batch_inventory');
    assert(aggAfterReturn.activeStock === branchBatchAfterReturn.availableQuantity && aggAfterReturn.reservedStock === branchBatchAfterReturn.reservedQuantity, '46. Aggregate activeStock and reservedStock match branch_batch_inventory sums after return restoration');

    // 14. Repeated Return Processing Protection (Cannot restore inventory twice)
    const doubleReturnRes = await fetch(`http://127.0.0.1:${port}/api/orders/${order2Id}/return-process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`
      },
      body: JSON.stringify({ decision: 'approve', restockInventory: true, notes: 'Approve again' })
    });
    assert(doubleReturnRes.status === 400, '47. Processing return again on returned order rejected with HTTP 400 INVALID_ORDER_STATE_TRANSITION');

    const branchBatchAfterDoubleReturn = store.branch_batch_inventory.get('daet_BAT-DAET-CMD65-01');
    assert(branchBatchAfterDoubleReturn.availableQuantity === branchBatchAfterReturn.availableQuantity, '48. Repeated return processing does NOT restore inventory twice');

  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  console.log('========================================================================');
  console.log(`Priority B Test Results: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('========================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unhandled error in Priority B test runner:', err);
  process.exit(1);
});
