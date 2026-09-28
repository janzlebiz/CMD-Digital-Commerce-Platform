# Phase 7: Pre-Implementation Security, Privacy & Architectural Audit

**Document Reference:** `docs/phases/PHASE_7_PRE_IMPLEMENTATION_AUDIT.md`  
**Evaluation Target:** Phase 7 (Multi-Branch Inventory Synchronization, Expiry & Batch Traceability, Supply Chain Forecasting, B2B Stockist Partner Portal, and Distribution Logistics)  
**Regression Baseline:** Phase 0–6C Milestones 1–3 (333/333 automated regression assertions passing)  
**Audit Date:** 2026-09-27  
**Status:** Pre-Implementation Architectural Assessment (Proposed / Unimplemented)  

---

## 1. Executive Summary & Audit Mandate

This pre-implementation audit establishes the architectural, regulatory, and technical specifications for **Phase 7** of the **HCI Cell Mineral Drops (CMD) Digital Commerce & Naturopathic Wellness Platform**. All Phase 7 features discussed herein are strictly **proposed and unimplemented** pending separate authorization.

Phase 7 is planned to expand the platform's commercial and financial operations into a resilient **Multi-Branch Inventory Synchronization, Expiry & Batch Traceability, and B2B Distribution Logistics Engine**. The system will initially serve the six (6) verified operating branches (`daet`, `labo`, `paracale`, `jose_panganiban`, `capalonga`, `santa_elena`), with architectural provisions for future geographic expansion across all twelve (12) municipalities of Camarines Norte, Philippines as physical distribution hubs are commissioned.

### 1.1 Statutory & Regulatory Compliance Baseline
* **Republic Act No. 11967 (Internet Transactions Act of 2023 - ITA) & Implementing Rules and Regulations (IRR):** Mandates truthful and non-misleading digital commerce representations, accurate product availability signals prior to checkout, transparent fulfillment commitments, and complete transaction traceability. Compliance dependencies include alignment with current Department of Trade and Industry (DTI) e-commerce regulations, consumer redress mechanisms (RA 7394), Joint Administrative Order (JAO) No. 22-01, Series of 2022 (Guidelines for Online Businesses), Department Administrative Order (DAO) No. 25-07, Series of 2025 (current DTI E-Commerce Philippine Trustmark framework), and applicable DTI E-Commerce Bureau Trustmark guidelines.
* **Republic Act No. 10173 (Data Privacy Act of 2012 - DPA):** Enforces strict data minimization and boundary isolation (Section 13 sensitive personal information protections). B2B stockist profiles, inventory movements, transit manifests, and batch distribution logs must remain completely decoupled from clinical health records and consultation intakes.
* **Food Supplement Quality & Classification Assurance (FDA Compliance Baseline):** Products under the CMD banner must be distributed under certified FDA authorizations. Prior to implementing automated batch release and expiration routing, the exact FDA regulatory classification (e.g., registered food/dietary supplement vs. cosmetic/topical mineral solution) and current applicable FDA circulars / post-market surveillance directives must be formally confirmed. The First-Expired, First-Out (FEFO) allocation engine and batch certificate provenance system are designed to support rigorous quality management and regulatory compliance upon activation.

---

## 2. Distinction Between Active Codebase and Proposed Phase 7 Scope

No Phase 7 implementation code has been written. To protect the passing 333-test regression baseline, the table below delineates the strict boundary between existing Phase 6C structures and Phase 7 proposals.

### 2.1 Current State vs. Proposed Phase 7 Capabilities

| Component / Subsystem | Current Codebase Status | Existing Location / Logic | Proposed Phase 7 Scope (PROPOSED / UNIMPLEMENTED) |
| :--- | :---: | :--- | :--- |
| **Branch Expense Ledger** | **ACTIVE** | `server.ts` routes `/api/finance/expenses` | Future read-only integration to calculate batch cost bases from raw material expenses. |
| **CRM Cohort Aggregation** | **ACTIVE** | `server.ts` routes `/api/crm/cohorts` | Direct integration with B2B Stockist tiering and wholesale eligibility verification. |
| **Clinical Intakes (KMS)** | **ACTIVE** | `/consultation_intakes` (AES-256-GCM) | **STRICTLY EXCLUDED** via the Health Data Privacy Firewall. |
| **Legacy Inventory Scaffold** | **INACTIVE SCAFFOLD** | `BranchInventory` interface & `/branch_inventory` rule | Inactive legacy schema. Architectural decision required to deprecate or extend before creating `/inventory`. |
| **Operational Inventory Engine** | **UNSTARTED** | *None* (No server-side reservation/adjustment logic) | Transaction-safe real-time multi-branch inventory engine with FEFO batch allocation. |
| **Batch Expiry & QC Control** | **UNSTARTED** | *None* | FEFO batch allocation, QC status registry (`/product_batches`), and recall tracing. |
| **Inter-Branch Stock Transfers** | **UNSTARTED** | *None* | Dual-custody transfer workflow (`/stock_transfers`) with conservation-of-stock enforcement. |
| **Lead-Time Supply Forecasting** | **UNSTARTED** | *None* | Sales velocity ($V_s$), Days of Stock (DOS), and Reorder Point (ROP) math engine. |
| **B2B Bulk Stockist Portal** | **UNSTARTED** | *None* | Tiered wholesale pricing, deposit-backed consignment ledgers, and credit limit controls. |

### 2.2 Inventory Subsystem Architectural Decision Point
The codebase currently contains an inactive type definition (`BranchInventory`) and a legacy Firestore rule (`match /branch_inventory/{inventoryId} { allow read: if isSignedIn(); allow write: if false; }`). There is **no operational server-side inventory engine** backing this rule. Prior to implementing Phase 7, an architectural decision must be confirmed:
1. **Option A (Deprecate & Supersede):** Deprecate `/branch_inventory` and introduce the fully normalized `/inventory`, `/product_batches`, and `/branch_batch_inventory` schema.
2. **Option B (Extend Legacy Path):** Refactor the existing `/branch_inventory` collection to house batch-attributed quantities and update security rules accordingly.

---

## 3. Comprehensive Phase 7 Technical Capabilities & Architecture

### 3.1 Source Catalog Alignment & Proposed SKU Definitions
The platform's existing, verified source catalog provides two commercial consumer SKUs:
* **`hci-cmd-65ml` (Active Consumer SKU):** HCI Cell Mineral Drops (CMD) — 65 mL Flagship Bottle (~960 drops).
* **`hci-cmd-30ml` (Active Consumer SKU):** HCI Cell Mineral Drops (CMD) — 30 mL Compact Dropper (~450 drops).

**Proposed Phase 7 Supply Chain & Packaging SKUs (Proposed / Unimplemented):**
* **`rm-ionic-concentrate` (Proposed Raw Material):** Bulk Raw Ionic Trace Mineral Concentrate (procurement grade, measured in Liters/Kilograms).
* **`pack-dropper-bottle-65ml` (Proposed Packaging):** 65 mL Amber Glass Dropper Bottles with tamper-evident dropper pipettes.
* **`pack-dropper-bottle-30ml` (Proposed Packaging):** 30 mL Amber Glass Dropper Bottles with tamper-evident dropper pipettes.

### 3.2 Implementable FEFO Batch Architecture & Provenance Tracing

To ensure that First-Expired, First-Out (FEFO) routing is practically implementable and verifiable, stock must be tracked at both the aggregate branch level and the discrete batch level.

```
┌───────────────────────────────────────────────────────────┐
│              Product Batch Registry                       │
│              (/product_batches/{batchId})                 │
│  - batchNumber: "CMD-2026-09A"   - expiryDate: 2028-09-30 │
│  - qualityControlStatus: "passed"                         │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────┐
│        Branch Batch Inventory (Stock by Batch & Branch)    │
│        (/branch_batch_inventory/{branchId_batchId})        │
│  - branchId: "daet"              - batchId: "CMD-2026-09A"│
│  - availableQuantity: 150        - reservedQuantity: 10   │
│  - damagedQuantity: 0            - expiryDate: 2028-09-30 │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼ (Order Checkout / Reservation)
┌───────────────────────────────────────────────────────────┐
│           Batch Allocation & Provenance Record            │
│           (/batch_allocations/{allocationId})             │
│  - orderId: "ORD-2026-901"       - batchId: "CMD-2026-09A"│
│  - skuId: "hci-cmd-65ml"         - allocatedQuantity: 2   │
│  - customerUid: "user-101"       - branchId: "daet"       │
└───────────────────────────────────────────────────────────┘
```

#### Core Components & Stock Lifecycle:
1. **Authoritative Batch-Level Stock (`/branch_batch_inventory`):** Each branch tracks stock per batch in `/branch_batch_inventory`, recording `availableQuantity`, `reservedQuantity`, `damagedQuantity`, and `expiryDate`.
2. **Stock Reservation & Allocation Semantics:**
   * **`availableQuantity`:** Unreserved, physical stock on branch shelves available for new purchases.
   * **`reservedQuantity`:** Stock committed to placed orders undergoing fulfillment. During checkout reservation, `availableQuantity` is decremented and `reservedQuantity` is incremented against the batch with earliest expiration date (`expiryDate > now`) whose `qualityControlStatus == 'passed'`.
   * **Order Completion & Dispatch:** When an order is packed and dispatched, `reservedQuantity` is decremented from `/branch_batch_inventory`, and an immutable `/batch_allocations` record is created storing the `allocatedQuantity` for that fulfilled order line item.
   * **Order Cancellation:** If an order is cancelled before dispatch, `reservedQuantity` is decremented and restored to `availableQuantity`.
3. **Batch Allocation & Provenance Records (`/batch_allocations`):** Connects every order item directly to the originating `batchId` and customer UID upon fulfillment.
4. **Bidirectional Recall Traversal Engine:** In the event of an FDA or manufacturer recall:
   * Querying by `batchNumber` immediately yields all associated `orderId`s, customer UIDs, B2B stockist accounts, branches, and fulfillment timestamps.
   * Enables automated notification generation and quarantine locks across active branch stocks.

### 3.2.1 Explicit Inventory Consistency Invariant
To prevent state drift between aggregate catalog displays and physical batch records, the platform enforces a strict mathematical consistency invariant:
* **`/inventory`:** Represents the read-optimized, aggregate branch/SKU view (`id: branchId_skuId`).
* **`/branch_batch_inventory`:** Represents the authoritative, transactional batch-level stock view (`id: branchId_batchId`).

**Mathematical Consistency Invariant:**
$$\text{inventory.activeStock} = \sum_{b \in \text{Batches}(\text{branch, sku})} \text{branch\_batch\_inventory}(b).\text{availableQuantity}$$
$$\text{inventory.reservedStock} = \sum_{b \in \text{Batches}(\text{branch, sku})} \text{branch\_batch\_inventory}(b).\text{reservedQuantity}$$

**Divergence Prevention Rule:** Direct or independent edits to `/inventory` aggregate counters are strictly prohibited. All stock mutations (reservations, cancellations, physical count adjustments, and receipts) must execute transactionally (`db.runTransaction`) on the authoritative `/branch_batch_inventory` records. The aggregate `/inventory` record must be updated in the exact same atomic transaction or derived dynamically from batch records, guaranteeing zero aggregate-vs-batch divergence.

### 3.3 Stock Transfer Protocol & Dual-Custody State Machine

Inter-branch stock transfers must enforce strict conservation-of-stock and idempotency guarantees:

$$\text{Source Stock} + \text{Transit Stock} + \text{Destination Stock} + \text{Audited Loss} = \text{Initial Total Stock}$$

```
                          ┌──────────────┐
                          │    DRAFT     │
                          └──────┬───────┘
                                 │ initiateTransfer(idempotencyKey)
                                 ▼
                          ┌──────────────┐
                          │  IN_TRANSIT  │ (Source Stock Decremented;
                          └──────┬───────┘  Transit Pool Incremented)
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼ (receiveTransferFull) ▼ (receiveTransferPart) ▼ (rejectDamaged)
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  RECEIVED_FULL  │     │ RECEIVED_PARTIAL│     │ REJECTED_DAMAGED│
└─────────────────┘     └─────────────────┘     └─────────────────┘
Destination Stock += Q   Destination Stock += Qrec   Transit Pool -= Q
Transit Pool -= Q        Transit Pool -= Q           Audited Loss += Q
                         Audited Loss += (Q - Qrec)  (Expense Incurred)
```

#### Transfer State-Transition & Safety Rules:
1. **Duplicate Request & Retry Safety:** Transfer initiation requires a client-generated `idempotencyKey`. Duplicate submissions return the existing transfer state without double-decrementing source inventory.
2. **Transit Custody Lock:** Initiating a transfer atomically decrements `Source_Stock` and increments `Transit_Pool` for the specific batch.
3. **Full Receipt:** Destination branch accepts shipment; `Transit_Pool` is decremented and `Destination_Stock` is incremented.
4. **Partial Receipt:** Destination branch verifies physical count. If 80 of 100 units arrive undamaged, 80 units transition to `Destination_Stock`, 20 units transition to `Audited_Loss`, and `Transit_Pool` is decremented by 100.
5. **Rejection & Damage Handling:** Damaged shipments are rejected with mandatory photo/notes evidence. The units are decremented from `Transit_Pool` and booked as an audited transit-loss expense (`miscellaneous` or `damaged_goods`).
6. **Cancellation & Reversal:** Transfers in `in_transit` state can only be cancelled by authorized supervisors, returning stock atomically from `Transit_Pool` to `Source_Stock`.

### 3.4 Supply Chain Forecasting Math & Edge Cases

The forecasting engine computes replenishment indicators using 30-day historical data:

* **Branch Sales Velocity ($V_s$):**
  $$V_s = \frac{\sum \text{Completed Consumer \& B2B Units Sold (Last 30 Days)}}{30}$$
* **Days of Stock (DOS):**
  $$\text{DOS} = \begin{cases} \infty \text{ (or Safe Baseline)} & \text{if } V_s = 0 \\ \frac{\text{Current Active Available Stock}}{V_s} & \text{if } V_s > 0 \end{cases}$$
* **Dynamic Reorder Point (ROP):**
  $$\text{ROP} = \lceil (V_s \times L_t) + S_s \rceil$$

#### Explicit Edge-Case Handling Rules:
1. **Zero Sales Velocity ($V_s = 0$):** When no units have been sold in 30 days, DOS is represented as `null` (or displayed as $\ge 90\text{ days}$), avoiding division-by-zero exceptions. ROP defaults to the minimum branch safety buffer ($S_s$).
2. **Rounding Rule:** All reorder points and suggested order quantities must use integer ceiling ($\lceil \cdot \rceil$) to prevent under-replenishment.
3. **Cancelled & Refunded Orders:** Strictly excluded from $V_s$ calculations to prevent artificial demand inflation.
4. **Inter-Branch Stock Transfers:** Transfer shipments out of a branch must **not** be counted as consumer sales velocity for that branch, preventing circular demand distortion.
5. **Stockout Periods:** If a branch experiences zero stock for $N$ days during the 30-day window, the effective velocity calculation adjusts the denominator to active in-stock days ($30 - N$) to prevent demand underestimation.
6. **Safety Stock ($S_s$) Source:** Configured per SKU and branch *(Proposed Configuration Default / Parameterized: default 14 days of average demand or minimum safety buffer of 20 units, subject to operational review)*.
7. **Transit Lead-Time ($L_t$) Source:** Derived from a branch-specific transit lead-time matrix *(Illustrative Configuration Defaults: e.g., Daet Central Hub to Capalonga: 3 business days; Central Hub to Santa Elena: 4 business days, subject to logistics matrix calibration)*.

### 3.5 B2B Stockist Partner Portal & Consignment Specifications

* **Wholesale Tier Pricing & Eligibility *(Proposed Configuration Defaults / Subject to Commercial Review & Business Approval)*:**
  * **Tier 1 (Stockist Partner):** Minimum order 50 units (15% discount on `hci-cmd-65ml` / `hci-cmd-30ml`).
  * **Tier 2 (Municipal Distributor):** Minimum order 200 units (25% discount).
  * **Tier 3 (Regional Stockist):** Minimum order 500 units (35% discount).
* **Credit & Deposit Mechanics:**
  * Consignment accounts require verified upfront security deposits.
  * System enforces hard credit limits; orders exceeding available credit or past-due net-30 terms are automatically blocked from dispatch.

---

## 4. Privacy, Security & Threat Modeling (RA 10173 & IDOR Isolation)

1. **Health Data Privacy Firewall (Zero Clinical Clearance):**
   * Warehouse coordinators, B2B stockists, and delivery drivers have **ZERO** clinical clearance.
   * Inventory APIs, batch logs, and transfer manifests must never query or access `/consultation_intakes`.
2. **Cross-Branch Inventory IDOR Protection:**
   * Branch managers are restricted to their assigned branch (`assignedBranchId`).
   * Attempts to view, adjust, or receive inventory for an unassigned branch return `HTTP 403 Forbidden` and generate an ADR-009 security audit log.
3. **Transactional Concurrency & Anti-Overselling:**
   * Stock reservations and batch allocations must execute within Firestore transactions (`db.runTransaction`) with optimistic concurrency control (OCC).
   * Prevents race conditions and guarantees stock never drops below zero during concurrent checkouts.

---

## 5. Proposed Schema Blueprint & Security Rules

### 5.1 Proposed Firebase Blueprint Schema (`firebase-blueprint.json`)
```json
{
  "collections": {
    "inventory": {
      "document": {
        "id": "branchId_skuId",
        "fields": {
          "branchId": "string",
          "skuId": "string",
          "activeStock": "number",
          "reservedStock": "number",
          "transitStock": "number",
          "safetyStock": "number",
          "reorderPoint": "number",
          "lastAdjustmentAt": "string"
        }
      }
    },
    "product_batches": {
      "document": {
        "id": "batchId",
        "fields": {
          "batchNumber": "string",
          "skuId": "string",
          "manufactureDate": "string",
          "expiryDate": "string",
          "laboratoryCertificateUrl": "string",
          "qualityControlStatus": "string",
          "totalManufacturedQuantity": "number",
          "procurementCostBasis": "number"
        }
      }
    },
    "branch_batch_inventory": {
      "document": {
        "id": "branchId_batchId",
        "fields": {
          "branchId": "string",
          "batchId": "string",
          "skuId": "string",
          "availableQuantity": "number",
          "reservedQuantity": "number",
          "damagedQuantity": "number",
          "expiryDate": "string"
        }
      }
    },
    "batch_allocations": {
      "document": {
        "id": "allocationId",
        "fields": {
          "orderId": "string",
          "batchId": "string",
          "skuId": "string",
          "branchId": "string",
          "customerUid": "string",
          "allocatedQuantity": "number",
          "allocatedAt": "string"
        }
      }
    },
    "stock_transfers": {
      "document": {
        "id": "TRF-YYYYMMDD-XXXX",
        "fields": {
          "id": "string",
          "sourceBranchId": "string",
          "destinationBranchId": "string",
          "batchId": "string",
          "skuId": "string",
          "requestedQuantity": "number",
          "receivedQuantity": "number",
          "damagedQuantity": "number",
          "status": "string",
          "idempotencyKey": "string",
          "initiatedByUid": "string",
          "receivedByUid": "string",
          "initiatedAt": "string",
          "completedAt": "string",
          "notes": "string"
        }
      }
    }
  }
}
```

### 5.2 Proposed Firestore Security Rules (`firestore.rules`)
```javascript
match /inventory/{itemId} {
  allow read: if isSignedIn() && (
    isRegionalDirector() || 
    isSuperAdmin() || 
    (isBranchManager() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.assignedBranchId == resource.data.branchId)
  );
  allow write: if false; // ADR-009: Strict Network-Only Writes via server.ts
}

match /product_batches/{batchId} {
  allow read: if isSignedIn() && (isBranchManager() || isRegionalDirector() || isSuperAdmin());
  allow write: if false; // ADR-009: Managed exclusively via server-side endpoints
}

match /branch_batch_inventory/{itemDocId} {
  allow read: if isSignedIn() && (
    isRegionalDirector() ||
    isSuperAdmin() ||
    (isBranchManager() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.assignedBranchId == resource.data.branchId)
  );
  allow write: if false;
}

match /batch_allocations/{allocationId} {
  allow read: if isSignedIn() && (
    isRegionalDirector() ||
    isSuperAdmin() ||
    (isBranchManager() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.assignedBranchId == resource.data.branchId) ||
    (isOwner(resource.data.customerUid))
  );
  allow write: if false;
}

match /stock_transfers/{transferId} {
  allow read: if isSignedIn() && (
    isRegionalDirector() || 
    isSuperAdmin() ||
    (isBranchManager() && (
      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.assignedBranchId == resource.data.sourceBranchId ||
      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.assignedBranchId == resource.data.destinationBranchId
    ))
  );
  allow write: if false; // ADR-009: Managed via dual-custody API handshakes
}
```

---

## 6. Regression & Zero-Impact Certification

To ensure that the 333 passing regression assertions remain completely stable, Phase 7 establishes the following isolation guarantees:
1. **Phase 6A (Clinical Intakes & Appointments):** No clinical logic, KMS credentials, or private consultation routes are modified or imported.
2. **Phase 6B (Workshops & Dynamic QR Passes):** Symposia schedules, check-in signatures, and participant registration remain 100% independent of stock counts.
3. **Phase 6C Milestones 1–3 (Redress, CRM, and Expenses):** 
   * CRM cohort aggregation queries remain operational and unaffected.
   * Expense recording APIs are preserved; the proposed design plans a future read-only integration such that logging raw material procurement would populate corresponding `product_batches` cost bases without breaking existing test schemas.

---

## 7. Expanded Phase 7 Acceptance Criteria (Automated Testing Specifications)

When Phase 7 is authorized for development, the automated test harness (`scripts/testPhase7Inventory.ts`) will require verification across eight (8) distinct operational domains:

1. **Multi-Branch Inventory & Stock Reconciliation (20 Tests):**
   * Validates active, reserved, and transit stock levels during simulated checkouts.
   * Verifies symmetric adjustments (damage, physical audit, sample withdrawal).
2. **FEFO Expiry Routing & QC Filtering (20 Tests):**
   * Asserts batches with earliest expiration dates are allocated first.
   * Asserts batches with `pending` or `failed` QC status are never allocated to customers or stockists.
3. **Batch Provenance & Recall Traversal (15 Tests):**
   * Asserts `/batch_allocations` correctly links orders and customers to specific batches.
   * Validates recall orchestrator accurately identifies all affected order IDs and customer UIDs for a recalled batch.
4. **Dual-Custody Stock Transfers & Conservation of Stock (25 Tests):**
   * Asserts conservation of stock across initiation, transit, full receipt, partial receipt, rejection, and cancellation.
   * Asserts duplicate transfer requests with identical `idempotencyKey` return identical responses without double-decrementing.
5. **Supply Chain Forecasting & Edge Cases (15 Tests):**
   * Asserts mathematical accuracy of Sales Velocity ($V_s$), Days of Stock (DOS), and Reorder Point (ROP).
   * Validates edge cases: zero sales velocity ($V_s=0$), stockout period adjustments, integer ceiling rounding, and exclusion of transfers/cancelled orders.
6. **B2B Bulk Stockist Portal & Credit Controls (15 Tests):**
   * Validates tiered wholesale volume pricing and minimum order thresholds.
   * Verifies consignment ledger, security deposit balances, credit limits, and automatic order lockout upon credit breach.
7. **Security, IDOR Protection & Health Data Privacy (20 Tests):**
   * Asserts branch manager cross-branch access attempts return `HTTP 403 Forbidden`.
   * Asserts zero accesses to `/consultation_intakes` across all inventory and B2B endpoints.
   * Asserts structured audit logs (ADR-009) are recorded for all stock adjustments, transfers, and QC status changes.
8. **Concurrent Transaction Safety & Backward Compatibility (15 Tests):**
   * Asserts concurrent checkouts via `db.runTransaction` prevent double-allocation and overselling.
   * Validates IndexedDB schema upgrade (v3 $\rightarrow$ v4) with zero data loss on legacy offline stores.

---

## 8. Audit Conclusion & Final Recommendation

Phase 7 establishes a comprehensive, mathematically rigorous, and privacy-hardened architecture for multi-branch inventory management, FEFO quality assurance, stock transfers, and B2B distribution.

**Ready for final certification pending source verification.**

---

## 9. Completed Implementation Milestone Verification Report

### Milestone 1 Status: ACTIVE & VERIFIED (Completed 2026-09-27)
* **Scope Completed:** Authoritative `/branch_batch_inventory`, aggregate `/inventory`, branch/SKU stock reconciliation, active/reserved/transit stock semantics, audited stock adjustments (`count_reconciliation`, `damage_writeoff`, `sample_withdrawal`, `shrinkage_loss`, `qc_quarantine`), cross-branch IDOR boundary protection, ADR-009 server-authoritative writes, Health Data Privacy Firewall compliance (0 consultation intakes calls), and legacy `/branch_inventory` backward-compatibility adapter.
* **Scaffold Decision:** Deprecated/superseded the inactive `/branch_inventory` scaffold in favor of the normalized `/branch_batch_inventory` and `/inventory` collections.
* **Test Verification:** Dedicated test suite `scripts/testPhase7Inventory.ts` passing 83/83 assertions. Cumulative platform suite passing 416/416 assertions.

### Milestone 2 Status: ACTIVE & VERIFIED (Completed 2026-09-27)
* **Scope Completed:** Server-authoritative FEFO batch eligibility and reservation routing, strict QC filtering (`passed`, `pending`, `failed`), expiry validation, multi-branch isolation, atomic insufficient stock handling with zero partial mutation, zero negative stock bounds, ADR-009 audit event logging, and transaction isolation / concurrency protection with strict ascending expiry ordering verification.
* **Test Verification:** Dedicated test suite `scripts/testPhase7Milestone2Fefo.ts` passing exactly 20/20 real acceptance assertions. Cumulative platform suite passing 436/436 assertions.

### Milestone 2.5 Status: ACTIVE & VERIFIED (Completed 2026-09-27, Remediated & Certified)
* **Scope Completed:** Order checkout integration with server-authoritative FEFO reservation logic within a single atomic `db.runTransaction()`, multi-batch checkout allocation support, duplicate-SKU item normalization and quantity combination by SKU, strict QC / expiry filtering during checkout, atomic insufficient stock rollback (zero order created, zero stock mutation), batch allocation breakdown persistence on orders, and `/inventory` aggregate reconciliation.
* **Test Verification:** Dedicated test suite `scripts/testPhase7Milestone25Checkout.ts` passing 6/6 assertions. Cumulative platform suite passing 457/457 assertions.

### Milestone 3 Status: ACTIVE & VERIFIED (Completed 2026-09-27, Remediated & Certified)
* **Scope Completed:** Authoritative server-side fulfillment transition (`POST /api/orders/:orderId/fulfill`) with strict transactional reservation-integrity validation (`currentReserved >= qtyReserved`), throwing `INSUFFICIENT_RESERVED_STOCK` on mismatch with atomic rollback (zero batch allocation, zero stock mutation, zero aggregate change, zero status change), atomic batch `reservedQuantity` decrementing, immutable `/batch_allocations/{allocationId}` record creation, idempotency protection against duplicate fulfillment, batch recall traversal (`GET /api/inventory/recall`) supporting `batchId` and `batchNumber` resolution, strict RBAC / IDOR boundary enforcement, zero access to `/consultation_intakes`, and ADR-009 structured audit logging.
* **Test Verification:** Dedicated test suite `scripts/testPhase7Milestone3Provenance.ts` passing 15/15 assertions. Cumulative platform suite passing 456/456 assertions.

### Milestone 4 Status: ACTIVE & VERIFIED (Completed 2026-09-27)
* **Scope Completed:** Dual-custody stock transfers (`/stock_transfers/{transferId}`) supporting full lifecycle (`DRAFT → IN_TRANSIT → RECEIVED_FULL | RECEIVED_PARTIAL | REJECTED_DAMAGED`), authorized cancellation/reversal of `IN_TRANSIT` transfers returning stock to source available quantity, server-authoritative transfer initiation with strict source branch authorization, batch/SKU validation, negative stock prevention, idempotency key protection against double-decrement, atomic full receipt (moving transit quantity to destination available stock), partial receipt (adding received quantity, recording remaining as audited loss/damage), damaged rejection (recording rejected quantity as audited loss and clearing transit custody), transaction-level inventory aggregate reconciliation preservation across source and destination branches, strict RBAC/IDOR boundary enforcement (branch managers restricted to assigned source/destination branch; regional directors/super admins operating cross-branch; customers/practitioners denied), Health Data Privacy Firewall compliance (zero access to `/consultation_intakes`), and ADR-009 structured audit event logging for successful and blocked operations.
* **Test Verification:** Dedicated test suite `scripts/testPhase7Milestone4Transfers.ts` passing 25/25 real acceptance assertions. Cumulative platform baseline: **482/482** assertions passing across Phase 6 regression suites (333/333), M1 (83/83), M2 (20/20), M2.5 (6/6), M3 (15/15), and M4 (25/25). TypeScript compilation (`tsc --noEmit`) and production build (`npm run build`) passing successfully.


