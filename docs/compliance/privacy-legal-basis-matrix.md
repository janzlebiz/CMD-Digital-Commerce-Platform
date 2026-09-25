# Privacy Legal Basis & Regulatory Classification Matrix

**Document ID:** COMP-PRIV-005  
**Project:** HCI CMD Digital Commerce Platform  
**Target Territory:** Camarines Norte, Philippines  
**Audit Phase:** Phase 0 Remediation — Data Privacy Legal Bases & Statutory Standards  
**Date of Audit:** 2026-09-25  
**Primary Legal Authority:** Data Privacy Act of 2012 (Republic Act No. 10173) & NPC Circulars  

---

## 1. Statutory Architecture: Lawful Bases for Processing

Under the **Data Privacy Act of 2012 (RA 10173)**, processing personal data is lawful only when anchored to an established statutory basis. The law establishes two distinct regimes:

### 1.1 General Personal Information (Section 12, RA 10173)
Permitted under any of the following statutory grounds:
- **Sec 12(a): Consent:** Data subject has given consent.
- **Sec 12(b): Contractual Necessity:** Processing is necessary for the performance of a contract to which the data subject is a party (e.g. delivering an e-commerce order).
- **Sec 12(c): Legal Obligation:** Compliance with a statutory or legal obligation (e.g. issuing tax sales invoices to the BIR).
- **Sec 12(d): Vital Interests:** Necessary to protect vitally important interests of the data subject.
- **Sec 12(e): Public Authority / Law:** Response to national emergency or public function.
- **Sec 12(f): Legitimate Interests:** Necessary for legitimate interests pursued by the Personal Information Controller (PIC), except where overridden by fundamental rights.

### 1.2 Sensitive Personal Information (Section 13, RA 10173)
Processing of Sensitive Personal Information (SPI)—which includes health, biometric, genetic, and philosophical data—is strictly **prohibited**, EXCEPT under the following exhaustive conditions:
- **Sec 13(a): Explicit Consent:** The data subject has given explicit consent prior to processing.
- **Sec 13(b): Statutory Authorization:** Provided for by an existing law and regulation without requiring consent.
- **Sec 13(c): Vital Interests:** Necessary to protect vital interests where the data subject is physically or legally unable to consent.
- **Sec 13(d): Non-Profit Organizations:** Limited to recognized religious, philosophical, or charitable entities for their members.
- **Sec 13(e): Medical Treatment:** Necessary for medical treatment, carried out by a **licensed medical practitioner or medical institution**, and an adequate level of data protection is ensured.
  - *Critical Legal Clarification:* Because naturopathic, wellness, and lifestyle consultations on this platform are conducted by wellness consultants rather than licensed medical doctors operating in a medical clinic, **Section 13(e) DOES NOT APPLY**. Therefore, processing client health intake questionnaires and wellness notes **MUST RELY EXCLUSIVELY ON SECTION 13(a) EXPLICIT INFORMED CONSENT**.
- **Sec 13(f): Legal Claims / Defense:** Lawful defense of legal rights in court proceedings.

---

## 2. Processing Activity Legal Basis Matrix

| Processing Activity | Specific Data Elements | Legal Classification | Declared Purpose | Lawful Legal Basis (RA 10173) | Sensitive Personal Information? | Critical Implementation & Governance Notes |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **Customer Account Creation** | First Name, Last Name, Mobile Number, Email Address, Hashed Password. | General Personal Information | Account authentication, order history access, checkout streamlining. | **Section 12(b): Contractual Necessity** (Creation of customer account under Terms of Service). | NO | Passwords must be hashed using modern key derivation functions (Argon2id or bcrypt). |
| **Order Checkout & Fulfillment** | Recipient Name, Delivery Address, Municipality, Barangay, Landmark, Contact Number, Ordered SKUs. | General Personal Information | Dispatching ordered products, verifying branch pickup, generating delivery packing slip. | **Section 12(b): Contractual Necessity** (Fulfillment of purchase contract). | NO | Branch staff packing orders view only recipient name, items, and address. Staff cannot access payment details or consultation history. |
| **Sales Invoicing & Tax Compliance** | Customer Billing Name, Delivery Address, TIN (if business), Transaction Total, VAT Details. | General Personal Information | Compliance with BIR and EOPT Act invoicing mandates. | **Section 12(c): Legal Obligation** (Mandated under NIRC Section 237 and RA 11967 Section 23(g)). | NO | Invoices and tax accounting records must be archived for 5 years pursuant to NIRC Section 235 as amended by RA 11976. |
| **Payment Verification & Reconciliation** | Payment Method Type, Transaction Reference ID, Payment Status, Payment Gateway Settlement Hash. | Financial Commercial Telemetry | Verifying payment receipt before branch stock release. | **Section 12(b): Contractual Necessity** & **Section 12(f): Legitimate Interests** (Fraud prevention). | NO | Raw credit card numbers, CVVs, or bank login credentials are **NEVER** processed or stored by platform (tokenized via gateway). |
| **Naturopathic Health Consultation Intake** | Hydration habits, dietary routines, current lifestyle stressors, declared physical health conditions. | **Sensitive Personal Information (SPI)** (Section 3(l), RA 10173) | Providing tailored wellness coaching and hydration/mineral dietary guidance. | **Section 13(a): Explicit Informed Consent** | **YES** | Requires dedicated, separate, unambiguous in-app consent checkbox. Cannot be bundled into general Terms of Service. Restricted from retail staff view. |
| **Practitioner Consultation Clinical Notes** | Qualitative wellness notes, hydration recommendations, dietary lifestyle suggestions. | **Sensitive Personal Information (SPI)** | Maintaining continuity of care and historical wellness advice. | **Section 13(a): Explicit Informed Consent** | **YES** | Encrypted column-wise; strictly accessible only by the assigned practitioner and the patient. Never visible to branch clerks or store managers. |
| **Symposium & Event Registration** | Attendee Name, Contact Mobile, Email, Municipal Residence, Seat Reservation. | General Personal Information | Venue seat reservation, door check-in, event admission pass issuance. | **Section 12(b): Contractual Necessity** (Event admission agreement). | NO | Generates dynamic QR attendance pass for door check-in. |
| **Promotional & Marketing Broadcasts** | Mobile Phone Number, Email Address, First Name, Purchase History Cohort. | General Personal Information | Sending SMS promotional alerts, product restock updates, or event invitations. | **Section 12(a): Consent** | NO | Requires explicit, non-pre-ticked opt-in checkbox. Unsubscribe mechanism (e.g. "Text STOP") must be included in every communication. |

---

## 3. Statutory Requirements vs. Technical Security Recommendations

To maintain technical accuracy, the documentation explicitly delineates direct statutory mandates from recommended engineering controls:

| Security Measure / Control | Designation | Governing Authority / Rationale | Regulatory Reality |
| :--- | :--- | :--- | :--- |
| **AES-256 / AES-256-GCM Encryption** | **RECOMMENDED TECHNICAL SECURITY CONTROL** | Proportional security measure under Section 20, RA 10173 & NPC Circular 16-04. | RA 10173 mandates "reasonable and appropriate organizational, physical, and technical measures" to protect personal data; it does **not** specify AES-256 or any specific cryptographic cipher in statutory text. |
| **TLS 1.3 & HTTPS Everywhere** | **RECOMMENDED TECHNICAL SECURITY CONTROL** | Standard web engineering best practice; fulfills NPC security guidelines. | Not named in statute; fulfills statutory duty of protecting data in transit. |
| **Column-Level Database Encryption** | **RECOMMENDED TECHNICAL SECURITY CONTROL** | Defense-in-depth architecture to enforce the Health Data Boundary. | Architectural choice to safeguard Sensitive Personal Information. |
| **Immutable Audit Logging** | **RECOMMENDED TECHNICAL SECURITY CONTROL** | Auditability guideline under NPC Circular 16-04. | Fulfills principle of accountability. |
| **30-Day Erasure Response SLA** | **RECOMMENDED PLATFORM POLICY** | Operational implementation of Section 16(e) Right to Erasure. | The statute grants the right to block or remove data upon justified grounds, but does not specify a 30-day statutory countdown. |
| **48-Hour Data Portability SLA** | **RECOMMENDED PLATFORM POLICY** | Operational implementation of Section 18 Right to Data Portability. | The statute grants the right to obtain data in an interoperable format; the 48-hour deadline is an internal operational target. |
| **72-Hour Data Breach Notification** | **STATUTORY / REGULATORY REQUIREMENT** | **Section 20(f), RA 10173 & NPC Circular 16-03** | **Statutory Mandate:** Personal Information Controllers must notify the NPC and affected data subjects within seventy-two (72) hours of knowledge of a reportable data breach involving SPI or posing real risk of serious harm. |
