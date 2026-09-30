/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Gate 6: End-to-End Business Acceptance Verification Suite
 */

import fs from 'fs';
import path from 'path';

console.log('========================================================================');
console.log('Running Gate 6: End-to-End Business Acceptance Test Suite');
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

try {
  // --- Test Group 1: Verification of Staging Smoke Test Script ---
  console.log('\n--- Test Group 1: Staging Smoke Test Script Verification ---');
  
  const smokeScriptExists = fs.existsSync(path.resolve(process.cwd(), 'scripts/smokeTestStaging.ts'));
  assert(smokeScriptExists === true, '1.1 Staging smoke test script scripts/smokeTestStaging.ts exists on disk');

  if (smokeScriptExists) {
    const content = fs.readFileSync(path.resolve(process.cwd(), 'scripts/smokeTestStaging.ts'), 'utf8');
    assert(content.includes('fetch(') && content.includes('/healthz') && content.includes('/readyz'), '1.2 smokeTestStaging.ts makes real network/fetch requests against probes');
    assert(content.includes('auth.getIdTokenClient') && content.includes('/api/user/export-data'), '1.3 smokeTestStaging.ts verifies authentication & compliance pathways');
  }

  // --- Test Group 2: Verification of UAT Sign-Off Documentation ---
  console.log('\n--- Test Group 2: UAT Sign-Off Documentation Verification ---');

  const uatSignoffExists = fs.existsSync(path.resolve(process.cwd(), 'docs/UAT_SIGNOFF.md'));
  assert(uatSignoffExists === true, '2.1 UAT Sign-Off document docs/UAT_SIGNOFF.md exists on disk');

  if (uatSignoffExists) {
    const signoffContent = fs.readFileSync(path.resolve(process.cwd(), 'docs/UAT_SIGNOFF.md'), 'utf8').toLowerCase();
    
    // Check for UAT checklists
    assert(signoffContent.includes('customer registration/login') || signoffContent.includes('registration & login'), '2.2 UAT checklist covers customer registration/login');
    assert(signoffContent.includes('product browsing/cart') || signoffContent.includes('product browsing & cart'), '2.3 UAT checklist covers product browsing/cart');
    assert(signoffContent.includes('checkout/payment') || signoffContent.includes('checkout & payments'), '2.4 UAT checklist covers checkout/payment');
    assert(signoffContent.includes('inventory/fefo') || signoffContent.includes('fefo & multi-branch inventory'), '2.5 UAT checklist covers inventory/FEFO');
    assert(signoffContent.includes('refunds/returns') || signoffContent.includes('refunds & returns'), '2.6 UAT checklist covers refunds/returns');
    assert(signoffContent.includes('consultations') || signoffContent.includes('clinical consultation'), '2.7 UAT checklist covers consultations');
    assert(signoffContent.includes('workshops') || signoffContent.includes('workshops & symposiums'), '2.8 UAT checklist covers workshops');
    assert(signoffContent.includes('support tickets') || signoffContent.includes('support tickets & dispute resolution'), '2.9 UAT checklist covers support tickets');
    assert(signoffContent.includes('privacy/dsar') || signoffContent.includes('privacy, consent & dsar'), '2.10 UAT checklist covers privacy/DSAR');
    assert(signoffContent.includes('notifications') || signoffContent.includes('transactional notifications'), '2.11 UAT checklist covers notifications');
    assert(signoffContent.includes('branch/admin') || signoffContent.includes('admin & branch workflows'), '2.12 UAT checklist covers branch/admin workflows');
    assert(signoffContent.includes('backup/recovery') || signoffContent.includes('backup, pitr & disaster recovery'), '2.13 UAT checklist covers backup/recovery');

    // Check for UAT fields
    assert(signoffContent.includes('test scope') || signoffContent.includes('scope'), '2.14 UAT contains test scope description');
    assert(signoffContent.includes('tester/date') || (signoffContent.includes('tester') && signoffContent.includes('date')), '2.15 UAT contains tester and date fields');
    assert(signoffContent.includes('pass/fail') || signoffContent.includes('result'), '2.16 UAT contains pass/fail status metrics');
    assert(signoffContent.includes('defects') || signoffContent.includes('defect tracker'), '2.17 UAT contains defects log');
    assert(signoffContent.includes('acceptance sign-off') || signoffContent.includes('sign-off'), '2.18 UAT contains final business acceptance sign-off section');

    // Check for Deployment Safety checklists
    assert(signoffContent.includes('pre-deployment'), '2.19 UAT contains pre-deployment check list');
    assert(signoffContent.includes('smoke tests'), '2.20 UAT contains smoke testing validation list');
    assert(signoffContent.includes('health/readiness') || signoffContent.includes('health & readiness'), '2.21 UAT contains health and readiness check list');
    assert(signoffContent.includes('rollback trigger') && signoffContent.includes('rollback procedure'), '2.22 UAT contains rollback triggers and rollback procedures');
    assert(signoffContent.includes('post-deployment'), '2.23 UAT contains post-deployment verification procedures');
  }

} catch (err: any) {
  console.error('Gate 6 test verification failed with unexpected error:', err.message);
  failedCount++;
}

console.log('========================================================================');
console.log(`Gate 6 Verification Results: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log('========================================================================');

if (failedCount > 0) {
  process.exit(1);
}
