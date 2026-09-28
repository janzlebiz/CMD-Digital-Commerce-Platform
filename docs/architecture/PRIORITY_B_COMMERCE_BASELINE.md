# Priority B — Authoritative Commerce & Order Lifecycle Baseline

## 1. Overview & Purpose

This document defines the authoritative e-commerce, checkout architecture, provider abstraction layers (payment and delivery), and order lifecycle operations (cancellation, returns, and refunds) for the **HCI CMD Digital Commerce Platform** established under Priority B.

---

## 2. Authoritative Server-Side Checkout Flow

To eliminate local client-state order creation risks and enforce strict price and inventory integrity, customer order placement is consolidated on the authoritative server endpoint:

`POST /api/orders/checkout`

### Key Enforcement Rules
1. **Catalog Price Authority**: Client-provided item prices in payloads are strictly ignored. Item prices and subtotals are calculated server-side using the authoritative `PRODUCTS_CATALOG`.
2. **Delivery Fee Calculation**: Shipping fees are generated via the `DeliveryProvider` abstraction (PHP 0 for `branch_pickup`, PHP 150 for `door_to_door`).
3. **FEFO Inventory Reservation**: Atomic batch stock allocation and FEFO reservation are executed inside a Firestore database transaction.
4. **Payment Intent Creation**: Generates a server-side `PaymentIntent` via the `PaymentProvider` abstraction.
5. **Fulfillment Record Creation**: Generates a server-side `DeliveryFulfillment` record with tracking reference.

---

## 3. Payment Provider Abstraction Layer

The platform defines a provider-neutral payment abstraction interface so that production payment gateways (e.g. Stripe, PayMongo, GCash) can be plugged in without changing domain or order logic.

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
  createPaymentIntent(orderId: string, amount: number, paymentMethod: string, metadata?: Record<string, any>): Promise<PaymentIntent>;
  confirmPayment(paymentId: string, externalReference?: string): Promise<PaymentIntent>;
  processRefund(paymentId: string, amount: number, reason: string): Promise<PaymentRefundResult>;
}
```

### Adapters & Registry
* **`SimulatedPaymentAdapter`**: Handles `cash_on_delivery` (`pending_payment`) and simulated digital wallets/cards (`paid`) without requiring external credentials.
* **`PaymentAdapterRegistry`**: Factory pattern resolving the appropriate `PaymentProvider` adapter based on payment method.

---

## 4. Delivery & Shipping Abstraction Layer

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

### Adapters
* **`StandardDeliveryAdapter`**: Implements Camarines Norte regional pricing (PHP 0 for branch pickup, PHP 150 for local door-to-door delivery) and generates tracking references (`PICKUP-<orderId>` or `TRK-<orderId>`).

---

## 5. Refund, Return, and Cancellation State Model

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

### Endpoints & Workflow
1. **Order Cancellation (`POST /api/orders/:orderId/cancel`)**:
   - **Allowed States**: `pending_processing`, `ready_for_pickup`.
   - **Authorization**: Customer owner (if `pending_processing`), assigned branch manager, regional director, super admin.
   - **Action**: Releases/restocks reserved FEFO batch inventory, issues refund via `PaymentProvider`, sets `fulfillmentStatus = 'cancelled'`, `paymentStatus = 'refunded'`.
2. **Return Request (`POST /api/orders/:orderId/return-request`)**:
   - **Allowed States**: `completed`. (Fails with HTTP 400 `INVALID_ORDER_STATE_TRANSITION` on uncompleted orders).
   - **Authorization**: Customer owner or admin roles.
   - **Action**: Sets `fulfillmentStatus = 'return_requested'`, records return reason and timestamp.
3. **Return Processing (`POST /api/orders/:orderId/return-process`)**:
   - **Allowed States**: `return_requested`.
   - **Authorization**: Staff roles (`branch_manager`, `regional_director`, `super_admin`).
   - **Action**: Decision `approve` restocks batch inventory (if re-usable) and issues refund via `PaymentProvider`, setting `fulfillmentStatus = 'returned'`, `paymentStatus = 'refunded'`. Decision `reject` reverts status to `completed`.
4. **Order Refund (`POST /api/orders/:orderId/refund`)**:
   - **Allowed States**: `cancelled`, `returned`, `return_requested`.
   - **Authorization**: Staff roles.
   - **Action**: Processes refund through `PaymentProvider` and updates `paymentStatus = 'refunded'`.

---

## 6. Future Third-Party Integrations (Out of Scope for Priority B)

The following real third-party integrations are explicitly documented as **future work**:
* Live Stripe / PayMongo / GCash gateway credentials and webhook receivers.
* Live 3PL carrier logistics APIs (Lalamove, NinjaVan, J&T Express) for real-time tracking and dispatch.
* Automated SMS / Email customer notification triggers for order state updates.
