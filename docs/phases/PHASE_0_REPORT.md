# Phase 0 Remediation & Re-Certification Report

**Project:** HCI CMD Digital Commerce Platform  
**Target Territory:** Camarines Norte, Philippines  
**Lead Roles:** Lead Product Architect, Business Analyst, Technical Architect, Compliance-Aware Requirements Analyst  
**Audit Evaluation Date:** 2026-09-25  
**Audit Standard:** Strict Statutory Provenance, Evidence Verification & Fact/Assumption Demarcation  

---

## 1. Audit Scope & Mandate

This document provides the final, evidence-based Phase 0 audit and certification for the independent **HCI CMD Digital Commerce Platform**, serving an enterprise distribution network in Camarines Norte, Philippines (encompassing branches in Daet, Labo, Paracale, Panganiban, Capalonga, and Sta. Elena).

Under the project constitution, Phase 0 is strictly confined to:
$$\text{INSPECT} \longrightarrow \text{RESEARCH} \longrightarrow \text{DOCUMENT} \longrightarrow \text{IDENTIFY GAPS} \longrightarrow \text{CERTIFY}$$

Phase 0 is a preliminary architectural, technical, and regulatory discovery audit. It is **not** a final legal opinion or substitute for formal legal, tax, FDA, or privacy counsel.

---

## 2. Repository & Source-Code Boundary Verification

An exhaustive technical audit of the codebase confirms:
- **No Storefront UI:** Zero customer-facing catalogs, product detail views, or shopping carts have been implemented.
- **No Database Schemas or Migrations:** No relational tables, ORM models, or migration scripts have been created.
- **No Backend APIs or Routes:** No Express or Next.js route handlers, business logic controllers, or RPC endpoints exist.
- **No Authentication Implementation:** No session handlers, password hashers, or JWT issuers have been created.
- **No Commerce or Checkout Logic:** No order processing, payment integrations, or pricing engines are present.
- **No Inventory, Consultation, Event, or CRM Implementations:** No business domain workflows are active.
- **No PWA / Service Worker Code:** No manifest registration or offline caching services are running.
- **No Third-Party Production Credentials:** No live secrets or API keys have been introduced; `.env.example` remains clean and safe.

The repository remains strictly at the **Phase 0 documentation and audit baseline**.

---

## 3. Documents Reviewed & Remediation Package

The following 18 authoritative specifications, evidence registers, and decision records constitute the certified Phase 0 baseline:

### Compliance & Regulatory Dossiers (`docs/compliance/`)
1. `docs/compliance/source-register.md`: Master provenance register of primary government authorities (FDA, DTI, BIR, NPC, Official Gazette).
2. `docs/compliance/regulatory-research.md`: Statutory analysis under RA 9711, DOH AO 2014-0030, FDA Circular No. 2015-003, and public health advisories.
3. `docs/compliance/fda-sku-evidence.md`: Primary verification of FR-4000008713595, SKU matrix, and CPR annex inspection requirements.
4. `docs/compliance/legal-citation-matrix.md`: Section-by-section mapping of RA 11967 (Sections 8, 18, 23, 24, 29).
5. `docs/compliance/bir-applicability-matrix.md`: Invoicing under EOPT Act (RA 11976), withholding tax rules under RR 16-2023 / RMC 8-2024, and RR 15-2024.
6. `docs/compliance/privacy-legal-basis-matrix.md`: Statutory mapping of processing grounds under RA 10173 (Sections 12 and 13).
7. `docs/compliance/privacy-requirements.md`: Data privacy compliance specification and data subject rights implementation.
8. `docs/compliance/health-data-boundary.md`: Architectural firewall isolating sensitive health information from e-commerce systems.
9. `docs/compliance/compliance-open-questions.md`: Dedicated registry of legal, tax, licensing, and practitioner open questions.
10. `docs/compliance/fact-assumption-register.md`: Comprehensive classification of all platform statements across 8 evidentiary tiers.
11. `docs/compliance/product-claims-policy.md`: Editorial rules, mandatory disclaimers, and claim whitelist/blacklist.
12. `docs/compliance/ecommerce-compliance.md`: Consolidated e-commerce regulatory specification.

### Requirements Dossiers (`docs/requirements/`)
13. `docs/requirements/business-requirements.md`: Enterprise operational profile, 6-branch network, and discovery checklist.
14. `docs/requirements/ecommerce-requirements.md`: Storefront catalog, multi-branch checkout, and sales invoicing specifications.
15. `docs/requirements/branch-requirements.md`: Physical profiles for Daet, Labo, Paracale, Panganiban, Capalonga, and Sta. Elena.
16. `docs/requirements/inventory-requirements.md`: Multi-branch stock ledger, FEFO tracking, and row-level locking reservations.
17. `docs/requirements/consultation-requirements.md`: Naturopathic consultation booking, informed consent, and encrypted clinical records.
18. `docs/requirements/event-requirements.md`: Symposium publishing, attendee ticketing, and offline QR check-in passes.
19. `docs/requirements/crm-requirements.md`: Unified customer profile, granular consent tracking, and dispute redress mechanism.
20. `docs/requirements/mobile-requirements.md`: PWA manifest, service worker shell, and cellular network optimizations.
21. `docs/requirements/notification-requirements.md`: Tiered SMS/email notifications and Philippine gateway integrations.
22. `docs/requirements/OPEN_QUESTIONS.md`: Master prioritized blocker and open question register for the business owner.

### Architecture & Decisions (`docs/architecture/` & `docs/decisions/`)
23. `docs/architecture/initial-architecture.md`: Modular monolith blueprint, PostgreSQL persistence, and defensive security.
24. `docs/decisions/decision-log.md`: Formal Architecture Decision Records (ADR-001 through ADR-008).

---

## 4. Regulatory Evidence Methodology

Every substantive regulatory statement across the platform is anchored directly to primary government sources recorded in `docs/compliance/source-register.md`:
- Statutory legislation: Enacted Republic Acts published in the *Official Gazette of the Republic of the Philippines*.
- Food and drug regulations: Official issuances, circulars, and the verification portal of the *Food and Drug Administration (FDA) Philippines*.
- Tax administration: Revenue Regulations and Revenue Memorandum Circulars of the *Bureau of Internal Revenue (BIR)*.
- Privacy regulations: Statutory provisions and circulars of the *National Privacy Commission (NPC)*.
- E-commerce & Consumer Protection: Department Administrative Orders of the *Department of Trade and Industry (DTI)*.

Secondary commercial sources, blogs, and marketing printouts are strictly cataloged as supplementary commercial background and excluded from serving as authoritative legal citations.

---

## 5. FDA Product Evidence

Based on primary agency records retrieved from the official FDA Philippines Verification Portal (`https://verification.fda.gov.ph`):
- **Product Name:** HCI CMD / Cell Mineral Drops (Ionic Mineral Concentrate) Food Supplement Drops
- **Brand Name:** HCI CMD™
- **Registration Number:** **FR-4000008713595**
- **Registrant Company:** Health Code International Corporation
- **Product Classification:** Medium Risk Food Product
- **Category:** Food Supplement (Food Product)
- **Official FDA Statement:** Registered as a Food Supplement with **NO APPROVED THERAPEUTIC CLAIMS**
- **Date of Issuance:** 26 May 2023 | **Date of Expiry:** 18 March 2028

---

## 6. FDA SKU Evidence Matrix

Under Philippine FDA procedures, packaging sizes are approved within the certificate annex of a food registration. The following matrix bounds current SKU evidence:

| Presentation | Product Registration Evidence | Registration Number | Status | Source & Method | Audit Verification Finding |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **65 mL Dropper Bottle** | Formulation matches FR-4000008713595. Package volume approval must be confirmed via physical CPR annex. | FR-4000008713595 (Provisionally linked) | Active Registration; Annex Inspection Required | Official FDA Verification Portal (`https://verification.fda.gov.ph`) | **VERIFIED PRODUCT FORMULATION / BUSINESS CONFIRMATION REQUIRED FOR PACKAGING ANNEX** |
| **30 mL Dropper Bottle** | Brand matches registrant. Whether 30 mL is listed under FR-4000008713595 annex or holds a separate variant code is unverified. | FR-4000008713595 (Subject to annex verification) | Active Brand; Annex Inspection Required | Official FDA Verification Portal | **UNVERIFIED / BUSINESS DOCUMENT REQUIRED** |
| **Other Sizes / Bundles** | Mentioned in reseller channels. No verified FDA packaging record in repository. | Unknown | Unverified | Verification Portal search | **UNVERIFIED / BUSINESS DOCUMENT REQUIRED** |

---

## 7. Product Claims Classification & Disclaimers

The platform enforces a five-tier claims policy (`docs/compliance/product-claims-policy.md`):
1. **Verified Regulatory Facts:** Food supplement classification; "NO APPROVED THERAPEUTIC CLAIMS".
2. **Manufacturer Technical Claims:** Solar evaporation from Great Salt Lake; low sodium; ionic mineral profile (permitted as nutrition facts only).
3. **Distributor Commercial Statements:** Suggested dilution (5–10 drops in beverage); commercial packaging presentations.
4. **General Educational Statements:** Scientific role of dietary magnesium and electrolytes in normal physiological hydration.
5. **Prohibited Claims:** Any claim that HCI CMD cures, treats, or mitigates any disease (diabetes, hypertension, cancer, arthritis) or acts as an eye drop / ophthalmic preparation.

**Mandatory Statutory Disclaimers:**
- Filipino (FDA Circular 2015-003): `"MAHALAGANG PAALALA: ANG HCI CELL MINERAL DROPS AY HINDI GAMOT AT HINDI DAPAT GAMITING PANGGAMOT SA ANUMANG URI NG SAKIT."`
- English (DOH AO 2014-0030): `"NO APPROVED THERAPEUTIC CLAIMS"`.

---

## 8. Republic Act No. 11967 (Internet Transactions Act of 2023) Legal Mapping

Based on the official statutory text of RA 11967 (`docs/compliance/legal-citation-matrix.md`):
- **Section 8 (Online Business Database):** Requires digital merchants to register with the DTI E-Commerce Bureau.
- **Section 18 (Code of Conduct):** Enacts high-level principles of fair commercial communications, consumer safety, and transparency.
- **Section 23 (E-Retailer & Merchant Obligations):** Enforces statutory duties:
  - Section 23(a): Price transparency under Consumer Act (RA 7394 Art. 81).
  - Section 23(b): Goods conformity with descriptions and lot standards.
  - Section 23(d): Accessible internal redress mechanism for complaints.
  - Section 23(e): Data privacy compliance under RA 10173.
  - Section 23(f): Authority to require consumer mobile number and email for delivery logistics.
  - Section 23(g): Mandatory issuance of paper or electronic sales invoices.
  - IRR: Conspicuous display of merchant registered business name, physical address, and contact details.
- **Section 24 (Internal Redress Mechanism):** Mandates that consumers utilize internal redress before filing administrative or court complaints. An internal redress mechanism is deemed exhausted if unresolved after **seven (7) calendar days** from filing.
  - *Critical Distinction:* The 7-day period is a statutory dispute exhaustion threshold, **NOT** an unconditional right of return/refund for opened dietary supplements.
  - *Platform Policy:* Internal support targets (acknowledgment within 24h, resolution within 48–72h) are **recommended platform policies**, not statutory deadlines.

---

## 9. BIR Tax & Invoicing Applicability Analysis

Based on current revenue regulations (`docs/compliance/bir-applicability-matrix.md`):
1. **The Invoicing Baseline (RA 11976 / EOPT Act):** The "Invoice" (Sales Invoice) is established as the sole primary substantiation for sales of both goods and services for VAT purposes, replacing the former Official Receipt for services.
2. **Mandatory BIR Registration (RR 15-2024):** Online merchants must register with the BIR and prominently display BIR Form 2303 registration details on their storefront.
3. **Withholding Tax on Online Transactions (RR 16-2023 & RMC 8-2024):**
   - Applies to e-marketplaces and Digital Financial Services Providers (DFSPs).
   - Our platform is a **single-merchant storefront**, not an e-marketplace hosting third-party sellers. It does not withhold from sellers.
   - Payout settlements from DFSPs (e.g. GCash, Maya) are subject to a 0.5% withholding tax (1% on 50% of gross remittances) **IF** annual gross remittances exceed ₱500,000. If below ₱500,000, a sworn declaration must be submitted to the DFSP to receive unwithheld payouts.
4. **VAT Status:** The platform does not infer whether the business is VAT-registered (12%) or Non-VAT (Percentage Tax). **Business confirmation is required.**
5. **Records Retention (NIRC Sec 235 & RR 5-2014):** Tax sales invoices and accounting books must be preserved for **10 years**. (Operational telemetry, consultation notes, and security logs are governed by separate, tailored retention schedules).

---

## 10. Privacy Legal-Basis Analysis (RA 10173)

Based on the Data Privacy Act of 2012 (`docs/compliance/privacy-legal-basis-matrix.md`):
- **Account Creation & Checkout:** Lawful under **Section 12(b): Contractual Necessity**.
- **Sales Invoicing:** Lawful under **Section 12(c): Legal Obligation**.
- **Promotional Marketing Broadcasts:** Lawful under **Section 12(a): Consent**.
- **Naturopathic Health Consultations:** Captures Sensitive Personal Information (SPI). Because wellness consultations are non-medical lifestyle guidance provided by certified wellness consultants rather than licensed medical doctors in a hospital, **Section 13(e) does not apply**. Therefore, processing health intake data **relies strictly on Section 13(a): Explicit Informed Consent**.
- **Security Distinctions:** Encryption controls (AES-256-GCM, TLS 1.3) are **recommended technical security measures** proportional to risk under Section 20, rather than express statutory cipher mandates.
- **SLA Distinctions:** 30-day erasure response, 48-hour data portability, and 72-hour grievance acknowledgment are **recommended internal platform policies**. (In contrast, 72-hour breach reporting to the NPC under NPC Circular 16-03 is a statutory mandate for reportable high-risk breaches).

---

## 11. Health-Data Boundary Specification

The platform architecture enforces a strict logical and cryptographic firewall isolating the Restricted Health Domain from the Public Commerce Domain (`docs/compliance/health-data-boundary.md`):
- Health intake questionnaires and clinical notes reside in isolated tables protected by column-level encryption.
- Branch retail staff, packing clerks, warehouse personnel, and marketing coordinators have **ZERO access** to consultation records.
- Access is restricted exclusively to the assigned practitioner and the patient.
- Health data is permanently firewalled from CRM marketing campaigns and automated promotional ads.

---

## 12. Business Requirements & 6-Branch Network Baseline

The business model covers five integrated pillars across six Camarines Norte branches (`docs/requirements/business-requirements.md`):
1. **Daet:** Provincial Central Hub (*Operational Assumption*); central inventory replenishment warehouse, administrative headquarters, flagship consultation suite.
2. **Labo:** Interior commercial corridor along Maharlika Highway; local branch pickup, delivery dispatch, consultation appointments.
3. **Paracale:** Coastal and mining district hub; local pickup, community health workshops.
4. **Panganiban:** Northern coastal commercial port town; local pickup, distributor meetings.
5. **Capalonga:** Northwestern pilgrimage destination; local pickup for travelers, local consultations.
6. **Sta. Elena:** Western border gateway to Quezon Province; highway transit order fulfillment.

---

## 13. Fact / Assumption Register

All substantive statements across the platform are cataloged in `docs/compliance/fact-assumption-register.md`. Summary breakdown:
- **Verified Regulatory Facts:** FDA FR-4000008713595 registration, "No Approved Therapeutic Claims" mandate, RA 11967 merchant obligations, EOPT Act Sales Invoice rule.
- **Business-Provided Mandates:** Operating in Camarines Norte across six named branches; distributing HCI CMD; offering wellness consultations and symposiums.
- **Operational Assumptions (Requiring Business Confirmation):** Daet functioning as central master warehouse; staff smartphone availability; delivery fee zones; 5-day pickup hold policy.
- **Recommended Architectural Controls:** Modular monolith in Next.js + PostgreSQL; AES-256-GCM column encryption; PWA offline ticket shell.
- **Open Questions / Blockers:** Documented below.

---

## 14. Architecture Baseline

The technical blueprint is certified as a **Modular Monolith** (`docs/architecture/initial-architecture.md`):
- Next.js (App Router) + TypeScript full-stack framework.
- PostgreSQL relational database with typed ORM (Drizzle/Prisma) and pessimistic row-level locking (`SELECT ... FOR UPDATE`) to eliminate multi-branch inventory overselling.
- Strict Role-Based Access Control (RBAC) separating Customers, Branch Staff, Branch Managers, Practitioners, and Store Admins.
- Provider abstraction layers for payment gateways (PayMongo, Maya, GCash), SMS notifications (Semaphore/Philippine telco routes), and object storage (S3-compatible).
- PWA with W3C Web App Manifest and Service Worker shell for safe offline ticket and pickup code access.

---

## 15. Master Open Questions

As cataloged in `docs/requirements/OPEN_QUESTIONS.md` and `docs/compliance/compliance-open-questions.md`:
1. **OQ-BUS-01:** Registered legal business entity name, official TIN, and BIR Form 2303 Certificate of Registration.
2. **OQ-BUS-02:** Physical copy of FDA CPR for FR-4000008713595 including packaging annex verifying 65 mL, 30 mL, etc.
3. **OQ-BUS-03:** Formal written distributor authorization agreement from Health Code International Corporation.
4. **OQ-CAT-01:** Final SKU launch catalog and official Retail Selling Prices (SRP) in Philippine Peso.
5. **OQ-BRN-01:** Complete physical street addresses, barangays, building landmarks, and mobile telephone numbers for all six branches.
6. **OQ-TAX-01:** Tax classification: VAT (12%) vs. Non-VAT (Percentage Tax) confirmation.
7. **OQ-PAY-01:** Payment gateway merchant account onboarding status and BIR 2303 submission.
8. **OQ-CNS-01:** Practitioner roster, formal accreditations (PITAHC, nutritionist, lifestyle coach), and appointment pricing.
9. **OQ-LOG-01:** Local delivery barangay coverage per branch and delivery fee schedule.

---

## 16. Commercial-Launch Blockers

The following items are designated as **Critical Commercial Blockers** that must be resolved prior to public commercial release in Phase 2:
- [ ] Submission of physical FDA CPR certificate and packaging annex.
- [ ] Submission of BIR Form 2303 Certificate of Registration and confirmation of VAT status.
- [ ] Submission of formal Health Code International distributor agreement.
- [ ] Confirmation of exact physical addresses and contact numbers for all six branches.
- [ ] Finalization of official SKU price list in Philippine Peso.

---

## 17. Proposed Scope for Phase 1 (Foundation + Public Website)

Upon receiving explicit authorization from the business owner to begin Phase 1, the following foundational deliverables will be implemented:
1. **Application Shell & Design System:** High-performance, mobile-first responsive web application adhering to clean typography, accessibility standards, and a natural wellness aesthetic.
2. **Public Storefront & Educational Presentation:** Informational presentation of HCI CMD, Great Salt Lake solar harvest heritage, mineral science, and FAQs.
3. **Statutory Disclaimers:** Conspicuous Filipino warning (*"MAHALAGANG PAALALA..."*) and English notice (*"NO APPROVED THERAPEUTIC CLAIMS"*) prominently embedded into public layouts.
4. **Camarines Norte Six-Branch Directory:** Public directory for Daet, Labo, Paracale, Panganiban, Capalonga, and Sta. Elena detailing operating hours and branch contact details.
5. **Transparency & Legal Footers:** Merchant identification disclosures under RA 11967, Terms of Service, Privacy Policy, Return & Refund Policy, and DTI/FDA consumer notices.

---

## 18. Phase 0 Acceptance Criteria Verification

| # | Acceptance Criterion | Evidence / Document Reference | Status |
| :---: | :--- | :--- | :---: |
| **1** | Product & Regulatory Research Documented | `docs/compliance/regulatory-research.md` (Primary sources, FR-4000008713595, 5-tier claims matrix). | **SATISFIED** |
| **2** | Philippine E-Commerce Requirements Documented | `docs/compliance/ecommerce-compliance.md` & `legal-citation-matrix.md` (RA 11967 Sec 23/24, RA 7394, EOPT RA 11976). | **SATISFIED** |
| **3** | Privacy Requirements Documented | `docs/compliance/privacy-requirements.md` & `privacy-legal-basis-matrix.md` (RA 10173 Sec 12/13, lawful bases). | **SATISFIED** |
| **4** | Business Requirements Documented | `docs/requirements/business-requirements.md` & `ecommerce-requirements.md` (Business model, discovery checklist). | **SATISFIED** |
| **5** | All Six Branches Fully Represented | `docs/requirements/branch-requirements.md` (Daet, Labo, Paracale, Panganiban, Capalonga, Sta. Elena). | **SATISFIED** |
| **6** | Consultation / Privacy Boundaries Defined | `docs/compliance/health-data-boundary.md` & `docs/requirements/consultation-requirements.md` (SPI isolation, explicit consent). | **SATISFIED** |
| **7** | Mobile / PWA Requirements Defined | `docs/requirements/mobile-requirements.md` (Responsive layout, PWA manifest, offline ticket shell, HTML5 camera scanner). | **SATISFIED** |
| **8** | Initial Architecture Documented | `docs/architecture/initial-architecture.md` (Modular monolith, Next.js + TypeScript, PostgreSQL, typed ORM, RBAC). | **SATISFIED** |
| **9** | Open Questions & Blockers Explicit | `docs/requirements/OPEN_QUESTIONS.md` & `docs/compliance/compliance-open-questions.md` (Prioritized action items). | **SATISFIED** |
| **10** | Phase 1 Scope Clearly Defined | Section 17 of this report (Platform Foundation, Public Website, 6-Branch Directory, Disclaimers). | **SATISFIED** |
| **11** | No Application Functionality Implemented | Verified repository state: Zero UI, schemas, APIs, checkout, or auth implementations. | **SATISFIED** |
| **12** | No Secrets or Credentials Created | Zero API keys or secrets injected. `.env.example` remains clean. | **SATISFIED** |
| **13** | Final Phase 0 Report with Exact Outcome | This document explicitly renders the remediated certification decision. | **SATISFIED** |

---

## 19. Final Certification Decision

Based on the primary regulatory sources identified, the verified FDA product registration record (FR-4000008713595), the accurate statutory mappings under RA 11967, RA 11976 (EOPT), BIR regulations, and RA 10173, the separation of statutory mandates from platform policies, the rigorous demarcation of facts and assumptions, the complete representation of all six Camarines Norte branches, and the strict absence of prohibited Phase 1 application code:

The Phase 0 documentation baseline is certified as complete, legally qualified, and sound for architectural planning.

**PHASE 0 — PASS / CERTIFIED**

*(Stopping at Phase 0 gate. Waiting for explicit business authorization to begin Phase 1.)*
