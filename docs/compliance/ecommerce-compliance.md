# Philippine E-Commerce & Consumer Regulatory Compliance Dossier

**Document ID:** COMP-ECOM-003 (Final Remediation)  
**Project:** HCI CMD Digital Commerce Platform  
**Target Territory:** Camarines Norte, Philippines  
**Audit Phase:** Phase 0 Final Remediation — Statutory Mapping, Invoicing & Tax Proof Baseline  
**Date of Audit:** 2026-09-25  
**Primary Authorities:** RA 11967, RA 7394, RA 8792, RA 11976 (EOPT), BIR RMC No. 38-2026, RR 16-2023, RR 15-2024  

---

## 1. Statutory Architecture Overview

The HCI CMD Digital Commerce Platform must comply with the codified legal requirements governing online merchants, digital transactions, consumer protection, and tax administration in the Republic of the Philippines.

```
┌────────────────────────────────────────────────────────────────────────┐
│                      Philippine Statutory Framework                    │
├────────────────────────────────┬───────────────────────────────────────┤
│ RA 11967 (Internet             │ E-retailer & merchant obligations     │
│ Transactions Act of 2023)      │ (Sec 23); Internal redress (Sec 24)   │
├────────────────────────────────┼───────────────────────────────────────┤
│ RA 7394 (Consumer Act          │ Price transparency (Art 81), deceptive│
│ of the Philippines)            │ sales prohibitions, product warranties│
├────────────────────────────────┼───────────────────────────────────────┤
│ RA 8792 (Electronic Commerce   │ Legal recognition of electronic data, │
│ Act of 2000)                   │ signatures, and contracts             │
├────────────────────────────────┼───────────────────────────────────────┤
│ RA 11976 (Ease of Paying Taxes │ "Invoice" as primary substantiation;  │
│ Act of 2024 - EOPT)            │ NIRC Sec 235 5-year retention rule    │
├────────────────────────────────┼───────────────────────────────────────┤
│ BIR RMC 38-2026, RR 16-2023    │ BIR Registration Seal Badge, DFSP     │
│ & RR 15-2024                   │ withholding tax, online registration  │
├────────────────────────────────┼───────────────────────────────────────┤
│ RA 10173 (Data Privacy         │ Lawful personal & sensitive data      │
│ Act of 2012)                   │ processing, consent, and security     │
└────────────────────────────────┴───────────────────────────────────────┘
```

---

## 2. Internet Transactions Act of 2023 (Republic Act No. 11967)

Signed into law on December 5, 2023, and fully enforced as of June 20, 2025, RA 11967 governs all B2C digital transactions in the Philippines. As an independent e-retailer and merchant platform, the platform must satisfy the following statutory obligations:

### 2.1 E-Retailer & Merchant Obligations (Section 23, RA 11967)
Under Section 23 of RA 11967, the platform and its operators must comply with the following explicit duties:
1. **Price Transparency (Section 23(a)):** Indicate prices consistent with Article 81 of the Consumer Act of the Philippines (RA 7394). Prices must be stated in Philippine Peso (PHP / ₱) with total costs, discounts, and delivery charges displayed before order confirmation.
2. **Product Conformity (Section 23(b)):** Deliver goods in the condition, type, quantity, and quality described on the storefront. Ensure physical tamper seals, lot tracking, and expiry dates match descriptions.
3. **Mandatory Redress Mechanism (Section 23(d)):** Maintain an accessible and efficient internal redress mechanism to address consumer inquiries, damaged goods, or delivery failures.
4. **Data Privacy Safeguards (Section 23(e)):** Protect consumer privacy pursuant to RA 10173 and comply with minimum information security standards.
5. **Right to Request Identification (Section 23(f)):** The merchant is authorized to require consumers to provide a valid mobile number and email address before completing orders to facilitate logistics and combat fraud.
6. **Mandatory Invoicing (Section 23(g)):** Issue paper or electronic invoices or receipts for all sales.
7. **Merchant Identification (Section 23 & IRR):** Conspicuously display registered business name, trade name, physical address of Daet hub, and contact channels (mobile/landline/email) on homepage and checkout footers.

### 2.2 Internal Redress Mechanism & Statutory Exhaustion (Section 24, RA 11967)
Under Section 24 of RA 11967:
- Consumers with grievances must first utilize the platform's internal redress mechanism before filing formal complaints with the DTI, regular courts, or alternative dispute resolution bodies.
- **Statutory Exhaustion Window:** The internal redress mechanism is deemed exhausted if the complaint remains unresolved after **seven (7) calendar days** from filing.
- **CRITICAL LEGAL DISTINCTION:** The 7-calendar-day provision is a **procedural exhaustion threshold for administrative escalation**, NOT an unconditional 7-day right of return or refund for opened dietary supplements.

### 2.3 Recommended Internal Support SLAs vs. Statutory Law
- While Section 24 establishes a 7-day exhaustion window, the platform adopts an internal operational target:
  - First acknowledgment within 24 hours.
  - Initial investigation and response within 48–72 hours.
- *Audit Note:* These operational SLAs are **recommended platform policies**, not statutory deadlines.

---

## 3. Taxation, Invoicing & BIR Regulatory Compliance

### 3.1 Ease of Paying Taxes (EOPT) Act (RA 11976) & Invoicing
Under the EOPT Act (effective January 22, 2024, implemented via RR 3-2024 and RR 7-2024):
- The **"Invoice"** is established as the sole primary document substantiating sales of both goods and services for VAT purposes.
- The platform's automated invoicing engine must generate serialized **Sales Invoices** (not Official Receipts) for all product purchases and consultation services.
- Mandatory invoice details include: Serialized Invoice No., Date, Merchant Legal Name, Address, TIN, Buyer Details (where applicable), line-item breakdown, and explicit VAT/Non-VAT notations.

### 3.2 Mandatory Online Registration & BIR Registration Seal Badge (RMC No. 38-2026 & RR 15-2024)
- **Legal / Regulatory Requirement:** Under BIR RMC No. 38-2026 and RR 15-2024, online merchants must display the BIR-prescribed proof of registration on their website, specifically the **BIR Registration Seal Badge**, which incorporates a QR-code verification mechanism linked to the taxpayer's BIR registration information.
- **Platform Implementation Requirement:** Phase 1 web layout must reserve a visible, accessible location in the footer for the BIR registration disclosure and Registration Seal Badge asset.
- **Business Evidence Requirement:** The business owner must supply the official BIR Form 2303 Certificate of Registration and the BIR Registration Seal Badge asset.
- *Important Distinction:* Displaying the BIR Registration Seal Badge does NOT mean the platform has independently verified the merchant's tax compliance; the platform is implementing the applicable disclosure mechanism based on the business's authoritative BIR registration evidence.

### 3.3 Withholding Tax on Online Transactions (RR No. 16-2023 & RMC No. 8-2024)
- **Applicability Analysis:**
  - RR 16-2023 imposes a 1% withholding tax on 50% of gross remittances (0.5% effective) made by **e-marketplace operators** and **Digital Financial Services Providers (DFSPs)** to online merchants.
  - **Single-Merchant Status:** Because this platform operates as an independent, single-merchant storefront selling its own inventory across six branches, the platform itself is **NOT an e-marketplace operator** and does not withhold tax from third parties.
  - **Inbound Payouts from DFSPs:** When settling funds to the business, DFSPs (such as GCash or Maya) are legally required to withhold 0.5% if the merchant's gross remittances exceed **₱500,000** annually. If annual gross remittances are below ₱500,000, the merchant can receive gross remittances without withholding by submitting a sworn declaration and BIR Form 2303 to the DFSP.
- **Status:** **VERIFIED REGULATORY FACT / OPERATIONAL CONFIRMATION REQUIRED**.

### 3.4 VAT vs. Non-VAT Tax Status
- The platform does not assume whether the business is VAT-registered or Non-VAT.
- If annual gross sales exceed ₱3,000,000, the business must register for 12% VAT. If below ₱3,000,000, the business may be registered as Non-VAT subject to percentage tax under Section 116 of the NIRC.
- **Status:** **BUSINESS CONFIRMATION REQUIRED**.

### 3.5 Statutory Tax Records Retention (NIRC Section 235 as amended by RA 11976)
- **Statutory Mandate:** NIRC Section 235, as amended by RA 11976, provides for preservation of books of accounts, subsidiary books, and other accounting records for **five (5) years**, reckoned according to the statutory rule specified in Section 235 (i.e. from the day following the deadline in filing a return, or if filed after the deadline, from the date of the actual filing of the return, for the taxable year when the last entry was made in the books of accounts; and until final resolution if there is a pending protest or claim for refund).

---

## 4. Cancellation, Refund & Return Framework

In accordance with DTI Department Administrative Orders and RA 7394 (Consumer Act):

### 4.1 Permissible Customer Cancellations
- **Before Order Packing:** Customers may cancel orders without penalty before branch fulfillment staff mark the order as `PACKED_AND_READY`.
- **Out-of-Stock Condition:** If an ordered item is unavailable at the selected branch, the platform must notify the customer immediately and process a full refund or offer branch transfer options.

### 4.2 Returns & Replacements Policy (Sealed Dietary Supplements)
- **Defective / Damaged Upon Receipt:** Because HCI CMD is a sealed liquid food supplement, returns for unsealed/opened bottles are restricted for health and hygiene reasons unless:
  - The security seal was broken upon receipt.
  - The bottle leaked during transit.
  - The delivered product was expired or mismatched with the order.
- **Reporting Window:** Customers must report damage or defects within seven (7) calendar days of delivery, supported by photographic evidence submitted via the internal redress ticketing portal.
- **Refund Methods:** Refunds must be returned via the original payment channel (or digital store credit if explicitly selected by the consumer).

---

## 5. Delivery & Branch Pickup Rules

### 5.1 Camarines Norte Geographic Coverage
The platform serves six designated branch hubs:
1. **Daet (Central Hub):** Provincial capital, high delivery density, central replenishment depot (*Operational Assumption*).
2. **Labo:** Inland municipality, commercial corridor.
3. **Paracale:** Coastal / mining municipality.
4. **Panganiban:** Northern municipality.
5. **Capalonga:** Northwestern pilgrimage / coastal municipality.
6. **Sta. Elena:** Western boundary municipality (gateway to Quezon province).

### 5.2 Delivery Terms & Disclosures
- **Estimated Delivery Windows:** Clear estimates must be shown based on municipal transit times.
- **Branch Pickup Rules:**
  - Customers selecting "Branch Pickup" must select their preferred pickup branch.
  - The platform must verify stock availability at that specific branch before order confirmation.
  - Orders ready for pickup must generate a secure Pickup Authorization Code and dynamic QR code.
  - Branch holding period: 5 business days before stock reservation expires (*Recommended Platform Policy*).
