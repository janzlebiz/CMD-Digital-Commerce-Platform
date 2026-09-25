# Customer Relationship Management (CRM) Requirements

**Document ID:** REQ-CRM-007  
**Project:** HCI CMD Digital Commerce Platform  
**Target Territory:** Camarines Norte, Philippines  
**Audit Phase:** Phase 0 — Baseline Requirements  
**Status:** Certified Audit Baseline  
**Date:** 2026-09-25  

---

## 1. CRM Scope & Privacy Firewall

The CRM module enables the business to manage customer relationships, provide post-sales support, track fulfillment history, and manage multi-channel communications.

### 1.1 The Health Data Privacy Firewall
Under Philippine RA 10173 and platform security architecture:
- The CRM profile **MUST NEVER** display naturopathic clinical notes, diagnosis inquiries, or medical complaints.
- Store managers and customer service agents viewing a customer profile see only:
  - Account Profile (Name, Phone, Email, Preferred Branch).
  - Order Transaction History (Dates, Items, Amounts, Fulfillment Status).
  - Event Attendance History (Symposiums registered/attended).
  - General Support Tickets (Delivery inquiries, payment issues).
  - Marketing Consent Status (Opt-in timestamp, channels permitted).

---

## 2. Customer Profile & Account Segmentation

### 2.1 Customer Profile Attributes
- `Customer ID` (UUID).
- `Full Name`, `Mobile Phone Number`, `Email`.
- `Primary Branch Affiliation` (Defaulting to closest of 6 Camarines Norte branches).
- `Default Delivery Address` (Barangay, Municipality, Landmark).
- `Account Tier`:
  - `Retail Customer`: Standard online/in-branch shopper.
  - `Loyalty / Frequent Buyer`: Qualified for repeat purchase bundle discounts.
  - `Sub-Distributor / Reseller`: Authorized bulk purchaser (requires business license verification).

### 2.2 Dynamic Segmentation
1. **Branch Geolocation Cohorts:** Segmenting customers by municipality (e.g., Daet residents vs. Labo residents) for localized branch announcements.
2. **Re-order Horizon Cohorts:** Customers who purchased a 65 mL bottle (approx. 45–60 day supply) ~45 days ago, triggering a timely replenishment notification.
3. **Event Alumnae Cohorts:** Attendees of recent health symposiums invited to specialized follow-up educational workshops.

---

## 3. Consent & Communication Preference Management

- **Granular Consent Ledger:**
  - `sms_transactional_consent`: Timestamped consent for order and pickup alerts (default enabled for transactions).
  - `sms_promotional_consent`: Explicit opt-in checkbox for promotional discount broadcasts.
  - `email_newsletter_consent`: Explicit opt-in for monthly wellness guides.
- **Unsubscribe Management:** Immediate automated suppression upon SMS response `STOP` or one-click email unsubscribe header.

---

## 4. Customer Support & Dispute Redress Workflow

- Integrated support ticketing interface fulfilling RA 11967 consumer redress requirements:
  - Ticket categories: Order Delivery Delay, Damaged Bottle Seal, Payment Verification, General Inquiry.
  - SLA Tracking: First response within 24 hours, resolution within 72 hours.
  - Complete historical conversation log preserved for regulatory audits.
