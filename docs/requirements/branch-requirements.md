# Branch Network & Physical Operations Requirements

**Document ID:** REQ-BRN-003  
**Project:** HCI CMD Digital Commerce Platform  
**Target Territory:** Camarines Norte, Philippines  
**Audit Phase:** Phase 0 — Baseline Requirements  
**Status:** Certified Audit Baseline  
**Date:** 2026-09-25  

---

## 1. Branch Network Overview

The platform supports an integrated distribution model across six physical branches in Camarines Norte. Each branch serves as an inventory holding location, order pickup point, fulfillment staging ground, and customer service center.

```
                     ┌────────────────────────────────┐
                     │          DAET HUB              │
                     │  (Central Logistics & Admin)   │
                     └───────────────┬────────────────┘
                                     │
           ┌───────────────┬─────────┴───────┬───────────────┐
           ▼               ▼                 ▼               ▼
     ┌───────────┐   ┌───────────┐     ┌───────────┐   ┌───────────┐
     │   LABO    │   │ PARACALE  │     │PANGANIBAN │   │ CAPALONGA │
     └───────────┘   └───────────┘     └───────────┘   └───────────┘
           │
           ▼
     ┌───────────┐
     │STA. ELENA │
     └───────────┘
```

---

## 2. Six Physical Branch Specifications

### Branch 1: Daet (Central Logistics & Wellness Suite)
- **Municipality:** Daet (Provincial Capital)
- **Role:** Main provincial distribution center, central inventory replenishment warehouse, administrative headquarters, flagship wellness consultation suite.
- **Delivery Scope:** Daet urban core, Mercedes, San Vicente, San Lorenzo Ruiz, Basud, and Talisay.
- **Fulfillment Services:** High-volume Branch Pickup, Same-Day Courier Dispatch, Inter-branch Stock Transfers, In-Person Naturopathic Consultations, Executive Symposiums.
- **Facilities:** Dedicated air-conditioned consultation room, bulk inventory stockroom, customer reception counter, express pickup queue.

### Branch 2: Labo (Interior Commercial Corridor)
- **Municipality:** Labo
- **Role:** Major inland commercial center serving the largest geographical municipality in Camarines Norte along the Maharlika Highway.
- **Delivery Scope:** Labo poblacion and surrounding rural agricultural barangays.
- **Fulfillment Services:** Branch Pickup, Local Motorcycle Delivery Dispatch, Scheduled Wellness Consultations.
- **Facilities:** Counter retail desk, secure inventory cabinet, private consultation desk.

### Branch 3: Paracale (Coastal / Mining District Hub)
- **Municipality:** Paracale
- **Role:** Historic coastal municipality; serves coastal fishing communities and mining district households.
- **Delivery Scope:** Paracale municipal boundaries and neighboring coastal barangays.
- **Fulfillment Services:** Branch Pickup, Community Distributor Restocking, Scheduled Educational Workshops.
- **Facilities:** Retail display counter, inventory storage unit, consultation booth.

### Branch 4: Panganiban (Jose Panganiban / Northern Coastal)
- **Municipality:** Jose Panganiban
- **Role:** Northern coastal commercial port town.
- **Delivery Scope:** Jose Panganiban urban proper, port area, and coastal communities.
- **Fulfillment Services:** Branch Pickup, Customer Care, Distributor Meetings.
- **Facilities:** Front service desk, secure stockroom.

### Branch 5: Capalonga (Northwestern Pilgrimage & Coastal Center)
- **Municipality:** Capalonga
- **Role:** Renowned pilgrimage destination and coastal hub in northwestern Camarines Norte.
- **Delivery Scope:** Capalonga poblacion and adjacent rural coastal settlements.
- **Fulfillment Services:** Branch Pickup (popular for visiting pilgrims and regional travelers), Local Wellness Consultations.
- **Facilities:** Reception area, inventory room, consultation area.

### Branch 6: Sta. Elena (Western Border Gateway)
- **Municipality:** Sta. Elena
- **Role:** Boundary municipality connecting Camarines Norte to Calauag/Quezon Province.
- **Delivery Scope:** Sta. Elena corridor and transit traffic along the Maharlika Highway.
- **Fulfillment Services:** Branch Pickup, Highway Transit Order Fulfillment, Regional Distributor Restocking.
- **Facilities:** Commercial shopfront, secure storage, customer handover area.

---

## 3. Branch Operations & Staff Workflows

### 3.1 Order Staging & Notification Flow
1. **Order Routing:** When a customer completes a checkout selecting "Branch Pickup at Labo", the order state machine routes the notification specifically to the Labo branch terminal and assigned staff mobile devices.
2. **Packing & Reservation:** Branch staff review line items, verify physical batch seal, pack the order into a branded bag, and transition the state to `READY_FOR_CUSTOMER_PICKUP`.
3. **Automated Notification:** The system sends an SMS and Push Notification to the customer containing:
   - Branch Address & Operating Hours.
   - Order Pickup Code (e.g., `PICKUP-LBO-4982`).
   - Digital QR Code for contactless scan.

### 3.2 Handover & Verification Protocol
- When the customer arrives at the branch:
  - Branch staff scans the customer's QR code (or enters the 6-character alphanumeric pickup code into the staff app).
  - The staff screen displays the matched order items and customer name.
  - If paid online: Staff hands over goods immediately and taps `CONFIRM_HANDOVER`.
  - If Cash on Pickup (COP): Staff collects cash, records receipt number, and confirms handover.
  - Handover timestamp, staff user ID, and branch location are recorded in the audit trail.

### 3.3 Pickup Retention & Expiration
- Orders are held at the branch for **five (5) calendar days**.
- Automated reminder alerts sent on Day 2 and Day 4.
- If uncollected on Day 5: Staff flags order as `UNCLAIMED_EXPIRING`. Operations initiates customer outreach before restocking items.

---

## 4. Branch Role Permissions (RBAC)

| Capability | Branch Staff | Branch Manager | Central Operations |
| :--- | :---: | :---: | :---: |
| View own branch orders & packing slips | YES | YES | YES |
| View other branches' orders | NO | NO | YES |
| Confirm customer pickup handover | YES | YES | YES |
| Log local stock receiving / count | YES | YES | YES |
| Approve stock adjustments / write-offs | NO | YES | YES |
| Initiate inter-branch stock transfer | NO | YES | YES |
| View confidential consultation notes | **NO** | **NO** | **NO** |
