# Master Fact, Evidence & Assumption Register

**Document ID:** COMP-FAR-006  
**Project:** HCI CMD Digital Commerce Platform  
**Target Territory:** Camarines Norte, Philippines  
**Audit Phase:** Phase 0 Remediation — Rigorous Fact & Assumption Demarcation  
**Date of Audit:** 2026-09-25  
**Review Standard:** Strict Evidentiary Classification (No Silent Conversions of Assumptions to Facts)  

---

## 1. Classification Definitions

Every substantive operational, commercial, technical, and regulatory statement across the platform documentation is assigned to exactly one of the following eight categories:

1. **VERIFIED REGULATORY FACT:** Directly supported by a primary government issuance, gazette, or official agency registry.
2. **VERIFIED PRODUCT FACT:** Supported by an official FDA registry entry or official certified manufacturer packaging documentation.
3. **MANUFACTURER-PROVIDED:** Commercial or technical claims originating directly from the mineral harvest source or brand manufacturer.
4. **BUSINESS-PROVIDED:** Information officially supplied by the business owner or leadership of the independent distribution network.
5. **ASSUMPTION:** A working hypothesis or baseline operational design made because the business has not yet formally confirmed the parameter.
6. **RECOMMENDATION:** An architectural, security, or compliance control proposed by technical and compliance analysts to achieve compliance and risk mitigation.
7. **UNVERIFIED:** Information circulating in distributor channels or public web pages for which authoritative supporting evidence has not yet been produced.
8. **OPEN QUESTION / BLOCKER:** Material information that must be supplied or verified before commercial release or phase gate passage.

---

## 2. Master Evidence & Assumption Register

| Item ID | Topic / Statement | Evidentiary Classification | Existing Evidence & Source Reference | Operational Owner | Required Confirmation & Resolution Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FAR-01** | **HCI CMD FDA Registration**  <br>"HCI CMD / Cell Mineral Drops (Ionic Mineral Concentrate) Food Supplement Drops" is registered under FR-4000008713595 to Health Code International Corp. until 2028-03-18. | **VERIFIED REGULATORY FACT** | Primary FDA Verification Portal (`https://verification.fda.gov.ph`). | Regulatory Lead / Health Code International | **Verified.** Active until March 18, 2028. |
| **FAR-02** | **"No Approved Therapeutic Claims" Mandate**  <br>The product is a food supplement; marketing or promoting it as curing, mitigating, or treating any disease is prohibited. | **VERIFIED REGULATORY FACT** | RA 9711, DOH AO 2014-0030, FDA Circular No. 2015-003. | Compliance Lead | **Verified statutory requirement.** Enforced across all digital surfaces. |
| **FAR-03** | **Prohibition of Ophthalmic Claims**  <br>Promoting mineral drops as eye drops causes severe safety hazards and violates FDA public health advisories. | **VERIFIED REGULATORY FACT (Governing Principle)** / **RECOMMENDATION (Platform Policy)** | FDA Advisory No. 2019-363 & 2020-1389. *Note: Advisories involved other product preparations, but FDA policy establishes that food supplement mineral drops must never be promoted for ocular instillation.* | Content Editor / Medical Compliance | **Verified regulatory stance.** Conservative platform policy strictly forbids all eye drop and cataract claims. |
| **FAR-04** | **Specific SKU Packaging Sizes (65 mL vs. 30 mL)**  <br>Commercial availability of 65 mL and 30 mL dropper bottle presentations. | **UNVERIFIED / OPEN QUESTION** | Mentioned in retail channels. FDA portal search summary lists product title but does not display packaging volume annex. | Business Owner | **BLOCKER:** Business owner must provide physical copy of CPR packaging annex confirming approved package sizes. |
| **FAR-05** | **Distributor Authorization Agreement**  <br>The Camarines Norte business entity holds valid authorization from Health Code International to retail HCI CMD online. | **UNVERIFIED / BLOCKER** | None in repository. | Business Owner | **CRITICAL BLOCKER:** Business owner must submit formal distributor agreement or proof of dealership from Health Code International Corp. |
| **FAR-06** | **Product Retail Selling Price (SRP)**  <br>Official retail pricing in Philippine Peso (PHP) for 65 mL, 30 mL, or package bundles. | **OPEN QUESTION / BLOCKER** | None formally submitted by business owner. | Business Owner / Commercial Lead | **CRITICAL BLOCKER:** Official price list must be provided before Phase 2 checkout implementation. |
| **FAR-07** | **Six Physical Branch Locations**  <br>The business operates physical branches in Daet, Labo, Paracale, Panganiban, Capalonga, and Sta. Elena. | **BUSINESS-PROVIDED (Mandate)** | User prompt & initial project brief. | Operations Lead / Business Owner | **Confirmed as project baseline.** Operational parameters for each branch must now be audited. |
| **FAR-08** | **Daet Central Warehouse Hub**  <br>Daet serves as the primary central replenishment depot and administrative headquarters. | **ASSUMPTION** | Operational hypothesis based on Daet's geographic status as the provincial capital and logistics hub. | Operations Lead | **Business confirmation required:** Confirm whether Daet holds all master stock or if satellite branches receive direct supplier shipments. |
| **FAR-09** | **Branch Exact Addresses & Phone Numbers**  <br>Complete street addresses, barangays, landmarks, and active mobile numbers for the 6 branches. | **OPEN QUESTION / BLOCKER** | Municipalities identified; exact street addresses, buildings, and phone numbers are missing. | Branch Operations Lead | **CRITICAL BLOCKER:** Branch managers must submit complete physical addresses and contact numbers. |
| **FAR-10** | **Branch Staffing & Smartphone Availability**  <br>Branch staff possess smartphones with cameras capable of running web-based QR scanning for pickup code validation. | **ASSUMPTION** | Technical operational assumption for zero-hardware implementation. | Branch Operations Lead | **Business confirmation required:** Survey branch staff to verify Android/iOS smartphone availability and camera operability. |
| **FAR-11** | **Delivery Coverage & Courier Dispatch**  <br>Fulfillment via in-house motorcycle riders vs. third-party couriers (Maxim, Lalamove, J&T); barangay coverage and delivery fees. | **ASSUMPTION / OPEN QUESTION** | Proposed municipal delivery framework. | Logistics Lead | **Business confirmation required:** Finalize delivery fee schedule and courier contracts prior to Phase 2. |
| **FAR-12** | **Payment Methods & Gateway Account**  <br>Acceptance of GCash, Maya, QR Ph, credit cards, COD, and branch Cash on Pickup. | **RECOMMENDATION / OPEN QUESTION** | Recommended payment matrix. Payment gateway merchant account onboarding status unknown. | Finance Lead / Business Owner | **CRITICAL BLOCKER:** Complete merchant onboarding with chosen gateway (e.g. PayMongo or Maya Business) with BIR 2303 submission. |
| **FAR-13** | **Tax Registration & VAT Status**  <br>Business legal entity name, Tax Identification Number (TIN), BIR 2303 registration, and VAT vs. Non-VAT classification. | **OPEN QUESTION / BLOCKER** | Unknown. | Business Owner / CPA | **CRITICAL BLOCKER:** Provide BIR Form 2303 to establish exact legal name, TIN, and whether 12% VAT or Non-VAT percentage tax applies. |
| **FAR-14** | **Naturopathic Consultation Model**  <br>Consultations provide non-medical lifestyle, hydration, and dietary education. | **RECOMMENDATION / BUSINESS MANDATE** | Product brief & compliance framework. | Wellness Lead | **Business confirmation required:** Confirm whether consultations are billed separately or offered complimentary with purchase. |
| **FAR-15** | **Practitioner Accreditations & Credentials**  <br>Qualifications of wellness practitioners conducting consultations (PITAHC, nutritionist-dietitian, certified lifestyle coach). | **OPEN QUESTION / BLOCKER** | None submitted. | Business Owner | **HIGH PRIORITY:** Practitioner roster and formal credentials must be vetted prior to Phase 4 (Consultations). |
| **FAR-16** | **Symposium & Event Ticketing Model**  <br>Events are conducted at branches or rented halls in Daet, utilizing QR check-in passes. | **RECOMMENDATION / ASSUMPTION** | Operational proposal for event growth. | Event Coordinator | **Business confirmation required:** Confirm upcoming event calendar and whether tickets are free or require seat reservation deposits. |
| **FAR-17** | **Technical Cryptographic Standards (AES-256, TLS 1.3)**  <br>Enforce AES-256-GCM column encryption and TLS 1.3 for health data boundary. | **RECOMMENDATION** | Engineering security architecture. (Not an explicit statutory cipher mandate in RA 10173). | Security Architect | **Technical baseline approved for Phase 1.** |
