# Phase 1 Architectural Specification & Implementation Dossier

**Document ID:** ARCH-PHASE-1-SPEC  
**Project:** HCI CMD Digital Commerce Platform  
**Target Territory:** Camarines Norte, Philippines  
**Phase:** Phase 1 — Foundation + Public Website  
**Status:** IMPLEMENTED & VERIFIED  
**Date of Record:** September 2026  
**Auditor / Architect:** Lead Product & Technical Architect  

---

## 1. Architectural Overview & Design Philosophy

Phase 1 establishes the production-grade application shell, responsive design system, and public-facing informational surfaces for the HCI CMD™ Camarines Norte — Regional Information & Education Platform.

### Core Architectural Decisions:
1. **Zero-Pill & Metadata Discipline:** Enforced anti-slop design constitution. Informational metadata (dates, categories, registration numbers) is rendered as clean unboxed text with subtle typographic separators (`·`), while interactive filtering states use functional button elements.
2. **Strict Phase Boundary Enforcement:** Complete separation of presentation layers from deferred transaction engines. No checkout, database migrations, authentication, payment gateways, CRM, or consultation booking logic were implemented during Phase 1.
3. **Regulatory Anchor Integration:** Statutory disclaimers required by Philippine Law (FDA Circular No. 2015-003, RA 9711, RA 11967, and DOH AO 2014-0030) are permanently mounted in the application shell via `<StatutoryBanner />` and `<Footer />`.
4. **URL Hash Synchronized Client Router:** Zero-dependency URL hash routing (`#about`, `#products`, `#branches`, `#faq`, `#compliance`, `#terms`, `#privacy`, `#returns`) enables browser history navigation, back/forward support, and deep-linking without server-side routing complexity.
5. **Strict Evidence Boundary Maintenance:** Outstanding Phase 0 blockers (TIN, VAT/Non-VAT status, 65 mL/30 mL FDA packaging annexes, exact branch street addresses, and local telephone numbers) are strictly preserved with unambiguous *Pending Business Confirmation* states.
6. **Local/Non-Persistent Demo Contact Form:** To maintain a strict static presentation boundary without backend data storage, the contact page functions as a client-side mock submission only, clearly informing the user that no data is transmitted or stored.

---

## 2. Directory Structure & Modular Layout

```
src/
├── types/
│   └── index.ts                 # Strongly-typed interfaces for navigation, branches, SKUs, FAQs
├── data/
│   ├── branches.ts              # 6 Camarines Norte branch records with evidentiary status
│   ├── products.ts              # Catalog architecture (FR-4000008713595, 65 mL & 30 mL)
│   ├── compliance.ts            # Statutory notices, 5-tier claims model, BIR RMC 38-2026 data
│   └── faq.ts                   # Searchable categorized FAQs with regulatory anchors
├── components/
│   ├── layout/
│   │   ├── StatutoryBanner.tsx  # High-contrast FDA Circular 2015-003 Filipino & English banner
│   │   ├── Navbar.tsx           # Responsive sticky header with brand and accessible navigation
│   │   └── Footer.tsx           # Comprehensive legal, statutory, branch directory, and compliance footer
│   └── ui/
│       ├── BirSealBadge.tsx     # BIR RMC No. 38-2026 digital seal badge placeholder
│       └── RegulatoryNotice.tsx # Reusable WCAG-compliant regulatory callout component
├── views/
│   ├── HomeView.tsx             # Homepage: Hero, credentials, educational pillars, branch overview
│   ├── AboutView.tsx            # Great Salt Lake origin, low sodium, HCI Corp, ethical marketing code
│   ├── EducationView.tsx        # Mineral science, dilution guide, water remineralization, eye drop warning
│   ├── ProductsView.tsx         # Catalog architecture, packaging status ("PENDING BUSINESS VERIFICATION")
│   ├── BranchesView.tsx         # Interactive 6-branch directory (Daet, Labo, Paracale, Panganiban, Capalonga, Sta. Elena)
│   ├── FaqView.tsx              # Interactive search & category filter FAQ accordion
│   ├── ContactView.tsx          # Regional inquiry form with client-side validation & branch routing
│   ├── ComplianceView.tsx       # Regulatory & Transparency Center (FDA, 5-tier claims, BIR, RA 11976 5-yr retention)
│   ├── TermsView.tsx            # Terms of Service under Philippine Law (RA 11967, RA 7394, RA 9711)
│   ├── PrivacyView.tsx          # Privacy Policy (RA 10173 & IRR, Section 13(a) consultation baseline)
│   └── ReturnsView.tsx          # Return & Refund Policy (RA 7394, dietary supplement seal hygiene rules)
├── App.tsx                      # Root shell connecting banner, navbar, active view, and footer
├── main.tsx                     # React 19 application mount
└── index.css                    # Tailwind CSS v4 design tokens and styling
```

---

## 3. Compliance & Regulatory Controls Implemented

| Compliance Requirement | Legal / Regulatory Authority | Implementation Method |
| :--- | :--- | :--- |
| **Mandatory Filipino Warning** | FDA Circular No. 2015-003 & DOH AO 2014-0030 | Prominently fixed in `<StatutoryBanner />` and every view header: *"MAHALAGANG PAALALA: ANG HCI CELL MINERAL DROPS AY HINDI GAMOT..."* |
| **English Statutory Disclaimer** | RA 9711 | *"NO APPROVED THERAPEUTIC CLAIMS"* embedded on all product surfaces. |
| **Ophthalmic Use Prohibition** | Safety Policy & COMP-POL-002 | Explicit high-visibility warning in `<EducationView />` and `<FaqView />` forbidding application into human eyes. |
| **BIR Registration Seal Badge** | BIR RMC No. 38-2026 | Dedicated `<BirSealBadge />` placeholder with QR verification frame and statutory notice. |
| **Tax Records Retention** | NIRC Section 235 as amended by RA 11976 | Clear 5-year accounting records preservation disclosures in `<Footer />`, `<PrivacyView />`, and `<ComplianceView />`. |
| **Consultation Privacy Baseline** | RA 10173 Section 13(a) | Fact-dependent wording established in `<PrivacyView />` (relying on Section 13(a) explicit consent for wellness model; reassessing 13(e) if medical treatment is introduced). |
| **Unopened Supplement Hygiene** | RA 7394 & RA 11967 | Tamper-evident white opaque plastic bottle shrink-wrap requirement detailed in `<ReturnsView />`. |

---

## 4. Phase 1 Verification Summary

- [x] Application shell with responsive navigation and mobile drawer
- [x] High-contrast statutory banner with mandatory FDA wording
- [x] Homepage with editorial hero, credentials, and educational pillars
- [x] About HCI CMD page detailing Great Salt Lake origin and Health Code International Corp.
- [x] Mineral Science & Dilution Guide with water dilution and strict eye drop prohibition
- [x] Product Catalog Architecture with explicit *FDA PRESENTATION EVIDENCE PENDING BUSINESS VERIFICATION*
- [x] Six-Branch Directory (Daet Central Hub, Labo, Paracale, Jose Panganiban, Capalonga, Sta. Elena) with strict *Pending Business Confirmation* markers for exact addresses and phones
- [x] Interactive FAQ with search, category filtering, and regulatory citations
- [x] Contact surface with local non-persistent demo form
- [x] Comprehensive Regulatory & Transparency Center
- [x] Legally sound Terms of Service, Privacy Policy (RA 10173), and Return/Refund Policy (RA 7394)
- [x] Complete absence of Phase 2 features (no checkout, cart transactions, auth, DB, or CRM)
- [x] Zero compilation or linting errors
