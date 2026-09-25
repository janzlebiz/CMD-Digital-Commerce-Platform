# Health Data Boundary & Sensitive Information Isolation Specification

**Document ID:** COMP-ARCH-005 (Remediated)  
**Project:** HCI CMD Digital Commerce Platform  
**Compliance Context:** Republic Act No. 10173 (Section 13 Sensitive Personal Information) & NPC Directives  
**Audit Phase:** Phase 0 Remediation — Health Isolation Architecture  
**Date of Audit:** 2026-09-25  

---

## 1. Architectural Isolation Rationale & Legal Ground

Under Section 13 of the Philippine Data Privacy Act of 2012 (RA 10173), health information, medical history, physical condition, and dietary wellness intake data are classified as **Sensitive Personal Information (SPI)**. Processing SPI carries severe criminal liabilities and regulatory penalties for unauthorized disclosure, unauthorized processing, or data breaches.

**The Golden Architectural Rule:**  
Health, naturopathic, and consultation data **MUST NEVER** be stored in the same tables, exposed through the same API endpoints, or viewable by the same user roles as retail e-commerce transactions.

**Lawful Ground for Health Processing (Proposed Compliance Baseline):**  
Based on the currently documented proposed wellness-consultation model, processing is designed to rely on Section 13(a) explicit consent. Reassess Section 13(e) if the service later involves medical treatment, a medical practitioner, or a medical treatment institution. Standalone, granular informed consent is secured prior to capturing health intake questionnaires.

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
│  [Practitioner Clinical Notes] (Protected by column-level encryption)  │
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
| **Data Entities** | User ID, Name, Phone, Shipping Address, SKU, Quantity, Payment Status, Delivery Tracking. | Health Intake, Chief Lifestyle Complaints, Dietary Logs, Hydration Metrics, Practitioner Observations. |
| **Storage Schema** | Primary Public Tables (`orders`, `order_items`, `customers`, `shipments`). | Isolated Health Tables (`consultation_intakes`, `consultation_notes`, `practitioner_records`). |
| **Column Encryption** | Standard database-level encryption at rest (recommended control). | Application-layer envelope encryption for clinical narrative fields (`AES-256-GCM` recommended control). |
| **Access Control (RBAC)** | `Customer`, `BranchStaff`, `LogisticsAgent`, `StoreAdmin`. | **Strictly:** `PatientUser` (own records) and `AssignedPractitioner`. |
| **Audit Logging** | Standard application operational logs. | High-security immutable audit log for every read, write, update, or export event. |
| **Marketing Integration** | Permitted with opt-in consent for promotional campaigns. | **STRICTLY PROHIBITED.** Health records must never be consumed by marketing automations or CRM ads. |

---

## 4. Naturopathic Practitioner Access Protocol

1. **Practitioner Role Assignment:**
   - A practitioner account must be explicitly vetted and assigned the `ROLE_PRACTITIONER` by the System Administrator upon verification of naturopathic/wellness credentials.
   - Practitioners cannot browse arbitrary client wellness files; access is granted **only upon confirmed appointment scheduling** with that specific client.
2. **Post-Consultation Downgrade:**
   - Once an active consultation concludes, practitioner access transitions to read-only for historical reference, protected by session re-authentication.
3. **Multi-Practitioner Sharing:**
   - Sharing a client's wellness profile with another practitioner requires **explicit in-app patient consent** authorizing the second practitioner.

---

## 5. Branch Staff Isolation Protocol

Physical branch staff across Daet, Labo, Paracale, Panganiban, Capalonga, and Sta. Elena perform order packing, inventory stock counting, and in-person customer handovers.
- **Rules for Branch Staff:**
  - Branch staff screens can only view: Customer Name, Order ID, Branch Pickup / Delivery status, Items ordered (e.g. "2x HCI CMD 65 mL"), and payment confirmation.
  - Branch staff interfaces **never** display whether a customer has booked a wellness consultation, what health goals were discussed, or practitioner notes.
  - Even if a consultation occurs physically in a private room at a branch, the digital record remains restricted strictly to the practitioner's authenticated session.

---

## 6. Verification Criteria for Phase 9 Security Audit

During Phase 9 security audits, automated and manual tests must verify:
- [ ] Attempting to query `consultation_notes` with a `BranchStaff` JWT token results in `403 Forbidden`.
- [ ] Attempting to query another patient's health records with a `Customer` JWT token results in `403 Forbidden`.
- [ ] Direct database dumps reveal ciphertext for health narrative columns.
- [ ] Every invocation of a consultation record API triggers an immutable audit log entry containing actor timestamp and access reason.
