/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SkuRecord } from '../types';

/**
 * HCI CMD Product Catalog Architecture
 *
 * Grounded in:
 * 1. Verified FDA Product Registration FR-4000008713595 (Food Supplement, White Opaque Plastic Bottle)
 * 2. Phase 0 Audit Finding (FAR-04 & COMP-FDA-002): Specific packaging volume annexes (65 mL and 30 mL)
 *    remain OPEN / BUSINESS EVIDENCE REQUIRED.
 * 3. Phase 0 Audit Finding (FAR-06): Official retail prices (SRP in PHP) are OPEN / BUSINESS EVIDENCE REQUIRED.
 * 4. Product Claims Policy (COMP-POL-002): Five-tier boundary strictly applied.
 */
export const PRODUCTS_CATALOG: SkuRecord[] = [
  {
    id: 'hci-cmd-65ml',
    name: 'HCI Cell Mineral Drops (CMD) — 65 mL Flagship Bottle',
    nominalVolume: '65 mL',
    packagingType: 'White Opaque Plastic Dropper Bottle with Tamper-Evident Seal',
    parentRegistrationNumber: 'FR-4000008713595',
    registrantCompany: 'HEALTH CODE INTERNATIONAL CORPORATION',
    fdaStatus: 'FDA_PRESENTATION_EVIDENCE_PENDING_BUSINESS_VERIFICATION',
    statusDisplay: 'FDA PRESENTATION EVIDENCE PENDING BUSINESS VERIFICATION',
    pricingStatus: 'SRP_PENDING_BUSINESS_CONFIRMATION',
    pricingDisplay: 'Official SRP Pending Business Confirmation',
    description:
      'Concentrated, naturally harvested ionic trace mineral drops derived from the pristine Great Salt Lake of Utah through solar evaporation. Designed as a daily dietary food supplement to support normal electrolyte balance and remineralize drinking water.',
    recommendedUse:
      'Standard Adult Dietary Supplement: Add 5 to 10 drops into a 250 mL glass of drinking water, fruit juice, or beverage, 2 to 3 times daily. Do not consume in large volumes undiluted due to concentrated natural mineral salinity.',
    servingsPerBottle: 'Approximately 975 drops (~95 to 195 servings based on 5–10 drops/serving)',
    mineralHighlights: [
      'Ionic Magnesium for normal muscle function & energy metabolism',
      'Chloride for normal digestion and electrolyte balance',
      'Potassium and full spectrum naturally occurring trace minerals',
      'Low sodium (~99.5% sodium removed during solar concentration)',
    ],
    keyComposition: [
      {
        name: 'Ionic Magnesium',
        description: 'Naturally bioavailable liquid magnesium ion in soluble chloride form.',
        nature: 'Essential dietary macromineral',
      },
      {
        name: 'Chloride & Potassium',
        description: 'Key dietary electrolytes that support cellular hydration and water balance.',
        nature: 'Essential electrolytes',
      },
      {
        name: 'Solar Concentrated Trace Elements',
        description: 'Naturally occurring spectrum of dissolved minerals from the Great Salt Lake.',
        nature: 'Natural trace elements',
      },
      {
        name: 'Sodium Control',
        description: 'Processed through natural evaporation beds to eliminate over 99.5% of sodium.',
        nature: 'Low sodium formulation',
      },
    ],
  },
  {
    id: 'hci-cmd-30ml',
    name: 'HCI Cell Mineral Drops (CMD) — 30 mL Compact Dropper',
    nominalVolume: '30 mL',
    packagingType: 'White Opaque Plastic Dropper Bottle with Tamper-Evident Seal',
    parentRegistrationNumber: 'FR-4000008713595',
    registrantCompany: 'HEALTH CODE INTERNATIONAL CORPORATION',
    fdaStatus: 'FDA_PRESENTATION_EVIDENCE_PENDING_BUSINESS_VERIFICATION',
    statusDisplay: 'FDA PRESENTATION EVIDENCE PENDING BUSINESS VERIFICATION',
    pricingStatus: 'SRP_PENDING_BUSINESS_CONFIRMATION',
    pricingDisplay: 'Official SRP Pending Business Confirmation',
    description:
      'Compact, pocket-sized presentation of HCI CMD ionic mineral concentrate. Ideal for travel, workplace hydration, and daily on-the-go remineralization of purified water.',
    recommendedUse:
      'Standard Adult Dietary Supplement: Add 5 to 10 drops into potable water or non-acidic beverage, 2 to 3 times daily. Always dilute prior to ingestion.',
    servingsPerBottle: 'Approximately 450 drops (~45 to 90 servings based on 5–10 drops/serving)',
    mineralHighlights: [
      'Concentrated ionic mineral drops in portable travel presentation',
      'Restores essential minerals to reverse-osmosis or distilled water',
      'High bioavailable ionic form requires no artificial preservatives',
      'Low sodium mineral profile',
    ],
    keyComposition: [
      {
        name: 'Ionic Magnesium',
        description: 'Liquid bioavailable magnesium supporting electrolyte equilibrium.',
        nature: 'Essential dietary macromineral',
      },
      {
        name: 'Dietary Electrolytes',
        description: 'Natural chloride and trace minerals for everyday dietary balance.',
        nature: 'Trace mineral complex',
      },
    ],
  },
];
