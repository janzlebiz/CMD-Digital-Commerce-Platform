# HCI CMD DIGITAL COMMERCE PLATFORM
## PHASE 5 — SOURCE RECONCILIATION AUDIT REPORT

**Document ID:** COMP-PHASE-5-RECONCILIATION  
**Project:** HCI CMD Digital Commerce Platform  
**Target Territory:** Camarines Norte, Philippines  
**Audit Standard:** PRD/TSD Compliance & Frozen Phase 0–4 Security Model Reconciliation  
**Audit Date:** September 26, 2026  
**Auditor:** Senior Technical Architect & Compliance Engine  
**Audit Constraint:** Zero Application Code Modifications Executed During Audit  

---

### I. EXECUTIVE AUDIT SUMMARY

This Source Reconciliation Audit evaluates the actual implemented codebase in the repository against:
1. The **Phase 5 Pre-Implementation Audit Report** (`PHASE_5_PRE_IMPLEMENTATION_AUDIT.md`)
2. The **Phase 5A Implementation Report** (`PHASE_5A_IMPLEMENTATION_REPORT.md`)
3. The **Phase 5B Implementation Report** (`PHASE_5B_IMPLEMENTATION_REPORT.md`)
4. The **Frozen Phase 0–4 Security Architecture** (Token Auth, Branch Isolation, Atomic Inventory, KMS Envelope Encryption, Fail-Closed Behavior).

#### Audit Summary Verdict:
While Phase 5A and the core server-side authentication and branch-isolation controls are operating securely, **critical discrepancies and security gaps** were identified in role definitions, inventory restocking fail-closed guarantees, and test suite verification rigor.

Consequently, **Phase 5B CANNOT legitimately be considered PASS in its current state**, and mandatory remediation is required before proceeding to Phase 5C.

```
================================================================
     PHASE 5 RECONCILIATION — REMEDIATION REQUIRED
================================================================
```

---

### II. COMPREHENSIVE FINDINGS MATRIX

Every inspected component is classified under one of the five mandatory audit categories:

| Item / Scope | Classification | Source Artifact | Description / Finding |
| :--- | :--- | :--- | :--- |
| **1. Token-Only Auth & Identity Extraction** | `VERIFIED` | `server.ts` (`requireAuth`) | Uses `auth.verifyIdToken()`. Completely ignores `x-user-id` and client body `userId`/`role`. |
| **2. Role Definition Alignment** | `DISCREPANCY` / `SECURITY GAP` | `firestore.rules` vs `src/types/index.ts` & `server.ts` | `firestore.rules` uses `isStaffOrManager()` checking `manager`, `staff`, `admin`, whereas app user records store `branch_manager`, `regional_director`, `super_admin`. |
| **3. Server Branch Isolation** | `VERIFIED` | `server.ts` (`/api/admin/orders/*`) | Strictly enforces `user.assignedBranchId === order.branchId` for non-super_admins. |
| **4. Order Creation Inventory Safety** | `VERIFIED` | `server.ts` (`/api/create-order`) | Fails closed with HTTP 400 when inventory record is missing or stock is insufficient. |
| **5. Order Cancellation Inventory Restock** | `DISCREPANCY` / `SECURITY GAP` | `server.ts` (lines 650–658) | If `branch_inventory` document is missing during cancellation, restocking is silently skipped (`if (invSnap.exists)`) and order is cancelled anyway instead of failing closed. |
| **6. Inventory Restock Test Verification** | `TEST COVERAGE GAP` | `scripts/testPhase5BAdmin.ts` (Test 9.2) | Test 9.2 only asserted `resCancel.status === 200`; mock harness `runTransaction` did not persist staged updates to store, masking restocking verification. |
| **7. Clinical KMS Envelope Encryption** | `VERIFIED` | `server.ts` (`encryptClinicalPayload`) | AES-256-GCM + Cloud KMS wrapped DEKs intact. Zeroes out DEK buffers and fails closed on error. |
| **8. Documentation Integrity** | `DOCUMENTATION ERROR` | `docs/phases/PHASE_5B_IMPLEMENTATION_REPORT.md` | Claimed order cancellation inventory restoration was state-verified, but test only checked HTTP status 200. |

---

### III. DETAILED DISCREPANCY & SECURITY GAP ANALYSIS

#### DISCREPANCY / SECURITY GAP #1: Role Definition Mismatch Between Firestore Security Rules and Server Authorization
- **Exact File:** `firestore.rules` (lines 20, 24, 28) vs. `src/types/index.ts` (line 146) vs. `server.ts` (lines 40, 515).
- **Affected Implementation:**
  - `firestore.rules` helper `isStaffOrManager()` evaluates:
    ```javascript
    function isStaffOrManager() {
      return hasRole('staff') || hasRole('manager') || hasRole('admin');
    }
    ```
  - `src/types/index.ts` and `server.ts` define the canonical application user roles as:
    ```typescript
    export type UserRole = 'customer' | 'practitioner' | 'branch_manager' | 'regional_director' | 'super_admin';
    ```
- **Security & Business Impact:**
  1. A legitimate user registered with `role: 'branch_manager'` in Firestore will be evaluated as `FALSE` by `firestore.rules` when attempting direct client SDK reads on `/orders/{orderId}` or `/users/{userId}`, returning `PERMISSION_DENIED`.
  2. Conversely, a user assigned legacy role `'manager'` in Firestore passes `firestore.rules` `isStaffOrManager()`, but is rejected by `server.ts` administrative endpoints with `HTTP 403` because `server.ts` checks `branch_manager`.
- **Required Remediation:**
  Update `firestore.rules` function `isStaffOrManager()` to include the canonical application roles:
  ```javascript
  function isStaffOrManager() {
    return hasRole('staff') || hasRole('manager') || hasRole('admin') || 
           hasRole('branch_manager') || hasRole('regional_director') || hasRole('super_admin');
  }
  ```
- **Required Regression Test:**
  Add a security rule test verifying that a user with `role: 'branch_manager'` in Firestore is granted read access to `/orders/{orderId}` for their assigned branch.

---

#### DISCREPANCY / SECURITY GAP #2: Non-Fail-Closed Inventory Restocking During Order Cancellation
- **Exact File:** `server.ts` (lines 647–658).
- **Affected Implementation:**
  In `POST /api/admin/orders/update-status`, when an order is cancelled (`isCancelling`), `server.ts` executes the following loop inside a transaction:
  ```typescript
  if (isCancelling && Array.isArray(orderData.items)) {
    for (const item of orderData.items) {
      const invRef = db.collection('branch_inventory').doc(`${orderBranchId}_${item.skuId}`);
      const invSnap = await transaction.get(invRef);
      if (invSnap.exists) {
        const currentStock = invSnap.get('stockCount') || 0;
        transaction.update(invRef, {
          stockCount: currentStock + item.quantity,
          lastReplenishedAt: FieldValue.serverTimestamp(),
        });
      }
    }
  }
  ```
- **Security & Business Impact:**
  If the `branch_inventory` tracking document does not exist for a branch SKU during order cancellation, `server.ts` silently skips restocking (`if (invSnap.exists)` evaluates to false). The order status is updated to `'cancelled'` and returns `HTTP 200 { success: true }`.
  This violates the **Fail-Closed Inventory Guarantee** required by the Phase 0–4 architecture. Missing inventory records should abort the cancellation and fail closed with an explicit error, preventing untracked inventory leakage.
- **Required Remediation:**
  Modify `server.ts` to throw an explicit error inside the transaction if `!invSnap.exists`:
  ```typescript
  if (!invSnap.exists) {
    throw new Error(`Missing Inventory Record: Inventory tracking document does not exist for SKU '${item.skuId}' at branch '${orderBranchId}'. Cancellation aborted.`);
  }
  ```
- **Required Regression Test:**
  Add an automated test attempting to cancel an order for a branch SKU whose `branch_inventory` document is missing, asserting that the endpoint returns `HTTP 400` or `HTTP 500` error and the order status is **NOT** changed to `cancelled`.

---

#### TEST COVERAGE GAP & HARNESS DEFECT #3: Incomplete Inventory Restock Assertion & Mock Harness Flaw
- **Exact File:** `scripts/testPhase5BAdmin.ts` (lines 145–163, 516–525).
- **Affected Implementation:**
  1. The mock test harness `runTransaction` in `scripts/testPhase5BAdmin.ts` collected staged updates inside a `Map` but never committed them to `inventoryStore` or `ordersStore`.
  2. Test 9.2 in `scripts/testPhase5BAdmin.ts` asserted only `resCancel.status === 200`:
     ```typescript
     const resCancel = await makeRequest(server, '/api/admin/orders/update-status', 'POST', ...);
     assert(resCancel.status === 200, 'Test 9.2: Order status successfully updated to cancelled');
     ```
     Test 9.2 never fetched `harness.inventoryStore.get('daet_hci-cmd-65ml')` to assert that `stockCount` actually increased from 25 to 28.
- **Security & Business Impact:**
  A false pass signal was produced. Even if inventory restocking failed or was skipped due to `if (invSnap.exists)`, Test 9.2 still passed because it only verified `HTTP 200`.
- **Required Remediation:**
  1. Fix `runTransaction` in `scripts/testPhase5BAdmin.ts` harness to apply staged updates to `inventoryStore` and `ordersStore`.
  2. Update Test 9.2 to explicitly assert `inventoryStore.get('daet_hci-cmd-65ml').stockCount === 28` after order cancellation.
- **Required Regression Test:**
  State-level stock count assertion verifying exact numeric inventory restoration after cancellation.

---

#### DOCUMENTATION ERROR #4: Misleading Verification Claim in Phase 5B Report
- **Exact File:** `docs/phases/PHASE_5B_IMPLEMENTATION_REPORT.md` (Sections IV & VII).
- **Affected Implementation:**
  The report stated that order cancellation inventory restoration was "transactionally verified", whereas the automated test suite only checked `HTTP 200` status code.
- **Security & Business Impact:**
  Inaccurate verification status recorded in Phase 5 governance documentation.
- **Required Remediation:**
  Re-certify and update `PHASE_5B_IMPLEMENTATION_REPORT.md` following code remediation.

---

### IV. RECONCILIATION SUMMARY MATRIX

| Feature Domain | Phase 5A/5B Claim | Actual Source Code State | Audit Status |
| :--- | :--- | :--- | :--- |
| **Token-Only Authentication** | Verified token required; `x-user-id` rejected | `server.ts` `requireAuth()` verifies Bearer token via `auth.verifyIdToken()`; ignores headers/body spoofing | `VERIFIED` |
| **Branch Isolation** | `user.assignedBranchId === order.branchId` enforced | Enforced in `server.ts` for `/api/admin/orders` and `/api/admin/orders/update-status` | `VERIFIED` |
| **Role Consistency** | Unified role model across stack | Mismatch between `firestore.rules` (`manager`, `staff`) and app stack (`branch_manager`, `regional_director`) | `DISCREPANCY` |
| **Cancellation Restock Safety** | Fail-closed inventory restoration on cancellation | Silently skips restock if inventory document is missing (`if (invSnap.exists)`) | `SECURITY GAP` |
| **Test Verification Rigor** | Inventory restock state-verified in tests | Test 9.2 only checked HTTP 200; mock harness didn't apply transaction updates | `TEST COVERAGE GAP` |
| **Cloud KMS Encryption** | AES-256-GCM + KMS envelope encryption intact | `server.ts` zeroes DEKs and fails closed on KMS errors | `VERIFIED` |

---

### V. REQUIRED REMEDIATION PLAN

Before Phase 5B can be certified as PASS and Phase 5C initiated, the following remediation sequence MUST be executed:

1. **Remediation Step 1 (`firestore.rules`):**
   Update `isStaffOrManager()` helper in `firestore.rules` to include `'branch_manager'`, `'regional_director'`, and `'super_admin'`. Deploy updated rules.
2. **Remediation Step 2 (`server.ts`):**
   In `POST /api/admin/orders/update-status`, throw an explicit error inside `runTransaction` if `!invSnap.exists` during order cancellation to ensure fail-closed behavior.
3. **Remediation Step 3 (`scripts/testPhase5BAdmin.ts`):**
   - Update harness `runTransaction` to apply staged updates to memory stores.
   - Add state-level stock count assertion in Test 9.2.
   - Add Test 9.3 verifying missing inventory document during cancellation throws HTTP 400/500 and aborts cancellation.
4. **Remediation Step 4 (Full Regression Run):**
   Re-run Phase 5A Identity Suite, Phase 4 Security Suite, Phase 3 Functions Suite, and updated Phase 5B Admin Suite.
5. **Remediation Step 5 (Report Re-certification):**
   Update `PHASE_5B_IMPLEMENTATION_REPORT.md` and re-issue `PHASE_5_SOURCE_RECONCILIATION_AUDIT.md` with `PHASE 5 RECONCILIATION — PASS`.

---

### VI. FINAL AUDIT VERDICT

Because the current implementation contains a non-fail-closed inventory gap during order cancellation, a role definition discrepancy in Firestore Security Rules, and incomplete test assertions, Phase 5B cannot be certified in its present state.

```
================================================================
     PHASE 5 RECONCILIATION — REMEDIATION REQUIRED
================================================================
```

PHASE 5 RECONCILIATION — REMEDIATION REQUIRED
