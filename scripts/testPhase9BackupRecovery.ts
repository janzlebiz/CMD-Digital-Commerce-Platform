/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { performDatabaseBackup, restoreDatabaseBackup, decryptPayloadAES256GCM, verifyFirestorePitrConfiguration } from './backupDatabase.ts';

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

function createMockDatastore() {
  const collections = new Map<string, Map<string, any>>();
  return {
    collections,
    hasCollection: (name: string) => collections.has(name) && collections.get(name)!.size > 0,
    collection: (colName: string) => {
      if (!collections.has(colName)) {
        collections.set(colName, new Map<string, any>());
      }
      const store = collections.get(colName)!;
      return {
        doc: (docId: string) => ({
          id: docId,
          set: (data: any) => {
            store.set(docId, { id: docId, ...data });
          },
          get: async () => ({
            id: docId,
            exists: store.has(docId),
            data: () => store.get(docId),
          }),
        }),
        get: async () => ({
          docs: Array.from(store.entries()).map(([id, data]) => ({
            id,
            data: () => data,
          })),
        }),
      };
    },
  };
}

function createMockStorageClient() {
  const storageMap = new Map<string, Map<string, Buffer>>();
  return {
    bucket: (bucketName: string) => {
      if (!storageMap.has(bucketName)) storageMap.set(bucketName, new Map());
      const bucketStore = storageMap.get(bucketName)!;
      return {
        file: (destination: string) => ({
          save: async (content: Buffer) => {
            bucketStore.set(destination, content);
          },
          exists: async () => [bucketStore.has(destination)],
        }),
      };
    },
  };
}

async function runBackupRecoveryTests() {
  const testOutputDir = path.resolve(process.cwd(), 'backups-test');
  if (fs.existsSync(testOutputDir)) {
    fs.rmSync(testOutputDir, { recursive: true, force: true });
  }

  const testKey = 'SECRET_TEST_ENCRYPTION_KEY_0123456789_32BYTES!';
  const mockStorage = createMockStorageClient();

  // Populate authoritative source datastore
  const sourceDb = createMockDatastore();
  sourceDb.collection('users').doc('usr-01').set({ uid: 'usr-01', email: 'admin@hcicmd.ph', role: 'super_admin' });
  sourceDb.collection('inventory').doc('inv-01').set({ skuId: 'hci-cmd-65ml', availableQuantity: 150, branchId: 'daet' });
  sourceDb.collection('orders').doc('ord-01').set({ id: 'ord-01', grandTotal: 1200, paymentStatus: 'paid' });
  sourceDb.collection('audit_logs').doc('log-01').set({ action: 'order_placed', timestamp: new Date().toISOString() });

  // 1. Test backup creation & offsite dispatch
  console.log('\n--- Test Group 1: Automated Backup Generation, AES-256-GCM Encryption & Offsite Upload ---');
  const backupRes = await performDatabaseBackup({
    outputDir: testOutputDir,
    encrypt: true,
    encryptionKey: testKey,
    db: sourceDb,
    storageClient: mockStorage,
  });

  assert(backupRes.success === true && backupRes.recordCount === 4, '1.1 Backup execution completes successfully from authoritative datastore');
  assert(fs.existsSync(backupRes.backupPath), '1.2 Backup file exists on disk');

  const fileContent = fs.readFileSync(backupRes.backupPath, 'utf8');
  const parsedBackup = JSON.parse(fileContent);
  const isEncryptedGcm = parsedBackup.metadata.encrypted === true &&
    parsedBackup.metadata.algorithm === 'aes-256-gcm' &&
    !!parsedBackup.data.ciphertext &&
    !!parsedBackup.data.iv &&
    !!parsedBackup.data.authTag &&
    !parsedBackup.data.key;

  assert(isEncryptedGcm, '1.3 Backup contains AES-256-GCM ciphertext, IV, and authTag without storing encryption keys');
  assert(backupRes.offsiteResult.uploaded === true && backupRes.offsiteResult.objectVerified === true && backupRes.offsiteResult.offsitePath?.startsWith('gs://'), '1.4 Backup object successfully uploaded to GCS and verified in bucket');

  // 2. Test backup integrity & checksum verification
  console.log('\n--- Test Group 2: Backup Integrity & Checksum Verification ---');
  assert(typeof parsedBackup.metadata.checksum === 'string' && parsedBackup.metadata.checksum.length === 64, '2.1 Backup payload contains metadata and SHA-256 checksum');

  const decryptedRawPayload = decryptPayloadAES256GCM(parsedBackup.data, testKey);
  const decryptedSnapshot = JSON.parse(decryptedRawPayload);
  const recalculatedChecksum = crypto.createHash('sha256').update(JSON.stringify(decryptedSnapshot, null, 2)).digest('hex');

  assert(recalculatedChecksum === parsedBackup.metadata.checksum, '2.2 Stored SHA-256 checksum matches recalculated checksum of raw unencrypted snapshot');

  // 3. Test restore into isolated test environment & data integrity
  console.log('\n--- Test Group 3: Isolated Environment Restore & Data Integrity ---');
  const isolatedRestoreDb = createMockDatastore();
  const restoreRes = await restoreDatabaseBackup(backupRes.backupPath, isolatedRestoreDb, { encryptionKey: testKey });

  assert(restoreRes.success === true, '3.1 Restore execution succeeds into isolated test datastore');
  assert(restoreRes.snapshot.version === '1.0.0' && restoreRes.recordCount === backupRes.recordCount, '3.2 Restored data structure version and record counts match source');
  assert(isolatedRestoreDb.hasCollection('users') && isolatedRestoreDb.hasCollection('orders'), '3.3 Restored collections exist in isolated datastore');

  const isolatedOrderSnap = await isolatedRestoreDb.collection('orders').doc('ord-01').get();
  const isolatedUserSnap = await isolatedRestoreDb.collection('users').doc('usr-01').get();
  const dataIntegrityValid = isolatedOrderSnap.exists && isolatedOrderSnap.data().grandTotal === 1200 &&
    isolatedUserSnap.exists && isolatedUserSnap.data().email === 'admin@hcicmd.ph';

  assert(dataIntegrityValid, '3.4 Restored records in isolated datastore match source snapshot records exactly');

  // 4. Test failure handling, malformed/tampered backup rejection & production key fail-closed
  console.log('\n--- Test Group 4: Failure Handling, Tampered Backup Rejection & Production Key Enforcement ---');

  // Create tampered checksum backup
  const tamperedBackup = JSON.parse(JSON.stringify(parsedBackup));
  tamperedBackup.metadata.checksum = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const tamperedPath = path.join(testOutputDir, 'tampered-backup.json');
  fs.writeFileSync(tamperedPath, JSON.stringify(tamperedBackup, null, 2), 'utf8');

  let restoreFailedAsExpected = false;
  try {
    await restoreDatabaseBackup(tamperedPath, isolatedRestoreDb, { encryptionKey: testKey });
  } catch (err: any) {
    if (err.message.includes('BACKUP_CHECKSUM_MISMATCH')) {
      restoreFailedAsExpected = true;
    }
  }

  assert(restoreFailedAsExpected === true, '4.1 Tampered or corrupted backup correctly rejected by checksum validation');

  // Test production key enforcement (fails closed)
  const origNodeEnv = process.env.NODE_ENV;
  const origKey = process.env.BACKUP_ENCRYPTION_KEY;
  process.env.NODE_ENV = 'production';
  delete process.env.BACKUP_ENCRYPTION_KEY;

  let prodKeyFailedClosed = false;
  try {
    await performDatabaseBackup({ outputDir: testOutputDir, db: sourceDb, storageClient: mockStorage });
  } catch (err: any) {
    if (err.message.includes('BACKUP_ENCRYPTION_KEY_REQUIRED')) {
      prodKeyFailedClosed = true;
    }
  } finally {
    process.env.NODE_ENV = origNodeEnv;
    if (origKey) process.env.BACKUP_ENCRYPTION_KEY = origKey;
  }

  assert(prodKeyFailedClosed === true, '4.2 Backup fails closed in production environment when BACKUP_ENCRYPTION_KEY is missing');

  // 5. Test Firestore Point-In-Time Recovery (PITR) configuration verification
  console.log('\n--- Test Group 5: Firestore Point-In-Time Recovery (PITR) Verification ---');
  const pitrResult = await verifyFirestorePitrConfiguration();
  assert(pitrResult.pitrEnabled === true && pitrResult.retentionPeriodDays === 7, '5.1 Firestore PITR configuration verified as ENABLED with 7-day retention window');

  let pitrDisabledCaught = false;
  try {
    await verifyFirestorePitrConfiguration({
      customPitrConfig: { pointInTimeRecoveryEnablement: 'POINT_IN_TIME_RECOVERY_DISABLED' },
    });
  } catch (err: any) {
    if (err.message.includes('FIRESTORE_PITR_DISABLED')) {
      pitrDisabledCaught = true;
    }
  }

  assert(pitrDisabledCaught === true, '5.2 Disabled Firestore PITR configuration correctly rejected by verification script');

  // Cleanup test directories
  if (fs.existsSync(testOutputDir)) {
    fs.rmSync(testOutputDir, { recursive: true, force: true });
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
