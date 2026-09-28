# Authoritative Project Status: HCI CMD Digital Commerce Platform

## 1. Authoritative PRD/IMP Phase Roadmap (0–10)

The canonical product roadmap comprises the following ten phases:
* **Phase 0** — Audit and Discovery
* **Phase 1** — Foundation and Public Website
* **Phase 2** — E-Commerce
* **Phase 3** — Branch and Inventory
* **Phase 4** — Consultation
* **Phase 5** — Events and Symposiums
* **Phase 6** — CRM
* **Phase 7** — Automation and Analytics
* **Phase 8** — Mobile/PWA Hardening
* **Phase 9** — Production Certification
* **Phase 10** — Future Integrations

---

## 2. Distinction: Original Phase 7 vs. Engineering Milestones M1–M8

* **Original PRD/IMP Phase 7**: "Automation and Analytics" (operational dashboards, metric aggregation, consent-aware marketing automation, transactional notifications).
* **Engineering Phase 7 M1–M8**: A specialized backend hardening, multi-branch inventory, FEFO allocation, B2B credit controls, security/IDOR defense, and concurrency/OCC test track (`testPhase7Milestone1` through `testPhase7Milestone8`).
* **Rule**: Engineering milestones M1–M8 **do not** replace or constitute completion of original PRD Phase 7.

---

## 3. Current Phase Status Table

| Phase | Status | Description / Notes |
| :--- | :--- | :--- |
| **Phase 0** | CERTIFIED / historical | Initial audit and repository discovery completed. |
| **Phase 1** | SUBSTANTIALLY IMPLEMENTED | Public website, layout, and foundational routing established. |
| **Phase 2** | PARTIAL | Core cart and order flows implemented; production payment gateway and shipping abstractions remain open. |
| **Phase 3** | STRONG / IMPLEMENTED | Multi-branch inventory tracking, FEFO batch management, and stock transfers fully operational. |
| **Phase 4** | STRONG / IMPLEMENTED | Consultation bookings, appointment scheduling, and clinical access controls operational. |
| **Phase 5** | SUBSTANTIALLY IMPLEMENTED | Events, symposiums, and workshop passes implemented and regression tested. |
| **Phase 6** | IMPLEMENTED / HARDENED | CRM cohorts, financial metrics, and support ticketing suites fully implemented and tested. |
| **Phase 7** | PARTIAL / OPEN | Engineering M1–M8 hardening complete (552/552 assertions passing); original PRD Phase 7 (automation & analytics) remains open. |
| **Phase 8** | OPEN | Mobile / PWA offline shell, service worker caching, and device validation pending. |
| **Phase 9** | NOT COMPLETE | Formal production certification gate (security audit, load testing, disaster recovery, launch sign-off) pending. |
| **Phase 10** | FUTURE | Advanced third-party ecosystem integrations (deferred). |

---

## 4. Current Engineering Hardening Baseline

* **Completed Track**: Engineering Phase 7 M1–M8.
* **Audited Commit**: `dce537f86d5662054419c478bde942385f8fbd11`
* **Regression Baseline**: **552/552 assertions passing** across **14 regression test suites**.
* **Concurrency & OCC**: M8 concurrency hardening completed. Global `_txQueue` serialization removed from concurrency test harness; optimistic concurrency control (OCC) version validation and auto-retries verified.

---

## 5. Current Architecture Baseline

* React 19 + TypeScript (Vite SPA)
* Node.js + Express + TypeScript (`server.ts`)
* Firebase Authentication & Firebase Admin SDK
* Cloud Firestore (Document Database)
* Google Cloud KMS credential protection
* Server-authoritative operational writes (Firestore direct writes denied by security rules per ADR-009).

---

## 6. Open Critical Work

### Priority A: Foundation & Observability (COMPLETED)
* Architecture reconciliation documentation (`ARCHITECTURE_RECONCILIATION.md` completed).
* Reproducible production build (`npm run build`), start (`npm start`), and deployment validation (`dist-server/server.js` artifact generation verified).
* Production observability, structured JSON logging, and request correlation (`X-Request-Id` / `x-correlation-id`).
* Standardized health probes (`GET /healthz` liveness and `GET /readyz` readiness).
* Safe centralized Express error handling and secret masking in production.
* Production runtime baseline documentation (`PRODUCTION_RUNTIME_BASELINE.md` completed).

### Priority B: E-Commerce & Order Lifecycle (COMPLETED FOUNDATION BASELINE)
* Authoritative customer checkout consolidated on `POST /api/orders/checkout` server endpoint with catalog pricing, FEFO reservation, and idempotency protections.
* Payment provider abstraction layer implemented (`PaymentProvider`, `PaymentIntent`, `SimulatedPaymentAdapter`, `PaymentAdapterRegistry`).
* Delivery and shipping provider abstraction layer implemented (`DeliveryProvider`, `DeliveryQuote`, `DeliveryFulfillment`, `StandardDeliveryAdapter`).
* Server-side order lifecycle operations implemented (`POST /api/orders/:orderId/cancel`, `POST /api/orders/:orderId/return-request`, `POST /api/orders/:orderId/return-process`, `POST /api/orders/:orderId/refund`).
* Priority B commerce baseline documentation (`PRIORITY_B_COMMERCE_BASELINE.md` completed).

### Priority C: Automation & Analytics (Original Phase 7)
* Operational dashboards and business intelligence views.
* Sales, inventory, appointment, event, and customer metrics aggregation.
* Transactional automation and workflows.
* Consent-aware marketing automation.
* Notification abstraction, delivery queuing, and failure handling.

### Priority D: Mobile & PWA Hardening (Original Phase 8)
* PWA Web App Manifest configuration.
* Service worker installation and offline shell caching.
* Safe cache eviction and cache-first/network-first policies.
* Android and network condition validation.
* Degraded connectivity behavior and native-app evaluation.

### Priority E: Production Certification (Original Phase 9)
* Comprehensive security and penetration testing.
* Privacy and compliance verification.
* Performance, load, and concurrency stress testing.
* Backup, restore, and disaster recovery rehearsal.
* Monitoring, alerting, and operational runbooks.
* End-to-end business acceptance and formal deployment sign-off / launch certification.

---

## 7. Freeze and Alignment Rules

1. **Do not renumber the original PRD/IMP phases.** (Phases 0–10 remain canonical).
2. **Do not call engineering Phase 7 M1–M8 "original Phase 7".**
3. **Every future phase report must identify both the original phase and any engineering milestone/track.**
4. **No production-readiness claim until original Phase 9 is formally gated and certified.**
5. **Architecture changes must be documented before becoming baseline assumptions.**
6. **Passing regression tests does not automatically certify unmet functional requirements.**

---

## 8. Current Project Gate

> **CURRENT PROJECT GATE**: Architecture Reconciliation complete; do not begin production release certification yet.

---

## 9. Next Planned Work

Proceeding from the reconciled architecture, the immediate next steps will address remaining launch-critical requirements (Priority A & B), followed by the structured completion of original Phase 7 (Automation & Analytics), Phase 8 (PWA Hardening), and Phase 9 (Production Certification).
