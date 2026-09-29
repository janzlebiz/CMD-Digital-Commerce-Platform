/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { Storage } from '@google-cloud/storage';
import { GoogleAuth } from 'google-auth-library';

export async function getGoogleAccessToken(): Promise<string | null> {
  try {
    const auth = new GoogleAuth({
      scopes: [
        'https://www.googleapis.com/auth/datastore',
        'https://www.googleapis.com/auth/cloud-platform',
      ],
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    return tokenResponse.token || null;
  } catch (err: any) {
    console.warn(`[GoogleAuth] ADC token lookup warning: ${err.message}`);
    return null;
  }
}

export interface BackupOptions {
  outputDir?: string;
  encrypt?: boolean;
  encryptionKey?: string;
  db?: any;
  uploadOffsite?: boolean;
  offsiteBucket?: string;
  storageClient?: any;
}

export interface RestoreOptions {
  encryptionKey?: string;
}

export interface OffsiteUploadResult {
  uploaded: boolean;
  offsitePath?: string;
  provider?: string;
  error?: string;
  objectVerified?: boolean;
}

export interface PitrVerificationResult {
  pitrEnabled: boolean;
  retentionPeriodDays: number;
  databaseId: string;
  projectId: string;
  verifiedAt: string;
  rawConfig: any;
}

export const AUTHORITATIVE_COLLECTIONS = [
  'users',
  'inventory',
  'product_batches',
  'branch_batch_inventory',
  'orders',
  'audit_logs',
  'marketing_consents',
  'support_tickets',
  'consultation_appointments',
  'refund_intents',
];

const DEFAULT_SECRET = 'DEFAULT_BACKUP_ENCRYPTION_KEY_32BYTES_LONG_0123456789';

function deriveKey(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptPayloadAES256GCM(plainText: string, secretKey: string): { ciphertext: string; iv: string; authTag: string } {
  const key = deriveKey(secretKey);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return {
    ciphertext: encrypted,
    iv: iv.toString('hex'),
    authTag,
  };
}

export function decryptPayloadAES256GCM(encryptedData: { ciphertext: string; iv: string; authTag: string }, secretKey: string): string {
  const key = deriveKey(secretKey);
  const iv = Buffer.from(encryptedData.iv, 'hex');
  const authTag = Buffer.from(encryptedData.authTag, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedData.ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function uploadToOffsiteStorage(
  localBackupPath: string,
  backupFilename: string,
  options: { offsiteBucket?: string; provider?: string; storageClient?: any } = {}
): Promise<OffsiteUploadResult> {
  const bucketName = options.offsiteBucket || process.env.BACKUP_OFFSITE_STORAGE_BUCKET || process.env.GCS_BUCKET || 'hci-cmd-backups-offsite-asia';
  const provider = options.provider || process.env.BACKUP_OFFSITE_PROVIDER || 'gcs';

  if (!fs.existsSync(localBackupPath)) {
    return { uploaded: false, error: `Local backup file not found: ${localBackupPath}` };
  }

  const destination = `backups/${backupFilename}`;
  const offsitePath = `gs://${bucketName}/${destination}`;

  try {
    const storage = options.storageClient || new Storage({
      projectId: 'ai-studio-cmddigitalcommer-8d70f45b-1636-42ba-9e2d-f063a7b0e086',
    });

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(destination);

    // Save object content to GCS
    const fileContent = fs.readFileSync(localBackupPath);
    await file.save(fileContent, {
      metadata: {
        contentType: 'application/json',
        metadata: {
          uploadedAt: new Date().toISOString(),
          source: 'hci-cmd-backup-utility',
        },
      },
    });

    // Strictly verify uploaded object actually exists in GCS bucket (no silent error catch fallback)
    const [exists] = await file.exists();

    if (!exists) {
      return {
        uploaded: false,
        offsitePath,
        provider,
        objectVerified: false,
        error: 'GCS_OBJECT_VERIFICATION_FAILED: Uploaded object not found in GCS bucket after upload attempt',
      };
    }

    console.log(`[Backup Off-Site] Successfully uploaded and verified backup object at ${offsitePath}`);
    return {
      uploaded: true,
      offsitePath,
      provider,
      objectVerified: true,
    };
  } catch (err: any) {
    console.warn(`[Backup Off-Site] GCS upload failed: ${err.message}`);
    return {
      uploaded: false,
      offsitePath,
      provider,
      objectVerified: false,
      error: `GCS_UPLOAD_FAILED: ${err.message}`,
    };
  }
}

export async function verifyFirestorePitrConfiguration(options: {
  projectId?: string;
  databaseId?: string;
  customPitrConfig?: any;
  fetchHandler?: (url: string) => Promise<any>;
} = {}): Promise<PitrVerificationResult> {
  const projectId = options.projectId || 'ai-studio-cmddigitalcommer-8d70f45b-1636-42ba-9e2d-f063a7b0e086';
  const databaseId = options.databaseId || '(default)';

  let rawConfig = options.customPitrConfig;

  if (!rawConfig) {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}`;
    try {
      if (options.fetchHandler) {
        rawConfig = await options.fetchHandler(url);
      } else {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        const token = await getGoogleAccessToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(url, { headers });
        if (res.ok) {
          rawConfig = await res.json();
        } else {
          throw new Error(`HTTP_${res.status}: ${res.statusText}`);
        }
      }
    } catch (err: any) {
      throw new Error(`FIRESTORE_PITR_QUERY_FAILED: Unable to query Firestore database configuration (${err.message})`);
    }
  }

  if (!rawConfig) {
    throw new Error(`FIRESTORE_PITR_QUERY_FAILED: Unable to retrieve Firestore database configuration for ${projectId}/${databaseId}. Failed closed.`);
  }

  const isEnabled = rawConfig.pointInTimeRecoveryEnablement === 'POINT_IN_TIME_RECOVERY_ENABLED' ||
    rawConfig.pitrEnabled === true;

  let retentionDays = 0;
  if (rawConfig.pitrRetentionPeriod) {
    const seconds = parseInt(rawConfig.pitrRetentionPeriod, 10);
    if (!isNaN(seconds)) retentionDays = Math.round(seconds / 86400);
  } else if (typeof rawConfig.retentionPeriodDays === 'number') {
    retentionDays = rawConfig.retentionPeriodDays;
  } else if (rawConfig.versionRetentionPeriod === '7d' || rawConfig.versionRetentionPeriod === '604800s') {
    retentionDays = 7;
  }

  if (!isEnabled) {
    throw new Error(`FIRESTORE_PITR_DISABLED: Point-In-Time Recovery is not enabled on database ${projectId}/${databaseId}.`);
  }

  if (retentionDays < 7) {
    throw new Error(`FIRESTORE_PITR_INVALID_RETENTION: PITR retention period is ${retentionDays} days, required 7 days (604800s).`);
  }

  const result: PitrVerificationResult = {
    pitrEnabled: isEnabled,
    retentionPeriodDays: retentionDays,
    databaseId,
    projectId,
    verifiedAt: new Date().toISOString(),
    rawConfig,
  };

  console.log(`[Firestore PITR Verified] Database ${projectId}/${databaseId}: PITR Enabled (${isEnabled}), Retention: ${retentionDays} days`);
  return result;
}

export interface GcsLifecycleVerificationResult {
  bucketName: string;
  lifecycleVerified: boolean;
  expirationAgeDays: number;
  rules: any[];
}

export async function verifyGcsBucketLifecyclePolicy(options: {
  bucketName?: string;
  storageClient?: any;
  customLifecycleConfig?: any;
} = {}): Promise<GcsLifecycleVerificationResult> {
  const bucketName = options.bucketName || process.env.BACKUP_OFFSITE_STORAGE_BUCKET || 'hci-cmd-backups-offsite-asia';

  let lifecycleRules: any[] | null = null;

  if (options.customLifecycleConfig !== undefined) {
    lifecycleRules = options.customLifecycleConfig;
  } else {
    try {
      const storage = options.storageClient || new Storage({
        projectId: 'ai-studio-cmddigitalcommer-8d70f45b-1636-42ba-9e2d-f063a7b0e086',
      });
      const [metadata] = await storage.bucket(bucketName).getMetadata();
      lifecycleRules = metadata.lifecycle?.rule || [];
    } catch (err: any) {
      throw new Error(`GCS_LIFECYCLE_QUERY_FAILED: Failed to query GCS bucket lifecycle metadata for ${bucketName} (${err.message}). Failed closed.`);
    }
  }

  if (!Array.isArray(lifecycleRules)) {
    throw new Error(`GCS_LIFECYCLE_QUERY_FAILED: Invalid or missing lifecycle rule metadata for bucket ${bucketName}. Failed closed.`);
  }

  const has30DayExpirationRule = lifecycleRules.some((rule: any) => {
    const isDelete = rule.action?.type === 'Delete';
    const is30Days = rule.condition?.age === 30;
    return isDelete && is30Days;
  });

  if (!has30DayExpirationRule) {
    throw new Error(`GCS_LIFECYCLE_RULE_MISSING: Bucket ${bucketName} is missing required 30-day lifecycle expiration rule.`);
  }

  console.log(`[GCS Lifecycle Verified] Bucket ${bucketName}: 30-day object expiration lifecycle rule verified.`);
  return {
    bucketName,
    lifecycleVerified: true,
    expirationAgeDays: 30,
    rules: lifecycleRules,
  };
}

function getAuthoritativeDb(optionsDb?: any) {
  if (optionsDb) return optionsDb;

  if (getApps().length === 0) {
    initializeApp({
      projectId: 'ai-studio-cmddigitalcommer-8d70f45b-1636-42ba-9e2d-f063a7b0e086',
    });
  }
  return getFirestore('ai-studio-cmddigitalcommer-8d70f45b-1636-42ba-9e2d-f063a7b0e086');
}

export async function performDatabaseBackup(options: BackupOptions = {}): Promise<{
  success: boolean;
  backupPath: string;
  checksum: string;
  recordCount: number;
  snapshotData: any;
  offsiteResult: OffsiteUploadResult;
}> {
  const isProduction = process.env.NODE_ENV === 'production';
  const encryptionKey = options.encryptionKey || process.env.BACKUP_ENCRYPTION_KEY;

  if (isProduction && !encryptionKey) {
    throw new Error('BACKUP_ENCRYPTION_KEY_REQUIRED: BACKUP_ENCRYPTION_KEY environment variable is required in production environment.');
  }

  const effectiveKey = encryptionKey || DEFAULT_SECRET;

  const outputDir = options.outputDir || path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const db = getAuthoritativeDb(options.db);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `backup-${timestamp}.json`;
  const backupPath = path.join(outputDir, backupFilename);

  const snapshotData: {
    version: string;
    timestamp: string;
    environment: string;
    collections: Record<string, any[]>;
  } = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    collections: {},
  };

  let totalRecords = 0;

  for (const colName of AUTHORITATIVE_COLLECTIONS) {
    snapshotData.collections[colName] = [];
    try {
      const colRef = db.collection(colName);
      const snap = await colRef.get();
      if (snap && snap.docs) {
        snap.docs.forEach((docSnap: any) => {
          const data = typeof docSnap.data === 'function' ? docSnap.data() : docSnap.data;
          const id = docSnap.id || data?.id;
          snapshotData.collections[colName].push({ id, ...data });
          totalRecords++;
        });
      }
    } catch {
      // Collection may be empty or not yet seeded
    }
  }

  const payloadString = JSON.stringify(snapshotData, null, 2);
  const checksum = crypto.createHash('sha256').update(payloadString).digest('hex');

  const shouldEncrypt = options.encrypt ?? true;

  const dataPayload = shouldEncrypt
    ? encryptPayloadAES256GCM(payloadString, effectiveKey)
    : snapshotData;

  const finalOutput = {
    metadata: {
      timestamp: snapshotData.timestamp,
      version: snapshotData.version,
      checksum,
      recordCount: totalRecords,
      encrypted: shouldEncrypt,
      algorithm: shouldEncrypt ? 'aes-256-gcm' : 'none',
      offsitePath: null as string | null,
    },
    data: dataPayload,
  };

  fs.writeFileSync(backupPath, JSON.stringify(finalOutput, null, 2), 'utf8');

  let offsiteResult: OffsiteUploadResult = { uploaded: false };
  if (options.uploadOffsite !== false) {
    offsiteResult = await uploadToOffsiteStorage(backupPath, backupFilename, {
      offsiteBucket: options.offsiteBucket,
      storageClient: options.storageClient,
    });
    if (offsiteResult.uploaded && offsiteResult.offsitePath) {
      finalOutput.metadata.offsitePath = offsiteResult.offsitePath;
      fs.writeFileSync(backupPath, JSON.stringify(finalOutput, null, 2), 'utf8');
    }
  }

  console.log(`[Backup Database] Created backup at ${backupPath} (Records: ${totalRecords}, Checksum: ${checksum.substring(0, 12)}...)`);
  return { success: true, backupPath, checksum, recordCount: totalRecords, snapshotData, offsiteResult };
}

export async function restoreDatabaseBackup(
  backupPath: string,
  restoreDb: any,
  options: RestoreOptions = {}
): Promise<{ success: boolean; snapshot: any; recordCount: number }> {
  if (!fs.existsSync(backupPath)) {
    throw new Error(`BACKUP_FILE_NOT_FOUND: ${backupPath}`);
  }

  const raw = fs.readFileSync(backupPath, 'utf8');
  let parsedBackup: any;
  try {
    parsedBackup = JSON.parse(raw);
  } catch {
    throw new Error('MALFORMED_BACKUP_FILE: Invalid JSON payload');
  }

  if (!parsedBackup || !parsedBackup.metadata || !parsedBackup.data) {
    throw new Error('MALFORMED_BACKUP_FILE: Missing metadata or data structure');
  }

  let unencryptedPayloadString: string;
  const encryptionKey = options.encryptionKey || process.env.BACKUP_ENCRYPTION_KEY || DEFAULT_SECRET;

  if (parsedBackup.metadata.encrypted) {
    try {
      unencryptedPayloadString = decryptPayloadAES256GCM(parsedBackup.data, encryptionKey);
    } catch (err: any) {
      throw new Error(`DECRYPTION_FAILED: Invalid key or corrupted ciphertext (${err.message})`);
    }
  } else {
    unencryptedPayloadString = JSON.stringify(parsedBackup.data, null, 2);
  }

  const snapshot = JSON.parse(unencryptedPayloadString);
  const recalculatedChecksum = crypto.createHash('sha256').update(JSON.stringify(snapshot, null, 2)).digest('hex');

  if (recalculatedChecksum !== parsedBackup.metadata.checksum) {
    throw new Error(`BACKUP_CHECKSUM_MISMATCH: Stored checksum (${parsedBackup.metadata.checksum}) does not match recalculated checksum (${recalculatedChecksum}). Backup file is corrupted or tampered.`);
  }

  let recordCount = 0;
  if (snapshot.collections && restoreDb) {
    for (const [colName, docs] of Object.entries<any[]>(snapshot.collections)) {
      if (!Array.isArray(docs)) continue;
      const targetCol = restoreDb.collection(colName);
      for (const item of docs) {
        const docId = item.id || item.uid || item.batchId || item.orderId || `item-${recordCount}`;
        targetCol.doc(docId).set(item);
        recordCount++;
      }
    }
  }

  return { success: true, snapshot, recordCount };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  performDatabaseBackup().catch((err) => {
    console.error('Backup failed:', err);
    process.exit(1);
  });
}
