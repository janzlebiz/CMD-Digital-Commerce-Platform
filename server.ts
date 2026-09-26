/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, Express } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import crypto from 'crypto';
import { initializeApp, getApps, App as FirebaseAdminApp } from 'firebase-admin/app';
import { getAuth, Auth as FirebaseAuth } from 'firebase-admin/auth';
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore';
import { KeyManagementServiceClient } from '@google-cloud/kms';

// Initialize default Firebase Admin instance if uninitialized
let defaultAdminApp: FirebaseAdminApp | null = null;
if (getApps().length === 0) {
  defaultAdminApp = initializeApp({
    projectId: 'gen-lang-client-0427039673',
  });
}

// Authoritative Business Catalog & Tax Configuration (Phase 3 Model)
export const PRODUCTS_CATALOG: Record<string, { price: number; name: string; volume: string }> = {
  'hci-cmd-65ml': { price: 1200, name: 'HCI Cell Mineral Drops (CMD) — 65 mL Flagship Bottle', volume: '65 mL' },
  'hci-cmd-30ml': { price: 650, name: 'HCI Cell Mineral Drops (CMD) — 30 mL Compact Dropper', volume: '30 mL' },
};

export const SERVER_TAX_CONFIG = {
  isVatRegistered: false,
  vatRatePercent: 12,
  fixedShippingFee: 150,
  taxStatusDisclaimer: 'BUSINESS CONFIRMATION REQUIRED - PENDING REGULATORY PROOF',
};

export const KMS_KEY_NAME = 'projects/gen-lang-client-0427039673/locations/global/keyRings/hic-cmd-keyring/cryptoKeys/clinical-spi-key';

export interface AuthenticatedUser {
  uid: string;
  role: 'customer' | 'practitioner' | 'branch_manager' | 'regional_director' | 'super_admin';
  assignedBranchId?: string;
  email?: string;
}

export interface ServerDependencies {
  db?: Firestore;
  auth?: FirebaseAuth;
  kmsClient?: KeyManagementServiceClient;
}

/**
 * Creates the production-grade full-stack Express application adhering strictly
 * to the Phase 3 Security Model (Token Auth, Branch Isolation, Atomic Transactions,
 * Real KMS Envelope Encryption, and Zero Memory/KMS Fallbacks).
 */
export function createExpressApp(deps: ServerDependencies = {}): Express {
  const app = express();
  app.use(express.json());

  const db = deps.db || getFirestore('ai-studio-cmddigitalcommer-8d70f45b-1636-42ba-9e2d-f063a7b0e086');
  const auth = deps.auth || getAuth();
  const kmsClient = deps.kmsClient || new KeyManagementServiceClient();

  // --- STRICT TOKEN AUTHENTICATION (NO HEADER/BODY FALLBACKS) ---
  async function requireAuth(req: Request, res: Response): Promise<AuthenticatedUser | null> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication Required: Missing or invalid Bearer authorization token.' });
      return null;
    }

    const token = authHeader.split('Bearer ')[1].trim();
    if (!token) {
      res.status(401).json({ error: 'Authentication Required: Empty bearer token.' });
      return null;
    }

    let uid: string;
    let email: string | undefined;
    try {
      const decoded = await auth.verifyIdToken(token);
      uid = decoded.uid;
      email = decoded.email;
    } catch (err: any) {
      res.status(401).json({ error: `Authentication Failed: Invalid or expired Firebase ID token (${err.message}).` });
      return null;
    }

    // Authoritative user role retrieval directly from Firestore
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists) {
        return { uid, role: 'customer', email };
      }
      const data = userDoc.data();
      return {
        uid,
        role: (data?.role as any) || 'customer',
        assignedBranchId: data?.assignedBranchId,
        email: data?.email || email,
      };
    } catch (err: any) {
      res.status(500).json({ error: `Authorization Lookup Failed: Unable to verify user profile (${err.message}).` });
      return null;
    }
  }

  // --- PRACTITIONER-PATIENT ASSIGNMENT VERIFICATION ---
  async function verifyPractitionerAssignment(practitionerUid: string, patientUid: string): Promise<boolean> {
    try {
      const assignmentSnap = await db.collection('consultation_assignments').doc(`${practitionerUid}_${patientUid}`).get();
      if (assignmentSnap.exists) return true;

      const patientSnap = await db.collection('users').doc(patientUid).get();
      if (patientSnap.exists) {
        const patientData = patientSnap.data();
        if (patientData?.assignedPractitionerId === practitionerUid) {
          return true;
        }
      }
    } catch (err: any) {
      throw new Error(`Assignment verification failed: ${err.message}`);
    }
    return false;
  }

  // --- STRICT REAL KMS ENVELOPE ENCRYPTION (FAIL CLOSED) ---
  async function encryptClinicalPayload(payload: any): Promise<{ ciphertext: string; iv: string; tag: string; encryptedKey: string; keyId: string }> {
    let dek: Buffer | null = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);

    let encryptedKeyBase64: string;
    try {
      const [result] = await kmsClient.encrypt({
        name: KMS_KEY_NAME,
        plaintext: dek,
      });

      if (!result.ciphertext) {
        throw new Error('Cloud KMS returned empty ciphertext for DEK encryption.');
      }
      encryptedKeyBase64 = Buffer.from(result.ciphertext as Uint8Array).toString('base64');
    } catch (kmsErr: any) {
      // Zero out memory and fail closed immediately — absolutely no local secret or CBC fallbacks
      dek.fill(0);
      dek = null;
      throw new Error(`Cloud KMS Encryption Failure: ${kmsErr.message}`);
    }

    try {
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
    } finally {
      if (dek) {
        dek.fill(0);
        dek = null;
      }
    }
  }

  // --- STRICT REAL KMS ENVELOPE DECRYPTION (FAIL CLOSED) ---
  async function decryptClinicalPayload(
    ciphertext: string,
    ivBase64: string,
    tagBase64: string,
    encryptedKeyBase64: string
  ): Promise<any> {
    const iv = Buffer.from(ivBase64, 'base64');
    const tag = Buffer.from(tagBase64, 'base64');
    const encryptedKey = Buffer.from(encryptedKeyBase64, 'base64');

    let dek: Buffer | null = null;
    try {
      const [result] = await kmsClient.decrypt({
        name: KMS_KEY_NAME,
        ciphertext: encryptedKey,
      });

      if (!result.plaintext) {
        throw new Error('Cloud KMS returned empty plaintext for DEK decryption.');
      }
      dek = Buffer.from(result.plaintext as Uint8Array);
    } catch (kmsErr: any) {
      throw new Error(`Cloud KMS Decryption Failure: ${kmsErr.message}`);
    }

    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', dek, iv);
      decipher.setAuthTag(tag);

      let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
      plaintext += decipher.final('utf8');
      return JSON.parse(plaintext);
    } catch (decryptErr: any) {
      throw new Error(`Clinical Record Decryption Failed (Authentication Tag Mismatch or Corrupted Payload): ${decryptErr.message}`);
    } finally {
      if (dek) {
        dek.fill(0);
        dek = null;
      }
    }
  }

  // --- 1. POST /api/calculate-order ---
  app.post('/api/calculate-order', (req: Request, res: Response): void => {
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
          throw new Error(`Invalid SKU identifier: ${item.skuId}`);
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
    const user = await requireAuth(req, res);
    if (!user) return;

    try {
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

      if (!branchId) {
        res.status(400).json({ error: 'branchId parameter is required.' });
        return;
      }

      // Phase 3 Branch Isolation Check
      if (user.assignedBranchId && user.assignedBranchId !== branchId && user.role !== 'super_admin') {
        res.status(403).json({ error: `Branch Isolation Block: User is authorized only for branch '${user.assignedBranchId}'.` });
        return;
      }

      let subtotal = 0;
      const canonicalItems = items.map((item: any) => {
        const rateRef = PRODUCTS_CATALOG[item.skuId];
        if (!rateRef) {
          throw new Error(`Invalid SKU identifier: ${item.skuId}`);
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
      const orderId = `HCI-ORD-${Date.now().toString().slice(-6)}`;

      const orderRecord = {
        id: orderId,
        userId: user.uid,
        createdAt: FieldValue.serverTimestamp(),
        customer: customer || {},
        items: canonicalItems,
        shippingFee: fixedShippingFee,
        subtotal,
        vatAmount: 0,
        vatableSales: 0,
        nonVatSales: subtotal,
        total,
        isVatRegistered,
        taxStatusDisclaimer,
        paymentMethod: paymentMethod || 'cash_on_delivery',
        paymentStatus: 'pending_payment',
        fulfillmentStatus: 'pending_processing',
        branchId,
      };

      // Strict Transactional Inventory Check & Reservation (No in-memory fallback)
      await db.runTransaction(async (transaction) => {
        for (const item of items) {
          const invRef = db.collection('branch_inventory').doc(`${branchId}_${item.skuId}`);
          const invSnap = await transaction.get(invRef);

          if (!invSnap.exists) {
            throw new Error(`Missing Inventory Record: Inventory tracking document does not exist for SKU '${item.skuId}' at branch '${branchId}'. Order aborted.`);
          }

          const currentStock = invSnap.get('stockCount');
          if (typeof currentStock !== 'number' || currentStock < item.quantity) {
            throw new Error(`Insufficient Inventory Stock: Only ${currentStock ?? 0} units available for SKU '${item.skuId}'. Requested: ${item.quantity}. Order aborted.`);
          }

          transaction.update(invRef, {
            stockCount: currentStock - item.quantity,
            lastReplenishedAt: FieldValue.serverTimestamp(),
          });
        }

        const orderRef = db.collection('orders').doc(orderId);
        transaction.set(orderRef, orderRecord);
      });

      res.json({ orderId, success: true });
    } catch (err: any) {
      const isValidationError = err.message.includes('Inventory') || err.message.includes('Invalid SKU');
      res.status(isValidationError ? 400 : 500).json({ error: err.message });
    }
  });

  // --- 3. POST /api/clinical-intake/save ---
  app.post('/api/clinical-intake/save', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    try {
      const patientUid = req.body.patientUid || req.body.userId;
      const { clinicalIntake, consentRecord, scheduledAt, deliveryMode } = req.body;

      if (!patientUid) {
        res.status(400).json({ error: 'patientUid parameter is required.' });
        return;
      }

      if (!clinicalIntake) {
        res.status(400).json({ error: 'clinicalIntake payload is required.' });
        return;
      }

      // Role check: Only practitioners and super_admins can save clinical records
      if (user.role !== 'practitioner' && user.role !== 'super_admin') {
        res.status(403).json({ error: `Clinical Access Denied: User role '${user.role}' is not authorized to create clinical intakes.` });
        return;
      }

      // Practitioner-Patient Assignment Verification
      if (user.role === 'practitioner') {
        const isAssigned = await verifyPractitionerAssignment(user.uid, patientUid);
        if (!isAssigned) {
          res.status(403).json({ error: `Clinical Boundary Block: Practitioner '${user.uid}' is not assigned to patient '${patientUid}'.` });
          return;
        }
      }

      // Real Cloud KMS Envelope Encryption (Fails closed on any KMS error)
      const cryptRecord = await encryptClinicalPayload({
        dietaryHabits: clinicalIntake.dietaryHabits || '',
        waterConsumption: clinicalIntake.waterConsumption || '',
        declaredConditions: clinicalIntake.declaredConditions || '',
      });

      const intakeId = `CNS-INT-${Date.now().toString().slice(-6)}`;
      const secureRecord = {
        id: intakeId,
        userId: patientUid,
        practitionerId: user.uid,
        scheduledAt: scheduledAt || new Date().toISOString(),
        deliveryMode: deliveryMode || 'virtual',
        consentRecord: {
          purpose: consentRecord?.purpose || 'Wellness Evaluation',
          version: consentRecord?.version || 'v1.0',
          timestamp: FieldValue.serverTimestamp(),
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

      // Strict Firestore Persistence (Fails closed if write fails)
      await db.collection('consultation_intakes').doc(intakeId).set(secureRecord);

      res.json({ intakeId, success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- 4. POST /api/clinical-intake/fetch ---
  app.post('/api/clinical-intake/fetch', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    try {
      const { intakeId } = req.body;
      if (!intakeId) {
        res.status(400).json({ error: 'intakeId parameter is required.' });
        return;
      }

      // Fetch from Firestore
      const intakeSnap = await db.collection('consultation_intakes').doc(intakeId).get();
      if (!intakeSnap.exists) {
        res.status(404).json({ error: `Clinical record '${intakeId}' not found.` });
        return;
      }

      const record = intakeSnap.data();
      if (!record || !record.encryptedClinicalIntake) {
        res.status(404).json({ error: `Clinical record '${intakeId}' missing encrypted envelope payload.` });
        return;
      }

      // Phase 3 Authorization Matrix
      if (user.role === 'customer') {
        if (record.userId !== user.uid) {
          res.status(403).json({ error: 'Clinical Access Denied: Patients may only access their own consultation records.' });
          return;
        }
      } else if (user.role === 'practitioner') {
        const isAssigned = record.practitionerId === user.uid || (await verifyPractitionerAssignment(user.uid, record.userId));
        if (!isAssigned) {
          res.status(403).json({ error: `Clinical Boundary Block: Practitioner '${user.uid}' is not assigned to patient '${record.userId}'.` });
          return;
        }
      } else if (user.role !== 'super_admin') {
        res.status(403).json({ error: `Clinical Access Denied: User role '${user.role}' is not authorized to access clinical records.` });
        return;
      }

      // Strict Real KMS Envelope Decryption (Fails closed on error)
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

  return app;
}

// Start HTTP Server
async function startServer() {
  const app = createExpressApp();
  const PORT = process.env.PORT || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Mount Vite or Dist
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
    console.log(`HCI CMD Server listening on http://0.0.0.0:${PORT}`);
  });
}

const isDirectRun = Boolean(
  process.argv[1] &&
  (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js')) &&
  !process.env.TEST_MODE &&
  process.env.NODE_ENV !== 'test'
);

if (isDirectRun) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
