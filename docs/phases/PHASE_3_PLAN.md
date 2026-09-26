# PHASE 3 PLAN — DESIGN & ARCHITECTURAL SPECIFICATION
## DATABASE INTEGRATION & PRODUCTION LAUNCH HARDENING (DESIGN SAFEGUARDS)

**Document ID:** SPEC-PHASE-3-PLAN  
**Project:** HCI CMD Digital Commerce Platform  
**Target Region:** Camarines Norte, Philippines  
**Selected Database Architecture:** **Firebase (Firestore & Authentication)**  
**Date of Specification:** September 26, 2026  

---

### I. ARCHITECTURAL REVIEW & CURRENT STATE (PHASE 2 BASELINE)

The platform currently operates as a high-fidelity, client-side React and TypeScript e-commerce engine. All transaction variables, municipal directories, checkout coordinates, and tax-calculation configurations are executed client-side, persisting sandbox transactions locally inside the browser's `localStorage` (`hci_cmd_cart`, `hci_cmd_orders`, etc.).

#### 1.1 Certified Controls to Preserve (Phase 0–2 Invariants)
- **COMP-MED-001 (Zero Therapeutic Claims):** No medical, disease-prevention, or curing claims are permitted. Trace-mineral drops descriptions are limited to nutritional biochemistry.
- **COMP-FDA-001 (FDA Presentation Notice):** Clear product catalog disclosures that specific volume allocations (65 mL Flagship Bottle and 30 mL Compact Dropper) are pending business evidence confirmation.
- **COMP-TAX-001/002 (Tax Recalculation Engine & BIR Seal):** Clear tax differentiation logic. The interactive VAT vs. Non-VAT configurations must remain fully functional.
- **COMP-PRV-001 (Data Privacy and Sovereignty):** All user data entry remains completely client-side, and any transition to server/cloud storage must maintain rigorous encryption and isolation.

---

### II. CHOSEN DATABASE ARCHITECTURE: FIREBASE (FIRESTORE & AUTH)

To support the rapid scale-to-zero capabilities, granular document-level security rules, and instant single-sign-on (SSO) required for the regional platform across Camarines Norte, **Firebase (Firestore and Authentication)** is selected as the sole database architecture. 

Firestore's standard Enterprise-tier collection model and `firestore.rules` provide a robust framework for implementing absolute Attribute-Based Access Control (ABAC) and security isolation directly.

---

### III. DESIGN SAFEGUARDS & CORE ARCHITECTURAL INVARIANTS

The following are **proposed design safeguards** for future implementation. They do not represent already-implemented production controls on the live platform (which remains fully client-side and sandbox-isolated).

#### 3.1 Server-Authoritative Role-Based Access Control (RBAC)
Relying solely on frontend flags or basic email attributes (e.g. `emailVerified`) to grant administrative or staff authorization is rejected. 
- **Safeguard:** Authorization must be strictly validated server-side by checking the incoming `request.auth.uid` against a protected `/users/{userId}` metadata document inside `firestore.rules` or via a secure backend authentication hook. 
- Any field that alters user permissions (such as `role`) is strictly immutable by the user and can only be set by verified administrative functions.

#### 3.2 Production Key Management (KMS) Design for Sensitive Personal Information
Relying on hardcoded or undefined client-side encryption keys for clinical assessments is rejected.
- **Safeguard:** For fields containing sensitive personal health information (intake answers and clinical session notes), application-layer envelope encryption using `AES-256-GCM` will be managed via **Google Cloud Key Management Service (Cloud KMS)**.
- Encryption keys are derived per user-session by exchanging a cryptographically signed OAuth session token with a secure server-side proxy endpoint. This proxy queries Cloud KMS to decrypt the session-specific key wrapper. The plaintext data key is only decrypted and held in volatile, non-persistent client memory during an active, authenticated practitioner session, preventing key leakage or persistent client-side key storage.

#### 3.3 Server-Authoritative Commercial Calculations & Inventory Ledger
Allowing the client to post final prices, tax categories, payment states, or inventory decrements directly is rejected.
- **Safeguard:** The frontend client will only submit a "request to transact" payload containing SKU IDs and quantities. 
- All final grand totals, VAT/Non-VAT allocations, shipping fees, payment statuses, and inventory counts are computed and verified strictly on the server (via Cloud Functions or secure transaction boundaries) before recording the order document. 
- Inventory counts must be atomically checked and decremented within an isolated transactional batch to prevent overselling. Fulfillment state transitions (such as advancing from `Pending` to `In Transit`) are validated strictly on the server against authorized staff roles.

#### 3.4 Data Minimization Principles
The platform will strictly adhere to the principle of data minimization as mandated under **RA 10173**:
- No corporate TINs, detailed government tax identifiers, consumer birthdays, or secondary PII will be collected or stored in the database without an explicit, verified operational requirement.
- User data captured will be limited strictly to the minimal fields necessary to execute local sandbox checkout and contact delivery (First Name, Last Name, Email, Phone, and Municipal Delivery Address).

---

### IV. REVISED PROPOSED DATABASE SCHEMAS

The following schemas represent the planned database records structure incorporating these safeguards.

#### 4.1 Collection: `/users/{userId}`
Stores core identities, minimal contact info, and role taxonomies.
```typescript
interface UserProfile {
  uid: string;                 // Matches Auth UID (UUID)
  email: string;               // User's email
  firstName: string;           // Max 64 chars
  lastName: string;            // Max 64 chars
  phone: string;               // Format: +639XXXXXXXXX
  role: 'customer' | 'staff' | 'practitioner' | 'manager' | 'admin';
  assignedBranchId?: string;   // Null for customers, required for branch staff/managers
  createdAt: Timestamp;        // Server-side request time
  updatedAt: Timestamp;        // Server-side request time
}
```

#### 4.2 Collection: `/orders/{orderId}`
Retains e-commerce transaction state with server-authoritative calculations and normalized fields.
```typescript
interface OrderRecord {
  id: string;                  // Format: HCI-CMD-YYYYMMDD-XXXX
  userId: string;              // Client purchaser ID
  createdAt: Timestamp;        // Server-computed timestamp
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
    quantity: number;          // Verified on server (Min: 1, Max: 100)
    unitPrice: number;         // Server-fetched SRP
    totalPrice: number;        // Server-computed (SRP * quantity)
  }>;
  fulfillmentMethod: 'pickup' | 'delivery';
  pickupBranchId?: string;     // Must map to branch network
  shippingFee: number;         // Computed strictly on server
  subtotal: number;            // Computed strictly on server
  vatAmount: number;           // Computed strictly on server
  vatableSales: number;        // Computed strictly on server
  nonVatSales: number;         // Renamed nonVatExempt for Phase 2 alignment
  total: number;               // Computed strictly on server
  isVatRegistered: boolean;    // Computed strictly on server
  paymentMethod: 'gcash' | 'maya' | 'bank_transfer' | 'cash_on_pickup';
  paymentStatus: 'pending_payment' | 'paid' | 'payment_verification_required';
  fulfillmentStatus: 'pending_processing' | 'ready_for_pickup' | 'in_transit' | 'completed' | 'cancelled';
}
```

#### 4.3 Collection: `/branch_inventory/{inventoryId}`
Proposed atomic branch inventory schema.
```typescript
interface InventoryRecord {
  skuId: string;               // SKU Identifier
  branchId: string;            // Target branch identifier (Daet, Labo, etc.)
  stockCount: number;          // Decremented via server transaction boundaries
  reorderThreshold: number;    // Reorder notification trigger
  lastReplenishedAt: Timestamp; // Server-side audit log
}
```

#### 4.4 Collection: `/consultation_intakes/{intakeId}`
Enforces highly granular health-data consent tracking and application-layer encryption.
```typescript
interface ConsultationIntake {
  id: string;                  // Unique appointment ID
  userId: string;              // Client purchaser ID
  practitionerId: string;      // Assigned wellness practitioner
  scheduledAt: Timestamp;      // Selected calendar slot
  deliveryMode: 'in_person' | 'virtual' | 'followup';
  
  // EXPANDED DATA PRIVACY CONSENT RECORD (RA 10173 compliant)
  consentRecord: {
    purpose: "Naturopathic Wellness Education & Hydration Coaching";
    version: "v1.0-2026-09";
    timestamp: Timestamp;       // Time explicit digital consent was captured
    withdrawalState: {
      isWithdrawn: boolean;
      withdrawnAt?: Timestamp;
      withdrawalMethod?: string; // e.g. "digital_opt_out", "branch_written_request"
    };
  };

  // SENSITIVE PERSONAL INFORMATION — ENCRYPTED VIA SERVER-PROXY TRANSIT KEY (Cloud KMS)
  encryptedClinicalIntake: {
    dietaryHabits: string;      // Ciphertext string
    waterConsumption: string;   // Ciphertext string
    declaredConditions: string; // Ciphertext string
  };
}
```

---

### V. SYSTEM ACCEPTANCE CRITERIA

Before Phase 3 features can be fully implemented, compiled, and certified on the live platform, they must clear the following proposed acceptance tests:
- [ ] **Auth Enforcement Test:** Direct database write attempts from unauthenticated or unverified users are blocked via `firestore.rules`.
- [ ] **Server-Authoritative Pricing Check:** Any client attempts to checkout with modified item prices or incorrect tax rates must be rejected by the server controller.
- [ ] **Cloud KMS Key Separation Check:** Direct database dumps of the `/consultation_intakes` collection must yield ciphertext for health-related variables.
- [ ] **Role Validation Test:** Customers or staff attempting to write directly to database roles get blocked instantly.

---

### VI. STAGE GATE ATTESTATION

**PLATFORM GATE STATUS:** **PHASE 3 — REVISED DESIGN SPECIFICATION LOCKED**  
The Phase 3 objective, selected architecture, and security design safeguards are fully updated.

*All application files remain in their secure, certified Phase 2 client-side sandbox states. We stop at the execution gate to await further verification and directive before code implementation begins.*
