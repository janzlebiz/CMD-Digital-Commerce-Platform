# PHASE 3 PLAN — DESIGN & ARCHITECTURAL SPECIFICATION
## DATABASE INTEGRATION & PRODUCTION LAUNCH HARDENING

**Document ID:** SPEC-PHASE-3-PLAN  
**Project:** HCI CMD Digital Commerce Platform  
**Target Region:** Camarines Norte, Philippines  
**Authorized Scope:** Database Schemas, Multi-Role Role-Based Access Control (RBAC), Secure User Authentication, Column-Level Encryption, and Atomicity Hardening  
**Date of Specification:** September 26, 2026  

---

### I. ARCHITECTURAL REVIEW & CURRENT STATE (PHASE 2 BASELINE)

The platform is currently operating as a high-fidelity, client-side React and TypeScript e-commerce engine. All transaction variables, municipal directories, checkout coordinates, and tax-calculation configurations are executed client-side, persisting sandbox transactions locally inside the browser's `localStorage` (`hci_cmd_cart`, `hci_cmd_orders`, etc.).

#### 1.1 Certified Controls to Preserve (Phase 0–2 Invariants)
- **COMP-MED-001 (Zero Therapeutic Claims):** No medical, disease-prevention, or curing claims. Trace-mineral drops descriptions are limited to nutritional biochemistry.
- **COMP-FDA-001 (FDA Presentation Notice):** Clear product catalog disclosures that specific volume allocations (65 mL Flagship Bottle and 30 mL Compact Dropper) are pending business evidence confirmation.
- **COMP-TAX-001/002 (Tax Recalculation Engine & BIR Seal):** Clear tax differentiation logic. The interactive VAT vs. Non-VAT configurations must remain fully functional.
- **COMP-PRV-001 (Data Privacy and Sovereignty):** All user data entry remains completely client-side in standard environments, and any transition to server/cloud storage must maintain rigorous encryption and isolation.

---

### II. PHASE 3 OBJECTIVES & OPERATIONAL GOALS

Phase 3 transitions the platform from a local, single-session sandbox into a multi-user, regional platform with shared server persistence, explicit access control isolation, and secure operational monitoring.

The core objectives are:
1. **Establish Single Source of Truth (SSOT):** Migrating orders, cart state, inventory ledgers, and clinic schedules to a secure database.
2. **Implement Role-Based Access Control (RBAC):** Restricting data access strictly by role, protecting confidential health intake records, and isolating branch staff logs.
3. **Audit Trail & State-Transition Hardening:** Ensuring every transaction and clinical access event is locked with secure server-side timestamps.
4. **Health Data Isolation (Data Sovereignty):** Enforcing column-level data encryption on consultation intake forms in accordance with **RA 10173 (Data Privacy Act of 2012)**.

---

### III. DETAILED DATABASE SCHEMAS (SPECIFIED PHYSICAL MODELS)

The primary persistence engine is defined using a relational/document hybrid schema to support transactional integrity, row-locking (for stock reservations), and nested subcollections.

#### 3.1 Collection / Table: `users` (User Profiles)
Stores core identities, contact information, and role taxonomies.
```typescript
interface UserProfile {
  uid: string;                 // Matches Auth UID (UUID/UID ID)
  email: string;               // User's email
  emailVerified: boolean;      // Anti-spoofing verification flag
  firstName: string;           // Max 64 chars
  lastName: string;            // Max 64 chars
  phone: string;               // Format: +639XXXXXXXXX
  role: 'customer' | 'staff' | 'practitioner' | 'manager' | 'admin';
  assignedBranchId?: string;   // Null for customers, required for branch staff/managers
  createdAt: Timestamp;        // Server-side request time
  updatedAt: Timestamp;        // Server-side request time
}
```

#### 3.2 Collection / Table: `orders` (Sandbox Sales Records)
Retains e-commerce transaction state and BIR-style demonstrations.
```typescript
interface OrderRecord {
  id: string;                  // Format: HCI-CMD-YYYYMMDD-XXXX
  userId: string;              // Client purchaser ID
  createdAt: Timestamp;        // Server timestamp
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    province: "Camarines Norte";
    municipality: string;      // Restrict to 12 municipal list
    barangay: string;
    addressLine1: string;
  };
  items: Array<{
    skuId: string;
    name: string;
    volume: string;
    quantity: number;          // Min: 1, Max: 100
    unitPrice: number;
    totalPrice: number;
  }>;
  fulfillmentMethod: 'pickup' | 'delivery';
  pickupBranchId?: string;     // Must map to branch network
  shippingFee: number;         // Fixed: 150.00 or 0
  subtotal: number;
  vatAmount: number;
  vatableSales: number;
  nonVatExempt: number;
  total: number;
  isVatRegistered: boolean;
  paymentMethod: 'gcash' | 'maya' | 'bank_transfer' | 'cash_on_pickup';
  paymentStatus: 'pending_payment' | 'paid' | 'payment_verification_required';
  fulfillmentStatus: 'pending_processing' | 'ready_for_pickup' | 'in_transit' | 'completed' | 'cancelled';
}
```

#### 3.3 Collection / Table: `branch_inventory` (Stock Ledger)
Atomic stock reservation and ledger control.
```typescript
interface InventoryRecord {
  skuId: string;               // SKU Identifier
  branchId: string;            // Target branch identifier (Daet, Labo, etc.)
  stockCount: number;          // Current count (Atomic decrements on reservation)
  reorderThreshold: number;    // Reorder notification trigger
  lastReplenishedAt: Timestamp; // Audit log
}
```

#### 3.4 Collection / Table: `consultation_intakes` & `consultation_notes`
Enforces the **Health Data Boundary** using **RA 10173 Section 13(a) Standalone Digital Consent**.
```typescript
interface ConsultationIntake {
  id: string;                  // Unique appointment ID
  userId: string;              // Client purchaser ID
  practitionerId: string;      // Assigned wellness practitioner
  scheduledAt: Timestamp;      // Selected calendar slot
  deliveryMode: 'in_person' | 'virtual' | 'followup';
  consentSigned: boolean;      // MUST be true (Blocks save if false)
  consentTimestamp: Timestamp; // Accurate audit time
  
  // SENSITIVE PERSONAL INFORMATION — COLUMN ENCRYPTED (AES-256-GCM)
  // Saved as ciphertext strings to prevent disclosure via database dumps or unauthorized reads.
  encryptedClinicalIntake: {
    dietaryHabits: string;      // Ciphertext string
    waterConsumption: string;   // Ciphertext string
    declaredConditions: string; // Ciphertext string
  };
}

interface ClinicalNote {
  id: string;
  consultationId: string;
  practitionerId: string;
  notesNarrative: string;       // ENCRYPTED (AES-256-GCM)
  recommendations: {
    hydrationDilution: string;  // Plaintext nutritional guide
    lifestyleSuggestions: string; // Plaintext guide
  };
  createdAt: Timestamp;
}
```

---

### IV. TECHNICAL DEPENDENCIES & WORKFLOWS

#### 4.1 Integration Infrastructure Options
Depending on final runtime environment constraints:
- **Primary Standard Path:** **Firebase / Firestore / Auth**. This is optimal due to built-in secure Attribute-Based Access Control (ABAC) via `firestore.rules` and instant single-sign-on (SSO).
- **Relational SQL Database Path:** **PostgreSQL + Drizzle ORM**. Required if direct ACID multi-row table joins and backend API controller execution are designated.

#### 4.2 Security & Data Privacy Constraints (RA 10173 Zero-Trust)
1. **Verified Users Restriction:** Every critical write operation (orders, intakes, schedules) requires `request.auth.token.email_verified == true`.
2. **PII Split-Collection Strategy:** All customer profiles will split private identifiers (TIN, PII addresses, clinic intake forms) into distinct restricted directories (e.g. `/users/{userId}/private/info`) allowing access only to the verified owner and assigned naturopathic practitioner.
3. **Application-Layer Envelope Encryption:** The client application encrypts the sensitive clinical assessment text using `AES-256-GCM` before dispatching to the persistence layer, safeguarding client data sovereignty.

---

### V. PHASE 3 SYSTEM ACCEPTANCE CRITERIA

Before Phase 3 can be certified as `PASS / CERTIFIED`, it must clear the following programmatic tests:
- [ ] **Auth Enforcement Test:** Direct database write attempts from unauthenticated or unverified users are blocked (`PERMISSION_DENIED`).
- [ ] **Stock Reservation Atomic Check:** Simultaneous checkout requests for the same SKU count must decrement inventory without racing or overallocation.
- [ ] **Health Data Boundary Audit:** Running a database dump shows the `dietaryHabits` and `clinical_assessment` fields as secure encrypted ciphertext.
- [ ] **Role Isolation Test:** A user with a `staff` or `customer` role attempting to read a `ClinicalNote` document gets blocked immediately.
- [ ] **Preservation check:** All statutory Food Supplement notices, BIR placeholder warnings, and sandbox payment disclosures remain perfectly rendered in the UI.

---

### VI. STAGE GATE ATTISTRATION

**PLATFORM GATE STATUS:** **PHASE 3 — DESIGN BASELINE CERTIFIED**  
The Phase 3 objective, database architecture, security constraints, and data-protection models are fully defined.

*This specification is logged and locked in the platform registry. We halt at the Phase 3 gate to await review and explicit directive to begin code execution.*
