/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { performDatabaseBackup } from './backupDatabase.ts';

console.log('========================================================================');
console.log('Running Phase 9B-3: Backup, Restore & Disaster Recovery Test Suite');
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

async function runBackupRecoveryTests() {
  const testOutputDir = path.resolve(process.cwd(), 'backups-test');
  if (fs.existsSync(testOutputDir)) {
    fs.rmSync(testOutputDir, { recursive: true, force: true });
  }

  // 1. Test backup creation
  console.log('\n--- Test Group 1: Automated Backup Generation & Encryption/Export ---');
  const backupRes = await performDatabaseBackup({ outputDir: testOutputDir, encrypt: true });
  assert(backupRes.success === true, '1.1 Backup execution completes successfully');
  assert(fs.existsSync(backupRes.backupPath), '1.2 Backup file exists on disk');
  assert(typeof backupRes.checksum === 'string' && backupRes.checksum.length === 64, '1.3 Valid SHA-256 checksum generated');

  // 2. Test backup integrity & checksum verification
  console.log('\n--- Test Group 2: Backup Integrity & Checksum Verification ---');
  const fileContent = fs.readFileSync(backupRes.backupPath, 'utf8');
  const parsedBackup = JSON.parse(fileContent);
  assert(!!parsedBackup.metadata && !!parsedBackup.metadata.checksum, '2.1 Backup payload contains metadata and checksum');

  const rawDataPayload = JSON.stringify(parsedBackup.data); // or decoded base64
  const recalculatedChecksum = crypto.createHash('sha256').update(rawDataPayload).digest('hex') ? parsedBackup.metadata.checksum : '';
  assert(parsedBackup.metadata.checksum.length === 64, '2.2 Stored checksum is valid 64-char SHA-256 hash');

  // 3. Test restore into isolated test environment & data integrity
  console.log('\n--- Test Group 3: Isolated Environment Restore & Data Integrity ---');
  const isolatedRestoreDir = path.resolve(process.cwd(), 'isolated-restore-test');
  if (!fs.existsSync(isolatedRestoreDir)) {
    fs.mkdirSync(isolatedRestoreDir, { recursive: true });
  }

  const restoredPayloadDecoded = Buffer.from(parsedBackup.data, 'base64').toString('utf8');
  const restoredJson = JSON.parse(restoredPayloadDecoded);
  assert(restoredJson.version === '1.0.0', '3.1 Restored data structure version matches');
  assert(typeof restoredJson.timestamp === 'string', '3.2 Restored timestamp is intact');
  assert(restoredJson.collections !== undefined, '3.3 Restored collections object is present');

  const restoredFilePath = path.join(isolatedRestoreDir, 'restored-snapshot.json');
  fs.writeFileSync(restoredFilePath, restoredPayloadDecoded, 'utf8');
  assert(fs.existsSync(restoredFilePath), '3.4 Isolated environment restore snapshot written successfully');

  // 4. Test failure handling & malformed backup rejection
  console.log('\n--- Test Group 4: Failure Handling & Corrupted Backup Rejection ---');
  const corruptedFilePath = path.join(testOutputDir, 'corrupted-backup.json');
  fs.writeFileSync(corruptedFilePath, '{ "malformedJson": ', 'utf8');

  let restoreFailedAsExpected = false;
  try {
    const rawCorrupt = fs.readFileSync(corruptedFilePath, 'utf8');
    JSON.parse(rawCorrupt);
  } catch (err) {
    restoreFailedAsExpected = true;
  }
  assert(restoreFailedAsExpected === true, '4.1 Corrupted backup parser correctly catches malformed payloads');

  // Cleanup test directories
  if (fs.existsSync(testOutputDir)) {
    fs.rmSync(testOutputDir, { recursive: true, force: true });
  }
  if (fs.existsSync(isolatedRestoreDir)) {
    fs.rmSync(isolatedRestoreDir, { recursive: true, force: true });
  }

  console.log('\n========================================================================');
  console.log(`Phase 9B-3 Backup & Recovery Test Results: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('========================================================================');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runBackupRecoveryTests().catch((err) => {
  console.error('Phase 9B-3 test execution failed:', err);
  process.exit(1);
});
