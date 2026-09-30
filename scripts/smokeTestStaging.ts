/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Staging Smoke Test Verification Suite (Gate 6)
 * Verifies critical production-ready flows using real HTTP fetch requests.
 * MUST be run against a pre-deployed staging environment.
 */

import { GoogleAuth } from 'google-auth-library';

console.log('========================================================================');
console.log('Running Gate 6: Authenticated Staging Smoke Test Suite');
console.log('========================================================================');

let passedCount = 0;
let failedCount = 0;

function assert(condition: any, description: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${description}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${description}`);
    failedCount++;
  }
}

async function runSmokeTests() {
  const stagingUrl = process.env.STAGING_URL;
  if (!stagingUrl) {
    console.error('ERROR: STAGING_URL environment variable is required.');
    process.exit(1);
  }

  // Prevent accidental local execution without developer flag in CI
  if (!process.env.ALLOW_INTERNAL_STAGING && (stagingUrl.includes('127.0.0.1') || stagingUrl.includes('localhost'))) {
    console.error('ERROR: Localhost / 127.0.0.1 requires ALLOW_INTERNAL_STAGING=true for staging evidence.');
    process.exit(1);
  }

  console.log(`\nTesting against staging environment: ${stagingUrl}`);

  // Fetch real Google Identity Token for service-to-service authentication
  const auth = new GoogleAuth();
  let idToken = '';
  try {
    const client = await auth.getIdTokenClient(stagingUrl);
    idToken = await client.idTokenProvider.fetchIdToken(stagingUrl);
    console.log('✓ Successfully retrieved Google Identity Token for staging validation.');
  } catch (err: any) {
    console.warn('! Failed to fetch real Google Identity Token. Falling back to platform default identity.');
  }

  const authHeaders: Record<string, string> = idToken ? { 'Authorization': `Bearer ${idToken}` } : {};

  try {
    // --- Test Group 1: Health Probes ---
    console.log('\n--- Test Group 1: Health & Readiness Probes ---');
    
    // 1.1 Liveness probe (Should return 200 OK)
    const healthzRes = await fetch(`${stagingUrl}/api/healthz`, { headers: authHeaders });
    assert(healthzRes.status === 200, '1.1 GET /api/healthz returns HTTP 200');
    if (healthzRes.status === 200) {
      const data: any = await healthzRes.json();
      assert(data.status === 'ok', '1.2 /api/healthz reports status: ok');
    }

    // 1.2 Readiness probe (Should return 200 OK if DB is connected)
    const readyzRes = await fetch(`${stagingUrl}/api/readyz`, { headers: authHeaders });
    assert(readyzRes.status === 200, '1.3 GET /api/readyz returns HTTP 200');
    if (readyzRes.status === 200) {
      const data: any = await readyzRes.json();
      assert(data.status === 'ready', '1.4 /api/readyz reports status: ready');
    }

    // --- Test Group 2: Authentication & Security Boundaries ---
    console.log('\n--- Test Group 2: Authentication & Security Boundaries ---');

    // 2.1 Unauthorized endpoint protection (Should return 401/403/302)
    const exportResUnauth = await fetch(`${stagingUrl}/api/user/export-data`, { redirect: 'manual' });
    assert(exportResUnauth.status === 401 || exportResUnauth.status === 403, '2.1 GET /api/user/export-data without authorization is protected (401/403)');

    // 2.2 Authorized access (Should return 200 OK)
    const exportResAuth = await fetch(`${stagingUrl}/api/user/export-data`, { headers: authHeaders });
    assert(exportResAuth.status === 200, '2.2 GET /api/user/export-data with real staging token succeeds with HTTP 200');

    // --- Test Group 3: Core Business Flows ---
    console.log('\n--- Test Group 3: Core Business Flows ---');

    // 3.1 Catalog Access
    const productsRes = await fetch(`${stagingUrl}/api/workshops`, { headers: authHeaders });
    assert(productsRes.status === 200, '3.1 GET /api/workshops succeeds with HTTP 200');

    // 3.2 Support Ticket Creation
    const ticketPayload = {
      subject: 'Staging Authenticated Smoke Test',
      description: 'Verifying support ticket flow with real OIDC identity',
      category: 'product_inquiry',
      branchId: 'daet',
    };
    const ticketRes = await fetch(`${stagingUrl}/api/support/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify(ticketPayload),
    });
    assert(ticketRes.status === 201 || ticketRes.status === 200, '3.2 POST /api/support/tickets creates support ticket');

    // 3.3 SLA Breach Alert Scan
    const slaRes = await fetch(`${stagingUrl}/api/support/check-sla-breaches`, {
      method: 'POST',
      headers: authHeaders
    });
    assert(slaRes.status === 200, '3.3 POST /api/support/check-sla-breaches returns HTTP 200');

    // --- Test Group 4: Compliance & Privacy Flows ---
    console.log('\n--- Test Group 4: Compliance & Privacy Flows ---');

    // 4.1 Account anonymization and deletion
    const deleteRes = await fetch(`${stagingUrl}/api/user/account`, {
      method: 'DELETE',
      headers: authHeaders
    });
    assert(deleteRes.status === 200, '4.1 DELETE /api/user/account executes PII anonymization and returns HTTP 200');

  } catch (err: any) {
    console.error('Smoke tests failed with unexpected error:', err.message);
    failedCount++;
  }

  console.log('========================================================================');
  console.log(`Staging Smoke Test Results: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('========================================================================');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSmokeTests().catch((err) => {
  console.error('Unhandled smoke test runner exception:', err);
  process.exit(1);
});
