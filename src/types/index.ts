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
  | 'orders'
  | 'consultations'
  | 'admin'
  | 'workshops'
  | 'support';

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

export type OrderPaymentStatus = 'pending_payment' | 'payment_verification_required' | 'paid' | 'payment_failed';
export type OrderFulfillmentStatus = 'pending_processing' | 'ready_for_pickup' | 'in_transit' | 'completed' | 'cancelled';
export type DeliveryMethod = 'branch_pickup' | 'door_to_door';
export type PaymentMethod = 'cash_on_delivery' | 'cash_on_pickup' | 'gcash' | 'maya' | 'bank_transfer_bdo';

export interface OrderItem {
  skuId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productName: string;
}

export interface CustomerDetails {
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  shippingAddress?: {
    barangay: string;
    municipality: string;
    province: string;
    landmark?: string;
  };
}

export interface OrderRecord {
  id: string;
  userId?: string;
  customer: CustomerDetails;
  items: OrderItem[];
  branchId: string;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  paymentStatus: OrderPaymentStatus;
  fulfillmentStatus: OrderFulfillmentStatus;
  subtotal: number;
  shippingFee: number;
  taxAmount: number;
  grandTotal: number;
  placedAt: string;
  updatedAt: string;
  cancellationReason?: string;
}

export interface AuditLogEntry {
  id: string;
  actorUid: string;
  actorRole: string;
  branchId?: string | null;
  action: string;
  targetResource: string;
  targetId?: string | null;
  timestamp: string;
  success: boolean;
  metadata?: Record<string, any>;
  correlationId?: string;
}

export interface ProductItem {
  id: string;
  name: string;
  tagline: string;
  volume: string;
  servingSuggestion: string;
  price: number;
  description: string;
  highlights: string[];
  features: string[];
  stockCount: number;
}

export interface BranchLocation {
  id: string;
  name: string;
  municipality: string;
  address: string;
  landmark: string;
  operatingHours: string;
  phone: string;
  email: string;
  pickupSupported: boolean;
  transitCutoff: string;
}

export interface MineralFact {
  symbol: string;
  name: string;
  category: string;
  percentage: string;
  biologicalRole: string;
}

export interface DilutionProtocol {
  tier: string;
  targetAudience: string;
  dropsPerLiter: number;
  frequency: string;
  notes: string;
}

export interface ComplianceArticle {
  tier: number;
  tierName: string;
  ruleSummary: string;
  permitted: string[];
  prohibited: string[];
}

export interface FaqItem {
  id: string;
  category: 'regulatory' | 'usage' | 'safety' | 'branches' | 'authenticity';
  question: string;
  answer: string;
  regulatoryAnchor?: string;
}

// Phase 6A Consultation Types
export type ConsultationServiceCode = 'CNS-IN-PERSON' | 'CNS-VIRTUAL' | 'CNS-FOLLOWUP';

export interface ConsultationService {
  code: ConsultationServiceCode;
  title: string;
  durationMinutes: number;
  deliveryMode: 'in_person' | 'virtual' | 'hybrid';
  description: string;
  supportedBranches?: string[];
  feeStatus: 'FEE_PENDING_BUSINESS_CONFIRMATION';
  feeDisplay: string;
  nonMedicalDisclaimer: string;
}

export interface PractitionerProfile {
  id: string;
  uid: string;
  name: string;
  title: string;
  bio: string;
  credentialsStatus: 'CREDENTIALS_PENDING_BUSINESS_CONFIRMATION';
  certifications: string[];
  languages: string[];
  assignedBranches: string[];
  isAvailableForVirtual: boolean;
}

export interface ConsultationSlot {
  slotId: string;
  practitionerId: string;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
}

export interface InformedConsentRecord {
  purpose: string;
  version: string;
  timestamp: string;
  legalBasis: 'RA_10173_SECTION_13_A_EXPLICIT_CONSENT';
  acknowledgedText: string;
  withdrawalState: {
    isWithdrawn: boolean;
    withdrawnAt?: string;
  };
}

export interface ClinicalIntakeData {
  dietaryHabits: string;
  waterConsumption: string;
  lifestyleStress: string;
  energyLevels: string;
  declaredConditions: string;
  hydrationGoals: string;
}

export interface ConsultationAppointment {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  practitionerId: string;
  practitionerName: string;
  serviceCode: ConsultationServiceCode;
  serviceTitle: string;
  deliveryMode: 'in_person' | 'virtual';
  branchId?: string;
  scheduledDate: string;
  scheduledTime: string;
  status: 'scheduled' | 'intake_completed' | 'in_consultation' | 'completed' | 'cancelled';
  intakeId?: string;
  consentRecord?: InformedConsentRecord;
  createdAt: string;
  updatedAt: string;
}

export interface Workshop {
  id: string;
  title: string;
  description: string;
  branchId: string;
  scheduledDate: string;
  scheduledTime: string;
  capacity: number;
  seatsAllocated: number;
  waitlistCount: number;
  createdAt: string;
}

export interface WorkshopRegistration {
  id: string;
  userId: string;
  workshopId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: 'confirmed' | 'waitlisted' | 'cancelled' | 'attended';
  signature: string;
  createdAt: string;
  updatedAt: string;
}

// Phase 6C Support Ticket & Redress Types (RA 11967)
export type TicketCategory =
  | 'damaged_product'
  | 'delivery_delay'
  | 'billing_issue'
  | 'product_inquiry'
  | 'statutory_dpa_inquiry'
  | 'wrong_item'
  | 'cancellation_refund';

export type TicketStatus =
  | 'submitted'
  | 'under_investigation'
  | 'escalated_sla_breach'
  | 'resolved'
  | 'closed';

export interface TicketEscalationEntry {
  escalatedAt: string;
  reason: string;
  previousStatus: TicketStatus;
}

export interface SupportTicket {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  orderId?: string;
  branchId: string;
  category: TicketCategory;
  subject: string;
  description: string;
  status: TicketStatus;
  slaDueAt: string; // ISO 8601 statutory 7-day SLA deadline
  isEscalated: boolean;
  resolutionSummary?: string;
  resolvedAt?: string;
  resolvedByUid?: string;
  resolvedByName?: string;
  escalationHistory?: TicketEscalationEntry[];
  createdAt: string;
  updatedAt: string;
}

