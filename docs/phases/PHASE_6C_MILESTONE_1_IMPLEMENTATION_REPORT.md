# Phase 6C Milestone 1: Implementation & Security Remediation Report

**Document Reference:** `docs/phases/PHASE_6C_MILESTONE_1_IMPLEMENTATION_REPORT.md`  
**Milestone:** Phase 6C — Milestone 1: Support Tickets / RA 11967 Consumer Redress Foundation (with Security Remediation)  
**Statutory Authorities:** Republic Act No. 11967 (Internet Transactions Act of 2023), Republic Act No. 10173 (Data Privacy Act of 2012)  
**Verification Date:** 2026-09-27  
**Fulfillment Status:** Complete & Fully Remediated (Milestone 1 Foundation Only — CRM segmentation, municipality cohorts, and Phase 6D strictly NOT started)  
**Test Metrics:** **96 PASSED**, **0 FAILED** (Phase 6C suite) + **53 PASSED**, **0 FAILED** (Phase 6A suite) + **36 PASSED**, **0 FAILED** (Phase 6B suite) = **185 / 185 TOTAL TESTS PASSING**

---

## 1. Executive Summary & Statutory Implementation

This report documents the implementation and source-verified security remediation of **Milestone 1 of Phase 6C: Support Tickets & RA 11967 Consumer Redress Foundation** for the **HCI Cell Mineral Drops (CMD) Digital Commerce & Naturopathic Wellness Platform**.

Milestone 1 establishes a server-authoritative dispute resolution mechanism under the **Philippine Internet Transactions Act of 2023 (Republic Act No. 11967)**, providing structured consumer redress for complaints regarding damaged deliveries, shipping delays, payment/billing discrepancies, and product non-conformity.

### Core Statutory & Architectural Guarantees
1. **Mandatory 7-Day Internal Dispute SLA:** Every grievance ticket calculates a statutory deadline (`slaDueAt = createdAt + 7 calendar days`). Tickets exceeding this window without resolution are dynamically escalated to `escalated_sla_breach` and routed to the Regional Director executive queue.
2. **Customer Ownership Isolation:** Customers can create tickets and retrieve their own grievances, but cannot view or access another customer's ticket (cross-customer queries rejected with `HTTP 403 Forbidden`).
3. **Branch Boundary Isolation on Firestore Rules & Server:**
   - In `firestore.rules`, branch managers are restricted to tickets where `resource.data.branchId == get(...).assignedBranchId` for both `get` and `list`. Cross-branch listing is blocked at the rule level.
   - In `server.ts`, branch managers are isolated to their `assignedBranchId` for queries, single ticket views, and status updates.
4. **Authoritative Customer Ticket Branch Assignment:**
   - Client-provided `branchId` is never blindly trusted.
   - When an `orderId` is supplied, the server loads the order from Firestore, verifies customer ownership, validates the order's branch, and rejects mismatches with `HTTP 400`.
   - When no `orderId` is supplied, `branchId` is validated against platform `SUPPORTED_BRANCH_IDS` (`'daet'`, `'labo'`, `'capalonga'`, `'paracale'`, `'jose_panganiban'`, `'santa_elena'`). Invalid branches are rejected with `HTTP 400`.
5. **Executive Cross-Branch Oversight:** Regional Directors and Super Admins have cross-branch jurisdiction to review and resolve tickets across all regional facilities.
6. **Health Data Privacy Firewall (RA 10173):** Commercial support tickets are strictly isolated from the Google Cloud KMS envelope-encrypted naturopathic clinical intake store (`consultation_intakes`). Non-practitioners remain strictly locked out from clinical notes (`HTTP 403 Forbidden`).
7. **ADR-009 Network-Only Enforcement:** Direct client writes to Firestore are forbidden (`allow write: if false;` in `firestore.rules`). All mutations are executed via Express server endpoints (`/api/support/*`) wrapped inside transactions and backed by append-only audit logging.

---

## 2. Security Remediation Actions Taken

### 2.1 Remediation Issue 1: Firestore Branch-Manager List Isolation Fixed
- **Prior Finding:** In `firestore.rules`, `/support_tickets/{ticketId}` previously permitted `allow list: if isSignedIn() && (isBranchManager() || ...);` without verifying `assignedBranchId`.
- **Remediation Implemented:** Updated `firestore.rules` to enforce document-level branch equality on both `get` and `list`:
  ```
  match /support_tickets/{ticketId} {
    allow get: if isSignedIn() && (
      isOwner(resource.data.userId) ||
      (isBranchManager() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.assignedBranchId == resource.data.branchId) ||
      isRegionalDirector() ||
      isSuperAdmin()
    );
    allow list: if isSignedIn() && (
      isOwner(resource.data.userId) ||
      (isBranchManager() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.assignedBranchId == resource.data.branchId) ||
      isRegionalDirector() ||
      isSuperAdmin()
    );
    allow write: if false;
  }
  ```
- **Verification:** Added 13 automated tests in Section 9 of `scripts/testPhase6CSupportTickets.ts` proving that a branch manager querying outside their assigned branch or issuing an unfiltered query across all branches is rejected.

### 2.2 Remediation Issue 2: Customer Ticket Branch Assignment Validation Added
- **Prior Finding:** `POST /api/support/tickets` accepted `branchId` directly from request body without validating against supported branches or validating against the associated order.
- **Remediation Implemented:**
  - Exported `SUPPORTED_BRANCH_IDS` in `server.ts`.
  - Added order ownership verification (`orderData.userId === user.uid`).
  - Added order branch validation and strict branch mismatch check (`branchId !== orderBranch` -> HTTP 400).
  - Added standalone `branchId` validation against `SUPPORTED_BRANCH_IDS` (`HTTP 400` on invalid branch).
- **Verification:** Added dedicated regression tests in Section 2 proving arbitrary branches are rejected, mismatched order branches are rejected, and valid same-branch tickets succeed.

---

## 3. Exact Files Changed & Created

1. **`/firestore.rules`**:
   - Updated `allow list` condition on `/support_tickets/{ticketId}` to enforce `assignedBranchId == resource.data.branchId`.
2. **`/server.ts`**:
   - Exported `SUPPORTED_BRANCH_IDS`.
   - Updated `POST /api/support/tickets` with authoritative branch validation and associated order verification.
3. **`/scripts/testPhase6CSupportTickets.ts`**:
   - Added Section 9 (13 tests) verifying Firestore rule branch-manager list isolation and write prevention.
   - Updated Section 2 with 10 new branch and order validation tests. Total suite expanded from 74 to 96 assertions.
4. **`/docs/phases/PHASE_6C_MILESTONE_1_IMPLEMENTATION_REPORT.md`**:
   - Updated with complete remediation details and audit trail.

---

## 4. Automated Test Execution & Pass/Fail Metrics

### 4.1 Phase 6C Milestone 1 Suite (`scripts/testPhase6CSupportTickets.ts`)
- **Total Assertions Run:** 96
- **Passed:** **96**
- **Failed:** **0**

```
================================================================
   HCI CMD PHASE 6C — SUPPORT TICKETS & RA 11967 REDRESS SUITE   
================================================================
--- Running Section 1: Authentication & Authorization ---
[PASS] 1.1 Unauthenticated support tickets query rejected with HTTP 401
[PASS] 1.2 Unauthenticated ticket creation rejected with HTTP 401
[PASS] 1.3 Practitioner blocked from commercial support tickets (HTTP 403)
[PASS] 1.4 Rejection clearly states practitioner scope boundary
--- Running Section 2: Ticket Creation & RA 11967 7-Day SLA Calculation ---
[PASS] 2.1 Ticket creation without category rejected with HTTP 400
[PASS] 2.2 Ticket creation with invalid category rejected with HTTP 400
[PASS] 2.3 Ticket creation without branchId and without order rejected with HTTP 400
[PASS] 2.4 Customer attempting invalid branch rejected with HTTP 400
[PASS] 2.5 Rejection lists supported platform branch identifiers
[PASS] 2.6 Ticket referencing non-existent order rejected with HTTP 404
[PASS] 2.7 Customer referencing another user's order rejected with HTTP 403
[PASS] 2.8 Customer attempting different branch than associated order rejected with HTTP 400
[PASS] 2.9 Error explicitly identifies branch mismatch with order
[PASS] 2.10 Valid same-branch ticket creation with order succeeds with HTTP 201
[PASS] 2.11 Ticket branchId matches order authoritative branch (labo)
[PASS] 2.12 Ticket accurately references associated orderId
[PASS] 2.13 Valid standalone support ticket creation succeeds with HTTP 201
[PASS] 2.14 Ticket identifier generated with authoritative prefix
[PASS] 2.15 Initial ticket status is SUBMITTED
[PASS] 2.16 Ticket bound to authenticated customer UID
[PASS] 2.17 Ticket branch set to Daet
[PASS] 2.18 Statutory 7-day SLA deadline calculated exactly as createdAt + 7 days (604,800,000 ms)
[PASS] 2.19 Ticket isEscalated initializes to false
[PASS] 2.20 Statutory consumer protection notice returned in API response
[PASS] 2.21 Ticket successfully persisted in support_tickets store
[PASS] 2.22 Persisted subject matches input payload
--- Running Section 3: Customer Ownership Isolation ---
[PASS] 3.1 Alice retrieves ticket list with HTTP 200
[PASS] 3.2 Alice sees exactly 1 ticket
[PASS] 3.3 Alice only sees her own ticket
[PASS] 3.4 Bob retrieves ticket list with HTTP 200
[PASS] 3.5 Bob sees exactly 1 ticket
[PASS] 3.6 Bob only sees his own ticket
[PASS] 3.7 Alice blocked from viewing Bob's ticket (HTTP 403)
[PASS] 3.8 Customer ownership isolation error text verified
[PASS] 3.9 Customer blocked from administratively updating ticket status (HTTP 403)
--- Running Section 4: Branch Manager Branch Isolation ---
[PASS] 4.1 Daet manager fetches tickets with HTTP 200
[PASS] 4.2 Daet manager sees exactly 1 ticket
[PASS] 4.3 Daet manager sees only Daet branch ticket
[PASS] 4.4 Labo manager fetches tickets with HTTP 200
[PASS] 4.5 Labo manager sees exactly 1 ticket
[PASS] 4.6 Labo manager sees only Labo branch ticket
[PASS] 4.7 Labo manager blocked from viewing Daet ticket (HTTP 403)
[PASS] 4.8 Cross-branch view denial error verified
[PASS] 4.9 Labo manager blocked from updating Daet ticket (HTTP 403)
[PASS] 4.10 Cross-branch update denial error verified
[PASS] 4.11 Daet manager updates Daet ticket with HTTP 200
[PASS] 4.12 Ticket status updated to UNDER_INVESTIGATION
[PASS] 4.13 Resolving ticket without resolutionSummary rejected with HTTP 400
[PASS] 4.14 Resolving ticket with summary succeeds with HTTP 200
[PASS] 4.15 Ticket status updated to RESOLVED
[PASS] 4.16 ResolvedByUid recorded accurately
[PASS] 4.17 ResolvedAt timestamp recorded
--- Running Section 5: Regional Director & Super Admin Cross-Branch Access ---
[PASS] 5.1 Regional Director queries tickets with HTTP 200
[PASS] 5.2 Regional Director sees all 3 tickets across branches
[PASS] 5.3 Super Admin queries tickets with HTTP 200
[PASS] 5.4 Super Admin sees all 3 tickets across branches
[PASS] 5.5 Regional Director updates Capalonga ticket with HTTP 200
[PASS] 5.6 Capalonga ticket successfully transitioned by Regional Director
--- Running Section 6: Dynamic 7-Day SLA Escalation Engine ---
[PASS] 6.1 Querying tickets executes successfully with HTTP 200
[PASS] 6.2 Overdue ticket isEscalated automatically set to true
[PASS] 6.3 Overdue ticket status transitioned to ESCALATED_SLA_BREACH
[PASS] 6.4 Escalation history records statutory SLA breach event
[PASS] 6.5 Escalation reason references RA 11967 SLA expiration
[PASS] 6.6 Fresh ticket within SLA remains unescalated (isEscalated: false)
[PASS] 6.7 Fresh ticket status remains SUBMITTED
[PASS] 6.8 Customer manual escalation succeeds with HTTP 200
[PASS] 6.9 Manually escalated ticket isEscalated set to true
[PASS] 6.10 Status updated to ESCALATED_SLA_BREACH
[PASS] 6.11 Manual escalation reason recorded in history
--- Running Section 7: Health Data Privacy Firewall Isolation ---
[PASS] 7.1 Branch manager queries support ticket with HTTP 200
[PASS] 7.2 Zero clinical ciphertext in support ticket payload
[PASS] 7.3 Zero KMS key material in support ticket payload
[PASS] 7.4 Branch manager blocked from decrypting clinical intake (HTTP 403)
[PASS] 7.5 Regional Director blocked from decrypting clinical intake (HTTP 403)
--- Running Section 8: ADR-009 Network-Only & Audit Trail Verification ---
[PASS] 8.1 Ticket created with HTTP 201
[PASS] 8.2 Ticket resolved with HTTP 200
[PASS] 8.3 Audit log recorded for support_ticket_created
[PASS] 8.4 Audit log records customer actor UID
[PASS] 8.5 Audit log records Daet branch ID
[PASS] 8.6 Audit log target resource is support_tickets
[PASS] 8.7 Audit log recorded for support_ticket_status_updated
[PASS] 8.8 Audit log records staff actor UID
[PASS] 8.9 Audit log records resolved status in metadata
--- Running Section 9: Firestore Rules & Branch Manager List Isolation ---
[PASS] 9.1 Firestore rules contain match block for /support_tickets/{ticketId}
[PASS] 9.2 ADR-009 Network-Only write rule enforced (allow write: if false)
[PASS] 9.3 Firestore list rule enforces branch manager assignedBranchId equality with ticket branchId
[PASS] 9.4 Branch manager Daet querying Daet branch tickets is permitted on list
[PASS] 9.5 Branch manager Daet querying Labo branch tickets is strictly rejected on list
[PASS] 9.6 Branch manager Daet attempting unfiltered query across all branches is rejected on list
[PASS] 9.7 Branch manager Daet reading Daet ticket is permitted on get
[PASS] 9.8 Branch manager Daet attempting to read Labo ticket is strictly rejected on get
[PASS] 9.9 Regional Director listing across all branches is permitted
[PASS] 9.10 Super Admin listing across all branches is permitted
[PASS] 9.11 Direct client write (create) to /support_tickets is strictly denied
[PASS] 9.12 Direct client write (update) to /support_tickets is strictly denied
[PASS] 9.13 Direct client write (delete) to /support_tickets is strictly denied
================================================================
   PHASE 6C SUITE COMPLETE: 96 PASSED, 0 FAILED   
================================================================
```

### 4.2 Cumulative Regression Health
- **Phase 6C Milestone 1 Suite (`scripts/testPhase6CSupportTickets.ts`):** **96 PASSED**, **0 FAILED**
- **Phase 6A Suite (`scripts/testPhase6AConsultations.ts`):** **53 PASSED**, **0 FAILED**
- **Phase 6B Suite (`scripts/testPhase6BWorkshops.ts`):** **36 PASSED**, **0 FAILED**
- **Total Suite Passing Across Milestones:** **185 / 185 PASSED**, **0 FAILED**

---

## 5. Scope Boundaries Confirmed

- **Firestore branch-manager list isolation**: Fixed & verified.
- **Customer ticket branch assignment validation**: Implemented & verified.
- **CRM segmentation**: NOT started.
- **Municipality / replenishment cohorts**: NOT started.
- **Phase 6C Milestone 2**: NOT started.
- **Phase 6D**: NOT started.
- **Halting condition**: Work halted after Milestone 1 security remediation.
