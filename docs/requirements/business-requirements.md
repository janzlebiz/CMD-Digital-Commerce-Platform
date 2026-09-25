# Business Requirements & Discovery Specification

**Document ID:** REQ-BUS-001 (Remediated)  
**Project:** HCI CMD Digital Commerce Platform  
**Target Market:** Camarines Norte, Bicol Region, Philippines  
**Audit Phase:** Phase 0 Remediation — Business Architecture Baseline  
**Status:** Certified Audit Baseline (Qualified with Business Open Questions)  
**Date of Audit:** 2026-09-25  

---

## 1. Executive Business Profile & Pillars

The platform serves an independent distribution and wellness enterprise operating in Camarines Norte, Philippines, centered around **HCI CMD (Cell Mineral Drops)** and complementary wellness offerings.

### 1.1 Five Core Business Activities
1. **Product Distribution / E-Commerce:** Digital storefront and physical branch fulfillment of bottled mineral drops and approved wellness products.
2. **Naturopathic / Wellness Consultations:** Personalized appointments (in-person at designated branches or virtually) providing dietary, hydration, and nutritional coaching.
3. **Wellness Education & Content:** Scientific and nutritional content on mineral balance, cellular hydration, and lifestyle vitality.
4. **Symposiums & Events:** In-person and hybrid health seminars, distributor briefings, and community wellness symposiums across Camarines Norte.
5. **Branch-Based Customer Service & Fulfillment:** Six physical hubs providing localized inventory, immediate customer support, order pickup, and face-to-face service.

---

## 2. Six Physical Branch Network (Camarines Norte)

The enterprise operates six physical branch facilities across Camarines Norte (*Business-Provided Mandate*):

| Branch # | Municipality | Operational Role | Strategic Importance | Fulfillment Capabilities | Current Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Branch 1** | **Daet** | **Provincial Central Hub** (*Operational Assumption*) | Capital municipality, main logistics depot, executive office. | Central inventory replenishment, local delivery dispatch, branch pickup, consultation suite. | Operational baseline established; exact street address & phone number required. |
| **Branch 2** | **Labo** | Interior Commercial Corridor Hub | Highly populated interior municipality along Maharlika Highway. | Local branch pickup, local town delivery, consultation appointments. | Operational baseline established; exact street address & phone number required. |
| **Branch 3** | **Paracale** | Coastal / Mining Hub | Historic gold/mining municipality on northern coast. | Local branch pickup, consultation point, community health seminars. | Operational baseline established; exact street address & phone number required. |
| **Branch 4** | **Panganiban** | Northern Coastal Branch | Traditional trading and coastal community. | Local branch pickup, community distribution point. | Operational baseline established; exact street address & phone number required. |
| **Branch 5** | **Capalonga** | Northwestern Pilgrimage Hub | Coastal pilgrimage destination; serves distant rural barangays. | Local branch pickup, wellness visitor center. | Operational baseline established; exact street address & phone number required. |
| **Branch 6** | **Sta. Elena** | Western Border Hub | Gateway municipality connecting Camarines Norte to Quezon Province. | Strategic border pickup point, highway transit fulfillment. | Operational baseline established; exact street address & phone number required. |

---

## 3. Business Discovery Checklist (Information Required from Business Owner)

Prior to entering Phase 1 implementation, the business owner must provide the following verified operating parameters:

### 3.1 Legal & Commercial Identity
- [ ] Registered business entity name (DTI or SEC registration).
- [ ] Certificate of Registration (BIR Form 2303), official TIN, and BIR Registration Seal Badge asset with QR verification code (BIR RMC No. 38-2026).
- [ ] Tax classification: Confirmation of VAT (12%) vs. Non-VAT (Percentage Tax) status.
- [ ] Formal distributor agreement with Health Code International (HCI).
- [ ] Physical copy of official FDA product registration documentation for FR-4000008713595 including approved packaging specification annex establishing commercial volumes (e.g. 65 mL, 30 mL).

### 3.2 Product Catalog & Commercial Pricing
- [ ] Final SKU list with corresponding FDA packaging authorization evidence (confirming whether 65 mL, 30 mL, or other presentations are covered).
- [ ] Retail Selling Price (SRP) per SKU in Philippine Peso (PHP).
- [ ] Wholesale / Member pricing tiers (if multi-level distributor discounts apply).
- [ ] High-resolution product packaging photography (front, nutrition panel, tamper seal).

### 3.3 Branch Operational Parameters
For each of the six branches (Daet, Labo, Paracale, Panganiban, Capalonga, Sta. Elena):
- [ ] Complete street address, barangay, landmark, and GPS coordinates.
- [ ] Daily operating hours (weekdays, Saturdays, Sundays/holidays).
- [ ] Dedicated mobile contact number and email for branch customer service.
- [ ] Verification of branch staff smartphones and camera availability for QR scanning.

### 3.4 Inventory & Logistics Parameters
- [ ] Confirmation of Daet central warehouse replenishment model vs. direct-to-branch supplier shipments.
- [ ] Branch reorder threshold levels.
- [ ] Local delivery barangay coverage and delivery fee schedule per municipality.
- [ ] Courier execution model: In-house dispatch riders vs. local 3rd-party logistics.

### 3.5 Payments & Invoicing
- [ ] Selected payment gateway merchant account (e.g. PayMongo, Maya Business, GCash).
- [ ] Cash on Delivery (COD) eligibility rules and maximum order limits.
- [ ] Invoicing arrangement: Central Daet invoicing vs. dedicated branch BIR codes.

### 3.6 Naturopathic Consultations & Practitioners
- [ ] Profiles, bios, credentials, and formal certifications of appointed practitioners.
- [ ] Consultation format: In-person (which branches?), Video, Phone.
- [ ] Appointment pricing model: Fixed fee vs. complimentary with product purchase.

---

## 4. Operational Role Taxonomy (RBAC)

The platform supports distinct operational roles to enforce data privacy and operational boundaries:

1. **Customer / Member:** Browse catalog, place orders, book consultations, register for events, view own profile.
2. **Branch Staff / Fulfillment Officer:** View assigned branch orders, mark orders packed/ready for pickup, confirm customer handovers, log branch stock counts.
3. **Naturopathic Practitioner:** View assigned appointments, access confidential health intake questionnaires, record encrypted clinical notes.
4. **Event Coordinator:** Create event listings, monitor registrations, scan attendee QR passes at venue doors.
5. **Branch Manager:** Supervise branch staff, approve local stock adjustments, monitor branch order fulfillment.
6. **Central Operations & Compliance Officer:** Oversee all six branches, review and approve educational content/claims, manage central supplier restocking.
7. **System Administrator:** Manage user access roles, system configurations, technical security, and immutable audit logs.
