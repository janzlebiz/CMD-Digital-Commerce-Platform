/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, Express } from 'express';
import { createServer as createViteServer } from 'vite';
import { KeyManagementServiceClient } from '@google-cloud/kms';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps } from 'firebase-admin/app';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dispatchAlert } from './src/services/alertService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface LogMeta {
  event?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  correlationId?: string;
  durationMs?: number;
  error?: string;
  [key: string]: any;
}

const SENSITIVE_LOG_KEYS = [
  'token', 'authorization', 'password', 'secret', 'hmac', 'kms',
  'key', 'ciphertext', 'clinical', 'intake', 'dietary', 'water',
  'condition', 'card', 'cvv', 'ssn', 'bearer'
];

function sanitizeLogMeta(obj: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_LOG_KEYS.some(s => lower.includes(s))) {
      clean[key] = '[REDACTED]';
      continue;
    }
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      clean[key] = sanitizeLogMeta(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

export const logger = {
  info(message: string, meta: LogMeta = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      ...sanitizeLogMeta(meta)
    };
    console.log(JSON.stringify(logEntry));
  },
  warn(message: string, meta: LogMeta = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      ...sanitizeLogMeta(meta)
    };
    console.warn(JSON.stringify(logEntry));
  },
  error(message: string, meta: LogMeta = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      ...sanitizeLogMeta(meta)
    };
    console.error(JSON.stringify(logEntry));
  }
};

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp({
    projectId: 'ai-studio-cmddigitalcommer-8d70f45b-1636-42ba-9e2d-f063a7b0e086',
  });
}

// Authoritative Business Constants
export const PRODUCTS_CATALOG: Record<string, { price: number; name: string; volume: string }> = {
  'hci-cmd-65ml': { price: 1200, name: 'HCI Cell Mineral Drops (CMD) — 65 mL Flagship Bottle', volume: '65 mL' },
  'hci-cmd-30ml': { price: 650, name: 'HCI Cell Mineral Drops (CMD) — 30 mL Compact Dropper', volume: '30 mL' },
};

export const CONSULTATION_SERVICES: Record<string, {
  code: string;
  title: string;
  durationMinutes: number;
  deliveryMode: 'in_person' | 'virtual' | 'hybrid';
  description: string;
  supportedBranches: string[];
  feeStatus: 'FEE_PENDING_BUSINESS_CONFIRMATION';
  feeDisplay: string;
  nonMedicalDisclaimer: string;
}> = {
  'CNS-IN-PERSON': {
    code: 'CNS-IN-PERSON',
    title: 'In-Branch Wellness & Mineral Nutrition Assessment',
    durationMinutes: 45,
    deliveryMode: 'in_person',
    description: 'Comprehensive face-to-face holistic assessment, hydration evaluation, and cellular mineral nutrition education in a private wellness room.',
    supportedBranches: ['daet', 'labo', 'capalonga'],
    feeStatus: 'FEE_PENDING_BUSINESS_CONFIRMATION',
    feeDisplay: 'Professional Consultation Fee: Pending Business Confirmation',
    nonMedicalDisclaimer: 'MAHALAGANG PAALALA: This wellness assessment is nutritional education and does not constitute medical diagnosis or prescription under RA 2382.',
  },
  'CNS-VIRTUAL': {
    code: 'CNS-VIRTUAL',
    title: 'Virtual Tele-Wellness & Hydration Consultation',
    durationMinutes: 30,
    deliveryMode: 'virtual',
    description: 'Secure interactive video wellness session for clients across Camarines Norte and regional Bicol on proper mineral dilution protocols and lifestyle vitality.',
    supportedBranches: ['daet', 'labo', 'paracale', 'jose_panganiban', 'capalonga', 'santa_elena'],
    feeStatus: 'FEE_PENDING_BUSINESS_CONFIRMATION',
    feeDisplay: 'Virtual Consultation Fee: Pending Business Confirmation',
    nonMedicalDisclaimer: 'MAHALAGANG PAALALA: Holistic wellness session only; does not replace medical consultation with a licensed physician.',
  },
  'CNS-FOLLOWUP': {
    code: 'CNS-FOLLOWUP',
    title: 'Follow-Up Progress Review & Routine Calibration',
    durationMinutes: 20,
    deliveryMode: 'virtual',
    description: 'Targeted follow-up session to review hydration routines, daily electrolyte tolerance, and general energy progress.',
    supportedBranches: ['daet', 'labo', 'paracale', 'jose_panganiban', 'capalonga', 'santa_elena'],
    feeStatus: 'FEE_PENDING_BUSINESS_CONFIRMATION',
    feeDisplay: 'Follow-up Review Fee: Pending Business Confirmation',
    nonMedicalDisclaimer: 'MAHALAGANG PAALALA: Progress review for nutritional education purposes only.',
  },
};

export const PRACTITIONER_ROSTER: Record<string, {
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
}> = {
  'practitioner-daet-01': {
    id: 'practitioner-daet-01',
    uid: 'practitioner-daet-01',
    name: 'Dr. Elena Santos, ND (Candidate / Holistic Educator)',
    title: 'Senior Naturopathic Educator & Mineral Nutrition Specialist',
    bio: 'Dedicated wellness advocate specializing in trace mineral assimilation, cellular hydration balance, and Bicolano traditional dietary wellness.',
    credentialsStatus: 'CREDENTIALS_PENDING_BUSINESS_CONFIRMATION',
    certifications: ['Certified Holistic Nutrition Consultant (Pending Verification)', 'Lifestyle Wellness Coach'],
    languages: ['Bikol (Camarines Norte)', 'Tagalog', 'English'],
    assignedBranches: ['daet', 'labo'],
    isAvailableForVirtual: true,
  },
  'practitioner-labo-02': {
    id: 'practitioner-labo-02',
    uid: 'practitioner-labo-02',
    name: 'Gabriel Reyes, CWC',
    title: 'Certified Wellness Coach & Electrolyte Hydration Advisor',
    bio: 'Focuses on workplace hydration ergonomics, mineral deficiency education, and family lifestyle vitality across northern Camarines Norte.',
    credentialsStatus: 'CREDENTIALS_PENDING_BUSINESS_CONFIRMATION',
    certifications: ['Certified Wellness Coach', 'Community Health Educator'],
    languages: ['Tagalog', 'English', 'Bikol'],
    assignedBranches: ['labo', 'capalonga'],
    isAvailableForVirtual: true,
  },
};

export function getHmacSecret(): string {
  const secret = process.env.HMAC_SECRET;
  if (!secret || secret.trim().length === 0) {
    if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
      throw new Error('FATAL SECURITY ERROR: HMAC_SECRET environment variable is missing. System failing closed.');
    }
    return process.env.NODE_ENV === 'test' 
      ? 'TEST_ENVIRONMENT_ONLY_HMAC_SECRET_NON_PRODUCTION_0123456789'
      : 'DEV_ENVIRONMENT_ONLY_HMAC_SECRET_NON_PRODUCTION_FALLBACK';
  }
  return secret.trim();
}

export const SEED_WORKSHOPS = [
  {
    id: 'wk-01-daet',
    title: 'Daet Trace Mineral Science & Hydration Seminar',
    description: 'Learn the molecular difference between tap water and mineral-rich ionic electrolytes. Interactive live dilution demos.',
    branchId: 'daet',
    scheduledDate: '2026-10-15',
    scheduledTime: '14:00',
    capacity: 3, // Set to low capacity to test waitlist transition cleanly
    seatsAllocated: 0,
    waitlistCount: 0,
    createdAt: new Date().toISOString()
  },
  {
    id: 'wk-02-labo',
    title: 'Labo Community Wellness & Soil Mineral Depletion Workshop',
    description: 'Why modern agricultural fruits and vegetables are missing vital trace minerals. Educational guide on CMD supplementation.',
    branchId: 'labo',
    scheduledDate: '2026-10-22',
    scheduledTime: '10:00',
    capacity: 25,
    seatsAllocated: 0,
    waitlistCount: 0,
    createdAt: new Date().toISOString()
  },
  {
    id: 'wk-03-capalonga',
    title: 'Capalonga Coastal Electrolyte Balance Symposium',
    description: 'Hydration wellness education specifically tailored for coastal, fishing, and high-exertion communities.',
    branchId: 'capalonga',
    scheduledDate: '2026-10-29',
    scheduledTime: '13:00',
    capacity: 30,
    seatsAllocated: 0,
    waitlistCount: 0,
    createdAt: new Date().toISOString()
  }
];

export function generateRegistrationSignature(registrationId: string, userId: string, workshopId: string, status: string): string {
  const secret = getHmacSecret();
  const payload = `${registrationId}:${userId}:${workshopId}:${status}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function verifyRegistrationSignature(registrationId: string, userId: string, workshopId: string, status: string, signature: string): boolean {
  const expected = generateRegistrationSignature(registrationId, userId, workshopId, status);
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expected, 'utf8'));
}

// Statutory 7-Day SLA for Consumer Redress under RA 11967
export const RA11967_SLA_DAYS = 7;
export const RA11967_SLA_MS = RA11967_SLA_DAYS * 24 * 60 * 60 * 1000;

export const VALID_TICKET_CATEGORIES = [
  'damaged_product',
  'delivery_delay',
  'billing_issue',
  'product_inquiry',
  'statutory_dpa_inquiry',
  'wrong_item',
  'cancellation_refund',
] as const;

export const SUPPORTED_BRANCH_IDS = [
  'daet',
  'labo',
  'capalonga',
  'paracale',
  'jose_panganiban',
  'santa_elena',
] as const;

export const VALID_TICKET_STATUSES = [
  'submitted',
  'under_investigation',
  'escalated_sla_breach',
  'resolved',
  'closed',
] as const;

export function evaluateSlaEscalation(ticket: any): boolean {
  if (ticket.status !== 'resolved' && ticket.status !== 'closed' && !ticket.isEscalated) {
    const due = Date.parse(ticket.slaDueAt);
    if (!isNaN(due) && Date.now() > due) {
      ticket.isEscalated = true;
      const prev = ticket.status;
      ticket.status = 'escalated_sla_breach';
      ticket.updatedAt = new Date().toISOString();
      if (!Array.isArray(ticket.escalationHistory)) {
        ticket.escalationHistory = [];
      }
      ticket.escalationHistory.push({
        escalatedAt: new Date().toISOString(),
        reason: 'Statutory 7-day internal dispute resolution SLA expired under RA 11967.',
        previousStatus: prev,
      });
      dispatchAlert({
        category: 'sla_breach',
        severity: 'SEV-3',
        message: `RA 11967 Statutory 7-day dispute resolution SLA breached for support ticket ${ticket.id}`,
        details: {
          ticketId: ticket.id,
          category: ticket.category,
          customerUid: ticket.userId,
          slaDueAt: ticket.slaDueAt,
        },
      }).catch(() => {});
      return true;
    }
  }
  return false;
}

// Phase 6C Milestone 2: Authoritative CRM Cohort Definitions
export const CRM_COHORTS: Record<string, { key: string; label: string; description: string }> = {
  wholesale_stockist: {
    key: 'wholesale_stockist',
    label: 'Wholesale / Stockist',
    description: 'High-volume commercial accounts and distribution partners with cumulative spend >= ₱5,000 or bulk order volume.',
  },
  repeat_retail: {
    key: 'repeat_retail',
    label: 'Repeat Retail',
    description: 'Committed direct consumers who have completed 2 or more retail mineral orders.',
  },
  wellness_seminar_attendees: {
    key: 'wellness_seminar_attendees',
    label: 'Wellness Seminar Attendees',
    description: 'Participants verified as having attended one or more provincial hydration symposia or wellness seminars.',
  },
  replenishment_due: {
    key: 'replenishment_due',
    label: 'Replenishment Due',
    description: 'Accounts approaching end of 30-day bottle cycle (last order placed between 21 and 45 days ago).',
  },
  lapsed_accounts: {
    key: 'lapsed_accounts',
    label: 'Lapsed Accounts',
    description: 'Previous purchasers with no order activity for more than 45 days.',
  },
};

export interface RawCrmSourceData {
  users: any[];
  orders: any[];
  registrations: any[];
}

export function getAuthoritativeRegistrationBranch(reg: any): string | undefined {
  if (!reg || typeof reg !== 'object') return undefined;

  const foundBranches = new Set<string>();

  if (typeof reg.branchId === 'string' && reg.branchId.trim().length > 0) {
    foundBranches.add(reg.branchId.trim().toLowerCase());
  }
  if (typeof reg.workshopBranch === 'string' && reg.workshopBranch.trim().length > 0) {
    foundBranches.add(reg.workshopBranch.trim().toLowerCase());
  }
  if (typeof reg.workshopId === 'string' && reg.workshopId.trim().length > 0) {
    const known = SEED_WORKSHOPS.find((w) => w.id === reg.workshopId.trim());
    if (known && typeof known.branchId === 'string' && known.branchId.trim().length > 0) {
      foundBranches.add(known.branchId.trim().toLowerCase());
    }
  }

  // If conflicting branch metadata exists, treat as ambiguous and fail closed
  if (foundBranches.size !== 1) {
    return undefined;
  }

  return Array.from(foundBranches)[0];
}

export function aggregateCustomerCrmProfiles(
  data: RawCrmSourceData,
  branchFilter?: string | null,
  nowMs: number = Date.now()
): any[] {
  const normalizedBranch = branchFilter ? branchFilter.trim().toLowerCase() : null;

  const ordersByUser = new Map<string, any[]>();
  for (const ord of data.orders) {
    if (!ord.userId) continue;
    if (normalizedBranch && (typeof ord.branchId !== 'string' || ord.branchId.toLowerCase() !== normalizedBranch)) continue;
    const list = ordersByUser.get(ord.userId) || [];
    list.push(ord);
    ordersByUser.set(ord.userId, list);
  }

  const attendanceByUser = new Map<string, number>();
  for (const reg of data.registrations) {
    if (!reg.userId) continue;
    if (normalizedBranch) {
      const regBranch = getAuthoritativeRegistrationBranch(reg);
      if (!regBranch || regBranch !== normalizedBranch) continue;
    }
    if (reg.status === 'attended') {
      attendanceByUser.set(reg.userId, (attendanceByUser.get(reg.userId) || 0) + 1);
    }
  }

  const userMap = new Map<string, any>();
  for (const u of data.users) {
    if (u.uid) userMap.set(u.uid, u);
  }

  const candidateUserIds = new Set<string>();
  for (const uid of ordersByUser.keys()) {
    candidateUserIds.add(uid);
  }

  if (normalizedBranch) {
    for (const [uid, u] of userMap.entries()) {
      if (typeof u.assignedBranchId === 'string' && u.assignedBranchId.toLowerCase() === normalizedBranch && u.role === 'customer') {
        candidateUserIds.add(uid);
      }
    }
    for (const reg of data.registrations) {
      if (!reg.userId) continue;
      const regBranch = getAuthoritativeRegistrationBranch(reg);
      if (regBranch && regBranch === normalizedBranch && reg.status === 'attended') {
        candidateUserIds.add(reg.userId);
      }
    }
  } else {
    for (const [uid, u] of userMap.entries()) {
      if (u.role === 'customer') {
        candidateUserIds.add(uid);
      }
    }
  }

  const results: any[] = [];

  for (const userId of candidateUserIds) {
    const user = userMap.get(userId);
    const userOrders = ordersByUser.get(userId) || [];
    const workshopCount = attendanceByUser.get(userId) || 0;

    let totalSpent = 0;
    let maxOrderSpend = 0;
    let totalUnits = 0;
    let latestOrderMs = 0;
    let primaryBranch = branchFilter || user?.assignedBranchId || 'daet';

    for (const ord of userOrders) {
      if (ord.fulfillmentStatus === 'cancelled') continue;
      const spend = Number(ord.grandTotal) || 0;
      totalSpent += spend;
      if (spend > maxOrderSpend) maxOrderSpend = spend;
      if (ord.branchId) primaryBranch = ord.branchId;

      if (Array.isArray(ord.items)) {
        for (const it of ord.items) {
          totalUnits += Number(it.quantity) || 1;
        }
      }

      const ordTime = Date.parse(ord.createdAt);
      if (!isNaN(ordTime) && ordTime > latestOrderMs) {
        latestOrderMs = ordTime;
      }
    }

    const totalOrders = userOrders.filter((o) => o.fulfillmentStatus !== 'cancelled').length;
    const lastOrderDate = latestOrderMs > 0 ? new Date(latestOrderMs).toISOString() : undefined;
    const daysSinceLastOrder =
      latestOrderMs > 0 ? Math.floor((nowMs - latestOrderMs) / (24 * 60 * 60 * 1000)) : undefined;

    const cohorts: string[] = [];

    // 1. Wholesale / Stockist: cumulative spend >= 5000 or single order >= 5000 or units >= 5
    if (totalSpent >= 5000 || maxOrderSpend >= 5000 || totalUnits >= 5) {
      cohorts.push('wholesale_stockist');
    }

    // 2. Repeat Retail: >= 2 confirmed orders
    if (totalOrders >= 2) {
      cohorts.push('repeat_retail');
    }

    // 3. Wellness Seminar Attendees: attended >= 1 workshop
    if (workshopCount >= 1) {
      cohorts.push('wellness_seminar_attendees');
    }

    // 4. Replenishment Due: ordered previously, 21 <= daysSinceLastOrder <= 45
    if (daysSinceLastOrder !== undefined && daysSinceLastOrder >= 21 && daysSinceLastOrder <= 45) {
      cohorts.push('replenishment_due');
    }

    // 5. Lapsed Accounts: ordered previously, daysSinceLastOrder > 45
    if (daysSinceLastOrder !== undefined && daysSinceLastOrder > 45) {
      cohorts.push('lapsed_accounts');
    }

    const latestOrder = userOrders[userOrders.length - 1];
    let customerName = 'Valued Customer';
    if (user?.firstName || user?.lastName) {
      customerName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    } else if (latestOrder?.customer?.firstName || latestOrder?.customer?.lastName) {
      customerName = `${latestOrder.customer.firstName || ''} ${latestOrder.customer.lastName || ''}`.trim();
    } else if (user?.email) {
      customerName = user.email.split('@')[0];
    }

    const customerEmail = user?.email || latestOrder?.customer?.email || 'unregistered@hcicmd.ph';
    const customerPhone = user?.phone || latestOrder?.customer?.phone || undefined;

    results.push({
      userId,
      customerName,
      customerEmail,
      customerPhone,
      branchId: primaryBranch,
      totalOrders,
      totalSpent,
      lastOrderDate,
      daysSinceLastOrder,
      workshopAttendanceCount: workshopCount,
      cohorts,
    });
  }

  return results;
}

// --- PHASE 6C MILESTONE 3: Finance, Expenses & Commodity Analytics Functions ---

export const EXPENSE_CATEGORIES = [
  'procurement_raw_materials',
  'packaging_bottles_droppers',
  'agricultural_copra_processing',
  'agricultural_rice_milling',
  'branch_rent_utilities',
  'logistics_freight',
  'practitioner_stipends',
  'marketing_symposia',
  'miscellaneous',
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export function parseDateBoundary(dateStr?: string, isEnd = false, tzOffset = '+08:00'): number {
  if (!dateStr) return isEnd ? Number.MAX_SAFE_INTEGER : 0;
  if (dateStr.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const formattedTz = tzOffset.startsWith('+') || tzOffset.startsWith('-') ? tzOffset : `+${tzOffset}`;
    const isoWithTz = isEnd
      ? `${dateStr}T23:59:59.999${formattedTz}`
      : `${dateStr}T00:00:00.000${formattedTz}`;
    const parsed = Date.parse(isoWithTz);
    return isNaN(parsed) ? (isEnd ? Number.MAX_SAFE_INTEGER : 0) : parsed;
  }
  const parsed = Date.parse(dateStr);
  return isNaN(parsed) ? (isEnd ? Number.MAX_SAFE_INTEGER : 0) : parsed;
}

export function calculateFinancialMetrics(params: {
  orders: any[];
  expenses: any[];
  startDate?: string;
  endDate?: string;
  branchId?: string | null;
}) {
  const { orders = [], expenses = [], startDate, endDate, branchId } = params;

  const startMs = parseDateBoundary(startDate, false);
  const endMs = parseDateBoundary(endDate, true);

  // Filter expenses
  const filteredExpenses = expenses.filter((exp) => {
    if (branchId && exp.branchId !== branchId) return false;
    const incurredMs = Date.parse(exp.incurredAt || exp.createdAt);
    if (!isNaN(incurredMs)) {
      if (incurredMs < startMs || incurredMs > endMs) return false;
    }
    return true;
  });

  // Filter orders (ignore cancelled/refunded)
  const filteredOrders = orders.filter((ord) => {
    if (ord.fulfillmentStatus === 'cancelled' || ord.status === 'cancelled' || ord.status === 'refunded') return false;
    if (branchId && ord.branchId !== branchId) return false;
    const orderMs = Date.parse(ord.createdAt);
    if (!isNaN(orderMs)) {
      if (orderMs < startMs || orderMs > endMs) return false;
    }
    return true;
  });

  let revenue = 0;
  let cashReceived = 0;
  let accountsReceivable = 0;

  for (const ord of filteredOrders) {
    const total = Number(ord.grandTotal ?? ord.total ?? 0);
    revenue += total;
    if (ord.paymentStatus === 'paid') {
      cashReceived += total;
    } else {
      accountsReceivable += total;
    }
  }

  let totalExpensesIncurred = 0;
  let totalExpensesPaid = 0;
  let accountsPayable = 0;

  const expensesByCategory: Record<string, number> = {
    procurement_raw_materials: 0,
    packaging_bottles_droppers: 0,
    agricultural_copra_processing: 0,
    agricultural_rice_milling: 0,
    branch_rent_utilities: 0,
    logistics_freight: 0,
    practitioner_stipends: 0,
    marketing_symposia: 0,
    miscellaneous: 0,
  };

  for (const exp of filteredExpenses) {
    const amount = Number(exp.amount) || 0;
    totalExpensesIncurred += amount;
    if (exp.expenseStatus === 'paid') {
      totalExpensesPaid += amount;
    } else {
      accountsPayable += amount;
    }

    if (expensesByCategory[exp.category] !== undefined) {
      expensesByCategory[exp.category] += amount;
    } else {
      expensesByCategory.miscellaneous += amount;
    }
  }

  const cashPaid = totalExpensesPaid;
  const netIncomeAccrual = revenue - totalExpensesIncurred;
  const netCashFlow = cashReceived - cashPaid;

  return {
    dateRange: {
      startDate: startDate || (startMs > 0 ? new Date(startMs).toISOString() : new Date(0).toISOString()),
      endDate: endDate || (endMs < Number.MAX_SAFE_INTEGER ? new Date(endMs).toISOString() : new Date().toISOString()),
    },
    branchId: branchId || undefined,
    revenue: Math.round(revenue * 100) / 100,
    totalExpensesIncurred: Math.round(totalExpensesIncurred * 100) / 100,
    totalExpensesPaid: Math.round(totalExpensesPaid * 100) / 100,
    netIncomeAccrual: Math.round(netIncomeAccrual * 100) / 100,
    netCashFlow: Math.round(netCashFlow * 100) / 100,
    cashReceived: Math.round(cashReceived * 100) / 100,
    cashPaid: Math.round(cashPaid * 100) / 100,
    accountsReceivable: Math.round(accountsReceivable * 100) / 100,
    accountsPayable: Math.round(accountsPayable * 100) / 100,
    expensesByCategory,
    orderCount: filteredOrders.length,
    expenseCount: filteredExpenses.length,
  };
}

export function calculateCommodityProfitability(
  expenses: any[],
  orders: any[],
  commodityType: 'rice' | 'copra',
  branchId?: string | null
) {
  const relevantExpenses = expenses.filter((exp) => {
    if (branchId && exp.branchId !== branchId) return false;
    const cat = exp.category;
    const isCatMatch =
      commodityType === 'rice'
        ? cat === 'agricultural_rice_milling' || exp.commodityMetadata?.commodityType === 'rice'
        : cat === 'agricultural_copra_processing' || exp.commodityMetadata?.commodityType === 'copra';
    return isCatMatch;
  });

  let totalVolumeProcuredKg = 0;
  let totalAcquisitionCost = 0;
  let totalProcessingCost = 0;

  for (const exp of relevantExpenses) {
    const meta = exp.commodityMetadata;
    const amt = Number(exp.amount) || 0;
    if (meta && meta.commodityType === commodityType) {
      const vol = Number(meta.volumeKg) || 0;
      const acqCost = Number(meta.acquisitionCostPerKg) ? vol * Number(meta.acquisitionCostPerKg) : amt;
      const procFee = Number(meta.millingOrDryingFee) || 0;
      totalVolumeProcuredKg += vol;
      totalAcquisitionCost += acqCost;
      totalProcessingCost += procFee;
    } else {
      totalProcessingCost += amt;
    }
  }

  const totalCostBasis = totalAcquisitionCost + totalProcessingCost;
  const unitCostPerKg = totalVolumeProcuredKg > 0 ? totalCostBasis / totalVolumeProcuredKg : 0;

  let totalVolumeSoldKg = 0;
  let totalSalesRevenue = 0;

  for (const ord of orders) {
    if (ord.fulfillmentStatus === 'cancelled' || ord.status === 'cancelled') continue;
    if (branchId && ord.branchId !== branchId) continue;
    if (Array.isArray(ord.items)) {
      for (const item of ord.items) {
        const name = String(item.productName || item.name || '').toLowerCase();
        const sku = String(item.skuId || item.sku || item.id || '').toLowerCase();
        const matchesCommodity =
          commodityType === 'rice'
            ? name.includes('rice') || sku.includes('rice')
            : name.includes('copra') || sku.includes('copra') || name.includes('coconut');

        if (matchesCommodity) {
          const qty = Number(item.quantity) || 1;
          const unitPrice = Number(item.unitPrice !== undefined ? item.unitPrice : item.price) || 0;
          let itemKg = Number(item.volumeKg);
          if (isNaN(itemKg) || itemKg <= 0) {
            if (name.includes('50kg') || name.includes('50 kg') || name.includes('sack')) {
              itemKg = 50 * qty;
            } else if (name.includes('25kg') || name.includes('25 kg')) {
              itemKg = 25 * qty;
            } else if (name.includes('10kg') || name.includes('10 kg')) {
              itemKg = 10 * qty;
            } else if (name.includes('5kg') || name.includes('5 kg')) {
              itemKg = 5 * qty;
            } else {
              itemKg = 1 * qty;
            }
          }

          const revenueFromItem = Number(item.totalPrice !== undefined ? item.totalPrice : unitPrice * qty);
          totalVolumeSoldKg += itemKg;
          totalSalesRevenue += revenueFromItem;
        }
      }
    }
  }

  const weightedAverageSellingPrice =
    totalVolumeSoldKg > 0 ? totalSalesRevenue / totalVolumeSoldKg : 0;

  const grossProfit = totalSalesRevenue - unitCostPerKg * totalVolumeSoldKg;
  const grossMarginPercent =
    totalSalesRevenue > 0 ? (grossProfit / totalSalesRevenue) * 100 : 0;

  return {
    commodityType,
    totalVolumeProcuredKg: Math.round(totalVolumeProcuredKg * 100) / 100,
    totalAcquisitionCost: Math.round(totalAcquisitionCost * 100) / 100,
    totalProcessingCost: Math.round(totalProcessingCost * 100) / 100,
    totalCostBasis: Math.round(totalCostBasis * 100) / 100,
    totalVolumeSoldKg: Math.round(totalVolumeSoldKg * 100) / 100,
    totalSalesRevenue: Math.round(totalSalesRevenue * 100) / 100,
    weightedAverageSellingPrice: Math.round(weightedAverageSellingPrice * 100) / 100,
    unitCostPerKg: Math.round(unitCostPerKg * 100) / 100,
    grossProfit: Math.round(grossProfit * 100) / 100,
    grossMarginPercent: Math.round(grossMarginPercent * 100) / 100,
  };
}

// --- PHASE 7 MILESTONE 1: Multi-Branch Inventory & Stock Reconciliation ---

export const ACTIVE_CONSUMER_SKUS = ['hci-cmd-65ml', 'hci-cmd-30ml'] as const;
export type ActiveConsumerSku = typeof ACTIVE_CONSUMER_SKUS[number];

export const VALID_INVENTORY_ADJUSTMENT_TYPES = [
  'count_reconciliation',
  'damage_writeoff',
  'sample_withdrawal',
  'shrinkage_loss',
  'qc_quarantine',
] as const;

export type InventoryAdjustmentType = typeof VALID_INVENTORY_ADJUSTMENT_TYPES[number];

export interface BranchBatchInventoryRecord {
  id: string; // branchId_batchId
  branchId: string;
  batchId: string;
  skuId: string;
  availableQuantity: number;
  reservedQuantity: number;
  damagedQuantity: number;
  expiryDate: string;
  updatedAt: string;
}

export interface InventoryItemRecord {
  id: string; // branchId_skuId
  branchId: string;
  skuId: string;
  activeStock: number;
  reservedStock: number;
  transitStock: number;
  safetyStock: number;
  reorderPoint: number;
  leadTimeDays: number;
  lastAdjustmentAt?: string;
  updatedAt: string;
}

export interface ProductBatchRecord {
  id: string;
  batchNumber: string;
  skuId: string;
  manufactureDate: string;
  expiryDate: string;
  laboratoryCertificateUrl?: string;
  qualityControlStatus: 'pending' | 'passed' | 'failed';
  totalManufacturedQuantity: number;
  procurementCostBasis?: number;
  createdAt: string;
}

export interface InventoryAdjustmentRecord {
  id: string;
  branchId: string;
  skuId: string;
  batchId: string;
  adjustmentType: InventoryAdjustmentType;
  quantityDelta: number;
  reason: string;
  performedByUid: string;
  performedByName?: string;
  timestamp: string;
}

// --- PHASE 7 MILESTONE 6: B2B Bulk Stockist Portal & Credit Controls ---

export type B2BStockistTier = 'tier_1' | 'tier_2' | 'tier_3';

export interface B2BStockistTierConfig {
  tier: B2BStockistTier;
  name: string;
  minUnits: number;
  discountRate: number; // e.g. 0.15 for 15%
}

export const B2B_STOCKIST_TIERS: Record<B2BStockistTier, B2BStockistTierConfig> = {
  tier_1: {
    tier: 'tier_1',
    name: 'Stockist Partner (Tier 1)',
    minUnits: 50,
    discountRate: 0.15,
  },
  tier_2: {
    tier: 'tier_2',
    name: 'Municipal Distributor (Tier 2)',
    minUnits: 200,
    discountRate: 0.25,
  },
  tier_3: {
    tier: 'tier_3',
    name: 'Regional Stockist (Tier 3)',
    minUnits: 500,
    discountRate: 0.35,
  },
};

export interface B2BStockistProfile {
  id: string; // e.g. STK-DAET-001
  businessName: string;
  contactEmail: string;
  contactPhone?: string;
  branchId: string;
  tier: B2BStockistTier;
  status: 'active' | 'locked' | 'suspended';
  depositBalance: number;
  creditMultiplier: number;
  creditLimit: number;
  outstandingBalance: number;
  availableCredit: number;
  authorizedCustomerUid?: string;
  createdAt: string;
  updatedAt: string;
}

export type B2BConsignmentLedgerType = 'deposit' | 'order_debit' | 'payment_credit' | 'adjustment';

export interface B2BConsignmentLedgerEntry {
  id: string;
  stockistId: string;
  branchId: string;
  type: B2BConsignmentLedgerType;
  amount: number;
  previousDeposit: number;
  depositAfter: number;
  previousOutstanding: number;
  outstandingAfter: number;
  referenceId?: string;
  notes?: string;
  timestamp: string;
  performedBy: string;
}

export function calculateB2BWholesalePricing(
  tier: B2BStockistTier,
  items: Array<{ skuId: string; quantity: number }>
) {
  const tierConfig = B2B_STOCKIST_TIERS[tier] || B2B_STOCKIST_TIERS.tier_1;
  const totalUnits = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  const isEligible = totalUnits >= tierConfig.minUnits;

  let retailSubtotal = 0;
  let wholesaleTotal = 0;

  const computedItems = items.map((item) => {
    const prod = PRODUCTS_CATALOG[item.skuId] || { price: 0, name: item.skuId };
    const qty = Number(item.quantity) || 0;
    const retailUnitPrice = prod.price;
    const wholesaleUnitPrice = Math.round(retailUnitPrice * (1 - tierConfig.discountRate) * 100) / 100;
    const retailItemTotal = retailUnitPrice * qty;
    const wholesaleItemTotal = wholesaleUnitPrice * qty;

    retailSubtotal += retailItemTotal;
    wholesaleTotal += wholesaleItemTotal;

    return {
      skuId: item.skuId,
      productName: prod.name,
      quantity: qty,
      retailUnitPrice,
      discountRate: tierConfig.discountRate,
      wholesaleUnitPrice,
      retailItemTotal,
      wholesaleItemTotal,
    };
  });

  const discountAmount = retailSubtotal - wholesaleTotal;

  return {
    tierConfig,
    totalUnits,
    isEligible,
    minUnits: tierConfig.minUnits,
    discountRate: tierConfig.discountRate,
    retailSubtotal,
    discountAmount,
    wholesaleTotal,
    items: computedItems,
  };
}

export function calculateB2BCreditLimits(
  depositBalance: number,
  creditMultiplier = 2.0,
  outstandingBalance = 0,
  customCreditLimit?: number
) {
  const deposit = Math.max(0, Number(depositBalance) || 0);
  const mult = Math.max(1, Number(creditMultiplier) || 2.0);
  const creditLimit = customCreditLimit !== undefined ? Number(customCreditLimit) : deposit * mult;
  const outstanding = Math.max(0, Number(outstandingBalance) || 0);
  const availableCredit = Math.max(0, creditLimit - outstanding);

  return {
    depositBalance: deposit,
    creditMultiplier: mult,
    creditLimit,
    outstandingBalance: outstanding,
    availableCredit,
  };
}

export const SEED_PRODUCT_BATCHES: ProductBatchRecord[] = [
  {
    id: 'batch-2026-09a',
    batchNumber: 'CMD-2026-09A',
    skuId: 'hci-cmd-65ml',
    manufactureDate: '2026-03-01',
    expiryDate: '2028-09-30',
    laboratoryCertificateUrl: 'https://certs.hcicmd.ph/fda-qc-2026-09a.pdf',
    qualityControlStatus: 'passed',
    totalManufacturedQuantity: 1000,
    procurementCostBasis: 450000,
    createdAt: '2026-03-01T08:00:00.000Z',
  },
  {
    id: 'batch-2026-09b',
    batchNumber: 'CMD-2026-09B',
    skuId: 'hci-cmd-65ml',
    manufactureDate: '2026-04-01',
    expiryDate: '2028-10-31',
    laboratoryCertificateUrl: 'https://certs.hcicmd.ph/fda-qc-2026-09b.pdf',
    qualityControlStatus: 'passed',
    totalManufacturedQuantity: 1000,
    procurementCostBasis: 450000,
    createdAt: '2026-04-01T08:00:00.000Z',
  },
  {
    id: 'batch-2026-30a',
    batchNumber: 'CMD-30-2026-01',
    skuId: 'hci-cmd-30ml',
    manufactureDate: '2026-03-15',
    expiryDate: '2028-09-15',
    laboratoryCertificateUrl: 'https://certs.hcicmd.ph/fda-qc-30-2026-01.pdf',
    qualityControlStatus: 'passed',
    totalManufacturedQuantity: 1200,
    procurementCostBasis: 300000,
    createdAt: '2026-03-15T08:00:00.000Z',
  },
];

export const SEED_BRANCH_BATCH_INVENTORY: BranchBatchInventoryRecord[] = [
  {
    id: 'daet_batch-2026-09a',
    branchId: 'daet',
    batchId: 'batch-2026-09a',
    skuId: 'hci-cmd-65ml',
    availableQuantity: 120,
    reservedQuantity: 10,
    damagedQuantity: 0,
    expiryDate: '2028-09-30',
    updatedAt: '2026-09-27T00:00:00.000Z',
  },
  {
    id: 'daet_batch-2026-09b',
    branchId: 'daet',
    batchId: 'batch-2026-09b',
    skuId: 'hci-cmd-65ml',
    availableQuantity: 80,
    reservedQuantity: 0,
    damagedQuantity: 0,
    expiryDate: '2028-10-31',
    updatedAt: '2026-09-27T00:00:00.000Z',
  },
  {
    id: 'daet_batch-2026-30a',
    branchId: 'daet',
    batchId: 'batch-2026-30a',
    skuId: 'hci-cmd-30ml',
    availableQuantity: 150,
    reservedQuantity: 5,
    damagedQuantity: 0,
    expiryDate: '2028-09-15',
    updatedAt: '2026-09-27T00:00:00.000Z',
  },
  {
    id: 'labo_batch-2026-09a',
    branchId: 'labo',
    batchId: 'batch-2026-09a',
    skuId: 'hci-cmd-65ml',
    availableQuantity: 60,
    reservedQuantity: 5,
    damagedQuantity: 0,
    expiryDate: '2028-09-30',
    updatedAt: '2026-09-27T00:00:00.000Z',
  },
  {
    id: 'labo_batch-2026-30a',
    branchId: 'labo',
    batchId: 'batch-2026-30a',
    skuId: 'hci-cmd-30ml',
    availableQuantity: 90,
    reservedQuantity: 0,
    damagedQuantity: 0,
    expiryDate: '2028-09-15',
    updatedAt: '2026-09-27T00:00:00.000Z',
  },
];

export function computeAggregateInventoryFromBatches(params: {
  branchBatches: BranchBatchInventoryRecord[];
  branchId: string;
  skuId: string;
  transitStock?: number;
  safetyStock?: number;
  reorderPoint?: number;
  leadTimeDays?: number;
  lastAdjustmentAt?: string;
}): InventoryItemRecord {
  const {
    branchBatches,
    branchId,
    skuId,
    transitStock = 0,
    safetyStock = 20,
    reorderPoint = 30,
    leadTimeDays = 3,
    lastAdjustmentAt,
  } = params;

  const relevantBatches = branchBatches.filter(
    (b) => b.branchId === branchId && b.skuId === skuId
  );

  let activeStock = 0;
  let reservedStock = 0;

  for (const b of relevantBatches) {
    activeStock += Number(b.availableQuantity) || 0;
    reservedStock += Number(b.reservedQuantity) || 0;
  }

  return {
    id: `${branchId}_${skuId}`,
    branchId,
    skuId,
    activeStock,
    reservedStock,
    transitStock,
    safetyStock,
    reorderPoint,
    leadTimeDays,
    lastAdjustmentAt: lastAdjustmentAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function verifyInventoryReconciliation(params: {
  branchBatches: BranchBatchInventoryRecord[];
  aggregateInventory: InventoryItemRecord[];
  branchId?: string | null;
  skuId?: string | null;
}) {
  const { branchBatches, aggregateInventory, branchId, skuId } = params;

  const results: Array<{
    branchId: string;
    skuId: string;
    aggregateActiveStock: number;
    aggregateReservedStock: number;
    batchAvailableSum: number;
    batchReservedSum: number;
    isConsistent: boolean;
    divergenceDelta: number;
    checkedAt: string;
  }> = [];

  const branchesToCheck = branchId ? [branchId] : [...SUPPORTED_BRANCH_IDS];
  const skusToCheck = skuId ? [skuId] : [...ACTIVE_CONSUMER_SKUS];

  let allConsistent = true;

  for (const bId of branchesToCheck) {
    for (const sId of skusToCheck) {
      const agg = aggregateInventory.find((item) => item.branchId === bId && item.skuId === sId);
      const batches = branchBatches.filter((b) => b.branchId === bId && b.skuId === sId);

      const batchAvailableSum = batches.reduce((sum, b) => sum + (Number(b.availableQuantity) || 0), 0);
      const batchReservedSum = batches.reduce((sum, b) => sum + (Number(b.reservedQuantity) || 0), 0);

      const aggActive = agg ? Number(agg.activeStock) || 0 : 0;
      const aggReserved = agg ? Number(agg.reservedStock) || 0 : 0;

      const activeDiff = Math.abs(aggActive - batchAvailableSum);
      const reservedDiff = Math.abs(aggReserved - batchReservedSum);
      const divergenceDelta = activeDiff + reservedDiff;
      const isConsistent = divergenceDelta === 0;

      if (!isConsistent) {
        allConsistent = false;
      }

      results.push({
        branchId: bId,
        skuId: sId,
        aggregateActiveStock: aggActive,
        aggregateReservedStock: aggReserved,
        batchAvailableSum,
        batchReservedSum,
        isConsistent,
        divergenceDelta,
        checkedAt: new Date().toISOString(),
      });
    }
  }

  return {
    allConsistent,
    totalRecordsChecked: results.length,
    reconciliationResults: results,
  };
}


export function getDailyConsultationSlots(dateStr: string, practitionerId: string) {
  const slotDefinitions = [
    { start: '09:00', end: '09:45' },
    { start: '10:00', end: '10:45' },
    { start: '11:00', end: '11:45' },
    { start: '13:30', end: '14:15' },
    { start: '14:30', end: '15:15' },
    { start: '15:30', end: '16:15' },
    { start: '16:30', end: '17:15' },
  ];

  return slotDefinitions.map((slot) => ({
    slotId: `${practitionerId}_${dateStr}_${slot.start.replace(':', '')}`,
    practitionerId,
    date: dateStr,
    startTime: slot.start,
    endTime: slot.end,
  }));
}

export const KMS_KEY_NAME = 'projects/gen-lang-client-0427039673/locations/global/keyRings/hic-cmd-keyring/cryptoKeys/clinical-spi-key';

export interface AuthenticatedUser {
  uid: string;
  role: 'customer' | 'practitioner' | 'branch_manager' | 'regional_director' | 'super_admin';
  assignedBranchId?: string;
  email?: string;
}

// ============================================================================
// PRIORITY B: PAYMENT PROVIDER ABSTRACTION LAYER
// ============================================================================

export type PaymentProviderType =
  | 'simulated_cod'
  | 'simulated_digital_wallet'
  | 'simulated_card'
  | 'stripe'
  | 'paymongo'
  | 'gcash';

export type PaymentStatus =
  | 'pending_payment'
  | 'authorized'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export interface PaymentIntent {
  paymentId: string;
  orderId: string;
  provider: PaymentProviderType;
  amount: number;
  currency: 'PHP';
  status: PaymentStatus;
  providerReference: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRefundResult {
  refundId: string;
  status: 'refunded' | 'failed';
  amount: number;
  processedAt: string;
}

export interface PaymentProvider {
  providerType: PaymentProviderType;
  createPaymentIntent(
    orderId: string,
    amount: number,
    paymentMethod: string,
    metadata?: Record<string, any>,
    idempotencyKey?: string
  ): Promise<PaymentIntent>;
  confirmPayment(paymentId: string, externalReference?: string): Promise<PaymentIntent>;
  processRefund(
    paymentId: string,
    amount: number,
    reason: string,
    idempotencyKey?: string
  ): Promise<PaymentRefundResult>;
}

export class SimulatedPaymentAdapter implements PaymentProvider {
  public createCount = 0;
  public refundCount = 0;
  public lastPaymentKey = '';
  public lastRefundKey = '';
  private paymentIntentsMap: Map<string, PaymentIntent> = new Map();
  private refundResultsMap: Map<string, PaymentRefundResult> = new Map();

  constructor(public providerType: PaymentProviderType = 'simulated_cod') {}

  async createPaymentIntent(
    orderId: string,
    amount: number,
    paymentMethod: string,
    metadata: Record<string, any> = {},
    idempotencyKey?: string
  ): Promise<PaymentIntent> {
    if (idempotencyKey) {
      this.lastPaymentKey = idempotencyKey;
      if (this.paymentIntentsMap.has(idempotencyKey)) {
        return this.paymentIntentsMap.get(idempotencyKey)!;
      }
    }

    this.createCount++;

    const isCod = paymentMethod === 'cash_on_delivery' || paymentMethod === 'cash_on_pickup';
    const status: PaymentStatus = isCod ? 'pending_payment' : 'paid';
    const refPrefix = isCod ? 'COD' : paymentMethod === 'gcash' || paymentMethod === 'maya' ? 'WAL' : 'CARD';
    const nowIso = new Date().toISOString();

    const intent: PaymentIntent = {
      paymentId: `PAY-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
      orderId,
      provider: this.providerType,
      amount,
      currency: 'PHP',
      status,
      providerReference: idempotencyKey ? `${refPrefix}-${idempotencyKey}` : `${refPrefix}-${Date.now()}`,
      metadata: { ...metadata, idempotencyKey },
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (idempotencyKey) {
      this.paymentIntentsMap.set(idempotencyKey, intent);
    }
    return intent;
  }

  async confirmPayment(paymentId: string, externalReference?: string): Promise<PaymentIntent> {
    const nowIso = new Date().toISOString();
    return {
      paymentId,
      orderId: '',
      provider: this.providerType,
      amount: 0,
      currency: 'PHP',
      status: 'paid',
      providerReference: externalReference || `CONF-${Date.now()}`,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  }

  async processRefund(
    paymentId: string,
    amount: number,
    _reason: string,
    idempotencyKey?: string
  ): Promise<PaymentRefundResult> {
    if (idempotencyKey) {
      this.lastRefundKey = idempotencyKey;
      if (this.refundResultsMap.has(idempotencyKey)) {
        return this.refundResultsMap.get(idempotencyKey)!;
      }
    }

    this.refundCount++;

    const result: PaymentRefundResult = {
      refundId: `RFD-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
      status: 'refunded',
      amount,
      processedAt: new Date().toISOString(),
    };

    if (idempotencyKey) {
      this.refundResultsMap.set(idempotencyKey, result);
    }
    return result;
  }
}

export class PaymentAdapterRegistry {
  private static adapters: Map<string, PaymentProvider> = new Map();

  static registerAdapter(type: PaymentProviderType | string, adapter: PaymentProvider) {
    this.adapters.set(type, adapter);
  }

  static getAdapter(paymentMethod: string): PaymentProvider {
    if (this.adapters.has(paymentMethod)) {
      return this.adapters.get(paymentMethod)!;
    }
    if (paymentMethod === 'gcash' || paymentMethod === 'maya' || paymentMethod === 'digital_wallet') {
      return this.adapters.get('simulated_digital_wallet') || new SimulatedPaymentAdapter('simulated_digital_wallet');
    }
    if (paymentMethod === 'credit_card' || paymentMethod === 'stripe') {
      return this.adapters.get('simulated_card') || new SimulatedPaymentAdapter('simulated_card');
    }
    return this.adapters.get('simulated_cod') || new SimulatedPaymentAdapter('simulated_cod');
  }

  static clear() {
    this.adapters.clear();
  }
}

// ============================================================================
// PRIORITY B: DELIVERY / SHIPPING ABSTRACTION LAYER
// ============================================================================

export type DeliveryMethodType = 'branch_pickup' | 'door_to_door';

export type FulfillmentStatus =
  | 'pending_processing'
  | 'ready_for_pickup'
  | 'in_transit'
  | 'completed'
  | 'cancelled'
  | 'return_requested'
  | 'returned'
  | 'failed';

export interface DeliveryQuote {
  deliveryMethod: DeliveryMethodType;
  shippingFee: number;
  estimatedDays: number;
  providerName: string;
}

export interface DeliveryFulfillment {
  trackingNumber: string;
  deliveryMethod: DeliveryMethodType;
  branchId: string;
  status: FulfillmentStatus;
  carrierName: string;
  shippingFee: number;
  estimatedDeliveryDate?: string;
  updatedAt: string;
}

export interface DeliveryProvider {
  calculateShippingFee(
    deliveryMethod: DeliveryMethodType,
    branchId: string,
    destinationAddress?: any
  ): Promise<DeliveryQuote>;
  createFulfillment(
    orderId: string,
    deliveryMethod: DeliveryMethodType,
    branchId: string,
    destinationAddress?: any,
    idempotencyKey?: string
  ): Promise<DeliveryFulfillment>;
  updateFulfillmentStatus(
    trackingNumber: string,
    status: FulfillmentStatus
  ): Promise<DeliveryFulfillment>;
}

export class StandardDeliveryAdapter implements DeliveryProvider {
  public createCount = 0;
  public lastDeliveryKey = '';
  private fulfillmentsMap: Map<string, DeliveryFulfillment> = new Map();

  async calculateShippingFee(
    deliveryMethod: DeliveryMethodType,
    _branchId: string,
    _destinationAddress?: any
  ): Promise<DeliveryQuote> {
    const isDoorToDoor = deliveryMethod === 'door_to_door';
    return {
      deliveryMethod,
      shippingFee: isDoorToDoor ? 150 : 0,
      estimatedDays: isDoorToDoor ? 2 : 0,
      providerName: isDoorToDoor ? 'Camarines Norte Local Express' : 'HCI Branch Hub Pickup',
    };
  }

  async createFulfillment(
    orderId: string,
    deliveryMethod: DeliveryMethodType,
    branchId: string,
    _destinationAddress?: any,
    idempotencyKey?: string
  ): Promise<DeliveryFulfillment> {
    if (idempotencyKey) {
      this.lastDeliveryKey = idempotencyKey;
      if (this.fulfillmentsMap.has(idempotencyKey)) {
        return this.fulfillmentsMap.get(idempotencyKey)!;
      }
    }

    this.createCount++;

    const isDoorToDoor = deliveryMethod === 'door_to_door';
    const nowIso = new Date().toISOString();
    const fulfillment: DeliveryFulfillment = {
      trackingNumber: isDoorToDoor ? `TRK-${orderId}` : `PICKUP-${orderId}`,
      deliveryMethod,
      branchId,
      status: 'pending_processing',
      carrierName: isDoorToDoor ? 'Camarines Norte Local Express' : 'HCI Branch Direct Pickup',
      shippingFee: isDoorToDoor ? 150 : 0,
      updatedAt: nowIso,
    };

    if (idempotencyKey) {
      this.fulfillmentsMap.set(idempotencyKey, fulfillment);
    }
    return fulfillment;
  }

  async updateFulfillmentStatus(
    trackingNumber: string,
    status: FulfillmentStatus
  ): Promise<DeliveryFulfillment> {
    const isDoorToDoor = trackingNumber.startsWith('TRK-');
    return {
      trackingNumber,
      deliveryMethod: isDoorToDoor ? 'door_to_door' : 'branch_pickup',
      branchId: 'daet',
      status,
      carrierName: isDoorToDoor ? 'Camarines Norte Local Express' : 'HCI Branch Direct Pickup',
      shippingFee: isDoorToDoor ? 150 : 0,
      updatedAt: new Date().toISOString(),
    };
  }
}

export class DeliveryAdapterRegistry {
  private static adapters: Map<string, DeliveryProvider> = new Map();
  private static defaultAdapter = new StandardDeliveryAdapter();

  static registerAdapter(type: string, adapter: DeliveryProvider) {
    this.adapters.set(type, adapter);
  }

  static getAdapter(deliveryMethod: string): DeliveryProvider {
    if (this.adapters.has(deliveryMethod)) {
      return this.adapters.get(deliveryMethod)!;
    }
    if (this.adapters.has('default')) {
      return this.adapters.get('default')!;
    }
    return this.defaultAdapter;
  }

  static clear() {
    this.adapters.clear();
    this.defaultAdapter = new StandardDeliveryAdapter();
  }
}

// ============================================================================
// PRIORITY C MILESTONE C1: NOTIFICATION INFRASTRUCTURE & QUEUE
// ============================================================================

export type NotificationChannel = 'email' | 'sms' | 'in_app';

export type NotificationStatus =
  | 'pending'
  | 'processing'
  | 'dispatched'
  | 'failed'
  | 'dead_letter';

export interface NotificationPayload {
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  channel: NotificationChannel;
  templateId: string;
  title: string;
  body: string;
  metadata?: Record<string, any>;
}

export interface NotificationDispatchResult {
  dispatchId: string;
  channel: NotificationChannel;
  status: 'dispatched' | 'failed';
  providerMessageId?: string;
  error?: string;
  dispatchedAt: string;
}

export interface NotificationProvider {
  channel: NotificationChannel;
  providerType: string;
  send(notification: NotificationPayload, idempotencyKey?: string): Promise<NotificationDispatchResult>;
}

export interface EmailNotificationAdapter extends NotificationProvider {
  channel: 'email';
}

export interface SmsNotificationAdapter extends NotificationProvider {
  channel: 'sms';
}

export interface InAppNotificationAdapter extends NotificationProvider {
  channel: 'in_app';
}

export class SimulatedNotificationAdapter implements NotificationProvider {
  public sendCount = 0;
  public lastIdempotencyKey = '';
  public lastPayload: NotificationPayload | null = null;
  public simulatedFailuresRemaining = 0;
  public permanentFailure = false;
  private dispatchedMap: Map<string, NotificationDispatchResult> = new Map();

  constructor(
    public channel: NotificationChannel = 'email',
    public providerType: string = 'simulated_notification_provider'
  ) {}

  async send(payload: NotificationPayload, idempotencyKey?: string): Promise<NotificationDispatchResult> {
    if (idempotencyKey) {
      this.lastIdempotencyKey = idempotencyKey;
      if (this.dispatchedMap.has(idempotencyKey)) {
        return this.dispatchedMap.get(idempotencyKey)!;
      }
    }

    this.sendCount++;
    this.lastPayload = payload;

    if (this.permanentFailure) {
      throw new Error(`Simulated Permanent Provider Failure (${this.channel})`);
    }

    if (this.simulatedFailuresRemaining > 0) {
      this.simulatedFailuresRemaining--;
      throw new Error(`Simulated Transient Provider Failure (${this.channel})`);
    }

    const nowIso = new Date().toISOString();
    const result: NotificationDispatchResult = {
      dispatchId: `DISP-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
      channel: this.channel,
      status: 'dispatched',
      providerMessageId: idempotencyKey ? `MSG-${idempotencyKey}` : `MSG-${Date.now()}`,
      dispatchedAt: nowIso,
    };

    if (idempotencyKey) {
      this.dispatchedMap.set(idempotencyKey, result);
    }
    return result;
  }
}

export class NotificationAdapterRegistry {
  private static adapters: Map<NotificationChannel, NotificationProvider> = new Map();

  static registerAdapter(channel: NotificationChannel, adapter: NotificationProvider) {
    this.adapters.set(channel, adapter);
  }

  static getAdapter(channel: NotificationChannel): NotificationProvider {
    if (this.adapters.has(channel)) {
      return this.adapters.get(channel)!;
    }
    const defaultSim = new SimulatedNotificationAdapter(channel, `default_simulated_${channel}`);
    this.adapters.set(channel, defaultSim);
    return defaultSim;
  }

  static clear() {
    this.adapters.clear();
  }
}

export interface NotificationQueueItem {
  id: string;
  idempotencyKey: string;
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  channel: NotificationChannel;
  templateId: string;
  title: string;
  body: string;
  metadata?: Record<string, any>;
  status: NotificationStatus;
  retryCount: number;
  maxRetries: number;
  backoffMs: number;
  nextAttemptAt: string;
  lastError?: string;
  providerResult?: any;
  createdAt: string;
  updatedAt: string;
  dispatchedAt?: string;
}

export interface NotificationRecord {
  id: string;
  queueItemId: string;
  idempotencyKey: string;
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  channel: NotificationChannel;
  templateId: string;
  title: string;
  body: string;
  metadata?: Record<string, any>;
  providerMessageId?: string;
  dispatchedAt: string;
}

/**
 * Generates a deterministic notification idempotency key.
 */
export function generateNotificationIdempotencyKey(
  channel: NotificationChannel,
  recipientId: string,
  eventTag: string,
  uniqueRef: string = ''
): string {
  const cleanRef = uniqueRef ? `_${uniqueRef}` : '';
  return `notif_${channel}_${recipientId}_${eventTag}${cleanRef}`;
}

export interface EnqueueNotificationParams {
  idempotencyKey: string;
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  channel: NotificationChannel;
  templateId?: string;
  title: string;
  body: string;
  metadata?: Record<string, any>;
  maxRetries?: number;
  backoffMs?: number;
}

export interface EnqueueNotificationResult {
  success: boolean;
  queueItem: NotificationQueueItem;
  idempotentReplay: boolean;
  message?: string;
  error?: string;
}

/**
 * Enqueue a notification with deterministic idempotency.
 */
export async function enqueueNotification(
  db: any,
  params: EnqueueNotificationParams
): Promise<EnqueueNotificationResult> {
  const {
    idempotencyKey,
    recipientId,
    recipientEmail,
    recipientPhone,
    channel,
    templateId = 'default',
    title,
    body,
    metadata = {},
    maxRetries = 3,
    backoffMs = 1000,
  } = params;

  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    throw new Error('idempotencyKey is required and must be a string.');
  }
  if (!recipientId || typeof recipientId !== 'string') {
    throw new Error('recipientId is required.');
  }
  if (!['email', 'sms', 'in_app'].includes(channel)) {
    throw new Error(`Invalid channel: ${channel}. Must be email, sms, or in_app.`);
  }
  if (!title || !body) {
    throw new Error('title and body are required.');
  }

  const hash = crypto.createHash('sha256').update(idempotencyKey).digest('hex').substring(0, 16).toUpperCase();
  const queueDocId = `NQ-${hash}`;
  const nowIso = new Date().toISOString();

  const queueRef = db.collection('notification_queue').doc(queueDocId);
  const existingSnap = await queueRef.get();

  if (existingSnap && existingSnap.exists) {
    const existing = (typeof existingSnap.data === 'function' ? existingSnap.data() : existingSnap.data) as NotificationQueueItem;
    if (existing.status === 'dispatched') {
      return {
        success: true,
        queueItem: existing,
        idempotentReplay: true,
        message: 'Notification already successfully dispatched.',
      };
    }
    if (existing.status === 'dead_letter') {
      return {
        success: false,
        queueItem: existing,
        idempotentReplay: true,
        error: 'Notification previously failed permanently (dead letter).',
      };
    }
    return {
      success: true,
      queueItem: existing,
      idempotentReplay: true,
      message: `Notification already queued (status: ${existing.status}).`,
    };
  }

  const newQueueItem: NotificationQueueItem = {
    id: queueDocId,
    idempotencyKey,
    recipientId,
    recipientEmail,
    recipientPhone,
    channel,
    templateId,
    title,
    body,
    metadata,
    status: 'pending',
    retryCount: 0,
    maxRetries,
    backoffMs,
    nextAttemptAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await queueRef.set(newQueueItem);

  return {
    success: true,
    queueItem: newQueueItem,
    idempotentReplay: false,
  };
}

export interface ProcessQueueOptions {
  maxBatchSize?: number;
  channel?: NotificationChannel;
  forceImmediate?: boolean;
}

export interface ProcessQueueResult {
  processedCount: number;
  dispatchedCount: number;
  failedCount: number;
  deadLetterCount: number;
  results: Array<{
    id: string;
    idempotencyKey: string;
    status: NotificationStatus;
    error?: string;
  }>;
}

/**
 * Process pending and retryable notification queue items.
 */
export async function processNotificationQueue(
  db: any,
  options: ProcessQueueOptions = {}
): Promise<ProcessQueueResult> {
  const { maxBatchSize = 10, channel, forceImmediate = false } = options;
  const now = new Date();
  const nowIso = now.toISOString();

  const queueColl = db.collection('notification_queue');
  const snap = await queueColl.get();

  const candidateItems: NotificationQueueItem[] = [];
  if (snap && !snap.empty) {
    snap.forEach((doc: any) => {
      const data = typeof doc.data === 'function' ? doc.data() : doc.data;
      if (channel && data.channel !== channel) return;

      const isPending = data.status === 'pending';
      const isRetryable =
        data.status === 'failed' &&
        data.retryCount < data.maxRetries &&
        (forceImmediate || !data.nextAttemptAt || data.nextAttemptAt <= nowIso);

      if (isPending || isRetryable) {
        candidateItems.push(data);
      }
    });
  }

  // Sort by createdAt ascending (FIFO)
  candidateItems.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  const batch = candidateItems.slice(0, maxBatchSize);

  let dispatchedCount = 0;
  let failedCount = 0;
  let deadLetterCount = 0;
  const results: ProcessQueueResult['results'] = [];

  for (const item of batch) {
    const queueDocRef = db.collection('notification_queue').doc(item.id);
    const adapter = NotificationAdapterRegistry.getAdapter(item.channel);

    // Mark as processing
    await queueDocRef.update({
      status: 'processing',
      updatedAt: new Date().toISOString(),
    });

    const payload: NotificationPayload = {
      recipientId: item.recipientId,
      recipientEmail: item.recipientEmail,
      recipientPhone: item.recipientPhone,
      channel: item.channel,
      templateId: item.templateId,
      title: item.title,
      body: item.body,
      metadata: item.metadata,
    };

    try {
      const dispatchResult = await adapter.send(payload, item.idempotencyKey);
      const finishedIso = new Date().toISOString();

      // Record successful dispatch
      const updatedItem: NotificationQueueItem = {
        ...item,
        status: 'dispatched',
        dispatchedAt: finishedIso,
        updatedAt: finishedIso,
        providerResult: dispatchResult,
      };
      await queueDocRef.set(updatedItem);

      // Create permanent notification record
      const notifDocId = `NTF-${crypto.createHash('sha256').update(`${item.id}_${item.idempotencyKey}`).digest('hex').substring(0, 16).toUpperCase()}`;
      const notificationRecord: NotificationRecord = {
        id: notifDocId,
        queueItemId: item.id,
        idempotencyKey: item.idempotencyKey,
        recipientId: item.recipientId,
        recipientEmail: item.recipientEmail,
        recipientPhone: item.recipientPhone,
        channel: item.channel,
        templateId: item.templateId,
        title: item.title,
        body: item.body,
        metadata: item.metadata,
        providerMessageId: dispatchResult.providerMessageId,
        dispatchedAt: finishedIso,
      };
      await db.collection('notifications').doc(notifDocId).set(notificationRecord);

      if (item.metadata?.campaignId) {
        await syncMarketingCampaignQueueProgress(db, String(item.metadata.campaignId), true);
      }

      dispatchedCount++;
      results.push({
        id: item.id,
        idempotencyKey: item.idempotencyKey,
        status: 'dispatched',
      });
    } catch (err: any) {
      const errorIso = new Date().toISOString();
      const nextRetryCount = (item.retryCount || 0) + 1;
      const errorMessage = err?.message || String(err);

      if (nextRetryCount >= item.maxRetries) {
        // Terminal dead-letter state
        const deadLetterItem: NotificationQueueItem = {
          ...item,
          status: 'dead_letter',
          retryCount: nextRetryCount,
          lastError: errorMessage,
          updatedAt: errorIso,
        };
        await queueDocRef.set(deadLetterItem);

        await dispatchAlert({
          category: 'notification_dead_letter',
          severity: 'SEV-2',
          message: `Notification ${item.id} transitioned to dead_letter queue after ${nextRetryCount} retries`,
          details: {
            queueItemId: item.id,
            recipientId: item.recipientId,
            channel: item.channel,
            templateId: item.templateId,
            lastError: errorMessage,
          },
        }).catch(() => {});

        if (item.metadata?.campaignId) {
          await syncMarketingCampaignQueueProgress(db, String(item.metadata.campaignId), false);
        }

        deadLetterCount++;
        results.push({
          id: item.id,
          idempotencyKey: item.idempotencyKey,
          status: 'dead_letter',
          error: errorMessage,
        });
      } else {
        // Recoverable failure with exponential backoff
        const delayMs = (item.backoffMs || 1000) * Math.pow(2, nextRetryCount - 1);
        const nextAttemptAt = new Date(Date.now() + delayMs).toISOString();

        const failedItem: NotificationQueueItem = {
          ...item,
          status: 'failed',
          retryCount: nextRetryCount,
          nextAttemptAt,
          lastError: errorMessage,
          updatedAt: errorIso,
        };
        await queueDocRef.set(failedItem);
        failedCount++;
        results.push({
          id: item.id,
          idempotencyKey: item.idempotencyKey,
          status: 'failed',
          error: errorMessage,
        });
      }
    }
  }

  return {
    processedCount: batch.length,
    dispatchedCount,
    failedCount,
    deadLetterCount,
    results,
  };
}

// ============================================================================
// PHASE 7 MILESTONE C2: Transactional Lifecycle Automation Triggers
// ============================================================================

/**
 * 1. Orders: Checkout Completed Notification
 */
export async function enqueueOrderCheckoutCompletedNotification(
  db: any,
  order: any
): Promise<EnqueueNotificationResult | null> {
  const recipientId = order.userId || order.customer?.uid || 'customer';
  const recipientEmail = order.customer?.email;
  const channel: NotificationChannel = 'email';
  const idempotencyKey = generateNotificationIdempotencyKey(channel, recipientId, 'order_checkout_completed', order.id);

  return enqueueNotification(db, {
    idempotencyKey,
    recipientId,
    recipientEmail,
    channel,
    templateId: 'order_checkout_completed',
    title: `Order Confirmation - #${order.id}`,
    body: `Thank you for your order #${order.id}. Total amount: ₱${order.grandTotal}. We are preparing your items for delivery.`,
    metadata: {
      orderId: order.id,
      branchId: order.branchId,
      grandTotal: order.grandTotal,
      status: order.fulfillmentStatus || 'pending_processing',
    },
  });
}

/**
 * 1. Orders: Fulfillment / Dispatch Notification
 */
export async function enqueueOrderDispatchedNotification(
  db: any,
  order: any
): Promise<EnqueueNotificationResult | null> {
  const recipientId = order.userId || order.customer?.uid || 'customer';
  const recipientEmail = order.customer?.email;
  const recipientPhone = order.customer?.mobileNumber;
  const channel: NotificationChannel = 'email';
  const idempotencyKey = generateNotificationIdempotencyKey(channel, recipientId, 'order_dispatched', order.id);

  return enqueueNotification(db, {
    idempotencyKey,
    recipientId,
    recipientEmail,
    recipientPhone,
    channel,
    templateId: 'order_dispatched',
    title: `Order Dispatched - #${order.id}`,
    body: `Your order #${order.id} has been fulfilled and dispatched from branch ${(order.branchId || 'daet').toUpperCase()}.`,
    metadata: {
      orderId: order.id,
      branchId: order.branchId,
      fulfillmentStatus: order.fulfillmentStatus || 'fulfilled',
    },
  });
}

/**
 * 1. Orders: Delivery Completed Notification
 */
export async function enqueueOrderDeliveredNotification(
  db: any,
  order: any
): Promise<EnqueueNotificationResult | null> {
  const recipientId = order.userId || order.customer?.uid || 'customer';
  const recipientEmail = order.customer?.email;
  const channel: NotificationChannel = 'email';
  const idempotencyKey = generateNotificationIdempotencyKey(channel, recipientId, 'order_delivered', order.id);

  return enqueueNotification(db, {
    idempotencyKey,
    recipientId,
    recipientEmail,
    channel,
    templateId: 'order_delivered',
    title: `Order Delivered - #${order.id}`,
    body: `Your order #${order.id} has been successfully delivered. Thank you for choosing HCI Cell Mineral Drops!`,
    metadata: {
      orderId: order.id,
      branchId: order.branchId,
      fulfillmentStatus: 'completed',
    },
  });
}

/**
 * 1. Orders: Cancellation Notification
 */
export async function enqueueOrderCancelledNotification(
  db: any,
  order: any,
  reason?: string
): Promise<EnqueueNotificationResult | null> {
  const recipientId = order.userId || order.customer?.uid || 'customer';
  const recipientEmail = order.customer?.email;
  const channel: NotificationChannel = 'email';
  const idempotencyKey = generateNotificationIdempotencyKey(channel, recipientId, 'order_cancelled', order.id);

  return enqueueNotification(db, {
    idempotencyKey,
    recipientId,
    recipientEmail,
    channel,
    templateId: 'order_cancelled',
    title: `Order Cancelled - #${order.id}`,
    body: `Your order #${order.id} has been cancelled. Reason: ${reason || order.cancellationReason || 'Customer cancellation'}.`,
    metadata: {
      orderId: order.id,
      reason: reason || order.cancellationReason,
      fulfillmentStatus: 'cancelled',
    },
  });
}

/**
 * 1. Orders: Refund Notification
 */
export async function enqueueOrderRefundedNotification(
  db: any,
  order: any,
  amount: number,
  reason?: string,
  refundKey?: string
): Promise<EnqueueNotificationResult | null> {
  const recipientId = order.userId || order.customer?.uid || 'customer';
  const recipientEmail = order.customer?.email;
  const channel: NotificationChannel = 'email';
  const cleanKey = refundKey ? refundKey.replace(/[^a-zA-Z0-9_-]/g, '_') : order.id;
  const idempotencyKey = generateNotificationIdempotencyKey(channel, recipientId, 'order_refunded', `${cleanKey}_${amount}`);

  return enqueueNotification(db, {
    idempotencyKey,
    recipientId,
    recipientEmail,
    channel,
    templateId: 'order_refunded',
    title: `Refund Processed - #${order.id}`,
    body: `A refund of ₱${amount} has been processed for order #${order.id}. Reason: ${reason || 'Approved refund'}.`,
    metadata: {
      orderId: order.id,
      amount,
      reason,
      status: 'refunded',
    },
  });
}

/**
 * 2. Consultations: Booking Confirmation Notification
 */
export async function enqueueConsultationBookingConfirmedNotification(
  db: any,
  appointment: any
): Promise<EnqueueNotificationResult | null> {
  const recipientId = appointment.userId || 'client';
  const recipientEmail = appointment.customerEmail;
  const channel: NotificationChannel = 'email';
  const idempotencyKey = generateNotificationIdempotencyKey(channel, recipientId, 'consultation_booking_confirmed', appointment.id);

  return enqueueNotification(db, {
    idempotencyKey,
    recipientId,
    recipientEmail,
    channel,
    templateId: 'consultation_booking_confirmed',
    title: `Consultation Confirmed: ${appointment.serviceTitle || appointment.serviceCode}`,
    body: `Your appointment with ${appointment.practitionerName} is confirmed for ${appointment.scheduledDate} at ${appointment.scheduledTime}.`,
    metadata: {
      appointmentId: appointment.id,
      practitionerId: appointment.practitionerId,
      scheduledDate: appointment.scheduledDate,
      scheduledTime: appointment.scheduledTime,
      deliveryMode: appointment.deliveryMode,
    },
  });
}

/**
 * 2. Consultations: Cancellation Notification
 */
export async function enqueueConsultationCancelledNotification(
  db: any,
  appointment: any,
  reason?: string
): Promise<EnqueueNotificationResult | null> {
  const recipientId = appointment.userId || 'client';
  const recipientEmail = appointment.customerEmail;
  const channel: NotificationChannel = 'email';
  const idempotencyKey = generateNotificationIdempotencyKey(channel, recipientId, 'consultation_cancelled', appointment.id);

  return enqueueNotification(db, {
    idempotencyKey,
    recipientId,
    recipientEmail,
    channel,
    templateId: 'consultation_cancelled',
    title: `Consultation Cancelled: #${appointment.id}`,
    body: `Your consultation scheduled for ${appointment.scheduledDate} at ${appointment.scheduledTime} has been cancelled. Reason: ${reason || appointment.cancellationReason || 'Cancelled by user'}.`,
    metadata: {
      appointmentId: appointment.id,
      reason: reason || appointment.cancellationReason,
      status: 'cancelled',
    },
  });
}

/**
 * 2. Consultations: 24-hour and 2-hour Reminders
 */
export async function enqueueConsultationReminder(
  db: any,
  appointmentId: string,
  reminderType: '24h' | '2h'
): Promise<EnqueueNotificationResult> {
  const snap = await db.collection('consultation_appointments').doc(appointmentId).get();
  if (!snap.exists) {
    throw new Error(`Appointment not found: ${appointmentId}`);
  }
  const appt = typeof snap.data === 'function' ? snap.data() : snap.data;
  if (appt.status === 'cancelled') {
    throw new Error(`Cannot send reminder for cancelled appointment: ${appointmentId}`);
  }

  const recipientId = appt.userId || 'client';
  const channel: NotificationChannel = reminderType === '2h' ? 'sms' : 'email';
  const eventTag = reminderType === '2h' ? 'consultation_reminder_2h' : 'consultation_reminder_24h';
  const idempotencyKey = generateNotificationIdempotencyKey(channel, recipientId, eventTag, appointmentId);

  const title = reminderType === '2h'
    ? `Reminder: Consultation with ${appt.practitionerName} in 2 Hours`
    : `Reminder: Consultation with ${appt.practitionerName} Tomorrow`;
  const body = reminderType === '2h'
    ? `Your consultation (${appt.serviceTitle || appt.serviceCode}) starts in 2 hours at ${appt.scheduledTime}. Please prepare your connection.`
    : `Friendly reminder that your wellness consultation is scheduled for tomorrow (${appt.scheduledDate}) at ${appt.scheduledTime}.`;

  return enqueueNotification(db, {
    idempotencyKey,
    recipientId,
    recipientEmail: appt.customerEmail,
    recipientPhone: appt.customerPhone,
    channel,
    templateId: `consultation_reminder_${reminderType}`,
    title,
    body,
    metadata: {
      appointmentId: appt.id,
      reminderType,
      scheduledDate: appt.scheduledDate,
      scheduledTime: appt.scheduledTime,
    },
  });
}

/**
 * 3. Workshops: Registration Confirmation
 */
export async function enqueueWorkshopRegistrationConfirmedNotification(
  db: any,
  registration: any,
  workshop: any
): Promise<EnqueueNotificationResult | null> {
  const recipientId = registration.userId || 'attendee';
  const channel: NotificationChannel = 'email';
  const idempotencyKey = generateNotificationIdempotencyKey(channel, recipientId, 'workshop_registration_confirmed', registration.id);

  return enqueueNotification(db, {
    idempotencyKey,
    recipientId,
    recipientEmail: registration.customerEmail,
    recipientPhone: registration.customerPhone,
    channel,
    templateId: 'workshop_registration_confirmed',
    title: `Registration Confirmed: ${workshop.title}`,
    body: `You are confirmed for ${workshop.title} on ${workshop.date} at ${workshop.time}. Pass ID: ${registration.id}.`,
    metadata: {
      registrationId: registration.id,
      workshopId: workshop.id,
      branchId: workshop.branchId,
      status: 'confirmed',
    },
  });
}

/**
 * 3. Workshops: Reminder
 */
export async function enqueueWorkshopReminders(
  db: any,
  workshopId: string
): Promise<{ enqueuedCount: number; results: EnqueueNotificationResult[] }> {
  const wsSnap = await db.collection('workshops').doc(workshopId).get();
  if (!wsSnap.exists) {
    throw new Error(`Workshop not found: ${workshopId}`);
  }
  const ws = typeof wsSnap.data === 'function' ? wsSnap.data() : wsSnap.data;

  const regSnap = await db.collection('workshop_registrations')
    .where('workshopId', '==', workshopId)
    .get();

  const results: EnqueueNotificationResult[] = [];
  let enqueuedCount = 0;

  if (regSnap && !regSnap.empty) {
    const docs = regSnap.docs || [];
    for (const d of docs) {
      const reg = typeof d.data === 'function' ? d.data() : d.data;
      if (reg.status !== 'confirmed') continue;

      const recipientId = reg.userId || 'attendee';
      const channel: NotificationChannel = 'email';
      const idempotencyKey = generateNotificationIdempotencyKey(channel, recipientId, 'workshop_reminder', `${workshopId}_${reg.id}`);

      const res = await enqueueNotification(db, {
        idempotencyKey,
        recipientId,
        recipientEmail: reg.customerEmail,
        recipientPhone: reg.customerPhone,
        channel,
        templateId: 'workshop_reminder',
        title: `Reminder: Upcoming Workshop - ${ws.title}`,
        body: `We look forward to seeing you at ${ws.title} on ${ws.date} at ${ws.time} (${ws.location || 'Branch'}).`,
        metadata: {
          workshopId,
          registrationId: reg.id,
          date: ws.date,
          time: ws.time,
        },
      });

      if (!res.idempotentReplay) enqueuedCount++;
      results.push(res);
    }
  }

  return { enqueuedCount, results };
}

/**
 * 3. Workshops: Waitlist Promotion
 */
export async function enqueueWorkshopWaitlistPromotedNotification(
  db: any,
  registration: any,
  workshop: any
): Promise<EnqueueNotificationResult | null> {
  const recipientId = registration.userId || 'attendee';
  const channel: NotificationChannel = 'email';
  const idempotencyKey = generateNotificationIdempotencyKey(channel, recipientId, 'workshop_waitlist_promoted', registration.id);

  return enqueueNotification(db, {
    idempotencyKey,
    recipientId,
    recipientEmail: registration.customerEmail,
    recipientPhone: registration.customerPhone,
    channel,
    templateId: 'workshop_waitlist_promoted',
    title: `You're In! A Seat Opened for ${workshop.title}`,
    body: `Great news! A confirmed seat has opened for you at ${workshop.title} on ${workshop.date} at ${workshop.time}. Pass ID: ${registration.id}.`,
    metadata: {
      registrationId: registration.id,
      workshopId: workshop.id,
      status: 'confirmed',
    },
  });
}

/**
 * Helper: Promotes the next waitlisted participant for a workshop
 */
export async function promoteNextWaitlistedParticipant(
  db: any,
  workshopId: string
): Promise<{ promoted: boolean; registration?: any; workshop?: any; message?: string }> {
  const wsRef = db.collection('workshops').doc(workshopId);
  const wsSnap = await wsRef.get();
  if (!wsSnap.exists) {
    throw new Error(`Workshop not found: ${workshopId}`);
  }
  const ws = typeof wsSnap.data === 'function' ? wsSnap.data() : wsSnap.data;

  // Find waitlisted registrations
  const regSnap = await db.collection('workshop_registrations')
    .where('workshopId', '==', workshopId)
    .get();

  const waitlisted: any[] = [];
  if (regSnap && !regSnap.empty) {
    const docs = regSnap.docs || [];
    for (const d of docs) {
      const data = typeof d.data === 'function' ? d.data() : d.data;
      if (data.status === 'waitlisted') {
        waitlisted.push(data);
      }
    }
  }

  if (waitlisted.length === 0) {
    return { promoted: false, message: 'No waitlisted participants found for this workshop.' };
  }

  // Sort by createdAt ascending (FIFO queue)
  waitlisted.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  const target = waitlisted[0];

  const nowIso = new Date().toISOString();
  const newSignature = generateRegistrationSignature(target.id, target.userId, workshopId, 'confirmed');

  const updatedReg = {
    ...target,
    status: 'confirmed',
    signature: newSignature,
    promotedAt: nowIso,
    updatedAt: nowIso,
  };

  const updatedSeats = (ws.seatsAllocated || 0) + 1;
  const updatedWaitlist = Math.max(0, (ws.waitlistCount || 1) - 1);

  await db.collection('workshop_registrations').doc(target.id).set(updatedReg);
  await wsRef.update({
    seatsAllocated: updatedSeats,
    waitlistCount: updatedWaitlist,
    updatedAt: nowIso,
  });

  const updatedWs = { ...ws, seatsAllocated: updatedSeats, waitlistCount: updatedWaitlist, updatedAt: nowIso };

  // Enqueue waitlist promotion notification
  await enqueueWorkshopWaitlistPromotedNotification(db, updatedReg, updatedWs);

  return { promoted: true, registration: updatedReg, workshop: updatedWs };
}

/**
 * 4. Support: Ticket Acknowledgement Notification
 */
export async function enqueueTicketAcknowledgedNotification(
  db: any,
  ticket: any
): Promise<EnqueueNotificationResult | null> {
  const recipientId = ticket.userId || 'customer';
  const channel: NotificationChannel = 'email';
  const idempotencyKey = generateNotificationIdempotencyKey(channel, recipientId, 'ticket_acknowledged', ticket.id);

  return enqueueNotification(db, {
    idempotencyKey,
    recipientId,
    recipientEmail: ticket.customerEmail,
    recipientPhone: ticket.customerPhone,
    channel,
    templateId: 'ticket_acknowledged',
    title: `Support Ticket Received: #${ticket.id}`,
    body: `Your consumer inquiry regarding "${ticket.subject}" has been received. Our team will resolve it within standard SLA.`,
    metadata: {
      ticketId: ticket.id,
      branchId: ticket.branchId,
      category: ticket.category,
      slaDueAt: ticket.slaDueAt,
    },
  });
}

/**
 * 4. Support: SLA-Breach Staff Alert
 */
export async function enqueueTicketSlaBreachAlert(
  db: any,
  ticket: any,
  reason?: string
): Promise<EnqueueNotificationResult | null> {
  const branchId = (ticket.branchId || 'daet').toLowerCase();
  let staffRecipientId = `staff_mgr_${branchId}`;
  let staffEmail: string | undefined;

  try {
    const usersSnap = await db.collection('users')
      .where('role', '==', 'branch_manager')
      .where('assignedBranchId', '==', branchId)
      .get();
    if (usersSnap && !usersSnap.empty) {
      const mgrDoc = usersSnap.docs ? usersSnap.docs[0] : null;
      if (mgrDoc) {
        const mgrData = typeof mgrDoc.data === 'function' ? mgrDoc.data() : mgrDoc.data;
        staffRecipientId = mgrData.uid || staffRecipientId;
        staffEmail = mgrData.email;
      }
    }
  } catch (_e) {
    // Fallback
  }

  const channel: NotificationChannel = 'email';
  const idempotencyKey = generateNotificationIdempotencyKey(channel, staffRecipientId, 'ticket_sla_breach_alert', ticket.id);

  return enqueueNotification(db, {
    idempotencyKey,
    recipientId: staffRecipientId,
    recipientEmail: staffEmail,
    channel,
    templateId: 'ticket_sla_breach_staff_alert',
    title: `URGENT SLA BREACH: Support Ticket #${ticket.id}`,
    body: `Ticket #${ticket.id} (${ticket.subject}) has breached statutory SLA or been escalated. Immediate branch resolution required. Reason: ${reason || 'SLA threshold reached'}.`,
    metadata: {
      ticketId: ticket.id,
      branchId,
      slaDueAt: ticket.slaDueAt,
      priority: 'urgent',
    },
  });
}

/**
 * 4. Support: Resolution Notification
 */
export async function enqueueTicketResolvedNotification(
  db: any,
  ticket: any,
  resolutionSummary: string
): Promise<EnqueueNotificationResult | null> {
  const recipientId = ticket.userId || 'customer';
  const channel: NotificationChannel = 'email';
  const idempotencyKey = generateNotificationIdempotencyKey(channel, recipientId, 'ticket_resolved', ticket.id);

  return enqueueNotification(db, {
    idempotencyKey,
    recipientId,
    recipientEmail: ticket.customerEmail,
    channel,
    templateId: 'ticket_resolved',
    title: `Support Ticket Resolved: #${ticket.id}`,
    body: `Your support ticket #${ticket.id} (${ticket.subject}) has been resolved. Resolution: ${resolutionSummary}.`,
    metadata: {
      ticketId: ticket.id,
      resolutionSummary,
      status: 'resolved',
    },
  });
}

/**
 * 5. Inventory: Branch-Manager Low-Stock Alert When Stock Reaches ROP
 */
export async function checkAndEnqueueLowStockAlert(
  db: any,
  branchId: string,
  skuId: string
): Promise<{ alertTriggered: boolean; queueResult?: EnqueueNotificationResult; details: any }> {
  const normalizedBranch = (branchId || 'daet').toLowerCase().trim();
  const invRef = db.collection('inventory').doc(`${normalizedBranch}_${skuId}`);
  const invSnap = await invRef.get();

  if (!invSnap.exists) {
    return { alertTriggered: false, details: { error: 'Inventory not found' } };
  }

  const invData = typeof invSnap.data === 'function' ? invSnap.data() : invSnap.data;
  const currentStock = Number(invData.activeStock ?? invData.availableQuantity ?? 0);

  const leadTime = Number(invData.leadTimeDays) || 3;
  const safetyStock = Number(invData.safetyStock) || 20;

  let salesVelocity = 0;
  try {
    const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const ordersSnap = await db.collection('orders')
      .where('branchId', '==', normalizedBranch)
      .where('fulfillmentStatus', '==', 'fulfilled')
      .where('fulfilledAt', '>=', thirtyDaysAgoIso)
      .get();

    let totalSold = 0;
    if (ordersSnap && !ordersSnap.empty) {
      ordersSnap.forEach((doc: any) => {
        const order = typeof doc.data === 'function' ? doc.data() : doc.data;
        if (order.status !== 'cancelled' && order.status !== 'refunded') {
          for (const item of (order.items || [])) {
            if (item.skuId === skuId) totalSold += Number(item.quantity) || 0;
          }
        }
      });
    }
    salesVelocity = totalSold / 30;
  } catch (_e) {
    salesVelocity = 0;
  }

  const calculatedRop = Math.ceil((salesVelocity * leadTime) + safetyStock);
  const effectiveRop = Math.max(calculatedRop, Number(invData.reorderPoint) || 30);

  const details = {
    branchId: normalizedBranch,
    skuId,
    currentStock,
    effectiveRop,
    calculatedRop,
    salesVelocity,
    safetyStock,
    leadTime,
  };

  if (currentStock <= effectiveRop) {
    let managerUid = `mgr_${normalizedBranch}`;
    let managerEmail: string | undefined;

    try {
      const usersSnap = await db.collection('users')
        .where('role', '==', 'branch_manager')
        .where('assignedBranchId', '==', normalizedBranch)
        .get();
      if (usersSnap && !usersSnap.empty) {
        const mgrDoc = usersSnap.docs ? usersSnap.docs[0] : null;
        if (mgrDoc) {
          const mData = typeof mgrDoc.data === 'function' ? mgrDoc.data() : mgrDoc.data;
          managerUid = mData.uid || managerUid;
          managerEmail = mData.email;
        }
      }
    } catch (_e) {
      // Fallback
    }

    const channel: NotificationChannel = 'email';
    const idempotencyKey = generateNotificationIdempotencyKey(
      channel,
      managerUid,
      'inventory_low_stock_rop',
      `${normalizedBranch}_${skuId}`
    );

    const queueResult = await enqueueNotification(db, {
      idempotencyKey,
      recipientId: managerUid,
      recipientEmail: managerEmail,
      channel,
      templateId: 'inventory_low_stock_rop_alert',
      title: `Low Stock Alert: ${skuId} at ${normalizedBranch.toUpperCase()} Reached ROP (${currentStock} <= ${effectiveRop})`,
      body: `Stock for SKU ${skuId} at branch ${normalizedBranch} has dropped to ${currentStock}, reaching or falling below the Reorder Point of ${effectiveRop} units. Please initiate branch replenishment immediately.`,
      metadata: {
        branchId: normalizedBranch,
        skuId,
        currentStock,
        effectiveRop,
        calculatedRop,
      },
    });

    return { alertTriggered: true, queueResult, details };
  }

  return { alertTriggered: false, details };
}

// ============================================================================
// PRIORITY C — MILESTONE C3: PRIVACY CONSENT & MARKETING AUTOMATION HELPERS
// ============================================================================

export interface MarketingConsentRecord {
  userId?: string;
  email?: string;
  marketingEmailConsent: boolean;
  marketingSmsConsent: boolean;
  consentUpdatedAt: string;
  consentSource: string;
  unsubscribeToken: string;
  ipAddress?: string;
  userAgent?: string;
}

export function generateUnsubscribeToken(userIdOrEmail: string): string {
  const secret = process.env.HMAC_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SECURITY_ERROR: HMAC_SECRET environment variable is missing in production environment. Unsubscribe token generation failed closed.');
    }
    // Use environment variable in non-prod
    const devSecret = process.env.HMAC_SECRET || 'HCI_CMD_DEV_NON_PROD_HMAC_SECRET_KEY';
    return crypto.createHmac('sha256', devSecret).update(String(userIdOrEmail).toLowerCase().trim()).digest('hex').slice(0, 32);
  }
  return crypto.createHmac('sha256', secret).update(String(userIdOrEmail).toLowerCase().trim()).digest('hex').slice(0, 32);
}

export function verifyUnsubscribeToken(token: string, userIdOrEmail: string): boolean {
  if (!token || !userIdOrEmail) return false;
  try {
    const expected = generateUnsubscribeToken(userIdOrEmail);
    const tokenBuf = Buffer.from(String(token).trim());
    const expBuf = Buffer.from(expected);
    if (tokenBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(tokenBuf, expBuf);
  } catch (_e) {
    return false;
  }
}

export async function updateUserMarketingConsent(
  db: any,
  params: {
    userId?: string;
    email?: string;
    emailConsent?: boolean;
    smsConsent?: boolean;
    source: string;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<MarketingConsentRecord> {
  const nowIso = new Date().toISOString();
  const identifier = params.userId || params.email || 'unknown';
  const unsubscribeToken = generateUnsubscribeToken(identifier);

  let currentEmailConsent = false;
  let currentSmsConsent = false;

  if (params.userId) {
    const userDoc = await db.collection('users').doc(params.userId).get();
    if (userDoc && userDoc.exists) {
      const uData = typeof userDoc.data === 'function' ? userDoc.data() : userDoc.data;
      currentEmailConsent = uData.marketingEmailConsent === true;
      currentSmsConsent = uData.marketingSmsConsent === true;
    }
  }

  const updatedEmailConsent = params.emailConsent !== undefined ? params.emailConsent : currentEmailConsent;
  const updatedSmsConsent = params.smsConsent !== undefined ? params.smsConsent : currentSmsConsent;

  const consentRecord: MarketingConsentRecord = {
    userId: params.userId,
    email: params.email,
    marketingEmailConsent: updatedEmailConsent,
    marketingSmsConsent: updatedSmsConsent,
    consentUpdatedAt: nowIso,
    consentSource: params.source || 'profile',
    unsubscribeToken,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  };

  if (params.userId) {
    await db.collection('users').doc(params.userId).set({
      marketingEmailConsent: updatedEmailConsent,
      marketingSmsConsent: updatedSmsConsent,
      consentUpdatedAt: nowIso,
      consentSource: params.source || 'profile',
      unsubscribeToken,
    }, { merge: true });
  }

  const consentDocId = params.userId || `email_${crypto.createHash('sha256').update(String(params.email).toLowerCase().trim()).digest('hex').slice(0, 16)}`;
  await db.collection('marketing_consents').doc(consentDocId).set(consentRecord, { merge: true });

  if (params.email && !params.userId) {
    try {
      const userSnap = await db.collection('users').where('email', '==', String(params.email).toLowerCase().trim()).get();
      if (userSnap && !userSnap.empty) {
        const docs = userSnap.docs || [];
        for (const d of docs) {
          const uRef = d.ref || db.collection('users').doc(d.id);
          await uRef.set({
            marketingEmailConsent: updatedEmailConsent,
            marketingSmsConsent: updatedSmsConsent,
            consentUpdatedAt: nowIso,
            consentSource: params.source || 'unsubscribe_link',
            unsubscribeToken,
          }, { merge: true });
        }
      }
    } catch (_e) {
      // Best effort
    }
  }

  return consentRecord;
}

export async function getUserMarketingConsent(
  db: any,
  userIdOrEmail: string
): Promise<MarketingConsentRecord> {
  const isEmail = String(userIdOrEmail).includes('@');
  if (!isEmail) {
    const userDoc = await db.collection('users').doc(userIdOrEmail).get();
    if (userDoc && userDoc.exists) {
      const u = typeof userDoc.data === 'function' ? userDoc.data() : userDoc.data;
      return {
        userId: u.uid || userIdOrEmail,
        email: u.email,
        marketingEmailConsent: u.marketingEmailConsent === true,
        marketingSmsConsent: u.marketingSmsConsent === true,
        consentUpdatedAt: u.consentUpdatedAt || new Date().toISOString(),
        consentSource: u.consentSource || 'default_opt_out',
        unsubscribeToken: u.unsubscribeToken || generateUnsubscribeToken(userIdOrEmail),
      };
    }
  }

  const emailNorm = String(userIdOrEmail).toLowerCase().trim();
  const consentHash = `email_${crypto.createHash('sha256').update(emailNorm).digest('hex').slice(0, 16)}`;
  const consentDoc = await db.collection('marketing_consents').doc(consentHash).get();
  if (consentDoc && consentDoc.exists) {
    return typeof consentDoc.data === 'function' ? consentDoc.data() : consentDoc.data;
  }

  return {
    email: isEmail ? emailNorm : undefined,
    userId: isEmail ? undefined : userIdOrEmail,
    marketingEmailConsent: false,
    marketingSmsConsent: false,
    consentUpdatedAt: new Date().toISOString(),
    consentSource: 'default_opt_out',
    unsubscribeToken: generateUnsubscribeToken(userIdOrEmail),
  };
}

export type MarketingCampaignChannel = 'email' | 'sms';
export type MarketingCampaignStatus = 'draft' | 'scheduled' | 'queued' | 'processing' | 'completed' | 'cancelled';

export interface MarketingCampaign {
  id: string;
  title: string;
  description?: string;
  channel: MarketingCampaignChannel;
  templateId?: string;
  subject: string;
  body: string;
  targetCohort: 'all' | 'wholesale_stockist' | 'repeat_retail' | 'wellness_seminar_attendees' | 'replenishment_due' | 'lapsed_accounts' | string;
  branchId?: string | 'all';
  status: MarketingCampaignStatus;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName?: string;
  
  totalTargeted?: number;
  totalEligible?: number;
  totalExcludedConsent?: number;
  enqueuedCount?: number;
  dispatchedCount?: number;
  failedCount?: number;
  batchSize?: number;
  dispatchedAt?: string;
}

export async function createMarketingCampaign(
  db: any,
  user: any,
  payload: Partial<MarketingCampaign>
): Promise<MarketingCampaign> {
  const nowIso = new Date().toISOString();
  const campaignId = `CMP-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  
  const campaign: MarketingCampaign = {
    id: campaignId,
    title: String(payload.title || 'Untitled Campaign').trim(),
    description: payload.description ? String(payload.description).trim() : undefined,
    channel: payload.channel === 'sms' ? 'sms' : 'email',
    templateId: payload.templateId ? String(payload.templateId).trim() : undefined,
    subject: String(payload.subject || '').trim(),
    body: String(payload.body || '').trim(),
    targetCohort: String(payload.targetCohort || 'all').trim(),
    branchId: payload.branchId ? String(payload.branchId).toLowerCase().trim() : 'all',
    status: 'draft',
    scheduledAt: payload.scheduledAt,
    createdAt: nowIso,
    updatedAt: nowIso,
    createdBy: user.uid,
    createdByName: user.email || user.role,
    totalTargeted: 0,
    totalEligible: 0,
    totalExcludedConsent: 0,
    enqueuedCount: 0,
  };

  await db.collection('marketing_campaigns').doc(campaignId).set(campaign);
  return campaign;
}

export async function syncMarketingCampaignQueueProgress(
  db: any,
  campaignId: string,
  isSuccess: boolean
): Promise<void> {
  if (!campaignId) return;
  try {
    const cRef = db.collection('marketing_campaigns').doc(campaignId);
    const snap = await cRef.get();
    if (!snap || !snap.exists) return;

    const c: MarketingCampaign = typeof snap.data === 'function' ? snap.data() : snap.data;
    const currentDispatched = c.dispatchedCount || 0;
    const currentFailed = c.failedCount || 0;
    const enqueuedCount = c.enqueuedCount || 0;

    const newDispatched = currentDispatched + (isSuccess ? 1 : 0);
    const newFailed = currentFailed + (isSuccess ? 0 : 1);
    const totalProcessed = newDispatched + newFailed;

    let newStatus: MarketingCampaignStatus = c.status;
    if (totalProcessed >= enqueuedCount && enqueuedCount > 0) {
      newStatus = 'completed';
    } else if (totalProcessed > 0) {
      newStatus = 'processing';
    }

    await cRef.set({
      dispatchedCount: newDispatched,
      failedCount: newFailed,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (_e) {
    // Best effort progress update
  }
}

export async function dispatchMarketingCampaign(
  db: any,
  user: any,
  campaignId: string,
  options: { batchSize?: number } = {}
): Promise<{
  campaign: MarketingCampaign;
  totalTargeted: number;
  totalEligible: number;
  totalExcludedConsent: number;
  enqueuedCount: number;
  enqueuedItems: EnqueueNotificationResult[];
}> {
  const campaignRef = db.collection('marketing_campaigns').doc(campaignId);
  const snap = await campaignRef.get();
  if (!snap || !snap.exists) {
    throw new Error(`Campaign not found: ${campaignId}`);
  }

  const campaign: MarketingCampaign = typeof snap.data === 'function' ? snap.data() : snap.data;

  // Verify staff authorization
  if (user.role === 'branch_manager' || user.role.startsWith('branch_manager')) {
    const assigned = (user.assignedBranchId || (user.role.includes('_') ? user.role.split('_')[2] : 'daet')).toLowerCase().trim();
    if (campaign.branchId && campaign.branchId !== 'all' && campaign.branchId !== assigned) {
      throw new Error('PERMISSION_DENIED: Branch managers cannot dispatch campaigns for other branches.');
    }
  }

  const [usersSnap, ordersSnap, regsSnap] = await Promise.all([
    db.collection('users').get(),
    db.collection('orders').get(),
    db.collection('workshop_registrations').get(),
  ]);

  const users: any[] = [];
  if (usersSnap && !usersSnap.empty) {
    (usersSnap.docs || []).forEach((d: any) => users.push(typeof d.data === 'function' ? d.data() : d.data));
  }

  const orders: any[] = [];
  if (ordersSnap && !ordersSnap.empty) {
    (ordersSnap.docs || []).forEach((d: any) => orders.push(typeof d.data === 'function' ? d.data() : d.data));
  }

  const registrations: any[] = [];
  if (regsSnap && !regsSnap.empty) {
    (regsSnap.docs || []).forEach((d: any) => registrations.push(typeof d.data === 'function' ? d.data() : d.data));
  }

  const branchFilter = campaign.branchId && campaign.branchId !== 'all' ? campaign.branchId : undefined;
  const cohortRecords = aggregateCustomerCrmProfiles(
    {
      orders,
      registrations,
      users,
    },
    branchFilter
  );

  const targetCohort = campaign.targetCohort || 'all';
  const targetedCandidates = cohortRecords.filter((rec: any) => {
    if (targetCohort === 'all') return true;
    return Array.isArray(rec.cohorts) && rec.cohorts.includes(targetCohort);
  });

  const userMap = new Map<string, any>();
  users.forEach((u) => {
    if (u.uid) userMap.set(u.uid, u);
  });

  let totalTargeted = 0;
  let totalExcludedConsent = 0;
  const eligibleCandidates: Array<{ cand: any; userObj: any }> = [];

  for (const cand of targetedCandidates) {
    totalTargeted++;
    const userObj = userMap.get(cand.userId) || {
      uid: cand.userId,
      email: cand.customerEmail,
      phone: cand.customerPhone,
      marketingEmailConsent: false,
      marketingSmsConsent: false,
    };

    // Mandatory Privacy Consent Evaluation
    let hasConsent = false;
    if (campaign.channel === 'email') {
      hasConsent = userObj.marketingEmailConsent === true;
    } else if (campaign.channel === 'sms') {
      hasConsent = userObj.marketingSmsConsent === true && !!(userObj.phone || userObj.mobileNumber || cand.customerPhone);
    }

    if (!hasConsent) {
      totalExcludedConsent++;
      continue;
    }

    eligibleCandidates.push({ cand, userObj });
  }

  const totalEligible = eligibleCandidates.length;

  // Batching & Dispatch Rate Limiting: Apply actual batch limit to enqueued items
  const requestedBatch = options.batchSize !== undefined ? Number(options.batchSize) : Number(campaign.batchSize);
  const effectiveBatchSize = (!isNaN(requestedBatch) && requestedBatch > 0) ? Math.min(requestedBatch, 500) : 50;
  const batchToProcess = eligibleCandidates.slice(0, effectiveBatchSize);

  const enqueuedItems: EnqueueNotificationResult[] = [];

  for (const { cand, userObj } of batchToProcess) {
    const recipientEmail = campaign.channel === 'email' ? (userObj.email || cand.customerEmail) : undefined;
    const recipientPhone = campaign.channel === 'sms' ? (userObj.phone || userObj.mobileNumber || cand.customerPhone) : undefined;
    const unsubscribeToken = userObj.unsubscribeToken || generateUnsubscribeToken(userObj.uid || recipientEmail || '');

    const idempotencyKey = generateNotificationIdempotencyKey(
      campaign.channel,
      userObj.uid || cand.userId,
      'marketing_campaign',
      `${campaign.id}_${userObj.uid || cand.userId}`
    );

    const queueRes = await enqueueNotification(db, {
      idempotencyKey,
      recipientId: userObj.uid || cand.userId,
      recipientEmail,
      recipientPhone,
      channel: campaign.channel,
      templateId: campaign.templateId || `campaign_${campaign.id}`,
      title: campaign.subject,
      body: campaign.body,
      metadata: {
        campaignId: campaign.id,
        campaignTitle: campaign.title,
        cohort: targetCohort,
        branchId: campaign.branchId,
        unsubscribeToken,
      },
    });

    enqueuedItems.push(queueRes);
  }

  const nowIso = new Date().toISOString();
  const updatedCampaign: MarketingCampaign = {
    ...campaign,
    status: 'queued', // Accurately queued; transitions to completed once queue worker finishes
    totalTargeted,
    totalEligible,
    totalExcludedConsent,
    enqueuedCount: enqueuedItems.length,
    dispatchedCount: 0,
    failedCount: 0,
    dispatchedAt: nowIso,
    updatedAt: nowIso,
    batchSize: effectiveBatchSize,
  };

  await campaignRef.set(updatedCampaign, { merge: true });

  return {
    campaign: updatedCampaign,
    totalTargeted,
    totalEligible,
    totalExcludedConsent,
    enqueuedCount: enqueuedItems.length,
    enqueuedItems,
  };
}

// ============================================================================
// PRIORITY C — MILESTONE C4: OPERATIONAL ANALYTICS & EXPORT ENGINE HELPERS
// ============================================================================

export interface OperationalKpis {
  dateRange: {
    startDate?: string;
    endDate?: string;
  };
  branchId: string;
  generatedAt: string;
  ecommerce: {
    gmv: number;
    aov: number;
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    refundedOrders: number;
    refundedAmount: number;
    refundRate: number;
  };
  consultations: {
    totalBookings: number;
    completed: number;
    cancelled: number;
    attendanceRate: number;
    utilizationRate: number;
  };
  workshops: {
    totalWorkshops: number;
    totalRegistrations: number;
    totalCapacity: number;
    capacityUtilization: number;
    waitlistCount: number;
    waitlistPressure: number;
  };
  support: {
    totalTickets: number;
    resolvedTickets: number;
    openTickets: number;
    slaBreachedTickets: number;
    slaComplianceRate: number;
    avgResolutionHours: number;
  };
  inventory: {
    totalSkus: number;
    stockoutRiskSkusCount: number;
    healthySkusCount: number;
    transferInTransitVolume: number;
    quarantineHoldUnits: number;
  };
}

export async function calculateOperationalKpis(
  db: any,
  user: any,
  params: {
    startDate?: string;
    endDate?: string;
    branchId?: string;
  } = {}
): Promise<OperationalKpis> {
  const userRole = String(user?.role || '').toLowerCase();
  const assignedBranch = (
    user?.assignedBranchId ||
    (userRole.startsWith('branch_manager_') ? userRole.split('_')[2] : '') ||
    'daet'
  ).toLowerCase().trim();
  let targetBranch = (params.branchId || 'all').toLowerCase().trim();

  // Branch Manager RBAC & Branch Isolation Enforcement
  if (userRole === 'branch_manager' || userRole.startsWith('branch_manager')) {
    if (params.branchId && params.branchId !== 'all' && params.branchId.toLowerCase().trim() !== assignedBranch) {
      throw new Error('PERMISSION_DENIED: Branch managers cannot access analytics for other branches.');
    }
    targetBranch = assignedBranch;
  }

  // Parse Date Range Boundaries
  let startMs: number | undefined;
  let endMs: number | undefined;

  if (params.startDate) {
    const s = String(params.startDate).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      startMs = new Date(`${s}T00:00:00.000Z`).getTime();
    } else {
      const p = Date.parse(s);
      if (!isNaN(p)) startMs = p;
    }
  }

  if (params.endDate) {
    const e = String(params.endDate).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(e)) {
      endMs = new Date(`${e}T23:59:59.999Z`).getTime();
    } else {
      const p = Date.parse(e);
      if (!isNaN(p)) endMs = p;
    }
  }

  function matchesDate(dateStr?: string): boolean {
    if (!dateStr) return true;
    const ms = Date.parse(dateStr);
    if (isNaN(ms)) return true;
    if (startMs !== undefined && ms < startMs) return false;
    if (endMs !== undefined && ms > endMs) return false;
    return true;
  }

  function matchesBranch(branchVal?: string): boolean {
    if (targetBranch === 'all') return true;
    if (!branchVal) return false;
    return String(branchVal).toLowerCase().trim() === targetBranch;
  }

  // Parallel Query Execution
  const [
    ordersSnap,
    appointmentsSnap,
    workshopsSnap,
    registrationsSnap,
    ticketsSnap,
    inventorySnap,
    transfersSnap,
    batchesSnap,
  ] = await Promise.all([
    db.collection('orders').get().catch(() => ({ docs: [], empty: true })),
    db.collection('consultation_appointments').get().catch(() => ({ docs: [], empty: true })),
    db.collection('workshops').get().catch(() => ({ docs: [], empty: true })),
    db.collection('workshop_registrations').get().catch(() => ({ docs: [], empty: true })),
    db.collection('support_tickets').get().catch(() => ({ docs: [], empty: true })),
    db.collection('inventory').get().catch(() => ({ docs: [], empty: true })),
    db.collection('inventory_transfers').get().catch(() => ({ docs: [], empty: true })),
    db.collection('product_batches').get().catch(() => ({ docs: [], empty: true })),
  ]);

  const extractDocs = (snap: any): any[] => {
    if (!snap || snap.empty) return [];
    return (snap.docs || []).map((d: any) => (typeof d.data === 'function' ? d.data() : d.data));
  };

  const allOrders = extractDocs(ordersSnap);
  const allAppointments = extractDocs(appointmentsSnap);
  const allWorkshops = extractDocs(workshopsSnap);
  const allRegistrations = extractDocs(registrationsSnap);
  const allTickets = extractDocs(ticketsSnap);
  const allInventory = extractDocs(inventorySnap);
  const allTransfers = extractDocs(transfersSnap);
  const allBatches = extractDocs(batchesSnap);

  // 1. E-Commerce KPI Calculations
  const filteredOrders = allOrders.filter((ord: any) => {
    if (!matchesBranch(ord.branchId)) return false;
    return matchesDate(ord.placedAt || ord.createdAt);
  });

  let gmv = 0;
  let completedOrders = 0;
  let cancelledOrders = 0;
  let refundedOrders = 0;
  let refundedAmount = 0;

  for (const ord of filteredOrders) {
    const total = Number(ord.grandTotal || 0);
    const status = String(ord.fulfillmentStatus || '').toLowerCase();
    const payStatus = String(ord.paymentStatus || '').toLowerCase();

    if (status === 'completed' || status === 'delivered') {
      completedOrders++;
      gmv += total;
    } else if (status === 'cancelled') {
      cancelledOrders++;
    } else {
      // Placed, processing, in_transit
      gmv += total;
    }

    if (payStatus === 'refunded' || (ord.refundedAmount && Number(ord.refundedAmount) > 0)) {
      refundedOrders++;
      refundedAmount += Number(ord.refundedAmount || (payStatus === 'refunded' ? total : 0));
    }
  }

  const totalOrders = filteredOrders.length;
  const aov = completedOrders > 0 ? (gmv / completedOrders) : (totalOrders > 0 ? (gmv / totalOrders) : 0);
  const refundRate = totalOrders > 0 ? (refundedOrders / totalOrders) : 0;

  // 2. Consultations KPI Calculations
  const filteredAppointments = allAppointments.filter((app: any) => {
    if (!matchesBranch(app.branchId)) return false;
    return matchesDate(app.scheduledDate || app.createdAt);
  });

  let appointmentsCompleted = 0;
  let appointmentsCancelled = 0;

  for (const app of filteredAppointments) {
    const status = String(app.status || '').toLowerCase();
    if (status === 'completed') {
      appointmentsCompleted++;
    } else if (status === 'cancelled') {
      appointmentsCancelled++;
    }
  }

  const totalBookings = filteredAppointments.length;
  const nonCancelledBookings = Math.max(0, totalBookings - appointmentsCancelled);
  const attendanceRate = nonCancelledBookings > 0 ? (appointmentsCompleted / nonCancelledBookings) : 0;
  const utilizationRate = totalBookings > 0 ? (appointmentsCompleted / totalBookings) : 0;

  // 3. Workshops KPI Calculations
  const filteredWorkshops = allWorkshops.filter((w: any) => {
    if (!matchesBranch(w.branchId)) return false;
    return matchesDate(w.date || w.createdAt);
  });

  const validWorkshopIds = new Set(filteredWorkshops.map((w: any) => String(w.id || w.workshopId)));

  let totalCapacity = 0;
  for (const w of filteredWorkshops) {
    totalCapacity += Number(w.capacity || 0);
  }

  const filteredRegistrations = allRegistrations.filter((reg: any) => {
    const regWId = String(reg.workshopId || '');
    if (!validWorkshopIds.has(regWId)) return false;
    return matchesDate(reg.createdAt || reg.registeredAt);
  });

  let totalRegistrations = 0;
  let waitlistCount = 0;

  for (const reg of filteredRegistrations) {
    const status = String(reg.status || '').toLowerCase();
    if (status !== 'cancelled') {
      totalRegistrations++;
    }
    if (status === 'waitlisted') {
      waitlistCount++;
    }
  }

  const capacityUtilization = totalCapacity > 0 ? Math.min(1.0, totalRegistrations / totalCapacity) : 0;
  const waitlistPressure = totalCapacity > 0 ? (waitlistCount / totalCapacity) : 0;

  // 4. Support & Redress (RA 11967) KPI Calculations
  const filteredTickets = allTickets.filter((t: any) => {
    if (!matchesBranch(t.branchId)) return false;
    return matchesDate(t.createdAt);
  });

  let resolvedTickets = 0;
  let openTickets = 0;
  let slaBreachedTickets = 0;
  let totalResolutionHours = 0;
  let countWithResolutionTime = 0;

  for (const t of filteredTickets) {
    const status = String(t.status || '').toLowerCase();
    const isResolved = status === 'resolved' || status === 'closed';
    let isBreached = false;

    if (t.slaBreached === true) {
      isBreached = true;
    }

    if (isResolved) {
      resolvedTickets++;
      if (t.createdAt && t.resolvedAt) {
        const createMs = Date.parse(t.createdAt);
        const resolveMs = Date.parse(t.resolvedAt);
        if (!isNaN(createMs) && !isNaN(resolveMs) && resolveMs >= createMs) {
          const hours = (resolveMs - createMs) / (1000 * 60 * 60);
          totalResolutionHours += hours;
          countWithResolutionTime++;
          if (hours > 48) {
            isBreached = true;
          }
        }
      }
    } else {
      openTickets++;
      if (t.createdAt) {
        const createMs = Date.parse(t.createdAt);
        if (!isNaN(createMs) && (Date.now() - createMs) > (48 * 60 * 60 * 1000)) {
          isBreached = true;
        }
      }
    }

    if (isBreached) {
      slaBreachedTickets++;
    }
  }

  const totalTickets = filteredTickets.length;
  const slaComplianceRate = totalTickets > 0 ? Math.max(0, (totalTickets - slaBreachedTickets) / totalTickets) : 1.0;
  const avgResolutionHours = countWithResolutionTime > 0 ? Number((totalResolutionHours / countWithResolutionTime).toFixed(1)) : 0;

  // 5. Inventory Operations KPI Calculations
  const filteredInventory = allInventory.filter((inv: any) => {
    return matchesBranch(inv.branchId);
  });

  let stockoutRiskSkusCount = 0;
  const totalSkus = filteredInventory.length;

  for (const inv of filteredInventory) {
    const stock = Number(inv.stockCount || inv.quantity || 0);
    const rop = Number(inv.rop || inv.reorderPoint || 20);
    if (stock <= rop) {
      stockoutRiskSkusCount++;
    }
  }

  const healthySkusCount = Math.max(0, totalSkus - stockoutRiskSkusCount);

  // Transfers in transit
  let transferInTransitVolume = 0;
  for (const trf of allTransfers) {
    const status = String(trf.status || '').toLowerCase();
    if (status === 'in_transit') {
      const srcBranch = String(trf.sourceBranchId || '').toLowerCase();
      const dstBranch = String(trf.destinationBranchId || '').toLowerCase();
      if (targetBranch === 'all' || srcBranch === targetBranch || dstBranch === targetBranch) {
        transferInTransitVolume += Number(trf.quantity || trf.totalQuantity || 0);
      }
    }
  }

  // Quarantined / Expired Holds
  let quarantineHoldUnits = 0;
  for (const batch of allBatches) {
    const status = String(batch.status || '').toLowerCase();
    const qualityStatus = String(batch.qualityStatus || '').toLowerCase();
    const isQuarantined = status === 'quarantine' || status === 'expired' || qualityStatus === 'quarantine';

    if (isQuarantined) {
      const batchBranch = String(batch.branchId || '').toLowerCase();
      if (targetBranch === 'all' || batchBranch === targetBranch) {
        quarantineHoldUnits += Number(batch.quantity || batch.stockCount || 0);
      }
    }
  }

  return {
    dateRange: {
      startDate: params.startDate,
      endDate: params.endDate,
    },
    branchId: targetBranch,
    generatedAt: new Date().toISOString(),
    ecommerce: {
      gmv: Number(gmv.toFixed(2)),
      aov: Number(aov.toFixed(2)),
      totalOrders,
      completedOrders,
      cancelledOrders,
      refundedOrders,
      refundedAmount: Number(refundedAmount.toFixed(2)),
      refundRate: Number(refundRate.toFixed(4)),
    },
    consultations: {
      totalBookings,
      completed: appointmentsCompleted,
      cancelled: appointmentsCancelled,
      attendanceRate: Number(attendanceRate.toFixed(4)),
      utilizationRate: Number(utilizationRate.toFixed(4)),
    },
    workshops: {
      totalWorkshops: filteredWorkshops.length,
      totalRegistrations,
      totalCapacity,
      capacityUtilization: Number(capacityUtilization.toFixed(4)),
      waitlistCount,
      waitlistPressure: Number(waitlistPressure.toFixed(4)),
    },
    support: {
      totalTickets,
      resolvedTickets,
      openTickets,
      slaBreachedTickets,
      slaComplianceRate: Number(slaComplianceRate.toFixed(4)),
      avgResolutionHours,
    },
    inventory: {
      totalSkus,
      stockoutRiskSkusCount,
      healthySkusCount,
      transferInTransitVolume,
      quarantineHoldUnits,
    },
  };
}

export function generateOperationalKpisCsv(kpis: OperationalKpis): string {
  const rows: Array<[string, string, string | number, string]> = [
    ['Metric Group', 'Metric Name', 'Value', 'Unit / Details'],
    // Metadata
    ['Scope', 'Branch Scope', kpis.branchId.toUpperCase(), 'Target branch or ALL'],
    ['Scope', 'Date Range Start', kpis.dateRange.startDate || 'All-Time', 'Filter boundary'],
    ['Scope', 'Date Range End', kpis.dateRange.endDate || 'Present', 'Filter boundary'],
    ['Scope', 'Report Generated At', kpis.generatedAt, 'ISO Timestamp'],
    // E-Commerce
    ['E-Commerce', 'Gross Merchandise Value (GMV)', kpis.ecommerce.gmv.toFixed(2), 'PHP (Philippine Peso)'],
    ['E-Commerce', 'Average Order Value (AOV)', kpis.ecommerce.aov.toFixed(2), 'PHP per completed order'],
    ['E-Commerce', 'Total Orders Placed', kpis.ecommerce.totalOrders, 'Orders'],
    ['E-Commerce', 'Completed Orders', kpis.ecommerce.completedOrders, 'Delivered / completed orders'],
    ['E-Commerce', 'Cancelled Orders', kpis.ecommerce.cancelledOrders, 'Cancelled orders'],
    ['E-Commerce', 'Refunded Orders', kpis.ecommerce.refundedOrders, 'Refunded orders'],
    ['E-Commerce', 'Total Refunded Amount', kpis.ecommerce.refundedAmount.toFixed(2), 'PHP'],
    ['E-Commerce', 'Refund Rate', `${(kpis.ecommerce.refundRate * 100).toFixed(2)}%`, 'Percentage of total orders'],
    // Consultations
    ['Consultations', 'Total Bookings', kpis.consultations.totalBookings, 'Appointments'],
    ['Consultations', 'Completed Sessions', kpis.consultations.completed, 'Sessions completed'],
    ['Consultations', 'Cancelled Sessions', kpis.consultations.cancelled, 'Appointments cancelled'],
    ['Consultations', 'Attendance Rate', `${(kpis.consultations.attendanceRate * 100).toFixed(1)}%`, 'Completed / non-cancelled bookings'],
    ['Consultations', 'Utilization Rate', `${(kpis.consultations.utilizationRate * 100).toFixed(1)}%`, 'Completed / total bookings'],
    // Workshops
    ['Workshops', 'Total Workshops', kpis.workshops.totalWorkshops, 'Events'],
    ['Workshops', 'Total Seat Capacity', kpis.workshops.totalCapacity, 'Seats'],
    ['Workshops', 'Total Registrations', kpis.workshops.totalRegistrations, 'Attendees registered'],
    ['Workshops', 'Capacity Utilization', `${(kpis.workshops.capacityUtilization * 100).toFixed(1)}%`, 'Registrations / capacity'],
    ['Workshops', 'Waitlist Count', kpis.workshops.waitlistCount, 'Users waitlisted'],
    ['Workshops', 'Waitlist Pressure', `${(kpis.workshops.waitlistPressure * 100).toFixed(1)}%`, 'Waitlist / capacity'],
    // Support
    ['Support', 'Total Support Tickets', kpis.support.totalTickets, 'Consumer disputes & inquiries (RA 11967)'],
    ['Support', 'Resolved Tickets', kpis.support.resolvedTickets, 'Tickets resolved / closed'],
    ['Support', 'Open Tickets', kpis.support.openTickets, 'Active pending tickets'],
    ['Support', 'SLA Breached Tickets', kpis.support.slaBreachedTickets, 'Tickets exceeding 48h resolution SLA'],
    ['Support', 'SLA Compliance Rate', `${(kpis.support.slaComplianceRate * 100).toFixed(1)}%`, 'Percentage meeting 48h SLA'],
    ['Support', 'Average Resolution Time', `${kpis.support.avgResolutionHours} hrs`, 'Mean hours to resolution'],
    // Inventory
    ['Inventory', 'Total Tracked SKUs', kpis.inventory.totalSkus, 'Product SKUs'],
    ['Inventory', 'Healthy Stock SKUs', kpis.inventory.healthySkusCount, 'Above Reorder Point (ROP)'],
    ['Inventory', 'Stockout Risk SKUs', kpis.inventory.stockoutRiskSkusCount, 'At or below Reorder Point (ROP)'],
    ['Inventory', 'Transfer In-Transit Volume', kpis.inventory.transferInTransitVolume, 'Units in transit'],
    ['Inventory', 'Quarantine Hold Units', kpis.inventory.quarantineHoldUnits, 'Units on quality / expiry hold'],
  ];

  return rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
}

export interface ServerDependencies {
  db?: any;
  auth?: any;
  kmsClient?: any;
}

export function getFirestoreDatabase() {
  return getFirestore();
}

export function createInMemoryDb() {
  const collections = new Map<string, Map<string, any>>();
  function getColMap(name: string) {
    if (!collections.has(name)) collections.set(name, new Map());
    return collections.get(name)!;
  }
  // Seed default metadata
  getColMap('_health').set('readyz', { status: 'ready', timestamp: new Date().toISOString() });
  
  // Seed admin user
  getColMap('users').set('demo-super-admin-uid', {
    uid: 'demo-super-admin-uid',
    email: 'admin@hcicmd.ph',
    role: 'super_admin',
    firstName: 'Super',
    lastName: 'Admin',
  });

  // Seed standard customer user
  getColMap('users').set('demo-customer-uid', {
    uid: 'demo-customer-uid',
    email: 'customer@gmail.com',
    role: 'customer',
    firstName: 'Jane',
    lastName: 'Doe',
    mobileNumber: '+639123456789',
    marketingEmailConsent: true,
    marketingSmsConsent: false,
  });

  // Seed branch inventory and batches
  getColMap('inventory').set('daet_hci-cmd-65ml', {
    id: 'daet_hci-cmd-65ml',
    branchId: 'daet',
    skuId: 'hci-cmd-65ml',
    activeStock: 50,
    allocatedStock: 0,
    quarantineStock: 0,
    damagedStock: 0,
  });

  getColMap('product_batches').set('batch-001', {
    id: 'batch-001',
    skuId: 'hci-cmd-65ml',
    supplierId: 'spl-001',
    quantity: 100,
    qualityControlStatus: 'passed',
    expiryDate: '2028-12-31',
  });

  getColMap('branch_batch_inventory').set('daet_batch-001', {
    id: 'daet_batch-001',
    batchId: 'batch-001',
    branchId: 'daet',
    skuId: 'hci-cmd-65ml',
    availableQuantity: 50,
    reservedQuantity: 0,
    quarantineQuantity: 0,
    damagedQuantity: 0,
    qualityControlStatus: 'passed',
    expiryDate: '2028-12-31',
  });

  const mockDb: any = {
    isMock: true,
    collection: (colName: string) => {
      const colMap = getColMap(colName);
      return {
        doc: (docId: string) => {
          const docRef = {
            id: docId,
            colName,
            get: async () => {
              const data = colMap.get(docId);
              return {
                id: docId,
                exists: !!data,
                data: () => data,
                ref: docRef,
              };
            },
            set: async (data: any, options?: any) => {
              if (options?.merge) {
                const existing = colMap.get(docId) || {};
                colMap.set(docId, { ...existing, ...data });
              } else {
                colMap.set(docId, data);
              }
            },
            update: async (data: any) => {
              const existing = colMap.get(docId) || {};
              colMap.set(docId, { ...existing, ...data });
            },
            delete: async () => {
              colMap.delete(docId);
            },
          };
          return docRef;
        },
        get: async () => {
          const docs = Array.from(colMap.entries()).map(([id, data]) => ({
            id,
            data: () => data,
            exists: true,
            ref: mockDb.collection(colName).doc(id),
          }));
          return {
            empty: docs.length === 0,
            docs,
            forEach: (cb: any) => docs.forEach(cb),
          };
        },
        where: (field1: string, op1: string, val1: any) => {
          return {
            get: async () => {
              const results: any[] = [];
              for (const [id, data] of colMap.entries()) {
                if (data[field1] === val1) {
                  results.push({
                    id,
                    exists: true,
                    data: () => data,
                    ref: mockDb.collection(colName).doc(id),
                  });
                }
              }
              return {
                empty: results.length === 0,
                docs: results,
                forEach: (cb: any) => results.forEach(cb),
              };
            },
          };
        },
      };
    },
    runTransaction: async (cb: any) => {
      const tx: any = {
        get: async (ref: any) => {
          const colMap = getColMap(ref.colName);
          const data = colMap.get(ref.id);
          return {
            id: ref.id,
            exists: !!data,
            data: () => data,
          };
        },
        set: async (ref: any, data: any, options?: any) => {
          const colMap = getColMap(ref.colName);
          if (options?.merge) {
            const existing = colMap.get(ref.id) || {};
            colMap.set(ref.id, { ...existing, ...data });
          } else {
            colMap.set(ref.id, data);
          }
        },
        update: async (ref: any, data: any) => {
          const colMap = getColMap(ref.colName);
          const existing = colMap.get(ref.id) || {};
          colMap.set(ref.id, { ...existing, ...data });
        },
      };
      return cb(tx);
    },
  };
  return mockDb;
}

export function createExpressApp(deps: ServerDependencies = {}): Express {
  const app = express();
  app.use(express.json());

  // Phase 9B-1: In-Memory Rate Limiting Store & Middleware
  const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
  function createRateLimiter(windowMs: number, maxRequests: number, message = 'Rate limit exceeded. Please try again later.') {
    return (req: Request, res: Response, next: () => void) => {
      const clientKey = `${req.ip || req.headers['x-forwarded-for'] || 'unknown'}:${req.path}`;
      const now = Date.now();
      let record = rateLimitStore.get(clientKey);
      if (!record || now > record.resetAt) {
        record = { count: 1, resetAt: now + windowMs };
        rateLimitStore.set(clientKey, record);
        next();
        return;
      }
      record.count++;
      if (record.count > maxRequests) {
        res.status(429).json({ error: message, retryAfterSeconds: Math.ceil((record.resetAt - now) / 1000) });
        return;
      }
      next();
    };
  }

  const standardRateLimiter = createRateLimiter(60000, 60); // 60 req/min
  const strictRateLimiter = createRateLimiter(60000, 15);    // 15 req/min for checkout & unsubscribe
  const authRateLimiter = createRateLimiter(60000, 5, 'Too many authentication attempts. Please try again later.'); // 5 req/min for auth / login brute-force protection

  app.use((req, res, next) => {
    const startTime = Date.now();
    const incomingTrace = req.headers['x-correlation-id'] || req.headers['x-request-id'];
    const correlationId = (typeof incomingTrace === 'string' && incomingTrace.trim())
      ? incomingTrace.trim()
      : (crypto.randomUUID ? crypto.randomUUID() : `TRACE-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`);
    (req as any).correlationId = correlationId;
    (req as any).requestId = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    res.setHeader('X-Request-Id', correlationId);

    res.on('finish', () => {
      const durationMs = Date.now() - startTime;
      if (req.path !== '/healthz' && req.path !== '/readyz') {
        logger.info('HTTP request completed', {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          correlationId,
          durationMs
        });
      }
    });

    next();
  });

  let db: any = deps.db;
  if (!db) {
    const isProduction = process.env.NODE_ENV === 'production';
    const useMock = process.env.USE_MOCK_DB === 'true' || (!isProduction && !process.env.FIREBASE_CONFIG && !process.env.GOOGLE_APPLICATION_CREDENTIALS);

    if (useMock && !isProduction) {
      console.log('[Database] Initializing in-memory mock database.');
      db = createInMemoryDb();
    } else {
      console.log('[Database] Initializing real Firestore database.');
      db = getFirestore();
    }
  }
  const auth = deps.auth || getAuth();
  const kmsClient = deps.kmsClient || new KeyManagementServiceClient();

  // 1. Health Liveness Check Endpoint
  const handleHealthz = (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  };
  app.get('/healthz', handleHealthz);
  app.get('/api/healthz', handleHealthz);

  // 2. Readiness Probe Endpoint
  const handleReadyz = async (_req: Request, res: Response) => {
    if (process.env.MAINTENANCE_MODE === 'true' || process.env.MAINTENANCE_MODE === '1') {
      res.status(503).json({ status: 'maintenance_mode', message: 'Service undergoing scheduled maintenance' });
      return;
    }

    try {
      getHmacSecret();

      if (db && typeof db.collection === 'function') {
        await db.collection('_health').doc('readyz').get();
      }

      res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
    } catch (err: any) {
      logger.error('Readiness probe failed', { error: err?.message || String(err) });
      res.status(503).json({ status: 'not_ready', error: 'Service initialization or dependency unavailable' });
    }
  };
  app.get('/readyz', handleReadyz);
  app.get('/api/readyz', handleReadyz);

  if (process.env.NODE_ENV === 'test' || process.env.ENABLE_TEST_ROUTES === 'true') {
    app.get('/api/test-uncaught-error', (_req: Request, _res: Response, next: any) => {
      const err = new Error('TEST_UNCAUGHT_DATABASE_SECRET_LEAK_ERROR: sensitive_internal_db_password_12345');
      next(err);
    });
  }

  async function logAuditEvent(
    actorUid: string | null,
    actorRole: string | null,
    branchId: string | null,
    action: string,
    targetResource: string,
    targetId: string | null,
    success: boolean,
    metadata: Record<string, any> = {},
    req?: Request
  ): Promise<void> {
    const logId = `LOG-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const safeMetadata: Record<string, any> = {};

    for (const [key, val] of Object.entries(metadata)) {
      const lower = key.toLowerCase();
      if (
        lower.includes('token') ||
        lower.includes('secret') ||
        lower.includes('key') ||
        lower.includes('ciphertext') ||
        lower.includes('password') ||
        lower.includes('clinical') ||
        lower.includes('intake') ||
        lower.includes('dietary') ||
        lower.includes('water') ||
        lower.includes('condition')
      ) {
        continue;
      }
      safeMetadata[key] = typeof val === 'object' && val !== null ? JSON.stringify(val) : val;
    }

    const logEntry = {
      id: logId,
      actorUid: actorUid || 'anonymous',
      actorRole: actorRole || 'unauthenticated',
      branchId: branchId || null,
      action,
      targetResource,
      targetId: targetId || null,
      timestamp: new Date().toISOString(),
      success,
      metadata: safeMetadata,
      correlationId: (req as any)?.correlationId || 'no-correlation',
    };

    try {
      await db.collection('audit_logs').doc(logId).set(logEntry);
    } catch (err: any) {
      console.warn('Failed to write audit log event:', err.message);
    }
  }

  const googleAuthClient = new OAuth2Client();
  const AUTHORIZED_SA = process.env.AUTHORIZED_SERVICE_ACCOUNT_EMAIL || '';

  // Auth boundary rate limiting (protects against token brute-forcing / enumeration)
  const failedAuthAttemptsStore = new Map<string, { count: number; resetAt: number }>();
  function checkAuthBruteForce(ip: string): boolean {
    const record = failedAuthAttemptsStore.get(ip);
    const now = Date.now();
    if (record && now < record.resetAt && record.count >= 5) {
      return true; // Blocked
    }
    return false;
  }
  function recordAuthFailure(ip: string) {
    const now = Date.now();
    let record = failedAuthAttemptsStore.get(ip);
    if (!record || now > record.resetAt) {
      failedAuthAttemptsStore.set(ip, { count: 1, resetAt: now + 60000 });
    } else {
      record.count++;
    }
  }

  async function requireAuth(req: Request, res: Response): Promise<AuthenticatedUser | null> {
    const clientIp = (req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown') as string;
    if (checkAuthBruteForce(clientIp)) {
      const errorMsg = 'Authentication Blocked: Too many failed authentication attempts. Please try again in 1 minute.';
      await logAuditEvent(null, null, null, 'authorization_failure', 'auth', null, false, { error: errorMsg, path: req.path }, req);
      res.status(429).json({ error: errorMsg });
      return null;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const errorMsg = 'Authentication Required: Missing or malformed Bearer token in Authorization header.';
      await logAuditEvent(null, null, null, 'authorization_failure', 'auth', null, false, { error: errorMsg, path: req.path }, req);
      res.status(401).json({ error: errorMsg });
      return null;
    }

    const idToken = authHeader.split('Bearer ')[1].trim();
    if (!idToken) {
      const errorMsg = 'Authentication Required: Empty Bearer token provided.';
      await logAuditEvent(null, null, null, 'authorization_failure', 'auth', null, false, { error: errorMsg, path: req.path }, req);
      res.status(401).json({ error: errorMsg });
      return null;
    }

    let uid: string;
    let email: string | undefined;

    // Support demo mode tokens for preview/dev environments
    if (idToken.startsWith('DEMO_TOKEN_')) {
      if (process.env.NODE_ENV === 'production') {
        const errorMsg = 'Authentication Failed: Demo tokens are strictly forbidden in production.';
        recordAuthFailure(clientIp);
        await logAuditEvent(null, null, null, 'authorization_failure', 'auth', null, false, { error: errorMsg, path: req.path }, req);
        res.status(401).json({ error: errorMsg });
        return null;
      }
      const demoRole = idToken.replace('DEMO_TOKEN_', '').toLowerCase() as any;
      uid = `demo-${demoRole}-uid`;
      email = `${demoRole}@hcicmd.ph`;
      return {
        uid,
        role: demoRole,
        assignedBranchId: demoRole === 'branch_manager' ? 'daet' : undefined,
        email,
      };
    }

    // Try Firebase Identity Token
    try {
      const decoded = await auth.verifyIdToken(idToken);
      uid = decoded.uid;
      email = decoded.email;
    } catch (firebaseErr: any) {
      // Fallback: Support Google Identity Tokens for Service-to-Service staging validation (NON-PRODUCTION ONLY)
      if (process.env.NODE_ENV !== 'production' && AUTHORIZED_SA) {
        try {
          const allowedAudiences = [
            process.env.APP_URL,
            process.env.STAGING_URL,
            'https://ais-dev-twqasbvtmkrtsllriliohj-212282537635.asia-east1.run.app',
            'https://ais-pre-twqasbvtmkrtsllriliohj-212282537635.asia-east1.run.app'
          ];
          
          const host = req.headers.host;
          if (host) {
            allowedAudiences.push(`http://${host}`);
            allowedAudiences.push(`https://${host}`);
          }

          const ticket = await googleAuthClient.verifyIdToken({
            idToken,
            audience: allowedAudiences.filter(Boolean) as string[]
          });
          const payload = ticket.getPayload();
          if (payload && payload.email === AUTHORIZED_SA) {
            logger.info('Authenticated via Google OIDC Identity Token (staging/dev only)', { email: payload.email });
            return {
              uid: `sa-${payload.sub}`,
              role: 'super_admin', // Staging service account verification grants super admin for smoke testing
              email: payload.email,
            };
          }
        } catch (googleErr: any) {
          logger.error('Google OIDC verification failed', { error: googleErr.message, audience: [process.env.APP_URL, process.env.STAGING_URL] });
        }
      }

      recordAuthFailure(clientIp);
      const errorMsg = `Authentication Failed: Token verification failed (Firebase: ${firebaseErr.message})`;
      await logAuditEvent(null, null, null, 'authorization_failure', 'auth', null, false, { error: errorMsg, path: req.path }, req);
      res.status(401).json({ error: errorMsg });
      return null;
    }

    try {
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists) {
        return { uid, role: 'customer', email };
      }
      const userData = userDoc.data();
      const role = userData?.role || 'customer';
      return { uid, role, assignedBranchId: userData?.assignedBranchId, email };
    } catch (err: any) {
      const errorMsg = `Authorization Lookup Failed: Unable to verify user profile (${err.message}).`;
      res.status(500).json({ error: errorMsg });
      return null;
    }
  }

  async function verifyPractitionerAssignment(practitionerUid: string, patientUid: string): Promise<boolean> {
    try {
      const assignmentSnap = await db.collection('consultation_assignments').doc(`${practitionerUid}_${patientUid}`).get();
      if (assignmentSnap.exists) {
        const data = assignmentSnap.data();
        if (data && data.active === true) {
          return true;
        }
      }
    } catch (err: any) {
      throw new Error(`Assignment verification failed: ${err.message}`);
    }
    return false;
  }

  async function encryptClinicalPayload(payload: any): Promise<{ ciphertext: string; iv: string; tag: string; encryptedKey: string; keyId: string }> {
    let dek: Buffer | null = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);

    try {
      const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);
      let ciphertext = cipher.update(JSON.stringify(payload), 'utf8', 'base64');
      ciphertext += cipher.final('base64');
      const tag = cipher.getAuthTag();

      let encryptedKey: Buffer;
      try {
        const [encryptRes] = await kmsClient.encrypt({
          name: KMS_KEY_NAME,
          plaintext: dek,
        });
        if (!encryptRes.ciphertext) throw new Error('Cloud KMS returned empty ciphertext for DEK encryption.');
        encryptedKey = Buffer.from(encryptRes.ciphertext as Uint8Array);
      } catch (kmsErr: any) {
        throw new Error(`Cloud KMS Key Wrapping Failure: ${kmsErr.message}`);
      }

      return {
        ciphertext,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        encryptedKey: encryptedKey.toString('base64'),
        keyId: KMS_KEY_NAME,
      };
    } finally {
      if (dek) {
        dek.fill(0);
        dek = null;
      }
    }
  }

  async function decryptClinicalPayload(ciphertext: string, ivBase64: string, tagBase64: string, encryptedKeyBase64: string): Promise<any> {
    const iv = Buffer.from(ivBase64, 'base64');
    const tag = Buffer.from(tagBase64, 'base64');
    const encryptedKey = Buffer.from(encryptedKeyBase64, 'base64');

    let dek: Buffer | null = null;
    try {
      const [result] = await kmsClient.decrypt({
        name: KMS_KEY_NAME,
        ciphertext: encryptedKey,
      });
      if (!result.plaintext) throw new Error('Cloud KMS returned empty plaintext for DEK decryption.');
      dek = Buffer.from(result.plaintext as Uint8Array);
    } catch (kmsErr: any) {
      throw new Error(`Cloud KMS Decryption Failure: ${kmsErr.message}`);
    }

    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', dek, iv, { authTagLength: 16 });
      decipher.setAuthTag(tag);
      let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
      plaintext += decipher.final('utf8');
      return JSON.parse(plaintext);
    } catch (decryptErr: any) {
      throw new Error(`Clinical Record Decryption Failed: ${decryptErr.message}`);
    } finally {
      if (dek) {
        dek.fill(0);
        dek = null;
      }
    }
  }

  // --- 1. POST /api/calculate-order ---
  app.post('/api/calculate-order', (req: Request, res: Response): void => {
    const { items, deliveryMethod } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'items array is required and must not be empty.' });
      return;
    }

    let subtotal = 0;
    const computedItems = [];

    for (const item of items) {
      if (!item.skuId || !PRODUCTS_CATALOG[item.skuId]) {
        res.status(400).json({ error: `Invalid SKU ID: ${item.skuId}` });
        return;
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
        res.status(400).json({ error: `Invalid quantity for SKU: ${item.skuId}` });
        return;
      }

      const product = PRODUCTS_CATALOG[item.skuId];
      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;
      computedItems.push({
        skuId: item.skuId,
        quantity: item.quantity,
        unitPrice: product.price,
        totalPrice: itemTotal,
        productName: product.name,
      });
    }

    const shippingFee = deliveryMethod === 'door_to_door' ? 150 : 0;
    const grandTotal = subtotal + shippingFee;

    res.json({
      items: computedItems,
      subtotal,
      shippingFee,
      taxAmount: 0,
      grandTotal,
    });
  });

  async function performFefoReservationInternal(
    transaction: any,
    normalizedBranch: string,
    skuId: string,
    reqQty: number,
    nowIso: string
  ) {
    const batchQuery = db.collection('branch_batch_inventory')
      .where('branchId', '==', normalizedBranch)
      .where('skuId', '==', skuId);
    const batchSnap = await transaction.get(batchQuery);

    const eligibleCandidates: Array<{ branchBatchDocRef: any; branchBatch: any; productBatch: any }> = [];

    if (batchSnap && !batchSnap.empty) {
      for (const docSnap of batchSnap.docs) {
        const bData = docSnap.data();
        const available = Number(bData.availableQuantity) || 0;
        if (available <= 0) continue; // Skip zero-stock

        const pbRef = db.collection('product_batches').doc(bData.batchId);
        const pbSnap = await transaction.get(pbRef);

        if (!pbSnap.exists) continue;
        const pbData = pbSnap.data();

        if (pbData.qualityControlStatus !== 'passed') continue; // Skip pending or failed QC
        if (!pbData.expiryDate || pbData.expiryDate <= nowIso) continue; // Skip expired
        if (pbData.skuId !== skuId) continue; // Skip wrong SKU

        eligibleCandidates.push({
          branchBatchDocRef: docSnap.ref,
          branchBatch: bData,
          productBatch: pbData,
        });
      }
    }

    // FEFO Ordering: sort by earliest valid expiryDate
    eligibleCandidates.sort((a, b) => {
      const expA = Date.parse(a.productBatch.expiryDate || a.branchBatch.expiryDate) || 0;
      const expB = Date.parse(b.productBatch.expiryDate || b.branchBatch.expiryDate) || 0;
      return expA - expB;
    });

    const totalEligibleAvailable = eligibleCandidates.reduce((sum, c) => sum + (Number(c.branchBatch.availableQuantity) || 0), 0);
    if (totalEligibleAvailable < reqQty) {
      throw new Error(`INSUFFICIENT_ELIGIBLE_STOCK: Requested ${reqQty} units for SKU ${skuId}, but only ${totalEligibleAvailable} eligible units available across passed & unexpired batches.`);
    }

    let remainingToAllocate = reqQty;
    const allocations: Array<{ batchId: string; quantityReserved: number; expiryDate: string }> = [];
    const updatedBatches: any[] = [];

    for (const candidate of eligibleCandidates) {
      if (remainingToAllocate <= 0) break;
      const currentAvail = Number(candidate.branchBatch.availableQuantity) || 0;
      const allocQty = Math.min(currentAvail, remainingToAllocate);

      const newAvail = currentAvail - allocQty;
      const newReserved = (Number(candidate.branchBatch.reservedQuantity) || 0) + allocQty;

      const updatedBatch = {
        ...candidate.branchBatch,
        availableQuantity: newAvail,
        reservedQuantity: newReserved,
        updatedAt: nowIso,
      };

      transaction.set(candidate.branchBatchDocRef, updatedBatch);
      updatedBatches.push(updatedBatch);

      allocations.push({
        batchId: candidate.branchBatch.batchId,
        quantityReserved: allocQty,
        expiryDate: candidate.productBatch.expiryDate || candidate.branchBatch.expiryDate,
      });

      remainingToAllocate -= allocQty;
    }

    const allBranchBatchesQuery = db.collection('branch_batch_inventory')
      .where('branchId', '==', normalizedBranch)
      .where('skuId', '==', skuId);
    const allBatchesSnap = await transaction.get(allBranchBatchesQuery);
    const allBatches: any[] = [];
    if (allBatchesSnap && !allBatchesSnap.empty) {
      allBatchesSnap.forEach((d: any) => {
        const data = d.data();
        const modified = updatedBatches.find((ub) => ub.id === data.id);
        allBatches.push(modified || data);
      });
    }

    const updatedAggregate = computeAggregateInventoryFromBatches({
      branchBatches: allBatches,
      branchId: normalizedBranch,
      skuId,
      lastAdjustmentAt: nowIso,
    });

    const aggDocRef = db.collection('inventory').doc(`${normalizedBranch}_${skuId}`);
    transaction.set(aggDocRef, updatedAggregate);

    return {
      skuId,
      branchId: normalizedBranch,
      requestedQuantity: reqQty,
      totalReservedQuantity: reqQty,
      allocations,
      remainingAvailableQuantity: updatedAggregate.activeStock,
      updatedAggregate,
    };
  }

  async function executeSafeRefund(
    orderId: string,
    refundAmount: number,
    reason: string,
    refundKey: string,
    user: AuthenticatedUser,
    req: Request
  ): Promise<{ success: boolean; isReplay: boolean; refundRecord?: any; order?: any; error?: string }> {
    const nowIso = new Date().toISOString();
    const intentDocId = `rfnd_${orderId}_${crypto.createHash('sha256').update(refundKey).digest('hex').substring(0, 12)}`;
    const intentRef = db.collection('refund_intents').doc(intentDocId);
    const orderRef = db.collection('orders').doc(orderId);

    let orderData: any;
    let paymentId: string = orderId;
    let paymentMethod: string = 'cash_on_delivery';
    let isReplay = false;

    try {
      await db.runTransaction(async (transaction: any) => {
        const intentSnap = await transaction.get(intentRef);
        let alreadyReserved = false;
        if (intentSnap && intentSnap.exists) {
          const existingIntent = typeof intentSnap.data === 'function' ? intentSnap.data() : intentSnap.data;
          if (existingIntent.status === 'completed') {
            isReplay = true;
            orderData = existingIntent.updatedOrder;
            return;
          }
          if (existingIntent.reserved) {
            alreadyReserved = true;
          }
        }

        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap || !orderSnap.exists) {
          throw new Error(`Order not found: ${orderId}`);
        }
        orderData = typeof orderSnap.data === 'function' ? orderSnap.data() : orderSnap.data;

        paymentId = orderData.paymentIntent?.paymentId || orderId;
        paymentMethod = orderData.paymentMethod || 'cash_on_delivery';

        if (isNaN(refundAmount) || refundAmount <= 0) {
          throw new Error('Refund amount must be greater than 0.');
        }

        const currentRefunded = Number(orderData.refundedAmount) || 0;
        const currentReserved = Number(orderData.reservedRefundAmount) || 0;
        const grandTotal = Number(orderData.grandTotal) || 0;
        const remainingBalance = Number(orderData.remainingRefundableBalance ?? (grandTotal - currentRefunded));
        const availableRefundBalance = remainingBalance - currentReserved;

        if (remainingBalance <= 0 || orderData.paymentStatus === 'refunded') {
          throw new Error('Order is already fully refunded.');
        }

        if (refundAmount > availableRefundBalance) {
          throw new Error(`Refund amount PHP ${refundAmount} exceeds available refundable balance PHP ${availableRefundBalance}.`);
        }

        // Atomically reserve refund amount on order document to cause transactional contention
        const newReserved = alreadyReserved ? currentReserved : (currentReserved + refundAmount);
        if (!alreadyReserved) {
          transaction.update(orderRef, {
            reservedRefundAmount: newReserved,
            updatedAt: nowIso,
          });

          transaction.set(intentRef, {
            orderId,
            refundAmount,
            reason,
            refundKey,
            status: 'processing',
            reserved: true,
            createdAt: nowIso,
            updatedAt: nowIso,
          }, { merge: true });
        }
      });
    } catch (err: any) {
      return { success: false, isReplay: false, error: err.message };
    }

    if (isReplay) {
      return { success: true, isReplay: true, order: orderData };
    }

    // External provider refund (outside transaction)
    const providerIdempotencyKey = `prv_${intentDocId}`;
    const paymentAdapter = PaymentAdapterRegistry.getAdapter(paymentMethod);
    let refundRes: PaymentRefundResult;

    try {
      refundRes = await paymentAdapter.processRefund(paymentId, refundAmount, reason, providerIdempotencyKey);
    } catch (providerErr: any) {
      dispatchAlert({
        category: 'payment_provider_failure',
        severity: 'SEV-1',
        message: `Refund provider failed for order ${orderId}: ${providerErr.message}`,
        details: {
          orderId,
          paymentId,
          refundAmount,
          reason,
          error: providerErr.message,
        },
      }).catch(() => {});

      // Release reserved refund amount on provider failure
      await db.runTransaction(async (transaction: any) => {
        const orderSnap = await transaction.get(orderRef);
        if (orderSnap && orderSnap.exists) {
          const txOrderData = typeof orderSnap.data === 'function' ? orderSnap.data() : orderSnap.data;
          const currentReserved = Number(txOrderData.reservedRefundAmount) || 0;
          const newReserved = Math.max(0, currentReserved - refundAmount);
          transaction.update(orderRef, { reservedRefundAmount: newReserved, updatedAt: new Date().toISOString() });
        }

        transaction.set(intentRef, {
          orderId,
          refundAmount,
          reason,
          refundKey,
          status: 'failed',
          lastError: providerErr.message,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      });
      return { success: false, isReplay: false, error: `Refund provider failed: ${providerErr.message}` };
    }

    let finalOrder: any;
    let refundRecord: any;

    await db.runTransaction(async (transaction: any) => {
      const txOrderSnap = await transaction.get(orderRef);
      const txOrderData = typeof txOrderSnap.data === 'function' ? txOrderSnap.data() : txOrderSnap.data;

      const currentReserved = Number(txOrderData.reservedRefundAmount) || 0;
      const newReserved = Math.max(0, currentReserved - refundAmount);

      const currentRefunded = Number(txOrderData.refundedAmount) || 0;
      const currentRemaining = Number(txOrderData.remainingRefundableBalance ?? (Number(txOrderData.grandTotal) - currentRefunded));

      const newRefunded = currentRefunded + refundAmount;
      const newRemaining = Math.max(0, currentRemaining - refundAmount);
      const newPaymentStatus = newRemaining <= 0 ? 'refunded' : 'partially_refunded';

      const refundId = `RFND-${orderId}-${Date.now().toString().slice(-4)}`;
      refundRecord = {
        refundId,
        orderId,
        amount: refundAmount,
        reason,
        refundedBy: user.uid,
        refundedAt: nowIso,
        refundKey,
        providerResult: refundRes,
      };

      finalOrder = {
        ...txOrderData,
        reservedRefundAmount: newReserved,
        paymentStatus: newPaymentStatus,
        refundedAmount: newRefunded,
        remainingRefundableBalance: newRemaining,
        updatedAt: nowIso,
      };

      transaction.update(orderRef, {
        reservedRefundAmount: newReserved,
        paymentStatus: newPaymentStatus,
        refundedAmount: newRefunded,
        remainingRefundableBalance: newRemaining,
        updatedAt: nowIso,
      });

      transaction.set(intentRef, {
        orderId,
        refundAmount,
        reason,
        refundKey,
        status: 'completed',
        refundRecord,
        updatedOrder: finalOrder,
        updatedAt: nowIso,
      });
    });

    await logAuditEvent(
      user.uid,
      user.role,
      finalOrder.branchId,
      'order_refund_processed',
      'orders',
      orderId,
      true,
      { refundAmount, reason, refundKey },
      req
    );

    return { success: true, isReplay: false, refundRecord, order: finalOrder };
  }

  // --- 2. POST /api/orders/checkout ---
  app.post('/api/orders/checkout', strictRateLimiter, async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const idempotencyKey = (
      req.headers['x-idempotency-key'] ||
      req.headers['idempotency-key'] ||
      req.body?.idempotencyKey ||
      req.body?.idempotency_key
    )?.toString().trim();

    if (!idempotencyKey) {
      res.status(400).json({ error: 'Missing required idempotencyKey for checkout.' });
      return;
    }

    const { items, branchId, deliveryMethod, paymentMethod, customer } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'items array must not be empty.' });
      return;
    }
    if (!branchId || typeof branchId !== 'string') {
      res.status(400).json({ error: 'Missing or invalid branchId.' });
      return;
    }

    const normalizedBranch = branchId.toLowerCase().trim();
    if (!SUPPORTED_BRANCH_IDS.includes(normalizedBranch as any)) {
      res.status(400).json({ error: `Invalid branchId: '${branchId}'. Must be one of: ${SUPPORTED_BRANCH_IDS.join(', ')}` });
      return;
    }

    const itemMap = new Map<string, number>();
    for (const item of items) {
      if (!item.skuId || !ACTIVE_CONSUMER_SKUS.includes(item.skuId as any) || !PRODUCTS_CATALOG[item.skuId]) {
        res.status(400).json({ error: `Invalid or unsupported SKU: ${item.skuId}` });
        return;
      }
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        res.status(400).json({ error: `Invalid quantity for SKU: ${item.skuId}` });
        return;
      }
      itemMap.set(item.skuId, (itemMap.get(item.skuId) || 0) + qty);
    }

    const normalizedItems = Array.from(itemMap.entries()).map(([skuId, quantity]) => ({
      skuId,
      quantity,
    }));

    const hash = crypto.createHash('sha256').update(`${user.uid}_${idempotencyKey}`).digest('hex').substring(0, 8).toUpperCase();
    const orderId = `HCI-ORD-${hash}`;
    const nowIso = new Date().toISOString();
    const keyDocId = `${user.uid}_${idempotencyKey}`;

    let orderRecord: any;
    let isReplay = false;
    let isRetryOfFailed = false;

    try {
      await ensureInventorySeeded();

      // PHASE A: Firestore transaction — Validate pricing, reserve FEFO inventory, create pending order
      await db.runTransaction(async (transaction: any) => {
        const keyRef = db.collection('idempotency_keys').doc(keyDocId);
        const keySnap = await transaction.get(keyRef);

        if (keySnap && keySnap.exists) {
          const existingData = typeof keySnap.data === 'function' ? keySnap.data() : keySnap.data;
          const status = existingData.checkoutStatus;

          if (status === 'completed') {
            orderRecord = existingData.orderRecord;
            isReplay = true;
            return;
          }

          if (status === 'failed' || status === 'pending_provider') {
            const existingOrderRef = db.collection('orders').doc(existingData.orderId || orderId);
            const existingOrderSnap = await transaction.get(existingOrderRef);
            if (existingOrderSnap && existingOrderSnap.exists) {
              orderRecord = typeof existingOrderSnap.data === 'function' ? existingOrderSnap.data() : existingOrderSnap.data;
            } else {
              orderRecord = existingData.orderRecord;
            }
            isRetryOfFailed = true;
            return;
          }
        }

        const deliveryAdapter = DeliveryAdapterRegistry.getAdapter(deliveryMethod || 'branch_pickup');
        const deliveryQuote = await deliveryAdapter.calculateShippingFee(deliveryMethod || 'branch_pickup', normalizedBranch, customer?.shippingAddress);
        const shippingFee = deliveryQuote.shippingFee;

        let subtotal = 0;
        const computedItems: any[] = [];
        for (const item of normalizedItems) {
          const prod = PRODUCTS_CATALOG[item.skuId];
          const qty = item.quantity;
          const itemTotal = prod.price * qty;
          subtotal += itemTotal;

          computedItems.push({
            skuId: item.skuId,
            quantity: qty,
            unitPrice: prod.price,
            totalPrice: itemTotal,
            productName: prod.name,
          });
        }
        const grandTotal = subtotal + shippingFee;

        const batchAllocations: Record<string, any[]> = {};
        for (const item of normalizedItems) {
          const reservationRes = await performFefoReservationInternal(
            transaction,
            normalizedBranch,
            item.skuId,
            item.quantity,
            nowIso
          );

          batchAllocations[item.skuId] = reservationRes.allocations;
        }

        orderRecord = {
          id: orderId,
          userId: user.uid,
          customer: customer || { firstName: 'Juan', lastName: 'Dela Cruz', email: user.email || '' },
          items: computedItems,
          batchAllocations,
          branchId: normalizedBranch,
          deliveryMethod: deliveryMethod || 'branch_pickup',
          paymentMethod: paymentMethod || 'cash_on_delivery',
          paymentStatus: 'pending_payment',
          fulfillmentStatus: 'pending_processing',
          subtotal,
          shippingFee,
          taxAmount: 0,
          grandTotal,
          refundedAmount: 0,
          remainingRefundableBalance: grandTotal,
          idempotencyKey,
          checkoutStatus: 'pending_provider',
          placedAt: nowIso,
          updatedAt: nowIso,
        };

        const orderDocRef = db.collection('orders').doc(orderId);
        transaction.set(orderDocRef, orderRecord);
        transaction.set(keyRef, {
          userId: user.uid,
          idempotencyKey,
          orderId,
          orderRecord,
          checkoutStatus: 'pending_provider',
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      });

      if (isReplay) {
        res.status(200).json({ success: true, orderId: orderRecord.id, order: orderRecord, idempotentReplay: true });
        return;
      }

      if (isRetryOfFailed) {
        // Reconcile outstanding payment compensation if present
        const compRef = db.collection('payment_compensations').doc(orderRecord.id || orderId);
        const compSnap = await compRef.get();
        const compData = compSnap.exists ? compSnap.data() : null;

        const needsCompReconciliation = (compData && (compData.status === 'failed' || compData.status === 'processing')) || orderRecord.compensationStatus === 'failed';

        if (needsCompReconciliation) {
          const paymentAdapter = PaymentAdapterRegistry.getAdapter(orderRecord.paymentMethod || 'cash_on_delivery');
          const compPaymentId = compData?.paymentId || orderRecord.paymentIntent?.paymentId || orderRecord.id || orderId;
          const compAmount = Number(compData?.amount || orderRecord.grandTotal) || 0;
          const compKey = compData?.providerIdempotencyKey || `comp_${orderRecord.id || orderId}`;

          let retryCompSuccess = false;
          let retryCompResult: any = null;
          let retryCompError: string | null = null;

          try {
            retryCompResult = await paymentAdapter.processRefund(
              compPaymentId,
              compAmount,
              'Reconciling compensating refund on checkout retry',
              compKey
            );
            retryCompSuccess = true;
          } catch (retryErr: any) {
            retryCompError = retryErr?.message || String(retryErr);
          }

          if (retryCompSuccess) {
            let updatedOrder: any;
            await db.runTransaction(async (transaction: any) => {
              const orderRef = db.collection('orders').doc(orderRecord.id || orderId);
              const keyRef = db.collection('idempotency_keys').doc(keyDocId);

              transaction.set(compRef, {
                status: 'completed',
                providerResult: retryCompResult,
                updatedAt: new Date().toISOString(),
              }, { merge: true });

              updatedOrder = {
                ...orderRecord,
                compensationStatus: 'completed',
                refundedAmount: compAmount,
                remainingRefundableBalance: 0,
                paymentStatus: 'refunded',
                updatedAt: new Date().toISOString(),
              };

              transaction.set(orderRef, updatedOrder, { merge: true });
              transaction.set(keyRef, {
                userId: user.uid,
                idempotencyKey,
                orderId: orderRecord.id || orderId,
                orderRecord: updatedOrder,
                checkoutStatus: 'failed',
                updatedAt: new Date().toISOString(),
              }, { merge: true });
            });

            res.status(200).json({
              success: true,
              orderId: updatedOrder.id,
              order: updatedOrder,
              idempotentReplay: true,
              compensationReconciled: true,
            });
            return;
          } else {
            res.status(500).json({
              error: `Compensation reconciliation failed on checkout retry: ${retryCompError}`,
              compensationStatus: 'failed',
              orderId: orderRecord.id || orderId,
            });
            return;
          }
        }

        const isPaymentFailedRetry = orderRecord.checkoutStatus === 'failed' && 
          orderRecord.paymentStatus !== 'paid' && 
          orderRecord.paymentStatus !== 'authorized' &&
          !orderRecord.paymentIntent;

        if (isPaymentFailedRetry) {
          const paymentAdapter = PaymentAdapterRegistry.getAdapter(orderRecord.paymentMethod || 'cash_on_delivery');
          const deliveryAdapter = DeliveryAdapterRegistry.getAdapter(orderRecord.deliveryMethod || 'door_to_door');

          const paymentIdempotencyKey = `pay_chk_${user.uid}_${orderRecord.id}_${idempotencyKey}`;
          const deliveryIdempotencyKey = `del_chk_${orderRecord.id}`;

          let paymentIntent: PaymentIntent | undefined = undefined;
          let fulfillment: DeliveryFulfillment | undefined = undefined;

          try {
            paymentIntent = await paymentAdapter.createPaymentIntent(
              orderRecord.id,
              orderRecord.grandTotal,
              orderRecord.paymentMethod,
              { customerEmail: orderRecord.customer?.email },
              paymentIdempotencyKey
            );

            fulfillment = await deliveryAdapter.createFulfillment(
              orderRecord.id,
              orderRecord.deliveryMethod,
              orderRecord.branchId,
              orderRecord.customer?.shippingAddress,
              deliveryIdempotencyKey
            );
          } catch (providerErr: any) {
            let compensationStatus: string | undefined = undefined;
            let compensationError: string | undefined = undefined;

            if (paymentIntent && (paymentIntent.status === 'paid' || paymentIntent.status === 'authorized')) {
              const compRef = db.collection('payment_compensations').doc(orderRecord.id);
              const compKey = `comp_${orderRecord.id}`;

              await db.runTransaction(async (transaction: any) => {
                transaction.set(compRef, {
                  status: 'processing',
                  orderId: orderRecord.id,
                  paymentId: paymentIntent!.paymentId,
                  amount: orderRecord.grandTotal,
                  providerIdempotencyKey: compKey,
                  reason: 'Compensating refund due to delivery fulfillment failure',
                  createdAt: nowIso,
                  updatedAt: nowIso,
                });
              });

              let compSuccess = false;
              let compResult: any = null;
              let compErrMessage: string | null = null;

              try {
                compResult = await paymentAdapter.processRefund(
                  paymentIntent.paymentId,
                  orderRecord.grandTotal,
                  'Compensating refund due to delivery fulfillment failure',
                  compKey
                );
                compSuccess = true;
              } catch (compErr: any) {
                compErrMessage = compErr?.message || String(compErr);
              }

              if (compSuccess) {
                compensationStatus = 'completed';
                await db.runTransaction(async (transaction: any) => {
                  transaction.set(compRef, {
                    status: 'completed',
                    providerResult: compResult,
                    updatedAt: new Date().toISOString(),
                  }, { merge: true });
                });
              } else {
                compensationStatus = 'failed';
                compensationError = compErrMessage || 'Compensation refund failed';
                await db.runTransaction(async (transaction: any) => {
                  transaction.set(compRef, {
                    status: 'failed',
                    lastError: compErrMessage,
                    updatedAt: new Date().toISOString(),
                  }, { merge: true });
                });
              }
            }

            await db.runTransaction(async (transaction: any) => {
              const orderRef = db.collection('orders').doc(orderRecord.id);
              const keyRef = db.collection('idempotency_keys').doc(keyDocId);

              const failedOrderRecord = {
                ...orderRecord,
                fulfillmentStatus: 'failed',
                checkoutStatus: 'failed',
                failureReason: providerErr.message,
                compensationStatus: compensationStatus || orderRecord.compensationStatus,
                compensationError: compensationError || orderRecord.compensationError,
                refundedAmount: compensationStatus === 'completed' ? orderRecord.grandTotal : (orderRecord.refundedAmount || 0),
                remainingRefundableBalance: compensationStatus === 'completed' ? 0 : (orderRecord.remainingRefundableBalance ?? orderRecord.grandTotal),
                paymentStatus: compensationStatus === 'completed' ? 'refunded' : (paymentIntent ? paymentIntent.status : 'pending_payment'),
                paymentIntent: paymentIntent || orderRecord.paymentIntent,
                updatedAt: nowIso,
              };

              transaction.set(orderRef, failedOrderRecord, { merge: true });
              transaction.set(keyRef, {
                userId: user.uid,
                idempotencyKey,
                orderId: orderRecord.id,
                orderRecord: failedOrderRecord,
                checkoutStatus: 'failed',
                failureReason: providerErr.message,
                updatedAt: nowIso,
              }, { merge: true });
            });

            await dispatchAlert({
              category: 'payment_provider_failure',
              severity: 'SEV-1',
              message: `Checkout provider failed for order ${orderRecord.id}: ${providerErr.message}`,
              details: {
                orderId: orderRecord.id,
                paymentMethod: orderRecord.paymentMethod,
                grandTotal: orderRecord.grandTotal,
                error: providerErr.message,
              },
            }).catch(() => {});

            res.status(500).json({ error: `Checkout provider failed: ${providerErr.message}` });
            return;
          }

          let finalizedOrder: any;
          await db.runTransaction(async (transaction: any) => {
            const orderRef = db.collection('orders').doc(orderRecord.id);
            const keyRef = db.collection('idempotency_keys').doc(keyDocId);

            finalizedOrder = {
              ...orderRecord,
              paymentStatus: paymentIntent!.status,
              paymentIntent: paymentIntent!,
              fulfillmentStatus: fulfillment!.status,
              fulfillment: fulfillment!,
              checkoutStatus: 'completed',
              updatedAt: nowIso,
            };

            transaction.set(orderRef, finalizedOrder);
            transaction.set(keyRef, {
              userId: user.uid,
              idempotencyKey,
              orderId: orderRecord.id,
              orderRecord: finalizedOrder,
              checkoutStatus: 'completed',
              createdAt: nowIso,
              updatedAt: nowIso,
            });
          });

          res.status(200).json({
            success: true,
            orderId: finalizedOrder.id,
            order: finalizedOrder,
          });
          return;
        }

        res.status(200).json({
          success: true,
          orderId: orderRecord.id || orderId,
          order: orderRecord,
          idempotentReplay: true,
        });
        return;
      }

      // PHASE B: External provider side effects (outside transaction)
      const paymentAdapter = PaymentAdapterRegistry.getAdapter(orderRecord.paymentMethod || 'cash_on_delivery');
      const deliveryAdapter = DeliveryAdapterRegistry.getAdapter(orderRecord.deliveryMethod || 'door_to_door');

      const paymentIdempotencyKey = `pay_chk_${user.uid}_${orderId}_${idempotencyKey}`;
      const deliveryIdempotencyKey = `del_chk_${orderId}`;

      let paymentIntent: PaymentIntent | undefined = undefined;
      let fulfillment: DeliveryFulfillment | undefined = undefined;

      try {
        paymentIntent = await paymentAdapter.createPaymentIntent(
          orderId,
          orderRecord.grandTotal,
          orderRecord.paymentMethod,
          { customerEmail: orderRecord.customer?.email },
          paymentIdempotencyKey
        );

        fulfillment = await deliveryAdapter.createFulfillment(
          orderId,
          orderRecord.deliveryMethod,
          orderRecord.branchId,
          orderRecord.customer?.shippingAddress,
          deliveryIdempotencyKey
        );
      } catch (providerErr: any) {
        let compensationStatus: string | undefined = undefined;
        let compensationError: string | undefined = undefined;

        if (paymentIntent && (paymentIntent.status === 'paid' || paymentIntent.status === 'authorized')) {
          const compRef = db.collection('payment_compensations').doc(orderId);
          const compKey = `comp_${orderId}`;

          await db.runTransaction(async (transaction: any) => {
            transaction.set(compRef, {
              status: 'processing',
              orderId,
              paymentId: paymentIntent!.paymentId,
              amount: orderRecord.grandTotal,
              providerIdempotencyKey: compKey,
              reason: 'Compensating refund due to delivery fulfillment failure',
              createdAt: nowIso,
              updatedAt: nowIso,
            });
          });

          let compSuccess = false;
          let compResult: any = null;
          let compErrMessage: string | null = null;

          try {
            compResult = await paymentAdapter.processRefund(
              paymentIntent.paymentId,
              orderRecord.grandTotal,
              'Compensating refund due to delivery fulfillment failure',
              compKey
            );
            compSuccess = true;
          } catch (compErr: any) {
            compErrMessage = compErr?.message || String(compErr);
          }

          if (compSuccess) {
            compensationStatus = 'completed';
            await db.runTransaction(async (transaction: any) => {
              transaction.set(compRef, {
                status: 'completed',
                providerResult: compResult,
                updatedAt: new Date().toISOString(),
              }, { merge: true });
            });
          } else {
            compensationStatus = 'failed';
            compensationError = compErrMessage || 'Compensation refund failed';
            await db.runTransaction(async (transaction: any) => {
              transaction.set(compRef, {
                status: 'failed',
                lastError: compErrMessage,
                updatedAt: new Date().toISOString(),
              }, { merge: true });
            });
          }
        }

        // Recovery transaction: release reserved stock and mark order & key failed
        await db.runTransaction(async (transaction: any) => {
          const orderRef = db.collection('orders').doc(orderId);
          const keyRef = db.collection('idempotency_keys').doc(keyDocId);
          const txOrderSnap = await transaction.get(orderRef);
          if (!txOrderSnap || !txOrderSnap.exists) return;

          const batchAllocations = orderRecord.batchAllocations || {};
          const affectedSkus = new Set<string>();
          const updatedBatches: any[] = [];

          for (const [skuId, allocList] of Object.entries(batchAllocations)) {
            if (!Array.isArray(allocList)) continue;
            affectedSkus.add(skuId);

            for (const alloc of allocList as any[]) {
              const batchId = alloc.batchId;
              const qtyReserved = Number(alloc.quantityReserved || alloc.allocatedQuantity || alloc.quantity) || 0;
              if (!batchId || qtyReserved <= 0) continue;

              const branchBatchDocId = `${normalizedBranch}_${batchId}`;
              const branchBatchRef = db.collection('branch_batch_inventory').doc(branchBatchDocId);
              const batchSnap = await transaction.get(branchBatchRef);

              if (batchSnap && batchSnap.exists) {
                const bData = typeof batchSnap.data === 'function' ? batchSnap.data() : batchSnap.data;
                const newAvail = (Number(bData.availableQuantity) || 0) + qtyReserved;
                const newRes = Math.max(0, (Number(bData.reservedQuantity) || 0) - qtyReserved);

                const updatedBatch = { ...bData, availableQuantity: newAvail, reservedQuantity: newRes, updatedAt: nowIso };
                transaction.set(branchBatchRef, updatedBatch);
                updatedBatches.push(updatedBatch);
              }
            }
          }

          for (const skuId of affectedSkus) {
            const batchesQuery = db.collection('branch_batch_inventory')
              .where('branchId', '==', normalizedBranch)
              .where('skuId', '==', skuId);
            const batchesSnap = await transaction.get(batchesQuery);
            const allBatches: any[] = [];
            if (batchesSnap && !batchesSnap.empty) {
              batchesSnap.forEach((d: any) => {
                const data = typeof d.data === 'function' ? d.data() : d.data;
                const modified = updatedBatches.find((ub) => ub.id === data.id || ub.batchId === data.batchId);
                allBatches.push(modified || data);
              });
            }

            const updatedAggregate = computeAggregateInventoryFromBatches({
              branchBatches: allBatches,
              branchId: normalizedBranch,
              skuId,
              lastAdjustmentAt: nowIso,
            });

            const aggDocRef = db.collection('inventory').doc(`${normalizedBranch}_${skuId}`);
            transaction.set(aggDocRef, updatedAggregate);
          }

          const failedOrderRecord = {
            ...orderRecord,
            fulfillmentStatus: 'failed',
            checkoutStatus: 'failed',
            failureReason: providerErr.message,
            compensationStatus: compensationStatus || orderRecord.compensationStatus,
            compensationError: compensationError || orderRecord.compensationError,
            refundedAmount: compensationStatus === 'completed' ? orderRecord.grandTotal : (orderRecord.refundedAmount || 0),
            remainingRefundableBalance: compensationStatus === 'completed' ? 0 : (orderRecord.remainingRefundableBalance ?? orderRecord.grandTotal),
            paymentStatus: compensationStatus === 'completed' ? 'refunded' : (paymentIntent ? paymentIntent.status : 'pending_payment'),
            paymentIntent: paymentIntent || orderRecord.paymentIntent,
            updatedAt: nowIso,
          };

          transaction.set(orderRef, failedOrderRecord, { merge: true });
          transaction.set(keyRef, {
            userId: user.uid,
            idempotencyKey,
            orderId,
            orderRecord: failedOrderRecord,
            checkoutStatus: 'failed',
            failureReason: providerErr.message,
            updatedAt: nowIso,
          }, { merge: true });
        });

        await dispatchAlert({
          category: 'payment_provider_failure',
          severity: 'SEV-1',
          message: `Checkout provider failed for order ${orderId}: ${providerErr.message}`,
          details: {
            orderId,
            paymentMethod: orderRecord.paymentMethod,
            grandTotal: orderRecord.grandTotal,
            error: providerErr.message,
          },
        }).catch(() => {});

        res.status(500).json({ error: `Checkout provider failed: ${providerErr.message}` });
        return;
      }

      // PHASE C: Finalize order transaction
      await db.runTransaction(async (transaction: any) => {
        const orderRef = db.collection('orders').doc(orderId);
        const keyRef = db.collection('idempotency_keys').doc(keyDocId);

        orderRecord = {
          ...orderRecord,
          paymentStatus: paymentIntent!.status,
          paymentIntent: paymentIntent!,
          fulfillmentStatus: fulfillment!.status,
          fulfillment: fulfillment!,
          checkoutStatus: 'completed',
          updatedAt: nowIso,
        };

        transaction.set(orderRef, orderRecord);
        transaction.set(keyRef, {
          userId: user.uid,
          idempotencyKey,
          orderId,
          orderRecord,
          checkoutStatus: 'completed',
          createdAt: nowIso,
        });
      });

      await logAuditEvent(
        user.uid,
        user.role,
        normalizedBranch,
        'order_placed',
        'orders',
        orderId,
        true,
        { grandTotal: orderRecord.grandTotal, branchId: normalizedBranch, idempotencyKey },
        req
      );

      // C2: Enqueue transactional order confirmation notification
      await enqueueOrderCheckoutCompletedNotification(db, orderRecord).catch((e) => {
        logger.warn('Failed to enqueue order checkout completed notification', { error: e.message, orderId });
      });

      res.status(200).json({ success: true, orderId, order: orderRecord, idempotentReplay: false });
    } catch (err: any) {
      if (err.message && err.message.startsWith('INSUFFICIENT_ELIGIBLE_STOCK:')) {
        res.status(400).json({ error: err.message.replace(/^INSUFFICIENT_ELIGIBLE_STOCK:\s*/, '') });
        return;
      }
      res.status(500).json({ error: `Order creation failed: ${err.message}` });
    }
  });

  // --- GET /api/orders/my-orders ---
  app.get('/api/orders/my-orders', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    try {
      const snap = await db.collection('orders').where('userId', '==', user.uid).get();
      const userOrders: any[] = [];
      snap.forEach((doc: any) => userOrders.push(doc.data()));
      userOrders.sort((a, b) => (b.placedAt || '').localeCompare(a.placedAt || ''));
      res.status(200).json({ success: true, orders: userOrders });
    } catch (err: any) {
      res.status(500).json({ error: `Failed to fetch customer orders: ${err.message}` });
    }
  });

  // --- GET /api/orders/:orderId ---
  app.get('/api/orders/:orderId', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { orderId } = req.params;
    const strOrderId = String(orderId || '');

    try {
      const orderRef = db.collection('orders').doc(strOrderId);
      const snap = await orderRef.get();
      if (!snap.exists) {
        res.status(404).json({ error: `Order not found: ${strOrderId}` });
        return;
      }

      const orderData = snap.data();
      const isOwner = orderData.userId === user.uid;
      const isStaff = user.role === 'branch_manager' || user.role === 'regional_director' || user.role === 'super_admin';

      if (!isOwner && !isStaff) {
        res.status(403).json({ error: 'Access Denied: You are not authorized to view this order.' });
        return;
      }

      if (user.role === 'branch_manager') {
        const assignedBranch = (user.assignedBranchId || 'daet').toLowerCase().trim();
        const orderBranch = (orderData.branchId || 'daet').toLowerCase().trim();
        if (orderBranch !== assignedBranch) {
          res.status(403).json({ error: 'Access Denied: Branch manager cannot view order of another branch.' });
          return;
        }
      }

      res.status(200).json({ success: true, order: orderData });
    } catch (err: any) {
      res.status(500).json({ error: `Failed to fetch order: ${err.message}` });
    }
  });

  // --- POST /api/orders/:orderId/cancel ---
  app.post('/api/orders/:orderId/cancel', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { orderId } = req.params;
    const { reason } = req.body;
    const strOrderId = String(orderId || '');

    try {
      const orderRef = db.collection('orders').doc(strOrderId);
      const snap = await orderRef.get();
      if (!snap.exists) {
        res.status(404).json({ error: `Order not found: ${strOrderId}` });
        return;
      }

      const orderData = snap.data();
      const isOwner = orderData.userId === user.uid;
      const isManager = user.role === 'branch_manager';
      const isAdmin = user.role === 'regional_director' || user.role === 'super_admin';

      if (!isOwner && !isManager && !isAdmin) {
        res.status(403).json({ error: 'Access Denied: Cannot cancel another user\'s order.' });
        return;
      }

      if (isManager) {
        const assignedBranch = (user.assignedBranchId || 'daet').toLowerCase().trim();
        const orderBranch = (orderData.branchId || 'daet').toLowerCase().trim();
        if (orderBranch !== assignedBranch) {
          res.status(403).json({ error: 'Access Denied: Branch manager cannot cancel orders of another branch.' });
          return;
        }
      }

      const currentStatus = orderData.fulfillmentStatus;
      if (currentStatus === 'completed' || currentStatus === 'cancelled' || currentStatus === 'returned' || currentStatus === 'in_transit') {
        res.status(400).json({
          error: `INVALID_ORDER_STATE_TRANSITION: Cannot cancel order in '${currentStatus}' state.`
        });
        return;
      }

      const nowIso = new Date().toISOString();

      await db.runTransaction(async (transaction: any) => {
        const txOrderSnap = await transaction.get(orderRef);
        if (!txOrderSnap || !txOrderSnap.exists) return;
        const txOrderData = typeof txOrderSnap.data === 'function' ? txOrderSnap.data() : txOrderSnap.data;

        if (txOrderData.fulfillmentStatus === 'cancelled') {
          return;
        }

        const normalizedBranch = (txOrderData.branchId || 'daet').toLowerCase().trim();
        const batchAllocations = txOrderData.batchAllocations || {};
        const affectedSkus = new Set<string>();
        const updatedBatches: any[] = [];

        for (const [skuId, allocList] of Object.entries(batchAllocations)) {
          if (!Array.isArray(allocList)) continue;
          affectedSkus.add(skuId);

          for (const alloc of allocList as any[]) {
            const batchId = alloc.batchId;
            const qtyReserved = Number(alloc.quantityReserved || alloc.allocatedQuantity || alloc.quantity) || 0;
            if (!batchId || qtyReserved <= 0) continue;

            const branchBatchDocId = `${normalizedBranch}_${batchId}`;
            const branchBatchRef = db.collection('branch_batch_inventory').doc(branchBatchDocId);
            const batchSnap = await transaction.get(branchBatchRef);

            if (batchSnap && batchSnap.exists) {
              const bData = typeof batchSnap.data === 'function' ? batchSnap.data() : batchSnap.data;
              const currentAvail = Number(bData.availableQuantity) || 0;
              const currentRes = Number(bData.reservedQuantity) || 0;

              const newAvail = currentAvail + qtyReserved;
              const newRes = Math.max(0, currentRes - qtyReserved);

              const updatedBatch = {
                ...bData,
                availableQuantity: newAvail,
                reservedQuantity: newRes,
                updatedAt: nowIso,
              };

              transaction.set(branchBatchRef, updatedBatch);
              updatedBatches.push(updatedBatch);
            }
          }
        }

        for (const skuId of affectedSkus) {
          const batchesQuery = db.collection('branch_batch_inventory')
            .where('branchId', '==', normalizedBranch)
            .where('skuId', '==', skuId);
          const batchesSnap = await transaction.get(batchesQuery);
          const allBatches: any[] = [];
          if (batchesSnap && !batchesSnap.empty) {
            batchesSnap.forEach((d: any) => {
              const data = typeof d.data === 'function' ? d.data() : d.data;
              const modified = updatedBatches.find((ub) => ub.id === data.id || ub.batchId === data.batchId);
              allBatches.push(modified || data);
            });
          }

          const updatedAggregate = computeAggregateInventoryFromBatches({
            branchBatches: allBatches,
            branchId: normalizedBranch,
            skuId,
            lastAdjustmentAt: nowIso,
          });

          const aggDocRef = db.collection('inventory').doc(`${normalizedBranch}_${skuId}`);
          transaction.set(aggDocRef, updatedAggregate);
        }

        transaction.update(orderRef, {
          fulfillmentStatus: 'cancelled',
          cancellationReason: reason || 'Order cancelled by user or staff',
          updatedAt: nowIso
        });
      });

      const updatedSnap = await orderRef.get();
      let updatedOrder = updatedSnap.data();

      // Safe refund execution using cancel:${strOrderId}
      const refundResult = await executeSafeRefund(
        strOrderId,
        Number(updatedOrder.grandTotal) || 0,
        reason || 'Customer cancellation',
        `cancel:${strOrderId}`,
        user,
        req
      );

      if (refundResult.order) {
        updatedOrder = refundResult.order;
      }

      await logAuditEvent(
        user.uid,
        user.role,
        updatedOrder.branchId,
        'order_cancelled',
        'orders',
        strOrderId,
        true,
        { reason, grandTotal: updatedOrder.grandTotal },
        req
      );

      // C2: Enqueue transactional order cancellation notification
      await enqueueOrderCancelledNotification(db, updatedOrder, reason).catch((e) => {
        logger.warn('Failed to enqueue order cancellation notification', { error: e.message, orderId: strOrderId });
      });

      res.status(200).json({ success: true, orderId: strOrderId, order: updatedOrder, refundResult });
    } catch (err: any) {
      res.status(500).json({ error: `Order cancellation failed: ${err.message}` });
    }
  });

  // --- POST /api/orders/:orderId/return-request ---
  app.post('/api/orders/:orderId/return-request', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { orderId } = req.params;
    const { reason } = req.body;
    const strOrderId = String(orderId || '');

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      res.status(400).json({ error: 'Return reason is required.' });
      return;
    }

    try {
      const orderRef = db.collection('orders').doc(strOrderId);
      const snap = await orderRef.get();
      if (!snap.exists) {
        res.status(404).json({ error: `Order not found: ${strOrderId}` });
        return;
      }

      const orderData = snap.data();
      const isOwner = orderData.userId === user.uid;
      const isAdmin = user.role === 'regional_director' || user.role === 'super_admin';

      if (!isOwner && !isAdmin) {
        res.status(403).json({ error: 'Access Denied: Cannot request return for another user\'s order.' });
        return;
      }

      if (orderData.fulfillmentStatus !== 'completed') {
        res.status(400).json({
          error: `INVALID_ORDER_STATE_TRANSITION: Return request is only permitted for completed orders. Current state: '${orderData.fulfillmentStatus}'`
        });
        return;
      }

      const nowIso = new Date().toISOString();
      const returnDetails = {
        requestedAt: nowIso,
        reason: reason.trim(),
        status: 'pending_review',
      };

      await orderRef.update({
        fulfillmentStatus: 'return_requested',
        returnDetails,
        updatedAt: nowIso,
      });

      const updatedSnap = await orderRef.get();
      const updatedOrder = updatedSnap.data();

      await logAuditEvent(
        user.uid,
        user.role,
        updatedOrder.branchId,
        'order_return_requested',
        'orders',
        strOrderId,
        true,
        { reason: reason.trim() },
        req
      );

      res.status(200).json({ success: true, orderId: strOrderId, order: updatedOrder });
    } catch (err: any) {
      res.status(500).json({ error: `Return request failed: ${err.message}` });
    }
  });

  // --- POST /api/orders/:orderId/return-process ---
  app.post('/api/orders/:orderId/return-process', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin') {
      res.status(403).json({ error: 'Access Denied: Only staff can process return requests.' });
      return;
    }

    const { orderId } = req.params;
    const { decision, restockInventory = true, notes } = req.body;
    const strOrderId = String(orderId || '');

    if (decision !== 'approve' && decision !== 'reject') {
      res.status(400).json({ error: 'decision must be either "approve" or "reject".' });
      return;
    }

    try {
      const orderRef = db.collection('orders').doc(strOrderId);
      const snap = await orderRef.get();
      if (!snap.exists) {
        res.status(404).json({ error: `Order not found: ${strOrderId}` });
        return;
      }

      const orderData = snap.data();
      if (user.role === 'branch_manager') {
        const assignedBranch = (user.assignedBranchId || 'daet').toLowerCase().trim();
        const orderBranch = (orderData.branchId || 'daet').toLowerCase().trim();
        if (orderBranch !== assignedBranch) {
          res.status(403).json({ error: 'Access Denied: Branch manager cannot process returns for another branch.' });
          return;
        }
      }

      if (orderData.fulfillmentStatus !== 'return_requested') {
        res.status(400).json({
          error: `INVALID_ORDER_STATE_TRANSITION: Return processing requires 'return_requested' state. Current state: '${orderData.fulfillmentStatus}'`
        });
        return;
      }

      const nowIso = new Date().toISOString();

      if (decision === 'approve') {
        await db.runTransaction(async (transaction: any) => {
          const txOrderSnap = await transaction.get(orderRef);
          if (!txOrderSnap || !txOrderSnap.exists) return;
          const txOrderData = typeof txOrderSnap.data === 'function' ? txOrderSnap.data() : txOrderSnap.data;

          if (txOrderData.fulfillmentStatus === 'returned') {
            return;
          }
          if (txOrderData.fulfillmentStatus !== 'return_requested') {
            throw new Error(`INVALID_ORDER_STATE_TRANSITION: Return processing requires 'return_requested' state. Current state: '${txOrderData.fulfillmentStatus}'`);
          }

          const normalizedBranch = (txOrderData.branchId || 'daet').toLowerCase().trim();
          const batchAllocations = txOrderData.batchAllocations || {};
          const affectedSkus = new Set<string>();
          const updatedBatches: any[] = [];

          if (restockInventory) {
            for (const [skuId, allocList] of Object.entries(batchAllocations)) {
              if (!Array.isArray(allocList)) continue;
              affectedSkus.add(skuId);

              for (const alloc of allocList as any[]) {
                const batchId = alloc.batchId;
                const qtyReserved = Number(alloc.quantityReserved || alloc.allocatedQuantity || alloc.quantity) || 0;
                if (!batchId || qtyReserved <= 0) continue;

                const branchBatchDocId = `${normalizedBranch}_${batchId}`;
                const branchBatchRef = db.collection('branch_batch_inventory').doc(branchBatchDocId);
                const batchSnap = await transaction.get(branchBatchRef);

                if (batchSnap && batchSnap.exists) {
                  const bData = typeof batchSnap.data === 'function' ? batchSnap.data() : batchSnap.data;
                  const currentAvail = Number(bData.availableQuantity) || 0;

                  const newAvail = currentAvail + qtyReserved;

                  const updatedBatch = {
                    ...bData,
                    availableQuantity: newAvail,
                    updatedAt: nowIso,
                  };

                  transaction.set(branchBatchRef, updatedBatch);
                  updatedBatches.push(updatedBatch);
                }
              }
            }

            for (const skuId of affectedSkus) {
              const batchesQuery = db.collection('branch_batch_inventory')
                .where('branchId', '==', normalizedBranch)
                .where('skuId', '==', skuId);
              const batchesSnap = await transaction.get(batchesQuery);
              const allBatches: any[] = [];
              if (batchesSnap && !batchesSnap.empty) {
                batchesSnap.forEach((d: any) => {
                  const data = typeof d.data === 'function' ? d.data() : d.data;
                  const modified = updatedBatches.find((ub) => ub.id === data.id || ub.batchId === data.batchId);
                  allBatches.push(modified || data);
                });
              }

              const updatedAggregate = computeAggregateInventoryFromBatches({
                branchBatches: allBatches,
                branchId: normalizedBranch,
                skuId,
                lastAdjustmentAt: nowIso,
              });

              const aggDocRef = db.collection('inventory').doc(`${normalizedBranch}_${skuId}`);
              transaction.set(aggDocRef, updatedAggregate);
            }
          }

          transaction.update(orderRef, {
            fulfillmentStatus: 'returned',
            returnDetails: {
              ...txOrderData.returnDetails,
              processedAt: nowIso,
              status: 'approved',
              notes: notes || 'Return approved by staff',
            },
            updatedAt: nowIso
          });
        });
      } else {
        await orderRef.update({
          fulfillmentStatus: 'completed',
          returnDetails: {
            ...orderData.returnDetails,
            processedAt: nowIso,
            status: 'rejected',
            notes: notes || 'Return request rejected by staff',
          },
          updatedAt: nowIso,
        });
      }

      const updatedSnap = await orderRef.get();
      let updatedOrder = updatedSnap.data();

      if (decision === 'approve') {
        const refundResult = await executeSafeRefund(
          strOrderId,
          Number(updatedOrder.grandTotal) || 0,
          notes || 'Return approved',
          `return:${strOrderId}`,
          user,
          req
        );
        if (refundResult.order) {
          updatedOrder = refundResult.order;
        }
      }

      await logAuditEvent(
        user.uid,
        user.role,
        updatedOrder.branchId,
        'order_return_processed',
        'orders',
        strOrderId,
        true,
        { decision, restockInventory },
        req
      );

      res.status(200).json({ success: true, orderId: strOrderId, order: updatedOrder });
    } catch (err: any) {
      res.status(500).json({ error: `Return processing failed: ${err.message}` });
    }
  });

  // --- POST /api/orders/:orderId/refund ---
  app.post('/api/orders/:orderId/refund', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin') {
      res.status(403).json({ error: 'Access Denied: Only staff can issue order refunds.' });
      return;
    }

    const { orderId } = req.params;
    const { amount, reason } = req.body;
    const strOrderId = String(orderId || '');

    const idempotencyKey = (
      req.headers['x-idempotency-key'] ||
      req.headers['idempotency-key'] ||
      req.body?.idempotencyKey ||
      req.body?.idempotency_key
    )?.toString().trim();

    if (!idempotencyKey) {
      res.status(400).json({ error: 'Missing required idempotencyKey for refund.' });
      return;
    }

    try {
      const orderRef = db.collection('orders').doc(strOrderId);
      const snap = await orderRef.get();
      if (!snap.exists) {
        res.status(404).json({ error: `Order not found: ${strOrderId}` });
        return;
      }

      const orderData = snap.data();
      const currentStatus = orderData.fulfillmentStatus;
      if (currentStatus !== 'cancelled' && currentStatus !== 'returned' && currentStatus !== 'return_requested' && currentStatus !== 'completed') {
        res.status(400).json({
          error: `INVALID_ORDER_STATE_TRANSITION: Refunds can only be processed for cancelled, returned, or completed orders. Current state: '${currentStatus}'`
        });
        return;
      }

      const refundAmount = Number(amount);

      const refundResult = await executeSafeRefund(
        strOrderId,
        refundAmount,
        reason || 'Manual staff refund',
        `manual:${strOrderId}:${idempotencyKey}`,
        user,
        req
      );

      if (!refundResult.success) {
        if (refundResult.error?.includes('exceeds') || refundResult.error?.includes('already fully refunded') || refundResult.error?.includes('greater than 0')) {
          res.status(400).json({ error: refundResult.error });
          return;
        }
        res.status(500).json({ error: refundResult.error || 'Refund processing failed.' });
        return;
      }

      // C2: Enqueue transactional order refund notification (if not an idempotent replay)
      if (!refundResult.isReplay) {
        await enqueueOrderRefundedNotification(
          db,
          refundResult.order || orderData,
          refundAmount,
          reason,
          idempotencyKey
        ).catch((e) => {
          logger.warn('Failed to enqueue order refund notification', { error: e.message, orderId: strOrderId });
        });
      }

      res.status(200).json({
        success: true,
        orderId: strOrderId,
        refund: refundResult.refundRecord,
        order: refundResult.order,
        idempotentReplay: refundResult.isReplay
      });
    } catch (err: any) {
      res.status(500).json({ error: `Refund processing failed: ${err.message}` });
    }
  });

  // --- 3. POST /api/clinical/intake/save ---
  app.post('/api/clinical/intake/save', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { patientUid, clinicalIntake, consentRecord, scheduledAt, deliveryMode } = req.body;
    const targetPatient = patientUid || user.uid;

    if (!clinicalIntake) {
      res.status(400).json({ error: 'clinicalIntake payload is required.' });
      return;
    }

    const isPatientSelf = user.uid === targetPatient;
    const isPractitioner = user.role === 'practitioner';

    if (isPatientSelf) {
      // Patient can save their own clinical intake
    } else if (isPractitioner) {
      const isAssigned = await verifyPractitionerAssignment(user.uid, targetPatient);
      if (!isAssigned) {
        const errorMsg = `Clinical Boundary Block: Practitioner '${user.uid}' does not have an active assignment to patient '${targetPatient}'.`;
        res.status(403).json({ error: errorMsg });
        return;
      }
    } else {
      res.status(403).json({ error: 'Clinical Access Denied: Unapproved administrative role or missing explicit policy authorization.' });
      return;
    }

    try {
      const cryptRecord = await encryptClinicalPayload(clinicalIntake);
      const intakeId = `CNS-INT-${Date.now().toString().slice(-6)}`;
      const secureRecord = {
        id: intakeId,
        userId: targetPatient,
        practitionerId: isPractitioner ? user.uid : (req.body.practitionerId || 'practitioner-daet-01'),
        scheduledAt: scheduledAt || new Date().toISOString(),
        deliveryMode: deliveryMode || 'virtual',
        consentRecord: consentRecord || { purpose: 'Wellness', version: 'v1.0' },
        encryptedClinicalIntake: {
          ciphertext: cryptRecord.ciphertext,
          iv: cryptRecord.iv,
          tag: cryptRecord.tag,
          encryptedKey: cryptRecord.encryptedKey,
          kmsKeyId: cryptRecord.keyId,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.collection('consultation_intakes').doc(intakeId).set(secureRecord);
      await logAuditEvent(user.uid, user.role, null, 'clinical_intake_created', 'consultation_intakes', intakeId, true, {}, req);
      res.status(200).json({ success: true, intakeId });
    } catch (err: any) {
      res.status(500).json({ error: `Cloud KMS Encryption Failure: ${err.message}` });
    }
  });

  // --- 4. GET /api/clinical/intake/:intakeId ---
  app.get('/api/clinical/intake/:intakeId', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { intakeId } = req.params;
    try {
      const intakeSnap = await db.collection('consultation_intakes').doc(intakeId).get();
      if (!intakeSnap.exists) {
        res.status(404).json({ error: `Record not found: ${intakeId}` });
        return;
      }

      const record = intakeSnap.data();
      const isPatientSelf = user.uid === record.userId;
      const isPractitioner = user.role === 'practitioner';

      if (isPatientSelf) {
        // Patient can view their own record
      } else if (isPractitioner) {
        const isAssigned = await verifyPractitionerAssignment(user.uid, record.userId);
        if (!isAssigned) {
          res.status(403).json({ error: 'Clinical Boundary Block: Practitioner does not have an active assignment to this patient.' });
          return;
        }
      } else {
        res.status(403).json({ error: 'Clinical Access Denied: Unapproved administrative role or missing explicit policy authorization.' });
        return;
      }

      const decryptedPayload = await decryptClinicalPayload(
        record.encryptedClinicalIntake.ciphertext,
        record.encryptedClinicalIntake.iv,
        record.encryptedClinicalIntake.tag,
        record.encryptedClinicalIntake.encryptedKey
      );

      res.json({
        id: record.id,
        userId: record.userId,
        scheduledAt: record.scheduledAt,
        deliveryMode: record.deliveryMode,
        consentRecord: record.consentRecord,
        decryptedClinicalIntake: decryptedPayload,
        kmsKeyId: record.encryptedClinicalIntake.kmsKeyId,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- PHASE 6A: CONSULTATION ENDPOINTS ---
  app.get('/api/consultations/services', (_req: Request, res: Response): void => {
    res.json({
      services: Object.values(CONSULTATION_SERVICES),
      disclaimer: 'MAHALAGANG PAALALA: Holistic wellness sessions only under RA 2382.',
    });
  });

  app.get('/api/consultations/practitioners', (_req: Request, res: Response): void => {
    res.json({
      practitioners: Object.values(PRACTITIONER_ROSTER),
      statusNotice: 'CREDENTIALS & ROSTER PENDING FINAL BUSINESS CONFIRMATION',
    });
  });

  app.get('/api/consultations/slots', async (req: Request, res: Response): Promise<void> => {
    const { practitionerId, date } = req.query;
    if (!practitionerId || !date) {
      res.status(400).json({ error: 'practitionerId and date query parameters are required.' });
      return;
    }

    try {
      const generatedSlots = getDailyConsultationSlots(date as string, practitionerId as string);
      const apptSnap = await db.collection('consultation_appointments')
        .where('practitionerId', '==', practitionerId)
        .where('scheduledDate', '==', date)
        .get();

      const bookedTimes = new Set<string>();
      if (!apptSnap.empty) {
        apptSnap.forEach((d: any) => {
          if (d.data().status !== 'cancelled') bookedTimes.add(d.data().scheduledTime);
        });
      }

      const slots = generatedSlots.map((s) => ({
        ...s,
        isBooked: bookedTimes.has(s.startTime),
      }));

      res.json({ practitionerId, date, slots });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/consultations/book', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { serviceCode, practitionerId, scheduledDate, scheduledTime, deliveryMode, branchId, customerName, customerPhone, consentRecord } = req.body;

    if (!serviceCode || !CONSULTATION_SERVICES[serviceCode]) {
      res.status(400).json({ error: `Invalid serviceCode: ${serviceCode}` });
      return;
    }
    if (!practitionerId || !PRACTITIONER_ROSTER[practitionerId]) {
      res.status(400).json({ error: `Invalid practitionerId: ${practitionerId}` });
      return;
    }

    // Complete, explicit server-side consent validation (RA 10173 Section 13(a))
    if (!consentRecord || typeof consentRecord !== 'object') {
      res.status(400).json({ error: 'Explicit statutory informed consent is required.' });
      return;
    }
    const { purpose, version, timestamp, legalBasis, acknowledgedText, withdrawalState } = consentRecord;
    
    if (typeof purpose !== 'string' || !purpose.trim()) {
      res.status(400).json({ error: 'Invalid consent: purpose is required.' });
      return;
    }
    if (typeof version !== 'string' || !version.trim()) {
      res.status(400).json({ error: 'Invalid consent: version is required.' });
      return;
    }
    if (typeof timestamp !== 'string' || isNaN(Date.parse(timestamp))) {
      res.status(400).json({ error: 'Invalid consent: valid timestamp is required.' });
      return;
    }
    if (legalBasis !== 'RA_10173_SECTION_13_A_EXPLICIT_CONSENT') {
      res.status(400).json({ error: 'Invalid consent: legalBasis must be RA_10173_SECTION_13_A_EXPLICIT_CONSENT.' });
      return;
    }
    if (typeof acknowledgedText !== 'string' || acknowledgedText.length < 50) {
      res.status(400).json({ error: 'Invalid consent: acknowledgedText is incomplete or invalid.' });
      return;
    }
    if (!withdrawalState || typeof withdrawalState !== 'object' || withdrawalState.isWithdrawn !== false) {
      res.status(400).json({ error: 'Invalid consent: withdrawalState must be active and not withdrawn.' });
      return;
    }

    const appointmentId = `APPT-${Date.now().toString().slice(-6)}`;
    const service = CONSULTATION_SERVICES[serviceCode];
    const practitioner = PRACTITIONER_ROSTER[practitionerId];

    const appointmentRecord = {
      id: appointmentId,
      userId: user.uid,
      customerName: customerName || user.email || 'Client',
      customerEmail: user.email || '',
      customerPhone: customerPhone || '',
      practitionerId,
      practitionerName: practitioner.name,
      serviceCode,
      serviceTitle: service.title,
      deliveryMode: deliveryMode || service.deliveryMode,
      branchId: branchId || 'daet',
      scheduledDate,
      scheduledTime,
      status: 'scheduled',
      consentRecord,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const slotLockId = `${practitionerId}_${scheduledDate}_${scheduledTime}`;
    const slotLockRef = db.collection('booked_slots').doc(slotLockId);

    try {
      await db.runTransaction(async (transaction: any) => {
        const slotLockSnap = await transaction.get(slotLockRef);
        if (slotLockSnap.exists && slotLockSnap.data()?.isBooked) {
          throw new Error('SLOT_ALREADY_BOOKED');
        }

        const query = db.collection('consultation_appointments')
          .where('practitionerId', '==', practitionerId)
          .where('scheduledDate', '==', scheduledDate)
          .where('scheduledTime', '==', scheduledTime);
        const existingSnap = await transaction.get(query);
        let hasActiveBooking = false;
        existingSnap.forEach((docSnap: any) => {
          if (docSnap.data().status !== 'cancelled') {
            hasActiveBooking = true;
          }
        });

        if (hasActiveBooking) {
          throw new Error('SLOT_ALREADY_BOOKED');
        }

        transaction.set(slotLockRef, {
          isBooked: true,
          appointmentId,
          practitionerId,
          scheduledDate,
          scheduledTime,
        });

        transaction.set(db.collection('consultation_assignments').doc(`${practitionerId}_${user.uid}`), {
          practitionerId,
          patientId: user.uid,
          assignedAt: new Date().toISOString(),
          active: true,
        });

        transaction.set(db.collection('consultation_appointments').doc(appointmentId), appointmentRecord);
      });

      await logAuditEvent(user.uid, user.role, appointmentRecord.branchId, 'consultation_appointment_booked', 'consultation_appointments', appointmentId, true, {}, req);

      // C2: Enqueue transactional consultation booking confirmation notification
      await enqueueConsultationBookingConfirmedNotification(db, appointmentRecord).catch((e) => {
        logger.warn('Failed to enqueue consultation booking notification', { error: e.message, appointmentId });
      });

      res.status(201).json({ success: true, appointmentId, appointment: appointmentRecord });
    } catch (err: any) {
      if (err.message === 'SLOT_ALREADY_BOOKED') {
        res.status(409).json({ error: `Selected slot ${scheduledDate} at ${scheduledTime} is already booked.` });
        return;
      }
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/consultations/my-appointments', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    try {
      const snap = await db.collection('consultation_appointments').where('userId', '==', user.uid).get();
      const appointments: any[] = [];
      if (!snap.empty) {
        snap.forEach((d: any) => appointments.push(d.data()));
      }
      res.json({ appointments });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/consultations/practitioner-appointments', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'practitioner' && user.role !== 'super_admin') {
      res.status(403).json({ error: 'Access Denied: Practitioner role required.' });
      return;
    }

    try {
      const snap = await db.collection('consultation_appointments').where('practitionerId', '==', user.uid).get();
      const appointments: any[] = [];
      if (!snap.empty) {
        snap.forEach((d: any) => appointments.push(d.data()));
      }
      res.json({ appointments });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/consultations/cancel', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { appointmentId, reason } = req.body;
    try {
      const apptDoc = await db.collection('consultation_appointments').doc(appointmentId).get();
      if (!apptDoc.exists) {
        res.status(404).json({ error: `Appointment not found: ${appointmentId}` });
        return;
      }
      const appt = apptDoc.data();
      
      const isOwner = appt.userId === user.uid;
      const isAssignedPractitioner = appt.practitionerId === user.uid;
      const isSuperAdmin = user.role === 'super_admin';

      if (!isOwner && !isAssignedPractitioner && !isSuperAdmin) {
        res.status(403).json({ error: 'Unauthorized: You are not authorized to cancel this appointment.' });
        return;
      }

      const slotLockId = `${appt.practitionerId}_${appt.scheduledDate}_${appt.scheduledTime}`;

      await db.runTransaction(async (transaction: any) => {
        transaction.update(db.collection('consultation_appointments').doc(appointmentId), {
          status: 'cancelled',
          cancellationReason: reason || 'Cancelled by user',
          updatedAt: new Date().toISOString(),
        });
        transaction.delete(db.collection('booked_slots').doc(slotLockId));
      });

      await logAuditEvent(user.uid, user.role, appt.branchId, 'consultation_appointment_cancelled', 'consultation_appointments', appointmentId, true, { reason }, req);

      // C2: Enqueue transactional consultation cancellation notification
      await enqueueConsultationCancelledNotification(db, { ...appt, id: appointmentId }, reason).catch((e) => {
        logger.warn('Failed to enqueue consultation cancellation notification', { error: e.message, appointmentId });
      });

      res.json({ success: true, message: 'Cancelled successfully.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- C2: POST /api/consultations/:appointmentId/reminder - Trigger 24h or 2h Reminder ---
  // Note on Scheduled Automation: 24h/2h consultation reminders, workshop broadcasts,
  // and SLA scans require an external scheduler/cron trigger (e.g. Cloud Scheduler,
  // Kubernetes CronJob, or an external cron runner). This endpoint serves as the authoritative
  // programmatic trigger interface enforcing strict RBAC/ownership controls.
  app.post('/api/consultations/:appointmentId/reminder', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { appointmentId } = req.params;
    const strAppointmentId = String(appointmentId || '');
    const { reminderType = '24h' } = req.body || {};

    if (reminderType !== '24h' && reminderType !== '2h') {
      res.status(400).json({ error: "Invalid reminderType: must be '24h' or '2h'." });
      return;
    }

    try {
      const apptSnap = await db.collection('consultation_appointments').doc(strAppointmentId).get();
      if (!apptSnap || !apptSnap.exists) {
        res.status(404).json({ error: `Appointment not found: ${strAppointmentId}` });
        return;
      }
      const appt = typeof apptSnap.data === 'function' ? apptSnap.data() : apptSnap.data;

      // Role and Ownership Authorization Check:
      // 1. Customers may only trigger reminders for their own appointment.
      if (user.role === 'customer' || user.role.startsWith('customer')) {
        if (appt.userId !== user.uid) {
          res.status(403).json({ error: 'Access Denied: Customers can only trigger reminders for their own appointments.' });
          return;
        }
      }
      // 2. Branch Managers may only trigger reminders for appointments at their assigned branch.
      else if (user.role === 'branch_manager' || user.role.startsWith('branch_manager')) {
        const apptBranch = (appt.branchId || 'daet').toLowerCase().trim();
        const userBranch = (user.assignedBranchId || (user.role.includes('_') ? user.role.split('_')[2] : 'daet')).toLowerCase().trim();
        if (apptBranch !== userBranch) {
          res.status(403).json({ error: 'Access Denied: Branch managers can only trigger reminders for appointments at their assigned branch.' });
          return;
        }
      }
      // 3. Practitioners may only trigger reminders for their assigned appointments.
      else if (user.role === 'practitioner') {
        if (appt.practitionerId !== user.uid) {
          res.status(403).json({ error: 'Access Denied: Practitioners can only trigger reminders for their assigned appointments.' });
          return;
        }
      }
      // 4. Regional Directors and Super Admins have regional/global staff authority.
      else if (user.role !== 'regional_director' && user.role !== 'super_admin') {
        res.status(403).json({ error: 'Access Denied: You do not have permission to trigger consultation reminders.' });
        return;
      }

      const result = await enqueueConsultationReminder(db, strAppointmentId, reminderType as '24h' | '2h');
      res.status(result.idempotentReplay ? 200 : 201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- WORKSHOP & SYMPOSIUM ENDPOINTS (Phase 6B) ---
  app.get('/api/workshops', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    try {
      let snap = await db.collection('workshops').get();
      
      // Auto-seed workshops if none exist in Firestore
      if (snap.empty) {
        for (const ws of SEED_WORKSHOPS) {
          await db.collection('workshops').doc(ws.id).set(ws);
        }
        snap = await db.collection('workshops').get();
      }

      const workshops: any[] = [];
      snap.forEach((d: any) => workshops.push(d.data()));
      res.json({ workshops });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/workshops/register', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { workshopId, customerName, customerEmail, customerPhone } = req.body;
    if (!workshopId) {
      res.status(400).json({ error: 'workshopId is required.' });
      return;
    }
    if (!customerName || !customerEmail || !customerPhone) {
      res.status(400).json({ error: 'customerName, customerEmail, and customerPhone are required.' });
      return;
    }

    try {
      const result = await db.runTransaction(async (transaction: any) => {
        const workshopRef = db.collection('workshops').doc(workshopId);
        const workshopSnap = await transaction.get(workshopRef);
        if (!workshopSnap.exists) {
          throw new Error('WORKSHOP_NOT_FOUND');
        }
        const ws = workshopSnap.data();

        // Check for duplicate registration for this active user/workshop
        const regQuery = db.collection('workshop_registrations')
          .where('userId', '==', user.uid)
          .where('workshopId', '==', workshopId);
        const regSnap = await transaction.get(regQuery);
        let alreadyRegistered = false;
        regSnap.forEach((docSnap: any) => {
          if (docSnap.data().status !== 'cancelled') {
            alreadyRegistered = true;
          }
        });

        if (alreadyRegistered) {
          throw new Error('ALREADY_REGISTERED');
        }

        let status = 'confirmed';
        let seatsAllocated = ws.seatsAllocated || 0;
        let waitlistCount = ws.waitlistCount || 0;

        if (seatsAllocated < ws.capacity) {
          seatsAllocated += 1;
          status = 'confirmed';
        } else {
          waitlistCount += 1;
          status = 'waitlisted';
        }

        const registrationId = `REG-${Date.now().toString().slice(-4)}-${crypto.randomInt(1000, 9999)}`;
        const signature = generateRegistrationSignature(registrationId, user.uid, workshopId, status);

        const regRecord = {
          id: registrationId,
          userId: user.uid,
          workshopId,
          customerName,
          customerEmail,
          customerPhone,
          status,
          signature,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        transaction.update(workshopRef, { seatsAllocated, waitlistCount });
        transaction.set(db.collection('workshop_registrations').doc(registrationId), regRecord);

        return { registration: regRecord, workshop: { ...ws, seatsAllocated, waitlistCount } };
      });

      await logAuditEvent(user.uid, user.role, result.workshop.branchId, 'workshop_registered', 'workshop_registrations', result.registration.id, true, { status: result.registration.status }, req);

      // C2: Enqueue transactional workshop registration confirmation notification (for confirmed registrations)
      if (result.registration.status === 'confirmed') {
        await enqueueWorkshopRegistrationConfirmedNotification(db, result.registration, result.workshop).catch((e) => {
          logger.warn('Failed to enqueue workshop registration notification', { error: e.message, registrationId: result.registration.id });
        });
      }

      res.status(201).json({ success: true, registration: result.registration, workshop: result.workshop });
    } catch (err: any) {
      if (err.message === 'WORKSHOP_NOT_FOUND') {
        res.status(404).json({ error: `Workshop not found: ${workshopId}` });
        return;
      }
      if (err.message === 'ALREADY_REGISTERED') {
        res.status(400).json({ error: 'You are already registered for this educational workshop.' });
        return;
      }
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/workshops/my-registrations', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    try {
      const snap = await db.collection('workshop_registrations').where('userId', '==', user.uid).get();
      const registrations: any[] = [];
      snap.forEach((d: any) => registrations.push(d.data()));
      res.json({ registrations });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/workshops/registration/:registrationId/pass', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { registrationId } = req.params;
    try {
      const regDoc = await db.collection('workshop_registrations').doc(registrationId).get();
      if (!regDoc.exists) {
        res.status(404).json({ error: `Registration not found: ${registrationId}` });
        return;
      }

      const reg = regDoc.data();
      const isOwner = reg.userId === user.uid;
      const isStaff = user.role === 'branch_manager' || user.role === 'regional_director' || user.role === 'super_admin';

      if (!isOwner && !isStaff) {
        res.status(403).json({ error: 'Access Denied: You are not authorized to view this registration pass.' });
        return;
      }

      res.json({ registration: reg });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/workshops/check-in', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    // Strict staff role check for scanner capability
    const isStaff = user.role === 'branch_manager' || user.role === 'regional_director' || user.role === 'super_admin';
    if (!isStaff) {
      res.status(403).json({ error: 'Access Denied: Authorized staff check-in privileges required.' });
      return;
    }

    const { registrationId, signature } = req.body;
    if (!registrationId || !signature) {
      res.status(400).json({ error: 'registrationId and signature are required for attendance verification.' });
      return;
    }

    try {
      const regDoc = await db.collection('workshop_registrations').doc(registrationId).get();
      if (!regDoc.exists) {
        res.status(404).json({ error: `Registration record not found: ${registrationId}` });
        return;
      }

      const reg = regDoc.data();

      // Retrieve associated workshop to verify branch ownership
      const workshopDoc = await db.collection('workshops').doc(reg.workshopId).get();
      if (!workshopDoc.exists) {
        res.status(404).json({ error: `Associated workshop not found: ${reg.workshopId}` });
        return;
      }
      const workshop = workshopDoc.data();

      // Enforce strict branch isolation:
      // - branch_manager may check in participants ONLY for workshops belonging to their assignedBranchId
      // - regional_director may operate across branches
      // - super_admin may operate across branches
      if (user.role === 'branch_manager') {
        if (!user.assignedBranchId || user.assignedBranchId !== workshop.branchId) {
          await logAuditEvent(
            user.uid,
            user.role,
            user.assignedBranchId || 'unassigned',
            'workshop_checkin_cross_branch_blocked',
            'workshop_registrations',
            registrationId,
            false,
            { reason: 'cross_branch_forbidden', targetWorkshopBranch: workshop.branchId },
            req
          );
          res.status(403).json({
            error: `Access Denied: Branch manager (${user.assignedBranchId || 'unassigned'}) is not authorized to check in participants for workshop at '${workshop.branchId}'.`
          });
          return;
        }
      }

      // Recalculate HMAC-SHA256 signature over original registration state to verify authenticity
      const isValid = verifyRegistrationSignature(registrationId, reg.userId, reg.workshopId, reg.status, signature);
      if (!isValid) {
        res.status(400).json({ error: 'Cryptographic Signature Verification Failed: Tampered or forged registration pass.' });
        return;
      }

      if (reg.status === 'attended') {
        res.status(200).json({ success: true, message: 'Pass already scanned.', registration: reg });
        return;
      }

      if (reg.status === 'waitlisted') {
        res.status(400).json({ error: 'Check-in Blocked: Waitlisted participants are not confirmed for entry.' });
        return;
      }

      if (reg.status === 'cancelled') {
        res.status(400).json({ error: 'Check-in Blocked: This registration has been cancelled.' });
        return;
      }

      // Transition registration state to attended and sign the updated state
      const updatedStatus = 'attended';
      const updatedSignature = generateRegistrationSignature(registrationId, reg.userId, reg.workshopId, updatedStatus);

      await db.collection('workshop_registrations').doc(registrationId).update({
        status: updatedStatus,
        signature: updatedSignature,
        updatedAt: new Date().toISOString()
      });

      await logAuditEvent(user.uid, user.role, workshop.branchId, 'workshop_attended', 'workshop_registrations', registrationId, true, { originalStatus: reg.status }, req);

      res.status(200).json({
        success: true,
        message: 'Attendance verified and recorded successfully.',
        registration: {
          ...reg,
          status: updatedStatus,
          signature: updatedSignature
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- C2: POST /api/workshops/:workshopId/reminders - Send Reminders to Confirmed Attendees ---
  app.post('/api/workshops/:workshopId/reminders', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const isStaff = user.role === 'branch_manager' || user.role === 'regional_director' || user.role === 'super_admin';
    if (!isStaff) {
      res.status(403).json({ error: 'Access Denied: Only staff can send workshop reminders.' });
      return;
    }

    const { workshopId } = req.params;
    const strWorkshopId = String(workshopId || '');
    try {
      const summary = await enqueueWorkshopReminders(db, strWorkshopId);
      res.status(200).json({ success: true, ...summary });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- C2: POST /api/workshops/:workshopId/promote-waitlist - Promote Next Waitlisted Participant ---
  app.post('/api/workshops/:workshopId/promote-waitlist', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const isStaff = user.role === 'branch_manager' || user.role === 'regional_director' || user.role === 'super_admin';
    if (!isStaff) {
      res.status(403).json({ error: 'Access Denied: Only staff can promote waitlisted participants.' });
      return;
    }

    const { workshopId } = req.params;
    const strWorkshopId = String(workshopId || '');
    try {
      const result = await promoteNextWaitlistedParticipant(db, strWorkshopId);
      if (!result.promoted) {
        res.status(404).json({ error: result.message || 'No waitlisted participants available.' });
        return;
      }
      res.status(200).json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- ADMIN ENDPOINTS ---
  app.get('/api/admin/orders', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const isAuthorized = user.role === 'branch_manager' || user.role === 'regional_director' || user.role === 'super_admin';
    if (!isAuthorized) {
      res.status(403).json({ error: 'Access Denied: Administrative role required.' });
      return;
    }

    try {
      let snap: any;
      if (user.role === 'branch_manager') {
        const branch = user.assignedBranchId || 'daet';
        snap = await db.collection('orders').where('branchId', '==', branch).get();
      } else {
        snap = await db.collection('orders').get();
      }

      const orders: any[] = [];
      if (snap && !snap.empty) {
        snap.forEach((d: any) => orders.push(d.data()));
      }
      res.json({ orders });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/audit-logs', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'regional_director' && user.role !== 'super_admin') {
      res.status(403).json({ error: 'Access Denied: Executive audit access required.' });
      return;
    }

    try {
      const snap = await db.collection('audit_logs').get();
      const logs: any[] = [];
      if (snap && !snap.empty) {
        snap.forEach((d: any) => logs.push(d.data()));
      }
      res.json({ logs });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- PHASE 6C MILESTONE 1: RA 11967 Consumer Dispute & Support Tickets ---

  // 1. Submit Support Ticket (Customer Grievance)
  app.post('/api/support/tickets', async (req: Request, res: Response) => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role === 'practitioner') {
      res.status(403).json({ error: 'Access Denied: Practitioners cannot create consumer redress tickets.' });
      return;
    }

    const { branchId, category, subject, description, orderId, customerName, customerPhone } = req.body;

    if (!category || !VALID_TICKET_CATEGORIES.includes(category)) {
      res.status(400).json({
        error: `category must be one of: ${VALID_TICKET_CATEGORIES.join(', ')}`,
      });
      return;
    }

    if (!subject || typeof subject !== 'string' || subject.trim().length < 3) {
      res.status(400).json({ error: 'subject is required (minimum 3 characters).' });
      return;
    }

    if (!description || typeof description !== 'string' || description.trim().length < 5) {
      res.status(400).json({ error: 'description is required (minimum 5 characters).' });
      return;
    }

    try {
      let authoritativeBranchId: string;

      if (orderId && typeof orderId === 'string' && orderId.trim().length > 0) {
        const trimmedOrderId = orderId.trim();
        const orderDoc = await db.collection('orders').doc(trimmedOrderId).get();
        if (!orderDoc || !orderDoc.exists) {
          res.status(404).json({ error: `Associated order not found: ${trimmedOrderId}` });
          return;
        }

        const orderData = orderDoc.data();
        if (orderData.userId !== user.uid) {
          res.status(403).json({ error: 'Access Denied: Associated order does not belong to authenticated customer.' });
          return;
        }

        const orderBranch = orderData.branchId;
        if (!orderBranch || !SUPPORTED_BRANCH_IDS.includes(orderBranch as any)) {
          res.status(400).json({ error: `Associated order has invalid branch assignment: ${orderBranch}` });
          return;
        }

        if (branchId && typeof branchId === 'string' && branchId.trim().toLowerCase() !== orderBranch.toLowerCase()) {
          res.status(400).json({
            error: `Branch mismatch: Supplied branchId '${branchId}' does not match associated order's authoritative branch '${orderBranch}'.`,
          });
          return;
        }

        authoritativeBranchId = orderBranch;
      } else {
        if (!branchId || typeof branchId !== 'string') {
          res.status(400).json({ error: 'branchId is required and must be a string when no associated order is supplied.' });
          return;
        }

        const normalizedBranch = branchId.trim().toLowerCase();
        if (!SUPPORTED_BRANCH_IDS.includes(normalizedBranch as any)) {
          res.status(400).json({
            error: `Invalid branchId '${branchId}'. Must be one of supported branches: ${SUPPORTED_BRANCH_IDS.join(', ')}`,
          });
          return;
        }

        authoritativeBranchId = normalizedBranch;
      }

      const now = new Date();
      const createdAt = now.toISOString();
      const slaDueAt = new Date(now.getTime() + RA11967_SLA_MS).toISOString();
      const ticketId = `TKT-${now.getTime()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      const newTicket = {
        id: ticketId,
        userId: user.uid,
        customerName: customerName ? String(customerName).trim() : (user.email ? user.email.split('@')[0] : 'Valued Customer'),
        customerEmail: user.email,
        customerPhone: customerPhone ? String(customerPhone).trim() : undefined,
        orderId: orderId && typeof orderId === 'string' && orderId.trim().length > 0 ? orderId.trim() : undefined,
        branchId: authoritativeBranchId,
        category,
        subject: subject.trim(),
        description: description.trim(),
        status: 'submitted',
        slaDueAt,
        isEscalated: false,
        escalationHistory: [],
        createdAt,
        updatedAt: createdAt,
      };

      await db.collection('support_tickets').doc(ticketId).set(newTicket);

      await logAuditEvent(
        user.uid,
        user.role,
        newTicket.branchId,
        'support_ticket_created',
        'support_tickets',
        ticketId,
        true,
        { category, branchId: newTicket.branchId, slaDueAt },
        req
      );

      // C2: Enqueue transactional support ticket acknowledgement notification
      await enqueueTicketAcknowledgedNotification(db, newTicket).catch((e) => {
        logger.warn('Failed to enqueue ticket acknowledgement notification', { error: e.message, ticketId });
      });

      res.status(201).json({
        ticket: newTicket,
        statutoryNotice: 'Statutory 7-day internal dispute resolution SLA enforced under RA 11967.',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Query Support Tickets (Strict Ownership & Branch Isolation with Dynamic SLA Evaluation)
  app.get('/api/support/tickets', async (req: Request, res: Response) => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role === 'practitioner') {
      res.status(403).json({ error: 'Access Denied: Practitioners do not have access to commercial consumer redress tickets.' });
      return;
    }

    try {
      const snap = await db.collection('support_tickets').get();
      const allTickets: any[] = [];
      if (snap && !snap.empty) {
        snap.forEach((d: any) => allTickets.push(d.data()));
      }

      // Dynamic SLA Evaluation for overdue tickets
      for (const t of allTickets) {
        if (evaluateSlaEscalation(t)) {
          await db.collection('support_tickets').doc(t.id).set(t);
          await logAuditEvent(
            'system',
            'system',
            t.branchId,
            'support_ticket_sla_escalated',
            'support_tickets',
            t.id,
            true,
            { slaDueAt: t.slaDueAt },
            req
          );
        }
      }

      let filteredTickets: any[] = [];
      if (user.role === 'customer') {
        // Customer ownership isolation: customers only see their own tickets
        filteredTickets = allTickets.filter((t) => t.userId === user.uid);
      } else if (user.role === 'branch_manager') {
        // Branch isolation: branch managers only see tickets for their assigned branch
        filteredTickets = allTickets.filter((t) => t.branchId === user.assignedBranchId);
      } else if (user.role === 'regional_director' || user.role === 'super_admin') {
        // Regional Director and Super Admin have cross-branch oversight
        filteredTickets = allTickets;
      }

      // Sort by createdAt descending
      filteredTickets.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

      res.json({ tickets: filteredTickets });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Get Single Support Ticket (Ownership & Branch Boundary Check)
  app.get('/api/support/tickets/:ticketId', async (req: Request, res: Response) => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role === 'practitioner') {
      res.status(403).json({ error: 'Access Denied: Practitioners do not have access to support tickets.' });
      return;
    }

    try {
      const doc = await db.collection('support_tickets').doc(req.params.ticketId).get();
      if (!doc || !doc.exists) {
        res.status(404).json({ error: 'Support ticket not found.' });
        return;
      }

      const ticket = doc.data();

      // Enforce access boundaries
      if (user.role === 'customer' && ticket.userId !== user.uid) {
        res.status(403).json({ error: 'Access Denied: Customer cannot view another user\'s support ticket.' });
        return;
      }

      if (user.role === 'branch_manager' && ticket.branchId !== user.assignedBranchId) {
        res.status(403).json({ error: 'Access Denied: Branch managers may only view tickets for their assigned branch.' });
        return;
      }

      // Dynamic SLA evaluation check
      if (evaluateSlaEscalation(ticket)) {
        await db.collection('support_tickets').doc(ticket.id).set(ticket);
        await logAuditEvent(
          'system',
          'system',
          ticket.branchId,
          'support_ticket_sla_escalated',
          'support_tickets',
          ticket.id,
          true,
          { slaDueAt: ticket.slaDueAt },
          req
        );
      }

      res.json({ ticket });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Update Support Ticket Status / Resolve (Transactional & Branch Guarded)
  app.patch('/api/support/tickets/:ticketId', async (req: Request, res: Response) => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role === 'customer') {
      res.status(403).json({ error: 'Access Denied: Customers cannot administratively update support tickets.' });
      return;
    }

    if (user.role === 'practitioner') {
      res.status(403).json({ error: 'Access Denied: Practitioners cannot update support tickets.' });
      return;
    }

    const { status, resolutionSummary, internalNotes } = req.body;

    if (status && !VALID_TICKET_STATUSES.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_TICKET_STATUSES.join(', ')}` });
      return;
    }

    if (status === 'resolved') {
      if (!resolutionSummary || typeof resolutionSummary !== 'string' || resolutionSummary.trim().length < 5) {
        res.status(400).json({ error: 'resolutionSummary (minimum 5 characters) is required when resolving a ticket.' });
        return;
      }
    }

    try {
      const updated = await db.runTransaction(async (tx: any) => {
        const docRef = db.collection('support_tickets').doc(req.params.ticketId);
        const doc = await tx.get(docRef);
        if (!doc || !doc.exists) {
          throw new Error('NOT_FOUND: Support ticket not found.');
        }

        const current = doc.data();

        // Branch Isolation: Branch Manager must match ticket branch
        if (user.role === 'branch_manager' && current.branchId !== user.assignedBranchId) {
          throw new Error('PERMISSION_DENIED: Branch managers may only update tickets for their assigned branch.');
        }

        const patch: any = {
          updatedAt: new Date().toISOString(),
        };

        if (status) {
          patch.status = status;
        }

        if (status === 'resolved') {
          patch.resolutionSummary = resolutionSummary.trim();
          patch.resolvedAt = new Date().toISOString();
          patch.resolvedByUid = user.uid;
          patch.resolvedByName = user.email;
        }

        if (internalNotes && typeof internalNotes === 'string') {
          patch.internalNotes = internalNotes.trim();
        }

        const merged = { ...current, ...patch };
        tx.set(docRef, merged);
        return merged;
      });

      await logAuditEvent(
        user.uid,
        user.role,
        updated.branchId,
        'support_ticket_status_updated',
        'support_tickets',
        updated.id,
        true,
        { status: updated.status },
        req
      );

      // C2: Enqueue transactional support ticket resolution notification
      if (updated.status === 'resolved' && resolutionSummary) {
        await enqueueTicketResolvedNotification(db, updated, resolutionSummary.trim()).catch((e) => {
          logger.warn('Failed to enqueue ticket resolved notification', { error: e.message, ticketId: updated.id });
        });
      }

      res.json({ ticket: updated });
    } catch (err: any) {
      if (err.message.startsWith('NOT_FOUND')) {
        res.status(404).json({ error: err.message });
      } else if (err.message.startsWith('PERMISSION_DENIED')) {
        res.status(403).json({ error: err.message });
      } else {
        res.status(500).json({ error: err.message });
      }
    }
  });

  // 5. Escalate Support Ticket (SLA Breach or Expedited Redress Queue)
  app.post('/api/support/tickets/:ticketId/escalate', async (req: Request, res: Response) => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role === 'practitioner') {
      res.status(403).json({ error: 'Access Denied: Practitioners cannot escalate support tickets.' });
      return;
    }

    try {
      const updated = await db.runTransaction(async (tx: any) => {
        const docRef = db.collection('support_tickets').doc(req.params.ticketId);
        const doc = await tx.get(docRef);
        if (!doc || !doc.exists) {
          throw new Error('NOT_FOUND: Support ticket not found.');
        }

        const current = doc.data();

        // Customer can only escalate their own ticket
        if (user.role === 'customer' && current.userId !== user.uid) {
          throw new Error('PERMISSION_DENIED: Customers can only escalate their own tickets.');
        }

        // Branch manager can only escalate their own branch tickets
        if (user.role === 'branch_manager' && current.branchId !== user.assignedBranchId) {
          throw new Error('PERMISSION_DENIED: Branch managers can only escalate tickets for their assigned branch.');
        }

        const now = new Date().toISOString();
        const reason = req.body.reason ? String(req.body.reason).trim() : 'Manual escalation under RA 11967 consumer redress procedures.';

        const history = Array.isArray(current.escalationHistory) ? [...current.escalationHistory] : [];
        history.push({
          escalatedAt: now,
          reason,
          previousStatus: current.status,
        });

        const merged = {
          ...current,
          status: 'escalated_sla_breach',
          isEscalated: true,
          escalationHistory: history,
          updatedAt: now,
        };

        tx.set(docRef, merged);
        return merged;
      });

      await logAuditEvent(
        user.uid,
        user.role,
        updated.branchId,
        'support_ticket_manually_escalated',
        'support_tickets',
        updated.id,
        true,
        { reason: req.body.reason },
        req
      );

      // C2: Enqueue transactional SLA-breach staff alert notification
      await enqueueTicketSlaBreachAlert(db, updated, req.body.reason).catch((e) => {
        logger.warn('Failed to enqueue ticket SLA breach alert', { error: e.message, ticketId: updated.id });
      });

      res.json({ ticket: updated });
    } catch (err: any) {
      if (err.message.startsWith('NOT_FOUND')) {
        res.status(404).json({ error: err.message });
      } else if (err.message.startsWith('PERMISSION_DENIED')) {
        res.status(403).json({ error: err.message });
      } else {
        res.status(500).json({ error: err.message });
      }
    }
  });

  // --- C2: POST /api/support/check-sla-breaches - Scan Open Tickets and Trigger SLA Breach Alerts ---
  app.post('/api/support/check-sla-breaches', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const isStaff = user.role === 'branch_manager' || user.role === 'regional_director' || user.role === 'super_admin';
    if (!isStaff) {
      res.status(403).json({ error: 'Access Denied: Only staff can trigger SLA breach audits.' });
      return;
    }

    try {
      const nowIso = new Date().toISOString();
      const snap = await db.collection('support_tickets').get();
      const breachedTickets: any[] = [];
      const alertResults: any[] = [];

      if (snap && !snap.empty) {
        const docs = snap.docs || [];
        for (const d of docs) {
          const t = typeof d.data === 'function' ? d.data() : d.data;
          const isOpen = t.status === 'submitted' || t.status === 'in_progress';
          const isBreached = isOpen && t.slaDueAt && t.slaDueAt <= nowIso;

          if (isBreached || t.status === 'escalated_sla_breach') {
            breachedTickets.push(t);
            const alertRes = await enqueueTicketSlaBreachAlert(db, t, 'Automated SLA deadline evaluation').catch(() => null);
            if (alertRes) alertResults.push(alertRes);
          }
        }
      }

      res.status(200).json({
        success: true,
        breachedCount: breachedTickets.length,
        alertCount: alertResults.length,
        tickets: breachedTickets.map((t) => ({ id: t.id, branchId: t.branchId, slaDueAt: t.slaDueAt })),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- PHASE 6C MILESTONE 2: CRM & Account Segmentation Endpoints ---

  // 1. Overview of all approved CRM cohorts with member counts
  app.get('/api/crm/cohorts', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin') {
      res.status(403).json({ error: 'Access Denied: Staff CRM operations require branch_manager, regional_director, or super_admin role.' });
      return;
    }

    try {
      const branchFilter = user.role === 'branch_manager' ? (user.assignedBranchId || 'daet') : null;

      // Authoritative commercial data sources (HEALTH DATA PRIVACY FIREWALL: zero consultation_intakes access)
      const [usersSnap, ordersSnap, regsSnap] = await Promise.all([
        db.collection('users').get(),
        db.collection('orders').get(),
        db.collection('workshop_registrations').get(),
      ]);

      const users: any[] = [];
      const orders: any[] = [];
      const registrations: any[] = [];

      if (usersSnap && !usersSnap.empty) usersSnap.forEach((d: any) => users.push(d.data()));
      if (ordersSnap && !ordersSnap.empty) ordersSnap.forEach((d: any) => orders.push(d.data()));
      if (regsSnap && !regsSnap.empty) regsSnap.forEach((d: any) => registrations.push(d.data()));

      const members = aggregateCustomerCrmProfiles(
        { users, orders, registrations },
        branchFilter
      );

      const summaries = Object.values(CRM_COHORTS).map((c) => ({
        key: c.key,
        label: c.label,
        description: c.description,
        memberCount: members.filter((m) => m.cohorts.includes(c.key as any)).length,
      }));

      await logAuditEvent(
        user.uid,
        user.role,
        branchFilter,
        'crm_cohorts_queried',
        'crm_analytics',
        'overview',
        true,
        { totalTracked: members.length },
        req
      );

      res.json({
        cohorts: summaries,
        totalCustomersTracked: members.length,
        branchScope: branchFilter || 'all_regional_branches',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Specific cohort member breakdown
  app.get('/api/crm/cohorts/:cohortKey', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin') {
      res.status(403).json({ error: 'Access Denied: Staff CRM operations require branch_manager, regional_director, or super_admin role.' });
      return;
    }

    const cohortKey = String(req.params.cohortKey || '');
    const cohortDef = CRM_COHORTS[cohortKey];

    if (!cohortDef) {
      res.status(400).json({
        error: `Invalid cohort key: '${cohortKey}'. Must be one of: ${Object.keys(CRM_COHORTS).join(', ')}`,
      });
      return;
    }

    try {
      const branchFilter = user.role === 'branch_manager' ? (user.assignedBranchId || 'daet') : null;

      // Authoritative commercial data sources (HEALTH DATA PRIVACY FIREWALL: zero consultation_intakes access)
      const [usersSnap, ordersSnap, regsSnap] = await Promise.all([
        db.collection('users').get(),
        db.collection('orders').get(),
        db.collection('workshop_registrations').get(),
      ]);

      const users: any[] = [];
      const orders: any[] = [];
      const registrations: any[] = [];

      if (usersSnap && !usersSnap.empty) usersSnap.forEach((d: any) => users.push(d.data()));
      if (ordersSnap && !ordersSnap.empty) ordersSnap.forEach((d: any) => orders.push(d.data()));
      if (regsSnap && !regsSnap.empty) regsSnap.forEach((d: any) => registrations.push(d.data()));

      const members = aggregateCustomerCrmProfiles(
        { users, orders, registrations },
        branchFilter
      );

      const cohortMembers = members.filter((m) => m.cohorts.includes(cohortKey));

      await logAuditEvent(
        user.uid,
        user.role,
        branchFilter,
        'crm_cohort_detail_queried',
        'crm_analytics',
        cohortKey,
        true,
        { count: cohortMembers.length },
        req
      );

      res.json({
        cohortKey: cohortDef.key,
        label: cohortDef.label,
        description: cohortDef.description,
        count: cohortMembers.length,
        members: cohortMembers,
        branchScope: branchFilter || 'all_regional_branches',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- PHASE 6C MILESTONE 3: Finance, Expenses & Commodity Analytics Endpoints ---

  // 1. Record New Expense (Server-Authoritative, Branch-Scoped, Audit-Logged)
  app.post('/api/finance/expenses', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin') {
      res.status(403).json({ error: 'Access Denied: Recording expenses requires branch_manager, regional_director, or super_admin role.' });
      return;
    }

    const {
      branchId,
      category,
      description,
      amount,
      expenseStatus,
      incurredAt,
      paidAt,
      paymentReference,
      commodityMetadata,
    } = req.body;

    // Enforce branch boundaries
    if (user.role === 'branch_manager') {
      const assigned = user.assignedBranchId || 'daet';
      if (branchId && branchId !== assigned) {
        res.status(403).json({ error: `Access Denied: Branch managers can only record expenses for their assigned branch (${assigned}).` });
        return;
      }
    }

    const targetBranch = (user.role === 'branch_manager' ? user.assignedBranchId || 'daet' : branchId) || 'daet';

    if (!category || !EXPENSE_CATEGORIES.includes(category)) {
      res.status(400).json({ error: `Invalid category. Must be one of: ${EXPENSE_CATEGORIES.join(', ')}` });
      return;
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      res.status(400).json({ error: 'Description is required and cannot be empty.' });
      return;
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ error: 'Amount must be a positive number greater than 0.' });
      return;
    }

    const validStatuses = ['paid', 'incurred_pending_payment'];
    if (!expenseStatus || !validStatuses.includes(expenseStatus)) {
      res.status(400).json({ error: "Invalid expenseStatus. Must be 'paid' or 'incurred_pending_payment'." });
      return;
    }

    const incurredIso = incurredAt ? new Date(incurredAt).toISOString() : new Date().toISOString();
    const nowIso = new Date().toISOString();

    let safeCommodityMeta: any = null;
    if (commodityMetadata) {
      if (!['rice', 'copra'].includes(commodityMetadata.commodityType)) {
        res.status(400).json({ error: "Invalid commodityMetadata.commodityType. Must be 'rice' or 'copra'." });
        return;
      }
      safeCommodityMeta = {
        commodityType: commodityMetadata.commodityType,
        volumeKg: Number(commodityMetadata.volumeKg) || 0,
        acquisitionCostPerKg: Number(commodityMetadata.acquisitionCostPerKg) || 0,
        millingOrDryingFee: Number(commodityMetadata.millingOrDryingFee) || 0,
        notes: commodityMetadata.notes ? String(commodityMetadata.notes).slice(0, 500) : undefined,
      };
    }

    const expenseId = `EXP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const newExpense = {
      id: expenseId,
      branchId: targetBranch,
      category,
      description: description.trim(),
      amount: Math.round(parsedAmount * 100) / 100,
      expenseStatus,
      incurredAt: incurredIso,
      paidAt: expenseStatus === 'paid' ? (paidAt ? new Date(paidAt).toISOString() : nowIso) : null,
      paymentReference: paymentReference ? String(paymentReference).trim() : null,
      commodityMetadata: safeCommodityMeta,
      recordedByUid: user.uid,
      recordedByName: user.email ? user.email.split('@')[0] : 'Staff Member',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      await db.collection('expenses').doc(expenseId).set(newExpense);

      await logAuditEvent(
        user.uid,
        user.role,
        targetBranch,
        'expense_recorded',
        'expenses',
        expenseId,
        true,
        {
          category,
          amount: newExpense.amount,
          status: expenseStatus,
          hasCommodity: !!safeCommodityMeta,
        },
        req
      );

      res.status(201).json({ expense: newExpense });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Query Expenses List with Branch Scoping & Filtering
  app.get('/api/finance/expenses', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin') {
      res.status(403).json({ error: 'Access Denied: Staff finance operations require branch_manager, regional_director, or super_admin role.' });
      return;
    }

    try {
      const branchFilter = user.role === 'branch_manager' ? (user.assignedBranchId || 'daet') : (req.query.branchId ? String(req.query.branchId) : null);
      const startDate = req.query.startDate ? String(req.query.startDate) : null;
      const endDate = req.query.endDate ? String(req.query.endDate) : null;
      const categoryFilter = req.query.category ? String(req.query.category) : null;
      const statusFilter = req.query.status ? String(req.query.status) : null;

      let query: any = db.collection('expenses');
      if (branchFilter) {
        query = query.where('branchId', '==', branchFilter);
      }

      const snap = await query.get();
      let expenses: any[] = [];
      if (snap && !snap.empty) {
        snap.forEach((d: any) => expenses.push(d.data()));
      }

      const startMs = parseDateBoundary(startDate || undefined, false);
      const endMs = parseDateBoundary(endDate || undefined, true);

      expenses = expenses.filter((e) => {
        const incurredMs = Date.parse(e.incurredAt || e.createdAt);
        if (!isNaN(incurredMs)) {
          if (incurredMs < startMs || incurredMs > endMs) return false;
        }
        if (categoryFilter && e.category !== categoryFilter) return false;
        if (statusFilter && e.expenseStatus !== statusFilter) return false;
        return true;
      });

      expenses.sort((a, b) => (Date.parse(b.incurredAt || b.createdAt) || 0) - (Date.parse(a.incurredAt || a.createdAt) || 0));

      res.json({
        expenses,
        count: expenses.length,
        branchScope: branchFilter || 'all_regional_branches',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Update Expense Status (e.g. Incurred -> Paid)
  app.patch('/api/finance/expenses/:expenseId/status', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin') {
      res.status(403).json({ error: 'Access Denied: Updating expense status requires authorized staff role.' });
      return;
    }

    const { status, paymentReference, paidAt } = req.body;
    if (!status || !['paid', 'incurred_pending_payment'].includes(status)) {
      res.status(400).json({ error: "Invalid status. Must be 'paid' or 'incurred_pending_payment'." });
      return;
    }

    try {
      const docRef = db.collection('expenses').doc(req.params.expenseId);
      const doc = await docRef.get();
      if (!doc || !doc.exists) {
        res.status(404).json({ error: 'Expense record not found.' });
        return;
      }

      const current = doc.data();
      if (user.role === 'branch_manager' && current.branchId !== user.assignedBranchId) {
        res.status(403).json({ error: 'Access Denied: Branch managers can only update expenses for their assigned branch.' });
        return;
      }

      const nowIso = new Date().toISOString();
      const updated = {
        ...current,
        expenseStatus: status,
        paidAt: status === 'paid' ? (paidAt ? new Date(paidAt).toISOString() : (current.paidAt || nowIso)) : null,
        paymentReference: paymentReference ? String(paymentReference).trim() : current.paymentReference,
        updatedAt: nowIso,
      };

      await docRef.set(updated);

      await logAuditEvent(
        user.uid,
        user.role,
        updated.branchId,
        'expense_status_updated',
        'expenses',
        updated.id,
        true,
        { previousStatus: current.expenseStatus, newStatus: status },
        req
      );

      res.json({ expense: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Financial Performance Metrics Summary (Accrual vs. Cash Flow)
  app.get('/api/finance/metrics', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin') {
      res.status(403).json({ error: 'Access Denied: Financial performance metrics require authorized staff role.' });
      return;
    }

    try {
      const branchFilter = user.role === 'branch_manager' ? (user.assignedBranchId || 'daet') : (req.query.branchId ? String(req.query.branchId) : null);
      const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
      const endDate = req.query.endDate ? String(req.query.endDate) : undefined;

      // Strict Health Data Privacy Firewall: queries orders & expenses only (NEVER consultation_intakes)
      const [ordersSnap, expensesSnap] = await Promise.all([
        db.collection('orders').get(),
        db.collection('expenses').get(),
      ]);

      const orders: any[] = [];
      const expenses: any[] = [];

      if (ordersSnap && !ordersSnap.empty) ordersSnap.forEach((d: any) => orders.push(d.data()));
      if (expensesSnap && !expensesSnap.empty) expensesSnap.forEach((d: any) => expenses.push(d.data()));

      const metrics = calculateFinancialMetrics({
        orders,
        expenses,
        startDate,
        endDate,
        branchId: branchFilter,
      });

      await logAuditEvent(
        user.uid,
        user.role,
        branchFilter,
        'financial_report_generated',
        'financial_analytics',
        'summary',
        true,
        {
          revenue: metrics.revenue,
          netIncomeAccrual: metrics.netIncomeAccrual,
          cashReceived: metrics.cashReceived,
          cashPaid: metrics.cashPaid,
        },
        req
      );

      res.json({
        metrics,
        branchScope: branchFilter || 'all_regional_branches',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Agricultural Commodity Profitability & WASP Analytics (Rice & Copra)
  app.get('/api/finance/commodity-profitability', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin') {
      res.status(403).json({ error: 'Access Denied: Commodity profitability metrics require authorized staff role.' });
      return;
    }

    try {
      const commodityParam = String(req.query.commodityType || 'rice').toLowerCase();
      if (commodityParam !== 'rice' && commodityParam !== 'copra') {
        res.status(400).json({ error: "Invalid commodityType. Must be 'rice' or 'copra'." });
        return;
      }

      const branchFilter = user.role === 'branch_manager' ? (user.assignedBranchId || 'daet') : (req.query.branchId ? String(req.query.branchId) : null);

      const [ordersSnap, expensesSnap] = await Promise.all([
        db.collection('orders').get(),
        db.collection('expenses').get(),
      ]);

      const orders: any[] = [];
      const expenses: any[] = [];

      if (ordersSnap && !ordersSnap.empty) ordersSnap.forEach((d: any) => orders.push(d.data()));
      if (expensesSnap && !expensesSnap.empty) expensesSnap.forEach((d: any) => expenses.push(d.data()));

      const profitability = calculateCommodityProfitability(
        expenses,
        orders,
        commodityParam as 'rice' | 'copra',
        branchFilter
      );

      await logAuditEvent(
        user.uid,
        user.role,
        branchFilter,
        'commodity_profitability_queried',
        'agricultural_analytics',
        commodityParam,
        true,
        {
          volumeProcured: profitability.totalVolumeProcuredKg,
          volumeSold: profitability.totalVolumeSoldKg,
          wasp: profitability.weightedAverageSellingPrice,
          grossMargin: profitability.grossMarginPercent,
        },
        req
      );

      res.json({
        commodityType: commodityParam,
        profitability,
        branchScope: branchFilter || 'all_regional_branches',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- PHASE 7 MILESTONE 1: Multi-Branch Inventory & Stock Reconciliation Endpoints ---

  async function ensureInventorySeeded(): Promise<{ batches: BranchBatchInventoryRecord[]; inventory: InventoryItemRecord[] }> {
    const batchesSnap = await db.collection('branch_batch_inventory').get();
    let batches: BranchBatchInventoryRecord[] = [];

    if (!batchesSnap || batchesSnap.empty) {
      for (const batch of SEED_BRANCH_BATCH_INVENTORY) {
        await db.collection('branch_batch_inventory').doc(batch.id).set(batch);
        batches.push(batch);
      }
      for (const pb of SEED_PRODUCT_BATCHES) {
        await db.collection('product_batches').doc(pb.id).set(pb);
      }
    } else {
      batchesSnap.forEach((d: any) => batches.push(d.data()));
    }

    const invSnap = await db.collection('inventory').get();
    let inventory: InventoryItemRecord[] = [];

    if (!invSnap || invSnap.empty) {
      for (const branchId of SUPPORTED_BRANCH_IDS) {
        for (const skuId of ACTIVE_CONSUMER_SKUS) {
          const agg = computeAggregateInventoryFromBatches({
            branchBatches: batches,
            branchId,
            skuId,
          });
          await db.collection('inventory').doc(agg.id).set(agg);
          inventory.push(agg);
        }
      }
    } else {
      invSnap.forEach((d: any) => inventory.push(d.data()));
    }

    return { batches, inventory };
  }

  // 1. GET /api/inventory - Retrieve aggregate inventory records with IDOR protection
  app.get('/api/inventory', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin') {
      res.status(403).json({ error: 'Access Denied: Inventory access requires authorized staff role.' });
      return;
    }

    const requestedBranch = req.query.branchId ? String(req.query.branchId).toLowerCase().trim() : null;

    if (user.role === 'branch_manager') {
      const assigned = (user.assignedBranchId || 'daet').toLowerCase().trim();
      if (requestedBranch && requestedBranch !== assigned) {
        await logAuditEvent(
          user.uid,
          user.role,
          requestedBranch,
          'unauthorized_cross_branch_inventory_access_blocked',
          'inventory',
          null,
          false,
          { requestedBranch, assignedBranch: assigned },
          req
        );
        res.status(403).json({ error: 'Access Denied: Branch managers cannot access inventory records of other branches.' });
        return;
      }
    }

    try {
      const branchFilter = user.role === 'branch_manager'
        ? (user.assignedBranchId || 'daet').toLowerCase().trim()
        : requestedBranch;

      const { inventory } = await ensureInventorySeeded();
      const filtered = branchFilter
        ? inventory.filter((item) => item.branchId.toLowerCase() === branchFilter)
        : inventory;

      res.json({
        inventory: filtered,
        branchScope: branchFilter || 'all_regional_branches',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. GET /api/inventory/batches - Retrieve authoritative batch-level stock records
  app.get('/api/inventory/batches', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin') {
      res.status(403).json({ error: 'Access Denied: Batch inventory access requires authorized staff role.' });
      return;
    }

    const requestedBranch = req.query.branchId ? String(req.query.branchId).toLowerCase().trim() : null;

    if (user.role === 'branch_manager') {
      const assigned = (user.assignedBranchId || 'daet').toLowerCase().trim();
      if (requestedBranch && requestedBranch !== assigned) {
        await logAuditEvent(
          user.uid,
          user.role,
          requestedBranch,
          'unauthorized_cross_branch_batch_inventory_access_blocked',
          'branch_batch_inventory',
          null,
          false,
          { requestedBranch, assignedBranch: assigned },
          req
        );
        res.status(403).json({ error: 'Access Denied: Branch managers cannot access batch records of other branches.' });
        return;
      }
    }

    try {
      const branchFilter = user.role === 'branch_manager'
        ? (user.assignedBranchId || 'daet').toLowerCase().trim()
        : requestedBranch;

      const { batches } = await ensureInventorySeeded();
      const filtered = branchFilter
        ? batches.filter((b) => b.branchId.toLowerCase() === branchFilter)
        : batches;

      res.json({
        batches: filtered,
        branchScope: branchFilter || 'all_regional_branches',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. POST /api/inventory/adjustments - Record audited stock adjustment inside Firestore Transaction
  app.post('/api/inventory/adjustments', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin') {
      res.status(403).json({ error: 'Access Denied: Recording stock adjustments requires authorized staff role.' });
      return;
    }

    const { branchId, skuId, batchId, adjustmentType, quantityDelta, reason } = req.body;

    if (!branchId || typeof branchId !== 'string') {
      res.status(400).json({ error: 'Missing or invalid branchId.' });
      return;
    }

    const normalizedBranch = branchId.toLowerCase().trim();
    if (!SUPPORTED_BRANCH_IDS.includes(normalizedBranch as any)) {
      res.status(400).json({ error: `Invalid branchId: '${branchId}'. Must be one of: ${SUPPORTED_BRANCH_IDS.join(', ')}` });
      return;
    }

    if (user.role === 'branch_manager') {
      const assigned = (user.assignedBranchId || 'daet').toLowerCase().trim();
      if (normalizedBranch !== assigned) {
        await logAuditEvent(
          user.uid,
          user.role,
          normalizedBranch,
          'unauthorized_cross_branch_inventory_adjustment_blocked',
          'inventory',
          null,
          false,
          { targetBranch: normalizedBranch, assignedBranch: assigned },
          req
        );
        res.status(403).json({ error: 'Access Denied: Branch managers cannot adjust inventory for other branches.' });
        return;
      }
    }

    if (!skuId || !ACTIVE_CONSUMER_SKUS.includes(skuId as any)) {
      res.status(400).json({ error: `Invalid skuId: '${skuId}'. Must be one of: ${ACTIVE_CONSUMER_SKUS.join(', ')}` });
      return;
    }

    if (!batchId || typeof batchId !== 'string' || batchId.trim().length === 0) {
      res.status(400).json({ error: 'Missing or invalid batchId.' });
      return;
    }

    if (!adjustmentType || !VALID_INVENTORY_ADJUSTMENT_TYPES.includes(adjustmentType as any)) {
      res.status(400).json({ error: `Invalid adjustmentType: '${adjustmentType}'. Must be one of: ${VALID_INVENTORY_ADJUSTMENT_TYPES.join(', ')}` });
      return;
    }

    const delta = Number(quantityDelta);
    if (!Number.isInteger(delta) || delta === 0) {
      res.status(400).json({ error: 'quantityDelta must be a non-zero integer.' });
      return;
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      res.status(400).json({ error: 'reason must be a valid descriptive string of at least 5 characters.' });
      return;
    }

    try {
      await ensureInventorySeeded();

      const batchDocId = `${normalizedBranch}_${batchId.trim()}`;
      const batchDocRef = db.collection('branch_batch_inventory').doc(batchDocId);
      const aggDocRef = db.collection('inventory').doc(`${normalizedBranch}_${skuId}`);
      const adjId = `ADJ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const adjDocRef = db.collection('inventory_adjustments').doc(adjId);

      let adjustmentResult: any;

      await db.runTransaction(async (transaction: any) => {
        const batchSnap = await transaction.get(batchDocRef);
        let batchData: BranchBatchInventoryRecord;

        if (!batchSnap.exists) {
          const seedMatch = SEED_BRANCH_BATCH_INVENTORY.find((b) => b.id === batchDocId);
          if (seedMatch) {
            batchData = { ...seedMatch };
          } else {
            batchData = {
              id: batchDocId,
              branchId: normalizedBranch,
              batchId: batchId.trim(),
              skuId,
              availableQuantity: 0,
              reservedQuantity: 0,
              damagedQuantity: 0,
              expiryDate: '2028-12-31',
              updatedAt: new Date().toISOString(),
            };
          }
        } else {
          batchData = batchSnap.data();
        }

        let newAvailable = Number(batchData.availableQuantity) || 0;
        let newDamaged = Number(batchData.damagedQuantity) || 0;

        if (adjustmentType === 'count_reconciliation') {
          newAvailable += delta;
        } else if (adjustmentType === 'damage_writeoff') {
          if (delta <= 0) {
            throw new Error('INVALID_DELTA: damage_writeoff quantityDelta must be positive representing damaged unit count.');
          }
          newAvailable -= delta;
          newDamaged += delta;
        } else if (adjustmentType === 'sample_withdrawal' || adjustmentType === 'shrinkage_loss') {
          if (delta <= 0) {
            throw new Error(`INVALID_DELTA: ${adjustmentType} quantityDelta must be positive representing reduction count.`);
          }
          newAvailable -= delta;
        } else if (adjustmentType === 'qc_quarantine') {
          if (delta <= 0) {
            throw new Error('INVALID_DELTA: qc_quarantine quantityDelta must be positive representing quarantined count.');
          }
          newAvailable -= delta;
          newDamaged += delta;
        }

        if (newAvailable < 0) {
          throw new Error(`INSUFFICIENT_STOCK: Current available: ${batchData.availableQuantity}, requested reduction: ${Math.abs(delta)}.`);
        }

        const updatedBatch: BranchBatchInventoryRecord = {
          ...batchData,
          availableQuantity: newAvailable,
          damagedQuantity: newDamaged,
          updatedAt: new Date().toISOString(),
        };

        const branchBatchesQuery = db.collection('branch_batch_inventory').where('branchId', '==', normalizedBranch).where('skuId', '==', skuId);
        const branchBatchesSnap = await transaction.get(branchBatchesQuery);
        const branchBatches: BranchBatchInventoryRecord[] = [];
        if (branchBatchesSnap && !branchBatchesSnap.empty) {
          branchBatchesSnap.forEach((d: any) => {
            if (d.id !== batchDocId) {
              branchBatches.push(d.data());
            }
          });
        }
        branchBatches.push(updatedBatch);

        const updatedAggregate = computeAggregateInventoryFromBatches({
          branchBatches,
          branchId: normalizedBranch,
          skuId,
          lastAdjustmentAt: new Date().toISOString(),
        });

        const adjustmentRecord: InventoryAdjustmentRecord = {
          id: adjId,
          branchId: normalizedBranch,
          skuId,
          batchId: batchId.trim(),
          adjustmentType,
          quantityDelta: delta,
          reason: reason.trim(),
          performedByUid: user.uid,
          performedByName: user.email || user.uid,
          timestamp: new Date().toISOString(),
        };

        transaction.set(batchDocRef, updatedBatch);
        transaction.set(aggDocRef, updatedAggregate);
        transaction.set(adjDocRef, adjustmentRecord);

        adjustmentResult = { adjustmentRecord, updatedBatch, updatedAggregate };
      });

      await logAuditEvent(
        user.uid,
        user.role,
        normalizedBranch,
        'inventory_adjustment_recorded',
        'inventory',
        adjId,
        true,
        {
          skuId,
          batchId: batchId.trim(),
          adjustmentType,
          quantityDelta: delta,
          newAvailableStock: adjustmentResult.updatedAggregate.activeStock,
          newReservedStock: adjustmentResult.updatedAggregate.reservedStock,
          reason: reason.trim(),
        },
        req
      );

      res.status(201).json({
        adjustment: adjustmentResult.adjustmentRecord,
        updatedBatch: adjustmentResult.updatedBatch,
        updatedAggregate: adjustmentResult.updatedAggregate,
      });
    } catch (err: any) {
      if (err.message.startsWith('INVALID_DELTA:') || err.message.startsWith('INSUFFICIENT_STOCK:')) {
        res.status(400).json({ error: err.message.replace(/^(INVALID_DELTA|INSUFFICIENT_STOCK):\s*/, '') });
        return;
      }
      res.status(500).json({ error: err.message });
    }
  });

  // 4. GET /api/inventory/adjustments - Retrieve adjustment audit trail
  app.get('/api/inventory/adjustments', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin') {
      res.status(403).json({ error: 'Access Denied: Viewing adjustments requires authorized staff role.' });
      return;
    }

    const requestedBranch = req.query.branchId ? String(req.query.branchId).toLowerCase().trim() : null;

    if (user.role === 'branch_manager') {
      const assigned = (user.assignedBranchId || 'daet').toLowerCase().trim();
      if (requestedBranch && requestedBranch !== assigned) {
        res.status(403).json({ error: 'Access Denied: Branch managers cannot access adjustments of other branches.' });
        return;
      }
    }

    try {
      const branchFilter = user.role === 'branch_manager'
        ? (user.assignedBranchId || 'daet').toLowerCase().trim()
        : requestedBranch;

      const adjustmentsSnap = await db.collection('inventory_adjustments').get();
      const adjustments: InventoryAdjustmentRecord[] = [];
      if (adjustmentsSnap && !adjustmentsSnap.empty) {
        adjustmentsSnap.forEach((d: any) => adjustments.push(d.data()));
      }

      const filtered = branchFilter
        ? adjustments.filter((a) => a.branchId.toLowerCase() === branchFilter)
        : adjustments;

      res.json({
        adjustments: filtered,
        branchScope: branchFilter || 'all_regional_branches',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. GET /api/inventory/reconciliation - Live mathematical consistency check
  app.get('/api/inventory/reconciliation', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin') {
      res.status(403).json({ error: 'Access Denied: Stock reconciliation requires authorized staff role.' });
      return;
    }

    const requestedBranch = req.query.branchId ? String(req.query.branchId).toLowerCase().trim() : null;

    if (user.role === 'branch_manager') {
      const assigned = (user.assignedBranchId || 'daet').toLowerCase().trim();
      if (requestedBranch && requestedBranch !== assigned) {
        res.status(403).json({ error: 'Access Denied: Branch managers cannot reconcile inventory of other branches.' });
        return;
      }
    }

    try {
      const branchFilter = user.role === 'branch_manager'
        ? (user.assignedBranchId || 'daet').toLowerCase().trim()
        : requestedBranch;

      const { batches, inventory } = await ensureInventorySeeded();

      const reconciliation = verifyInventoryReconciliation({
        branchBatches: batches,
        aggregateInventory: inventory,
        branchId: branchFilter,
      });

      await logAuditEvent(
        user.uid,
        user.role,
        branchFilter,
        'inventory_reconciliation_queried',
        'inventory',
        'reconciliation_report',
        true,
        {
          allConsistent: reconciliation.allConsistent,
          recordsChecked: reconciliation.totalRecordsChecked,
        },
        req
      );

      res.json({
        reconciliation,
        branchScope: branchFilter || 'all_regional_branches',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. GET /api/branch-inventory/:branchId - Legacy scaffold backward-compatibility adapter
  app.get('/api/branch-inventory/:branchId', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin') {
      await logAuditEvent(
        user.uid,
        user.role,
        String(req.params.branchId || 'daet').toLowerCase().trim(),
        'unauthorized_legacy_inventory_access_blocked',
        'branch_inventory',
        null,
        false,
        { requestedBranch: req.params.branchId, userRole: user.role },
        req
      );
      res.status(403).json({ error: 'Access Denied: Legacy inventory adapter requires authorized staff role.' });
      return;
    }

    const branchId = String(req.params.branchId || '').toLowerCase().trim();

    if (user.role === 'branch_manager') {
      const assigned = (user.assignedBranchId || 'daet').toLowerCase().trim();
      if (branchId && branchId !== assigned) {
        await logAuditEvent(
          user.uid,
          user.role,
          branchId,
          'unauthorized_cross_branch_legacy_inventory_access_blocked',
          'branch_inventory',
          null,
          false,
          { requestedBranch: branchId, assignedBranch: assigned },
          req
        );
        res.status(403).json({ error: 'Access Denied: Branch managers cannot access inventory of other branches.' });
        return;
      }
    }

    res.setHeader('X-Deprecated', 'Superseded by /api/inventory in Phase 7');

    try {
      const { inventory } = await ensureInventorySeeded();
      const branchItems = inventory.filter((item) => item.branchId.toLowerCase() === branchId);
      const totalStock = branchItems.reduce((sum, item) => sum + item.activeStock, 0);

      res.json({
        branchId,
        stockCount: totalStock,
        isDeprecatedScaffold: true,
        recommendedEndpoint: '/api/inventory',
        lastUpdated: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- PHASE 7 MILESTONE 2: FEFO Expiry Routing & QC Filtering Reservation Endpoint ---
  app.post('/api/inventory/reservations', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin') {
      await logAuditEvent(
        user.uid,
        user.role,
        String(req.body?.branchId || 'daet').toLowerCase().trim(),
        'inventory_reservation_unauthorized_role_blocked',
        'inventory',
        null,
        false,
        { userRole: user.role },
        req
      );
      res.status(403).json({ error: 'Access Denied: Inventory reservation requires authorized staff role (branch_manager, regional_director, super_admin).' });
      return;
    }

    const { branchId, skuId, requestedQuantity } = req.body;

    if (!branchId || typeof branchId !== 'string') {
      res.status(400).json({ error: 'Missing or invalid branchId.' });
      return;
    }

    const normalizedBranch = branchId.toLowerCase().trim();
    if (!SUPPORTED_BRANCH_IDS.includes(normalizedBranch as any)) {
      res.status(400).json({ error: `Invalid branchId: '${branchId}'. Must be one of: ${SUPPORTED_BRANCH_IDS.join(', ')}` });
      return;
    }

    if (user.role === 'branch_manager') {
      const assigned = (user.assignedBranchId || 'daet').toLowerCase().trim();
      if (normalizedBranch !== assigned) {
        await logAuditEvent(
          user.uid,
          user.role,
          normalizedBranch,
          'inventory_reservation_unauthorized_branch_blocked',
          'inventory',
          null,
          false,
          { targetBranch: normalizedBranch, assignedBranch: assigned },
          req
        );
        res.status(403).json({ error: 'Access Denied: Branch managers cannot reserve inventory for other branches.' });
        return;
      }
    }

    if (!skuId || !ACTIVE_CONSUMER_SKUS.includes(skuId as any)) {
      res.status(400).json({ error: `Invalid skuId: '${skuId}'. Must be one of: ${ACTIVE_CONSUMER_SKUS.join(', ')}` });
      return;
    }

    const reqQty = Number(requestedQuantity);
    if (!Number.isInteger(reqQty) || reqQty <= 0) {
      res.status(400).json({ error: 'requestedQuantity must be a positive integer greater than zero.' });
      return;
    }

    try {
      await ensureInventorySeeded();
      const nowIso = new Date().toISOString();

      let reservationResult: any;

      await db.runTransaction(async (transaction: any) => {
        reservationResult = await performFefoReservationInternal(
          transaction,
          normalizedBranch,
          skuId,
          reqQty,
          nowIso
        );
      });

      await logAuditEvent(
        user.uid,
        user.role,
        normalizedBranch,
        'inventory_reservation_recorded',
        'inventory',
        `${normalizedBranch}_${skuId}`,
        true,
        {
          skuId,
          requestedQuantity: reqQty,
          allocations: reservationResult.allocations,
          remainingAvailable: reservationResult.remainingAvailableQuantity,
        },
        req
      );

      res.status(201).json(reservationResult);
    } catch (err: any) {
      if (err.message.startsWith('INSUFFICIENT_ELIGIBLE_STOCK:')) {
        res.status(400).json({ error: err.message.replace(/^INSUFFICIENT_ELIGIBLE_STOCK:\s*/, '') });
        return;
      }
      res.status(500).json({ error: err.message });
    }
  });

  // --- PHASE 7 MILESTONE 3: Batch Provenance & Recall Traversal Endpoints ---

  // 1. POST /api/orders/:orderId/fulfill - Authoritative fulfillment transition & provenance recording
  app.post('/api/orders/:orderId/fulfill', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin') {
      await logAuditEvent(
        user.uid,
        user.role,
        null,
        'unauthorized_order_fulfillment_blocked',
        'orders',
        String(req.params.orderId || ''),
        false,
        { userRole: user.role },
        req
      );
      res.status(403).json({ error: 'Access Denied: Order fulfillment requires authorized staff role.' });
      return;
    }

    const { orderId } = req.params;
    const strOrderId = String(orderId || '');
    if (!strOrderId) {
      res.status(400).json({ error: 'orderId is required.' });
      return;
    }

    try {
      const orderRef = db.collection('orders').doc(strOrderId);
      const orderSnap = await orderRef.get();
      if (!orderSnap.exists) {
        res.status(404).json({ error: `Order not found: ${strOrderId}` });
        return;
      }
      const orderData = orderSnap.data();
      const normalizedBranch = (orderData.branchId || 'daet').toLowerCase().trim();

      if (user.role === 'branch_manager') {
        const assigned = (user.assignedBranchId || 'daet').toLowerCase().trim();
        if (normalizedBranch !== assigned) {
          await logAuditEvent(
            user.uid,
            user.role,
            normalizedBranch,
            'unauthorized_cross_branch_order_fulfillment_blocked',
            'orders',
            strOrderId,
            false,
            { targetBranch: normalizedBranch, assignedBranch: assigned },
            req
          );
          res.status(403).json({ error: 'Access Denied: Branch managers cannot fulfill orders of other branches.' });
          return;
        }
      }

      // Phase 7 M6: B2B Stockist dispatch lockout protection
      if (orderData.stockistId) {
        const stockistRef = db.collection('b2b_stockists').doc(orderData.stockistId);
        const stockistSnap = await stockistRef.get();
        if (stockistSnap.exists) {
          const stockistData = stockistSnap.data();
          if (stockistData.status === 'locked' || stockistData.status === 'suspended') {
            await logAuditEvent(
              user.uid,
              user.role,
              normalizedBranch,
              'b2b_dispatch_blocked_account_locked',
              'orders',
              strOrderId,
              false,
              { stockistId: orderData.stockistId, status: stockistData.status },
              req
            );
            res.status(403).json({ error: `DISPATCH_BLOCKED: Stockist account ${orderData.stockistId} is locked. Dispatch not permitted.` });
            return;
          }
        }
      }

      // Idempotency check
      if (orderData.fulfillmentStatus === 'fulfilled' || orderData.fulfillmentStatus === 'completed') {
        res.status(200).json({ success: true, alreadyFulfilled: true, orderId: strOrderId, order: orderData });
        return;
      }

      const batchAllocations = orderData.batchAllocations || {};
      if (!batchAllocations || Object.keys(batchAllocations).length === 0) {
        res.status(400).json({ error: 'Order has no reserved batch allocations to fulfill.' });
        return;
      }

      const nowIso = new Date().toISOString();
      const createdAllocations: any[] = [];

      await db.runTransaction(async (transaction: any) => {
        const txOrderSnap = await transaction.get(orderRef);
        const txOrderData = txOrderSnap.data();
        if (txOrderData.fulfillmentStatus === 'fulfilled' || txOrderData.fulfillmentStatus === 'completed') {
          return;
        }

        const allocationsMap = txOrderData.batchAllocations || {};
        const affectedSkus = new Set<string>();
        const updatedBatches: any[] = [];

        for (const [skuId, allocList] of Object.entries(allocationsMap)) {
          if (!Array.isArray(allocList)) continue;
          affectedSkus.add(skuId);

          for (const alloc of allocList) {
            const batchId = alloc.batchId;
            const qtyReserved = Number(alloc.quantityReserved || alloc.allocatedQuantity) || 0;
            if (!batchId || qtyReserved <= 0) continue;

            const branchBatchDocId = `${normalizedBranch}_${batchId}`;
            const branchBatchRef = db.collection('branch_batch_inventory').doc(branchBatchDocId);
            const batchSnap = await transaction.get(branchBatchRef);

            if (!batchSnap.exists) {
              throw new Error(`BATCH_NOT_FOUND: Branch batch ${branchBatchDocId} not found.`);
            }
            const bData = batchSnap.data();
            const currentReserved = Number(bData.reservedQuantity) || 0;
            if (currentReserved < qtyReserved) {
              throw new Error(`INSUFFICIENT_RESERVED_STOCK: Batch ${branchBatchDocId} has reserved quantity ${currentReserved}, but fulfillment requires ${qtyReserved}.`);
            }
            const newReserved = currentReserved - qtyReserved;

            const updatedBatch = {
              ...bData,
              reservedQuantity: newReserved,
              updatedAt: nowIso,
            };
            transaction.set(branchBatchRef, updatedBatch);
            updatedBatches.push(updatedBatch);

            const allocationId = `BALLOC-${strOrderId}-${batchId}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
            const allocationRecord = {
              id: allocationId,
              orderId: strOrderId,
              batchId,
              skuId,
              branchId: normalizedBranch,
              customerUid: txOrderData.userId || txOrderData.customer?.uid || 'customer-anonymous',
              allocatedQuantity: qtyReserved,
              allocatedAt: nowIso,
            };
            const allocDocRef = db.collection('batch_allocations').doc(allocationId);
            transaction.set(allocDocRef, allocationRecord);
            createdAllocations.push(allocationRecord);
          }
        }

        const updatedOrder = {
          ...txOrderData,
          fulfillmentStatus: 'fulfilled',
          fulfilledAt: nowIso,
          updatedAt: nowIso,
        };
        transaction.set(orderRef, updatedOrder);

        for (const skuId of affectedSkus) {
          const batchesQuery = db.collection('branch_batch_inventory').where('branchId', '==', normalizedBranch).where('skuId', '==', skuId);
          const batchesSnap = await transaction.get(batchesQuery);
          const allBatches: any[] = [];
          if (batchesSnap && !batchesSnap.empty) {
            batchesSnap.forEach((d: any) => {
              const data = d.data();
              const modified = updatedBatches.find((ub) => ub.id === data.id);
              allBatches.push(modified || data);
            });
          }

          const updatedAggregate = computeAggregateInventoryFromBatches({
            branchBatches: allBatches,
            branchId: normalizedBranch,
            skuId,
            lastAdjustmentAt: nowIso,
          });

          const aggDocRef = db.collection('inventory').doc(`${normalizedBranch}_${skuId}`);
          transaction.set(aggDocRef, updatedAggregate);
        }
      });

      await logAuditEvent(
        user.uid,
        user.role,
        normalizedBranch,
        'order_fulfilled',
        'orders',
        strOrderId,
        true,
        { allocationsCount: createdAllocations.length },
        req
      );

      // C2: Enqueue transactional order dispatch notification
      const updatedOrderSnap = await orderRef.get();
      const fulfilledOrder = updatedOrderSnap.exists ? updatedOrderSnap.data() : orderData;
      await enqueueOrderDispatchedNotification(db, fulfilledOrder).catch((e) => {
        logger.warn('Failed to enqueue order dispatch notification', { error: e.message, orderId: strOrderId });
      });

      // C2: Check and trigger low-stock ROP alerts for affected SKUs
      const affectedSkuKeys = Object.keys(orderData.batchAllocations || {});
      for (const skuId of affectedSkuKeys) {
        await checkAndEnqueueLowStockAlert(db, normalizedBranch, skuId).catch((e) => {
          logger.warn('Failed to check inventory ROP alert after fulfillment', { error: e.message, skuId, branch: normalizedBranch });
        });
      }

      res.status(200).json({ success: true, orderId: strOrderId, allocationsCreated: createdAllocations });
    } catch (err: any) {
      res.status(500).json({ error: `Fulfillment failed: ${err.message}` });
    }
  });

  // --- C2: POST /api/orders/:orderId/deliver - Mark Order Delivered & Enqueue Notification ---
  app.post('/api/orders/:orderId/deliver', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin') {
      res.status(403).json({ error: 'Access Denied: Only staff can mark orders as delivered.' });
      return;
    }

    const { orderId } = req.params;
    const strOrderId = String(orderId || '');

    try {
      const orderRef = db.collection('orders').doc(strOrderId);
      const snap = await orderRef.get();
      if (!snap || !snap.exists) {
        res.status(404).json({ error: `Order not found: ${strOrderId}` });
        return;
      }

      const orderData = snap.data();
      const normalizedBranch = (orderData.branchId || 'daet').toLowerCase().trim();

      if (user.role === 'branch_manager') {
        const assigned = (user.assignedBranchId || 'daet').toLowerCase().trim();
        if (normalizedBranch !== assigned) {
          res.status(403).json({ error: 'Access Denied: Branch managers cannot update delivery for other branches.' });
          return;
        }
      }

      const nowIso = new Date().toISOString();
      const updatedOrder = {
        ...orderData,
        fulfillmentStatus: 'completed',
        deliveredAt: nowIso,
        updatedAt: nowIso,
      };

      await orderRef.set(updatedOrder, { merge: true });

      // Enqueue transactional delivery completed notification
      await enqueueOrderDeliveredNotification(db, updatedOrder).catch((e) => {
        logger.warn('Failed to enqueue order delivered notification', { error: e.message, orderId: strOrderId });
      });

      await logAuditEvent(
        user.uid,
        user.role,
        normalizedBranch,
        'order_delivered',
        'orders',
        strOrderId,
        true,
        {},
        req
      );

      res.status(200).json({ success: true, orderId: strOrderId, order: updatedOrder });
    } catch (err: any) {
      res.status(500).json({ error: `Failed to mark order delivered: ${err.message}` });
    }
  });

  // --- C2: POST /api/inventory/check-rop-alerts - Check Low-Stock ROP and Alert Branch Manager ---
  app.post('/api/inventory/check-rop-alerts', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin') {
      res.status(403).json({ error: 'Access Denied: Only staff can evaluate inventory ROP alerts.' });
      return;
    }

    const { branchId, skuId } = req.body || {};
    if (!branchId || !skuId) {
      res.status(400).json({ error: 'branchId and skuId are required.' });
      return;
    }

    const targetBranch = String(branchId).toLowerCase().trim();
    if (user.role === 'branch_manager') {
      const assigned = (user.assignedBranchId || 'daet').toLowerCase().trim();
      if (targetBranch !== assigned) {
        res.status(403).json({ error: 'Access Denied: Branch managers can only check inventory for their assigned branch.' });
        return;
      }
    }

    try {
      const result = await checkAndEnqueueLowStockAlert(db, targetBranch, String(skuId).trim());
      res.status(200).json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================================
  // --- PRIORITY C MILESTONE C3: PRIVACY CONSENT & MARKETING AUTOMATION ROUTES ---
  // ============================================================================

  // 1. GET /api/user/consent - Self-service Marketing Consent Retrieval
  app.get('/api/user/consent', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    try {
      const consent = await getUserMarketingConsent(db, user.uid);
      res.status(200).json({ success: true, consent });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. PATCH & POST /api/user/consent - Self-service Marketing Consent Update
  const handleUserConsentUpdate = async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { emailConsent, smsConsent, source = 'profile' } = req.body || {};

    try {
      const updatedConsent = await updateUserMarketingConsent(db, {
        userId: user.uid,
        email: user.email,
        emailConsent: typeof emailConsent === 'boolean' ? emailConsent : undefined,
        smsConsent: typeof smsConsent === 'boolean' ? smsConsent : undefined,
        source: String(source).trim(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string,
      });

      await logAuditEvent(
        user.uid,
        user.role,
        user.assignedBranchId || null,
        'marketing_consent_updated',
        'marketing_consents',
        user.uid,
        true,
        {
          marketingEmailConsent: updatedConsent.marketingEmailConsent,
          marketingSmsConsent: updatedConsent.marketingSmsConsent,
          source: updatedConsent.consentSource,
        },
        req
      );

      res.status(200).json({ success: true, consent: updatedConsent });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  app.patch('/api/user/consent', handleUserConsentUpdate);
  app.post('/api/user/consent', handleUserConsentUpdate);

  // 3. GET & POST /api/marketing/unsubscribe - Public 1-Click Unsubscribe Endpoint
  const handlePublicUnsubscribe = async (req: Request, res: Response): Promise<void> => {
    const tokenParam = (req.query.token || req.body?.token) ? String(req.query.token || req.body?.token).trim() : undefined;
    const channelParam = (req.query.channel || req.body?.channel) ? String(req.query.channel || req.body?.channel).trim().toLowerCase() : 'all';

    // Unsubscribe security: Require valid unsubscribe token to prevent arbitrary email harassment / enumeration
    if (!tokenParam) {
      res.status(400).json({ error: 'A valid unsubscribe token is required to unsubscribe from marketing communications.' });
      return;
    }

    try {
      let targetUserId: string | undefined;
      let targetEmail: string | undefined;

      // Query users with matching unsubscribeToken
      const userSnap = await db.collection('users').where('unsubscribeToken', '==', tokenParam).get();
      if (userSnap && !userSnap.empty) {
        const doc = userSnap.docs[0];
        const d = typeof doc.data === 'function' ? doc.data() : doc.data;
        targetUserId = d.uid;
        targetEmail = d.email;
      } else {
        // Check marketing_consents collection
        const consentSnap = await db.collection('marketing_consents').where('unsubscribeToken', '==', tokenParam).get();
        if (consentSnap && !consentSnap.empty) {
          const cDoc = consentSnap.docs[0];
          const c = typeof cDoc.data === 'function' ? cDoc.data() : cDoc.data;
          targetUserId = c.userId;
          targetEmail = c.email;
        }
      }

      if (!targetUserId && !targetEmail) {
        res.status(404).json({ error: 'No subscriber record found matching the provided unsubscribe token.' });
        return;
      }

      const emailConsent = (channelParam === 'sms') ? undefined : false;
      const smsConsent = (channelParam === 'email') ? undefined : false;

      const updatedRecord = await updateUserMarketingConsent(db, {
        userId: targetUserId,
        email: targetEmail,
        emailConsent,
        smsConsent,
        source: 'unsubscribe_link',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string,
      });

      await logAuditEvent(
        targetUserId || 'public_unregistered',
        'customer',
        null,
        'marketing_unsubscribed',
        'marketing_consents',
        targetUserId || targetEmail || 'unknown',
        true,
        {
          channel: channelParam,
          tokenPrefix: `${tokenParam.slice(0, 6)}...`,
          email: targetEmail,
        },
        req
      );

      // Do NOT return the unsubscribe token or internal client IP in public response
      res.status(200).json({
        success: true,
        message: 'You have been successfully unsubscribed from marketing communications.',
        consent: {
          marketingEmailConsent: updatedRecord.marketingEmailConsent,
          marketingSmsConsent: updatedRecord.marketingSmsConsent,
          consentUpdatedAt: updatedRecord.consentUpdatedAt,
          consentSource: updatedRecord.consentSource,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  app.get('/api/marketing/unsubscribe', strictRateLimiter, handlePublicUnsubscribe);
  app.post('/api/marketing/unsubscribe', strictRateLimiter, handlePublicUnsubscribe);

  // 4. GET /api/user/export-data - Authenticated DSAR Data Export (DPA 2012 / GDPR)
  app.get('/api/user/export-data', standardRateLimiter, async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    try {
      const [userSnap, consentSnap, ordersSnap, ticketsSnap, apptsSnap] = await Promise.all([
        db.collection('users').doc(user.uid).get().catch(() => ({ exists: false })),
        db.collection('marketing_consents').doc(user.uid).get().catch(() => ({ exists: false })),
        db.collection('orders').where('userId', '==', user.uid).get().catch(() => ({ docs: [], empty: true })),
        db.collection('support_tickets').where('userId', '==', user.uid).get().catch(() => ({ docs: [], empty: true })),
        db.collection('consultation_appointments').where('userId', '==', user.uid).get().catch(() => ({ docs: [], empty: true })),
      ]);

      const extractDocs = (snap: any) => (!snap || snap.empty ? [] : (snap.docs || []).map((d: any) => typeof d.data === 'function' ? d.data() : d.data));

      const exportPackage = {
        exportRequestedAt: new Date().toISOString(),
        user: userSnap.exists ? userSnap.data() : { uid: user.uid, email: user.email, role: user.role },
        marketingConsent: consentSnap.exists ? consentSnap.data() : null,
        orders: extractDocs(ordersSnap),
        supportTickets: extractDocs(ticketsSnap),
        consultationAppointments: extractDocs(apptsSnap),
      };

      await logAuditEvent(
        user.uid,
        user.role,
        user.assignedBranchId || null,
        'user_data_exported',
        'users',
        user.uid,
        true,
        { exportedSections: Object.keys(exportPackage) },
        req
      );

      res.status(200).json({ success: true, exportPackage });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. DELETE /api/user/account - Authenticated Account Deletion & PII Anonymization / Purge
  app.delete('/api/user/account', standardRateLimiter, async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    try {
      const nowIso = new Date().toISOString();
      const userRef = db.collection('users').doc(user.uid);
      const userSnap = await userRef.get();
      if (userSnap && userSnap.exists) {
        await userRef.set({
          firstName: '[DELETED]',
          lastName: '[DELETED]',
          email: `deleted_${user.uid}@anonymized.invalid`,
          mobileNumber: '[DELETED]',
          isAnonymized: true,
          anonymizedAt: nowIso,
        }, { merge: true });
      }

      const consentRef = db.collection('marketing_consents').doc(user.uid);
      const consentSnap = await consentRef.get();
      if (consentSnap && consentSnap.exists) {
        await consentRef.set({
          marketingEmailConsent: false,
          marketingSmsConsent: false,
          consentUpdatedAt: nowIso,
          consentSource: 'account_deletion',
        }, { merge: true });
      }

      await logAuditEvent(
        user.uid,
        user.role,
        user.assignedBranchId || null,
        'user_account_deleted_and_anonymized',
        'users',
        user.uid,
        true,
        { deletedAt: nowIso },
        req
      );

      res.status(200).json({
        success: true,
        message: 'User account successfully anonymized and personal data purged in compliance with DPA 2012 / GDPR.',
        anonymizedAt: nowIso,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. GET /api/marketing/campaigns - List Marketing Campaigns (Staff Only)
  app.get('/api/marketing/campaigns', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const isStaff = user.role === 'branch_manager' || user.role.startsWith('branch_manager') || user.role === 'regional_director' || user.role === 'super_admin';
    if (!isStaff) {
      res.status(403).json({ error: 'Access Denied: Only staff can manage marketing campaigns.' });
      return;
    }

    try {
      const snap = await db.collection('marketing_campaigns').get();
      const campaigns: MarketingCampaign[] = [];

      if (snap && !snap.empty) {
        const docs = snap.docs || [];
        for (const d of docs) {
          const c: MarketingCampaign = typeof d.data === 'function' ? d.data() : d.data;
          if (user.role === 'branch_manager' || user.role.startsWith('branch_manager')) {
            const assigned = (user.assignedBranchId || (user.role.includes('_') ? user.role.split('_')[2] : 'daet')).toLowerCase().trim();
            if (c.branchId && c.branchId !== 'all' && c.branchId !== assigned) {
              continue; // Exclude other branches
            }
          }
          campaigns.push(c);
        }
      }

      res.status(200).json({ success: true, campaigns });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. GET /api/marketing/campaigns/:campaignId - Get Campaign Details (Staff Only)
  app.get('/api/marketing/campaigns/:campaignId', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const isStaff = user.role === 'branch_manager' || user.role.startsWith('branch_manager') || user.role === 'regional_director' || user.role === 'super_admin';
    if (!isStaff) {
      res.status(403).json({ error: 'Access Denied: Only staff can view marketing campaigns.' });
      return;
    }

    const { campaignId } = req.params;
    const strCampaignId = String(campaignId || '');
    try {
      const doc = await db.collection('marketing_campaigns').doc(strCampaignId).get();
      if (!doc || !doc.exists) {
        res.status(404).json({ error: `Campaign not found: ${strCampaignId}` });
        return;
      }

      const campaign: MarketingCampaign = typeof doc.data === 'function' ? doc.data() : doc.data;
      if (user.role === 'branch_manager' || user.role.startsWith('branch_manager')) {
        const assigned = (user.assignedBranchId || (user.role.includes('_') ? user.role.split('_')[2] : 'daet')).toLowerCase().trim();
        if (campaign.branchId && campaign.branchId !== 'all' && campaign.branchId !== assigned) {
          res.status(403).json({ error: 'Access Denied: Branch managers cannot access campaigns for other branches.' });
          return;
        }
      }

      res.status(200).json({ success: true, campaign });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. POST /api/marketing/campaigns - Create Marketing Campaign (Staff Only)
  app.post('/api/marketing/campaigns', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const isStaff = user.role === 'branch_manager' || user.role.startsWith('branch_manager') || user.role === 'regional_director' || user.role === 'super_admin';
    if (!isStaff) {
      res.status(403).json({ error: 'Access Denied: Only staff can create marketing campaigns.' });
      return;
    }

    const { title, description, channel = 'email', templateId, subject, body, targetCohort = 'all', branchId, scheduledAt } = req.body || {};
    if (!title || !subject || !body) {
      res.status(400).json({ error: 'title, subject, and body are required to create a campaign.' });
      return;
    }

    if (channel !== 'email' && channel !== 'sms') {
      res.status(400).json({ error: "channel must be 'email' or 'sms'." });
      return;
    }

    let resolvedBranch = branchId || 'all';
    if (user.role === 'branch_manager' || user.role.startsWith('branch_manager')) {
      resolvedBranch = (user.assignedBranchId || (user.role.includes('_') ? user.role.split('_')[2] : 'daet')).toLowerCase().trim();
    }

    try {
      const campaign = await createMarketingCampaign(db, user, {
        title,
        description,
        channel: channel as MarketingCampaignChannel,
        templateId,
        subject,
        body,
        targetCohort,
        branchId: resolvedBranch,
        scheduledAt,
      });

      await logAuditEvent(
        user.uid,
        user.role,
        resolvedBranch === 'all' ? null : resolvedBranch,
        'marketing_campaign_created',
        'marketing_campaigns',
        campaign.id,
        true,
        { title, channel, targetCohort, branchId: resolvedBranch },
        req
      );

      res.status(201).json({ success: true, campaign });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. PATCH /api/marketing/campaigns/:campaignId - Update Campaign (Staff Only)
  app.patch('/api/marketing/campaigns/:campaignId', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const isStaff = user.role === 'branch_manager' || user.role.startsWith('branch_manager') || user.role === 'regional_director' || user.role === 'super_admin';
    if (!isStaff) {
      res.status(403).json({ error: 'Access Denied: Only staff can update marketing campaigns.' });
      return;
    }

    const { campaignId } = req.params;
    const strCampaignId = String(campaignId || '');
    try {
      const docRef = db.collection('marketing_campaigns').doc(strCampaignId);
      const doc = await docRef.get();
      if (!doc || !doc.exists) {
        res.status(404).json({ error: `Campaign not found: ${strCampaignId}` });
        return;
      }

      const current: MarketingCampaign = typeof doc.data === 'function' ? doc.data() : doc.data;
      if (user.role === 'branch_manager' || user.role.startsWith('branch_manager')) {
        const assigned = (user.assignedBranchId || (user.role.includes('_') ? user.role.split('_')[2] : 'daet')).toLowerCase().trim();
        if (current.branchId && current.branchId !== 'all' && current.branchId !== assigned) {
          res.status(403).json({ error: 'Access Denied: Branch managers cannot modify campaigns for other branches.' });
          return;
        }
      }

      if (current.status === 'completed') {
        res.status(400).json({ error: 'Cannot modify a completed marketing campaign.' });
        return;
      }

      const { title, description, channel, templateId, subject, body, targetCohort, scheduledAt, status } = req.body || {};
      const nowIso = new Date().toISOString();
      const updated: MarketingCampaign = {
        ...current,
        title: title !== undefined ? String(title).trim() : current.title,
        description: description !== undefined ? String(description).trim() : current.description,
        channel: channel === 'sms' ? 'sms' : (channel === 'email' ? 'email' : current.channel),
        templateId: templateId !== undefined ? String(templateId).trim() : current.templateId,
        subject: subject !== undefined ? String(subject).trim() : current.subject,
        body: body !== undefined ? String(body).trim() : current.body,
        targetCohort: targetCohort !== undefined ? String(targetCohort).trim() : current.targetCohort,
        scheduledAt: scheduledAt !== undefined ? scheduledAt : current.scheduledAt,
        status: status !== undefined ? status : current.status,
        updatedAt: nowIso,
      };

      await docRef.set(updated, { merge: true });

      const resolvedBranchLog = (current.branchId && current.branchId !== 'all') ? String(current.branchId) : null;
      await logAuditEvent(
        user.uid,
        user.role,
        resolvedBranchLog,
        'marketing_campaign_updated',
        'marketing_campaigns',
        strCampaignId,
        true,
        { patch: req.body },
        req
      );

      res.status(200).json({ success: true, campaign: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8. DELETE /api/marketing/campaigns/:campaignId - Delete Campaign (Staff Only)
  app.delete('/api/marketing/campaigns/:campaignId', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const isStaff = user.role === 'branch_manager' || user.role.startsWith('branch_manager') || user.role === 'regional_director' || user.role === 'super_admin';
    if (!isStaff) {
      res.status(403).json({ error: 'Access Denied: Only staff can delete marketing campaigns.' });
      return;
    }

    const { campaignId } = req.params;
    const strCampaignId = String(campaignId || '');
    try {
      const docRef = db.collection('marketing_campaigns').doc(strCampaignId);
      const doc = await docRef.get();
      if (!doc || !doc.exists) {
        res.status(404).json({ error: `Campaign not found: ${strCampaignId}` });
        return;
      }

      const current: MarketingCampaign = typeof doc.data === 'function' ? doc.data() : doc.data;
      if (user.role === 'branch_manager' || user.role.startsWith('branch_manager')) {
        const assigned = (user.assignedBranchId || (user.role.includes('_') ? user.role.split('_')[2] : 'daet')).toLowerCase().trim();
        if (current.branchId && current.branchId !== 'all' && current.branchId !== assigned) {
          res.status(403).json({ error: 'Access Denied: Branch managers cannot delete campaigns for other branches.' });
          return;
        }
      }

      await docRef.delete();

      const resolvedBranchLog = (current.branchId && current.branchId !== 'all') ? String(current.branchId) : null;
      await logAuditEvent(
        user.uid,
        user.role,
        resolvedBranchLog,
        'marketing_campaign_deleted',
        'marketing_campaigns',
        strCampaignId,
        true,
        {},
        req
      );

      res.status(200).json({ success: true, message: `Campaign ${strCampaignId} deleted.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 9. POST /api/marketing/campaigns/:campaignId/dispatch - Execute Campaign with Mandatory Privacy Consent
  app.post('/api/marketing/campaigns/:campaignId/dispatch', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const isStaff = user.role === 'branch_manager' || user.role.startsWith('branch_manager') || user.role === 'regional_director' || user.role === 'super_admin';
    if (!isStaff) {
      res.status(403).json({ error: 'Access Denied: Only staff can dispatch marketing campaigns.' });
      return;
    }

    const { campaignId } = req.params;
    const strCampaignId = String(campaignId || '');
    const { batchSize } = req.body || {};

    try {
      const result = await dispatchMarketingCampaign(db, user, strCampaignId, { batchSize });

      const resolvedBranchLog = (result.campaign.branchId && result.campaign.branchId !== 'all') ? String(result.campaign.branchId) : null;
      await logAuditEvent(
        user.uid,
        user.role,
        resolvedBranchLog,
        'marketing_campaign_dispatched',
        'marketing_campaigns',
        strCampaignId,
        true,
        {
          channel: result.campaign.channel,
          targetCohort: result.campaign.targetCohort,
          totalTargeted: result.totalTargeted,
          totalEligible: result.totalEligible,
          totalExcludedConsent: result.totalExcludedConsent,
          enqueuedCount: result.enqueuedCount,
        },
        req
      );

      res.status(200).json({ success: true, ...result });
    } catch (err: any) {
      if (err.message.includes('PERMISSION_DENIED')) {
        res.status(403).json({ error: err.message });
      } else if (err.message.includes('not found')) {
        res.status(404).json({ error: err.message });
      } else {
        res.status(500).json({ error: err.message });
      }
    }
  });

  // ============================================================================
  // PRIORITY C — MILESTONE C4: OPERATIONAL ANALYTICS & EXPORT ENGINE ENDPOINTS
  // ============================================================================

  // 1. GET /api/analytics/operational-kpis - Unified Operational Analytics KPIs
  app.get('/api/analytics/operational-kpis', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const isStaff = user.role === 'branch_manager' || user.role.startsWith('branch_manager') || user.role === 'regional_director' || user.role === 'super_admin';
    if (!isStaff) {
      res.status(403).json({ error: 'Access Denied: Only staff can access operational analytics.' });
      return;
    }

    const { startDate, endDate, branchId } = req.query;

    try {
      const kpis = await calculateOperationalKpis(db, user, {
        startDate: startDate ? String(startDate) : undefined,
        endDate: endDate ? String(endDate) : undefined,
        branchId: branchId ? String(branchId) : undefined,
      });

      await logAuditEvent(
        user.uid,
        user.role,
        kpis.branchId === 'all' ? null : kpis.branchId,
        'operational_kpis_viewed',
        'analytics',
        null,
        true,
        {
          startDate: kpis.dateRange.startDate,
          endDate: kpis.dateRange.endDate,
          branchId: kpis.branchId,
        },
        req
      );

      res.status(200).json({ success: true, kpis });
    } catch (err: any) {
      if (err.message.includes('PERMISSION_DENIED')) {
        res.status(403).json({ error: err.message });
      } else {
        res.status(500).json({ error: err.message });
      }
    }
  });

  // 2. GET /api/analytics/export - Export Operational KPIs (CSV & JSON)
  app.get('/api/analytics/export', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const isStaff = user.role === 'branch_manager' || user.role.startsWith('branch_manager') || user.role === 'regional_director' || user.role === 'super_admin';
    if (!isStaff) {
      res.status(403).json({ error: 'Access Denied: Only staff can export operational analytics.' });
      return;
    }

    const { format = 'json', startDate, endDate, branchId } = req.query;
    const exportFormat = String(format).toLowerCase().trim();

    try {
      const kpis = await calculateOperationalKpis(db, user, {
        startDate: startDate ? String(startDate) : undefined,
        endDate: endDate ? String(endDate) : undefined,
        branchId: branchId ? String(branchId) : undefined,
      });

      await logAuditEvent(
        user.uid,
        user.role,
        kpis.branchId === 'all' ? null : kpis.branchId,
        'operational_kpis_exported',
        'analytics',
        null,
        true,
        {
          format: exportFormat,
          startDate: kpis.dateRange.startDate,
          endDate: kpis.dateRange.endDate,
          branchId: kpis.branchId,
        },
        req
      );

      if (exportFormat === 'csv') {
        const csvContent = generateOperationalKpisCsv(kpis);
        const filename = `operational-kpis-${kpis.branchId}-${kpis.dateRange.startDate || 'all'}-${kpis.dateRange.endDate || 'all'}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(200).send(csvContent);
      } else {
        res.status(200).json({
          success: true,
          metadata: {
            scope: kpis.branchId,
            dateRange: kpis.dateRange,
            generatedAt: kpis.generatedAt,
            exportedBy: user.email || user.uid,
          },
          kpis,
        });
      }
    } catch (err: any) {
      if (err.message.includes('PERMISSION_DENIED')) {
        res.status(403).json({ error: err.message });
      } else {
        res.status(500).json({ error: err.message });
      }
    }
  });

  // 2. GET /api/inventory/recall - Batch recall traversal by batchId or batchNumber
  app.get('/api/inventory/recall', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin') {
      await logAuditEvent(
        user.uid,
        user.role,
        null,
        'unauthorized_batch_recall_blocked',
        'batch_allocations',
        null,
        false,
        { userRole: user.role },
        req
      );
      res.status(403).json({ error: 'Access Denied: Batch recall traversal requires authorized staff role.' });
      return;
    }

    const batchIdParam = req.query.batchId ? String(req.query.batchId).trim() : null;
    const batchNumberParam = req.query.batchNumber ? String(req.query.batchNumber).trim() : null;

    if (!batchIdParam && !batchNumberParam) {
      res.status(400).json({ error: 'Either batchId or batchNumber query parameter is required for recall traversal.' });
      return;
    }

    try {
      let targetBatchId = batchIdParam;

      if (!targetBatchId && batchNumberParam) {
        const pbSnap = await db.collection('product_batches').where('batchNumber', '==', batchNumberParam).get();
        if (!pbSnap.empty) {
          targetBatchId = pbSnap.docs[0].id;
        } else {
          const allPbSnap = await db.collection('product_batches').get();
          if (!allPbSnap.empty) {
            allPbSnap.forEach((d: any) => {
              if (d.data().batchNumber === batchNumberParam) {
                targetBatchId = d.id;
              }
            });
          }
        }
      }

      const queryBatchId = targetBatchId || batchNumberParam;

      const allocSnap = await db.collection('batch_allocations').where('batchId', '==', queryBatchId).get();
      const allocations: any[] = [];
      if (!allocSnap.empty) {
        allocSnap.forEach((d: any) => allocations.push(d.data()));
      }

      if (allocations.length === 0 && batchNumberParam) {
        const allAllocSnap = await db.collection('batch_allocations').get();
        if (!allAllocSnap.empty) {
          allAllocSnap.forEach((d: any) => {
            const data = d.data();
            if (data.batchId === batchNumberParam || data.batchNumber === batchNumberParam) {
              allocations.push(data);
            }
          });
        }
      }

      if (user.role === 'branch_manager') {
        const assigned = (user.assignedBranchId || 'daet').toLowerCase().trim();
        const unauthorized = allocations.some((a) => (a.branchId || '').toLowerCase().trim() !== assigned);
        if (unauthorized || (allocations.length === 0 && req.query.branchId && String(req.query.branchId).toLowerCase().trim() !== assigned)) {
          await logAuditEvent(
            user.uid,
            user.role,
            assigned,
            'unauthorized_cross_branch_batch_recall_blocked',
            'batch_allocations',
            queryBatchId,
            false,
            { queryBatchId, assignedBranch: assigned },
            req
          );
          res.status(403).json({ error: 'Access Denied: Branch managers cannot access batch recall records of other branches.' });
          return;
        }
      }

      const affectedOrders = allocations.map((a) => ({
        orderId: a.orderId,
        customerUid: a.customerUid,
        branchId: a.branchId,
        allocatedQuantity: a.allocatedQuantity,
        fulfillmentTimestamp: a.allocatedAt,
        skuId: a.skuId,
        batchId: a.batchId,
      }));

      await logAuditEvent(
        user.uid,
        user.role,
        user.role === 'branch_manager' ? (user.assignedBranchId || null) : null,
        'batch_recall_queried',
        'batch_allocations',
        queryBatchId,
        true,
        { queryBatchId, affectedRecordsCount: affectedOrders.length },
        req
      );

      res.status(200).json({
        batchId: queryBatchId,
        batchNumber: batchNumberParam,
        affectedCount: affectedOrders.length,
        affectedRecords: affectedOrders,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- PHASE 7 MILESTONE 4: Dual-Custody Stock Transfers & Conservation of Stock ---

  // 1. POST /api/inventory/transfers - Initiate Stock Transfer
  app.post('/api/inventory/transfers', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin') {
      await logAuditEvent(
        user.uid,
        user.role,
        String(req.body?.sourceBranchId || ''),
        'stock_transfer_unauthorized_role_blocked',
        'stock_transfers',
        null,
        false,
        { userRole: user.role },
        req
      );
      res.status(403).json({ error: 'Access Denied: Stock transfer initiation requires authorized staff role.' });
      return;
    }

    const { sourceBranchId, destinationBranchId, skuId, batchId, quantity, idempotencyKey } = req.body;

    if (!sourceBranchId || !destinationBranchId || typeof sourceBranchId !== 'string' || typeof destinationBranchId !== 'string') {
      res.status(400).json({ error: 'sourceBranchId and destinationBranchId are required strings.' });
      return;
    }

    const srcBranch = sourceBranchId.toLowerCase().trim();
    const destBranch = destinationBranchId.toLowerCase().trim();

    if (!SUPPORTED_BRANCH_IDS.includes(srcBranch as any) || !SUPPORTED_BRANCH_IDS.includes(destBranch as any)) {
      res.status(400).json({ error: 'Invalid source or destination branchId.' });
      return;
    }

    if (srcBranch === destBranch) {
      res.status(400).json({ error: 'Source branch and destination branch cannot be identical.' });
      return;
    }

    if (user.role === 'branch_manager') {
      const assigned = (user.assignedBranchId || 'daet').toLowerCase().trim();
      if (srcBranch !== assigned) {
        await logAuditEvent(
          user.uid,
          user.role,
          srcBranch,
          'stock_transfer_unauthorized_source_branch_blocked',
          'stock_transfers',
          null,
          false,
          { sourceBranch: srcBranch, assignedBranch: assigned },
          req
        );
        res.status(403).json({ error: 'Access Denied: Branch managers can only initiate transfers from their assigned branch.' });
        return;
      }
    }

    if (!skuId || !ACTIVE_CONSUMER_SKUS.includes(skuId as any)) {
      res.status(400).json({ error: `Invalid skuId: '${skuId}'.` });
      return;
    }

    if (!batchId || typeof batchId !== 'string' || !batchId.trim()) {
      res.status(400).json({ error: 'batchId is required.' });
      return;
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      res.status(400).json({ error: 'quantity must be a positive integer greater than zero.' });
      return;
    }

    const cleanIdempotencyKey = idempotencyKey && typeof idempotencyKey === 'string' && idempotencyKey.trim() ? idempotencyKey.trim() : null;
    if (!cleanIdempotencyKey) {
      res.status(400).json({ error: 'idempotencyKey is required.' });
      return;
    }

    try {
      await ensureInventorySeeded();
      const nowIso = new Date().toISOString();
      const transferId = `TRF-${Date.now().toString().slice(-6)}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const transferRef = db.collection('stock_transfers').doc(transferId);
      const branchBatchDocId = `${srcBranch}_${batchId.trim()}`;
      const branchBatchRef = db.collection('branch_batch_inventory').doc(branchBatchDocId);
      const aggDocRef = db.collection('inventory').doc(`${srcBranch}_${skuId}`);

      let transferRecord: any;

      await db.runTransaction(async (transaction: any) => {
        if (cleanIdempotencyKey) {
          const existingQuery = db.collection('stock_transfers').where('idempotencyKey', '==', cleanIdempotencyKey);
          const existingSnap = await transaction.get(existingQuery);
          if (!existingSnap.empty) {
            transferRecord = existingSnap.docs[0].data();
            return;
          }
        }

        const batchSnap = await transaction.get(branchBatchRef);
        if (!batchSnap.exists) {
          throw new Error(`BATCH_NOT_FOUND: Source batch ${branchBatchDocId} not found.`);
        }
        const bData = batchSnap.data();
        if (bData.skuId !== skuId) {
          throw new Error(`SKU_MISMATCH: Batch ${batchId} does not belong to SKU ${skuId}.`);
        }

        const currentAvail = Number(bData.availableQuantity) || 0;
        if (currentAvail < qty) {
          throw new Error(`INSUFFICIENT_STOCK: Source batch has ${currentAvail} available units, requested ${qty}.`);
        }

        const newAvail = currentAvail - qty;
        const updatedBatch = {
          ...bData,
          availableQuantity: newAvail,
          updatedAt: nowIso,
        };

        const branchBatchesQuery = db.collection('branch_batch_inventory').where('branchId', '==', srcBranch).where('skuId', '==', skuId);
        const branchBatchesSnap = await transaction.get(branchBatchesQuery);
        const branchBatches: any[] = [];
        if (branchBatchesSnap && !branchBatchesSnap.empty) {
          branchBatchesSnap.forEach((d: any) => {
            if (d.id !== branchBatchDocId) branchBatches.push(d.data());
          });
        }
        branchBatches.push(updatedBatch);

        const updatedAggregate = computeAggregateInventoryFromBatches({
          branchBatches,
          branchId: srcBranch,
          skuId,
          lastAdjustmentAt: nowIso,
        });

        transferRecord = {
          id: transferId,
          sourceBranchId: srcBranch,
          destinationBranchId: destBranch,
          skuId,
          batchId: batchId.trim(),
          shippedQuantity: qty,
          transitQuantity: qty,
          status: 'IN_TRANSIT',
          idempotencyKey: cleanIdempotencyKey,
          initiatedByUid: user.uid,
          initiatedByName: user.email ? user.email.split('@')[0] : 'Staff',
          initiatedAt: nowIso,
          updatedAt: nowIso,
        };

        transaction.set(branchBatchRef, updatedBatch);
        transaction.set(aggDocRef, updatedAggregate);
        transaction.set(transferRef, transferRecord);
      });

      await logAuditEvent(
        user.uid,
        user.role,
        srcBranch,
        'stock_transfer_initiated',
        'stock_transfers',
        transferRecord.id,
        true,
        {
          sourceBranchId: srcBranch,
          destinationBranchId: destBranch,
          skuId,
          batchId: batchId.trim(),
          shippedQuantity: qty,
        },
        req
      );

      res.status(201).json({ success: true, transfer: transferRecord });
    } catch (err: any) {
      if (err.message.startsWith('INSUFFICIENT_STOCK:') || err.message.startsWith('BATCH_NOT_FOUND:') || err.message.startsWith('SKU_MISMATCH:')) {
        res.status(400).json({ error: err.message.replace(/^(INSUFFICIENT_STOCK|BATCH_NOT_FOUND|SKU_MISMATCH):\s*/, '') });
        return;
      }
      res.status(500).json({ error: `Transfer initiation failed: ${err.message}` });
    }
  });

  // 2. GET /api/inventory/transfers - Query Stock Transfers with Branch Scoping & IDOR Protection
  app.get('/api/inventory/transfers', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin') {
      res.status(403).json({ error: 'Access Denied: Viewing stock transfers requires authorized staff role.' });
      return;
    }

    try {
      const snap = await db.collection('stock_transfers').get();
      const transfers: any[] = [];
      if (snap && !snap.empty) {
        snap.forEach((d: any) => transfers.push(d.data()));
      }

      let filtered = transfers;
      if (user.role === 'branch_manager') {
        const assigned = (user.assignedBranchId || 'daet').toLowerCase().trim();
        filtered = transfers.filter((t) => t.sourceBranchId === assigned || t.destinationBranchId === assigned);
      }

      res.json({ transfers: filtered, count: filtered.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. GET /api/inventory/transfers/:transferId - Get Single Transfer Record
  app.get('/api/inventory/transfers/:transferId', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin') {
      res.status(403).json({ error: 'Access Denied: Viewing stock transfer requires authorized staff role.' });
      return;
    }

    const { transferId } = req.params;
    try {
      const doc = await db.collection('stock_transfers').doc(transferId).get();
      if (!doc.exists) {
        res.status(404).json({ error: `Transfer not found: ${transferId}` });
        return;
      }

      const transfer = doc.data();
      if (user.role === 'branch_manager') {
        const assigned = (user.assignedBranchId || 'daet').toLowerCase().trim();
        if (transfer.sourceBranchId !== assigned && transfer.destinationBranchId !== assigned) {
          res.status(403).json({ error: 'Access Denied: Branch managers can only view transfers involving their assigned branch.' });
          return;
        }
      }

      res.json({ transfer });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. POST /api/inventory/transfers/:transferId/receive - Receive Stock Transfer (Full or Partial)
  app.post('/api/inventory/transfers/:transferId/receive', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin') {
      await logAuditEvent(
        user.uid,
        user.role,
        null,
        'stock_transfer_receive_unauthorized_role_blocked',
        'stock_transfers',
        req.params.transferId ? String(req.params.transferId) : null,
        false,
        { userRole: user.role },
        req
      );
      res.status(403).json({ error: 'Access Denied: Receiving stock transfers requires authorized staff role.' });
      return;
    }

    const { transferId } = req.params;
    const { receivedQuantity, condition } = req.body;

    try {
      const transferRef = db.collection('stock_transfers').doc(transferId);
      const transferSnap = await transferRef.get();
      if (!transferSnap.exists) {
        res.status(404).json({ error: `Transfer not found: ${transferId}` });
        return;
      }

      const transfer = transferSnap.data();
      const destBranch = transfer.destinationBranchId;

      if (user.role === 'branch_manager') {
        const assigned = (user.assignedBranchId || 'daet').toLowerCase().trim();
        if (destBranch !== assigned) {
          await logAuditEvent(
            user.uid,
            user.role,
            destBranch,
            'stock_transfer_receive_unauthorized_branch_blocked',
            'stock_transfers',
            String(transferId),
            false,
            { destinationBranch: destBranch, assignedBranch: assigned },
            req
          );
          res.status(403).json({ error: 'Access Denied: Branch managers can only receive transfers into their assigned branch.' });
          return;
        }
      }

      if (transfer.status !== 'IN_TRANSIT') {
        res.status(400).json({ error: `Invalid state transition: Transfer is in status '${transfer.status}', expected 'IN_TRANSIT'.` });
        return;
      }

      const shippedQty = Number(transfer.shippedQuantity) || 0;
      let receivedQty = shippedQty;
      if (receivedQuantity !== undefined && receivedQuantity !== null) {
        const parsed = Number(receivedQuantity);
        if (!Number.isInteger(parsed) || parsed < 0) {
          res.status(400).json({ error: 'receivedQuantity must be a non-negative integer.' });
          return;
        }
        if (parsed > shippedQty) {
          res.status(400).json({ error: `Over-receipt rejected: receivedQuantity (${parsed}) cannot exceed shippedQuantity (${shippedQty}).` });
          return;
        }
        receivedQty = parsed;
      }

      const diff = shippedQty - receivedQty;
      let newStatus = 'RECEIVED_FULL';
      if (condition === 'rejected_damaged' || (receivedQuantity !== undefined && receivedQty === 0 && condition !== 'partial')) {
        newStatus = 'REJECTED_DAMAGED';
        receivedQty = 0;
      } else if (diff > 0) {
        newStatus = 'RECEIVED_PARTIAL';
      }

      const nowIso = new Date().toISOString();
      const destBatchDocId = `${destBranch}_${transfer.batchId}`;
      const destBatchRef = db.collection('branch_batch_inventory').doc(destBatchDocId);
      const destAggRef = db.collection('inventory').doc(`${destBranch}_${transfer.skuId}`);

      let updatedTransfer: any;

      await db.runTransaction(async (transaction: any) => {
        const txTransferSnap = await transaction.get(transferRef);
        const txTransfer = txTransferSnap.data();
        if (txTransfer.status !== 'IN_TRANSIT') {
          throw new Error('TRANSFER_NOT_IN_TRANSIT');
        }

        const destBatchSnap = await transaction.get(destBatchRef);
        let destBatchData: any = null;
        if (!destBatchSnap.exists) {
          const pbRef = db.collection('product_batches').doc(transfer.batchId);
          const pbSnap = await transaction.get(pbRef);
          if (!pbSnap || !pbSnap.exists) {
            throw new Error(`PRODUCT_BATCH_NOT_FOUND: Authoritative product batch ${transfer.batchId} not found.`);
          }
          const pbData = pbSnap.data();
          if (!pbData || !pbData.expiryDate || typeof pbData.expiryDate !== 'string') {
            throw new Error(`INVALID_PRODUCT_BATCH_EXPIRY: Authoritative product batch ${transfer.batchId} has no valid expiryDate.`);
          }

          destBatchData = {
            id: destBatchDocId,
            branchId: destBranch,
            batchId: transfer.batchId,
            skuId: transfer.skuId,
            availableQuantity: receivedQty,
            reservedQuantity: 0,
            damagedQuantity: diff > 0 ? diff : 0,
            expiryDate: pbData.expiryDate,
            updatedAt: nowIso,
          };
        } else {
          const bData = destBatchSnap.data();
          destBatchData = {
            ...bData,
            availableQuantity: (Number(bData.availableQuantity) || 0) + receivedQty,
            damagedQuantity: (Number(bData.damagedQuantity) || 0) + (diff > 0 ? diff : 0),
            updatedAt: nowIso,
          };
        }
        transaction.set(destBatchRef, destBatchData);

        const destBatchesQuery = db.collection('branch_batch_inventory').where('branchId', '==', destBranch).where('skuId', '==', transfer.skuId);
        const destBatchesSnap = await transaction.get(destBatchesQuery);
        const destBatches: any[] = [];
        let foundExistingBatch = false;
        if (destBatchesSnap && !destBatchesSnap.empty) {
          destBatchesSnap.forEach((d: any) => {
            if (d.id === destBatchDocId) {
              foundExistingBatch = true;
              destBatches.push(destBatchData);
            } else {
              destBatches.push(d.data());
            }
          });
        }
        if (!foundExistingBatch && destBatchData) {
          destBatches.push(destBatchData);
        }

        const updatedAggregate = computeAggregateInventoryFromBatches({
          branchBatches: destBatches,
          branchId: destBranch,
          skuId: transfer.skuId,
          lastAdjustmentAt: nowIso,
        });

        updatedTransfer = {
          ...txTransfer,
          status: newStatus,
          receivedQuantity: receivedQty,
          transitQuantity: 0,
          auditedLossQuantity: diff,
          receivedAt: nowIso,
          updatedAt: nowIso,
        };

        transaction.set(destAggRef, updatedAggregate);
        transaction.set(transferRef, updatedTransfer);
      });

      await logAuditEvent(
        user.uid,
        user.role,
        destBranch,
        newStatus === 'REJECTED_DAMAGED' ? 'stock_transfer_rejected_damaged' : 'stock_transfer_received',
        'stock_transfers',
        String(transferId),
        true,
        { status: newStatus, receivedQuantity: receivedQty, auditedLossQuantity: diff },
        req
      );

      res.status(200).json({ success: true, transfer: updatedTransfer });
    } catch (err: any) {
      if (err.message === 'TRANSFER_NOT_IN_TRANSIT') {
        res.status(400).json({ error: 'Transfer is no longer in transit.' });
        return;
      }
      if (err.message.startsWith('PRODUCT_BATCH_NOT_FOUND:') || err.message.startsWith('INVALID_PRODUCT_BATCH_EXPIRY:')) {
        res.status(400).json({ error: err.message.replace(/^(PRODUCT_BATCH_NOT_FOUND|INVALID_PRODUCT_BATCH_EXPIRY):\s*/, '') });
        return;
      }
      res.status(500).json({ error: `Transfer receipt failed: ${err.message}` });
    }
  });

  // 5. POST /api/inventory/transfers/:transferId/reject-damaged - Reject Damaged Transfer
  app.post('/api/inventory/transfers/:transferId/reject-damaged', async (req: Request, res: Response): Promise<void> => {
    req.body.condition = 'rejected_damaged';
    req.body.receivedQuantity = 0;
    return (app as any)._router.stack.find((r: any) => r.route && r.route.path === '/api/inventory/transfers/:transferId/receive')?.handle(req, res);
  });

  // 6. POST /api/inventory/transfers/:transferId/cancel - Cancel / Reverse In-Transit Transfer
  app.post('/api/inventory/transfers/:transferId/cancel', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin') {
      res.status(403).json({ error: 'Access Denied: Cancelling transfers requires authorized staff role.' });
      return;
    }

    const { transferId } = req.params;
    try {
      const transferRef = db.collection('stock_transfers').doc(transferId);
      const transferSnap = await transferRef.get();
      if (!transferSnap.exists) {
        res.status(404).json({ error: `Transfer not found: ${transferId}` });
        return;
      }

      const transfer = transferSnap.data();
      const srcBranch = transfer.sourceBranchId;

      if (user.role === 'branch_manager') {
        const assigned = (user.assignedBranchId || 'daet').toLowerCase().trim();
        if (transfer.sourceBranchId !== assigned) {
          res.status(403).json({ error: 'Access Denied: Branch managers can only cancel transfers originating from their assigned branch.' });
          return;
        }
      }

      if (transfer.status !== 'IN_TRANSIT') {
        res.status(400).json({ error: `Cannot cancel transfer in status '${transfer.status}'. Only IN_TRANSIT transfers can be cancelled.` });
        return;
      }

      const transitQty = Number(transfer.transitQuantity || transfer.shippedQuantity) || 0;
      const nowIso = new Date().toISOString();
      const branchBatchDocId = `${srcBranch}_${transfer.batchId}`;
      const branchBatchRef = db.collection('branch_batch_inventory').doc(branchBatchDocId);
      const aggDocRef = db.collection('inventory').doc(`${srcBranch}_${transfer.skuId}`);

      let updatedTransfer: any;

      await db.runTransaction(async (transaction: any) => {
        const txTransferSnap = await transaction.get(transferRef);
        const txTransfer = txTransferSnap.data();
        if (txTransfer.status !== 'IN_TRANSIT') {
          throw new Error('TRANSFER_NOT_IN_TRANSIT');
        }

        const batchSnap = await transaction.get(branchBatchRef);
        if (!batchSnap.exists) {
          throw new Error('SOURCE_BATCH_NOT_FOUND');
        }
        const bData = batchSnap.data();
        const newAvail = (Number(bData.availableQuantity) || 0) + transitQty;
        const updatedBatch = {
          ...bData,
          availableQuantity: newAvail,
          updatedAt: nowIso,
        };
        transaction.set(branchBatchRef, updatedBatch);

        const branchBatchesQuery = db.collection('branch_batch_inventory').where('branchId', '==', srcBranch).where('skuId', '==', transfer.skuId);
        const branchBatchesSnap = await transaction.get(branchBatchesQuery);
        const branchBatches: any[] = [];
        if (branchBatchesSnap && !branchBatchesSnap.empty) {
          branchBatchesSnap.forEach((d: any) => {
            if (d.id !== branchBatchDocId) branchBatches.push(d.data());
          });
        }
        branchBatches.push(updatedBatch);

        const updatedAggregate = computeAggregateInventoryFromBatches({
          branchBatches,
          branchId: srcBranch,
          skuId: transfer.skuId,
          lastAdjustmentAt: nowIso,
        });

        updatedTransfer = {
          ...txTransfer,
          status: 'CANCELLED',
          transitQuantity: 0,
          cancelledAt: nowIso,
          updatedAt: nowIso,
        };

        transaction.set(aggDocRef, updatedAggregate);
        transaction.set(transferRef, updatedTransfer);
      });

      await logAuditEvent(
        user.uid,
        user.role,
        srcBranch,
        'stock_transfer_cancelled',
        'stock_transfers',
        String(transferId),
        true,
        { transitQuantityReturned: transitQty },
        req
      );

      res.status(200).json({ success: true, transfer: updatedTransfer });
    } catch (err: any) {
      if (err.message === 'TRANSFER_NOT_IN_TRANSIT') {
        res.status(400).json({ error: 'Transfer is no longer in transit.' });
        return;
      }
      res.status(500).json({ error: `Transfer cancellation failed: ${err.message}` });
    }
  });

  // --- PHASE 7 MILESTONE 5: Supply Chain Forecasting & Edge Cases ---

  /**
   * GET /api/inventory/forecasting/:branchId/:skuId
   * Computes sales velocity, Days of Stock (DOS), and Reorder Point (ROP).
   */
  app.get('/api/inventory/forecasting/:branchId/:skuId', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { branchId, skuId } = req.params;
    const normalizedBranch = (String(branchId) || '').toLowerCase().trim();

    // RBAC check
    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin') {
      res.status(403).json({ error: 'Access Denied: Forecasting requires authorized staff role.' });
      return;
    }

    if (user.role === 'branch_manager' && (String(user.assignedBranchId || '')).toLowerCase().trim() !== normalizedBranch) {
      res.status(403).json({ error: 'Access Denied: Branch managers can only view forecasting for their assigned branch.' });
      return;
    }

    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

      // 1. Fetch current inventory aggregate
      const invRef = db.collection('inventory').doc(`${normalizedBranch}_${skuId}`);
      const invSnap = await invRef.get();
      if (!invSnap.exists) {
        res.status(404).json({ error: `Inventory record not found for branch ${normalizedBranch} and SKU ${skuId}.` });
        return;
      }
      const invData = invSnap.data() as InventoryItemRecord;

      // 2. Calculate Sales Velocity (Vs) from completed/fulfilled orders
      const ordersSnap = await db.collection('orders')
        .where('branchId', '==', normalizedBranch)
        .where('fulfillmentStatus', '==', 'fulfilled')
        .where('fulfilledAt', '>=', thirtyDaysAgoIso)
        .get();

      let totalUnitsSold = 0;
      if (!ordersSnap.empty) {
        ordersSnap.forEach((doc: any) => {
          const order = doc.data();
          // Exclude cancelled/refunded
          if (order.status === 'cancelled' || order.status === 'refunded') return;

          const items = order.items || [];
          for (const item of items) {
            if (item.skuId === skuId) {
              totalUnitsSold += Number(item.quantity) || 0;
            }
          }
        });
      }

      // 3. Stockout adjustment
      // Deriving stockout days from audit logs by checking periods where stock was 0
      const logsSnap = await db.collection('audit_logs')
        .where('branchId', '==', normalizedBranch)
        .where('targetResource', '==', 'inventory')
        .get();

      let stockoutDays = 0;
      const relevantLogs = logsSnap.docs
        .map((d: any) => d.data())
        .filter((l: any) => {
          const meta = typeof l.metadata === 'string' ? JSON.parse(l.metadata) : (l.metadata || {});
          return meta.skuId === skuId && l.timestamp >= thirtyDaysAgoIso;
        })
        .sort((a: any, b: any) => a.timestamp.localeCompare(b.timestamp));

      if (relevantLogs.length > 0) {
        let lastTimestamp = thirtyDaysAgo;
        let lastStock = -1; // Unknown initial state within window

        for (const log of relevantLogs) {
          const meta = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : (log.metadata || {});
          const currentLogTime = new Date(log.timestamp);
          const currentStock = Number(meta.newAvailableStock);

          if (lastStock === 0) {
            const diffMs = currentLogTime.getTime() - lastTimestamp.getTime();
            stockoutDays += diffMs / (1000 * 60 * 60 * 24);
          }
          lastTimestamp = currentLogTime;
          lastStock = currentStock;
        }

        // If current state is 0, add remaining time
        if (lastStock === 0) {
          const diffMs = now.getTime() - lastTimestamp.getTime();
          stockoutDays += diffMs / (1000 * 60 * 60 * 24);
        }
      } else if (invData.activeStock === 0) {
        // No logs but currently 0, assume it was 0 for the whole window if it's never been stocked
        stockoutDays = 30;
      }

      stockoutDays = Math.min(29, Math.max(0, stockoutDays)); // Max 29 to keep denominator at least 1
      const velocityDenominator = 30 - stockoutDays;
      const salesVelocity = totalUnitsSold / velocityDenominator;

      // 4. Days of Stock (DOS)
      const daysOfStock = salesVelocity > 0 ? invData.activeStock / salesVelocity : null;

      // 5. Dynamic Reorder Point (ROP)
      // ROP = ceil((Vs * LeadTimeDays) + SafetyStock)
      const leadTime = invData.leadTimeDays || 3;
      const safetyStock = invData.safetyStock || 20;
      const reorderPoint = Math.ceil((salesVelocity * leadTime) + safetyStock);

      const forecast = {
        branchId: normalizedBranch,
        skuId,
        currentStock: invData.activeStock,
        salesVelocity: Number(salesVelocity.toFixed(4)),
        totalUnitsSold,
        stockoutDays: Number(stockoutDays.toFixed(2)),
        daysOfStock: daysOfStock !== null ? Number(daysOfStock.toFixed(2)) : null,
        reorderPoint,
        leadTimeDays: leadTime,
        safetyStock: safetyStock,
        generatedAt: now.toISOString(),
      };

      await logAuditEvent(
        user.uid,
        user.role,
        normalizedBranch,
        'forecasting_generated',
        'inventory',
        `${normalizedBranch}_${skuId}`,
        true,
        forecast,
        req
      );

      res.status(200).json({ success: true, forecast });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- PHASE 7 MILESTONE 6: B2B Bulk Stockist Portal & Credit Controls ---

  // 1. POST /api/b2b/orders/quote - Calculate wholesale pricing and validate minimum order threshold
  app.post('/api/b2b/orders/quote', async (req: Request, res: Response): Promise<void> => {
    const { tier, items } = req.body;
    if (!tier || !B2B_STOCKIST_TIERS[tier as B2BStockistTier]) {
      res.status(400).json({ error: 'Invalid or missing tier. Must be one of: tier_1, tier_2, tier_3' });
      return;
    }
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'items array must not be empty.' });
      return;
    }

    for (const it of items) {
      if (!it.skuId || !PRODUCTS_CATALOG[it.skuId]) {
        res.status(400).json({ error: `Invalid SKU in items: ${it.skuId}` });
        return;
      }
      const qty = Number(it.quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        res.status(400).json({ error: `Invalid quantity for SKU: ${it.skuId}` });
        return;
      }
    }

    const pricing = calculateB2BWholesalePricing(tier as B2BStockistTier, items);
    if (!pricing.isEligible) {
      res.status(400).json({
        error: `Minimum order requirement not met for ${pricing.tierConfig.name}: minimum ${pricing.minUnits} units required (received: ${pricing.totalUnits}).`,
        pricing,
      });
      return;
    }

    res.status(200).json({ success: true, pricing });
  });

  // 2. POST /api/b2b/stockists - Register stockist profile with initial security deposit
  app.post('/api/b2b/stockists', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin') {
      res.status(403).json({ error: 'Access Denied: B2B stockist creation requires authorized staff role.' });
      return;
    }

    const {
      stockistId,
      businessName,
      contactEmail,
      contactPhone,
      branchId,
      tier,
      depositAmount = 0,
      creditMultiplier = 2.0,
      customCreditLimit,
      authorizedCustomerUid,
    } = req.body;

    if (!businessName || typeof businessName !== 'string') {
      res.status(400).json({ error: 'businessName is required.' });
      return;
    }
    if (!branchId || typeof branchId !== 'string') {
      res.status(400).json({ error: 'branchId is required.' });
      return;
    }

    const normalizedBranch = branchId.toLowerCase().trim();
    if (!SUPPORTED_BRANCH_IDS.includes(normalizedBranch as any)) {
      res.status(400).json({ error: `Invalid branchId: ${branchId}. Must be one of: ${SUPPORTED_BRANCH_IDS.join(', ')}` });
      return;
    }

    if (user.role === 'branch_manager') {
      const assigned = (user.assignedBranchId || 'daet').toLowerCase().trim();
      if (normalizedBranch !== assigned) {
        await logAuditEvent(
          user.uid,
          user.role,
          normalizedBranch,
          'unauthorized_cross_branch_b2b_access_blocked',
          'b2b_stockists',
          null,
          false,
          { targetBranch: normalizedBranch, assignedBranch: assigned },
          req
        );
        res.status(403).json({ error: 'Access Denied: Branch managers cannot create stockists for other branches.' });
        return;
      }
    }

    const assignedTier: B2BStockistTier = (tier && B2B_STOCKIST_TIERS[tier as B2BStockistTier]) ? (tier as B2BStockistTier) : 'tier_1';
    const numDeposit = Math.max(0, Number(depositAmount) || 0);
    const numMult = Math.max(1, Number(creditMultiplier) || 2.0);

    const creditCalculations = calculateB2BCreditLimits(numDeposit, numMult, 0, customCreditLimit);

    const strStockistId = stockistId || `STK-${normalizedBranch.toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const nowIso = new Date().toISOString();

    const stockistRef = db.collection('b2b_stockists').doc(strStockistId);
    let stockistProfile: B2BStockistProfile = {} as any;
    let initialLedgerEntry: B2BConsignmentLedgerEntry | null = null;

    try {
      await db.runTransaction(async (transaction: any) => {
        const existingSnap = await transaction.get(stockistRef);
        if (existingSnap.exists) {
          throw new Error(`Stockist ${strStockistId} already exists.`);
        }

        stockistProfile = {
          id: strStockistId,
          businessName: businessName.trim(),
          contactEmail: (contactEmail || '').trim(),
          contactPhone: (contactPhone || '').trim(),
          branchId: normalizedBranch,
          tier: assignedTier,
          status: 'active',
          depositBalance: creditCalculations.depositBalance,
          creditMultiplier: creditCalculations.creditMultiplier,
          creditLimit: creditCalculations.creditLimit,
          outstandingBalance: 0,
          availableCredit: creditCalculations.availableCredit,
          authorizedCustomerUid: authorizedCustomerUid ? authorizedCustomerUid.trim() : undefined,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        transaction.set(stockistRef, stockistProfile);

        if (numDeposit > 0) {
          const ledgerId = `LEDGER-DEP-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
          initialLedgerEntry = {
            id: ledgerId,
            stockistId: strStockistId,
            branchId: normalizedBranch,
            type: 'deposit',
            amount: numDeposit,
            previousDeposit: 0,
            depositAfter: numDeposit,
            previousOutstanding: 0,
            outstandingAfter: 0,
            notes: 'Initial security deposit on registration',
            timestamp: nowIso,
            performedBy: user.uid,
          };
          const ledgerRef = db.collection('b2b_ledger').doc(ledgerId);
          transaction.set(ledgerRef, initialLedgerEntry);
        }
      });

      await logAuditEvent(
        user.uid,
        user.role,
        normalizedBranch,
        'b2b_stockist_created',
        'b2b_stockists',
        strStockistId,
        true,
        {
          tier: assignedTier,
          depositBalance: stockistProfile.depositBalance,
          creditLimit: stockistProfile.creditLimit,
        },
        req
      );

      res.status(201).json({ success: true, stockist: stockistProfile, initialLedgerEntry });
    } catch (err: any) {
      res.status(500).json({ error: `Stockist creation failed: ${err.message}` });
    }
  });

  // 3. GET /api/b2b/stockists/:stockistId - Retrieve stockist profile
  app.get('/api/b2b/stockists/:stockistId', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { stockistId } = req.params;
    const strStockistId = String(stockistId || '');

    try {
      const stockistRef = db.collection('b2b_stockists').doc(strStockistId);
      const stockistSnap = await stockistRef.get();
      if (!stockistSnap.exists) {
        res.status(404).json({ error: `Stockist profile not found: ${strStockistId}` });
        return;
      }

      const stockist = stockistSnap.data() as B2BStockistProfile;
      const normalizedBranch = (stockist.branchId || 'daet').toLowerCase().trim();

      if (user.role === 'customer') {
        if (!stockist.authorizedCustomerUid || stockist.authorizedCustomerUid !== user.uid) {
          await logAuditEvent(
            user.uid,
            user.role,
            normalizedBranch,
            'unauthorized_customer_b2b_stockist_view_blocked',
            'b2b_stockists',
            strStockistId,
            false,
            { authorizedCustomerUid: stockist.authorizedCustomerUid, requestUid: user.uid },
            req
          );
          res.status(403).json({ error: 'Access Denied: Customer cannot view another stockist\'s B2B profile.' });
          return;
        }
      }

      if (user.role === 'practitioner') {
        res.status(403).json({ error: 'Access Denied: Practitioners cannot access B2B stockist data.' });
        return;
      }

      if (user.role === 'branch_manager') {
        const assigned = (user.assignedBranchId || 'daet').toLowerCase().trim();
        if (normalizedBranch !== assigned) {
          await logAuditEvent(
            user.uid,
            user.role,
            normalizedBranch,
            'unauthorized_cross_branch_b2b_access_blocked',
            'b2b_stockists',
            strStockistId,
            false,
            { targetBranch: normalizedBranch, assignedBranch: assigned },
            req
          );
          res.status(403).json({ error: 'Access Denied: Branch managers cannot access stockists of other branches.' });
          return;
        }
      }

      res.status(200).json({ success: true, stockist });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. POST /api/b2b/stockists/:stockistId/deposits - Add security deposit
  app.post('/api/b2b/stockists/:stockistId/deposits', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin') {
      res.status(403).json({ error: 'Access Denied: Recording security deposits requires staff role.' });
      return;
    }

    const { stockistId } = req.params;
    const strStockistId = String(stockistId || '');
    const { amount, notes } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      res.status(400).json({ error: 'Deposit amount must be a positive number.' });
      return;
    }

    const stockistRef = db.collection('b2b_stockists').doc(strStockistId);
    let updatedProfile: B2BStockistProfile = {} as any;
    let ledgerEntry: B2BConsignmentLedgerEntry = {} as any;
    let normalizedBranch = '';

    try {
      await db.runTransaction(async (transaction: any) => {
        const stockistSnap = await transaction.get(stockistRef);
        if (!stockistSnap.exists) {
          throw new Error(`Stockist not found: ${strStockistId}`);
        }

        const stockist = stockistSnap.data() as B2BStockistProfile;
        normalizedBranch = (stockist.branchId || 'daet').toLowerCase().trim();

        if (user.role === 'branch_manager') {
          const assigned = (user.assignedBranchId || 'daet').toLowerCase().trim();
          if (normalizedBranch !== assigned) {
            throw new Error('Access Denied: Branch managers cannot update deposits for other branches.');
          }
        }

        const nowIso = new Date().toISOString();
        const prevDeposit = Number(stockist.depositBalance) || 0;
        const newDeposit = prevDeposit + numAmount;
        const mult = Number(stockist.creditMultiplier) || 2.0;
        const newCreditLimit = newDeposit * mult;
        const currentOutstanding = Number(stockist.outstandingBalance) || 0;
        const newAvailableCredit = Math.max(0, newCreditLimit - currentOutstanding);

        updatedProfile = {
          ...stockist,
          depositBalance: newDeposit,
          creditLimit: newCreditLimit,
          availableCredit: newAvailableCredit,
          updatedAt: nowIso,
        };
        transaction.set(stockistRef, updatedProfile);

        const ledgerId = `LEDGER-DEP-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
        ledgerEntry = {
          id: ledgerId,
          stockistId: strStockistId,
          branchId: normalizedBranch,
          type: 'deposit',
          amount: numAmount,
          previousDeposit: prevDeposit,
          depositAfter: newDeposit,
          previousOutstanding: currentOutstanding,
          outstandingAfter: currentOutstanding,
          notes: notes || 'Security deposit balance addition',
          timestamp: nowIso,
          performedBy: user.uid,
        };
        const ledgerRef = db.collection('b2b_ledger').doc(ledgerId);
        transaction.set(ledgerRef, ledgerEntry);
      });

      await logAuditEvent(
        user.uid,
        user.role,
        normalizedBranch,
        'b2b_deposit_recorded',
        'b2b_stockists',
        strStockistId,
        true,
        { amount: numAmount, newDeposit: updatedProfile.depositBalance, newCreditLimit: updatedProfile.creditLimit },
        req
      );

      res.status(200).json({ success: true, stockist: updatedProfile, ledgerEntry });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. POST /api/b2b/stockists/:stockistId/payments - Pay down consignment balance (credit)
  app.post('/api/b2b/stockists/:stockistId/payments', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin') {
      res.status(403).json({ error: 'Access Denied: Recording consignment payments requires staff role.' });
      return;
    }

    const { stockistId } = req.params;
    const strStockistId = String(stockistId || '');
    const { amount, notes } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      res.status(400).json({ error: 'Payment amount must be a positive number.' });
      return;
    }

    const stockistRef = db.collection('b2b_stockists').doc(strStockistId);
    let updatedProfile: B2BStockistProfile = {} as any;
    let ledgerEntry: B2BConsignmentLedgerEntry = {} as any;
    let normalizedBranch = '';

    try {
      await db.runTransaction(async (transaction: any) => {
        const stockistSnap = await transaction.get(stockistRef);
        if (!stockistSnap.exists) {
          throw new Error(`Stockist not found: ${strStockistId}`);
        }

        const stockist = stockistSnap.data() as B2BStockistProfile;
        normalizedBranch = (stockist.branchId || 'daet').toLowerCase().trim();

        if (user.role === 'branch_manager') {
          const assigned = (user.assignedBranchId || 'daet').toLowerCase().trim();
          if (normalizedBranch !== assigned) {
            throw new Error('Access Denied: Branch managers cannot record payments for other branches.');
          }
        }

        const nowIso = new Date().toISOString();
        const prevOutstanding = Number(stockist.outstandingBalance) || 0;
        const newOutstanding = Math.max(0, prevOutstanding - numAmount);
        const creditLimit = Number(stockist.creditLimit) || 0;
        const newAvailableCredit = Math.max(0, creditLimit - newOutstanding);

        // Auto-unlock if outstanding is back under credit limit and was locked
        let newStatus = stockist.status;
        if (newStatus === 'locked' && newOutstanding <= creditLimit) {
          newStatus = 'active';
        }

        updatedProfile = {
          ...stockist,
          outstandingBalance: newOutstanding,
          availableCredit: newAvailableCredit,
          status: newStatus,
          updatedAt: nowIso,
        };
        transaction.set(stockistRef, updatedProfile);

        const ledgerId = `LEDGER-PMT-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
        ledgerEntry = {
          id: ledgerId,
          stockistId: strStockistId,
          branchId: normalizedBranch,
          type: 'payment_credit',
          amount: numAmount,
          previousDeposit: stockist.depositBalance,
          depositAfter: stockist.depositBalance,
          previousOutstanding: prevOutstanding,
          outstandingAfter: newOutstanding,
          notes: notes || 'Consignment payment credit',
          timestamp: nowIso,
          performedBy: user.uid,
        };
        const ledgerRef = db.collection('b2b_ledger').doc(ledgerId);
        transaction.set(ledgerRef, ledgerEntry);
      });

      await logAuditEvent(
        user.uid,
        user.role,
        normalizedBranch,
        'b2b_payment_recorded',
        'b2b_stockists',
        strStockistId,
        true,
        { amount: numAmount, newOutstanding: updatedProfile.outstandingBalance },
        req
      );

      res.status(200).json({ success: true, stockist: updatedProfile, ledgerEntry });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. POST /api/b2b/stockists/:stockistId/status - Update account lock / active status
  app.post('/api/b2b/stockists/:stockistId/status', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin') {
      res.status(403).json({ error: 'Access Denied: Updating stockist status requires staff role.' });
      return;
    }

    const { stockistId } = req.params;
    const strStockistId = String(stockistId || '');
    const { status, reason } = req.body;

    if (!['active', 'locked', 'suspended'].includes(status)) {
      res.status(400).json({ error: 'status must be active, locked, or suspended.' });
      return;
    }

    try {
      const stockistRef = db.collection('b2b_stockists').doc(strStockistId);
      const stockistSnap = await stockistRef.get();
      if (!stockistSnap.exists) {
        res.status(404).json({ error: `Stockist not found: ${strStockistId}` });
        return;
      }

      const stockist = stockistSnap.data() as B2BStockistProfile;
      const normalizedBranch = (stockist.branchId || 'daet').toLowerCase().trim();

      if (user.role === 'branch_manager') {
        const assigned = (user.assignedBranchId || 'daet').toLowerCase().trim();
        if (normalizedBranch !== assigned) {
          res.status(403).json({ error: 'Access Denied: Branch managers cannot update stockists of other branches.' });
          return;
        }
      }

      const nowIso = new Date().toISOString();
      const updatedProfile: B2BStockistProfile = {
        ...stockist,
        status,
        updatedAt: nowIso,
      };

      await stockistRef.set(updatedProfile);

      await logAuditEvent(
        user.uid,
        user.role,
        normalizedBranch,
        'b2b_stockist_status_updated',
        'b2b_stockists',
        strStockistId,
        true,
        { previousStatus: stockist.status, newStatus: status, reason },
        req
      );

      res.status(200).json({ success: true, stockist: updatedProfile });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. POST /api/b2b/orders - Place B2B wholesale consignment order with FEFO reservations
  app.post('/api/b2b/orders', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin' && user.role !== 'customer') {
      res.status(403).json({ error: 'Access Denied: Unauthorized role for B2B ordering.' });
      return;
    }

    const { stockistId, branchId, items, deliveryMethod } = req.body;
    if (!stockistId || typeof stockistId !== 'string') {
      res.status(400).json({ error: 'stockistId is required.' });
      return;
    }
    if (!branchId || typeof branchId !== 'string') {
      res.status(400).json({ error: 'branchId is required.' });
      return;
    }
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'items array must not be empty.' });
      return;
    }

    const strStockistId = stockistId.trim();
    const normalizedBranch = branchId.toLowerCase().trim();

    try {
      const stockistRef = db.collection('b2b_stockists').doc(strStockistId);
      const stockistSnap = await stockistRef.get();
      if (!stockistSnap.exists) {
        res.status(404).json({ error: `Stockist profile not found: ${strStockistId}` });
        return;
      }

      const stockist = stockistSnap.data() as B2BStockistProfile;
      const stockistBranch = (stockist.branchId || 'daet').toLowerCase().trim();

      if (stockistBranch !== normalizedBranch) {
        res.status(400).json({ error: `Branch mismatch: Stockist belongs to ${stockistBranch}, cannot order from ${normalizedBranch}` });
        return;
      }

      if (user.role === 'branch_manager') {
        const assigned = (user.assignedBranchId || 'daet').toLowerCase().trim();
        if (normalizedBranch !== assigned) {
          await logAuditEvent(
            user.uid,
            user.role,
            normalizedBranch,
            'unauthorized_cross_branch_b2b_access_blocked',
            'b2b_orders',
            null,
            false,
            { targetBranch: normalizedBranch, assignedBranch: assigned },
            req
          );
          res.status(403).json({ error: 'Access Denied: Branch managers cannot place orders for other branches.' });
          return;
        }
      }

      if (user.role === 'customer') {
        if (!stockist.authorizedCustomerUid || stockist.authorizedCustomerUid !== user.uid) {
          await logAuditEvent(
            user.uid,
            user.role,
            normalizedBranch,
            'b2b_order_unauthorized_customer_blocked',
            'b2b_stockists',
            strStockistId,
            false,
            { authorizedCustomerUid: stockist.authorizedCustomerUid, requestUid: user.uid },
            req
          );
          res.status(403).json({ error: 'Access Denied: Customer is not authorized for this stockist profile.' });
          return;
        }
      }

      // Check account lockout
      if (stockist.status === 'locked' || stockist.status === 'suspended') {
        await logAuditEvent(
          user.uid,
          user.role,
          normalizedBranch,
          'b2b_order_blocked_account_locked',
          'b2b_stockists',
          strStockistId,
          false,
          { status: stockist.status },
          req
        );
        res.status(403).json({ error: `Account is locked. Cannot place B2B wholesale orders (status: ${stockist.status}).` });
        return;
      }

      // Normalize items & check minimum units
      const pricing = calculateB2BWholesalePricing(stockist.tier, items);
      if (!pricing.isEligible) {
        res.status(400).json({
          error: `Minimum order requirement not met for ${pricing.tierConfig.name}: minimum ${pricing.minUnits} units required (received: ${pricing.totalUnits}).`,
          pricing,
        });
        return;
      }

      // Check available credit
      const currentAvailable = stockist.availableCredit !== undefined ? stockist.availableCredit : (stockist.creditLimit - (stockist.outstandingBalance || 0));
      if (pricing.wholesaleTotal > currentAvailable) {
        await logAuditEvent(
          user.uid,
          user.role,
          normalizedBranch,
          'b2b_order_credit_limit_exceeded',
          'b2b_stockists',
          strStockistId,
          false,
          {
            orderTotal: pricing.wholesaleTotal,
            availableCredit: currentAvailable,
            creditLimit: stockist.creditLimit,
          },
          req
        );
        res.status(400).json({
          error: `Credit limit exceeded. Order total (PHP ${pricing.wholesaleTotal}) exceeds available credit (PHP ${currentAvailable}).`,
          orderTotal: pricing.wholesaleTotal,
          availableCredit: currentAvailable,
          creditLimit: stockist.creditLimit,
        });
        return;
      }

      // Seed check
      await ensureInventorySeeded();
      const orderId = `HCI-B2B-${Date.now().toString().slice(-6)}`;
      const nowIso = new Date().toISOString();

      let orderRecord: any;
      let updatedStockist: B2BStockistProfile;
      let ledgerEntry: B2BConsignmentLedgerEntry;

      await db.runTransaction(async (transaction: any) => {
        // Re-read stockist inside transaction
        const txStockistSnap = await transaction.get(stockistRef);
        const txStockist = txStockistSnap.data() as B2BStockistProfile;

        const txAvailable = txStockist.availableCredit !== undefined ? txStockist.availableCredit : (txStockist.creditLimit - (txStockist.outstandingBalance || 0));
        if (pricing.wholesaleTotal > txAvailable) {
          throw new Error(`CREDIT_LIMIT_EXCEEDED: Order total (${pricing.wholesaleTotal}) exceeds available credit (${txAvailable}).`);
        }

        // Perform FEFO reservations
        const batchAllocations: Record<string, any[]> = {};
        for (const it of pricing.items) {
          const resResult = await performFefoReservationInternal(
            transaction,
            normalizedBranch,
            it.skuId,
            it.quantity,
            nowIso
          );
          batchAllocations[it.skuId] = resResult.allocations;
        }

        // Update stockist balance
        const prevOutstanding = Number(txStockist.outstandingBalance) || 0;
        const newOutstanding = prevOutstanding + pricing.wholesaleTotal;
        const newAvailable = Math.max(0, txStockist.creditLimit - newOutstanding);
        const isLocked = newOutstanding >= txStockist.creditLimit && newAvailable === 0;

        updatedStockist = {
          ...txStockist,
          outstandingBalance: newOutstanding,
          availableCredit: newAvailable,
          status: isLocked ? 'locked' : txStockist.status,
          updatedAt: nowIso,
        };
        transaction.set(stockistRef, updatedStockist);

        // Append to ledger
        const ledgerId = `LEDGER-B2B-${orderId}`;
        ledgerEntry = {
          id: ledgerId,
          stockistId: strStockistId,
          branchId: normalizedBranch,
          type: 'order_debit',
          amount: pricing.wholesaleTotal,
          previousDeposit: txStockist.depositBalance,
          depositAfter: txStockist.depositBalance,
          previousOutstanding: prevOutstanding,
          outstandingAfter: newOutstanding,
          referenceId: orderId,
          notes: `Wholesale consignment order ${orderId} (${pricing.tierConfig.name})`,
          timestamp: nowIso,
          performedBy: user.uid,
        };
        const ledgerRef = db.collection('b2b_ledger').doc(ledgerId);
        transaction.set(ledgerRef, ledgerEntry);

        // Create order
        orderRecord = {
          id: orderId,
          userId: user.uid,
          stockistId: strStockistId,
          orderType: 'b2b_wholesale',
          tier: stockist.tier,
          customer: {
            businessName: stockist.businessName,
            email: stockist.contactEmail || user.email || '',
            uid: user.uid,
          },
          items: pricing.items,
          batchAllocations,
          branchId: normalizedBranch,
          deliveryMethod: deliveryMethod || 'branch_pickup',
          paymentMethod: 'consignment_credit',
          paymentStatus: 'consignment_pending_settlement',
          fulfillmentStatus: 'pending_processing',
          subtotal: pricing.retailSubtotal,
          discountAmount: pricing.discountAmount,
          taxAmount: 0,
          grandTotal: pricing.wholesaleTotal,
          placedAt: nowIso,
          updatedAt: nowIso,
        };

        const orderDocRef = db.collection('orders').doc(orderId);
        transaction.set(orderDocRef, orderRecord);
      });

      await logAuditEvent(
        user.uid,
        user.role,
        normalizedBranch,
        'b2b_order_placed',
        'orders',
        orderId,
        true,
        {
          stockistId: strStockistId,
          tier: stockist.tier,
          wholesaleTotal: pricing.wholesaleTotal,
          units: pricing.totalUnits,
        },
        req
      );

      res.status(201).json({
        success: true,
        orderId,
        order: orderRecord,
        stockist: updatedStockist!,
        ledgerEntry: ledgerEntry!,
      });
    } catch (err: any) {
      if (err.message.startsWith('INSUFFICIENT_ELIGIBLE_STOCK:')) {
        res.status(400).json({ error: err.message.replace(/^INSUFFICIENT_ELIGIBLE_STOCK:\s*/, '') });
        return;
      }
      res.status(500).json({ error: `B2B Order placement failed: ${err.message}` });
    }
  });

  // 8. GET /api/b2b/stockists/:stockistId/ledger - View stockist consignment ledger
  app.get('/api/b2b/stockists/:stockistId/ledger', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { stockistId } = req.params;
    const strStockistId = String(stockistId || '');

    try {
      const stockistRef = db.collection('b2b_stockists').doc(strStockistId);
      const stockistSnap = await stockistRef.get();
      if (!stockistSnap.exists) {
        res.status(404).json({ error: `Stockist not found: ${strStockistId}` });
        return;
      }

      const stockist = stockistSnap.data() as B2BStockistProfile;
      const normalizedBranch = (stockist.branchId || 'daet').toLowerCase().trim();

      if (user.role === 'customer') {
        if (!stockist.authorizedCustomerUid || stockist.authorizedCustomerUid !== user.uid) {
          res.status(403).json({ error: 'Access Denied: Customer cannot view another stockist\'s B2B ledger.' });
          return;
        }
      }

      if (user.role === 'practitioner') {
        res.status(403).json({ error: 'Access Denied: Practitioners cannot access B2B ledger.' });
        return;
      }

      if (user.role === 'branch_manager') {
        const assigned = (user.assignedBranchId || 'daet').toLowerCase().trim();
        if (normalizedBranch !== assigned) {
          res.status(403).json({ error: 'Access Denied: Branch managers cannot view ledger of other branches.' });
          return;
        }
      }

      const ledgerSnap = await db.collection('b2b_ledger')
        .where('stockistId', '==', strStockistId)
        .get();

      const entries: B2BConsignmentLedgerEntry[] = [];
      ledgerSnap.forEach((doc: any) => entries.push(doc.data()));

      // Sort by timestamp
      entries.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));

      res.status(200).json({ success: true, stockistId: strStockistId, ledger: entries });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- PHASE 7 MILESTONE C1: Notification Infrastructure & Queue Endpoints ---

  // 1. POST /api/notifications/enqueue - Enqueue notification
  app.post('/api/notifications/enqueue', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const {
      idempotencyKey,
      recipientId,
      recipientEmail,
      recipientPhone,
      channel,
      templateId,
      title,
      body,
      metadata,
      maxRetries,
      backoffMs,
    } = req.body;

    // Staff or user enqueueing for themselves
    const isStaff = user.role === 'branch_manager' || user.role === 'regional_director' || user.role === 'super_admin';
    if (!isStaff && recipientId && recipientId !== user.uid) {
      res.status(403).json({ error: 'Access Denied: Customers can only enqueue notifications for themselves.' });
      return;
    }

    try {
      const targetRecipient = recipientId || user.uid;
      const targetKey = idempotencyKey || generateNotificationIdempotencyKey(channel, targetRecipient, 'manual', Date.now().toString());

      const result = await enqueueNotification(db, {
        idempotencyKey: targetKey,
        recipientId: targetRecipient,
        recipientEmail,
        recipientPhone,
        channel,
        templateId,
        title,
        body,
        metadata,
        maxRetries: maxRetries !== undefined ? Number(maxRetries) : undefined,
        backoffMs: backoffMs !== undefined ? Number(backoffMs) : undefined,
      });

      res.status(result.idempotentReplay ? 200 : 201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 2. POST /api/notifications/process-queue - Process queue batch
  app.post('/api/notifications/process-queue', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin') {
      res.status(403).json({ error: 'Access Denied: Processing notification queue requires staff role.' });
      return;
    }

    const { maxBatchSize, channel, forceImmediate } = req.body || {};

    try {
      const result = await processNotificationQueue(db, {
        maxBatchSize: Number(maxBatchSize) || 10,
        channel,
        forceImmediate: !!forceImmediate,
      });

      res.status(200).json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. GET /api/notifications/queue/:id - Get queue item status
  app.get('/api/notifications/queue/:id', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    try {
      const snap = await db.collection('notification_queue').doc(req.params.id).get();
      if (!snap || !snap.exists) {
        res.status(404).json({ error: 'Queue item not found.' });
        return;
      }
      const data = typeof snap.data === 'function' ? snap.data() : snap.data;

      const isStaff = user.role === 'branch_manager' || user.role === 'regional_director' || user.role === 'super_admin';
      if (!isStaff && data.recipientId !== user.uid) {
        res.status(403).json({ error: 'Access Denied: Cannot view queue item of another recipient.' });
        return;
      }

      res.status(200).json({ success: true, queueItem: data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. GET /api/notifications/my-notifications - Customer notification feed
  app.get('/api/notifications/my-notifications', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    try {
      const snap = await db.collection('notifications')
        .where('recipientId', '==', user.uid)
        .get();

      const notifications: NotificationRecord[] = [];
      if (snap && !snap.empty) {
        snap.forEach((doc: any) => {
          notifications.push(typeof doc.data === 'function' ? doc.data() : doc.data);
        });
      }
      notifications.sort((a, b) => (b.dispatchedAt || '').localeCompare(a.dispatchedAt || ''));

      res.status(200).json({ success: true, notifications });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. GET /api/notifications/queue - Staff view queue items
  app.get('/api/notifications/queue', async (req: Request, res: Response): Promise<void> => {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'branch_manager' && user.role !== 'regional_director' && user.role !== 'super_admin') {
      res.status(403).json({ error: 'Access Denied: Viewing notification queue requires staff role.' });
      return;
    }

    try {
      const snap = await db.collection('notification_queue').get();
      const items: NotificationQueueItem[] = [];
      if (snap && !snap.empty) {
        snap.forEach((doc: any) => {
          items.push(typeof doc.data === 'function' ? doc.data() : doc.data);
        });
      }

      const statusFilter = req.query.status as string;
      const channelFilter = req.query.channel as string;

      let filtered = items;
      if (statusFilter) {
        filtered = filtered.filter((i) => i.status === statusFilter);
      }
      if (channelFilter) {
        filtered = filtered.filter((i) => i.channel === channelFilter);
      }

      filtered.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

      res.status(200).json({ success: true, count: filtered.length, items: filtered });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================================
  // --- GATE 5: MONITORING & HEALTH CHECK ENDPOINTS (/healthz & /readyz) ---
  // ============================================================================

  // 1. GET /healthz - Liveness Probe
  app.get('/healthz', (_req: Request, res: Response): void => {
    const memoryUsage = process.memoryUsage();
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      memoryUsageMb: {
        rss: Math.round((memoryUsage.rss / (1024 * 1024)) * 100) / 100,
        heapTotal: Math.round((memoryUsage.heapTotal / (1024 * 1024)) * 100) / 100,
        heapUsed: Math.round((memoryUsage.heapUsed / (1024 * 1024)) * 100) / 100,
      },
    });
  });

  // 2. GET /readyz - Readiness Probe
  app.get('/readyz', async (_req: Request, res: Response): Promise<void> => {
    const isMaintenance = process.env.MAINTENANCE_MODE === 'true';
    if (isMaintenance) {
      res.status(503).json({
        status: 'maintenance_mode',
        timestamp: new Date().toISOString(),
        message: 'System is currently undergoing scheduled maintenance.',
      });
      return;
    }

    let dbStatus = 'connected';
    try {
      if (db) {
        await db.collection('audit_logs').limit(1).get();
      }
    } catch {
      dbStatus = 'degraded';
    }

    const isReady = dbStatus === 'connected';
    res.status(isReady ? 200 : 503).json({
      status: isReady ? 'ready' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus,
        maintenanceMode: isMaintenance,
        hmacSecurity: 'configured',
      },
    });
  });

  // Centralized Express Error Handler
  app.use((err: any, req: Request, res: Response, _next: any) => {
    const correlationId = (req as any).correlationId || 'unknown';
    const statusCode = err.status || err.statusCode || 500;
    const isProd = process.env.NODE_ENV === 'production';

    const safeErrorMessage = isProd && statusCode === 500
      ? 'An unexpected internal error occurred'
      : (err.message || 'Internal Server Error');

    logger.error('Unhandled server error', {
      method: req.method,
      path: req.path,
      statusCode,
      correlationId,
      error: err?.message || String(err),
      stack: isProd ? undefined : err?.stack
    });

    if (statusCode >= 500) {
      dispatchAlert({
        category: 'critical_server_error',
        severity: 'SEV-1',
        message: `Unhandled critical server error on ${req.method} ${req.path}: ${err?.message || 'Unknown error'}`,
        details: { method: req.method, path: req.path, statusCode, error: err?.message || String(err) },
        correlationId,
      }).catch(() => {});
    }

    if (!res.headersSent) {
      res.status(statusCode).json({
        error: safeErrorMessage,
        correlationId
      });
    }
  });

  return app;
}

// Start Server & Mount Vite in Dev Mode
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    // Fail-closed security validation on boot
    getHmacSecret();
    logger.info('Production boot environment validation succeeded');
  }

  const app = createExpressApp();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.resolve(process.cwd(), 'dist'))
      ? path.resolve(process.cwd(), 'dist')
      : path.resolve(__dirname, '..', 'dist');
    app.use(express.static(distPath));
    app.use((_req, res, next) => {
      res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';");
      res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      next();
    });
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`HCI CMD Platform server listening on port ${PORT}`, { port: PORT });
  });
}

// Only auto-start if run directly as main entry point
const isDirectExecution = process.argv[1] && (
  process.argv[1].endsWith('server.ts') ||
  process.argv[1].endsWith('server.js')
);

if (isDirectExecution && process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
  });
}
