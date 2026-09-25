# Health Data Boundary & Sensitive Information Isolation Specification

**Document ID:** COMP-ARCH-005  
**Project:** HCI CMD Digital Commerce Platform  
**Compliance Context:** RA 10173 (Section 13 Sensitive Personal Information) & DOH/FDA Guidelines  
**Audit Phase:** Phase 0 — Architecture Isolation Baseline  
**Date:** 2026-09-25  

---

## 1. Architectural Isolation Rationale

Under Section 13 of the Philippine Data Privacy Act of 2012 (RA 10173), health information, medical history, physical condition, and biometric data are classified as **Sensitive Personal Information (SPI)**. The processing of SPI carries severe criminal liabilities and regulatory penalties for unauthorized disclosure, unauthorized processing, or data breaches.

In contrast, e-commerce orders, delivery addresses, product ratings, and event registrations are standard personal and commercial data processed under contractual necessity.

**The Golden Architectural Rule:**  
Health, naturopathic, and consultation data **MUST NEVER** be stored in the same tables, exposed through the same API endpoints, or viewable by the same user roles as retail e-commerce transactions.

---

## 2. Logical Separation Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PUBLIC & COMMERCE DATA BOUNDARY                      │
│                                                                        │
│  [Customer Account] ──► [Product Catalog] ──► [Cart / Checkout]        │
│          │                                           │                 │
│          ▼                                           ▼                 │
│  [Order History] ◄─── [Branch Fulfillment] ──► [Sales Invoice]         │
│                                                                        │
│  ACCESSIBLE BY: Customer, Branch Staff, Logistics Staff, Store Admin   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                       STRICT LOGICAL FIREWALL / RBAC
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                  RESTRICTED HEALTH CONSULTATION BOUNDARY               │
│                                                                        │
│  [Appointment Request] (Service Type, Practitioner, Branch, Timestamp) │
│          │                                                             │
│          ▼                                                             │
│  [Health Intake Form] (Lifestyle habits, wellness goals, diet)         │
│          │                                                             │
│          ▼                                                             │
│  [Practitioner Clinical Notes] (Encrypted column-level storage)        │
│          │                                                             │
│          ▼                                                             │
│  [Consultation Audit Log] (Every read, edit, or export strictly logged)│
│                                                                        │
│  ACCESSIBLE SOLELY BY: The Client Data Subject & Assigned Practitioner │
│  FORBIDDEN TO: Branch Staff, Inventory Clerks, Marketing, Store Admin  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Boundary Comparison

| Attribute | Public & E-Commerce Domain | Restricted Health Domain |
| :--- | :--- | :--- |
| **Legal Classification** | General Personal Information / Commercial Data | Sensitive Personal Information (SPI) |
| **Data Entities** | User ID, Name, Phone, Shipping Address, SKU, Quantity, Payment Status, Delivery Tracking. | Health Intake, Chief Complaints, Lifestyle Metrics, Dietary Logs, Practitioner Observations. |
| **Storage Schema** | Primary Public Tables (`orders`, `order_items`, `customers`, `shipments`). | Isolated Health Tables (`consultation_intakes`, `consultation_notes`, `practitioner_records`). |
| **Column Encryption** | Standard database-level encryption at rest. | Application-layer envelope encryption for clinical narrative fields (`AES-256-GCM`). |
| **Access Control (RBAC)** | `Customer`, `BranchStaff`, `LogisticsAgent`, `StoreAdmin`. | **Strictly:** `PatientUser` (own records) and `AssignedPractitioner`. |
| **Audit Logging** | Standard application operational logs. | High-security immutable audit log for every read, write, update, or export event. |
| **Data Export** | Order receipts, delivery slips, invoice PDFs. | Dedicated Patient Health Summary with practitioner attestation and privacy watermarking. |
| **Marketing Integration** | Permitted with opt-in consent for promotional campaigns. | **STRICTLY PROHIBITED.** Health records must never be consumed by marketing automations or CRM ads. |

---

## 4. Naturopathic Practitioner Access Protocol

1. **Practitioner Role Assignment:**
   - A practitioner account must be explicitly vetted and assigned the `ROLE_PRACTITIONER` by the System Administrator upon verification of naturopathic/wellness credentials.
   - Practitioners cannot assign themselves to arbitrary clients; access is granted **only upon confirmed appointment scheduling** with that specific client.
2. **Access Revocation:**
   - Once an active consultation lifecycle concludes (or client terminates the relationship), practitioner access is downgraded to read-only for historical compliance purposes, protected by session re-authentication.
3. **Emergency or Second-Opinion Consultation:**
   - Sharing a client's wellness profile with another practitioner requires **explicit in-app patient consent** authorizing the second practitioner.

---

## 5. Branch Staff Isolation Protocol

Physical branch staff (Daet, Labo, Paracale, Panganiban, Capalonga, Sta. Elena) perform order fulfillment, inventory stock counting, and in-person order handovers.
- **Rules for Branch Staff:**
  - Branch staff screens can only view: Customer Name, Order ID, Branch Pickup / Delivery status, Items ordered (e.g., "2x HCI CMD 65 mL"), and payment confirmation.
  - Branch staff interfaces **never** display whether a customer has attended a naturopathic consultation, what health concerns were discussed, or practitioner notes.
  - Even if a consultation occurs physically in a private room at a branch, the digital record remains restricted strictly to the practitioner's authenticated session.

---

## 6. Penetration & Security Testing Criteria (Phase 9 Gate)

During Phase 9 security audits, automated and manual tests must verify:
- [ ] Attempting to query `consultation_notes` with a `BranchStaff` JWT token results in `403 Forbidden`.
- [ ] Attempting to query another patient's health records with a `Customer` JWT token results in `403 Forbidden`.
- [ ] Direct database dumps reveal ciphertext for health narrative columns.
- [ ] Every invocation of a consultation record API triggers an immutable audit log entry containing actor timestamp and reason.
