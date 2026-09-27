# Phase 6C: Pre-Implementation Security, Privacy & Architectural Audit

**Document Reference:** `docs/phases/PHASE_6C_PRE_IMPLEMENTATION_AUDIT.md`  
**Evaluation Target:** Milestone 6C (CRM/Account Segmentation, Health Data Privacy Firewall, RA 11967 Dispute Redress with 7-Day SLA Escalation, Municipality Geolocation & Replenishment Cohorts)  
**Baseline Certified:** Phase 0–6B (89/89 automated tests passing: 53 Phase 6A + 36 Phase 6B)  
**Audit Date:** 2026-09-27  
**Status:** Pre-Implementation Architectural Assessment  

---

## 1. Executive Summary & Audit Mandate

This pre-implementation audit conducts an exhaustive analysis of the proposed **Phase 6C** capabilities for the **HCI Cell Mineral Drops (CMD) Digital Commerce & Naturopathic Wellness Platform**. 

Phase 6C bridges commercial operations, customer lifecycle management, regulatory consumer protection, and strict data privacy. Under Philippine law, digital commerce operations must strictly harmonize:
1. **Republic Act No. 10173** (Data Privacy Act of 2012 / DPA), specifically protecting Sensitive Personal Information (SPI) such as health declarations, consultation records, and clinical intake evaluations;
2. **Republic Act No. 11967** (Internet Transactions Act of 2023 / ITA), mandating transparent consumer redress mechanisms with strict internal dispute resolution timelines and escalation procedures; and
3. **ADR-009 Network-Only / Server-Authoritative Architecture**, guaranteeing that no client-side write access is granted to Firestore for critical operational or privacy-sensitive collections.

**Implementation Rule:** This audit strictly precedes code implementation. No Phase 6C application code is deployed in this turn.

---

## 2. Comprehensive Scope Audit (10 Evaluation Vectors)

### 2.1 CRM & Account Segmentation
* **Proposed Scope:** Segmentation of platform accounts based on purchasing velocity, order history, branch location, community seminar attendance, and reorder frequency.
* **Architectural Assessment:**
  - Customer accounts currently exist in `/users/{userId}` with role `'customer'`.
  - Orders are persisted in `/orders/{orderId}`, and workshop attendance is in `/workshop_registrations/{regId}`.
  - Segmentation must be computed **dynamically or via server-authoritative aggregation**, not by giving marketing/CRM tools arbitrary access to full user documents.
  - Proposed Segmentation Cohorts:
    1. *Wholesale / Stockist Accounts* (high-volume orders >= 5 units)
    2. *Repeat Retail Consumers* (multi-order history)
    3. *Wellness Seminar Attendees* (attended branch workshops)
    4. *Replenishment Due Cohort* (predicted bottle depletion window)
    5. *Lapsed / At-Risk Accounts* (no order > 60 days)
* **Reusability:** Existing `db.collection('orders')`, `db.collection('workshop_registrations')`, and `db.collection('users')` provide all necessary transactional telemetry.

---

### 2.2 Health Data Privacy Firewall (Statutory SPI Isolation)
* **Proposed Scope:** Absolute architectural separation between commercial CRM analytics and naturopathic health/clinical consultation data.
* **Statutory Requirement:** Under **RA 10173 Section 13**, health and clinical data constitute *Sensitive Personal Information (SPI)*. Processing is prohibited except with explicit statutory consent and strictly for the certified purpose. Under no circumstances may clinical notes, intake disclosures, dietary habits, or health conditions be ingested into commercial marketing, CRM profiling, or sales lead generation.
* **Firewall Controls:**
  - `consultation_intakes` contains AES-256-GCM encrypted payloads wrapped by Google Cloud KMS (`projects/gen-lang-client-0427039673/locations/global/keyRings/hic-cmd-keyring/cryptoKeys/clinical-spi-key`).
  - CRM queries **MUST NEVER** join or query `/consultation_intakes`.
  - Non-practitioners (`branch_manager`, `regional_director`, sales/CRM staff, and `super_admin`) remain completely locked out from clinical intake records (enforced by `server.ts` authorization gates and `firestore.rules` direct-write/direct-read deny rules).
  - Only non-clinical engagement indicators (e.g., boolean flag `hasCompletedWellnessConsultation: true` without health notes or diagnoses) may be referenced in CRM profiles, subject to explicit consent verification.

---

### 2.3 RA 11967 Consumer Dispute & Redress Support Tickets with 7-Day SLA Escalation
* **Proposed Scope:** Comprehensive customer redress ticketing system compliant with Section 19/20 of the Philippine Internet Transactions Act of 2023 (RA 11967).
* **Statutory Mandate:** 
  - Platforms must provide an internal redress mechanism for complaints regarding delivery delays, non-delivery, damaged or substandard items, incorrect orders, and billing discrepancies.
  - Complaints must be acknowledged promptly and escalated if unresolved within seven (7) calendar days (`SLA_ESCALATION_MS = 7 * 24 * 60 * 60 * 1000`).
* **Technical Design:**
  - Collection: `/support_tickets/{ticketId}`
  - Schema:
    - `id`: Unique ticket identifier (`TKT-YYYYMMDD-XXXX`)
    - `userId`: Customer UID
    - `orderId`: Associated order reference (optional for general consumer issues)
    - `branchId`: Branch handling delivery/fulfillment
    - `category`: `damaged_product` | `delivery_delay` | `billing_issue` | `product_inquiry` | `statutory_dpa_inquiry`
    - `subject`: Summary description
    - `description`: Detailed statement of grievance
    - `status`: `submitted` | `under_investigation` | `escalated_sla_breach` | `resolved` | `closed`
    - `createdAt`: ISO 8601 timestamp
    - `slaDueAt`: ISO 8601 timestamp (`createdAt + 7 days`)
    - `isEscalated`: Boolean flag dynamically evaluated or updated
    - `resolutionSummary`: Documented resolution or redress action
    - `resolutionTimestamp`: Date resolved
    - `escalationHistory`: Array of escalation logs
  - **Automated Escalation Rule:** If `Date.now() > Date.parse(ticket.slaDueAt)` and `status !== 'resolved' && status !== 'closed'`, the system marks the ticket `escalated_sla_breach`, routing it to the `regional_director` queue.

---

### 2.4 Municipality Geolocation & Replenishment / Reorder Cohorts
* **Proposed Scope:** Regional geolocation segmentation across the 12 municipalities of Camarines Norte and automated replenishment cohort modeling based on CMD dosage protocols.
* **Municipalities of Camarines Norte:**
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
* **Replenishment Cycle Modeling:**
  - Cell Mineral Drops (CMD) Standard 60ml bottle contains ~1,000 ionic drops.
  - Dilution protocols established in Phase 0:
    - *Maintenance*: 10–20 drops/day -> 1 bottle lasts 50–100 days (average 60 days).
    - *Therapeutic/Active*: 30–40 drops/day -> 1 bottle lasts 25–33 days (average 30 days).
  - Replenishment window trigger: Alert when elapsed days since order reaches **30–45 days** (reorder cohort).
* **Data Minimization (RA 10173 Section 11):** Geolocation is limited to Municipality/Barangay level for inventory logistics; exact GPS coordinates are not gathered or retained without explicit consumer opt-in.

---

### 2.5 Privacy and Security Implications
* **Threat Modeling:**
  1. *Unauthorized SPI Disclosure via CRM Dashboard:* Branch managers or support personnel viewing customer profiles must not see clinical intake data or health disclosures.
  2. *Data Leakage via Audit Logs:* Audit metadata must continue scrubbing tokens, passwords, SPI fields, and full ticket descriptions.
  3. *IDOR (Insecure Direct Object Reference) on Tickets:* Customers must be restricted to viewing and replying only to tickets matching their own `userId`. Cross-customer ticket scraping must return `HTTP 403`.
  4. *Branch Manager Isolation on Support Tickets:* Branch managers must only access tickets associated with their `assignedBranchId`.

---

### 2.6 RBAC & Branch Boundary Enforcement
* **Role Permissions Matrix for Phase 6C:**

| Action / Resource | Customer | Practitioner | Branch Manager | Regional Director | Super Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Submit Support Ticket** | ALLOW (Own) | DENY | DENY | DENY | DENY |
| **View My Tickets** | ALLOW (Own) | DENY | DENY | DENY | DENY |
| **View Branch Tickets** | DENY | DENY | ALLOW (Assigned Branch) | ALLOW (All Branches) | ALLOW (All Branches) |
| **Resolve/Update Ticket** | DENY | DENY | ALLOW (Assigned Branch) | ALLOW (All Branches) | ALLOW (All Branches) |
| **View Escalated Tickets** | DENY | DENY | DENY | ALLOW (All Branches) | ALLOW (All Branches) |
| **View CRM Cohorts / Analytics**| DENY | DENY | ALLOW (Assigned Branch) | ALLOW (All Branches) | ALLOW (All Branches) |
| **View Clinical Intakes** | ALLOW (Own) | ALLOW (Assigned) | **DENY (SPI Firewall)** | **DENY (SPI Firewall)** | **DENY (SPI Firewall)** |

---

### 2.7 Firestore Schemas & Security Rules
* **Proposed Rules Updates (`firestore.rules`):**
  - Collection `/support_tickets/{ticketId}`:
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
  - Blueprint schema updates in `firebase-blueprint.json` to register `support_ticket` entity and `/support_tickets/{ticketId}` collection.

---

### 2.8 ADR-009 Network-Only Requirements
* **Enforcement:**
  - Ticket creation, status updates, SLA escalation checks, resolution notes, and replenishment calculations must occur strictly through server-side Express API routes (`/api/support/*`, `/api/crm/*`).
  - No client-side direct writes to Firestore.
  - Server routes must validate authentication via `requireAuth`, log audit entries via `logAuditEvent`, and execute multi-document mutations inside atomic transactions.

---

### 2.9 Integration with Existing Phase 0–6B Architecture
* **Component Reuse:**
  - `requireAuth(req, res)`: Reused for all ticket and CRM endpoints.
  - `logAuditEvent(...)`: Reused to log ticket creations, status transitions, SLA escalations, and CRM segment lookups.
  - `db.runTransaction`: Reused for dispute resolution and ticket status state transitions.
  - `CustomerDetails.shippingAddress`: Reused for municipality geolocation cohort extraction.
  - `Navbar.tsx` & `App.tsx`: Navigation integration for customer support center and administrative CRM dashboard.
* **Non-Interference:**
  - Phase 6A (Consultation booking, practitioner roster, KMS envelope clinical intake encryption) remains 100% untouched and isolated behind the SPI Firewall.
  - Phase 6B (Workshops catalog, dynamic HMAC-SHA256 QR passes, branch check-in) remains 100% untouched.

---

### 2.10 Unresolved Business, Legal & Regulatory Decisions
The following business and policy choices must be explicitly marked as **PENDING BUSINESS CONFIRMATION** where implemented:
1. **Redress Monetary Settlement Protocol:** Specific financial disbursement channels for approved refund claims (cash on pickup vs. manual GCash/Maya refund vs. platform store credit) are pending commercial banking integration decisions.
2. **Automated Replenishment Messaging Channels:** Automated SMS or WhatsApp reminders for reorder cohorts require third-party telco gateway credentials (e.g., Semaphore or Twilio) and explicit opt-in consent checkboxes under RA 10173 Section 12. In-app notifications will serve as the baseline.
3. **Designated Data Protection Officer (DPO) & Redress Officer Roster:** The official DTI-registered consumer grievance officer and NPC-registered DPO identities remain marked as pending business appointment.

---

## 3. Required Test Suite Specifications (Phase 6C)

To maintain our 100% test pass record, Phase 6C will require an automated test suite (`scripts/testPhase6CSupportCRM.ts`) covering:

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

## 4. Audit Determination

The existing codebase architecture (Express backend on Node.js/TypeScript, Firebase Firestore with server-authoritative rules, Google Cloud KMS, and React Tailwind frontend) fully supports the required Phase 6C capabilities without breaking or weakening any prior security guarantees.

All risks have clear architectural remediations, and integration boundaries have been specified.

### **READY**

Phase 6C implementation may proceed safely upon authorization.
