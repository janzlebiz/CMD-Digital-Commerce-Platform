# Architectural & Compliance Decision Log (ADR)

**Document ID:** DEC-LOG-001  
**Project:** HCI CMD Digital Commerce Platform  
**Target Territory:** Camarines Norte, Philippines  
**Audit Phase:** Phase 0 — Baseline Architecture  
**Status:** Certified Audit Baseline  
**Date:** 2026-09-25  

---

## 1. Decision Records Index

| ADR ID | Decision Title | Status | Date | Primary Driver |
| :--- | :--- | :--- | :--- | :--- |
| **ADR-001** | Modular Monolith Architecture over Microservices | **ACCEPTED** | 2026-09-25 | Operational simplicity & transactional ACID integrity for branch inventory. |
| **ADR-002** | Strict Health Data Logical & Cryptographic Isolation | **ACCEPTED** | 2026-09-25 | Compliance with Section 13 (Sensitive Personal Information) of RA 10173. |
| **ADR-003** | Mandatory Tagalog & English Disclaimers on Product Surfaces | **ACCEPTED** | 2026-09-25 | Compliance with FDA Circular No. 2015-003 & AO 2014-0030. |
| **ADR-004** | Prohibition of Ophthalmic & Therapeutic Claims | **ACCEPTED** | 2026-09-25 | FDA Public Health Advisory No. 2019-363 & 2020-1389. |
| **ADR-005** | Real-Time Branch-Aware Inventory Reservation | **ACCEPTED** | 2026-09-25 | Prevention of stock overselling across six Camarines Norte branches. |
| **ADR-006** | Progressive Web App (PWA) with Offline QR Ticket Shell | **ACCEPTED** | 2026-09-25 | High mobile usage (>85%) and intermittent rural cellular connectivity. |
| **ADR-007** | Zero Application Code Implementation in Phase 0 | **ACCEPTED** | 2026-09-25 | Strict Phase 0 Audit & Discovery boundary discipline. |

---

## 2. Detailed Architecture Decision Records (ADRs)

### ADR-001: Modular Monolith Architecture
- **Context:** The platform coordinates e-commerce, multi-branch inventory, appointment scheduling, event ticketing, CRM, and content publishing for six branches in Camarines Norte.
- **Decision:** Build as a Modular Monolith in TypeScript with strictly decoupled domain boundaries rather than distributed microservices.
- **Consequences:**
  - *Positive:* Fast single-codebase development, zero distributed network latency, straightforward local transactions for branch inventory transfer, single deployment target.
  - *Negative:* Requires strict internal code boundary discipline to prevent domain spaghetti (enforced via linting and module structure).

### ADR-002: Strict Health Data Isolation
- **Context:** Naturopathic consultations capture sensitive client lifestyle and dietary habits. Under Philippine RA 10173, unauthorized disclosure of sensitive personal information incurs criminal penalties.
- **Decision:** Health intake records and clinical notes must reside in an isolated persistence schema, protected by application-level AES-256-GCM encryption and an isolated RBAC boundary where retail branch staff have zero access.
- **Consequences:**
  - *Positive:* Full regulatory compliance with NPC directives; protects client confidentiality.
  - *Negative:* Slightly increased complexity for practitioner dashboard workflows.

### ADR-003: Mandatory Statutory Product Disclaimers
- **Context:** HCI CMD is registered as a processed food supplement, not a pharmaceutical drug.
- **Decision:** Embed mandatory Tagalog disclaimer (*"MAHALAGANG PAALALA: ANG HCI CELL MINERAL DROPS AY HINDI GAMOT..."*) and English disclaimer (*"NO APPROVED THERAPEUTIC CLAIMS"*) prominently on every product surface, receipt, and promotional banner.
- **Consequences:**
  - *Positive:* Protects the enterprise against FDA sanctions and DTI deceptive advertising penalties.
  - *Negative:* Non-negotiable visual real estate requirement on mobile screens.

### ADR-004: Prohibition of Ophthalmic Claims
- **Context:** Past market advisories (FDA Advisory 2019-363) noted hazardous misuse of mineral drop solutions in the eyes.
- **Decision:** Programmatically enforce an automated publishing filter that rejects any content, FAQ, or consultation note referencing "eye drops", "cataracts", "glaucoma", or ocular administration.
- **Consequences:**
  - *Positive:* Eliminates extreme medical liability and prevents blindness hazards.
  - *Negative:* Rejects any unverified customer testimonials attempting to promote eye drop usage.

### ADR-005: Branch-Aware Real-Time Inventory Reservation
- **Context:** Customers can purchase for delivery or pickup at six distinct branches. Selling a bottle online that was just bought in person at the Labo counter destroys customer trust.
- **Decision:** Implement row-level locking (`SELECT ... FOR UPDATE`) in PostgreSQL with a 15-minute soft-reservation window during checkout.
- **Consequences:**
  - *Positive:* Eliminates inventory stockouts and fulfillment failures.
  - *Negative:* Requires automated background cleanup for abandoned carts.

### ADR-006: Progressive Web App (PWA) with Offline QR Ticket Cache
- **Context:** Camarines Norte customers frequently encounter weak cellular connectivity in rural municipalities (Capalonga, Paracale).
- **Decision:** Deploy as an installable PWA caching event tickets, pickup codes, and branch directories offline via Service Workers.
- **Consequences:**
  - *Positive:* Seamless customer experience at event registration doors and pickup counters even during telco blackouts.
  - *Negative:* Service worker caching strategies must be rigorously maintained.

### ADR-007: Zero Application Code in Phase 0
- **Context:** The Phase 0 brief strictly mandates: "DO NOT BUILD APPLICATION FUNCTIONALITY IN PHASE 0. INSPECT → RESEARCH → DOCUMENT → IDENTIFY GAPS → CERTIFY."
- **Decision:** Refrain from creating application UI, database migrations, authentication routes, APIs, or checkout code in Phase 0. Deliver a comprehensive, evidence-based audit package.
- **Consequences:**
  - *Positive:* Solid, risk-free foundation for Phase 1; complete clarity on business gaps and legal obligations.
  - *Negative:* Deferred user interface generation until Phase 1 authorization.
