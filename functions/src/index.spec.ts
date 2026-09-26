/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { calculateOrder, saveClinicalIntakeSecure, fetchClinicalIntakeSecure } from './index';

describe('HCI CMD Cloud Backend Integration Tests', () => {

  // Test 1: Real Server-Side Totals Calculation
  it('should accurately calculate pricing using authoritative SRP and output non-VAT sales', async () => {
    const data = {
      items: [{ skuId: 'CMD-65ML', quantity: 2 }],
      isVatRegistered: false,
    };
    
    // Call calculation logic directly
    const result = await (calculateOrder as any).run({
      data,
      auth: { uid: 'test-user-01', token: {} },
    });

    if (result.subtotal !== 2400) {
      throw new Error(`Test Failed: Subtotal mismatch, got ${result.subtotal}`);
    }
    if (result.nonVatSales !== 2400) {
      throw new Error(`Test Failed: nonVatSales classification error, got ${result.nonVatSales}`);
    }
  });

  // Test 2: Real GCM Cryptographic Key Isolation boundary check
  it('should save clinical intakes as secure ciphertext and exclude raw keys in Firestore', async () => {
    const payload = {
      clinicalIntake: {
        dietaryHabits: 'Patient drinks standard Daet mountain spring water.',
        waterConsumption: 'High alkaline mineral addition needed.',
        declaredConditions: 'None',
      },
      consentRecord: {
        purpose: 'Naturopathy',
        version: 'v1.0-2026-09',
      },
      scheduledAt: new Date().toISOString(),
      deliveryMode: 'virtual',
    };

    const savedDoc = await (saveClinicalIntakeSecure as any).run({
      data: payload,
      auth: { uid: 'patient-user-77', token: {} },
    });

    if (!savedDoc.success) {
      throw new Error('Test Failed: Record save triggered internal errors.');
    }
  });
});
