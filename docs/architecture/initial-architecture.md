# Initial System Architecture & Technical Specification

**Document ID:** ARCH-SPEC-001  
**Project:** HCI CMD Digital Commerce Platform  
**Target Territory:** Camarines Norte, Philippines  
**Audit Phase:** Phase 0 — Baseline Architectural Blueprint  
**Status:** Certified Architecture Baseline  
**Date:** 2026-09-25  

---

## 1. Architectural Strategy: The Modular Monolith

To balance rapid development velocity, operational simplicity, transactional consistency, and data security, the platform is designed as a **Modular Monolith**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT / PRESENTATION LAYER                     │
│  - Responsive Mobile-First Web Application                             │
│  - Progressive Web App (PWA) with Service Worker Shell & Offline Cache │
│  - Dedicated Staff Scanner & Handover Interface (HTML5 Camera API)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS (TLS 1.3) / JSON REST & RPC
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  APPLICATION / API GATEWAY LAYER                       │
│  - Next.js Server Components & Route Handlers / Express Application    │
│  - Global Security Middleware (CORS, Helmet, Rate Limiter, CSRF)       │
│  - Session Authentication & RBAC Policy Engine                         │
│  - Health Data Isolation Firewall Middleware                           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Strongly-Typed Module Boundaries
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        DOMAIN MODULE REGISTRY                          │
├──────────────┬──────────────┬──────────────┬──────────────┬────────────┤
│   Commerce   │   Branches   │  Inventory   │ Consultation │   Events   │
│  - Catalog   │  - Directory │  - Ledger    │  - Booking   │  - Agendas │
│  - Checkout  │  - Pickups   │  - Lots/EXP  │  - Intake    │  - Tickets │
│  - Payments  │  - Routing   │  - Resrvtn   │  - Encrypted │  - QR Scan │
│  - Invoices  │  - Staff     │  - Transfers │    Notes     │  - Waitlist│
├──────────────┼──────────────┼──────────────┼──────────────┼────────────┤
│     CRM      │   Content    │Notification  │  Security &  │ Analytics  │
│  - Profiles  │  - Articles  │  - SMS Gate  │    Audit     │  - Branch  │
│  - Consent   │  - Claims    │  - Email Gate│  - Auth Log  │    Sales   │
│  - Support   │    Check     │  - Push Gate │  - SPI Audit │  - Reports │
└──────────────┴──────────────┴──────────────┴──────────────┴────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
┌───────────────────────────────────────┐ ┌──────────────────────────────┐
│        PERSISTENCE LAYER              │ │       OBJECT STORAGE         │
│  - PostgreSQL Relational Database     │ │  - S3-Compatible / MinIO     │
│  - Typed ORM (Drizzle / Prisma)       │ │  - Product Images            │
│  - Row-Level Locking for Inventory    │ │  - Batch Certifications (CPR)│
│  - Column Encryption for Health Data  │ │  - Invoice PDF Archives      │
│  - Immutable Audit Log Tables         │ │  - Privacy-Signed Uploads    │
└───────────────────────────────────────┘ └──────────────────────────────┘
```

---

## 2. Technology Selection & Trade-Off Evaluation

| Layer | Selected Recommended Baseline | Evaluated Alternatives | Selection Rationale |
| :--- | :--- | :--- | :--- |
| **Framework / Runtime** | **Next.js (App Router) + TypeScript** | Remix, Express + React SPA, Nuxt | Unified full-stack TypeScript environment, server components for SEO-rich public catalog, lightweight mobile payloads. |
| **Persistence Engine** | **PostgreSQL (v15+)** | MySQL, MongoDB, DynamoDB | Strict ACID transaction guarantees essential for multi-branch stock reservations and financial invoice ledgers. Robust JSONB support. |
| **Data Access / ORM** | **Typed ORM (Drizzle / Prisma)** | Raw SQL, TypeORM | Compile-time type safety, automated schema migrations, zero SQL injection vulnerabilities. |
| **Authentication & RBAC** | **Secure Session Auth (HTTP-Only Secure Cookies)** | Firebase Auth, Supabase Auth, Clerk | Provider independence, strict local session control, zero vendor lock-in, effortless custom RBAC. |
| **Object Storage** | **S3-Compatible Cloud Storage (Cloudflare R2 / AWS S3)** | Local Disk, Google Cloud Storage | Globally distributed, zero egress fees (Cloudflare R2), signed URL uploads for secure health document attachments. |
| **SMS Gateway** | **Semaphore / Local Philippine Telco Gateway** | Twilio exclusively | Direct Philippine telco interconnection (Smart, Globe, Dito) ensures >98% instantaneous SMS delivery for OTPs and pickup codes. |

---

## 3. Security Architecture & Threat Mitigation

### 3.1 Role-Based Access Control (RBAC) Matrix

| User Role | Storefront & Checkout | Branch Pickup Handover | Stock Adjustments | Naturopathic Clinical Notes | Content Publishing | Security Audit Logs |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Customer** | YES | NO | NO | View Own Only | NO | NO |
| **Branch Staff** | NO | YES (Assigned) | Count Only | **FORBIDDEN** | NO | NO |
| **Branch Manager** | NO | YES (Assigned) | YES (Assigned) | **FORBIDDEN** | NO | NO |
| **Practitioner** | NO | NO | NO | **YES (Assigned)** | NO | NO |
| **Content Editor** | NO | NO | NO | **FORBIDDEN** | Draft Only | NO |
| **Store Admin** | YES | YES | YES | **FORBIDDEN** | Full Approval | Read Only |
| **System Admin** | NO | NO | NO | **FORBIDDEN** | System Config | Full Audit |

### 3.2 Health Data Isolation
- Health narrative columns (`consultation_intakes.clinical_assessment` and `consultation_notes.notes_narrative`) are encrypted at the application layer using `AES-256-GCM` before reaching the database persistence layer.
- Health records are placed in a logically segregated module and schema with dedicated access controllers.

### 3.3 Defensive Security Controls
1. **Input Validation:** Enforced through Zod schemas at every API route boundary. Rejects unvalidated payload fields.
2. **Rate Limiting:** IP and user-based token bucket rate limiting on authentication routes (5 attempts per 15 minutes) and checkout endpoints (10 requests per minute) to thwart brute-force and credential stuffing.
3. **Session Hardening:** Session tokens stored strictly in `HTTP-Only`, `Secure`, `SameSite=Lax` cookies.
4. **Secret Management:** All credentials (database connection strings, encryption keys, SMS API tokens) managed via environment variables. Zero credentials in repository source code.
5. **CSRF & Security Headers:** Enforce Content Security Policy (CSP), X-Content-Type-Options: nosniff, X-Frame-Options: DENY, and Strict-Transport-Security (HSTS).

---

## 4. Concurrency & Inventory Consistency

To prevent overselling across the six branch locations:
- Checkout stock deductions employ **pessimistic row-level locking**:
  ```sql
  BEGIN;
  SELECT quantity_on_hand, quantity_reserved 
  FROM branch_inventory 
  WHERE branch_id = :branchId AND sku = :sku 
  FOR UPDATE;
  
  -- Verify (quantity_on_hand - quantity_reserved) >= :requestedQty
  UPDATE branch_inventory 
  SET quantity_reserved = quantity_reserved + :requestedQty 
  WHERE branch_id = :branchId AND sku = :sku;
  COMMIT;
  ```
- Soft-locks automatically expire via a background cleanup cron if checkout is abandoned after 15 minutes.

---

## 5. Mobile & PWA Operational Pipeline

- **Service Worker Strategy:**
  - Network-First: Orders, prices, inventory availability, appointments.
  - Stale-While-Revalidate: Catalog static pages, health articles, branch contact directory.
  - Offline Fallback Shell: Displays cached order pickup QR codes and branch phone numbers when offline.
- **Hardware Integration:**
  - HTML5 Barcode/QR Scanner API utilized by branch staff smartphones for zero-hardware pickup code validation.
