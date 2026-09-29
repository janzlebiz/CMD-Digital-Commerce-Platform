/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { execSync } from 'child_process';

const testFiles = [
  'scripts/testPhase6AConsultations.ts',
  'scripts/testPhase6BWorkshops.ts',
  'scripts/testPhase6CCrmCohorts.ts',
  'scripts/testPhase6CFinanceMetrics.ts',
  'scripts/testPhase6CSupportTickets.ts',
  'scripts/testPhase7Inventory.ts',
  'scripts/testPhase7Milestone25Checkout.ts',
  'scripts/testPhase7Milestone2Fefo.ts',
  'scripts/testPhase7Milestone3Provenance.ts',
  'scripts/testPhase7Milestone4Transfers.ts',
  'scripts/testPhase7Milestone5Forecasting.ts',
  'scripts/testPhase7Milestone6B2B.ts',
  'scripts/testPhase7Milestone7Security.ts',
  'scripts/testPhase7Milestone8Concurrency.ts',
  'scripts/testPriorityAFoundation.ts',
  'scripts/testPriorityBCommerce.ts',
  'scripts/testPriorityCAutomation.ts',
  'scripts/testPriorityC2Lifecycle.ts',
  'scripts/testPriorityC3MarketingConsent.ts',
  'scripts/testPriorityC4Analytics.ts',
  'scripts/testPriorityDPwa.ts',
  'scripts/testPhase9SecurityPrivacy.ts',
  'scripts/testPhase9Performance.ts',
  'scripts/testPhase9BackupRecovery.ts',
  'scripts/testPhase9Monitoring.ts',
  'scripts/testPhase9Gate6.ts',
  'scripts/smokeTestStaging.ts',
];

console.log('========================================================================');
console.log('Running Full Regression Suite (Phase 6 + Phase 7 M1–M8)...');
console.log('========================================================================');

let totalPassed = 0;
let totalFailed = 0;

for (const file of testFiles) {
  try {
    console.log(`\n--- Running ${file} ---`);
    const output = execSync(`npx tsx ${file}`, { encoding: 'utf8', stdio: 'pipe' });
    console.log(output);
    // Count passed assertions in output
    const matches = output.match(/PASSED/g);
    if (matches) {
      totalPassed += matches.length;
    }
  } catch (err: any) {
    console.error(`FAILED: ${file}`);
    console.error(err.stdout || err.message);
    totalFailed++;
  }
}

console.log('========================================================================');
console.log(`Full Regression Results: ${totalPassed} PASSED, ${totalFailed} FAILED`);
console.log('========================================================================');
if (totalFailed > 0) {
  process.exit(1);
}
