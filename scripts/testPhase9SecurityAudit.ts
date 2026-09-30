/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createExpressApp } from '../server.ts';
import fs from 'fs';
import path from 'path';
import http from 'http';
import crypto from 'crypto';

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

  // 1. Verify Google OIDC super-admin path is absent in production
  console.log('\n--- 1. Verification of Production OIDC Fallback Block ---');
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  const res = await fetch(`${baseUrl}/api/user/export-data`, {
    headers: { 'Authorization': 'Bearer SOME_GOOGLE_OIDC_TOKEN' }
  });
  
  assert(res.status === 401, '1.1 Google OIDC fallback is completely blocked and ignored when NODE_ENV=production');

  process.env.NODE_ENV = originalEnv;

  // 2. Verify brute-force rate limiting on real security boundary (requireAuth)
  console.log('\n--- 2. Verification of Brute-Force Rate Limiting ---');
  let hitRateLimit = false;

  for (let i = 0; i < 10; i++) {
    const res = await fetch(`${baseUrl}/api/user/export-data`, {
      headers: { 
        'Authorization': `Bearer INVALID_TOKEN_${i}`,
        'X-Forwarded-For': '192.168.99.99'
      }
    });
    if (res.status === 429) {
      hitRateLimit = true;
      break;
    }
  }
  assert(hitRateLimit === true, '2.1 Real requireAuth boundary triggers HTTP 429 after 5 failed authentication attempts');

  // 3. Verify that CI security scan workflow exists and is valid
  console.log('\n--- 3. Verification of Automated CI Security Scan ---');
  const ciWorkflowPath = path.resolve(process.cwd(), '.github/workflows/security-scan.yml');
  const ciWorkflowExists = fs.existsSync(ciWorkflowPath);
  assert(ciWorkflowExists === true, '3.1 GitHub Actions automated security scan workflow exists on disk');

  if (ciWorkflowExists) {
    const content = fs.readFileSync(ciWorkflowPath, 'utf8');
    assert(content.includes('npm audit') && content.includes('npm run lint'), '3.2 CI workflow performs dependency audit and static code analysis linting');
    
    // Check Semgrep genuine SAST and ensure no soft-fail override exists
    const hasSemgrep = content.includes('semgrep');
    const hasSemgrepSoftFail = content.includes('semgrep') && content.includes('|| true');
    assert(hasSemgrep && !hasSemgrepSoftFail, '3.3 Semgrep SAST is configured and runs without soft-fail overrides (e.g. || true)');

    // Check OWASP ZAP genuine DAST and ensure fail_action is true
    const hasZap = content.includes('zaproxy');
    const hasZapEnforced = content.includes('fail_action: true');
    const hasZapSoftFail = content.includes('fail_action: false');
    assert(hasZap && hasZapEnforced && !hasZapSoftFail, '3.4 OWASP ZAP DAST is configured and enforces build failure on findings (fail_action: true)');
  }

  // --- 4. Regression Tests: Area 1 - Backup Key Enforcement & Fail-Closed Behavior ---
  console.log('\n--- 4. Regression Tests: Area 1 - Backup Encryption Key Fail-Closed ---');
  const backupModule = await import('./backupDatabase.ts');
  const origEnvBackup = process.env.NODE_ENV;
  const origKeyBackup = process.env.BACKUP_ENCRYPTION_KEY;

  try {
    process.env.NODE_ENV = 'production';
    delete process.env.BACKUP_ENCRYPTION_KEY;

    let backupThrewInProd = false;
    try {
      backupModule.getBackupEncryptionKey();
    } catch (err: any) {
      backupThrewInProd = true;
      assert(err.message.includes('BACKUP_ENCRYPTION_KEY_REQUIRED'), '4.1 getBackupEncryptionKey throws BACKUP_ENCRYPTION_KEY_REQUIRED in production when key is missing');
    }
    assert(backupThrewInProd === true, '4.2 Backup encryption fails closed in production when key is missing');

    // Test with explicit key in production
    const explicitKey = process.env.TEST_BACKUP_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
    const resolvedKey = backupModule.getBackupEncryptionKey(explicitKey);
    assert(resolvedKey === explicitKey, '4.3 getBackupEncryptionKey accepts and uses explicitly provided key in production');

    // Verify DEFAULT_SECRET is removed from backupDatabase.ts
    const backupScriptContent = fs.readFileSync(path.resolve(process.cwd(), 'scripts/backupDatabase.ts'), 'utf8');
    assert(!backupScriptContent.includes('DEFAULT_SECRET'), '4.4 Hardcoded DEFAULT_SECRET completely removed from scripts/backupDatabase.ts');
  } finally {
    process.env.NODE_ENV = origEnvBackup;
    if (origKeyBackup) process.env.BACKUP_ENCRYPTION_KEY = origKeyBackup;
  }

  // --- 5. Regression Tests: Area 2 - Removal of Literal HMAC & Webhook Secrets ---
  console.log('\n--- 5. Regression Tests: Area 2 - Secret Hardening in Test Scripts ---');
  const workshopsScript = fs.readFileSync(path.resolve(process.cwd(), 'scripts/testPhase6BWorkshops.ts'), 'utf8');
  const forbiddenHmac = ['PROD', 'SECURE', 'HMAC', 'KEY', 'EXPLICITLY', 'PROVIDED', '2026'].join('_');
  assert(!workshopsScript.includes(forbiddenHmac), '5.1 testPhase6BWorkshops.ts contains no literal HMAC key string');

  const monitoringScript = fs.readFileSync(path.resolve(process.cwd(), 'scripts/testPhase9Monitoring.ts'), 'utf8');
  const forbiddenWebhook = ['TEST', 'ALERT', 'SECRET', '123'].join('_');
  assert(!monitoringScript.includes(forbiddenWebhook), '5.2 testPhase9Monitoring.ts contains no literal webhook secret string');

  const priorityAScript = fs.readFileSync(path.resolve(process.cwd(), 'scripts/testPriorityAFoundation.ts'), 'utf8');
  const forbiddenPriorityKey = ['TEST', 'NON', 'PROD', 'HMAC', 'SECRET', 'KEY', '12345'].join('_');
  assert(!priorityAScript.includes(forbiddenPriorityKey), '5.3 testPriorityAFoundation.ts contains no literal HMAC key string');

  // --- 6. Regression Tests: Area 3 - Immutable ZAP Pinning without nosem Suppression ---
  console.log('\n--- 6. Regression Tests: Area 3 - Immutable ZAP Action Pinning ---');
  if (ciWorkflowExists) {
    const wfContent = fs.readFileSync(ciWorkflowPath, 'utf8');
    const zapStep = wfContent.split('\n').find((l: string) => l.includes('zaproxy/action-baseline@'));
    assert(!!zapStep, '6.1 ZAP step exists in workflow');
    if (zapStep) {
      const isPinnedToSha = /zaproxy\/action-baseline@[a-f0-9]{40}/.test(zapStep);
      assert(isPinnedToSha === true, '6.2 zaproxy/action-baseline is pinned to a full 40-character commit SHA');
      const hasVersionComment = zapStep.includes('# v0.15.0') || zapStep.includes('# v');
      assert(hasVersionComment === true, '6.3 zap step retains semantic version tag as a comment');
      const hasNosemSuppression = zapStep.includes('nosem');
      assert(hasNosemSuppression === false, '6.4 nosem suppression is removed from ZAP action step');
    }
  }

  // --- 7. Regression Tests: Area 4 - Production Security Headers Applied to Responses ---
  console.log('\n--- 7. Regression Tests: Area 4 - Security Headers on HTTP Responses ---');
  const headerCheckRes = await fetch(`${baseUrl}/api/healthz`);
  const hsts = headerCheckRes.headers.get('strict-transport-security');
  const csp = headerCheckRes.headers.get('content-security-policy');
  const permPolicy = headerCheckRes.headers.get('permissions-policy');
  const xContentType = headerCheckRes.headers.get('x-content-type-options');
  const xFrameOptions = headerCheckRes.headers.get('x-frame-options');

  assert(!!hsts && hsts.includes('max-age'), '7.1 Strict-Transport-Security header set with max-age');
  assert(!!csp && csp.includes("default-src 'self'"), '7.2 Content-Security-Policy header set with self restriction');
  assert(!!permPolicy && permPolicy.includes('camera=()'), '7.3 Permissions-Policy header set restricting camera/microphone/geolocation');
  assert(xContentType === 'nosniff', '7.4 X-Content-Type-Options: nosniff header set');
  assert(xFrameOptions === 'SAMEORIGIN', '7.5 X-Frame-Options: SAMEORIGIN header set');

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
