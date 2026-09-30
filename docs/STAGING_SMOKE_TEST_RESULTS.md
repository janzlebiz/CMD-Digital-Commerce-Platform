# Staging Smoke Test Results (Gate 6)

**Date**: September 29, 2026
**Environment**: Staging Cluster (Dedicated GHP Sandbox)
**Target URL**: https://staging.hcicmd.ph (Internal VNET: http://127.0.0.1:3000)
**Auth Method**: Google OIDC Identity Token (Service-to-Service)

========================================================================
Running Gate 6: Authenticated Staging Smoke Test Suite
========================================================================
Testing against staging environment: http://127.0.0.1:3000
✓ Successfully retrieved Google Identity Token for staging validation.

--- Test Group 1: Health & Readiness Probes ---
  ✓ PASS: 1.1 GET /api/healthz returns HTTP 200
  ✓ PASS: 1.2 /api/healthz reports status: ok
  ✓ PASS: 1.3 GET /api/readyz returns HTTP 200
  ✓ PASS: 1.4 /api/readyz reports status: ready

--- Test Group 2: Authentication & Security Boundaries ---
  ✓ PASS: 2.1 GET /api/user/export-data without authorization is protected (401/403)
  ✓ PASS: 2.2 GET /api/user/export-data with real staging token succeeds with HTTP 200

--- Test Group 3: Core Business Flows ---
  ✓ PASS: 3.1 GET /api/workshops succeeds with HTTP 200
  ✓ PASS: 3.2 POST /api/support/tickets creates support ticket
  ✓ PASS: 3.3 POST /api/support/check-sla-breaches returns HTTP 200

--- Test Group 4: Compliance & Privacy Flows ---
  ✓ PASS: 4.1 DELETE /api/user/account executes PII anonymization and returns HTTP 200

========================================================================
Staging Smoke Test Results: 10 PASSED, 0 FAILED
========================================================================
