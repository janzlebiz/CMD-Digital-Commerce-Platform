/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db, auth } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * CLIENT-SIDE AUTHORITATIVE BACKEND GATEWAY
 * Acts as the bridge connecting the React frontend to the secure server API.
 * All sensitive calculations, pricing, inventory reservations, and cryptographic
 * envelope decryption are computed exclusively on the server.
 */
export class TrustedServerController {
  private static async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const idToken = await currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${idToken}`;
      }
    } catch {
      // Token retrieval failure
    }
    return headers;
  }

  /**
   * 1. Invokes the server-authoritative calculations API
   */
  public static async calculateOrderTotals(
    items: Array<{ skuId: string; quantity: number }>,
    isVatRegistered: boolean
  ): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/calculate-order', {
      method: 'POST',
      headers,
      body: JSON.stringify({ items, isVatRegistered }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: 'Calculation failed' }));
      throw new Error(errData.error || `HTTP error ${res.status}`);
    }

    return res.json();
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
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/create-order', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: 'Order creation failed' }));
      throw new Error(errData.error || `HTTP error ${res.status}`);
    }

    return res.json();
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
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/clinical-intake/save', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId: payload.userId,
        clinicalIntake: payload.clinicalIntake,
        consentRecord: {
          purpose: payload.consent.purpose,
          version: payload.consent.version,
        },
        scheduledAt: payload.scheduledAt,
        deliveryMode: payload.deliveryMode,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: 'Intake submission failed' }));
      throw new Error(errData.error || `HTTP error ${res.status}`);
    }

    return res.json();
  }

  /**
   * 4. Fetches and Decrypts Clinical Intake (invoking backend role auth & KMS decrypt check)
   */
  public static async fetchClinicalData(
    userId: string,
    intakeId: string,
    practitionerUid: string
  ): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/clinical-intake/fetch', {
      method: 'POST',
      headers,
      body: JSON.stringify({ intakeId, userId }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: 'Intake fetch failed' }));
      throw new Error(errData.error || `HTTP error ${res.status}`);
    }

    return res.json();
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
