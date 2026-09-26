/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BranchRecord } from '../types';

/**
 * Six Physical Branch Locations across Camarines Norte
 * In accordance with Phase 0 audit findings (FAR-07, FAR-08, FAR-09):
 * - Municipality locations are BUSINESS-PROVIDED and verified for presence.
 * - Exact physical street addresses and telephone numbers remain OPEN / BUSINESS EVIDENCE REQUIRED.
 * - Daet serves as the proposed Central Administrative Hub and Regional Stock Depot.
 */
export const BRANCHES_DATA: BranchRecord[] = [
  {
    id: 'daet',
    name: 'Daet Central Branch & Regional Hub',
    municipality: 'Daet',
    province: 'Camarines Norte',
    isCentralHub: true,
    role: 'Provincial Administrative Center & Central Stock Depot',
    addressStatus: 'PENDING_BUSINESS_CONFIRMATION',
    addressDisplay: 'Daet Town Proper, Camarines Norte',
    addressNote: 'Exact building name, street address, and barangay pending final business confirmation.',
    phoneStatus: 'PENDING_BUSINESS_CONFIRMATION',
    phoneDisplay: 'Official Branch Line Pending Activation',
    phoneNote: 'Official local landline and mobile hotline pending telecom assignment.',
    hoursStatus: 'PENDING_OPERATIONAL_AUDIT',
    hoursDisplay: 'Mon – Sat: 8:30 AM – 5:30 PM (Pending Confirmation)',
    geographicZone: 'Central Administrative District',
    serviceFeatures: [
      'Provincial Hub Replenishment Stock',
      'Walk-in Product Information & Inquiries',
      'Planned Customer Order Pickup Counter',
      'Future Naturopathic Wellness Guidance Center',
    ],
    plannedFulfillment: [
      'Cash on Pickup / Store Handover',
      'Provincial Central Depot Dispatch',
      'Motorcycle Courier Dispatch',
    ],
  },
  {
    id: 'labo',
    name: 'Labo Branch',
    municipality: 'Labo',
    province: 'Camarines Norte',
    isCentralHub: false,
    role: 'Western Interior & Agricultural Gateway Branch',
    addressStatus: 'PENDING_BUSINESS_CONFIRMATION',
    addressDisplay: 'Labo Commercial District, Camarines Norte',
    addressNote: 'Exact building location and street address pending final business confirmation.',
    phoneStatus: 'PENDING_BUSINESS_CONFIRMATION',
    phoneDisplay: 'Branch Phone Line Pending Activation',
    phoneNote: 'Telecom assignment in progress.',
    hoursStatus: 'PENDING_OPERATIONAL_AUDIT',
    hoursDisplay: 'Mon – Sat: 8:30 AM – 5:00 PM (Pending Confirmation)',
    geographicZone: 'Western Interior District',
    serviceFeatures: [
      'Regional Product Information Point',
      'Planned Order Pickup Point',
      'Community Hydration Education Materials',
    ],
    plannedFulfillment: [
      'Cash on Pickup',
      'Local Municipal Delivery Dispatch',
    ],
  },
  {
    id: 'paracale',
    name: 'Paracale Branch',
    municipality: 'Paracale',
    province: 'Camarines Norte',
    isCentralHub: false,
    role: 'Historic Coastal & Mining District Branch',
    addressStatus: 'PENDING_BUSINESS_CONFIRMATION',
    addressDisplay: 'Paracale Town Proper, Camarines Norte',
    addressNote: 'Exact street address pending business confirmation.',
    phoneStatus: 'PENDING_BUSINESS_CONFIRMATION',
    phoneDisplay: 'Branch Line Pending Activation',
    phoneNote: 'Telecom assignment in progress.',
    hoursStatus: 'PENDING_OPERATIONAL_AUDIT',
    hoursDisplay: 'Mon – Sat: 9:00 AM – 5:00 PM (Pending Confirmation)',
    geographicZone: 'Eastern Coastal District',
    serviceFeatures: [
      'Local Community Wellness Information',
      'Planned Order Collection Counter',
      'Direct Product Educational Materials',
    ],
    plannedFulfillment: [
      'Cash on Pickup',
      'Branch Stock Reservation',
    ],
  },
  {
    id: 'panganiban',
    name: 'Jose Panganiban Branch',
    municipality: 'Jose Panganiban',
    province: 'Camarines Norte',
    isCentralHub: false,
    role: 'Northwestern Seaboard & Port District Branch',
    addressStatus: 'PENDING_BUSINESS_CONFIRMATION',
    addressDisplay: 'Jose Panganiban Commercial Area, Camarines Norte',
    addressNote: 'Exact building and street details pending business confirmation.',
    phoneStatus: 'PENDING_BUSINESS_CONFIRMATION',
    phoneDisplay: 'Branch Line Pending Activation',
    phoneNote: 'Telecom assignment in progress.',
    hoursStatus: 'PENDING_OPERATIONAL_AUDIT',
    hoursDisplay: 'Mon – Sat: 9:00 AM – 5:00 PM (Pending Confirmation)',
    geographicZone: 'Northwestern Maritime District',
    serviceFeatures: [
      'Coastal Community Product Distribution Point',
      'Planned Local Pickup Station',
      'Informational Brochures on Trace Minerals',
    ],
    plannedFulfillment: [
      'Cash on Pickup',
      'Municipal Courier Routing',
    ],
  },
  {
    id: 'capalonga',
    name: 'Capalonga Branch',
    municipality: 'Capalonga',
    province: 'Camarines Norte',
    isCentralHub: false,
    role: 'Northern Coastal & Pilgrimage Center Branch',
    addressStatus: 'PENDING_BUSINESS_CONFIRMATION',
    addressDisplay: 'Capalonga Town Proper, Camarines Norte',
    addressNote: 'Exact street and landmark details pending business confirmation.',
    phoneStatus: 'PENDING_BUSINESS_CONFIRMATION',
    phoneDisplay: 'Branch Line Pending Activation',
    phoneNote: 'Telecom assignment in progress.',
    hoursStatus: 'PENDING_OPERATIONAL_AUDIT',
    hoursDisplay: 'Mon – Sat: 9:00 AM – 4:30 PM (Pending Confirmation)',
    geographicZone: 'Northern Coastal District',
    serviceFeatures: [
      'Pilgrimage & Community Information Desk',
      'Planned Pickup Depot',
      'Hydration & Mineral Guidelines',
    ],
    plannedFulfillment: [
      'Cash on Pickup',
      'Scheduled Weekly Stock Replenishment from Daet',
    ],
  },
  {
    id: 'sta-elena',
    name: 'Sta. Elena Branch',
    municipality: 'Sta. Elena',
    province: 'Camarines Norte',
    isCentralHub: false,
    role: 'Southern Boundary Gateway Branch (Bordering Quezon Province)',
    addressStatus: 'PENDING_BUSINESS_CONFIRMATION',
    addressDisplay: 'Sta. Elena Highway / Commercial Area, Camarines Norte',
    addressNote: 'Exact highway junction or street address pending business confirmation.',
    phoneStatus: 'PENDING_BUSINESS_CONFIRMATION',
    phoneDisplay: 'Branch Line Pending Activation',
    phoneNote: 'Telecom assignment in progress.',
    hoursStatus: 'PENDING_OPERATIONAL_AUDIT',
    hoursDisplay: 'Mon – Sat: 8:30 AM – 5:00 PM (Pending Confirmation)',
    geographicZone: 'Southern Border Gateway',
    serviceFeatures: [
      'Provincial Gateway Point',
      'Planned Traveler & Local Resident Pickup Station',
      'Mineral Drops Usage Advisory Desk',
    ],
    plannedFulfillment: [
      'Cash on Pickup',
      'Scheduled Stock Replenishment from Daet Hub',
    ],
  },
];
