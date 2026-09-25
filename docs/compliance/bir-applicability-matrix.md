# Bureau of Internal Revenue (BIR) & Tax Regulatory Applicability Matrix

**Document ID:** COMP-TAX-004  
**Project:** HCI CMD Digital Commerce Platform  
**Target Territory:** Camarines Norte, Philippines  
**Audit Phase:** Phase 0 Remediation — Tax Law Applicability & Invoicing Baseline  
**Date of Audit:** 2026-09-25  
**Primary Authorities:** National Internal Revenue Code (NIRC), RA 11976 (EOPT Act), RR 16-2023, RMC 8-2024, RR 15-2024  

---

## 1. Statutory Architecture & EOPT Framework

Under the **Ease of Paying Taxes (EOPT) Act (Republic Act No. 11976)**, signed into law on January 5, 2024, the Philippine tax compliance framework for sales of goods and services underwent fundamental modernization:
1. **The "Invoice" as Sole Primary Substantiation:** The EOPT Act eliminated the historical statutory distinction between "Sales Invoices" (for goods) and "Official Receipts" (for services). An **Invoice** (whether electronic or physical) is now the sole primary document supporting VAT deduction and commercial transactions across both goods sales (HCI CMD bottles) and services (wellness consultations).
2. **Standardization of Mandatory Invoice Details:** Under Section 237 of the NIRC as amended by the EOPT Act, all invoices must state:
   - Serialized Invoice Number.
   - Date of Transaction.
   - Merchant Registered Name, Registered Address, and TIN.
   - Buyer's Name, Address, and TIN (for sales to registered businesses or sales above statutory thresholds).
   - Description of Goods or Services, Quantity, Unit Cost, and Total Amount.
   - Breakdown of VATable Sales, VAT Amount (12%), VAT-Exempt Sales, and Zero-Rated Sales (or declaration of Non-VAT Percentage Tax if applicable).

---

## 2. BIR Regulatory Applicability Matrix

| Tax Topic | Statutory / Regulatory Authority | Applicability to This Platform | Conditions, Thresholds & Classifications | Technical / Architectural Platform Impact | Current Compliance Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Mandatory Online Merchant Registration** | **RR No. 15-2024** (amending RR 7-2012) & NIRC Sec 236 | **Directly Applicable.** The business entity selling HCI CMD online must be duly registered with the BIR. | Mandatory for all individuals or corporate entities engaged in trade, commerce, or e-commerce in the Philippines. | The platform homepage and checkout footer must display the registered business name, TIN, and BIR Form 2303 registration details. | **BUSINESS CONFIRMATION REQUIRED** (Business owner must provide BIR Form 2303). |
| **Branch Registration & BIR Branch Codes** | NIRC Sec 236 & BIR Registration Manual | **Directly Applicable.** Six physical branches operating in Daet, Labo, Paracale, Panganiban, Capalonga, and Sta. Elena. | Each physical branch must possess a valid BIR registration with designated 3-digit branch codes (e.g., Daet `000`, Labo `001`, etc.) or operate under a declared centralized invoicing permit. | Invoice generation engine must support branch-level attribution or central head-office attribution depending on the business's actual BIR branch registration. | **BUSINESS CONFIRMATION REQUIRED** (Clarify whether satellite branches issue local invoices or central invoices). |
| **Tax Status: VAT vs. Non-VAT** | NIRC Section 109 & EOPT Act | **Directly Applicable, but Classification Unknown.** | Enterprises with annual gross sales exceeding ₱3,000,000 are mandated to register as VAT taxpayers (12% VAT). Enterprises below ₱3,000,000 may register as Non-VAT (subject to 1%–3% Percentage Tax under Section 116). | Platform checkout must be dynamically configurable to render either: <br>1. *VATable Sales + 12% VAT*, OR <br>2. *Non-VAT Sales (with statutory Non-VAT disclosure).* **Do not assume VAT status.** | **BUSINESS CONFIRMATION REQUIRED** (Business owner must confirm VAT vs Non-VAT status). |
| **Withholding Tax on Online Sellers (RR 16-2023)** | **RR No. 16-2023** & **RMC No. 8-2024** | **Conditionally Applicable to Inbound Payouts.** | **Target Entities:** Imposes 1% withholding tax on 50% of gross remittances (0.5% effective) made by **e-marketplace operators** and **Digital Financial Services Providers (DFSPs)** to online merchants. <br><br>**Platform Role:** Our platform is a **single-merchant storefront**, NOT an e-marketplace hosting 3rd-party sellers. Therefore, our platform does *not* withhold from sellers. Instead, DFSPs (e.g. GCash, Maya) remitting funds to our business are the withholding agents. | If the business's annual gross remittances exceed **₱500,000**, DFSPs will withhold 0.5% and provide BIR Form 2307. If gross remittances are below ₱500,000, the business must submit a sworn declaration to the DFSP to receive 100% remittance without withholding. Accounting module must log net remittances vs. gross invoice totals. | **VERIFIED REGULATORY FACT / OPERATIONAL CONFIRMATION REQUIRED** (Track whether merchant qualifies for ₱500k exemption). |
| **Payment Gateway Distinction (GCash, Maya vs. PayMongo)** | RR 16-2023, BSP Circulars, BIR RMC 8-2024 | **Distinction Required.** Payment providers operate under distinct regulatory classifications. | • **DFSPs (GCash, Maya):** Classified as Digital Financial Services Providers. Directly subject to RR 16-2023 withholding obligations when settling to merchant accounts. <br>• **Payment Aggregators / Gateways (PayMongo):** Act as technical gateways or merchant aggregators. Withholding flow depends on whether settlement is disbursed through a DFSP facility or direct commercial bank settlement. | System must reconcile payment processing fees (typically 1.5%–2.5%) and potential BIR 2307 creditable withholding tax deductions when reconciling payment gateway settlements. | **RECOMMENDED TECHNICAL RECONCILIATION CONTROL** |
| **Primary Invoicing Document (EOPT Act)** | **RA 11976 (EOPT Act)** & RR 3-2024, RR 7-2024 | **Directly Applicable.** All transactions must produce an **Invoice**. | Replaces the traditional "Official Receipt" for services. An Invoice must be issued for both product sales and wellness consultation fees. | Automated invoice generator must produce standard "Sales Invoice" / "Commercial Invoice" documents complying with EOPT data standards. | **VERIFIED REGULATORY FACT** (Mandatory implementation baseline). |
| **Statutory Records Retention** | NIRC Section 235, RR No. 5-2014, RR 17-2013 | **Directly Applicable to Tax & Invoicing Records.** | Mandates preservation of books of accounts, sales invoices, and supporting financial records for **ten (10) years** (first 5 years in active/accessible form; remaining 5 years in secure storage). | Financial sales invoices, credit memos, and transaction ledgers must be retained for 10 years in immutable database archives. | **STATUTORY REQUIREMENT** (Applies strictly to tax/financial records, not all app telemetry). |

---

## 3. Data Domain Retention Classification Matrix

To correct prior generalizations stating that "every record requires 10-year retention", the platform establishes domain-specific retention policies based on governing legal authority:

| Data Domain | Examples | Applicable Legal Standard | Retention Period | Rationale & Legal Basis |
| :--- | :--- | :--- | :--- | :--- |
| **Tax & Accounting Records** | Sales Invoices, Credit Notes, BIR Form 2307, Settlement Logs, Tax Disclosures | NIRC Section 235 & RR 5-2014 | **10 Years** | Statutory requirement for tax audits and BIR review. |
| **Commercial Order Telemetry** | Order packing slips, courier dispatch notes, cart line items, pickup logs | Commercial Business Practice | **3 Years** (Recommended) | Recommended platform policy for operational dispute resolution and warranty tracking. |
| **Health Consultation Records** | Health intake questionnaires, practitioner clinical notes, hydration logs | RA 10173 (DPA) Proportionality & Clinical Guidelines | **5 Years** (Recommended Policy) | Recommended platform policy; balances continuity of client wellness guidance against DPA data minimization. |
| **Security & Authentication Logs** | User login timestamps, failed auth attempts, IP access logs, API audit events | NPC Circular 16-04 (Security Standards) | **12 Months** | Recommended security control to facilitate forensic analysis while limiting log storage liability. |
| **Marketing Consent Records** | Newsletter opt-ins, SMS promotional checkboxes, unsubscribe timestamps | RA 10173 Section 11 (General Principles) | **Active Consent Duration** | Retained until consent is revoked by the data subject, after which data is promptly purged from promotional dispatch lists. |
| **Abandoned Shopping Carts** | Incomplete checkout sessions, temporary reservation holds | Data Minimization Principle | **30 Calendar Days** | Purged automatically to prevent retention of unnecessary consumer telemetry. |
