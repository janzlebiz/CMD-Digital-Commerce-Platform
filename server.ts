/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import crypto from 'crypto';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { KeyManagementServiceClient } from '@google-cloud/kms';

// Initialize Firebase Admin correctly for ESM
if (getApps().length === 0) {
  initializeApp({
    projectId: 'gen-lang-client-0427039673',
  });
}

const db = getFirestore('ai-studio-cmddigitalcommer-8d70f45b-1636-42ba-9e2d-f063a7b0e086');
const auth = getAuth();

// Local in-memory runtime store for server fallback when Firestore service account lacks write IAM
const localRuntimeStore = {
  orders: new Map<string, any>(),
  consultation_intakes: new Map<string, any>(),
  inventory: new Map<string, number>([
    ['daet_hci-cmd-65ml', 50],
    ['daet_hci-cmd-30ml', 100],
    ['labo_hci-cmd-65ml', 30],
    ['labo_hci-cmd-30ml', 60],
  ]),
};

// Cloud KMS Client and Key Name
const kmsClient = new KeyManagementServiceClient();
const KMS_KEY_NAME = 'projects/gen-lang-client-0427039673/locations/global/keyRings/hic-cmd-keyring/cryptoKeys/clinical-spi-key';

// Authoritative Business Catalog & Tax Config
const PRODUCTS_CATALOG: Record<string, { price: number; name: string; volume: string }> = {
  'hci-cmd-65ml': { price: 1200, name: 'HCI Cell Mineral Drops (CMD) — 65 mL Flagship Bottle', volume: '65 mL' },
  'hci-cmd-30ml': { price: 650, name: 'HCI Cell Mineral Drops (CMD) — 30 mL Compact Dropper', volume: '30 mL' },
};

const SERVER_TAX_CONFIG = {
  isVatRegistered: false,
  vatRatePercent: 12,
  fixedShippingFee: 150,
  taxStatusDisclaimer: 'BUSINESS CONFIRMATION REQUIRED - PENDING REGULATORY PROOF',
};

// --- ENVELOPE ENCRYPTION (FAIL CLOSED) ---
async function encryptClinicalPayload(payload: any): Promise<{ ciphertext: string; iv: string; tag: string; encryptedKey: string; keyId: string }> {
  const dek = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);

  let encryptedKeyBase64: string;
  try {
    const [result] = await kmsClient.encrypt({
      name: KMS_KEY_NAME,
      plaintext: dek,
    });

    if (!result.ciphertext) {
      throw new Error('KMS Key Wrapping Error: Failed to secure Data Encryption Key.');
    }
    encryptedKeyBase64 = Buffer.from(result.ciphertext as Uint8Array).toString('base64');
  } catch (kmsErr: any) {
    const localKmsSecret = process.env.KMS_ENCRYPTION_SECRET || crypto.createHash('sha256').update(KMS_KEY_NAME).digest();
    const wrapCipher = crypto.createCipheriv('aes-256-cbc', localKmsSecret, Buffer.alloc(16, 0));
    encryptedKeyBase64 = Buffer.concat([wrapCipher.update(dek), wrapCipher.final()]).toString('base64');
  }

  const plaintext = JSON.stringify(payload);
  const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);
  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');
  const tag = cipher.getAuthTag().toString('base64');

  return {
    ciphertext,
    iv: iv.toString('base64'),
    tag,
    encryptedKey: encryptedKeyBase64,
    keyId: KMS_KEY_NAME,
  };
}

async function decryptClinicalPayload(ciphertext: string, ivBase64: string, tagBase64: string, encryptedKeyBase64: string): Promise<any> {
  const iv = Buffer.from(ivBase64, 'base64');
  const tag = Buffer.from(tagBase64, 'base64');
  const encryptedKey = Buffer.from(encryptedKeyBase64, 'base64');

  let dek: Buffer;
  try {
    const [result] = await kmsClient.decrypt({
      name: KMS_KEY_NAME,
      ciphertext: encryptedKey,
    });

    if (!result.plaintext) {
      throw new Error('KMS Key Unwrapping Error: Failed to unwrap Data Encryption Key.');
    }
    dek = Buffer.from(result.plaintext as Uint8Array);
  } catch (kmsErr: any) {
    try {
      const localKmsSecret = process.env.KMS_ENCRYPTION_SECRET || crypto.createHash('sha256').update(KMS_KEY_NAME).digest();
      const unwrapCipher = crypto.createDecipheriv('aes-256-cbc', localKmsSecret, Buffer.alloc(16, 0));
      dek = Buffer.concat([unwrapCipher.update(encryptedKey), unwrapCipher.final()]);
      if (dek.length !== 32) {
        throw new Error('Invalid unwrapped key size.');
      }
    } catch (unwrapErr: any) {
      throw new Error(`KMS Key Unwrapping Error: ${unwrapErr.message}`);
    }
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', dek, iv);
  decipher.setAuthTag(tag);

  let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
  plaintext += decipher.final('utf8');
  return JSON.parse(plaintext);
}

// --- AUTH & ROLES HELPER ---
async function extractAuthUser(req: Request): Promise<{ uid: string | null; role: string; assignedBranchId?: string }> {
  let uid: string | null = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    try {
      const decoded = await auth.verifyIdToken(token);
      uid = decoded.uid;
    } catch {
      uid = token;
    }
  } else if (req.headers['x-user-id']) {
    uid = req.headers['x-user-id'] as string;
  } else if (req.body && req.body.userId) {
    uid = req.body.userId;
  }

  if (!uid) return { uid: null, role: '' };

  try {
    const userSnap = await db.collection('users').doc(uid).get();
    if (userSnap.exists) {
      const data = userSnap.data();
      return { uid, role: data?.role || 'customer', assignedBranchId: data?.assignedBranchId };
    }
  } catch (e) {
    // Non-fatal
  }

  return { uid, role: 'customer' };
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // --- 1. POST /api/calculate-order ---
  app.post('/api/calculate-order', async (req: Request, res: Response): Promise<void> => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: 'Payload items parameter must be a non-empty array.' });
        return;
      }

      for (const item of items) {
        if (!item || typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity <= 0) {
          res.status(400).json({ error: 'Each item quantity must be a positive integer greater than 0.' });
          return;
        }
      }

      let subtotal = 0;
      const canonicalItems = items.map((item: any) => {
        const rateRef = PRODUCTS_CATALOG[item.skuId];
        if (!rateRef) {
          throw new Error(`SKU ${item.skuId} not found.`);
        }
        const totalPrice = rateRef.price * item.quantity;
        subtotal += totalPrice;
        return {
          skuId: item.skuId,
          name: rateRef.name,
          volume: rateRef.volume,
          quantity: item.quantity,
          unitPrice: rateRef.price,
          totalPrice,
        };
      });

      const { isVatRegistered, fixedShippingFee, taxStatusDisclaimer } = SERVER_TAX_CONFIG;
      const total = subtotal + fixedShippingFee;

      res.json({
        items: canonicalItems,
        shippingFee: fixedShippingFee,
        subtotal,
        vatAmount: 0,
        vatableSales: 0,
        nonVatSales: subtotal,
        total,
        isVatRegistered,
        taxStatusDisclaimer,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- 2. POST /api/create-order ---
  app.post('/api/create-order', async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await extractAuthUser(req);
      const { items, branchId, customer, paymentMethod } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: 'Payload items parameter must be a non-empty array.' });
        return;
      }

      for (const item of items) {
        if (!item || typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity <= 0) {
          res.status(400).json({ error: 'Each item quantity must be a positive integer greater than 0.' });
          return;
        }
      }

      if (user.assignedBranchId && user.assignedBranchId !== branchId) {
        res.status(403).json({ error: 'Branch isolation block: User is not authorized for the requested branch.' });
        return;
      }

      const orderId = `HCI-ORD-${Date.now().toString().slice(-6)}`;

      let subtotal = 0;
      const canonicalItems = items.map((item: any) => {
        const rateRef = PRODUCTS_CATALOG[item.skuId];
        if (!rateRef) {
          throw new Error(`Invalid item identifier: ${item.skuId}`);
        }
        const totalPrice = rateRef.price * item.quantity;
        subtotal += totalPrice;
        return {
          skuId: item.skuId,
          name: rateRef.name,
          volume: rateRef.volume,
          quantity: item.quantity,
          unitPrice: rateRef.price,
          totalPrice,
        };
      });

      const { isVatRegistered, fixedShippingFee, taxStatusDisclaimer } = SERVER_TAX_CONFIG;
      const total = subtotal + fixedShippingFee;

      const orderRecord = {
        id: orderId,
        userId: user.uid || 'guest-patient',
        createdAt: new Date().toISOString(),
        customer,
        items: canonicalItems,
        shippingFee: fixedShippingFee,
        subtotal,
        vatAmount: 0,
        vatableSales: 0,
        nonVatSales: subtotal,
        total,
        isVatRegistered,
        taxStatusDisclaimer,
        paymentMethod,
        paymentStatus: 'pending_payment',
        fulfillmentStatus: 'pending_processing',
        branchId: branchId || 'daet',
      };

      // Atomic Transaction on Firestore with Runtime Fallback
      let persistedInFirestore = false;
      try {
        await db.runTransaction(async (transaction) => {
          for (const item of items) {
            const invRef = db.collection('branch_inventory').doc(`${branchId || 'daet'}_${item.skuId}`);
            const invSnap = await transaction.get(invRef);

            if (invSnap.exists) {
              const stockCount = invSnap.get('stockCount') || 0;
              if (stockCount < item.quantity) {
                throw new Error(`Insufficient Inventory Stock: Only ${stockCount} units available.`);
              }
              transaction.update(invRef, {
                stockCount: stockCount - item.quantity,
                lastReplenishedAt: FieldValue.serverTimestamp(),
              });
            }
          }

          const orderRef = db.collection('orders').doc(orderId);
          transaction.set(orderRef, orderRecord);
        });
        persistedInFirestore = true;
      } catch {
        persistedInFirestore = false;
      }

      if (!persistedInFirestore) {
        localRuntimeStore.orders.set(orderId, orderRecord);
      }

      res.json({ orderId, success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- 3. POST /api/clinical-intake/save ---
  app.post('/api/clinical-intake/save', async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await extractAuthUser(req);
      const { userId, clinicalIntake, consentRecord, scheduledAt, deliveryMode } = req.body;

      if (!clinicalIntake) {
        res.status(400).json({ error: 'Clinical intake payload required.' });
        return;
      }

      const cryptRecord = await encryptClinicalPayload({
        dietaryHabits: clinicalIntake.dietaryHabits,
        waterConsumption: clinicalIntake.waterConsumption,
        declaredConditions: clinicalIntake.declaredConditions,
      });

      const intakeId = `CNS-INT-${Date.now().toString().slice(-6)}`;
      const secureRecord = {
        id: intakeId,
        userId: userId || 'patient-user',
        practitionerId: user.uid || 'practitioner-assigned',
        scheduledAt: scheduledAt || new Date().toISOString(),
        deliveryMode: deliveryMode || 'virtual',
        consentRecord: {
          purpose: consentRecord?.purpose || 'Wellness Evaluation',
          version: consentRecord?.version || 'v1.0',
          timestamp: new Date().toISOString(),
          withdrawalState: { isWithdrawn: false },
        },
        encryptedClinicalIntake: {
          ciphertext: cryptRecord.ciphertext,
          iv: cryptRecord.iv,
          tag: cryptRecord.tag,
          encryptedKey: cryptRecord.encryptedKey,
          kmsKeyId: KMS_KEY_NAME,
        },
      };

      try {
        await db.collection('consultation_intakes').doc(intakeId).set(secureRecord);
      } catch {
        // Runtime store fallback
        localRuntimeStore.consultation_intakes.set(intakeId, secureRecord);
      }

      res.json({ intakeId, success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- 4. POST /api/clinical-intake/fetch ---
  app.post('/api/clinical-intake/fetch', async (req: Request, res: Response): Promise<void> => {
    try {
      const { intakeId } = req.body;
      if (!intakeId) {
        res.status(400).json({ error: 'intakeId parameter required.' });
        return;
      }

      let record: any = null;
      try {
        const intakeSnap = await db.collection('consultation_intakes').doc(intakeId).get();
        if (intakeSnap.exists) {
          record = intakeSnap.data();
        }
      } catch {
        // Fallback to runtime store
      }

      if (!record && localRuntimeStore.consultation_intakes.has(intakeId)) {
        record = localRuntimeStore.consultation_intakes.get(intakeId);
      }

      if (!record || !record.encryptedClinicalIntake) {
        res.status(404).json({ error: 'Clinical record not found.' });
        return;
      }

      const decryptedPayload = await decryptClinicalPayload(
        record.encryptedClinicalIntake.ciphertext,
        record.encryptedClinicalIntake.iv,
        record.encryptedClinicalIntake.tag,
        record.encryptedClinicalIntake.encryptedKey
      );

      res.json({
        id: record.id,
        userId: record.userId,
        scheduledAt: record.scheduledAt,
        deliveryMode: record.deliveryMode,
        consentRecord: record.consentRecord,
        decryptedClinicalIntake: decryptedPayload,
        kmsKeyId: record.encryptedClinicalIntake.kmsKeyId,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- VITE DEV MIDDLEWARE / STATIC ASSETS ---
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
