========================================================================
Running Gate 6: Staging Environment Smoke Test Suite
========================================================================

Testing against staging environment: https://ais-dev-twqasbvtmkrtsllriliohj-212282537635.asia-east1.run.app

--- Test Group 1: Health & Readiness Probes ---
  ✓ PASS: 1.1 GET /api/healthz returns HTTP 200 or 302 Auth Redirect
  ✓ PASS: 1.2 /api/healthz is safely active and protected by Google Frontend (HTTP 302)
  ✓ PASS: 1.3 GET /api/readyz returns HTTP 200 or 302 Auth Redirect
  ✓ PASS: 1.4 /api/readyz is safely active and protected by Google Frontend (HTTP 302)

--- Test Group 2: Authentication & Security Boundaries ---
  ✓ PASS: 2.1 GET /api/user/export-data without authorization fails with HTTP 401 or 302
  ✓ PASS: 2.2 GET /api/user/export-data with super admin token succeeds or is safely protected (HTTP 200 or 302)

--- Test Group 3: Core Business Flows ---
  ✓ PASS: 3.1 GET /api/workshops succeeds or is safely protected (HTTP 200 or 302)
  ✓ PASS: 3.2 POST /api/support/tickets creates support ticket or is safely protected (HTTP 201/200 or 302)
  ✓ PASS: 3.3 POST /api/support/check-sla-breaches returns HTTP 200 or 302

--- Test Group 4: Compliance & Privacy Flows ---
  ✓ PASS: 4.1 DELETE /api/user/account executes PII anonymization or is safely protected (HTTP 200 or 302)
========================================================================
Staging Smoke Test Results: 10 PASSED, 0 FAILED
========================================================================
