# Architectural & Compliance Decision Log (ADR)

**Document ID:** DEC-LOG-001 (Remediated)  
**Project:** HCI CMD Digital Commerce Platform  
**Target Territory:** Camarines Norte, Philippines  
**Audit Phase:** Phase 0 Remediation — Architecture Decision Records  
**Status:** Certified Audit Baseline  
**Date of Audit:** 2026-09-25  

---

## 1. Decision Records Index

| ADR ID | Decision Title | Status | Date | Primary Driver |
| :--- | :--- | :--- | :--- | :--- |
| **ADR-001** | Modular Monolith Architecture over Microservices | **ACCEPTED** | 2026-09-25 | Operational simplicity & transactional ACID integrity for branch inventory. |
| **ADR-002** | Strict Health Data Isolation & Explicit Consent Model | **ACCEPTED** | 2026-09-25 | Compliance with Section 13(a) (Sensitive Personal Information) of RA 10173. |
| **ADR-003** | Mandatory Tagalog & English Disclaimers on Product Surfaces | **ACCEPTED** | 2026-09-25 | Compliance with FDA Circular No. 2015-003 & AO 2014-0030. |
| **ADR-004** | Platform Compliance Policy Prohibiting Ophthalmic Claims | **ACCEPTED** | 2026-09-25 | FDA Public Health Advisory No. 2019-363 & 2020-1389 risk mitigation. |
| **ADR-005** | Real-Time Branch-Aware Inventory Reservation | **ACCEPTED** | 2026-09-25 | Prevention of stock overselling across six Camarines Norte branches. |
| **ADR-006** | Progressive Web App (PWA) with Offline QR Ticket Shell | **ACCEPTED** | 2026-09-25 | High mobile usage (>85%) and intermittent rural cellular connectivity. |
| **ADR-007** | Zero Application Code Implementation in Phase 0 | **ACCEPTED** | 2026-09-25 | Strict Phase 0 Audit & Discovery boundary discipline. |
| **ADR-008** | Sales Invoice Standardization Under Ease of Paying Taxes (EOPT) Act | **ACCEPTED** | 2026-09-25 | RA 11976 & RA 11967 statutory invoice substantiation for goods and services. |

---

## 2. Detailed Architecture Decision Records (ADRs)

### ADR-001: Modular Monolith Architecture
- **Context:** The platform coordinates e-commerce, multi-branch inventory, appointment scheduling, event ticketing, CRM, and content publishing for six branches in Camarines Norte.
- **Decision:** Build as a Modular Monolith in TypeScript with strictly decoupled domain boundaries rather than distributed microservices.
- **Consequences:** Fast single-codebase development, zero distributed network latency, straightforward local transactions for branch inventory transfer, single deployment target.

### ADR-002: Strict Health Data Isolation & Explicit Consent Model
- **Context:** Naturopathic consultations capture sensitive client lifestyle and dietary habits. Under Philippine RA 10173, wellness coaching cannot rely on Section 13(e) (medical treatment by licensed physician).
- **Decision:** Health intake records and clinical notes must reside in an isolated persistence schema, protected by application-level AES-256-GCM encryption and anchored strictly to Section 13(a) Explicit Informed Consent.
- **Consequences:** Protects client confidentiality and ensures lawful processing of Sensitive Personal Information under NPC regulations.

### ADR-003: Mandatory Statutory Product Disclaimers
- **Context:** HCI CMD is registered under FR-4000008713595 as a food supplement, not a pharmaceutical drug.
- **Decision:** Embed mandatory Tagalog disclaimer (*"MAHALAGANG PAALALA: ANG HCI CELL MINERAL DROPS AY HINDI GAMOT..."*) and English disclaimer (*"NO APPROVED THERAPEUTIC CLAIMS"*) prominently on every product surface, sales invoice, and promotional banner.
- **Consequences:** Protects the enterprise against FDA sanctions and DTI deceptive advertising penalties.

### ADR-004: Platform Compliance Policy Prohibiting Ophthalmic Claims
- **Context:** Past market advisories (FDA Advisory 2019-363) noted hazardous misuse of mineral drop solutions in the eyes.
- **Decision:** Adopt an uncompromised platform compliance policy that programmatically rejects any content, FAQ, or consultation note referencing "eye drops", "cataracts", "glaucoma", or ocular administration.
- **Consequences:** Eliminates extreme medical liability and prevents blindness hazards.

### ADR-005: Branch-Aware Real-Time Inventory Reservation
- **Context:** Customers can purchase for delivery or pickup at six distinct branches. Selling a bottle online that was just bought in person at the Labo counter destroys customer trust.
- **Decision:** Implement row-level locking (`SELECT ... FOR UPDATE`) in PostgreSQL with a 15-minute soft-reservation window during checkout.
- **Consequences:** Eliminates inventory stockouts and fulfillment failures.

### ADR-006: Progressive Web App (PWA) with Offline QR Ticket Cache
- **Context:** Camarines Norte customers frequently encounter weak cellular connectivity in rural municipalities (Capalonga, Paracale).
- **Decision:** Deploy as an installable PWA caching event tickets, pickup codes, and branch directories offline via Service Workers.
- **Consequences:** Seamless customer experience at event registration doors and pickup counters even during telco blackouts.

### ADR-007: Zero Application Code in Phase 0
- **Context:** The Phase 0 brief strictly mandates: "DO NOT BUILD APPLICATION FUNCTIONALITY IN PHASE 0. INSPECT → RESEARCH → DOCUMENT → IDENTIFY GAPS → CERTIFY."
- **Decision:** Refrain from creating application UI, database migrations, authentication routes, APIs, or checkout code in Phase 0. Deliver a comprehensive, evidence-based audit package.
- **Consequences:** Completely verified, risk-free foundation for Phase 1.

### ADR-008: Sales Invoice Standardization Under EOPT Act (RA 11976)
- **Context:** Republic Act No. 11976 (Ease of Paying Taxes Act) abolished the requirement for Official Receipts as primary VAT substantiation for services, establishing the Sales Invoice as the sole primary document.
- **Decision:** The platform automated billing engine will generate standardized serialized electronic **Sales Invoices** for both product sales and wellness consultation fees.
- **Consequences:** Aligns accounting and billing with current 2024–2026 Philippine tax statutes.
