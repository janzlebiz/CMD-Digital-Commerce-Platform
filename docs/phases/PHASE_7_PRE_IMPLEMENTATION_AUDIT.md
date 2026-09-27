# Phase 7: Pre-Implementation Security, Privacy & Architectural Audit

**Document Reference:** `docs/phases/PHASE_7_PRE_IMPLEMENTATION_AUDIT.md`  
**Evaluation Target:** Phase 7 (Multi-Branch Inventory Synchronization, Expiry & Batch Traceability, Supply Chain Forecasting, B2B Stockist Partner Portal, and Distribution Logistics)  
**Baseline Certified:** Phase 0–6C Milestones 1–3 (370/370 automated assertions passing)  
**Audit Date:** 2026-09-27  
**Status:** Pre-Implementation Architectural Assessment  

---

## 1. Executive Summary & Audit Mandate

This pre-implementation audit establishes the architectural, regulatory, and technical specifications for **Phase 7** of the **HCI Cell Mineral Drops (CMD) Digital Commerce & Naturopathic Wellness Platform**. 

Phase 7 expands the platform's commercial and financial operations into a resilient **Multi-Branch Inventory Synchronization, Expiry & Batch Traceability, and B2B Distribution Logistics Engine**. This system will bridge central procurement and local branch operations across the twelve (12) municipalities of Camarines Norte, Philippines.

### 1.1 Statutory Compliance Mandate
* **Republic Act No. 11967 (Internet Transactions Act of 2023 - ITA):** Mandates rigorous tracking of seller inventory, product provenance, delivery commitments, and complete transaction traceability. Consumers must be guaranteed accurate product stock status at checkout.
* **Republic Act No. 10173 (Data Privacy Act of 2012 - DPA):** Mandates strict data minimization and boundary isolation. B2B stockist profiles, inventory movements, and batch distribution logs must remain completely decoupled from clinical health records.
* **Administrative Order No. 2013-0022 (FDA Quality Management):** Requires strict batch-level tracking, laboratory certificate associations, and FEFO (First-Expired, First-Out) shelf-life reservation for food supplements (such as ionic cell mineral drops).

---

## 2. Distinction Between Active Codebase and Proposed Phase 7 Scope

No Phase 7 implementation code has been written. To protect the passing 370-test regression baseline, the table below delineates the strict boundary between existing Phase 6C structures and Phase 7 proposals.

### 2.1 Capability Status Matrix

| Component / Subsystem | Status | Current Location / Existing Logic | Proposed Phase 7 Scope (NOT YET STARTED) |
| :--- | :---: | :--- | :--- |
| **Branch Expense Ledger** | **ACTIVE** | `server.ts` routes `/api/finance/expenses` | Read-only ledger feed integrated as inventory cost-basis. |
| **CRM Cohort Aggregation** | **ACTIVE** | `server.ts` routes `/api/crm/cohorts` | Direct integration with B2B Stockist tiering rules. |
| **Clinical Intakes (KMS)** | **ACTIVE** | `/consultation_intakes` (AES-256-GCM) | **STRICTLY EXCLUDED** via the Data Privacy Firewall. |
| **Multi-Branch Inventory Stock** | **UNSTARTED** | *None* (Stock status is not managed per-branch) | Real-time ledger `/inventory` with active adjustments. |
| **Batch Expiry & QC Control** | **UNSTARTED** | *None* | FEFO allocation engine & batch registry `/product_batches`. |
| **Inter-Branch Stock Transfers** | **UNSTARTED** | *None* | Dual-custody transfer workflow `/stock_transfers`. |
| **Lead-Time Supply Forecasting** | **UNSTARTED** | *None* | Sales velocity and Reorder Point (ROP) math engine. |
| **B2B Bulk Stockist Portal** | **UNSTARTED** | *None* | Tiered pricing engines, deposit ledgers, credit limits. |

---

## 3. Comprehensive Phase 7 Technical Capabilities & Specifications

### 3.1 Multi-Branch Stock Ledger & SKU Definitions
* **SKUs Managed:**
  * `CMD-60ML`: Cell Mineral Drops Standard (60ml bottle, ~1,000 drops)
  * `CMD-30ML`: Cell Mineral Drops Travel Size (30ml bottle, ~500 drops)
  * `RM-IONIC`: Bulk Raw Ionic Trace Mineral Concentrate (Procurement grade)
  * `PACK-BTL`: Empty Glass Dropper Bottles (Packaging stock)
* **Real-Time Stock Counters:**
  * Stores total active stock, reserved stock (awaiting shipment/pickup), and transit stock across all 6 verified branches (`daet`, `labo`, `paracale`, `jose_panganiban`, `capalonga`, `santa_elena`).
* **Symmetric Adjustments:**
  * Enables authorized staff to record audited stock counts, shrinkage, damages, or laboratory sample withdrawals.

### 3.2 FEFO Batch Allocation & Laboratory Certificate Provenance
* **Product Batch Registry (`/product_batches`):**
  * Tracks every manufactured/procured batch of CMD.
  * Fields: `batchNumber`, `manufactureDate`, `expiryDate`, `laboratoryCertificateUrl` (FDA quality analysis), `qualityControlStatus` (`pending` | `passed` | `failed`).
* **First-Expired, First-Out (FEFO) Allocation:**
  * When a customer or B2B stockist places an order, the server-side commerce engine automatically reserves stock from the batch with the *earliest expiry date* that is marked as `passed` QC.
* **Recall Recall Orchestrator:**
  * In the event of a product quality alert, this engine lists all customers, B2B partners, and order IDs that received bottles mapped to the target `batchNumber`.

### 3.3 Inter-Branch Stock Transfer Dual-Custody Ledger (`/stock_transfers`)
To prevent "ghost inventory" and transit loss, stock transfers follow a strict dual-custody handshake:
1. **Initiation (`requested` $\rightarrow$ `in_transit`):**
   * Sender branch (e.g., Daet Hub) initiates transfer.
   * `Source_Stock` is decremented; the quantity is moved into a `transit_pool` state bound to the transfer ID.
2. **Acceptance Handshake (`received` | `rejected_damaged`):**
   * The receiving branch manager inspects physical delivery.
   * On acceptance: Items are subtracted from `transit_pool` and added to receiving branch active stock.
   * On rejection (leakage, damage, loss): Items are recorded as transit-loss expenses and audited in `/audit_logs`.

```
[Source Active Stock] 
         │  (1. Sender Manager Initiates)
         ▼
[Transit Pool (Locked)]
         │  (2. Delivery arrives; Receiver Manager Inspects)
         ├──► ACCEPTED ──► [Destination Active Stock]
         └──► REJECTED ──► [Loss Written Off as Expense Category 'miscellaneous']
```

### 3.4 Supply Chain Forecasting & Dynamic Reorder Points (ROP)
* **Branch-Specific Sales Velocity ($V_s$):**
  * Computes 30-day moving sales average: $V_s = \frac{\text{Units Sold in 30 Days}}{30}$.
* **Days of Stock (DOS):**
  * $\text{DOS} = \frac{\text{Current Active Stock}}{V_s}$.
* **Dynamic Reorder Point (ROP):**
  * Evaluates when stock needs replenishment based on local transit lead times ($L_t$) and desired safety stock ($S_s$):
    $$\text{ROP} = (V_s \times L_t) + S_s$$
  * Automatic triggers notify branch managers when $\text{Current Active Stock} \le \text{ROP}$.

### 3.5 B2B Bulk Stockist Partner Portal
* **Stockist Tiering & Volume Discounts:**
  * **Bronze Stockist:** Minimum order of 50 bottles, 15% discount.
  * **Silver Stockist:** Minimum order of 200 bottles, 25% discount.
  * **Gold Stockist:** Minimum order of 500 bottles, 35% discount.
* **Deposit-Backed Consignment Ledger:**
  * Tracks bulk inventory dispatched on consignment.
  * Monitors deposit balances, credit limits, outstanding balances, and aging accounts receivable (net-15 or net-30 credit terms) with automatic order lockouts upon credit breach.

---

## 4. Privacy, Security & Threat Modeling (RA 10173 & IDOR Isolation)

1. **Health Data Privacy Firewall (SPI Boundary):**
   * Bulk stockists, delivery drivers, and warehouse coordinators have **ZERO** clinical clearance. 
   * Inventory APIs, stock adjustments, batch records, and B2B portals must never call, import, or read from `/consultation_intakes` or related clinical tables.
2. **Cross-Branch Inventory IDOR Protection:**
   * A branch manager assigned to `labo` must be strictly blocked from viewing or creating inventory adjustments for `daet` or `paracale`.
   * Cross-branch adjustment queries return `HTTP 403 Forbidden` and log a high-priority security audit event.
3. **Double-Allocation Prevention under Concurrent Loads:**
   * High-volume B2B bulk orders must use Firestore transactional constraints (`db.runTransaction`) to guarantee that stock levels do not drop below zero when multiple stockists claim remaining stock concurrently.

---

## 5. Proposed Schema Blueprint & Security Rules

### 5.1 Proposed Firebase Blueprint Registry (`firebase-blueprint.json`)
```json
{
  "collections": {
    "inventory": {
      "document": {
        "id": "branchId_skuId",
        "fields": {
          "branchId": "string",
          "sku": "string",
          "activeStock": "number",
          "reservedStock": "number",
          "transitStock": "number",
          "reorderPoint": "number",
          "safetyStock": "number",
          "lastAdjustmentAt": "string"
        }
      }
    },
    "product_batches": {
      "document": {
        "id": "batchId",
        "fields": {
          "batchNumber": "string",
          "sku": "string",
          "manufactureDate": "string",
          "expiryDate": "string",
          "laboratoryCertificateUrl": "string",
          "qualityControlStatus": "string",
          "procurementCostBasis": "number"
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
          "sku": "string",
          "quantity": "number",
          "status": "string",
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
  allow write: if false; // ADR-009: Strict Network-Only Writes via server-side logic
}

match /product_batches/{batchId} {
  allow read: if isSignedIn() && (isBranchManager() || isRegionalDirector() || isSuperAdmin());
  allow write: if false; // ADR-009: Managed exclusively via server.ts
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
  allow write: if false; // ADR-009: Managed via double-custody API handshakes
}
```

---

## 6. Regression & Zero-Impact Certification

To ensure that the 370 passing regression assertions remain completely stable, Phase 7 establishes the following isolation guarantees:
1. **Phase 6A (Clinical Intakes & appointments):** No clinical logic, KMS credentials, or private consultation routes are modified or imported.
2. **Phase 6B (Workshops & Dynamic QR Passes):** Symposia schedules, check-in signatures, and participant registration remain 100% independent of stock counts.
3. **Phase 6C Milestones 1–3 (Redress, CRM, and Expenses):** 
   * CRM cohort aggregation query remains operational.
   * Expense recording APIs are preserved; however, a read-only integration is established such that logging raw material procurement automatically populates corresponding `product_batches` cost bases, enriching financial accrual reporting without breaking existing test schemas.

---

## 7. Preliminary Acceptance Criteria (Automated Testing Specifications)

When Phase 7 is authorized for development, the automated test harness (`scripts/testPhase7Inventory.ts`) will require:

1. **Stock Reconciliation Integrity (20 Tests):**
   * Validates active, reserved, and transit stock levels during mock checkouts.
   * Asserts concurrent stock reserve requests are thread-safe and prevent double-allocations.
2. **Dual-Custody Handshake Validation (25 Tests):**
   * Asserts inventory is locked from source on transfer request.
   * Asserts receiver confirmation successfully adds items to target branch and decrements transit pools.
   * Asserts unauthorized branch managers trying to intercept cross-branch transfers are rejected with `HTTP 403`.
3. **Quality Control & FEFO Expiry Routing (20 Tests):**
   * Confirms early expiry batches are exhausted first.
   * Confirms batches failing QC are skipped by the checkout engine.
4. **Supply Chain Forecasting Accuracy (15 Tests):**
   * Verifies mathematical precision of Days of Stock (DOS) calculations.
   * Verifies reorder alerts trigger exactly at calculated Reorder Points (ROP).

---

## 8. Audit Conclusion & Final Recommendation

Phase 7 represents a highly coherent, logically isolated, and business-critical progression for the platform, turning transactional actions into automated log entries, ensuring total product tracing (RA 11967/FDA), and protecting customer wellness records (RA 10173). 

**The architectural layout is robust, regression-safe, and fully ready for implementation upon separate executive authorization.**
