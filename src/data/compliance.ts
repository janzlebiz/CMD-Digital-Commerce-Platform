/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ComplianceArticle } from '../types';

/**
 * Compliance & Regulatory Constants
 * Grounded in Primary Authorities (docs/compliance/source-register.md)
 */
export const STATUTORY_NOTICES = {
  /**
   * Primary Filipino Statutory Warning
   * Mandatory under FDA Circular No. 2015-003 and DOH AO 2014-0030
   */
  FILIPINO_WARNING:
    'MAHALAGANG PAALALA: ANG HCI CELL MINERAL DROPS AY HINDI GAMOT AT HINDI DAPAT GAMITING PANGGAMOT SA ANUMANG URI NG SAKIT.',

  /**
   * Secondary English Statutory Disclaimer
   */
  ENGLISH_DISCLAIMER: 'NO APPROVED THERAPEUTIC CLAIMS',

  /**
   * Vulnerable Demographics Advisory
   */
  VULNERABLE_DEMOGRAPHICS:
    'PRECAUTIONS: For adult dietary supplementation. Pregnant or lactating women, individuals with chronic kidney disease, severe electrolyte restrictions, or persons undergoing active medical treatment should consult their licensed physician before use. Keep out of reach of children.',

  /**
   * Verified FDA Product Registration Data (FDA Verification Portal: FR-4000008713595)
   */
  FDA_REGISTRATION: {
    registrationNumber: 'FR-4000008713595',
    brandName: 'HCI CMD™',
    registeredProductName:
      'CELL MINERAL DROPS (IONIC MINERAL CONCENTRATE) FOOD SUPPLEMENT DROPS',
    registrant: 'HEALTH CODE INTERNATIONAL CORPORATION',
    classification: 'Medium Risk Food Product',
    category: 'Food Supplement (Food Product)',
    recordedPackaging: 'WHITE OPAQUE PLASTIC BOTTLE',
    dateIssued: '26 May 2023',
    dateExpiration: '18 March 2028',
    portalUrl:
      'https://verification.fda.gov.ph/FoodProduct_Medriskview.php?ACCOUNTCODE=FR-4000008713595&export=pdf',
  },

  /**
   * BIR Compliance & RMC No. 38-2026 Notice
   * Online Registration Seal Badge Requirement
   */
  BIR_DISCLOSURES: {
    authority: 'BIR Revenue Memorandum Circular (RMC) No. 38-2026',
    statute: 'National Internal Revenue Code (NIRC), as amended',
    sealStatus: 'PENDING_OFFICIAL_BUSINESS_ISSUANCE',
    tinStatus: 'TIN PENDING BUSINESS SUBMISSION',
    taxStatusNote:
      'Tax classification (VAT registered vs. Non-VAT Percentage Tax under NIRC Section 116) and official BIR Form 2303 Certificate of Registration are pending business confirmation.',
    recordsRetentionStatute:
      'NIRC Section 235, as amended by RA 11976 (Ease of Paying Taxes Act), provides for preservation of books of accounts, subsidiary books, and other accounting records for five (5) years, reckoned according to the statutory rule specified in the amended Section 235.',
  },

  /**
   * Consumer Protection & E-Commerce Acts
   */
  LEGAL_FRAMEWORK: [
    {
      act: 'Republic Act No. 9711',
      title: 'Food and Drug Administration (FDA) Act of 2009',
      scope: 'Regulation of food supplements and prohibition of unapproved therapeutic claims.',
    },
    {
      act: 'Republic Act No. 11967',
      title: 'Internet Transactions Act of 2023 (ITA)',
      scope: 'Online merchant identification, consumer trust, and transparent e-commerce transactions.',
    },
    {
      act: 'Republic Act No. 7394',
      title: 'Consumer Act of the Philippines',
      scope: 'Truth in advertising, consumer rights, product warranties, and return protections.',
    },
    {
      act: 'Republic Act No. 11976',
      title: 'Ease of Paying Taxes Act (EOPT)',
      scope: 'Amended NIRC Section 235: 5-year statutory retention rule for books of accounts and accounting records.',
    },
    {
      act: 'Republic Act No. 10173',
      title: 'Data Privacy Act of 2012',
      scope: 'Protection of individual privacy, lawful data processing, and user rights.',
    },
  ],
};

/**
 * Five-Tier Claim Demarcation Model (COMP-POL-002)
 */
export const FIVE_TIER_CLAIMS: ComplianceArticle[] = [
  {
    tier: 1,
    tierName: 'Tier 1 — Verified Regulatory Facts',
    ruleSummary: 'Directly supported by primary government issuances and official registry records.',
    permitted: [
      'Registration number FR-4000008713595 issued to Health Code International Corp.',
      'Classification: Food Supplement / Processed Food Product.',
      'Mandatory statement: "NO APPROVED THERAPEUTIC CLAIMS".',
      'Recorded packaging: White opaque plastic bottle.',
    ],
    prohibited: [
      'Representing the product as a pharmaceutical drug or registered medicine.',
      'Claiming government endorsement beyond standard food supplement registration.',
    ],
  },
  {
    tier: 2,
    tierName: 'Tier 2 — Manufacturer Technical Claims',
    ruleSummary: 'Origin and technical process details originating from mineral extraction sources.',
    permitted: [
      'Harvested from mineral-rich waters of the Great Salt Lake, Utah, USA.',
      'Natural solar evaporation concentration process.',
      'Low sodium profile (~99.5% sodium removed during concentration).',
      'Presence of natural ionic magnesium and trace minerals.',
    ],
    prohibited: [
      'Framing nutritional mineral presence as clinical disease cures.',
      'Claiming proprietary medicinal formulations without evidence.',
    ],
  },
  {
    tier: 3,
    tierName: 'Tier 3 — Distributor Commercial Claims',
    ruleSummary: 'Packaging presentations and suggested dilutive servings across distribution channels.',
    permitted: [
      'Suggested serving: 5 to 10 drops in water or juice, 2 to 3 times daily.',
      'Beverage remineralization: 20 to 30 drops per gallon of purified water.',
      'Commercial packaging sizes (subject to packaging evidence verification).',
    ],
    prohibited: [
      'Promoting the product as FDA-verified in specific volume sizes without registration annex.',
      'Suggesting undiluted large volume consumption.',
    ],
  },
  {
    tier: 4,
    tierName: 'Tier 4 — General Educational Statements',
    ruleSummary: 'General nutritional and physiological science grounded in dietary guidelines (FNRI & Codex Alimentarius).',
    permitted: [
      'Magnesium contributes to normal electrolyte balance and muscle function.',
      'Essential trace minerals support daily cellular hydration and enzyme activity.',
      'Restoration of minerals to reverse-osmosis or distilled drinking water.',
    ],
    prohibited: [
      'Stating or implying that mineral replenishment will treat, reverse, or eradicate disease.',
      'Promising that mineral intake replaces medical therapies or maintenance drugs.',
    ],
  },
  {
    tier: 5,
    tierName: 'Tier 5 — Prohibited & Blacklisted Claims',
    ruleSummary: 'Strictly prohibited statements that lead to immediate rejection and disciplinary sanction.',
    permitted: [],
    prohibited: [
      'Disease cures (e.g., "cures diabetes", "lowers high blood pressure permanently", "dissolves cysts").',
      'Ophthalmic / eye instillation (e.g., "CMD eye drops", "clear cataracts", "natural eye wash").',
      'Medical replacement (e.g., "stop prescription maintenance drugs", "natural insulin substitute").',
      'Nasal, ear, or invasive mucosal administration.',
      'Absolutist promises (e.g., "miracle cure", "100% healing guarantee").',
    ],
  },
];
