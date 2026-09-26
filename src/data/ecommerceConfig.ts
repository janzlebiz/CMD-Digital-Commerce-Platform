/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VatConfiguration } from '../types';

export interface SkuPricingConfig {
  skuId: string;
  basePrice: number; // in PHP
  isVatInclusive: boolean;
  notes: string;
}

export interface InventoryRecord {
  skuId: string;
  stockCount: number;
  unlimited: boolean;
}

/**
 * Initial standard baseline configuration.
 * Labeled with strict regulatory provenance indicating testing status.
 */
export const INITIAL_PRICING_CONFIGS: SkuPricingConfig[] = [
  {
    skuId: 'hci-cmd-65ml',
    basePrice: 1200,
    isVatInclusive: true,
    notes: 'SYSTEM TEST VALUE — Standard 65 mL Presentation. Subject to official business verification (FAR-06).',
  },
  {
    skuId: 'hci-cmd-30ml',
    basePrice: 650,
    isVatInclusive: true,
    notes: 'SYSTEM TEST VALUE — Standard 30 mL Presentation. Subject to official business verification (FAR-06).',
  },
];

export const INITIAL_INVENTORY_CONFIGS: InventoryRecord[] = [
  {
    skuId: 'hci-cmd-65ml',
    stockCount: 15,
    unlimited: false,
  },
  {
    skuId: 'hci-cmd-30ml',
    stockCount: 22,
    unlimited: false,
  },
];

export const INITIAL_VAT_CONFIG: VatConfiguration = {
  isVatRegistered: true, // Configurable in Admin/Testing console
  vatRatePercent: 12,
  isConfiguredByBusiness: false, // Remains false until officially verified by business audit
};

export const SHIPPING_RATES = {
  fixedDeliveryFee: 150, // Flat rate delivery fee within Camarines Norte
  pickupFee: 0,
};

export const MOCK_PAYMENT_CHANNELS = {
  gcash: {
    id: 'gcash',
    name: 'GCash Mobile Wallet',
    accountName: 'HCI CMD CAMARINES NORTE TEST ACCOUNT',
    accountNumber: '0917-123-4567',
    instructions: 'Submit a screenshot of the transaction reference receipt. Real transactions are mock-simulated with instantly approved test confirmations.',
    sandboxEnabled: true,
  },
  maya: {
    id: 'maya',
    name: 'Maya Wallet',
    accountName: 'HCI CMD CAMARINES NORTE TEST ACCOUNT',
    accountNumber: '0917-123-4567',
    instructions: 'Select Pay Bills or Send Money to the designated tester wallet. Instantly approved mock confirmation.',
    sandboxEnabled: true,
  },
  bank_transfer: {
    id: 'bank_transfer',
    name: 'Bank Transfer (BDO / Landbank)',
    accountName: 'Health Code International Corp. (Mock Test Account)',
    accountNumber: '1092-3456-7890',
    instructions: 'Simulated institutional bank clearance. Transfers are completed under Sandbox Mode.',
    sandboxEnabled: true,
  },
  cash_on_pickup: {
    id: 'cash_on_pickup',
    name: 'Cash on Pickup (Store Handover)',
    accountName: 'Camarines Norte Selected Branch',
    accountNumber: 'N/A',
    instructions: 'Hand over cash directly to the branch clerk upon physical inspection and SKU handover.',
    sandboxEnabled: true,
  },
};
