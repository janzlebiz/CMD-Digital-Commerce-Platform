# Multi-Branch Inventory & Stock Management Requirements

**Document ID:** REQ-INV-004 (Remediated)  
**Project:** HCI CMD Digital Commerce Platform  
**Target Territory:** Camarines Norte, Philippines  
**Audit Phase:** Phase 0 Remediation — Multi-Branch Stock Ledger  
**Status:** Certified Audit Baseline (Qualified with Business Open Questions)  
**Date of Audit:** 2026-09-25  

---

## 1. Inventory Architecture Overview

The platform implements a centralized, real-time inventory ledger supporting a hub-and-spoke distribution model. The central warehouse in Daet (*Operational Assumption*) replenishes the five satellite branches (Labo, Paracale, Panganiban, Capalonga, Sta. Elena).

```
                      [Manufacturer / HCI Supplier]
                                   │
                                   ▼ (PO Receiving & Lot Entry)
                         [Daet Central Warehouse]
                                   │
             ┌─────────────────────┼─────────────────────┐
             ▼ (Stock Transfer)    ▼ (Stock Transfer)    ▼ (Stock Transfer)
        [Labo Branch]       [Paracale Branch]    [Other Satellite Branches]
             │                     │                     │
             ▼ (Order Fulfillment) ▼ (Order Fulfillment) ▼ (Order Fulfillment)
       [Customer Handover]   [Customer Handover]   [Customer Handover]
```

---

## 2. Stock Quantities & Multi-Branch Ledger

For each SKU at each branch location, the system tracks:
1. **On-Hand Quantity ($Q_{on\_hand}$):** Total physical units in the branch stockroom.
2. **Reserved Quantity ($Q_{reserved}$):** Units allocated to active pending orders awaiting customer pickup or delivery dispatch.
3. **Available Quantity ($Q_{available} = Q_{on\_hand} - Q_{reserved}$):** Units available for new storefront purchases.
4. **Safety Stock / Low Stock Threshold:** Custom trigger level (e.g. 15 units at Daet, 5 units at satellite branches — *Recommended Platform Policy*).
5. **Reorder Point:** Trigger level initiating automatic replenishment requests from Daet.

---

## 3. Batch, Lot & Expiry Date Management

Because HCI CMD is a registered food supplement (FR-4000008713595), strict lot traceability is mandatory under FDA standards:
- **Batch / Lot Number:** Unique production run code provided on manufacturer bottle seal.
- **Manufacturing Date (MFG) & Expiry Date (EXP):** Tracked per receiving consignment.
- **FEFO Enforcement:** The system automatically allocates inventory on a **First-Expired, First-Out (FEFO)** basis.
- **Quarantine Status:** Damaged, leaky, or questionable bottles are flagged as `QUARANTINED` and cannot be allocated to customer carts.

---

## 4. Real-Time Reservation & Concurrency Control

To prevent overselling across multiple branches:
1. **Cart Soft-Hold:** When a customer proceeds to checkout, units are placed on a **soft hold for 15 minutes** (*Recommended Policy*).
2. **Order Placement Reservation:** Upon checkout submission, units transition from soft hold to `RESERVED`.
3. **Fulfillment Deduction:** When branch staff confirms handover (`DELIVERED` or `PICKED_UP`), physical `ON_HAND` decreases and `RESERVED` decreases.
4. **Order Cancellation Release:** If an order is cancelled or times out, the reserved stock is atomically returned to `AVAILABLE` stock using database row-level locking (`SELECT ... FOR UPDATE`).

---

## 5. Stock Movement Workflows

Every change in inventory balance must be recorded in an immutable ledger with a reason code and actor ID:

| Movement Code | Description | Origin | Destination | Effect |
| :--- | :--- | :--- | :--- | :--- |
| `PO_RECEIVE` | Inbound shipment received from HCI distributor | External Supplier | Daet Central Warehouse | $+Q_{on\_hand}$ |
| `TRANSFER_OUT` | Stock dispatched from Daet to branch | Daet Warehouse | In-Transit Transfer | $-Q_{on\_hand}$ (Daet) |
| `TRANSFER_IN` | Stock received and verified at branch | In-Transit Transfer | Branch Stockroom | $+Q_{on\_hand}$ (Branch) |
| `ORDER_FULFILL` | Customer order delivered / picked up | Branch Stockroom | Customer | $-Q_{on\_hand}, -Q_{reserved}$ |
| `ADJUST_DAMAGE` | Dropper breakage, seal rupture, or leakage | Branch Stockroom | Scrapped / Damaged | $-Q_{on\_hand}$ |
| `RETURN_RESTOCK`| Unopened, sealed item returned within policy | Customer | Branch Quarantine | $+Q_{quarantined}$ |

---

## 6. Physical Audit & Reconciliation

- **Weekly Cycle Counts:** Branch staff perform weekly counts using mobile devices.
- **Audit Logging:** All adjustments log: User ID, Timestamp, Location, Old Count, New Count, Reason Explanation.
