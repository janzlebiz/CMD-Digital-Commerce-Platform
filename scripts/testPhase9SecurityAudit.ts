/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createExpressApp } from '../server.ts';
import fs from 'fs';
import path from 'path';
import http from 'http';

console.log('========================================================================');
console.log('Running Gate 1: Security Audit & Brute-Force Rate Limiting Test Suite');
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

function createSecurityMockDb() {
  return {
    collection: () => ({
      doc: () => ({
        get: async () => ({ exists: false, data: () => null }),
        set: async () => {},
      }),
    }),
  };
}

async function runSecurityAuditTests() {
  const db = createSecurityMockDb();
  const app = createExpressApp({ db });
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // 1. Verify brute-force rate limiting on auth / login-attempt
  console.log('\n--- 1. Verification of Brute-Force Rate Limiting ---');
  let hitRateLimit = false;

  for (let i = 0; i < 10; i++) {
    const res = await fetch(`${baseUrl}/api/auth/login-attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@hcicmd.ph', password: 'wrong-password' })
    });
    if (res.status === 429) {
      hitRateLimit = true;
      break;
    }
  }
  assert(hitRateLimit === true, '1.1 Authentication / login-attempt route triggers HTTP 429 after exceeding max requests');

  // 2. Verify Google OIDC super-admin path is absent in production
  console.log('\n--- 2. Verification of Production OIDC Fallback Block ---');
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  const res = await fetch(`${baseUrl}/api/user/export-data`, {
    headers: { 'Authorization': 'Bearer SOME_GOOGLE_OIDC_TOKEN' }
  });
  
  assert(res.status === 401, '2.1 Google OIDC fallback is completely blocked and ignored when NODE_ENV=production');

  process.env.NODE_ENV = originalEnv;

  // 3. Verify that CI security scan workflow exists and is valid
  console.log('\n--- 3. Verification of Automated CI Security Scan ---');
  const ciWorkflowPath = path.resolve(process.cwd(), '.github/workflows/security-scan.yml');
  const ciWorkflowExists = fs.existsSync(ciWorkflowPath);
  assert(ciWorkflowExists === true, '3.1 GitHub Actions automated security scan workflow exists on disk');

  if (ciWorkflowExists) {
    const content = fs.readFileSync(ciWorkflowPath, 'utf8');
    assert(content.includes('npm audit') && content.includes('npm run lint'), '3.2 CI workflow performs dependency audit and static code analysis linting');
  }

  // Cleanup server
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });

  console.log('\n========================================================================');
  console.log(`Gate 1 Security Audit Test Results: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('========================================================================');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSecurityAuditTests().catch((err) => {
  console.error('Security audit test execution failed:', err);
  process.exit(1);
});
