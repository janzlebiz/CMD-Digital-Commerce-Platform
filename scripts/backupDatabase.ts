/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

export interface BackupOptions {
  outputDir?: string;
  encrypt?: boolean;
  encryptionKey?: string;
  db?: any;
}

export interface RestoreOptions {
  encryptionKey?: string;
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
}> {
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
  const encryptionKey = options.encryptionKey || process.env.BACKUP_ENCRYPTION_KEY || DEFAULT_SECRET;

  const dataPayload = shouldEncrypt
    ? encryptPayloadAES256GCM(payloadString, encryptionKey)
    : snapshotData;

  const finalOutput = {
    metadata: {
      timestamp: snapshotData.timestamp,
      version: snapshotData.version,
      checksum,
      recordCount: totalRecords,
      encrypted: shouldEncrypt,
      algorithm: shouldEncrypt ? 'aes-256-gcm' : 'none',
    },
    data: dataPayload,
  };

  fs.writeFileSync(backupPath, JSON.stringify(finalOutput, null, 2), 'utf8');

  console.log(`[Backup Database] Created backup at ${backupPath} (Records: ${totalRecords}, Checksum: ${checksum.substring(0, 12)}...)`);
  return { success: true, backupPath, checksum, recordCount: totalRecords, snapshotData };
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
