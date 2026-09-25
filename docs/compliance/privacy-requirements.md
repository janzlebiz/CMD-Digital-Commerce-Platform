# Philippine Data Privacy Act (RA 10173) Compliance Specification

**Document ID:** COMP-PRIV-004  
**Project:** HCI CMD Digital Commerce Platform  
**Statutory Basis:** Republic Act No. 10173 (Data Privacy Act of 2012) & National Privacy Commission (NPC) Circulars  
**Audit Phase:** Phase 0 — Baseline Compliance & Data Architecture  
**Status:** Certified Audit Baseline  
**Date of Audit:** 2026-09-25  

---

## 1. Statutory Context & Principles

Republic Act No. 10173 and its Implementing Rules and Regulations (IRR) mandate the protection of personal data processed by public and private entities in the Philippines. The platform operates as a **Personal Information Controller (PIC)**.

All digital processing within the platform must adhere to the three fundamental data privacy principles:
1. **Transparency:** Data subjects must be informed of the nature, purpose, extent, and scope of data processing via an explicit, unambiguous Privacy Notice.
2. **Legitimate Purpose:** Data collected must be strictly necessary for fulfillment of orders, customer service, booking consultations, or legal tax compliance.
3. **Proportionality (Data Minimization):** Only the minimum necessary data fields required to achieve the declared purpose may be captured and stored.

---

## 2. Data Categorization & Regulatory Classification

Data processed by the platform is divided into two strict legal tiers under RA 10173:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DATA CLASSIFICATION MATRIX                      │
├───────────────────────────────────┬────────────────────────────────────┤
│ General Personal Information      │ Sensitive Personal Information     │
│ (Section 3(g) RA 10173)           │ (Section 3(l) & Section 13 RA 10173│
├───────────────────────────────────┼────────────────────────────────────┤
│ • Full Name                       │ • Physical Health / Medical History│
│ • Contact Phone Number            │ • Dietary & Physiological Profiles │
│ • Email Address                   │ • Naturopathic Practitioner Notes  │
│ • Delivery / Billing Address      │ • Government IDs (TIN / SSS / DL)  │
│ • Municipal Branch Selection      │ • Financial / Bank Account Details │
│ • Order History & Quantities      │ • Passwords (Cryptographic Hashes) │
├───────────────────────────────────┼────────────────────────────────────┤
│ General Consent & Contractual     │ Elevated Safeguards, Strict Legal  │
│ Fulfillment Legal Grounds         │ Basis & Isolated Boundary Required │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 3. Data Processing Rules by Functional Domain

### 3.1 Customer Accounts & Identity
- **Registration Fields:** First Name, Last Name, Mobile Phone Number, Email, Password (hashed via Argon2id or bcrypt; minimum 12 characters, enforced entropy).
- **Guest Checkout:** Supported to minimize data retention. Guest orders store only the recipient name, delivery address, phone number, and transaction receipt for legal tax records.
- **Passwords & Credentials:** Plaintext passwords must never be logged, transmitted unencrypted, or accessible to administrative personnel.

### 3.2 Orders & Delivery Logistics
- **Delivery Records:** Shipping Name, Barangay, Municipality (Daet, Labo, etc.), Landmark, Contact Phone.
- **Branch Logistics Disclosure:** Branch personnel assigned to packing are restricted to seeing only the customer's delivery name, contact number, delivery address, and line items. They must not see payment tokens or consultation history.

### 3.3 Payments & Financial Information
- **Zero Payment Card Storage:** The platform must **NEVER** collect, process, or store raw Credit/Debit Card numbers, CVV codes, or bank passwords. All payments must be tokenized directly via PCI-DSS certified payment gateways (e.g., PayMongo, Maya, GCash API).
- **Payment Metadata Only:** The database stores only the external transaction reference ID, payment method type (e.g., `gcash`, `maya`, `cod`), timestamp, and payment status (`pending`, `completed`, `failed`).

### 3.4 Consultation & Naturopathic Health Data (CRITICAL)
- **Classification:** Sensitive Personal Information (SPI) under Section 13(a) of RA 10173.
- **Strict Isolation:** Health intake forms, wellness goals, dietary notes, and practitioner logs must reside in a logically and cryptographically isolated schema.
- **Access Rule:** Only the assigned practitioner and the patient may access these records. Branch staff, warehouse personnel, marketing agents, and standard store admins must have **ZERO access** to consultation records.

### 3.5 Event Registrations & Symposium Attendance
- **Attendee Data:** Attendee Name, Contact Number, Email, Number of Seats, Branch Location, Attendance Status (checked-in via QR).
- **Purpose Limitation:** Event data must not be transferred into marketing channels without explicit opt-in consent checkboxes.

### 3.6 Marketing Consent & Communications
- **Granular Opt-In:** Separate, non-pre-ticked checkboxes for:
  - `[ ] Transactional Communications` (Order status, appointment confirmations — mandatory for fulfillment).
  - `[ ] Promotional SMS/Email Updates` (New product arrivals, symposium invites — strictly optional).
- **Easy Opt-Out:** Every marketing SMS or email must include an unencumbered one-click unsubscribe mechanism.

### 3.7 Cookies & Local Storage
- **Technical & Essential Only:** Session tokens, CSRF tokens, cart contents, branch selector.
- **No Third-Party Ad Trackers Without Consent:** No invasive behavioral trackers or unauthorized data brokers.

---

## 4. Data Subject Rights Implementation Matrix

Under Sections 16, 17, and 18 of RA 10173, data subjects possess fundamental rights which the platform's architecture must programmatically support:

| Statutory Right | Platform Implementation Capability | SLA |
| :--- | :--- | :--- |
| **Right to be Informed** | Transparent, plain-language Privacy Policy accessible on every page and at checkout. | Instant |
| **Right to Access** | Self-service customer profile dashboard displaying order history, appointments, and personal profile. | Instant / On-Demand |
| **Right to Rectification** | Profile editing screen allowing customers to update address, phone number, and contact preferences. | Instant |
| **Right to Erasure / Blocking** | Account deletion request mechanism. Customer data is anonymized or purged, preserving only legally required financial tax records (BIR requires 10-year retention for sales invoices). | 30 calendar days |
| **Right to Data Portability** | JSON / CSV export endpoint allowing customers to download their complete profile and order history. | Within 48 hours |
| **Right to Damages / Redress** | Documented DPO contact email and structured grievance workflow. | Acknowledgement within 72 hours |

---

## 5. Security Safeguards & Technical Measures

### 5.1 Access Control & Principle of Least Privilege
- Enforce strict Role-Based Access Control (RBAC):
  - `Customer`: Access only own profile, own orders, own appointments.
  - `Branch Staff`: Access orders and inventory assigned strictly to their physical branch.
  - `Practitioner`: Access appointment schedules and clinical notes for assigned clients.
  - `Store Admin`: Manage catalog, pricing, events, orders across branches; no access to health notes.
  - `System Admin`: Technical infrastructure and security audit logs.

### 5.2 Encryption Standards
- **Data in Transit:** TLS 1.3 mandatory for all public and internal API endpoints. HSTS (HTTP Strict Transport Security) enabled.
- **Data at Rest:** Database encrypted at rest using AES-256. Sensitive health fields encrypted column-wise using application-level cryptographic keys.

### 5.3 Audit Trails & Logging
- Tamper-evident, structured audit logs for:
  - User authentication events (login, failed login, password reset).
  - Any read/write access to Sensitive Personal Information (consultation records).
  - Administrative changes to pricing, inventory adjustments, and user role grants.
- Logs must store timestamp (UTC), Actor ID, Target Entity ID, Action Type, and IP address (masked).

### 5.4 Data Retention & Disposal Schedule
- **Orders & Invoices:** Retained for 10 years to comply with BIR tax regulations.
- **Consultation Records:** Retained for 5 years after the last active consultation, then securely purged or anonymized.
- **Abandoned Carts:** Purged automatically after 30 days.
- **Security Audit Logs:** Retained for 12 months in cold storage.
