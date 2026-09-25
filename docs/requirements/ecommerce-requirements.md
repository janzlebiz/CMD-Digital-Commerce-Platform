# E-Commerce & Transaction Engine Functional Requirements

**Document ID:** REQ-ECOM-002 (Remediated)  
**Project:** HCI CMD Digital Commerce Platform  
**Target Region:** Camarines Norte, Philippines  
**Audit Phase:** Phase 0 Remediation — Commercial Specifications Baseline  
**Status:** Certified Audit Baseline (Qualified with Business Open Questions)  
**Date of Audit:** 2026-09-25  

---

## 1. Product Catalog & Storefront Specifications

### 1.1 Product Representation
- **SKU Management:** Support individual items (e.g., 65 mL, 30 mL dropper bottles), multi-packs, and companion wellness items (*Subject to business providing official FDA registration documentation / packaging annex establishing commercial volume authorization*).
- **Pricing:** Listed exclusively in Philippine Peso (PHP / ₱) with explicit VAT notation (or Non-VAT notation pursuant to confirmed tax status).
- **Mandatory Regulatory Banner:** Every product page must dynamically display:
  - English: `"NO APPROVED THERAPEUTIC CLAIMS"`
  - Filipino: `"MAHALAGANG PAALALA: ANG HCI CELL MINERAL DROPS AY HINDI GAMOT AT HINDI DAPAT GAMITING PANGGAMOT SA ANUMANG URI NG SAKIT."`
- **Nutritional / Technical Panel:** Serving size, mineral composition ($Mg$, $Cl$, $K$, $SO_4$, low sodium), directions for dilution, and expiry/batch advisory.
- **Media Gallery:** Multi-image gallery with pinch-to-zoom on mobile, displaying tamper seals and packaging barcodes.

### 1.2 Branch-Aware Stock Visibility
- The storefront must indicate immediate stock availability across the six Camarines Norte branches:
  - e.g., *"In Stock at Daet Hub (Ready today) | In Stock at Labo | Low Stock at Paracale"*.
- If a customer selects a specific pickup branch, the catalog validates against that branch's real-time inventory.

---

## 2. Cart & Checkout Flow

```
[Storefront / PDP] ──► [Shopping Cart] ──► [Checkout: Delivery or Branch Pickup]
                                                           │
                      ┌────────────────────────────────────┴────────────────────────────────────┐
                      ▼                                                                         ▼
            [Fulfillment: Delivery]                                                   [Fulfillment: Pickup]
      - Enter Barangay & Municipality in CamNorte                               - Select 1 of 6 physical branches
      - Delivery fee calculated automatically                                   - Verifies branch inventory
      - Nearest fulfilling branch allocated                                     - Zero delivery fee
                      │                                                                         │
                      └────────────────────────────────────┬────────────────────────────────────┘
                                                           ▼
                                                [Payment Method Selection]
                                       - Online: GCash, Maya, Card, QR Ph
                                       - Cash on Delivery (COD) / Cash on Pickup (COP)
                                                           │
                                                           ▼
                                                 [Order Confirmation]
                                      - Unique serialized Order Reference ID
                                      - Electronic Sales Invoice breakdown & SMS receipt
                                      - Branch fulfillment dispatch alert
```

### 2.1 Customer Identity at Checkout
- **Guest Checkout:** Permitted to minimize data retention; requires recipient name, mobile number, email, and destination address.
- **Registered Account:** Automatically stores address book (Barangay, Municipality, landmarks), order history, and re-order shortcuts.

### 2.2 Fulfillment Modes
1. **Branch Pickup (Free):**
   - Customer chooses from the 6 branches (Daet, Labo, Paracale, Panganiban, Capalonga, Sta. Elena).
   - Generates an alphanumeric Pickup Code and dynamic QR Code for contactless verification by branch staff.
   - Recommended 5-business-day hold period.
2. **Local Delivery (Camarines Norte):**
   - Municipal boundary selector: Daet, Labo, Paracale, Panganiban, Capalonga, Sta. Elena, San Vicente, San Lorenzo Ruiz, Basud, Mercedes, Vinzons, Talisay.
   - Distance/zone-based flat fee calculation.
   - Automatic allocation to the closest stock-holding branch hub.

---

## 3. Payment Processing Architecture

### 3.1 Supported Payment Methods
| Method Code | Channel | Processing Type | Settlement Flow |
| :--- | :--- | :--- | :--- |
| `gcash_ewallet` | GCash | DFSP Redirect / In-App Webhook | Instant digital confirmation; subject to RR 16-2023 withholding if merchant annual threshold > ₱500k. |
| `maya_ewallet` | Maya | DFSP QR / Direct App Redirect | Instant digital confirmation; subject to RR 16-2023 withholding if merchant annual threshold > ₱500k. |
| `qrph_standard` | QR Ph National Standard | Interoperable QR code | Webhook notification upon settlement. |
| `credit_card` | Visa / Mastercard | Gateway Tokenization (PCI-DSS) | Instant capture via 3D Secure. |
| `cash_on_pickup`| Branch Register | Counter cash at branch | Marked "Paid" by branch cashier upon customer handover. |
| `cash_on_delivery` | Dispatch Rider | Doorstep cash collection | Marked "Paid" by rider upon delivery handover. |

---

## 4. Electronic Sales Invoicing (EOPT Act RA 11976 & RA 11967)

Pursuant to RA 11967 Section 23(g) and the Ease of Paying Taxes (EOPT) Act (RA 11976):
- Every completed transaction automatically generates a serialized digital **Sales Invoice** (which legally replaces the historical official receipt across goods and services).
- Mandatory Invoice Fields:
  - Sequential Sales Invoice Number (e.g. `INV-2026-00001234`).
  - Business Legal Name, Registered Address, TIN, and BIR Branch Code.
  - Date & Timestamp of Transaction.
  - Customer Name, Delivery/Pickup Address, Contact Mobile.
  - Itemized Line Items: SKU, Description, Unit Price (PHP), Quantity, Total.
  - VATable Sales, VAT Amount (12%), VAT-Exempt Sales, Net Amount (or statutory Non-VAT disclosure).
  - Statutory statement: *"This document serves as an electronic sales invoice issued pursuant to the Ease of Paying Taxes Act (RA 11976) and Electronic Commerce Act (RA 8792)."*

---

## 5. Tax Proof Disclosure & Records Retention

### 5.1 BIR Registration Seal Badge & Proof of Registration (RMC No. 38-2026)
- The platform web layout must reserve a visible, accessible location in the footer for posting the **BIR Registration Seal Badge** containing the QR-code verification mechanism linked to the taxpayer's BIR registration information.
- The business owner must supply the official BIR registration documentation (BIR Form 2303) and the Registration Seal Badge asset before commercial release.
- *Notice:* Display of the badge reflects implementation of the BIR disclosure mechanism; it does not constitute an independent audit certification of merchant tax compliance by the platform.

### 5.2 Statutory Tax & Accounting Records Retention (NIRC Section 235 as amended by RA 11976)
- Sales Invoices, financial transaction ledgers, credit notes, and settlement records must be preserved for **five (5) years**, reckoned according to the statutory rule specified in amended NIRC Section 235.
- General operational logs and customer service records are retained separately according to internal business policy (e.g. 3 years).
