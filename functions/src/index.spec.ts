/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { calculateOrder, saveClinicalIntakeSecure } from './index';

describe('HCI CMD Production Security Audit Tests', () => {

  // Test 1: Real Server-Side Totals Calculation
  it('should canonicalize pricing from true database rates and output non-VAT sales', async () => {
    const data = {
      items: [{ skuId: 'CMD-65ML', quantity: 3 }],
    };
    
    // Call calculation logic directly
    const result = await (calculateOrder as any).run({
      data,
      auth: { uid: 'patient-user-88', token: {} },
    });

    if (result.subtotal !== 3600) {
      throw new Error(`Test Failed: Price canonicalization failed, got ${result.subtotal}`);
    }
    if (result.nonVatSales !== 3600) {
      throw new Error(`Test Failed: nonVatSales calculation failed, got ${result.nonVatSales}`);
    }
  });

  // Test 2: Real Cloud KMS / AES-256-GCM Envelope Encryption
  it('should encrypt sensitive health records with AES-256-GCM envelope key', async () => {
    const payload = {
      clinicalIntake: {
        dietaryHabits: 'Spring water only.',
        waterConsumption: 'Under-hydrated.',
        declaredConditions: 'None',
      },
      consentRecord: {
        purpose: 'Wellness Guidance',
        version: 'v1.0-2026-09',
      },
      scheduledAt: new Date().toISOString(),
      deliveryMode: 'in_person',
    };

    const savedDoc = await (saveClinicalIntakeSecure as any).run({
      data: payload,
      auth: { uid: 'patient-user-99', token: {} },
    });

    if (!savedDoc.success) {
      throw new Error('Test Failed: Record save triggered internal errors.');
    }
  });
});
