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
    audit_logs: new Map(),
  };

  // Seed branch batch inventory and product batches
  const daetBatch = {
    id: 'BAT-DAET-CMD65-01',
    batchId: 'BAT-DAET-CMD65-01',
    branchId: 'daet',
    skuId: 'hci-cmd-65ml',
    activeStock: 100,
    expiryDate: '2028-12-31',
    createdAt: new Date().toISOString()
  };
  store.product_batches.set('BAT-DAET-CMD65-01', daetBatch);

  const daetAgg = {
    id: 'daet_hci-cmd-65ml',
    branchId: 'daet',
    skuId: 'hci-cmd-65ml',
    activeStock: 100,
    reservedStock: 0,
    branchBatches: [daetBatch],
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
                    results.push({ data: () => item });
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
                  results.push({ data: () => item });
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
  const adminToken = 'DEMO_TOKEN_super_admin';

  try {
    // 1. Customer Checkout uses /api/orders/checkout server endpoint
    const checkoutPayload = {
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
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify(checkoutPayload)
    });

    const checkoutData: any = await checkoutRes.json();
    assert(checkoutRes.status === 200, '1. Authoritative server checkout POST /api/orders/checkout returns HTTP 200 OK');
    assert(checkoutData.success === true && !!checkoutData.orderId, '2. Checkout response returns valid server order ID');

    const createdOrder = checkoutData.order;
    assert(createdOrder.userId === 'demo-customer-uid', '3. Order correctly assigned to authenticated customer UID');
    
    // 2. Server remains authoritative for price & totals
    // Catalog price for 65ml bottle is PHP 1,200. Quantity 2 = PHP 2,400. Door-to-door shipping = PHP 150. Total = PHP 2,550.
    assert(createdOrder.subtotal === 2400, '4. Server authoritatively computes subtotal from PRODUCTS_CATALOG (PHP 2,400) ignoring manipulated client price');
    assert(createdOrder.shippingFee === 150, '5. Delivery abstraction calculates door-to-door shipping fee (PHP 150)');
    assert(createdOrder.grandTotal === 2550, '6. Server authoritatively calculates grand total (PHP 2,550)');

    // 3. Payment Abstraction Verification
    assert(!!createdOrder.paymentIntent, '7. Order includes server-generated PaymentIntent structure');
    assert(createdOrder.paymentIntent.status === 'pending_payment', '8. COD PaymentIntent has pending_payment status');
    assert(createdOrder.paymentIntent.amount === 2550, '9. PaymentIntent amount matches grand total');

    // 4. Delivery Abstraction Verification
    assert(!!createdOrder.fulfillment, '10. Order includes server-generated DeliveryFulfillment structure');
    assert(createdOrder.fulfillment.deliveryMethod === 'door_to_door', '11. Fulfillment records correct delivery method');
    assert(createdOrder.fulfillment.trackingNumber.startsWith('TRK-'), '12. Fulfillment generates valid tracking reference');

    // 5. Digital Wallet Checkout Payment Abstraction
    const walletCheckoutRes = await fetch(`http://127.0.0.1:${port}/api/orders/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        ...checkoutPayload,
        paymentMethod: 'gcash',
        deliveryMethod: 'branch_pickup'
      })
    });
    const walletData: any = await walletCheckoutRes.json();
    assert(walletCheckoutRes.status === 200, '13. GCash checkout creates order via payment abstraction');
    assert(walletData.order.paymentIntent.status === 'paid', '14. Simulated GCash payment adapter sets intent status to paid');
    assert(walletData.order.shippingFee === 0, '15. Branch pickup delivery quote returns PHP 0 shipping fee');

    const orderId = createdOrder.id;

    // 6. IDOR Protection on Order Retrieval
    const unauthorizedGetRes = await fetch(`http://127.0.0.1:${port}/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${customerBobToken}` }
    });
    assert(unauthorizedGetRes.status === 403, '16. Unauthorized customer Bob blocked from reading Alice\'s order (HTTP 403)');

    const authorizedGetRes = await fetch(`http://127.0.0.1:${port}/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert(authorizedGetRes.status === 200, '17. Customer Alice can retrieve her own order (HTTP 200)');

    // 7. Invalid Order Cancellation (Unauthorized Customer Bob attempting cancellation)
    const unauthorizedCancelRes = await fetch(`http://127.0.0.1:${port}/api/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerBobToken}`
      },
      body: JSON.stringify({ reason: 'Malicious cancellation' })
    });
    assert(unauthorizedCancelRes.status === 403, '18. Unauthorized customer Bob blocked from cancelling Alice\'s order (HTTP 403)');

    // 8. Invalid Return Request on Uncompleted Order (HTTP 400 Invalid Transition)
    const invalidReturnRes = await fetch(`http://127.0.0.1:${port}/api/orders/${orderId}/return-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({ reason: 'Damaged item' })
    });
    const invalidReturnData: any = await invalidReturnRes.json();
    assert(invalidReturnRes.status === 400, '19. Return request rejected on uncompleted pending order with HTTP 400');
    assert(invalidReturnData.error.includes('INVALID_ORDER_STATE_TRANSITION'), '20. Return error explicitly cites INVALID_ORDER_STATE_TRANSITION');

    // 9. Valid Order Cancellation Lifecycle Transition & FEFO Inventory Restock
    const validCancelRes = await fetch(`http://127.0.0.1:${port}/api/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({ reason: 'Changed my mind' })
    });
    const cancelData: any = await validCancelRes.json();
    assert(validCancelRes.status === 200, '21. Authorized customer Alice cancels pending order (HTTP 200)');
    assert(cancelData.order.fulfillmentStatus === 'cancelled', '22. Order fulfillment status transitions to cancelled');
    assert(cancelData.order.paymentStatus === 'refunded', '23. Payment status transitions to refunded');

    // 10. Invalid Cancellation Attempt on Already Cancelled Order
    const doubleCancelRes = await fetch(`http://127.0.0.1:${port}/api/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({ reason: 'Cancel again' })
    });
    assert(doubleCancelRes.status === 400, '24. Cancelling an already cancelled order rejected with HTTP 400 INVALID_ORDER_STATE_TRANSITION');

    // 11. Complete Return Lifecycle: Fulfill -> Return Request -> Return Process
    // First create a new order and mark it completed/fulfilled
    const order2Res = await fetch(`http://127.0.0.1:${port}/api/orders/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify(checkoutPayload)
    });
    const order2Data: any = await order2Res.json();
    const order2Id = order2Data.orderId;

    // Fulfill order2 via staff endpoint
    const fulfillRes = await fetch(`http://127.0.0.1:${port}/api/orders/${order2Id}/fulfill`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    assert(fulfillRes.status === 200, '25. Branch manager fulfills order2 (HTTP 200)');

    // Manually mark fulfillmentStatus to 'completed' for return testing
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
    assert(returnReqRes.status === 200, '26. Customer submits return request for completed order (HTTP 200)');
    assert(returnReqData.order.fulfillmentStatus === 'return_requested', '27. Order status transitions to return_requested');

    // Unauthorized customer Bob attempts to process return
    const unauthReturnProcess = await fetch(`http://127.0.0.1:${port}/api/orders/${order2Id}/return-process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerBobToken}`
      },
      body: JSON.stringify({ decision: 'approve' })
    });
    assert(unauthReturnProcess.status === 403, '28. Customer Bob blocked from processing return approval (HTTP 403)');

    // Authorized Branch Manager approves return and issues refund
    const approveReturnRes = await fetch(`http://127.0.0.1:${port}/api/orders/${order2Id}/return-process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`
      },
      body: JSON.stringify({ decision: 'approve', restockInventory: true, notes: 'Inspected and restocked' })
    });
    const approveReturnData: any = await approveReturnRes.json();
    assert(approveReturnRes.status === 200, '29. Branch manager approves return request (HTTP 200)');
    assert(approveReturnData.order.fulfillmentStatus === 'returned', '30. Order status transitions to returned');
    assert(approveReturnData.order.paymentStatus === 'refunded', '31. Payment status transitions to refunded upon return approval');

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
