# E-Commerce & Transaction Engine Functional Requirements

**Document ID:** REQ-ECOM-002  
**Project:** HCI CMD Digital Commerce Platform  
**Target Region:** Camarines Norte, Philippines  
**Audit Phase:** Phase 0 — Baseline Requirements  
**Status:** Certified Audit Baseline  
**Date:** 2026-09-25  

---

## 1. Product Catalog & Storefront

### 1.1 Product Representation
- **SKU Management:** Support individual items (e.g., `CMD-65ML`, `CMD-30ML`), multi-packs (e.g., `CMD-TRIO-65ML`), and complementary wellness items.
- **Pricing:** Listed exclusively in Philippine Peso (PHP / ₱) with explicit VAT notation.
- **Mandatory Regulatory Banner:** Every product page must dynamically display:
  - English: `"NO APPROVED THERAPEUTIC CLAIMS"`
  - Filipino: `"MAHALAGANG PAALALA: ANG HCI CELL MINERAL DROPS AY HINDI GAMOT AT HINDI DAPAT GAMITING PANGGAMOT SA ANUMANG URI NG SAKIT."`
- **Nutritional / Technical Panel:** Serving size, mineral breakdown ($Mg$, $Cl$, $K$, $SO_4$, low sodium), directions for dilution, and expiry/batch advisory.
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
                                      - Electronic invoice breakdown & SMS/Email receipt
                                      - Branch fulfillment dispatch alert
```

### 2.1 Customer Identity at Checkout
- **Guest Checkout:** Permitted to minimize friction; requires recipient name, mobile number, email, and destination address.
- **Registered Account:** Automatically stores address book (Barangay, Municipality, landmarks), order history, and re-order shortcuts.

### 2.2 Fulfillment Modes
1. **Branch Pickup (Free):**
   - Customer chooses from the 6 branches (Daet, Labo, Paracale, Panganiban, Capalonga, Sta. Elena).
   - Generates an alphanumeric Pickup Code and dynamic QR Code for contactless verification by branch staff.
   - 5-business-day hold period.
2. **Local Delivery (Camarines Norte):**
   - Municipal boundary selector: Daet, Labo, Paracale, Panganiban, Capalonga, Sta. Elena, San Vicente, San Lorenzo Ruiz, Basud, Mercedes, Vinzons, Talisay.
   - Distance/zone-based flat fee calculation.
   - Automatic allocation to the closest stock-holding branch hub.

---

## 3. Payment Processing Architecture

### 3.1 Supported Payment Methods
| Method Code | Channel | Processing Type | Settlement Flow |
| :--- | :--- | :--- | :--- |
| `gcash_ewallet` | GCash | Payment Gateway Redirect / In-App Webhook | Instant digital confirmation. |
| `maya_ewallet` | Maya | Payment Gateway QR / Direct App Redirect | Instant digital confirmation. |
| `qrph_standard` | QR Ph National Standard | Static/Dynamic interoperable QR code | Webhook notification upon settlement. |
| `credit_card` | Visa / Mastercard | Gateway Tokenization (PCI-DSS Level 1) | Instant capture via 3D Secure. |
| `cash_on_pickup`| Branch Register | In-person cash / point-of-sale at branch counter | Marked "Paid" by branch cashier. |
| `cash_on_delivery` | Local Dispatch Rider | Cash collection at customer doorstep | Marked "Paid" by courier upon delivery. |

### 3.2 Idempotency & Webhook Integrity
- All payment gateway webhooks must use cryptographic signature validation (HMAC SHA-256) to prevent replay attacks or fraudulent payment falsification.
- Transactions must enforce idempotency keys to eliminate duplicate billing during mobile network dropouts.

---

## 4. Order Lifecycle & State Machine

```
      [PENDING_PAYMENT]
             │
             ├────────────► [EXPIRED / CANCELLED] (Payment timeout after 1 hour)
             ▼
        [PAYMENT_CONFIRMED]
             │
             ▼
        [ALLOCATED_TO_BRANCH] (Assigned to Daet, Labo, etc.)
             │
             ▼
        [PACKED_AND_READY]
             │
      ┌──────┴─────────────────────────────────┐
      ▼ (If Delivery)                          ▼ (If Branch Pickup)
[OUT_FOR_DELIVERY]                       [READY_FOR_CUSTOMER_PICKUP]
      │                                        │
      ▼                                        ▼
[DELIVERED]                              [PICKED_UP_AND_VERIFIED]
      │                                        │
      └───────────────────┬────────────────────┘
                          ▼
                     [COMPLETED]
                          │
                          ├────────► [RETURN_REQUESTED]
                          │                 │
                          │                 ▼
                          │          [REFUNDED / REPLACED]
```

---

## 5. Electronic Invoicing & Receipts

- **Compliance Reference:** BIR Revenue Regulations (RR 16-2023, RR 15-2024) and RA 11967.
- Every completed order automatically compiles an immutable digital sales invoice containing:
  - Sequential Sales Invoice Number (e.g., `INV-2026-00001234`).
  - Business Legal Name, Registered Address, TIN, and BIR Branch Code.
  - Date & Timestamp of Purchase.
  - Customer Name, Delivery/Pickup Address, Contact Mobile.
  - Detailed Line Items: SKU, Description, Unit Price (PHP), Quantity, Total.
  - VATable Sales, VAT Amount (12%), VAT-Exempt Sales, Net Amount.
  - Payment Reference ID and Payment Gateway Transaction Hash.
  - Mandatory disclaimer: *"This document serves as an electronic sales confirmation in compliance with the Electronic Commerce Act (RA 8792)."*
