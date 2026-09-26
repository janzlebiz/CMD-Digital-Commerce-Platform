/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { KeyManagementServiceClient } from '@google-cloud/kms';
import { getFirestore, FieldValue, Transaction } from 'firebase-admin/firestore';

admin.initializeApp();
const db = getFirestore();

// Real Cloud KMS Client Initialization
const kmsClient = new KeyManagementServiceClient();
const KMS_KEY_NAME = 'projects/gen-lang-client-0427039673/locations/global/keyRings/hic-cmd-keyring/cryptoKeys/clinical-spi-key';

// Authoritative Business Constants (Server-Authoritative)
const PRODUCTS_CATALOG: Record<string, { price: number; name: string; volume: string }> = {
  'hci-cmd-65ml': { price: 1200, name: 'HCI Cell Mineral Drops (CMD) — 65 mL Flagship Bottle', volume: '65 mL' },
  'hci-cmd-30ml': { price: 650, name: 'HCI Cell Mineral Drops (CMD) — 30 mL Compact Dropper', volume: '30 mL' },
};

// Server-Authoritative Tax Configuration
const SERVER_TAX_CONFIG = {
  isVatRegistered: false, // Output VAT (0% Non-VAT Treatment)
  vatRatePercent: 12,
  fixedShippingFee: 150,
  taxStatusDisclaimer: 'BUSINESS CONFIRMATION REQUIRED - PENDING REGULATORY PROOF',
};

// --- REAL GOOGLE CLOUD KMS + AES-256-GCM ENVELOPE ENCRYPTION (FAIL CLOSED) ---
async function encryptClinicalPayload(payload: any): Promise<{ ciphertext: string; iv: string; tag: string; encryptedKey: string; keyId: string }> {
  const dek = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);

  // Wrap (encrypt) the local DEK using Google Cloud KMS API
  const [result] = await kmsClient.encrypt({
    name: KMS_KEY_NAME,
    plaintext: dek,
  });

  if (!result.ciphertext) {
    throw new Error('KMS Key Wrapping Error: Failed to secure the Data Encryption Key.');
  }
  const encryptedKeyBase64 = Buffer.from(result.ciphertext as Uint8Array).toString('base64');

  // Encrypt payload string using local AES-256-GCM and DEK
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

  // Unwrap the DEK using Google Cloud KMS Decrypt API
  const [result] = await kmsClient.decrypt({
    name: KMS_KEY_NAME,
    ciphertext: encryptedKey,
  });

  if (!result.plaintext) {
    throw new Error('KMS Key Unwrapping Error: Failed to unwrap the Data Encryption Key.');
  }
  const dek = Buffer.from(result.plaintext as Uint8Array);

  // Decrypt AES-256-GCM ciphertext using the unwrapped DEK
  const decipher = crypto.createDecipheriv('aes-256-gcm', dek, iv);
  decipher.setAuthTag(tag);

  let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
  plaintext += decipher.final('utf8');
  return JSON.parse(plaintext);
}

// --- SECURE AUTH SERVICES ---
async function authorizeUser(
  authUid: string | undefined, 
  allowedRoles: string[], 
  branchScope?: string,
  recordOwnerId?: string
): Promise<{ authorized: boolean; role: string; assignedBranchId?: string }> {
  if (!authUid) return { authorized: false, role: '' };

  const userSnap = await db.collection('users').doc(authUid).get();
  if (!userSnap.exists) {
    return { authorized: false, role: '' };
  }

  const profile = userSnap.data();
  if (!profile) return { authorized: false, role: '' };

  const role = profile.role;
  if (!allowedRoles.includes(role)) {
    return { authorized: false, role };
  }

  // Branch isolation check
  if (branchScope && profile.assignedBranchId && profile.assignedBranchId !== branchScope) {
    return { authorized: false, role };
  }

  // Record ownership check for customers
  if (recordOwnerId && role === 'customer' && authUid !== recordOwnerId) {
    return { authorized: false, role };
  }

  return { authorized: true, role, assignedBranchId: profile.assignedBranchId };
}

/**
 * Verify practitioner-patient assignment relationship.
 * Checks if a direct assignment document exists in `/consultation_assignments/{practitionerId}_{patientId}`
 * or if the user's document has the assignedPractitionerId.
 */
async function verifyPractitionerAssignment(practitionerId: string, patientId: string): Promise<boolean> {
  // Check direct assignment collection first
  const assignmentSnap = await db.collection('consultation_assignments').doc(`${practitionerId}_${patientId}`).get();
  if (assignmentSnap.exists) {
    return true;
  }

  // Fallback to checking the patient's profile field
  const patientSnap = await db.collection('users').doc(patientId).get();
  if (patientSnap.exists) {
    const patientData = patientSnap.data();
    if (patientData && patientData.assignedPractitionerId === practitionerId) {
      return true;
    }
  }

  return false;
}

// --- CLOUD FUNCTIONS CONTROLLERS ---

/**
 * 1. Server-Authoritative Order Totals Calculator (Exposed for Client Previews)
 */
export const calculateOrder = functions.https.onCall(async (data: any, context: any) => {
  const { items } = data;
  if (!Array.isArray(items)) {
    throw new functions.https.HttpsError('invalid-argument', 'Payload items parameter must be a valid array.');
  }

  let subtotal = 0;
  const canonicalItems = items.map((item: any) => {
    const rateRef = PRODUCTS_CATALOG[item.skuId];
    if (!rateRef) {
      throw new functions.https.HttpsError('not-found', `SKU ${item.skuId} not found in database.`);
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

  let vatAmount = 0;
  let vatableSales = 0;
  let nonVatSales = 0;

  if (isVatRegistered) {
    vatableSales = subtotal / 1.12;
    vatAmount = subtotal - vatableSales;
    nonVatSales = 0;
  } else {
    vatableSales = 0;
    vatAmount = 0;
    nonVatSales = subtotal;
  }

  return {
    items: canonicalItems,
    shippingFee: fixedShippingFee,
    subtotal,
    vatAmount,
    vatableSales,
    nonVatSales,
    total,
    isVatRegistered,
    taxStatusDisclaimer,
  };
});

/**
 * 2. Secure Authoritative Order Creation & Atomic Multi-row Inventory reservation
 * Create the order and decrement inventory inside the SAME Firestore transaction.
 */
export const createOrderSecure = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User identity required.');
  }

  const { items, branchId, customer, paymentMethod } = data;

  // Real independent backend authentication and branch scope check
  const authCheck = await authorizeUser(context.auth.uid, ['customer', 'staff', 'practitioner', 'manager', 'admin']);
  if (!authCheck.authorized) {
    throw new functions.https.HttpsError('permission-denied', 'Access blocked: account verification failed.');
  }

  // Enforce branch authorization
  if (authCheck.assignedBranchId && authCheck.assignedBranchId !== branchId) {
    throw new functions.https.HttpsError('permission-denied', 'Branch isolation block: User is not authorized for the requested branch.');
  }

  const orderId = `HCI-ORD-${Date.now().toString().slice(-6)}`;

  // 100% CANONICALIZE ORDER DATA SERVER-SIDE
  let subtotal = 0;
  const canonicalItems = items.map((item: any) => {
    const rateRef = PRODUCTS_CATALOG[item.skuId];
    if (!rateRef) {
      throw new functions.https.HttpsError('not-found', 'Invalid item identifier.');
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
    userId: context.auth.uid,
    createdAt: FieldValue.serverTimestamp(),
    customer,
    items: canonicalItems,
    shippingFee: fixedShippingFee,
    subtotal,
    vatAmount: isVatRegistered ? subtotal - (subtotal / 1.12) : 0,
    vatableSales: isVatRegistered ? subtotal / 1.12 : 0,
    nonVatSales: isVatRegistered ? 0 : subtotal,
    total,
    isVatRegistered,
    taxStatusDisclaimer,
    paymentMethod,
    paymentStatus: 'pending_payment',
    fulfillmentStatus: 'pending_processing',
    branchId,
  };

  // ATOMIC RESERVATION AND WRITES inside the exact same transaction block
  try {
    await db.runTransaction(async (transaction: Transaction) => {
      // 1. Verify and decrement inventory for each item
      for (const item of items) {
        const invRef = db.collection('branch_inventory').doc(`${branchId}_${item.skuId}`);
        const invSnap = await transaction.get(invRef);

        if (!invSnap.exists) {
          throw new Error(`Inventory Missing Block: Stock levels for ${item.skuId} do not exist at branch ${branchId}.`);
        }

        const stockCount = invSnap.get('stockCount');
        if (stockCount < item.quantity) {
          throw new Error(`Insufficient Inventory Stock: Only ${stockCount} units available.`);
        }

        transaction.update(invRef, {
          stockCount: stockCount - item.quantity,
          lastReplenishedAt: FieldValue.serverTimestamp(),
        });
      }

      // 2. Set the order record ATOMICALLY inside the same transaction
      const orderRef = db.collection('orders').doc(orderId);
      transaction.set(orderRef, orderRecord);
    });
  } catch (err: any) {
    throw new functions.https.HttpsError('resource-exhausted', err.message);
  }

  return { orderId, success: true };
});

/**
 * 3. Secure Consultation Intake Save (with Envelope Encryption)
 * Enforces strict practitioner authentication and practitioner-patient assignment checks.
 */
export const saveClinicalIntakeSecure = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User identity required.');
  }

  const { userId, clinicalIntake, consentRecord, scheduledAt, deliveryMode } = data;

  // Enforce Practitioner or Admin role check
  const authCheck = await authorizeUser(context.auth.uid, ['practitioner', 'admin']);
  if (!authCheck.authorized) {
    throw new functions.https.HttpsError('permission-denied', 'Unauthorized clinical entry: Practitioner or Admin credentials required.');
  }

  // Enforce practitioner assignment relationship verification
  if (authCheck.role === 'practitioner') {
    const isAssigned = await verifyPractitionerAssignment(context.auth.uid, userId);
    if (!isAssigned) {
      throw new functions.https.HttpsError('permission-denied', 'Clinical boundary isolation block: Practitioner is not assigned to this patient.');
    }
  }

  // Encrypt the entire sensitive payload with a single secure DEK envelope (fail-closed, real KMS)
  const cryptRecord = await encryptClinicalPayload({
    dietaryHabits: clinicalIntake.dietaryHabits,
    waterConsumption: clinicalIntake.waterConsumption,
    declaredConditions: clinicalIntake.declaredConditions,
  });

  const intakeId = `CNS-INT-${Date.now().toString().slice(-6)}`;
  const secureRecord = {
    id: intakeId,
    userId,
    practitionerId: context.auth.uid,
    scheduledAt,
    deliveryMode,
    consentRecord: {
      purpose: consentRecord.purpose,
      version: consentRecord.version,
      timestamp: FieldValue.serverTimestamp(),
      withdrawalState: {
        isWithdrawn: false,
      },
    },
    encryptedClinicalIntake: {
      ciphertext: cryptRecord.ciphertext,
      iv: cryptRecord.iv,
      tag: cryptRecord.tag,
      encryptedKey: cryptRecord.encryptedKey,
      kmsKeyId: KMS_KEY_NAME,
    },
  };

  await db.collection('consultation_intakes').doc(intakeId).set(secureRecord);
  return { intakeId, success: true };
});

/**
 * 4. Secure Consultation Fetch (with Decryption validation check)
 * Enforces strict practitioner assignment relationship.
 */
export const fetchClinicalIntakeSecure = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Practitioner identity required.');
  }

  const { intakeId } = data;
  const intakeSnap = await db.collection('consultation_intakes').doc(intakeId).get();
  
  if (!intakeSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Record not found.');
  }

  const record = intakeSnap.data();
  if (!record) {
    throw new functions.https.HttpsError('not-found', 'Empty content.');
  }

  // Enforce role authorization and assignment validation
  const authCheck = await authorizeUser(context.auth.uid, ['practitioner', 'admin', 'customer'], undefined, record.userId);
  if (!authCheck.authorized) {
    throw new functions.https.HttpsError('permission-denied', 'Clinical Records isolation limit cleared: Access Blocked.');
  }

  // If a practitioner attempts a fetch, they must be explicitly assigned to this patient
  if (authCheck.role === 'practitioner') {
    const isAssigned = await verifyPractitionerAssignment(context.auth.uid, record.userId);
    if (!isAssigned) {
      throw new functions.https.HttpsError('permission-denied', 'Clinical access isolation: Practitioner is not assigned to this patient consultation.');
    }
  }

  // Decrypt clinical ciphertext inside the secure GCF context only (fail-closed, real KMS)
  const decryptedPayload = await decryptClinicalPayload(
    record.encryptedClinicalIntake.ciphertext,
    record.encryptedClinicalIntake.iv,
    record.encryptedClinicalIntake.tag,
    record.encryptedClinicalIntake.encryptedKey
  );

  return {
    id: record.id,
    userId: record.userId,
    scheduledAt: record.scheduledAt,
    deliveryMode: record.deliveryMode,
    consentRecord: record.consentRecord,
    decryptedClinicalIntake: decryptedPayload,
    kmsKeyId: record.encryptedClinicalIntake.kmsKeyId,
  };
});
