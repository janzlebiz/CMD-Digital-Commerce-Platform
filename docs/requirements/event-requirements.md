# Events & Symposium Management Requirements

**Document ID:** REQ-EVT-006 (Remediated)  
**Project:** HCI CMD Digital Commerce Platform  
**Target Territory:** Camarines Norte, Philippines  
**Audit Phase:** Phase 0 Remediation — Event Operations Baseline  
**Status:** Certified Audit Baseline (Qualified with Business Open Questions)  
**Date of Audit:** 2026-09-25  

---

## 1. Events Philosophy & Scope

Community wellness symposiums and educational seminars are a primary growth and health-education engine for the HCI CMD distribution network in Camarines Norte (*Business-Provided Mandate*).

Events occur at:
1. **Branch-Hosted Workshops:** Small-group seminars (15–30 attendees) held at Daet, Labo, Paracale, Panganiban, Capalonga, or Sta. Elena branches.
2. **Provincial Symposiums:** Large health conferences (100–500 attendees) held at rented convention halls or civic centers in Daet.

---

## 2. Event Types & Publishing

### 2.1 Event Taxonomy
| Event Category | Target Audience | Primary Focus | Typical Capacity |
| :--- | :--- | :--- | :--- |
| **Community Health Orientation** | General Public / Families | Basics of mineral nutrition, cellular hydration, drinking water quality. | 25 – 60 |
| **Mineral Vitality Symposium** | Health Enthusiasts / Clients | Deep dive into electrolytes, energy metabolism, naturopathic lifestyle. | 100 – 300 |
| **Distributor & Partner Summit** | Authorized Resellers | Compliance training, ethical marketing, branch logistics, business growth. | 50 – 150 |
| **Municipal Branch Open House** | Local Town Residents | Free mineral water testing, branch tours, wellness consultations. | 30 – 80 |

### 2.2 Event Publishing Fields
- Title, Subtitle, Category.
- Date, Start Time, End Time.
- Venue: Branch selection or external venue address with embedded map coordinates.
- Keynote Speakers & Practitioner Bios.
- Maximum Seat Capacity & Ticket Price (Free or Seat Reservation Deposit in PHP).
- Registration Deadline.

---

## 3. Registration, Ticketing & QR Attendance

```
[Public Event Listing] ──► [Registration Form: Name, Mobile, Email, Municipal Residence]
                                     │
                                     ▼
                [Ticket Confirmation: SMS & Digital Email Pass]
                                     │
                                     ▼
               [Dynamic QR Code Ticket Issued to Customer]
                                     │
                                     ▼
                        [Event Day Check-In Desk]
            Branch Staff scans QR Code with Staff Mobile Device
                                     │
                                     ▼
            [Attendance Logged Instantly & Badge Handed Over]
```

### 3.1 QR Code Specification
- Each ticket generates a cryptographically signed HMAC-SHA256 payload: `e.g. EVT-{eventId}-{ticketId}-{signature}` (*Recommended Technical Control*).
- Prevents screenshot duplication or forged passes.
- Works offline in staff mobile PWA app: Cached attendee list allows offline QR scanning at rural venues where mobile signal may be weak (e.g., rural Capalonga or Paracale).

---

## 4. Capacity & Waitlist Engine

- **Real-Time Seat Reservation:** Ticking down available seats on checkout.
- **Waitlist Mode:** Once capacity reaches 100%, customers can join a waitlist. If a cancellation occurs, the system automatically sends an SMS notification to the next waitlisted user with a 2-hour priority reservation window (*Recommended Policy*).
