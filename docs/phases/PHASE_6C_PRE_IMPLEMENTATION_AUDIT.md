# Phase 6C: Pre-Implementation Security, Privacy & Architectural Audit

**Document Reference:** `docs/phases/PHASE_6C_PRE_IMPLEMENTATION_AUDIT.md`  
**Evaluation Target:** Milestone 6C (CRM/Account Segmentation, Health Data Privacy Firewall, RA 11967 Dispute Redress with 7-Day SLA Escalation, Municipality Geolocation & Replenishment Cohorts)  
**Baseline Certified:** Phase 0–6B (89/89 automated tests passing: 53 Phase 6A + 36 Phase 6B)  
**Audit Date:** 2026-09-27  
**Status:** Pre-Implementation Architectural Assessment  

---

## 1. Executive Summary & Audit Mandate

This pre-implementation audit provides an exhaustive architectural, security, and statutory assessment of the proposed **Phase 6C** capabilities for the **HCI Cell Mineral Drops (CMD) Digital Commerce & Naturopathic Wellness Platform**.

Phase 6C is designed to establish commercial customer lifecycle operations, consumer redress mechanisms under **Republic Act No. 11967** (Internet Transactions Act of 2023 / ITA), and municipality-level replenishment logistics across Camarines Norte, while maintaining an uncompromised **Health Data Privacy Firewall** under **Republic Act No. 10173** (Data Privacy Act of 2012 / DPA) and preserving our **ADR-009 Network-Only** server-authoritative architecture.

**CRITICAL IMPLEMENTATION MANDATE:**  
This document is strictly an audit and planning evaluation. **No Phase 6C application code, endpoints, schemas, rules, or test files have been created or modified.** Phase 6C implementation has **not** started.

---

## 2. Distinction Between Existing Architecture and Unimplemented Proposed Scope

To ensure complete clarity for engineering and compliance reviews, the table below explicitly delineates between **existing capabilities from Phase 0–6B** and **proposed Phase 6C components that DO NOT YET EXIST in the codebase**.

### 2.1 Capability Status Matrix

| Component / Subsystem | Status | Description / Location |
| :--- | :---: | :--- |
| **User Identity & Roles** (`customer`, `practitioner`, `branch_manager`, `regional_director`, `super_admin`) | **EXISTING (Phase 0–6B)** | Implemented in `server.ts`, `src/types/index.ts`, `src/context/AuthContext.tsx`. |
| **Orders & Commerce Data Store** (`/orders/{orderId}`) | **EXISTING (Phase 0–6B)** | Active collection storing shipping addresses, line items, totals, and branch assignments. |
| **Clinical Intakes & KMS Envelope Encryption** (`/consultation_intakes/{intakeId}`) | **EXISTING (Phase 6A)** | AES-256-GCM encrypted SPI payloads wrapped by Google Cloud KMS; access locked strictly to assigned practitioners. |
| **Consultation Appointments & Assignments** | **EXISTING (Phase 6A)** | `/consultation_appointments` and `/consultation_assignments` collections active with OCC booking. |
| **Workshops Catalog & HMAC-SHA256 Passes** | **EXISTING (Phase 6B)** | `/workshops`, `/workshop_registrations`, dynamic QR signing, and branch check-in enforcement active. |
| **ADR-009 Server-Authoritative Firestore Rules** | **EXISTING (Phase 0–6B)** | Direct client writes denied (`allow write: if false;`) across operational collections in `firestore.rules`. |
| **Append-Only Audit Logging** (`/audit_logs`) | **EXISTING (Phase 0–6B)** | `logAuditEvent` helper in `server.ts` recording actor, role, branch, action, and scrubbed metadata. |
| **Support Tickets Collection & Schema** (`/support_tickets/{ticketId}`) | **NOT YET IMPLEMENTED** | Does **NOT** exist in `firebase-blueprint.json` or `firestore.rules`. |
| **Support Ticket Express Endpoints** (`/api/support/*`) | **NOT YET IMPLEMENTED** | Does **NOT** exist in `server.ts`. |
| **CRM Segment Express Endpoints** (`/api/crm/*`) | **NOT YET IMPLEMENTED** | Does **NOT** exist in `server.ts`. |
| **CRM Customer Segmentation & Analytics Engine** | **NOT YET IMPLEMENTED** | Server-authoritative aggregation engine does **NOT** exist. |
| **RA 11967 7-Day SLA Escalation Engine** | **NOT YET IMPLEMENTED** | Automatic breach detection and queue routing do **NOT** exist. |
| **Municipality Geolocation & Replenishment Cohort Engine** | **NOT YET IMPLEMENTED** | 12 Camarines Norte municipality parsing and 30–45 day reorder window calculator do **NOT** exist. |
| **Phase 6C Automated Test Suite** (`scripts/testPhase6CSupportCRM.ts`) | **NOT YET IMPLEMENTED** | Test runner file does **NOT** exist. |
| **Phase 6C Frontend Views** (`SupportTicketsView.tsx`, `CrmDashboardView.tsx`) | **NOT YET IMPLEMENTED** | Does **NOT** exist in `src/views/`. |

---

## 3. Comprehensive Scope Audit (10 Evaluation Vectors)

### 3.1 CRM & Account Segmentation
* **Current State (Phase 0–6B):** User documents reside in `/users/{userId}`, orders in `/orders/{orderId}`, and workshop registrations in `/workshop_registrations/{regId}`. No CRM aggregation or customer segmentation engine exists.
* **Proposed Scope (Phase 6C - NOT YET IMPLEMENTED):**
  - Implement server-side read/aggregation endpoints (`/api/crm/cohorts`, `/api/crm/customer-profile/:userId`) that categorize accounts based on commercial velocity:
    1. *Wholesale / Stockist Accounts* (orders with >= 5 units of CMD)
    2. *Repeat Retail Consumers* (multi-order history)
    3. *Wellness Seminar Attendees* (attended branch workshops)
    4. *Replenishment Due Cohort* (predicted bottle depletion window)
    5. *Lapsed / At-Risk Accounts* (no order placed in > 60 days)
* **Architectural Assessment:**
  - Existing collections provide complete transactional telemetry.
  - Segmentation will be computed purely on-the-fly or via server aggregation, eliminating the need to expose raw customer records to frontends or third-party marketing tools.

---

### 3.2 Health Data Privacy Firewall (Statutory SPI Isolation)
* **Current State (Phase 6A):**
  - Naturopathic consultation intake records reside in `/consultation_intakes/{intakeId}`.
  - All clinical narratives, dietary habits, and health declarations are encrypted via AES-256-GCM using Google Cloud KMS (`projects/gen-lang-client-0427039673/locations/global/keyRings/hic-cmd-keyring/cryptoKeys/clinical-spi-key`).
  - Access is strictly restricted: only the active assigned practitioner (`consultation_assignments` record with `active === true`) and the patient self can decrypt the record. Even `super_admin`, `regional_director`, and `branch_manager` are explicitly denied decryption access (HTTP 403 regression tested in Phase 6A Section 6.4.2).
* **Proposed Phase 6C Firewall Mandate:**
  - Under **Republic Act No. 10173 Section 13**, health and medical intake declarations constitute *Sensitive Personal Information (SPI)*. Commercial profiling using SPI without explicit medical consent is strictly prohibited.
  - The proposed `/api/crm/*` endpoints **MUST NEVER** query, join, or reference `/consultation_intakes`.
  - Non-practitioners (`branch_manager`, `regional_director`, CRM administrators, and `super_admin`) must remain completely locked out from clinical notes.
  - Only non-clinical engagement indicators (e.g., boolean flag `hasCompletedWellnessConsultation: true` without health notes, symptoms, or diagnoses) may be referenced in CRM profiles, subject to explicit consent verification.
* **Architectural Finding:** The existing Phase 6A KMS encryption and authorization layer provides an unyielding security barrier that fully guarantees complete SPI isolation.

---

### 3.3 RA 11967 Consumer Dispute & Redress Support Tickets with 7-Day SLA Escalation
* **Current State:** No support ticket or redress dispute capability currently exists in the platform.
* **Proposed Scope (Phase 6C - NOT YET IMPLEMENTED):**
  - Section 19 and Section 20 of the Philippine Internet Transactions Act of 2023 (RA 11967) mandate internal redress mechanisms for e-commerce platforms.
  - Platform must accept grievances concerning delivery delays, damaged items, incorrect dosages/quantities, and billing discrepancies.
  - Disputes must be acknowledged promptly and escalated if unresolved within seven (7) calendar days (`SLA_ESCALATION_MS = 7 * 24 * 60 * 60 * 1000`).
* **Technical Design for Implementation:**
  - Collection: `/support_tickets/{ticketId}`
  - Schema:
    - `id`: `TKT-YYYYMMDD-XXXX`
    - `userId`: Customer UID
    - `orderId`: Optional associated order ID
    - `branchId`: Branch handling order/ticket
    - `category`: `damaged_product` | `delivery_delay` | `billing_issue` | `product_inquiry` | `statutory_dpa_inquiry`
    - `subject`: Short text summary
    - `description`: Detailed consumer grievance
    - `status`: `submitted` | `under_investigation` | `escalated_sla_breach` | `resolved` | `closed`
    - `createdAt`: ISO 8601 timestamp
    - `slaDueAt`: ISO 8601 timestamp (`createdAt + 7 days`)
    - `isEscalated`: Boolean flag
    - `resolutionSummary`: Documented resolution or redress action
    - `resolvedAt`: ISO 8601 timestamp (optional)
    - `escalationHistory`: Array of escalation transitions
  - Automated Escalation Engine: When tickets remain unresolved past `slaDueAt`, the server flags `status = 'escalated_sla_breach'`, logs an audit failure, and routes the ticket to the Regional Director executive queue.

---

### 3.4 Municipality Geolocation & Replenishment / Reorder Cohorts
* **Current State:** Orders record customer shipping addresses (e.g., `barangay`, `cityOrMunicipality`, `province: 'Camarines Norte'`). No municipality categorization or reorder tracking exists.
* **Proposed Scope (Phase 6C - NOT YET IMPLEMENTED):**
  - Geolocation segmentation across the 12 municipalities of Camarines Norte:
    1. *Daet* (Provincial capital & central distribution hub)
    2. *Labo* (Agricultural wellness & northern hub)
    3. *Capalonga* (Coastal & pilgrimage wellness hub)
    4. *Paracale* (Mining & coastal community)
    5. *Jose Panganiban* (Industrial & seaport hub)
    6. *Basud* (Southern agricultural corridor)
    7. *Mercedes* (Major fisheries & coastal port)
    8. *San Vicente* (Forestry & eco-agriculture)
    9. *San Lorenzo Ruiz* (Upland farming community)
    10. *Talisay* (Agricultural & suburban sector)
    11. *Vinzons* (Historic & island tourism catchment)
    12. *Santa Elena* (Northern gateway border municipality)
  - Replenishment Cycle Modeling:
    - Standard 60ml CMD bottle contains ~1,000 ionic drops.
    - Standard dosage (10–20 drops/day) lasts ~50–60 days; active dosage (30–40 drops/day) lasts ~25–30 days.
    - Replenishment trigger: Customers whose most recent order was placed **30–45 days ago** are dynamically grouped into the `replenishment_due` cohort.
  - Data Minimization (RA 10173 Section 11): Geolocation is derived solely from municipality-level shipping addresses. No device GPS or invasive location tracking will be collected.

---

### 3.5 Privacy, Security & Threat Modeling
* **Identified Risks & Architectural Mitigations:**
  1. *Risk: Clinical Intake Leaked into CRM Profiles.*  
     *Mitigation:* Strict structural separation in `server.ts`. CRM endpoints query only `users`, `orders`, and `workshop_registrations`. Zero imports or queries to `consultation_intakes`.
  2. *Risk: Cross-Customer Ticket Scraping (IDOR).*  
     *Mitigation:* Ticket retrieval endpoints verify that `user.role === 'customer'` can ONLY view tickets where `ticket.userId === user.uid`. Any other ticket ID access yields `HTTP 403 Forbidden`.
  3. *Risk: Cross-Branch Ticket Tampering.*  
     *Mitigation:* `branch_manager` roles are strictly restricted to tickets where `ticket.branchId === user.assignedBranchId`. Cross-branch mutation attempts yield `HTTP 403 Forbidden` and log security audit failures.
  4. *Risk: Sensitive Information Leaked into Audit Logs.*  
     *Mitigation:* Audit log utility scrubs sensitive fields and logs only ticket IDs, status codes, and non-confidential transition categories.

---

### 3.6 RBAC & Branch Boundary Enforcement
* **Role Permissions Matrix (Proposed for Phase 6C):**

| Action / Resource | Customer | Practitioner | Branch Manager | Regional Director | Super Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Submit Support Ticket** | ALLOW (Own) | DENY | DENY | DENY | DENY |
| **View My Tickets** | ALLOW (Own) | DENY | DENY | DENY | DENY |
| **View Branch Tickets** | DENY | DENY | ALLOW (Assigned Branch) | ALLOW (All Branches) | ALLOW (All Branches) |
| **Resolve/Update Ticket** | DENY | DENY | ALLOW (Assigned Branch) | ALLOW (All Branches) | ALLOW (All Branches) |
| **View Escalated Tickets** | DENY | DENY | DENY | ALLOW (All Branches) | ALLOW (All Branches) |
| **View CRM Cohorts / Analytics** | DENY | DENY | ALLOW (Assigned Branch) | ALLOW (All Branches) | ALLOW (All Branches) |
| **View Clinical Intakes** | ALLOW (Own) | ALLOW (Assigned) | **DENY (SPI Firewall)** | **DENY (SPI Firewall)** | **DENY (SPI Firewall)** |

---

### 3.7 Proposed Firestore Schema & Security Rule Changes
* **Proposed Blueprint Schema (`firebase-blueprint.json`):**
  - Add `support_ticket` entity and `/support_tickets/{ticketId}` collection schema with validation types.
* **Proposed Firestore Rules (`firestore.rules`):**
  ```
  match /support_tickets/{ticketId} {
    allow get: if isSignedIn() && (
      isOwner(resource.data.userId) ||
      (isBranchManager() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.assignedBranchId == resource.data.branchId) ||
      isRegionalDirector() ||
      isSuperAdmin()
    );
    allow list: if isSignedIn() && (
      isBranchManager() ||
      isRegionalDirector() ||
      isSuperAdmin()
    );
    allow write: if false; // ADR-009: Strict Network-Only writes via server.ts
  }
  ```

---

### 3.8 ADR-009 Network-Only Requirements
* **Enforcement:**
  - All support ticket mutations, status updates, SLA calculations, and CRM analytics queries must execute exclusively through server-side Express routes (`/api/support/*`, `/api/crm/*`).
  - Strict `allow write: if false;` in `firestore.rules` ensures that no client SDK can bypass business logic, ticket assignment, or audit trails.
  - All mutations will be transactional and generate append-only audit events in `/audit_logs`.

---

### 3.9 Architectural Integration & Zero-Regression Isolation
* **Component Reuse:**
  - `requireAuth(req, res)`: Reused for all support and CRM endpoints.
  - `logAuditEvent(...)`: Reused to log dispute creation, SLA escalation, and resolution actions.
  - `db.runTransaction`: Reused for atomic ticket status transitions and SLA updates.
  - Customer shipping addresses from existing orders reused for municipality cohort aggregation.
* **Zero-Regression Guarantee:**
  - Phase 6A (Consultations, practitioner roster, Google Cloud KMS envelope encryption for clinical intakes) remains 100% isolated behind the SPI Firewall.
  - Phase 6B (Workshops catalog, dynamic HMAC-SHA256 attendance passes, branch check-in) remains 100% untouched.

---

### 3.10 Items Requiring Business, Legal & Regulatory Confirmation
The following items must be marked as **PENDING BUSINESS CONFIRMATION** in the codebase:
1. **Redress Monetary Settlement Protocol:** Specific financial disbursement channels for approved refund claims (cash on pickup vs. manual GCash/Maya refund vs. platform store credit) are pending commercial banking integration decisions.
2. **Automated Replenishment Messaging Channels:** Automated SMS or WhatsApp reminders for reorder cohorts require third-party telco gateway credentials (e.g., Semaphore or Twilio) and explicit opt-in consent checkboxes under RA 10173 Section 12. In-app notifications will serve as the baseline.
3. **Designated Data Protection Officer (DPO) & Redress Officer Roster:** The official DTI-registered consumer grievance officer and NPC-registered DPO identities remain marked as pending business appointment.

---

## 4. Required Phase 6C Automated Test Suite Specifications (To Be Built in Phase 6C)

To maintain our 100% test pass record (89/89 passing across Phase 6A/6B), Phase 6C will require an automated test runner (`scripts/testPhase6CSupportCRM.ts`) covering:

1. **Authentication & Authorization:**
   - Unauthenticated access to tickets and CRM endpoints rejected with HTTP 401.
   - Non-administrative roles querying branch CRM or escalated tickets rejected with HTTP 403.
2. **RA 11967 Support Ticket Lifecycle:**
   - Customer submits support ticket linked to an order -> HTTP 201 with calculated `slaDueAt` (exactly 7 days from `createdAt`).
   - Customer fetches own tickets -> HTTP 200 with ticket list.
   - Cross-customer ticket access blocked -> HTTP 403.
3. **Branch Isolation on Support Tickets:**
   - Branch manager from Daet querying tickets sees only Daet branch tickets.
   - Branch manager from Labo attempting to resolve Daet branch ticket is blocked with HTTP 403.
   - Regional Director and Super Admin can view and resolve tickets across all branches.
4. **SLA 7-Day Breach Escalation Engine:**
   - Ticket created with simulated past date (> 7 days elapsed) without resolution.
   - Querying escalation endpoint flags ticket as `escalated_sla_breach`, triggers audit event, and alerts Regional Director queue.
5. **Health Data Privacy Firewall Isolation:**
   - Administrative CRM customer profile query returns commercial, order, and workshop telemetry.
   - Verifies that zero clinical notes, encrypted intake payloads, or SPI fields are exposed in CRM outputs.
   - Unassigned staff attempting to read clinical intake via CRM are strictly rejected with HTTP 403.
6. **Municipality Geolocation & Replenishment Engine:**
   - Order history parsed into 12 Camarines Norte municipality cohorts.
   - Customers with orders placed 30–45 days ago identified in replenishment cohort.
   - Data minimization test: No GPS or sensitive location data leaked.

---

## 5. Audit Determination & Final Verdict

The existing platform architecture (Express backend on Node.js/TypeScript, Firebase Firestore with server-authoritative rules, Google Cloud KMS, and React Tailwind frontend) fully supports the required Phase 6C capabilities without breaking or weakening any prior security guarantees.

All components that do not yet exist have been explicitly delineated, architectural mitigations have been specified, and integration boundaries have been preserved.

### **READY FOR IMPLEMENTATION AFTER AUDIT REVIEW**
