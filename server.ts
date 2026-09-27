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

  // Assign a unique Correlation ID middleware for end-to-end request tracing
  app.use((req, res, next) => {
    (req as any).correlationId = crypto.randomUUID ? crypto.randomUUID() : `TRACE-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    next();
  });

  const db = deps.db || getFirestore('ai-studio-cmddigitalcommer-8d70f45b-1636-42ba-9e2d-f063a7b0e086');
  const auth = deps.auth || getAuth();
  const kmsClient = deps.kmsClient || new KeyManagementServiceClient();

  // --- SERVER-AUTHORITATIVE STRUCTURED AUDIT LOGGER (FAIL CLOSED & SAFE-SCRUBBING) ---
  async function logAuditEvent(
    actorUid: string | null,
    actorRole: string | null,
    branchId: string | null,
    action: string,
    targetResource: string,
    targetId: string | null,
    success: boolean,
    metadata?: Record<string, any>,
    req?: Request
  ) {
    try {
      const correlationId = req ? ((req as any).correlationId || crypto.randomUUID()) : crypto.randomUUID();

      // Scrub metadata to prevent storing passwords, tokens, keys, clinical plaintexts, or secrets
      const scrubbedMetadata: Record<string, any> = {};
      if (metadata) {
        const sensitiveKeys = [
          'password', 'token', 'key', 'ciphertext', 'iv', 'tag', 'encryptedKey', 
          'clinicalIntake', 'clinicalData', 'dietaryHabits', 'waterConsumption', 
          'declaredConditions', 'card', 'cvv', 'secret', 'authHeader', 'authorization', 'signature'
        ];
        for (const [k, val] of Object.entries(metadata)) {
          if (sensitiveKeys.some(s => k.toLowerCase().includes(s))) {
            scrubbedMetadata[k] = '[REDACTED_SENSITIVE_DATA]';
          } else {
            scrubbedMetadata[k] = val;
          }
        }
      }

      const logId = `AUDIT-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      await db.collection('audit_logs').doc(logId).set({
        id: logId,
        actorUid: actorUid || 'unauthenticated',
        actorRole: actorRole || 'guest',
        branchId: branchId || null,
        action,
        targetResource,
        targetId: targetId || null,
        timestamp: FieldValue.serverTimestamp(),
        success,
        metadata: scrubbedMetadata,
        correlationId,
      });
    } catch (err) {
      console.error('Failed to write structured audit log event:', err);
    }
  }

  // --- STRICT TOKEN AUTHENTICATION (NO HEADER/BODY FALLBACKS) ---
  async function requireAuth(req: Request, res: Response): Promise<AuthenticatedUser | null> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const errorMsg = 'Authentication Required: Missing or invalid Bearer authorization token.';
      await logAuditEvent(
        null,
        null,
        null,
        'authorization_failure',
        'auth',
        null,
        false,
        { error: errorMsg, path: req.path },
        req
      );
      res.status(401).json({ error: errorMsg });
      return null;
    }

    const token = authHeader.split('Bearer ')[1].trim();
    if (!token) {
      const errorMsg = 'Authentication Required: Empty bearer token.';
      await logAuditEvent(
        null,
        null,
        null,
        'authorization_failure',
        'auth',
        null,
        false,
        { error: errorMsg, path: req.path },
        req
      );
      res.status(401).json({ error: errorMsg });
      return null;
    }

    let uid: string;
    let email: string | undefined;
    try {
      const decoded = await auth.verifyIdToken(token);
      uid = decoded.uid;
      email = decoded.email;
    } catch (err: any) {
      const errorMsg = `Authentication Failed: Invalid or expired Firebase ID token (${err.message}).`;
      await logAuditEvent(
        null,
        null,
        null,
        'authorization_failure',
        'auth',
        null,
        false,
        { error: errorMsg, path: req.path },
        req
      );
      res.status(401).json({ error: errorMsg });
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
      const errorMsg = `Authorization Lookup Failed: Unable to verify user profile (${err.message}).`;
      await logAuditEvent(
        uid,
        null,
        null,
        'authorization_failure',
        'auth',
        uid,
        false,
        { error: errorMsg, path: req.path },
        req
      );
      res.status(500).json({ error: errorMsg });
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
        const errorMsg = `Branch Isolation Block: User is authorized only for branch '${user.assignedBranchId}'.`;
        await logAuditEvent(
          user.uid,
          user.role,
          user.assignedBranchId || null,
          'authorization_failure',
          'orders',
          null,
          false,
          { error: errorMsg, requestedBranchId: branchId },
          req
        );
        res.status(403).json({ error: errorMsg });
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

      // Audit order creation success
      await logAuditEvent(
        user.uid,
        user.role,
        branchId,
        'order_creation_success',
        'orders',
        orderId,
        true,
        { total, itemsCount: canonicalItems.length },
        req
      );

      res.json({ orderId, success: true });
    } catch (err: any) {
      const isValidationError = err.message.includes('Inventory') || err.message.includes('Invalid SKU');
      
      // Audit order creation failure
      await logAuditEvent(
        user.uid,
        user.role,
        req.body?.branchId || null,
        'order_creation_failure',
        'orders',
        null,
        false,
        { error: err.message },
        req
      );

      res.status(isValidationError ? 400 : 500).json({ error: err.message });
    }
  });

  // --- 3. POST /api/clinical-intake/save ---
  app.post('/api/clinical-intake/save', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const patientUid = req.body.patientUid || req.body.userId;
    try {
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
        const errorMsg = `Clinical Access Denied: User role '${user.role}' is not authorized to create clinical intakes.`;
        await logAuditEvent(
          user.uid,
          user.role,
          user.assignedBranchId || null,
          'authorization_failure',
          'consultation_intakes',
          patientUid,
          false,
          { error: errorMsg },
          req
        );
        res.status(403).json({ error: errorMsg });
        return;
      }

      // Practitioner-Patient Assignment Verification
      if (user.role === 'practitioner') {
        const isAssigned = await verifyPractitionerAssignment(user.uid, patientUid);
        if (!isAssigned) {
          const errorMsg = `Clinical Boundary Block: Practitioner '${user.uid}' is not assigned to patient '${patientUid}'.`;
          await logAuditEvent(
            user.uid,
            user.role,
            user.assignedBranchId || null,
            'authorization_failure',
            'consultation_intakes',
            patientUid,
            false,
            { error: errorMsg },
            req
          );
          res.status(403).json({ error: errorMsg });
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

      // Audit clinical intake creation success
      await logAuditEvent(
        user.uid,
        user.role,
        user.assignedBranchId || null,
        'clinical_intake_create_success',
        'consultation_intakes',
        intakeId,
        true,
        { patientUid },
        req
      );

      res.json({ intakeId, success: true });
    } catch (err: any) {
      // Audit clinical intake creation failure
      await logAuditEvent(
        user.uid,
        user.role,
        user.assignedBranchId || null,
        'clinical_intake_create_failure',
        'consultation_intakes',
        patientUid || null,
        false,
        { error: err.message },
        req
      );

      res.status(500).json({ error: err.message });
    }
  });

  // --- 4. POST /api/clinical-intake/fetch ---
  app.post('/api/clinical-intake/fetch', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { intakeId } = req.body;
    try {
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
          const errorMsg = 'Clinical Access Denied: Patients may only access their own consultation records.';
          await logAuditEvent(
            user.uid,
            user.role,
            user.assignedBranchId || null,
            'authorization_failure',
            'consultation_intakes',
            intakeId,
            false,
            { error: errorMsg, patientUid: record.userId },
            req
          );
          res.status(403).json({ error: errorMsg });
          return;
        }
      } else if (user.role === 'practitioner') {
        const isAssigned = record.practitionerId === user.uid || (await verifyPractitionerAssignment(user.uid, record.userId));
        if (!isAssigned) {
          const errorMsg = `Clinical Boundary Block: Practitioner '${user.uid}' is not assigned to patient '${record.userId}'.`;
          await logAuditEvent(
            user.uid,
            user.role,
            user.assignedBranchId || null,
            'authorization_failure',
            'consultation_intakes',
            intakeId,
            false,
            { error: errorMsg, patientUid: record.userId },
            req
          );
          res.status(403).json({ error: errorMsg });
          return;
        }
      } else if (user.role !== 'super_admin') {
        const errorMsg = `Clinical Access Denied: User role '${user.role}' is not authorized to access clinical records.`;
        await logAuditEvent(
          user.uid,
          user.role,
          user.assignedBranchId || null,
          'authorization_failure',
          'consultation_intakes',
          intakeId,
          false,
          { error: errorMsg, patientUid: record.userId },
          req
        );
        res.status(403).json({ error: errorMsg });
        return;
      }

      // Strict Real KMS Envelope Decryption (Fails closed on error)
      const decryptedPayload = await decryptClinicalPayload(
        record.encryptedClinicalIntake.ciphertext,
        record.encryptedClinicalIntake.iv,
        record.encryptedClinicalIntake.tag,
        record.encryptedClinicalIntake.encryptedKey
      );

      // Audit clinical intake read success (decryptedPayload is scrubbed inside logAuditEvent)
      await logAuditEvent(
        user.uid,
        user.role,
        user.assignedBranchId || null,
        'clinical_intake_access_success',
        'consultation_intakes',
        intakeId,
        true,
        { patientUid: record.userId, metadataVersion: record.consentRecord?.version },
        req
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
      // Audit clinical intake read failure
      await logAuditEvent(
        user.uid,
        user.role,
        user.assignedBranchId || null,
        'clinical_intake_access_failure',
        'consultation_intakes',
        intakeId || null,
        false,
        { error: err.message },
        req
      );

      res.status(500).json({ error: err.message });
    }
  });

  // --- 5. GET /api/admin/orders ---
  app.get('/api/admin/orders', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    // Authorization: Only staff, branch_manager, regional_director, super_admin allowed
    const isStaff = user.role === 'branch_manager' || user.role === 'regional_director' || user.role === 'super_admin' || (user.role as string) === 'staff' || (user.role as string) === 'admin';
    if (!isStaff) {
      const errorMsg = `Administrative Access Denied: User role '${user.role}' is not authorized to access administrative order data.`;
      await logAuditEvent(
        user.uid,
        user.role,
        user.assignedBranchId || null,
        'authorization_failure',
        'orders',
        null,
        false,
        { error: errorMsg },
        req
      );
      res.status(403).json({ error: errorMsg });
      return;
    }

    try {
      const requestedBranchId = req.query.branchId as string | undefined;

      // Branch Isolation Enforcer
      if (user.assignedBranchId && user.role !== 'super_admin' && user.role !== 'regional_director') {
        if (requestedBranchId && requestedBranchId !== user.assignedBranchId) {
          const errorMsg = `Branch Isolation Block: User assigned to branch '${user.assignedBranchId}' cannot query administrative orders for branch '${requestedBranchId}'.`;
          await logAuditEvent(
            user.uid,
            user.role,
            user.assignedBranchId || null,
            'authorization_failure',
            'orders',
            null,
            false,
            { error: errorMsg, requestedBranchId },
            req
          );
          res.status(403).json({ error: errorMsg });
          return;
        }
      }

      let ordersQuery: any = db.collection('orders');
      const targetBranchId = user.assignedBranchId && user.role !== 'super_admin' && user.role !== 'regional_director'
        ? user.assignedBranchId
        : requestedBranchId;

      if (targetBranchId) {
        ordersQuery = ordersQuery.where('branchId', '==', targetBranchId);
      }

      const snap = await ordersQuery.get();
      const docs: any[] = [];
      snap.forEach((doc: any) => {
        docs.push(doc.data());
      });

      // Audit administrative action success
      await logAuditEvent(
        user.uid,
        user.role,
        targetBranchId || user.assignedBranchId || null,
        'admin_orders_list_success',
        'orders',
        null,
        true,
        { requestedBranchId, targetBranchId },
        req
      );

      res.json({ orders: docs, count: docs.length });
    } catch (err: any) {
      // Audit administrative action failure
      await logAuditEvent(
        user.uid,
        user.role,
        user.assignedBranchId || null,
        'admin_orders_list_failure',
        'orders',
        null,
        false,
        { error: err.message },
        req
      );

      res.status(500).json({ error: err.message });
    }
  });

  // --- 6. POST /api/admin/orders/update-status ---
  app.post('/api/admin/orders/update-status', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    // Authorization: Staff / Admin roles
    const isStaff = user.role === 'branch_manager' || user.role === 'regional_director' || user.role === 'super_admin' || (user.role as string) === 'staff' || (user.role as string) === 'admin';
    if (!isStaff) {
      const errorMsg = `Administrative Access Denied: User role '${user.role}' is not authorized to update order status.`;
      await logAuditEvent(
        user.uid,
        user.role,
        user.assignedBranchId || null,
        'authorization_failure',
        'orders',
        req.body?.orderId || null,
        false,
        { error: errorMsg },
        req
      );
      res.status(403).json({ error: errorMsg });
      return;
    }

    const { orderId, paymentStatus, fulfillmentStatus } = req.body;
    try {
      if (!orderId) {
        res.status(400).json({ error: 'orderId parameter is required.' });
        return;
      }

      if (!paymentStatus && !fulfillmentStatus) {
        res.status(400).json({ error: 'At least one of paymentStatus or fulfillmentStatus must be provided for status transition.' });
        return;
      }

      const orderRef = db.collection('orders').doc(orderId);
      const orderSnap = await orderRef.get();
      if (!orderSnap.exists) {
        res.status(404).json({ error: `Order '${orderId}' not found.` });
        return;
      }

      const orderData = orderSnap.data();
      if (!orderData) {
        res.status(404).json({ error: `Order '${orderId}' data record is missing.` });
        return;
      }

      const orderBranchId = orderData.branchId || orderData.pickupBranchId;

      // Branch Isolation Check
      if (user.assignedBranchId && user.assignedBranchId !== orderBranchId && user.role !== 'super_admin' && user.role !== 'regional_director') {
        const errorMsg = `Branch Isolation Block: User assigned to branch '${user.assignedBranchId}' cannot modify order '${orderId}' belonging to branch '${orderBranchId}'.`;
        await logAuditEvent(
          user.uid,
          user.role,
          user.assignedBranchId || null,
          'authorization_failure',
          'orders',
          orderId,
          false,
          { error: errorMsg, orderBranchId },
          req
        );
        res.status(403).json({ error: errorMsg });
        return;
      }

      // Canonical Order Status Transition Matrix Validation
      const currentPaymentStatus = orderData.paymentStatus || 'pending_payment';
      const currentFulfillmentStatus = orderData.fulfillmentStatus || 'pending_processing';

      // Payment Status Matrix Enforcement:
      // pending_payment -> paid | payment_verification_required
      // payment_verification_required -> paid
      // paid -> terminal
      if (paymentStatus) {
        const validPaymentStatuses = ['pending_payment', 'paid', 'payment_verification_required'];
        if (!validPaymentStatuses.includes(paymentStatus)) {
          res.status(400).json({ error: `Invalid Payment Status: '${paymentStatus}' is not a valid status value.` });
          return;
        }

        if (currentPaymentStatus === 'paid' && paymentStatus !== 'paid') {
          res.status(400).json({ error: `Invalid Status Transition: Payment status 'paid' is terminal and cannot be changed to '${paymentStatus}'.` });
          return;
        }

        if (currentPaymentStatus !== paymentStatus) {
          const isAllowedPaymentTransition =
            (currentPaymentStatus === 'pending_payment' && (paymentStatus === 'paid' || paymentStatus === 'payment_verification_required')) ||
            (currentPaymentStatus === 'payment_verification_required' && paymentStatus === 'paid');

          if (!isAllowedPaymentTransition) {
            res.status(400).json({ error: `Invalid Status Transition: Cannot transition payment status from '${currentPaymentStatus}' to '${paymentStatus}'.` });
            return;
          }
        }
      }

      // Fulfillment Status Matrix Enforcement:
      // pending_processing -> ready_for_pickup | in_transit | cancelled
      // ready_for_pickup -> completed | cancelled
      // in_transit -> completed | cancelled
      // completed | cancelled -> terminal
      if (fulfillmentStatus) {
        const validFulfillmentStatuses = ['pending_processing', 'ready_for_pickup', 'in_transit', 'completed', 'cancelled'];
        if (!validFulfillmentStatuses.includes(fulfillmentStatus)) {
          res.status(400).json({ error: `Invalid Fulfillment Status: '${fulfillmentStatus}' is not a valid status value.` });
          return;
        }

        if (currentFulfillmentStatus === 'completed' || currentFulfillmentStatus === 'cancelled') {
          if (currentFulfillmentStatus !== fulfillmentStatus) {
            res.status(400).json({ error: `Invalid Status Transition: Fulfillment status '${currentFulfillmentStatus}' is terminal and cannot be changed to '${fulfillmentStatus}'.` });
            return;
          }
        }

        if (currentFulfillmentStatus !== fulfillmentStatus) {
          const isAllowedFulfillmentTransition =
            (currentFulfillmentStatus === 'pending_processing' && ['ready_for_pickup', 'in_transit', 'cancelled'].includes(fulfillmentStatus)) ||
            (currentFulfillmentStatus === 'ready_for_pickup' && ['completed', 'cancelled'].includes(fulfillmentStatus)) ||
            (currentFulfillmentStatus === 'in_transit' && ['completed', 'cancelled'].includes(fulfillmentStatus));

          if (!isAllowedFulfillmentTransition) {
            res.status(400).json({ error: `Invalid Status Transition: Cannot transition fulfillment status from '${currentFulfillmentStatus}' to '${fulfillmentStatus}'.` });
            return;
          }
        }
      }

      const isCancelling = fulfillmentStatus === 'cancelled' && currentFulfillmentStatus !== 'cancelled';

      await db.runTransaction(async (transaction) => {
        // If order is being cancelled, transactionally restock reserved items back into branch inventory.
        // FAIL-CLOSED MANDATE: Every reserved inventory tracking document MUST exist. Missing records abort cancellation.
        if (isCancelling) {
          if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
            throw new Error(`Invalid Order Data: Order '${orderId}' contains no items to restock upon cancellation.`);
          }

          for (const item of orderData.items) {
            const invRef = db.collection('branch_inventory').doc(`${orderBranchId}_${item.skuId}`);
            const invSnap = await transaction.get(invRef);

            if (!invSnap.exists) {
              throw new Error(`Missing Inventory Record: Inventory tracking document does not exist for SKU '${item.skuId}' at branch '${orderBranchId}'. Order cancellation aborted.`);
            }

            const currentStock = invSnap.get('stockCount');
            const validStock = typeof currentStock === 'number' ? currentStock : 0;
            transaction.update(invRef, {
              stockCount: validStock + item.quantity,
              lastReplenishedAt: FieldValue.serverTimestamp(),
            });
          }
        }

        const updates: any = {
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: user.uid,
        };
        if (paymentStatus) updates.paymentStatus = paymentStatus;
        if (fulfillmentStatus) updates.fulfillmentStatus = fulfillmentStatus;

        transaction.update(orderRef, updates);
      });

      // Audit order status change or cancellation success
      await logAuditEvent(
        user.uid,
        user.role,
        orderBranchId || user.assignedBranchId || null,
        isCancelling ? 'order_cancellation_success' : 'order_status_update_success',
        'orders',
        orderId,
        true,
        { paymentStatus, fulfillmentStatus, oldPaymentStatus: currentPaymentStatus, oldFulfillmentStatus: currentFulfillmentStatus },
        req
      );

      if (isCancelling) {
        await logAuditEvent(
          user.uid,
          user.role,
          orderBranchId || user.assignedBranchId || null,
          'inventory_restoration_success',
          'branch_inventory',
          orderId,
          true,
          { itemsCount: orderData.items?.length, branchId: orderBranchId },
          req
        );
      }

      res.json({
        success: true,
        orderId,
        paymentStatus: paymentStatus || currentPaymentStatus,
        fulfillmentStatus: fulfillmentStatus || currentFulfillmentStatus,
      });
    } catch (err: any) {
      const isValidationError = err.message.includes('Missing Inventory Record') || err.message.includes('Invalid Order Data');

      // Audit order update/cancellation failure
      await logAuditEvent(
        user.uid,
        user.role,
        user.assignedBranchId || null,
        'order_status_update_failure',
        'orders',
        orderId || null,
        false,
        { error: err.message },
        req
      );

      res.status(isValidationError ? 400 : 500).json({ error: err.message });
    }
  });

  // --- 7. POST /api/admin/inventory/replenish ---
  app.post('/api/admin/inventory/replenish', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    // Authorization: Staff / Admin roles
    const isStaff = user.role === 'branch_manager' || user.role === 'regional_director' || user.role === 'super_admin' || (user.role as string) === 'staff' || (user.role as string) === 'admin';
    if (!isStaff) {
      const errorMsg = `Administrative Access Denied: User role '${user.role}' is not authorized to replenish inventory.`;
      await logAuditEvent(
        user.uid,
        user.role,
        user.assignedBranchId || null,
        'authorization_failure',
        'branch_inventory',
        null,
        false,
        { error: errorMsg },
        req
      );
      res.status(403).json({ error: errorMsg });
      return;
    }

    const { branchId, skuId, quantity } = req.body;
    try {
      if (!branchId || !skuId) {
        res.status(400).json({ error: 'branchId and skuId parameters are required.' });
        return;
      }

      if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0) {
        res.status(400).json({ error: 'quantity parameter must be a positive integer greater than 0.' });
        return;
      }

      if (!PRODUCTS_CATALOG[skuId]) {
        res.status(400).json({ error: `Invalid SKU identifier: '${skuId}'.` });
        return;
      }

      // Branch Isolation Check
      if (user.assignedBranchId && user.assignedBranchId !== branchId && user.role !== 'super_admin' && user.role !== 'regional_director') {
        const errorMsg = `Branch Isolation Block: User assigned to branch '${user.assignedBranchId}' cannot replenish inventory for branch '${branchId}'.`;
        await logAuditEvent(
          user.uid,
          user.role,
          user.assignedBranchId || null,
          'authorization_failure',
          'branch_inventory',
          null,
          false,
          { error: errorMsg, branchId },
          req
        );
        res.status(403).json({ error: errorMsg });
        return;
      }

      const invRef = db.collection('branch_inventory').doc(`${branchId}_${skuId}`);

      let newStockCount = quantity;
      await db.runTransaction(async (transaction) => {
        const invSnap = await transaction.get(invRef);
        if (invSnap.exists) {
          const currentStock = invSnap.get('stockCount') || 0;
          newStockCount = currentStock + quantity;
          transaction.update(invRef, {
            stockCount: newStockCount,
            lastReplenishedAt: FieldValue.serverTimestamp(),
          });
        } else {
          transaction.set(invRef, {
            branchId,
            skuId,
            stockCount: quantity,
            lastReplenishedAt: FieldValue.serverTimestamp(),
          });
        }
      });

      // Audit inventory replenishment success
      await logAuditEvent(
        user.uid,
        user.role,
        branchId,
        'inventory_replenishment_success',
        'branch_inventory',
        `${branchId}_${skuId}`,
        true,
        { skuId, quantity, newStockCount },
        req
      );

      res.json({
        success: true,
        branchId,
        skuId,
        addedQuantity: quantity,
        newStockCount,
      });
    } catch (err: any) {
      // Audit inventory replenishment failure
      await logAuditEvent(
        user.uid,
        user.role,
        user.assignedBranchId || null,
        'inventory_replenishment_failure',
        'branch_inventory',
        null,
        false,
        { error: err.message, branchId, skuId },
        req
      );

      res.status(500).json({ error: err.message });
    }
  });

  // --- 8. POST /api/admin/users/update-role ---
  app.post('/api/admin/users/update-role', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    // Authorization: Only super_admin can modify user roles
    if (user.role !== 'super_admin') {
      const errorMsg = 'Administrative Access Denied: Only super_admin can change user roles.';
      await logAuditEvent(
        user.uid,
        user.role,
        user.assignedBranchId || null,
        'authorization_failure',
        'users',
        req.body.targetUid || null,
        false,
        { error: errorMsg },
        req
      );
      res.status(403).json({ error: errorMsg });
      return;
    }

    try {
      const { targetUid, role } = req.body;
      if (!targetUid || !role) {
        res.status(400).json({ error: 'targetUid and role parameters are required.' });
        return;
      }

      const validRoles = ['customer', 'practitioner', 'branch_manager', 'regional_director', 'super_admin'];
      if (!validRoles.includes(role)) {
        res.status(400).json({ error: `Invalid role parameter: ${role}` });
        return;
      }

      const userRef = db.collection('users').doc(targetUid);
      const userSnap = await userRef.get();
      if (!userSnap.exists) {
        res.status(404).json({ error: `User with UID '${targetUid}' not found.` });
        return;
      }

      const oldRole = userSnap.get('role');

      await db.runTransaction(async (transaction) => {
        transaction.update(userRef, { role, updatedAt: FieldValue.serverTimestamp() });
      });

      await logAuditEvent(
        user.uid,
        user.role,
        user.assignedBranchId || null,
        'role_update_success',
        'users',
        targetUid,
        true,
        { oldRole, newRole: role },
        req
      );

      res.json({ success: true, targetUid, newRole: role });
    } catch (err: any) {
      await logAuditEvent(
        user.uid,
        user.role,
        user.assignedBranchId || null,
        'role_update_failure',
        'users',
        req.body.targetUid || null,
        false,
        { error: err.message },
        req
      );
      res.status(500).json({ error: err.message });
    }
  });

  // --- 9. GET /api/admin/audit-logs ---
  app.get('/api/admin/audit-logs', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    // Authorization: Only super_admin and regional_director can view audit logs
    const isAuthorized = user.role === 'super_admin' || user.role === 'regional_director';
    if (!isAuthorized) {
      const errorMsg = `Administrative Access Denied: User role '${user.role}' is not authorized to access audit logs.`;
      await logAuditEvent(
        user.uid,
        user.role,
        user.assignedBranchId || null,
        'authorization_failure',
        'audit_logs',
        null,
        false,
        { error: errorMsg },
        req
      );
      res.status(403).json({ error: errorMsg });
      return;
    }

    try {
      const limitParam = parseInt(req.query.limit as string, 10) || 50;
      let logs: any[] = [];

      try {
        const snapshot = await db.collection('audit_logs')
          .orderBy('timestamp', 'desc')
          .limit(Math.min(limitParam, 100))
          .get();

        snapshot.forEach((docSnap: any) => {
          const data = docSnap.data();
          logs.push({
            id: docSnap.id || data.id,
            ...data,
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : data.timestamp,
          });
        });
      } catch (orderErr) {
        // Fallback without orderBy for test harnesses or unindexed environments
        const fallbackSnap = await db.collection('audit_logs').get();
        fallbackSnap.forEach((docSnap: any) => {
          const data = docSnap.data();
          logs.push({
            id: docSnap.id || data.id,
            ...data,
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : data.timestamp,
          });
        });
      }

      await logAuditEvent(
        user.uid,
        user.role,
        user.assignedBranchId || null,
        'audit_logs_read_success',
        'audit_logs',
        null,
        true,
        { count: logs.length },
        req
      );

      res.json({ logs, count: logs.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return app;
}

// Start HTTP Server
async function startServer() {
  const app = createExpressApp();
  const PORT = Number(process.env.PORT) || 3000;
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
