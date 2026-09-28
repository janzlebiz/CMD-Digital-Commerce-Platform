# Architecture Reconciliation: HCI CMD Digital Commerce Platform

## 1. Original TSD Architecture Baseline

The original Technical Specification Document (TSD) proposed a traditional enterprise stack:
* **Frontend/Full-Stack Framework**: Next.js (App Router / SSR).
* **Database & ORM**: PostgreSQL with a typed ORM (e.g., Prisma or Drizzle) and relational foreign key constraints.
* **Storage**: Production object storage (e.g., AWS S3 or Google Cloud Storage) for digital assets and documents.
* **Deployment & Runtime**: Reproducible, containerized deployment (Docker/Kubernetes) with isolated build artifacts and runtime container orchestration.
* **Migrations & Transactions**: SQL-native migrations and relational ACID transactions.

---

## 2. Actual Implemented Architecture

The working implementation baseline established during development and hardened across engineering milestones is:
* **Frontend Framework**: React 19 + TypeScript, bundled via Vite (Single Page Application architecture with client-side routing).
* **Backend Runtime**: Node.js with Express + TypeScript (`server.ts`) hosting REST API endpoints and serving static assets.
* **Authentication & Identity**: Firebase Authentication (Bearer token validation and claims verification).
* **Persistence Layer**: Cloud Firestore (NoSQL document database) managed via Firestore SDK and structured collections.
* **Security & KMS**: Google Cloud KMS integration for credential and sensitive data protection; server-authoritative operational writes enforced via Firestore security rules (`allow write: if false` on 9 operational collections per ADR-009).
* **Deployment Model**: Node.js production container/server runtime (`npm run build` and `node dist-server/server.js`).

---

## 3. Architecture-by-Layer Comparison

| Layer | Original TSD Baseline | Actual Implementation Baseline |
| :--- | :--- | :--- |
| **Client / UI** | Next.js SSR / App Router | React 19 + Vite SPA (Client-side routing) |
| **API & Server** | Next.js API Routes / Server Actions | Express + TypeScript (`server.ts`) |
| **Data Store** | PostgreSQL (Relational) | Cloud Firestore (NoSQL Document Store) |
| **Transaction Control** | Relational SQL Transactions | Optimistic Concurrency Control (OCC) / Version-Based Document Transactions |
| **Authentication** | Custom / JWT / NextAuth | Firebase Auth (Bearer Token Verification) |
| **Security Rules** | Database Foreign Keys & SQL RLS | Firestore Security Rules + Server-Authoritative Endpoints (ADR-009) |
| **Deployment** | Containerized Node/Next runtime | Vite build + Express server (`dist-server/server.js`) |

---

## 4. TSD-to-Implementation Deviation Table

| TSD Component | Actual Implementation | Deviation Classification | Rationale / Status |
| :--- | :--- | :--- | :--- |
| **Next.js SSR** | React 19 + Vite SPA | Architectural Shift | Faster prototyping and preview iteration in the AI Studio environment while maintaining client-side state and robust API routing. |
| **PostgreSQL Database** | Cloud Firestore | Architectural Shift | Chosen for rapid document modeling and native Firebase ecosystem integration; governed by custom OCC transaction and versioning wrappers in code. |
| **Relational ORM** | Firestore SDK & Document Collections | Architectural Shift | Replaced SQL queries and migrations with document reference lookups and programmatic validation. |
| **Containerized Deployment** | Vite + Express Server | Minor Deviation | Express server middleware integrated with Vite build assets, running successfully in Node runtime. |

---

## 5. Accepted Architectural Decisions

The deviations from the original TSD stack (moving from Next.js/PostgreSQL to Vite/React + Express/Firestore) are **accepted architectural decisions** for the current working implementation baseline. 

The project will **not** be rewritten back to Next.js or PostgreSQL. Instead, the current stack is recognized as the authoritative engineering baseline, provided it strictly upholds the core architectural security and data integrity principles defined below.

---

## 6. Open TSD Capabilities

While the current implementation baseline is fully functional and regression-tested (552/552 assertions passing across 14 test suites), several advanced TSD capabilities remain **open** and require future implementation during production hardening phases:
1. **Production Object-Storage Strategy**: Formalizing managed cloud blob storage (GCS/S3) for media and secure document attachments.
2. **Reproducible Production Deployment & Package Validation**: Container image hardening, multi-stage builds, and cryptographic dependency scanning.
3. **Production Observability & Error Monitoring**: Integration with enterprise APM, centralized log shipping, and error tracking (e.g., Sentry/Datadog).
4. **Health Checks**: Standardized `/healthz` and `/readyz` endpoints for liveness and readiness probing.
5. **Operational Metrics Completeness**: Prometheus/OpenTelemetry instrumentation for latency, throughput, and error rates.
6. **Payment-Provider Abstraction & Implementation**: Production gateway integration (Stripe, PayMongo, GCash) replacing simulated payment/deposit ledgers.
7. **Shipping & Delivery Provider Abstraction**: Carrier API integration (Logistics, 3PL tracking).
8. **Email / SMS / Push Notification Abstraction**: Production notification gateway (SendGrid, Twilio, Firebase Cloud Messaging).
9. **Analytics Abstraction**: Enterprise telemetry and event tracking pipeline.
10. **Complete PWA Implementation**: Full offline service worker caching, manifest installation prompts, and degraded-network synchronization (targeted for Phase 8).

---

## 7. Mandatory Security & Domain Principles

Regardless of persistence or framework shifts, the following core principles remain **strictly mandatory** across all platform modules:
* **Server-Authoritative State**: All financial, inventory, and order mutations must be validated and executed server-side.
* **Domain Boundaries**: Strict separation between commercial e-commerce, B2B stockists, CRM, support, and clinical/consultation domains.
* **Least Privilege**: Role-Based Access Control (RBAC) enforced at both the API routing layer and Firestore security rules.
* **Security Separation for Consultation Data**: Strict isolation of `/consultation_intakes` with clinical access controls and audit log sanitization.
* **Auditability**: Structured audit logs for sensitive operations with PII/PHI sanitization.
* **Secret Protection**: Zero client-side API key exposure; all external service interactions channeled through server-side proxy routes.
* **Data Minimization**: Exposure of user records restricted to authorized scopes.
* **Provider Abstraction Where Applicable**: Interfaces for external gateways and storage.
* **Safe Offline Behavior**: Graceful client error handling and retry mechanics.
* **Reproducible Production Deployment Requirements**: Strict build validation before release.

---

## 8. Impact on Phases 2, 7, 8, and 9

* **Phase 2 (E-Commerce)**: Relies on Firestore document models and server-authoritative checkout flows; requires future payment gateway abstraction.
* **Phase 7 (Automation & Analytics - Original PRD)**: Requires implementation of operational dashboards, transactional automation, and consent-aware marketing analytics on top of the hardened data baseline.
* **Phase 8 (Mobile/PWA Hardening)**: Open phase dedicated to service worker caching, offline shell, and mobile validation.
* **Phase 9 (Production Certification)**: Formal release gate requiring end-to-end security, performance, backup/restore, and compliance certification.

---

## 9. Statement of Non-Certification

> **EXPLICIT NOTICE**: Architecture reconciliation documents the current implementation baseline and accepts stack deviations. It **does NOT** equal production certification. The platform remains uncertified until Phase 9 production certification is formally completed.
