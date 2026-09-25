# Philippine Data Privacy Act (RA 10173) Compliance Specification

**Document ID:** COMP-PRIV-004 (Remediated)  
**Project:** HCI CMD Digital Commerce Platform  
**Statutory Basis:** Republic Act No. 10173 (Data Privacy Act of 2012) & NPC Circulars  
**Audit Phase:** Phase 0 Remediation — Lawful Processing Grounds & Privacy Isolation  
**Date of Audit:** 2026-09-25  
**Cross-Reference:** `docs/compliance/privacy-legal-basis-matrix.md`  

---

## 1. Statutory Context & Principles

Republic Act No. 10173 and its Implementing Rules and Regulations (IRR) mandate the protection of personal data processed by public and private entities in the Philippines. The platform operates as a **Personal Information Controller (PIC)**.

All digital processing within the platform must adhere to the three fundamental data privacy principles:
1. **Transparency:** Data subjects must be informed of the nature, purpose, extent, and scope of data processing via an explicit, plain-language Privacy Notice.
2. **Legitimate Purpose:** Data collected must be strictly necessary for fulfillment of orders, customer service, booking consultations, or legal tax compliance.
3. **Proportionality (Data Minimization):** Only the minimum necessary data fields required to achieve the declared purpose may be captured and stored.

---

## 2. Data Categorization & Statutory Processing Bases

Data processed by the platform is divided into two distinct legal tiers under RA 10173:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DATA CLASSIFICATION MATRIX                      │
├───────────────────────────────────┬────────────────────────────────────┤
│ General Personal Information      │ Sensitive Personal Information     │
│ (Section 3(g) & 12, RA 10173)     │ (Section 3(l) & 13, RA 10173)      │
├───────────────────────────────────┼────────────────────────────────────┤
│ • Full Name                       │ • Physical Health & Medical History│
│ • Contact Phone Number            │ • Dietary & Physiological Profiles │
│ • Email Address                   │ • Naturopathic Practitioner Notes  │
│ • Delivery / Billing Address      │ • Government IDs (TIN / SSS)       │
│ • Municipal Branch Selection      │ • Passwords (Cryptographic Hashes) │
│ • Order History & Quantities      │                                    │
├───────────────────────────────────┼────────────────────────────────────┤
│ Primary Lawful Bases:             │ Primary Lawful Basis:              │
│ • Contractual Necessity (12(b))   │ • Explicit Informed Consent (13(a))│
│ • Legal Obligation (12(c))        │   (Proposed compliance baseline;   │
│ • Consent for Marketing (12(a))   │   reassess Sec 13(e) if medical)   │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 3. Lawful Bases by Processing Domain

### 3.1 Customer Accounts & Identity
- **Lawful Basis:** **Section 12(b): Contractual Necessity** (Creation and management of customer account under Terms of Service).
- **Data Minimization:** First Name, Last Name, Mobile Phone Number, Email, and Hashed Password.
- **Credential Protection:** Plaintext passwords must never be logged, stored, or transmitted unencrypted. Must be hashed using salted algorithms (Argon2id or bcrypt).

### 3.2 Orders, Logistics & Branch Fulfillment
- **Lawful Basis:** **Section 12(b): Contractual Necessity** (Fulfillment of purchase agreement).
- **Access Rule:** Branch staff assigned to packing see only recipient name, delivery address/branch pickup designation, items, and contact number. Branch staff have **ZERO visibility** into payment gateway tokens or health consultation history.

### 3.3 Sales Invoicing & Tax Compliance
- **Lawful Basis:** **Section 12(c): Legal Obligation** (Mandated under NIRC Section 237 and RA 11967 Section 23(g)).
- **Retention Period:** Statutory 5-year retention under NIRC Section 235, as amended by RA 11976 (EOPT Act), reckoned according to the statutory rule specified in Section 235.

### 3.4 Payment & Financial Information
- **Zero Card Storage Architecture:** The platform **NEVER** collects, stores, or processes raw credit/debit card numbers, CVVs, or banking credentials. Payments are tokenized through PCI-DSS certified payment gateways (e.g. PayMongo, Maya, GCash).
- **Stored Data:** Solely transaction reference IDs, settlement timestamps, and payment statuses.

### 3.5 Naturopathic Consultation & Health Data (CRITICAL)
- **Classification:** **Sensitive Personal Information (SPI)** under Section 3(l) of RA 10173.
- **Lawful Processing Ground:** **Section 13(a): Explicit Informed Consent**.
  - *Proposed Compliance Baseline:* Under Section 13(e), SPI may be processed without consent for medical treatment when carried out by a licensed medical practitioner or medical institution. Based on the currently documented proposed wellness-consultation model, processing is designed to rely on Section 13(a) explicit consent. Reassess Section 13(e) if the service later involves medical treatment, a medical practitioner, or a medical treatment institution. Standalone, granular informed consent is secured prior to capturing health intake questionnaires.
- **Isolation Rule:** Health intake responses and clinical notes must reside in an isolated schema protected by column-level encryption. Strictly accessible only by the assigned practitioner and the patient.

### 3.6 Event Registrations
- **Lawful Basis:** **Section 12(b): Contractual Necessity** (Event admission management).
- **Purpose Limitation:** Attendee contact details cannot be imported into marketing lists without separate opt-in consent.

### 3.7 Marketing & Promotional Broadcasts
- **Lawful Basis:** **Section 12(a): Consent**.
- **Mechanics:** Explicit, unbundled opt-in checkbox. Unsubscribe mechanism ("Text STOP") required on all communications.

---

## 4. Data Subject Rights & Internal Operational Targets

Under Sections 16, 17, and 18 of RA 10173, data subjects possess fundamental rights:

| Statutory Right | Platform Implementation Capability | Nature of Timeline | Target Timeline |
| :--- | :--- | :--- | :--- |
| **Right to be Informed** | Transparent Privacy Policy accessible on every page and at checkout. | Statutory Mandate | Instant / Continuous |
| **Right to Access** | Self-service customer dashboard displaying profile, order history, and appointments. | Statutory Mandate | Instant / On-Demand |
| **Right to Rectification** | Profile editing screen for customer contact info and address. | Statutory Mandate | Instant |
| **Right to Erasure / Blocking** | Account deletion request workflow. Anonymizes customer data while retaining legally mandated tax sales invoices. | **Recommended Platform Policy** (Operational SLA) | Within 30 calendar days |
| **Right to Data Portability** | JSON / CSV download endpoint for customer account and order data. | **Recommended Platform Policy** (Operational SLA) | Within 48 hours |
| **Right to Redress / Inquiries** | Structured customer redress mechanism and DPO contact channel. | **Recommended Platform Policy** (Operational SLA) | Acknowledged within 72 hours |
| **Mandatory Breach Notification** | Report qualifying high-risk personal data breaches involving SPI to NPC and affected subjects. | **STATUTORY REQUIREMENT** (Section 20(f) & NPC Circular 16-03) | **Within 72 hours of knowledge** |

---

## 5. Security Measures & Technical Recommendations

To maintain technical accuracy, the documentation clearly distinguishes statutory duties from technical recommendations:

1. **Statutory Duty (Section 20, RA 10173):** Implement "reasonable and appropriate organizational, physical, and technical measures to protect personal data."
2. **Recommended Technical Security Controls (Platform Architecture):**
   - **Data in Transit:** TLS 1.3 mandatory across all public and internal endpoints; HSTS enabled.
   - **Data at Rest:** Database encrypted at rest using AES-256; clinical health narrative columns protected by application-level AES-256-GCM encryption.
   - **Access Control:** Strict Role-Based Access Control (RBAC) enforcing least privilege.
   - **Audit Logs:** Immutable audit logging of all authentication events, administrative role grants, and health data reads/edits.

---

## 6. Retention Schedule by Data Domain

| Data Domain | Applicable Standard | Retention Period | Justification |
| :--- | :--- | :--- | :--- |
| **Sales Invoices & Tax Data** | NIRC Sec 235, as amended by RA 11976 | **5 Years**, reckoned per Sec 235 | Statutory tax record preservation mandate. |
| **Order Telemetry & Packing Slips** | Commercial Best Practice | **3 Years** | Recommended policy for dispute resolution. |
| **Health Consultation Notes** | Clinical & Privacy Best Practice | **5 Years** | Recommended policy; balances continuity of wellness care against data minimization. |
| **Security & Auth Audit Logs** | IRR of RA 10173 (Rule VI) & Security Best Practice | **12 Months** | Recommended security monitoring baseline. |
| **Marketing Consent Records** | RA 10173 Principle of Transparency | **Duration of Active Consent** | Purged upon opt-out / unsubscribe. |
| **Abandoned Shopping Carts** | Data Minimization Principle | **30 Calendar Days** | Purged automatically. |
