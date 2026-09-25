# Business Requirements & Discovery Specification

**Document ID:** REQ-BUS-001  
**Project:** HCI CMD Digital Commerce Platform  
**Target Market:** Camarines Norte, Bicol Region, Philippines  
**Audit Phase:** Phase 0 — Baseline Business Architecture  
**Status:** Certified Audit Baseline  
**Date:** 2026-09-25  

---

## 1. Executive Business Profile

The platform serves an independent distribution and wellness enterprise based in Camarines Norte, Philippines, centered around **HCI CMD (Cell Mineral Drops)** and complementary wellness offerings.

### 1.1 Five Core Business Pillars
1. **Digital Commerce & Retail Distribution:** Online storefront and branch pickup/delivery of bottled mineral drop products and approved wellness items.
2. **Naturopathic & Wellness Consultations:** One-on-one appointments (in-person at designated branches or virtually) offering dietary, hydration, and nutritional coaching.
3. **Wellness Education & Content:** Scientific and nutritional content on mineral balance, cellular hydration, and lifestyle vitality.
4. **Symposiums & Educational Events:** In-person and hybrid health seminars, distributor briefings, and community wellness symposiums across Camarines Norte.
5. **Branch Network Fulfillment:** Six physical hubs providing localized inventory, immediate customer support, order pickup, and face-to-face service.

---

## 2. Branch Network (Camarines Norte)

The enterprise operates six physical branch facilities across the province:

| Branch # | Municipality | Operational Role | Strategic Importance | Fulfillment Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Branch 1** | **Daet** | **Provincial Central Hub** | Capital municipality, main logistics depot, executive office. | Central inventory replenishment, local delivery, branch pickup, consultation suite. |
| **Branch 2** | **Labo** | Commercial Corridor Hub | Highly populated interior municipality along Maharlika Highway. | Local branch pickup, local town delivery, consultation appointments. |
| **Branch 3** | **Paracale** | Coastal / Mining Hub | Historic gold/mining municipality on northern coast. | Local branch pickup, consultation point, community health seminars. |
| **Branch 4** | **Panganiban** | Northern Coastal Branch | Traditional trading and coastal community. | Local branch pickup, community distribution point. |
| **Branch 5** | **Capalonga** | Northwestern Pilgrimage Hub | Coastal pilgrimage destination; serves distant rural barangays. | Local branch pickup, wellness visitor center. |
| **Branch 6** | **Sta. Elena** | Western Border Hub | Gateway municipality connecting Camarines Norte to Quezon Province. | Strategic border pickup point, highway customer fulfillment. |

---

## 3. Business Discovery Checklist (Information Required from Business Owner)

Prior to entering Phase 1 implementation, the business owner must provide the following verified operating parameters:

### 3.1 Legal & Commercial Identity
- [ ] Registered business entity name (DTI or SEC registration).
- [ ] Certificate of Registration (BIR Form 2303) and official TIN.
- [ ] Local Mayor's / Business Permits for Daet and branch locations.
- [ ] Formal distributor agreement with Health Code International (HCI).
- [ ] Active FDA License to Operate (LTO) and product Certificate of Product Registration (CPR).

### 3.2 Product Catalog & Commercial Pricing
- [ ] Final SKU list (e.g., HCI CMD 65 mL, 30 mL, bundles, companion products).
- [ ] Retail Selling Price (SRP) per SKU in Philippine Peso (PHP).
- [ ] Wholesale / Member pricing tiers (if multi-level distributor discounts apply).
- [ ] High-resolution product photography (front, back showing nutrition facts/disclaimers, seal).
- [ ] Verified physical box text and instructions.

### 3.3 Branch Details & Operational Hours
For each of the six branches (Daet, Labo, Paracale, Panganiban, Capalonga, Sta. Elena):
- [ ] Complete street address, barangay, landmark, and GPS coordinates.
- [ ] Daily operating hours (weekdays, Saturdays, Sundays/holidays).
- [ ] Assigned branch manager, staff names, and dedicated mobile contact numbers.
- [ ] Active local services (e.g., Is consultation offered at this branch? Is stock held permanently?).

### 3.4 Inventory & Fulfillment Rules
- [ ] Central warehouse location (confirming Daet hub as main warehouse).
- [ ] Branch reorder threshold levels and transfer transit intervals.
- [ ] Local delivery coverage barangays per branch.
- [ ] Local delivery fee schedule (fixed fee vs. distance-based vs. free threshold over ₱X,000).
- [ ] In-house motorcycle dispatch vs. third-party local couriers (e.g., Maxim, Lalamove, J&T).

### 3.5 Payment Methods
- [ ] Online payment gateway merchant account (GCash, Maya, QR Ph, Credit/Debit card).
- [ ] Cash on Delivery (COD) eligibility rules and maximum order limits.
- [ ] Cash on Pickup (COP) handling procedures at branch cash registers.
- [ ] Official sales invoice / POS integration approach.

### 3.6 Naturopathic Consultations & Practitioners
- [ ] Profiles, bios, credentials, and formal qualifications of authorized practitioners.
- [ ] Available consultation formats: In-person (which branches?), Video/Online (Google Meet/Zoom), Phone.
- [ ] Appointment fees (or free consultation with minimum product purchase).
- [ ] Scheduling slots (e.g., 30-minute or 45-minute blocks).
- [ ] Cancellation, rescheduling, and no-show policies.

### 3.7 Symposiums & Events
- [ ] Typical event types: Community Health Orientation, Product Demo, Distributor Training, Wellness Symposium.
- [ ] Ticketing policy: Free admission vs. paid registration vs. seat reservation deposit.
- [ ] Maximum room capacities per branch or rented venue halls in Daet.

---

## 4. Operational Role Taxonomy (RBAC)

The platform must support distinct operational roles to enforce data privacy and operational boundaries:

1. **Customer / Member:** Browse catalog, place orders, book consultations, register for events, view own history.
2. **Branch Staff / Fulfillment Officer:** View assigned branch orders, mark orders packed/ready for pickup, hand over orders to customers/couriers, log branch stock counts.
3. **Naturopathic Practitioner:** View assigned appointments, access confidential intake forms, maintain encrypted consultation notes.
4. **Event Coordinator:** Create event listings, monitor registrations, scan attendee QR passes at venue doors.
5. **Branch Manager:** Supervise branch staff, approve branch stock adjustments, monitor local branch revenue and order fulfillment.
6. **Central Operations & Compliance Officer:** Oversee all six branches, review and approve educational content/claims, manage central supplier restocking.
7. **System Administrator:** Manage user access roles, system configurations, technical security, and immutable audit logs.
