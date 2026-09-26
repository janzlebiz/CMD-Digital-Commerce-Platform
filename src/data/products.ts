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
      'Concentrated trace mineral drops derived from the waters of the Great Salt Lake of Utah. (Provenance: MANUFACTURER-PROVIDED). Designed as a dietary food supplement to support trace mineral nutrition.',
    recommendedUse:
      'Manufacturer/Distributor Usage Guidance — not an FDA-approved dosage recommendation. Suggested use: 5 to 10 drops diluted in water, 2 to 3 times daily. (Provenance: DISTRIBUTOR-PROVIDED). Always dilute before drinking.',
    servingsPerBottle: 'Serving count varies depending on individual dilution. (Provenance: DISTRIBUTOR-PROVIDED).',
    mineralHighlights: [
      'Magnesium for dietary supplementation. (Provenance: GENERAL EDUCATIONAL INFORMATION)',
      'Chloride as a naturally occurring trace mineral. (Provenance: GENERAL EDUCATIONAL INFORMATION)',
      'Potassium and co-occurring trace minerals. (Provenance: GENERAL EDUCATIONAL INFORMATION)',
      'Reduced sodium mineral profile. (Provenance: MANUFACTURER-PROVIDED)',
    ],
    keyComposition: [
      {
        name: 'Magnesium',
        description: 'Dissolved magnesium ions. (Provenance: GENERAL EDUCATIONAL INFORMATION)',
        nature: 'Macromineral',
      },
      {
        name: 'Chloride & Potassium',
        description: 'Naturally co-occurring minerals in saline waters. (Provenance: GENERAL EDUCATIONAL INFORMATION)',
        nature: 'Electrolytes',
      },
      {
        name: 'Trace Elements',
        description: 'Spectrum of minerals in dissolved form. (Provenance: GENERAL EDUCATIONAL INFORMATION)',
        nature: 'Trace elements',
      },
      {
        name: 'Reduced Sodium',
        description: 'Formulated with low sodium. (Provenance: MANUFACTURER-PROVIDED)',
        nature: 'Low sodium',
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
      'Compact presentation of concentrated trace mineral drops derived from the waters of the Great Salt Lake of Utah. (Provenance: MANUFACTURER-PROVIDED).',
    recommendedUse:
      'Manufacturer/Distributor Usage Guidance — not an FDA-approved dosage recommendation. Suggested use: 5 to 10 drops diluted in water, 2 to 3 times daily. (Provenance: DISTRIBUTOR-PROVIDED). Always dilute before drinking.',
    servingsPerBottle: 'Serving count varies depending on individual dilution. (Provenance: DISTRIBUTOR-PROVIDED).',
    mineralHighlights: [
      'Concentrated trace mineral drops. (Provenance: MANUFACTURER-PROVIDED)',
      'Water dilution support. (Provenance: DISTRIBUTOR-PROVIDED)',
      'Formulated without added preservatives. (Provenance: MANUFACTURER-PROVIDED)',
      'Reduced sodium mineral profile. (Provenance: MANUFACTURER-PROVIDED)',
    ],
    keyComposition: [
      {
        name: 'Magnesium',
        description: 'Dissolved magnesium ions. (Provenance: GENERAL EDUCATIONAL INFORMATION)',
        nature: 'Macromineral',
      },
      {
        name: 'Trace Elements',
        description: 'Spectrum of minerals in dissolved form. (Provenance: GENERAL EDUCATIONAL INFORMATION)',
        nature: 'Trace elements',
      },
    ],
  },
];
