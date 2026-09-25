# Multi-Channel Notification Engine Requirements

**Document ID:** REQ-NOTIF-009  
**Project:** HCI CMD Digital Commerce Platform  
**Target Territory:** Camarines Norte, Philippines  
**Audit Phase:** Phase 0 — Baseline Requirements  
**Status:** Certified Audit Baseline  
**Date:** 2026-09-25  

---

## 1. Notification Architecture Overview

In the Philippine retail landscape, **SMS is the highest-reliability communication channel**, boasting open rates > 95%, especially in rural municipalities where mobile data is intermittently toggled off.

The platform employs a tiered notification matrix:
1. **SMS:** High-priority transactional events (Order confirmations, pickup codes, delivery dispatch, appointment reminders).
2. **Email:** Detailed legal documentation (Sales invoices, comprehensive health intake confirmations, event PDF tickets).
3. **Web Push / In-App:** Real-time storefront and staff alerts.

---

## 2. Notification Event Triggers & Templates

| Trigger Event | Channel | Priority | Template Content Summary |
| :--- | :--- | :--- | :--- |
| **Order Placed (Online Payment)** | SMS + Email | High | *"Salamat! Order #{orderId} received. Please complete payment via {paymentLink} within 1 hour."* |
| **Payment Confirmed** | SMS + Email | High | *"Payment received for Order #{orderId}! Your order is being packed at {branchName}. Invoice #{invoiceNo}."* |
| **Ready for Branch Pickup** | SMS | **CRITICAL** | *"Your HCI CMD order is READY FOR PICKUP at {branchName} ({branchAddress})! Pickup Code: {pickupCode}. Bring valid ID."* |
| **Out for Delivery** | SMS | High | *"Your order #{orderId} is out for delivery with our rider ({riderName} - {riderPhone}). Please prepare exact payment ₱{total} if COD."* |
| **Consultation Booked** | SMS + Email | High | *"Wellness consultation confirmed with {practitionerName} on {date} at {time} ({branchName}/Online). Please complete intake form: {intakeLink}."* |
| **Appointment Reminder (24h & 2h)** | SMS | High | *"Reminder: Your wellness appointment with {practitionerName} is tomorrow at {time} at {branchName}."* |
| **Event Registration Ticket** | SMS + Email | High | *"You're registered for {eventName}! Your admission ticket: {ticketCode}. Show QR code at entrance."* |
| **Staff Low Stock Warning** | In-App / SMS | Medium | *"Alert: {skuName} at {branchName} has reached safety threshold ({currentStock} bottles remaining)."* |

---

## 3. Provider Abstraction & Philippine Gateway Options

The notification engine is architected using a provider-agnostic interface:
```typescript
interface NotificationProvider {
  sendSMS(payload: { to: string; message: string; senderId?: string }): Promise<NotificationResult>;
  sendEmail(payload: { to: string; subject: string; html: string; attachments?: Attachment[] }): Promise<NotificationResult>;
}
```

### Recommended Provider Candidates for Philippine Deployment:
- **Philippine SMS Gateways:**
  - *Semaphore (Philippine Telco Direct Route):* Highly reliable for Smart, Globe, Dito networks, supports custom Sender ID (e.g., `HCICMD`).
  - *PhilSMS / M360:* Local B2B bulk aggregators.
  - *Twilio:* Fallback global route.
- **Transactional Email Gateways:**
  - *Resend / Postmark / SendGrid:* High deliverability, clean DKIM/SPF integration.

---

## 4. Compliance & Consent Governance

- **Sender ID Transparency:** SMS messages must clearly identify the business name.
- **Strict Separation of Channels:** Promotional blasts (new product arrivals, discounts) must **never** be sent to numbers that have only consented to transactional order receipts.
- **Opt-Out Mechanism:** Promotional SMS messages must include: *"Text STOP to unsubscribe."*
