/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PageView =
  | 'home'
  | 'about'
  | 'education'
  | 'products'
  | 'branches'
  | 'faq'
  | 'contact'
  | 'compliance'
  | 'terms'
  | 'privacy'
  | 'returns'
  | 'cart'
  | 'checkout'
  | 'orders';

export interface CartItem {
  skuId: string;
  quantity: number;
}

export type PaymentMethod = 'gcash' | 'maya' | 'bank_transfer' | 'cash_on_pickup';

export type FulfillmentMethod = 'pickup' | 'delivery';

export interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine1?: string;
  barangay?: string;
  municipality: string;
  province: string;
}

export interface OrderItem {
  skuId: string;
  name: string;
  volume: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  createdAt: string;
  customer: CustomerInfo;
  items: OrderItem[];
  fulfillmentMethod: FulfillmentMethod;
  pickupBranchId?: string;
  shippingFee: number;
  subtotal: number;
  vatAmount: number;
  nonVatSales: number;
  total: number;
  isVatRegistered: boolean;
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending_payment' | 'paid' | 'payment_verification_required';
  fulfillmentStatus: 'pending_processing' | 'ready_for_pickup' | 'in_transit' | 'completed' | 'cancelled';
  // VAT breakdown info
  vatableSales: number;
  vatExemptSales: number;
  vatZeroRatedSales: number;
}

export interface VatConfiguration {
  isVatRegistered: boolean;
  vatRatePercent: number; // usually 12
  isConfiguredByBusiness: boolean; // default false
}

export interface BranchRecord {
  id: string;
  name: string;
  municipality: string;
  province: 'Camarines Norte';
  isCentralHub: boolean;
  role: string;
  /** Evidentiary status regarding operational address */
  addressStatus: 'PENDING_BUSINESS_CONFIRMATION' | 'VERIFIED';
  addressDisplay: string;
  addressNote: string;
  /** Evidentiary status regarding telecommunications contact */
  phoneStatus: 'PENDING_BUSINESS_CONFIRMATION' | 'VERIFIED';
  phoneDisplay: string;
  phoneNote: string;
  /** Operating hours status */
  hoursStatus: 'PENDING_OPERATIONAL_AUDIT' | 'VERIFIED';
  hoursDisplay: string;
  serviceFeatures: string[];
  plannedFulfillment: string[];
  geographicZone: string;
}

export interface SkuRecord {
  id: string;
  name: string;
  nominalVolume: string;
  packagingType: string;
  parentRegistrationNumber: string;
  registrantCompany: string;
  /**
   * Regulatory packaging status under FDA Center for Food Regulation and Research (CFRR)
   * As determined in Phase 0 audit, FR-4000008713595 covers product formulation,
   * but packaging volume authorization annex is pending business verification.
   */
  fdaStatus: 'FDA_PRESENTATION_EVIDENCE_PENDING_BUSINESS_VERIFICATION';
  statusDisplay: string;
  /** Retail pricing status */
  pricingStatus: 'SRP_PENDING_BUSINESS_CONFIRMATION';
  pricingDisplay: string;
  description: string;
  recommendedUse: string;
  servingsPerBottle: string;
  mineralHighlights: string[];
  keyComposition: {
    name: string;
    description: string;
    nature: string;
  }[];
}

export interface FaqItem {
  id: string;
  category: 'regulatory' | 'usage' | 'safety' | 'branches' | 'authenticity';
  question: string;
  answer: string;
  regulatoryAnchor?: string;
}

export interface ComplianceArticle {
  tier: number;
  tierName: string;
  ruleSummary: string;
  permitted: string[];
  prohibited: string[];
}

export type UserRole = 'customer' | 'practitioner' | 'branch_manager' | 'regional_director' | 'super_admin';

export interface UserProfile {
  uid: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  assignedBranchId?: string;
  createdAt?: string;
}
