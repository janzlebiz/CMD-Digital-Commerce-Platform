========================================================================
Running Gate 6: Staging Environment Smoke Test Suite
========================================================================

Testing against staging environment: http://127.0.0.1:3000

--- Test Group 1: Health & Readiness Probes ---
  ✓ PASS: 1.1 GET /healthz returns HTTP 200
  ✓ PASS: 1.2 /healthz contains expected structure
  ✓ PASS: 1.3 GET /readyz returns HTTP 200
  ✓ PASS: 1.4 /readyz reports status: ready

--- Test Group 2: Authentication & Security Boundaries ---
  ✓ PASS: 2.1 GET /api/user/export-data without authorization fails with HTTP 401
  ✓ PASS: 2.2 GET /api/user/export-data with super admin token succeeds with HTTP 200

--- Test Group 3: Core Business Flows ---
  ✓ PASS: 3.1 GET /api/workshops succeeds with HTTP 200
  ✓ PASS: 3.2 POST /api/support/tickets creates support ticket
  ✓ PASS: 3.3 POST /api/support/check-sla-breaches returns HTTP 200

--- Test Group 4: Compliance & Privacy Flows ---
  ✓ PASS: 4.1 DELETE /api/user/account executes PII anonymization and returns HTTP 200
========================================================================
Staging Smoke Test Results: 10 PASSED, 0 FAILED
========================================================================
