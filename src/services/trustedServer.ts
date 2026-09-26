/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, auth } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * CLIENT-SIDE CLOUD FUNCTIONS SDK GATEWAY
 * Acts as the bridge connecting the React frontend to the real Firebase Cloud Functions backend.
 * Plaintext keys and calculations are computed exclusively on the server.
 * There are NO client-side fallbacks; if the backend fails, the operation fails closed.
 */
export class TrustedServerController {
  private static functions = getFunctions(undefined, 'us-central1');

  /**
   * 1. Invokes the server-authoritative calculations API
   */
  public static async calculateOrderTotals(
    items: Array<{ skuId: string; quantity: number }>,
    isVatRegistered: boolean
  ): Promise<any> {
    const calculateOrderCallable = httpsCallable(this.functions, 'calculateOrder');
    const response = await calculateOrderCallable({ items, isVatRegistered });
    return response.data;
  }

  /**
   * 2. Reserves stock and records order securely on backend
   */
  public static async createOrderSecurely(payload: {
    items: Array<{ skuId: string; quantity: number }>;
    branchId: string;
    customer: any;
    paymentMethod: string;
    isVatRegistered: boolean;
  }): Promise<any> {
    const createOrderCallable = httpsCallable(this.functions, 'createOrderSecure');
    const response = await createOrderCallable(payload);
    return response.data;
  }

  /**
   * 3. Saves Clinical Intake Securely (invoking AES-256-GCM envelope encrypt on backend)
   */
  public static async saveClinicalIntake(
    practitionerUid: string,
    payload: {
      userId: string;
      scheduledAt: string;
      deliveryMode: 'in_person' | 'virtual' | 'followup';
      consent: {
        purpose: string;
        version: string;
        withdrawalState: { isWithdrawn: boolean };
      };
      clinicalIntake: {
        dietaryHabits: string;
        waterConsumption: string;
        declaredConditions: string;
      };
    }
  ): Promise<any> {
    const saveCallable = httpsCallable(this.functions, 'saveClinicalIntakeSecure');
    const response = await saveCallable({
      userId: payload.userId,
      clinicalIntake: payload.clinicalIntake,
      consentRecord: {
        purpose: payload.consent.purpose,
        version: payload.consent.version,
      },
      scheduledAt: payload.scheduledAt,
      deliveryMode: payload.deliveryMode,
    });
    return response.data;
  }

  /**
   * 4. Fetches and Decrypts Clinical Intake (invoking backend role auth & KMS decrypt check)
   */
  public static async fetchClinicalData(
    userId: string,
    intakeId: string,
    practitionerUid: string
  ): Promise<any> {
    const fetchCallable = httpsCallable(this.functions, 'fetchClinicalIntakeSecure');
    const response = await fetchCallable({ intakeId });
    return response.data;
  }

  /**
   * 5. Retrieve stock count safely from Firestore
   */
  public static async getBranchStock(branchId: string, skuId: string): Promise<number> {
    const invRef = doc(db, 'branch_inventory', `${branchId}_${skuId}`);
    const snap = await getDoc(invRef);
    if (snap.exists()) {
      return snap.data().stockCount;
    }
    throw new Error(`Inventory Missing Block: Stock level record does not exist for SKU ${skuId} at branch ${branchId}`);
  }
}
