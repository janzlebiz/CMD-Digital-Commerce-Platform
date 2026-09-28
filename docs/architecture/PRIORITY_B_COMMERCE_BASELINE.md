# Priority B — Authoritative Commerce & Order Lifecycle Baseline

## 1. Overview & Purpose

This document defines the authoritative e-commerce, checkout architecture, provider abstraction layers (payment and delivery), and order lifecycle operations (cancellation, returns, and refunds) for the **HCI CMD Digital Commerce Platform** established under Priority B.

---

## 2. Authoritative Server-Side Checkout Flow & Safe Two-Phase Architecture

To eliminate local client-state order creation risks and enforce strict price and inventory integrity, customer order placement is consolidated on the authoritative server endpoint:

`POST /api/orders/checkout`

### Safe Two-Phase Checkout Model
1. **Phase A — Firestore Transaction**:
   - Customer-scoped idempotency key (`idempotency_keys/${user.uid}_${idempotencyKey}`) checked.
   - Deterministic order ID generated from `user.uid + '_' + idempotencyKey` (`HCI-ORD-${sha256(user.uid_idempotencyKey).substring(0,8)}`).
   - Server-side catalog pricing strictly validated (`PRODUCTS_CATALOG`).
   - FEFO inventory reserved on `branch_batch_inventory` and aggregate `/inventory/{branchId_skuId}` updated.
   - Order document created in `pending_provider` state.
   - Idempotency record stored with deterministic order ID.
   - **NO** external payment or delivery provider methods execute inside this Phase A transaction.
2. **Phase B — External Provider Invocations**:
   - Executes outside the Firestore transaction.
   - Payment intent created using deterministic key `pay_chk_${user.uid}_${orderId}_${idempotencyKey}`.
   - Delivery fulfillment created using deterministic key `del_chk_${orderId}`.
   - If an external provider throws an error, a recovery transaction sets `checkoutStatus = 'failed'`, `fulfillmentStatus = 'failed'`, and releases the reserved FEFO inventory exactly once.
3. **Phase C — Finalize Order Transaction**:
   - Second Firestore transaction attaches payment intent and fulfillment records to the order document.
   - Sets `checkoutStatus = 'completed'`, `paymentStatus = paymentIntent.status`, `fulfillmentStatus = fulfillment.status`.
   - Concurrent duplicate requests deduplicate safely at the provider and database layers without creating multiple payment intents or inventory allocations.

### Idempotency Key Failed Replays & Retries
- **If `checkoutStatus = 'completed'`**: Returns the cached successful order directly with `idempotentReplay = true`.
- **If `checkoutStatus = 'failed'` or `'pending_provider'`**:
  - The retry **does NOT run FEFO inventory reservation again**, preventing duplicate reservations for a single checkout key.
  - Reuses the existing deterministic order ID and loads the existing order state from the database.
  - Retries only the failed provider / recovery portion using the same deterministic provider keys.
- **Critical Invariant**: Exactly one order ID and exactly one inventory reservation lifecycle exists per authenticated customer + checkout idempotency key.

### Persistent Payment Compensation State Machine
- If Phase B payment creation succeeds (`status = 'paid'` or `'authorized'`) but delivery fulfillment creation fails:
  - The server **persists a payment compensation intent** in a deterministic collection document: `payment_compensations/${orderId}` before executing the external compensating refund.
  - The document records: `status = 'processing'`, `orderId`, `paymentId`, `amount`, `providerIdempotencyKey = 'comp_' + orderId`, and `reason`.
  - The server attempts the external compensating refund:
    - **On Provider Success**: Marks `payment_compensations/${orderId}` status as `'completed'`, sets the order's `paymentStatus` to `'refunded'` and `compensationStatus = 'completed'`.
    - **On Provider Failure**: Marks `payment_compensations/${orderId}` status as `'failed'`, sets `compensationStatus = 'failed'` on the order doc, and raises a 500 error. The failed compensation remains persistently tracked and recoverable.
  - **Checkout Retry Reconciliation**: When a checkout retry arrives for an order with `compensationStatus === 'failed'`, it detects the outstanding payment compensation, retries the refund with `comp_${orderId}`, and reconciles the compensation safely without duplicate side effects before resolving the request.

---

## 3. Production Authentication & Fail-Closed Boundary

Server-boundary authentication in `requireAuth()` strictly rejects demo tokens in production:

1. **Production Token Requirement**:
   - Whenever `NODE_ENV === 'production'`, any request using `DEMO_TOKEN_*` in the `Authorization` header is immediately rejected with `HTTP 401 Unauthorized`.
   - Production requests MUST present a valid Firebase ID token verified via `admin.auth().verifyIdToken()`.
2. **Demo Token Isolation**:
   - Demo token authentication exists exclusively in non-production development/test/preview environments.

---

## 4. Refund Safety & State Machine Architecture

Order refunds, cancellations, and return approvals utilize a transactional refund intent state machine (`executeSafeRefund`) that separates balance state updates from external gateway side effects:

1. **Transaction A — Reserve Refund Intent**:
   - Validates refund amount against authoritative `remainingRefundableBalance`.
   - Claims/creates a `refund_intents` document (`rfnd_${orderId}_${hash(refundKey)}`) with `status = 'processing'`.
2. **External Gateway Execution**:
   - Calls `paymentAdapter.processRefund(paymentId, refundAmount, reason, providerKey)` outside transaction.
   - Provider key is deterministic and unique (`cancel:<orderId>`, `return:<orderId>`, `manual:<orderId>:<key>`).
3. **Transaction B — Finalize Balance State**:
   - **On Provider Success**: Marks refund intent `completed`, updates `refundedAmount`, reduces `remainingRefundableBalance`, sets `paymentStatus = 'refunded'` or `'partially_refunded'`, stores provider refund result, and logs audit record.
   - **On Provider Failure**: Marks refund intent `failed`, leaves `paymentStatus` and `remainingRefundableBalance` intact, allowing safe retry using the same refund key.
   - **Replay Protection**: Replaying an already successful refund intent returns the existing provider result without calling the provider adapter again.

### Abstraction Interfaces & Types
```ts
export type PaymentProviderType =
  | 'simulated_cod'
  | 'simulated_digital_wallet'
  | 'simulated_card'
  | 'stripe'
  | 'paymongo'
  | 'gcash';

export type PaymentStatus =
  | 'pending_payment'
  | 'authorized'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export interface PaymentIntent {
  paymentId: string;
  orderId: string;
  provider: PaymentProviderType;
  amount: number;
  currency: 'PHP';
  status: PaymentStatus;
  providerReference: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentProvider {
  providerType: PaymentProviderType;
  createPaymentIntent(orderId: string, amount: number, paymentMethod: string, metadata?: Record<string, any>, idempotencyKey?: string): Promise<PaymentIntent>;
  confirmPayment(paymentId: string, externalReference?: string): Promise<PaymentIntent>;
  processRefund(paymentId: string, amount: number, reason: string, idempotencyKey?: string): Promise<PaymentRefundResult>;
}
```

---

## 5. Refund Operations & Balance Validation

Order refunds (`POST /api/orders/:orderId/refund`) are hardened with transactional protection and strict balance validation:

1. **Required Idempotency**: Requires a client-supplied or server-generated `idempotencyKey` (`x-idempotency-key` header or body). Duplicate refund submissions with the same key return the original refund result without issuing duplicate refunds (`idempotentReplay: true`).
2. **Amount Validation**:
   - Rejects refund amounts `<= 0` (`HTTP 400 Bad Request`).
   - Rejects refund amounts exceeding the remaining refundable balance (`HTTP 400 Bad Request`).
   - Rejects refund attempts on already fully refunded orders.
3. **Authoritative Balance Tracking**:
   - Order document maintains authoritative `refundedAmount` and `remainingRefundableBalance`.
   - Partial refunds update `paymentStatus = 'partially_refunded'` and reduce `remainingRefundableBalance`.
   - Full refunds update `paymentStatus = 'refunded'` and reduce `remainingRefundableBalance` to `0`.
4. **Audit Logging**: Every refund event records structured audit details including `refundAmount`, `reason`, `idempotencyKey`, and `refundedBy`.

---

## 6. Delivery & Shipping Abstraction Layer

The platform defines a provider-neutral delivery abstraction covering current Camarines Norte business delivery methods (`branch_pickup` and `door_to_door`).

### Abstraction Interfaces & Types
```ts
export type DeliveryMethodType = 'branch_pickup' | 'door_to_door';

export type FulfillmentStatus =
  | 'pending_processing'
  | 'ready_for_pickup'
  | 'in_transit'
  | 'completed'
  | 'cancelled'
  | 'return_requested'
  | 'returned';

export interface DeliveryQuote {
  deliveryMethod: DeliveryMethodType;
  shippingFee: number;
  estimatedDays: number;
  providerName: string;
}

export interface DeliveryFulfillment {
  trackingNumber: string;
  deliveryMethod: DeliveryMethodType;
  branchId: string;
  status: FulfillmentStatus;
  carrierName: string;
  shippingFee: number;
  estimatedDeliveryDate?: string;
  updatedAt: string;
}

export interface DeliveryProvider {
  calculateShippingFee(deliveryMethod: DeliveryMethodType, branchId: string, destinationAddress?: any): Promise<DeliveryQuote>;
  createFulfillment(orderId: string, deliveryMethod: DeliveryMethodType, branchId: string, destinationAddress?: any): Promise<DeliveryFulfillment>;
  updateFulfillmentStatus(trackingNumber: string, status: FulfillmentStatus): Promise<DeliveryFulfillment>;
}
```

---

## 7. Inventory Restoration Invariants & State Model

Order lifecycle state transitions are enforced server-side with RBAC authorization and FEFO inventory conservation:

```
                  ┌──────────────────────┐
                  │  pending_processing  │
                  └──────────┬───────────┘
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │  cancelled  │  │ ready_pickup│  │ in_transit  │
     └─────────────┘  └──────┬──────┘  └──────┬──────┘
                             │                │
                             └────────┬───────┘
                                      ▼
                             ┌────────────────┐
                             │   completed    │
                             └───────┬────────┘
                                     ▼
                             ┌────────────────┐
                             │return_requested│
                             └───────┬────────┘
                                     ▼
                             ┌────────────────┐
                             │    returned    │
                             └────────────────┘
```

### Endpoints & Inventory Restoration Invariants
1. **Order Cancellation (`POST /api/orders/:orderId/cancel`)**:
   - **Allowed States**: `pending_processing`, `ready_for_pickup`.
   - **Authorization**: Customer owner (if `pending_processing`), assigned branch manager, regional director, super admin.
   - **Authoritative Inventory Model**: Restores inventory by decrementing `reservedQuantity` and incrementing `availableQuantity` on the specific `branch_batch_inventory` documents corresponding to the order's FEFO batch allocations. `product_batches.activeStock` is NOT used as authoritative branch stock.
   - **Aggregate Invariant**: Recomputes aggregate `/inventory/{branchId_skuId}` where `activeStock = availableStock + reservedStock`.
   - **Double-Restoration Protection**: Transactional state checks ensure that repeated cancellation requests on an already cancelled order are rejected (`HTTP 400 INVALID_ORDER_STATE_TRANSITION`) and cannot restore stock twice.
2. **Return Request (`POST /api/orders/:orderId/return-request`)**:
   - **Allowed States**: `completed`. (Fails with HTTP 400 `INVALID_ORDER_STATE_TRANSITION` on uncompleted orders).
   - **Authorization**: Customer owner or admin roles.
   - **Action**: Sets `fulfillmentStatus = 'return_requested'`, records return reason and timestamp.
3. **Return Processing (`POST /api/orders/:orderId/return-process`)**:
   - **Allowed States**: `return_requested`.
   - **Authorization**: Staff roles (`branch_manager`, `regional_director`, `super_admin`).
   - **Exact Inventory Restoration Invariant**: When `decision === 'approve'` and `restockInventory === true`, increments `availableQuantity` on the exact `branch_batch_inventory` records. Recomputes aggregate `/inventory/{branchId_skuId}`.
   - **Double-Restoration Protection**: Transactional state checks ensure that repeated return processing attempts on an already returned order are rejected (`HTTP 400 INVALID_ORDER_STATE_TRANSITION`) and cannot restore stock twice.

### Client-Side State Model
- Client-side React state in `useEcommerce` is strictly **advisory**.
- Local state MUST NOT convert an order to `cancelled` or modify order state when server mutations fail.
- On server failure, current order state is preserved, and error is raised to the UI.

---

## 8. Future Third-Party Integrations (Out of Scope for Priority B)

The following real third-party integrations are explicitly documented as **future work**:
* Live Stripe / PayMongo / GCash gateway credentials and webhook receivers.
* Live 3PL carrier logistics APIs (Lalamove, NinjaVan, J&T Express) for real-time tracking and dispatch.
* Automated SMS / Email customer notification triggers for order state updates.

