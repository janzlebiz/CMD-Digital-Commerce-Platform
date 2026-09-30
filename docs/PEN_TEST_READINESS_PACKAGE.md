# Penetration-Test Readiness Package

## 1. Architecture Overview
- **Type**: Full-stack web application (Vite SPA + Node.js/Express backend).
- **Hosting**: Google Cloud Run (containerized).
- **Persistence**: Firebase Firestore (primary) + Google Cloud Storage (backups).
- **Auth**: Firebase Authentication (OIDC).

## 2. Authentication / RBAC Boundaries
- **Auth Mechanism**: Firebase Auth (client), Bearer token validation (server).
- **Roles**: Super Admin, Regional Director, Branch Manager, Practitioner, Customer.
- **RBAC Enforcement**: Server-side checks in `requireAuth` and specific API middleware ensure role-based access to restricted endpoints.

## 3. API Endpoint Inventory
- **Auth/User**: `/api/auth/*`, `/api/user/*`.
- **Business Logic**: `/api/workshops`, `/api/consultations/*`, `/api/clinical/*`.
- **Admin/CRM**: `/api/crm/*`.
- **System**: `/api/healthz`, `/api/readyz`.

## 4. Security Controls
- **Rate Limiting**: IP-based rate limiting on `requireAuth` boundary (5 attempts/min) to prevent brute-forcing.
- **Static Analysis (SAST)**: Automated Semgrep scans enforced in CI.
- **Dynamic Analysis (DAST)**: Automated OWASP ZAP baseline scans enforced in CI.
- **Dependency Audit**: `npm audit` enforced in CI.
- **OIDC Hardening**: Service-account auth strictly disabled in production.

## 5. Staging Test URL & Access
- **Staging URL**: `https://ais-pre-twqasbvtmkrtsllriliohj-212282537635.asia-east1.run.app`
- **Access Procedure**: Access requires authorized OIDC identity tokens, simulated by CI/regression pipelines using service-account credentials.

## 6. Logging / Audit Coverage
- **Audit Trails**: Security-sensitive actions (e.g., CRM queries, clinical data access) are logged to Firestore audit collections with actor UID, role, and branch context.

## 7. Backup / DR Controls
- **Backup Strategy**: Daily automated Firestore snapshots to GCS with AES-256-GCM encryption.
- **Lifecycle Policy**: 30-day object expiration policy enforced on backup GCS buckets.
- **PITR**: Firestore Point-in-Time Recovery enabled with 7-day retention.

## 8. Known Limitations
- **Pen-Test Status**: Gate 1 is PARTIAL / OPEN. Final production certification is blocked pending the delivery and formal review of the third-party penetration-test report.
