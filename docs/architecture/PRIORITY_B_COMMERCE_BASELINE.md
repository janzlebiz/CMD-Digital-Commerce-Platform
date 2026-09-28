# Priority B — Authoritative Commerce & Order Lifecycle Baseline

## 1. Overview & Purpose

This document defines the authoritative e-commerce, checkout architecture, provider abstraction layers (payment and delivery), and order lifecycle operations (cancellation, returns, and refunds) for the **HCI CMD Digital Commerce Platform** established under Priority B.

---

## 2. Authoritative Server-Side Checkout Flow & Idempotency

To eliminate local client-state order creation risks and enforce strict price and inventory integrity, customer order placement is consolidated on the authoritative server endpoint:

`POST /api/orders/checkout`

### Key Enforcement Rules
1. **Catalog Price Authority**: Client-provided item prices in payloads are strictly ignored. Item prices and subtotals are calculated server-side using the authoritative `PRODUCTS_CATALOG`.
2. **Required Checkout Idempotency**:
   - Every `POST /api/orders/checkout` request MUST supply an `idempotencyKey` via header (`x-idempotency-key`) or request body (`idempotencyKey`).
   - Requests missing `idempotencyKey` are rejected with `HTTP 400 Bad Request`.
   - The key is scoped to the authenticated customer UID (`idempotency_keys/${user.uid}_${idempotencyKey}`).
   - Detection and reservation occur atomically inside a Firestore transaction.
   - Retries or concurrent duplicate submissions return the original order payload without creating duplicate order documents or reserving stock twice.
3. **Delivery Fee Calculation**: Shipping fees are generated via the `DeliveryProvider` abstraction (PHP 0 for `branch_pickup`, PHP 150 for `door_to_door`).
4. **Transaction Boundary & Side-Effect Separation**:
   - External payment intent creation (`paymentAdapter.createPaymentIntent`) and delivery quote/fulfillment creation are executed outside/prior to the Firestore transaction using deterministic idempotency references.
   - Inside `db.runTransaction()`, FEFO inventory reservation on `branch_batch_inventory` and atomic order document creation occur.
   - If the transaction retries or a duplicate request occurs, no duplicate external payment intents or inventory allocations are created.
5. **FEFO Inventory Reservation**: Atomic batch stock allocation and FEFO reservation are executed inside a Firestore database transaction on `branch_batch_inventory`.
6. **Fulfillment Record Creation**: Generates a server-side `DeliveryFulfillment` record with tracking reference.

---

## 3. Production Authentication & Fail-Closed Rules

Production customer operations must require a valid Firebase ID token acquired via `user.getIdToken()`:

1. **Production Token Requirement**:
   - In production environments (`PROD`), customer operations (checkout, order cancellation, viewing my orders) require a valid Firebase ID token.
   - If no authenticated user exists or token acquisition fails, the client hook (`useEcommerce`) rejects the operation immediately.
2. **Demo Authentication Isolation**:
   - Demo token authentication (`DEMO_TOKEN_customer`) is strictly isolated behind development/test/preview flags (`NODE_ENV !== 'production'`) and cannot activate in production.
   - Unauthenticated production client requests fail closed and cannot access customer commerce endpoints.

---

## 4. Payment Provider Abstraction Layer & Side-Effect Boundary

The platform defines a provider-neutral payment abstraction interface so that production payment gateways (e.g. Stripe, PayMongo, GCash) can be plugged in without changing domain or order logic.

### Side-Effect Boundary Rule
No payment provider methods that create external side effects (e.g. `createPaymentIntent` or `processRefund`) are called inside a retryable `db.runTransaction()`. Firestore transactions establish the authoritative order and payment state, and provider calls execute with provider-safe, deterministic idempotency references (`idempotencyKey` / `orderId`).

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

